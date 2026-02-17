# Relatório de Validação — Fluxo de Criação de Transações

**Data da análise:** 2025-02-17  
**Escopo:** Backend (transaction_service, database_utils, routers/transactions), infra (CORS, Session DB, Auth), idempotência e concorrência.

---

## Status geral

# **NEEDS FIX BEFORE PROD**

O fluxo está bem estruturado (validação, locks, ledger, códigos de erro), mas há **um risco crítico** na integração idempotência + commit da transação e **riscos médios** (save_failed não persistido, log sem transaction_id em erro, e possível manipulação de `transfer_transaction_id` no update). Corrigir os itens críticos e médios antes de produção financeira.

---

## 1. Criação de transação — caminho feliz

| Verificação | Status | Observação |
|------------|--------|------------|
| Payload validado antes de persistir | OK | `_validate_transaction_payload` com campos obrigatórios, tipo, amount > 0, description, categoria e ownership |
| Sessão DB aberta corretamente | OK | `get_db()` yield uma sessão por request; mesma sessão usada no router e no service |
| Commit executado após validação | **Risco** | Commit ocorre **dentro** de `atomic_transaction` no service; no router há **dois** `db.commit()` após o service (redundante e interage mal com idempotência — ver seção 6) |
| Response success consistente | OK | `TransactionResponse` via Pydantic; 200 no POST |

---

## 2. Tratamento de erros

| Tipo | Implementação | Status |
|------|----------------|--------|
| **Negócio** | | |
| External ID duplicado | Não existe `external_id` no modelo; idempotência é por header `Idempotency-Key` | N/A (idempotência por key) |
| Saldo insuficiente | `_raise_tx_business` → 422, `CODE_TX_INSUFFICIENT_BALANCE` | OK |
| Campos inválidos | `_raise_tx_validation` → 400, códigos específicos (`TX_VALIDATION_*`) | OK |
| Categoria não encontrada | `_raise_tx_not_found` → 404 | OK |
| Conflito concorrência | `_raise_tx_conflict` → 409, `CODE_TX_CONFLICT` | OK |
| **Técnicos** | | |
| Erro inesperado | `logger.exception` + `_raise_tx_internal` → 500 | OK |
| Rollback | `database_utils.atomic_transaction`: rollback + log (validação vs inesperado) | OK |

Não há `except Exception: raise HTTPException(400)` genérico. Erros de negócio usam 4xx com `detail` padronizado (`error`, `message`, `details`, `code`).

---

## 3. Rollback seguro

| Verificação | Status | Detalhe |
|------------|--------|---------|
| Rollback apenas quando necessário | OK | `atomic_transaction` faz rollback em qualquer exceção (HTTPException ou Exception) |
| Log antes do rollback com motivo | OK | `logger.warning` para HTTPException (validação/negócio), `logger.exception` para Exception |
| Nenhum `except Exception: HTTPException(400)` genérico | OK | Service re-levanta HTTPException e converte Exception em 500 com `_raise_tx_internal` |

**Trecho relevante** — `backend/core/database_utils.py`:

```35:45:backend/core/database_utils.py
        except HTTPException as e:
            db.rollback()
            detail = ...
            logger.warning(
                "Rollback por validação/regra de negócio (status=%s): %s",
                e.status_code,
                detail,
            )
            raise
        except Exception as e:
            db.rollback()
            logger.exception("Erro inesperado na transação; rollback executado: %s", str(e))
```

---

## 4. Logs produção

| Campo desejado | Onde | Status |
|----------------|------|--------|
| transaction_id | Log de sucesso em `create_transaction` e `_create_transfer` | OK (`extra={"transaction_id": ...}`) |
| user_id | Logs de criação e erro no service | OK |
| external_id | Modelo não tem `external_id` | N/A |
| Erro técnico vs negócio | Rollback em `database_utils`: warning vs exception | OK |
| Stacktrace apenas em erro interno | `logger.exception` só no `except Exception` do service e no rollback técnico | OK |

