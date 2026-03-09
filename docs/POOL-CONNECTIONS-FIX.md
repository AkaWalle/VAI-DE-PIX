# Diagnóstico e correção: pool de conexões e sessões (idempotência)

## 1. Diagnóstico do problema

### Sintoma
```
sqlalchemy.exc.TimeoutError:
QueuePool limit of size 1 overflow 0 reached
connection timed out
```
Ocorria durante chamadas a rotas que usam **idempotency middleware** (ex.: `POST /api/transactions`, `POST /api/goals`), ao executar `db.flush()` dentro do serviço de idempotência.

### Causa raiz
- O **engine** em produção estava configurado com `pool_size=1` e `max_overflow=0`, ou seja, **apenas uma conexão** disponível por processo.
- No fluxo de criação de transação com Idempotency-Key:
  1. A dependency `get_db` é resolvida e abre a **sessão da request** (consome 1 conexão).
  2. O handler chama `idem.acquire(body)` → `run_with_idempotency_session(acquire_idempotency(...))`, que abre uma **segunda sessão** para crash safety.
  3. A segunda sessão tenta obter uma conexão do pool, mas o limite já foi atingido → o pool espera até o `pool_timeout` (default 30s) e dispara `TimeoutError`.
- O uso de **sessão separada** para idempotência é intencional (commit independente; crash safety). O problema não é o design, e sim o tamanho do pool insuficiente para “1 request + 1 sessão de idempotência” (e possivelmente `save_success`/`save_failed` em sequência).

### Onde o engine era criado
- **Arquivo:** `backend/database.py`
- **Trecho:** criação do `engine` para PostgreSQL em produção (bloco `if is_production`).

### Configuração incorreta (identificada)
```python
# backend/database.py (ANTES)
if is_production:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        encoding='utf-8',
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0,
        pool_recycle=300,
    )
```
- **pool_size=1**: só uma conexão no pool.
- **max_overflow=0**: nenhuma conexão extra sob demanda.
- **pool_timeout**: não definido (default 30).
- **pool_recycle=300**: adequado para serverless; com pool maior, 1800 é aceitável e reduz recriação de conexões.

---

## 2. Versão corrigida do código

### Engine (database.py)
```python
# Em produção (Vercel/Neon/Fly/Render): pool compatível com idempotência (request + sessão separada)
# pool_size=1 + max_overflow=0 causava TimeoutError ao usar get_db + run_with_idempotency_session
if is_production:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        encoding='utf-8',
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )
```

Alterações:
- **pool_size=5**: permite várias requisições simultâneas, cada uma podendo usar 1 conexão da request + 1 da idempotência.
- **max_overflow=10**: picos de até 15 conexões por processo.
- **pool_timeout=30**: falha em 30s se não houver conexão disponível (evita espera indefinida).
- **pool_recycle=1800**: recicla conexões a cada 30 min, reduzindo risco de conexão “stale” (em Neon com scale-to-zero, se surgirem erros de conexão fechada, considerar `pool_recycle=300`).

---

## 3. Verificações realizadas (sessões e fechamento)

### get_db (database.py)
- Padrão correto: `try` / `yield` / `finally: db.close()`. Nenhuma alteração necessária.

### run_with_idempotency_session (database.py)
- Padrão correto: `try` / `operation(db)` + `commit` / `except` / `rollback` / `finally: db.close()`. Nenhuma alteração necessária.

### IdempotencyContext (middleware/idempotency.py)
- `acquire`, `save_success` e `save_failed` usam `run_with_idempotency_session`; cada chamada abre uma sessão, usa e fecha no `finally`. Não há vazamento de sessão.

### Uso direto de SessionLocal
- **recurring_job.py**, **activity_feed_ws.py**, **init_db.py**, **scripts** (backfill_ledger, recalculate_all_balances, verificar_banco, test_user_registration), **add_default_categories.py**: todos usam `try`/`finally` com `db.close()`. Nenhum vazamento identificado nos arquivos analisados.

### flush() no idempotency_service
- `db.flush()` é usado para obter efeito do INSERT/UPDATE na mesma transação (ex.: para leitura consistente). Não causa vazamento; apenas segura a conexão durante a operação. Com pool aumentado, não há contenção indevida.

---

## 4. Sugestões para evitar esgotamento de conexões

1. **Manter pool_size/max_overflow**: Em ambiente serverless (Vercel/Fly/Render), 5+10 por processo é razoável; monitorar uso no Neon/Data source.
2. **Neon scale-to-zero**: Se o banco “acorda” após inatividade e surgirem erros de conexão fechada, testar `pool_recycle=300`.
3. **Evitar SessionLocal() direto em novos fluxos**: Preferir `Depends(get_db)` em rotas e, em jobs/scripts, padrão `with` ou `try/finally` e `db.close()`.
4. **Métricas (opcional)**: Expor métricas do pool (ex.: `engine.pool.size()`, `checkedin()`, `overflow()`) para alertas se o pool se aproximar do limite.

---

## 5. Condições de corrida e deadlocks (idempotência)

- **acquire_idempotency**: usa `INSERT` e, em conflito, `SELECT ... FOR UPDATE` na linha existente. Lock é de linha e de curta duração; risco de deadlock entre requests é baixo, desde que a ordem de lock seja consistente (mesma chave → mesma linha).
- **save_completed_by_key / save_failed_by_key**: fazem `SELECT ... FOR UPDATE` e depois `UPDATE` na mesma linha. Transação curta; sem lock de múltiplas tabelas em ordem diferente, deadlock é improvável.
- **Sessão separada para idempotência**: garante que o commit do estado “in_progress” / “completed” / “failed” não dependa do commit da transação principal, evitando que uma falha no handler deixe a chave travada sem conclusão.

Nenhuma alteração de regra de negócio ou de locking foi feita; apenas a configuração do pool.

---

## 6. Checklist final para validar a correção

- [ ] **Build/import**: Backend sobe sem erro (local e no deploy).
- [ ] **Variáveis**: `DATABASE_URL` e demais env de produção configuradas (Vercel/Fly/Render e Neon).
- [ ] **POST com Idempotency-Key**: `POST /api/transactions` com header `Idempotency-Key: <uuid>` não retorna mais `TimeoutError` e retorna 200 com body esperado.
- [ ] **Retry idempotente**: Segunda requisição com mesma key e mesmo body retorna mesma resposta (200) sem criar transação duplicada.
- [ ] **POST goals com Idempotency-Key**: `POST /api/goals` com Idempotency-Key funciona sem timeout.
- [ ] **Concorrência leve**: 2–3 requests simultâneos (com ou sem Idempotency-Key) concluem sem erro de pool.
- [ ] **Logs**: Nenhum `QueuePool limit of size ... reached` ou `connection timed out` nos logs de produção.
- [ ] **Neon (se aplicável)**: Se usar scale-to-zero e aparecerem erros de conexão fechada, testar `pool_recycle=300` em produção.

Após marcar todos os itens acima, o problema de pool e sessões pode ser considerado resolvido.