**Gap:** Em erro **antes** da criação da transação (validação, saldo, etc.) não há `transaction_id` (ainda não existe). Incluir no log algo como `idempotency_key` ou `request_id` no router/middleware ajudaria a correlacionar. O `StructuredLoggingMiddleware` já registra `request_id` e `user_id` quando `ENABLE_STRUCTURED_LOGS=1`, mas o `request_id` não é repassado ao service.

**Recomendação:** Passar `request_id` (ou idempotency key) para o service ou para os logs de rollback no `database_utils` para facilitar debug em produção.

---

## 5. Idempotência

| Verificação | Status | Observação |
|------------|--------|------------|
| Chave única (user_id + key + endpoint) | OK | `IdempotencyKey` com índice UNIQUE; `acquire_idempotency` usa INSERT + IntegrityError |
| Proteção contra replay | OK | Mesmo key + mesmo `request_hash` → resposta cacheada; key com outro body → 400 |
| Retry seguro | **Crítico** | Ver seção 6 (commit da transação e idempotência no mesmo commit) |

O modelo **Transaction** não possui `external_id`. A idempotência é feita apenas por header `Idempotency-Key` e tabela `idempotency_keys`. Não há duplicação por `external_id` no banco.

---

## 6. Concorrência e ciclo de commit (CRÍTICO)

### 6.1 Ordem commit × idempotência

Fluxo atual:

1. `idem.acquire(body)` → INSERT idempotency `in_progress`, `db.flush()` (sem commit).
2. `TransactionService.create_transaction(...)` → `with atomic_transaction(db):` faz **commit** ao sair com sucesso.
3. A sessão é a **mesma** em todo o request. O commit em (2) persiste **tudo** que estava na transação, incluindo a linha de idempotência (in_progress) **e** a transação + ledger.
4. Router: `db.commit()` (redundante), `idem.save_success(200, payload)` (UPDATE para `completed`), `db.commit()`.

**Problema:** Se o processo cair **depois** do commit (2) e **antes** do `save_success`/commit final, o estado persistido é: transação criada + idempotency em `in_progress`. No retry com a mesma key, `acquire_idempotency` encontra `in_progress` e retorna **409 Conflict**. O cliente recebe 409 mesmo com a transação já criada e não recebe o body 200 cacheado.

**Impacto:** Retry após timeout/crash pode devolver 409 em vez de 200 com a transação já criada (pior UX e possível retry desnecessário no cliente).

### 6.2 save_failed não persistido

Em caso de exceção (400/422/500), o router chama `idem.save_failed()`, que faz UPDATE para `failed` e `flush()`. Em seguida a exceção propaga; `get_db` encerra a sessão **sem** commit. O `atomic_transaction` já fez **rollback** (incluindo o INSERT da idempotency em `acquire`). O `row` em memória pode estar expirado; mesmo que o UPDATE seja emitido, não há commit. Resultado: estado `failed` **não** fica persistido. Em retry, a key pode ser reutilizada (novo INSERT). Para erros de validação isso é aceitável; para 500 após commit interno seria inconsistente — hoje o commit interno só ocorre em sucesso, então o cenário 500 “após commit” não acontece, mas o design de idempotência fica frágil.

### 6.3 Race em criação simultânea

- **Advisory locks** (`lock_account`, `lock_accounts_ordered`) + **SELECT FOR UPDATE** (`_lock_accounts_for_update`) garantem ordem determinística e evitam deadlock.
- **Ledger:** `sync_account_balance_from_ledger` usa `row_version` (optimistic lock); conflito → `ConcurrencyConflictError` → 409.

Não foi identificada race que permita duplicar transação ou corromper saldo, desde que o problema de commit + idempotência seja corrigido.

### 6.4 Refresh token durante POST

Auth: `get_current_user` usa `verify_token` (JWT) e não lê refresh no meio do request. Refresh é usado apenas no endpoint de refresh. Portanto **não** impacta um POST de transação em andamento.

---

## 7. Segurança

| Verificação | Status | Detalhe |
|------------|--------|---------|
| Usuário só cria transação na própria conta | OK | Conta filtrada por `Account.user_id == current_user.id`; `validate_ownership(account.user_id, user_id, "conta")` no service |
| Valores negativos indevidos | OK | `amount > 0` em `_validate_transaction_payload`; constraint `check_transaction_amount_positive` no modelo |
| Manipulação de status via payload | OK | Modelo Transaction não tem campo `status` editável pelo cliente; criação não aceita status |
| Manipulação de `transfer_transaction_id` no update | Médio | O **service** aplica `if 'transfer_transaction_id' in update_data: db_transaction.transfer_transaction_id = update_data['transfer_transaction_id']`. O **router** usa `TransactionUpdate` que **não** inclui `transfer_transaction_id`, então a API atual não expõe isso. Risco: se no futuro o schema passar a aceitar esse campo ou o service for chamado por outro caminho, haveria manipulação do vínculo da transferência. Recomendação: remover do service ou ignorar explicitamente no update. |

---

## 8. Resumo de riscos

### Crítico

1. **Commit da transação e idempotência no mesmo commit**  
   - **Onde:** Router chama service que usa `atomic_transaction(db)` e faz commit; a mesma sessão já tinha o INSERT de idempotency em `in_progress`.  
   - **Efeito:** Após sucesso do service, crash antes de `save_success` → retry devolve 409 com transação já criada.  
   - **Fix sugerido:** Garantir que o commit “de negócio” não inclua a linha de idempotência, ou que haja uma única transação controlada pelo router: idempotency acquire (flush), criação da transação **sem** commit interno no service, save_success (flush), um único commit no fim. Isso pode exigir um modo “sem commit” no service (ex.: parâmetro ou contexto) para uso pelo router.

### Médio

2. **save_failed nunca persistido**  
   - **Onde:** Router chama `idem.save_failed()` após exceção; sessão sofreu rollback e não há commit depois.  
   - **Fix:** Em caso de falha, fazer commit explícito da atualização de idempotency para `failed` (em transação separada ou garantindo que apenas o UPDATE da key seja commitado após rollback do handler).

3. **Log de erro sem identificador da operação**  
   - Em erros de validação/negócio antes de existir `transaction_id`, não há `transaction_id` nos logs.  
   - **Fix:** Incluir `request_id` ou `idempotency_key` nos logs do router e, se possível, no service/database_utils.

4. **`transfer_transaction_id` aceito no update no service**  
   - **Onde:** `transaction_service.py` linhas 537–538.  
   - **Fix:** Remover o uso de `update_data['transfer_transaction_id']` no update ou garantir que o router/schema nunca repassem esse campo (e documentar que é interno).

### Baixo

5. **Dois `db.commit()` no router**  
   - **Onde:** `routers/transactions.py` após `create_transaction`: um `db.commit()` antes de `idem.save_success` e outro depois. O primeiro é redundante (o service já commitou).  
   - **Fix:** Remover o primeiro `db.commit()` e manter apenas o commit após `save_success`.

---

## 9. Simulação de cenários (comportamento esperado vs atual)

| Cenário | Esperado | Atual |
|---------|----------|--------|
| Payload válido | 200/201, commit, resposta consistente | OK (200, commit no service; idempotência pode retornar 409 em retry pós-crash — ver crítico) |
| Payload inválido | 400, detail claro | OK (400 com `detail` padronizado) |
| External ID duplicado | 409/422, sem crash | N/A (sem external_id); key idempotência com outro body → 400 |
| Key idempotência duplicada (mesmo body) | 200 com resposta cacheada | OK quando save_success é commitado; em crash após commit do service, retry → 409 |
| Falha DB (ex.: timeout) | Rollback, log, 500 | Rollback e 500 com `_raise_tx_internal`; stacktrace via `logger.exception` |

---

## 10. Recomendações técnicas (fixes)

### 10.1 (Crítico) Desacoplar commit de negócio e idempotência

**Objetivo:** Nunca persistir transação com idempotency ainda em `in_progress` de forma que um crash deixe esse estado permanente.

**Opção A — Uma transação no router (recomendada):**  
- Fazer `acquire` sem commit (apenas flush).  
- Service **não** chamar `atomic_transaction` quando for invocado pelo router de criação (ex.: parâmetro `atomic=True` default True; no router passar `atomic=False` e controlar a transação no router).  
- No router: após `create_transaction(..., atomic=False)`, chamar `idem.save_success(...)`, depois um único `db.commit()`.  
- Em exceção: `idem.save_failed()`, depois `db.commit()` (apenas o UPDATE da key) e re-raise.

**Arquivo:** `backend/routers/transactions.py` (fluxo do POST) e `backend/services/transaction_service.py` (aceitar flag para não fazer commit interno).

**Opção B (alternativa):**  
- `acquire_idempotency` usar sessão/transação separada e fazer commit apenas do INSERT `in_progress`.  
- Service segue commitando sua própria transação.  
- Após sucesso, `save_success` + commit em outra transação.  
- Assim, crash após commit do service deixa idempotency em `in_progress`; no retry ainda 409, mas ao menos não se perde o “completed”. Para retornar 200 no retry seria necessário vincular transação à key (ex.: coluna na transação ou na idempotency) e, ao ver in_progress, checar se já existe transação criada para essa key.

### 10.2 (Médio) Persistir save_failed

- No router, no `except` que chama `idem.save_failed()`: após `save_failed()`, abrir nova transação (ou usar conexão separada) e fazer commit apenas do UPDATE da linha de idempotency para `failed`.  
- Ou: garantir que `save_failed` seja chamado antes do rollback e que em seguida haja um commit explícito da sessão (complexo porque a sessão pode já estar em rollback). A solução mais limpa costuma ser transação separada para idempotency.

### 10.3 (Médio) Log com request_id / idempotency_key

- No router, obter `request_id` (ex.: `request.state.request_id` se o middleware tiver setado) ou idempotency key e passá-los ao service ou aos logs.  
- Em `database_utils`, ao fazer rollback, logar também esse identificador quando disponível (ex.: thread-local ou parâmetro no contexto).

### 10.4 (Médio) Não aceitar transfer_transaction_id no update

**Arquivo:** `backend/services/transaction_service.py`  

Remover ou ignorar:

```python
# Remover ou substituir por: nunca aceitar do cliente
if 'transfer_transaction_id' in update_data:
    db_transaction.transfer_transaction_id = update_data['transfer_transaction_id']
```

Sugestão: remover esse bloco; o vínculo de transferência deve ser definido apenas na criação.

### 10.5 (Baixo) Remover primeiro db.commit() no router

**Arquivo:** `backend/routers/transactions.py` (create_transaction)

- Remover o `db.commit()` que está imediatamente após `TransactionService.create_transaction(...)` e antes de `idem.save_success(...)`, mantendo apenas o `db.commit()` após `save_success`.

---

## 11. Infra e auth (resumo)

- **CORS:** Configurado em `production_server.py` (CORSMiddleware); não interfere na lógica de transação.  
- **Session DB:** Uma sessão por request via `get_db()`; fechada no `finally` após o yield.  
- **Atomic transaction manager:** `atomic_transaction` em `database_utils.py` faz commit em sucesso e rollback em exceção, com log diferenciado.  
- **Auth:** JWT via `get_current_user`; conta filtrada por `current_user.id`; refresh não é usado durante o POST de transação.  
- **Session version / token refresh:** Não impactam o fluxo de criação de transação.

---

## 12. Conclusão

- **Segurança e regras de negócio:** Bem cobertas (ownership, amount > 0, sem status manipulável na criação, locks e ledger).  
- **Erros e rollback:** Claros (4xx/5xx, rollback sempre logado, sem mascarar exceção com 400).  
- **Persistência:** Banco e ledger consistentes dentro da transação; problema é apenas a **ordem** do commit em relação à idempotência.  
- **Logs:** Suficientes para debug, com melhoria possível (request_id/idempotency_key em erros).  
- **Idempotência:** Lógica correta, mas **não é segura para produção** enquanto o commit da transação e o estado da key estiverem no mesmo commit e `save_failed` não for persistido.

**Recomendação final:** Aplicar o fix **crítico** (desacoplar commit de negócio e idempotência) e os fixes **médios** (save_failed, logs, transfer_transaction_id no update) antes de considerar o fluxo **SAFE FOR PRODUCTION** em ambiente financeiro.
