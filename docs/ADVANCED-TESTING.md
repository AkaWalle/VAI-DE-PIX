# Testes avançados de produção (VAI DE PIX)

Este documento descreve os testes avançados que validam o sistema financeiro em cenários de concorrência, falhas, idempotência e latência. **Todos exigem PostgreSQL real** (variável `DATABASE_URL` com URL `postgresql://`). Sem PostgreSQL, os testes são ignorados (skip).

## Objetivo geral

Garantir que o sistema:

- **Não duplica dinheiro**
- **Não perde dinheiro**
- **Não gera estado inconsistente**
- Se comporta corretamente sob **concorrência**, **retry** e **falhas reais**
- Mantém as **invariantes financeiras** (ledger append-only, `account.balance == SUM(ledger_entries.amount)`)

## Regras obrigatórias dos testes

- Usar **PostgreSQL real**, nunca SQLite.
- Usar **pytest**.
- Nenhum teste depende da **ordem de execução**.
- Nenhuma **escrita parcial** pode persistir em falha.
- **Ledger append-only**: nunca atualizar/deletar `ledger_entries`; reversão sempre via nova entrada.
- Testes **devem falhar** se houver race condition real (não mascarar erro).

---

## BLOCO 1 — Testes de concorrência

**Arquivo:** `backend/tests/test_concurrency_transactions.py`

### O que cobre

- Criação concorrente da “mesma” transação (10 threads).
- Transferências concorrentes com saldo limitado (2 transferências de 80 com saldo 100).
- Update vs Delete concorrente na mesma transação.

### Tipo de falha real que representa

- Múltiplos requests simultâneos criando a mesma operação lógica (duplicação de dinheiro).
- Dois usuários/processos tentando transferir mais do que o saldo disponível (saldo negativo).
- Um processo atualizando e outro deletando a mesma transação (estado corrompido ou reversão duplicada).

### Invariantes que protege

- Apenas uma transação criada quando 10 threads tentam criar a “mesma” (1.1; atualmente marcado `xfail` até haver deduplicação no service).
- Apenas uma transferência concluída quando duas de 80 disputam saldo 100 (1.2).
- Estado final consistente (ledger + saldo) quando update e delete concorrem (1.3).
- Nenhuma conta negativa; nenhuma reversão duplicada no ledger.

### Como rodar isoladamente

```bash
cd backend
# Requer DATABASE_URL com PostgreSQL
export DATABASE_URL=postgresql://user:pass@localhost:5432/vai_de_pix_test
pytest tests/test_concurrency_transactions.py -v -m requires_postgres
```

---

## BLOCO 2 — Testes de idempotência e retry

**Arquivo:** `backend/tests/test_idempotency.py` (testes adicionais ao final do arquivo)

### O que cobre

- **2.1** Retry após falha simulada: falha após `ledger.append` (ex.: `sync_account_balance_from_ledger` levanta); reexecução do mesmo request.
- **2.2** Timeout + retry: mock que lança exceção após flush; retry manual do método.

### Tipo de falha real que representa

- Timeout ou falha de rede após o servidor ter escrito no ledger mas antes de responder ao cliente (cliente reenvia).
- Falha no meio da operação (ex.: sync falha após append); cliente retenta.

### Invariantes que protege

- Não duplica ledger nem transaction após retry (2.1, 2.2).
- Estado final consistente: `account.balance == SUM(ledger_entries.amount)`.

### Como rodar isoladamente

```bash
cd backend
export DATABASE_URL=postgresql://...
pytest tests/test_idempotency.py -v -m requires_postgres
```

---

## BLOCO 3 — Chaos tests (falhas difíceis)

**Arquivo:** `backend/tests/test_chaos_failures.py`

### O que cobre

- **3.1** Falha no meio da transferência: exceção após criar a 1ª entrada do ledger, antes da 2ª (transferência).
- **3.2** Job de insights executado duas vezes simultaneamente.

### Tipo de falha real que representa

- Crash ou exceção no meio de uma transferência (duas pernas no ledger).
- Dois workers/schedulers rodando o job de insights ao mesmo tempo (cache e notificações).

### Invariantes que protege

- **3.1** Rollback total: nenhuma `ledger_entry` nem `transaction` da transferência persistida.
- **3.2** Cache consistente (no máximo um registro de cache por usuário); nenhuma explosão de notificações duplicadas.

### Como rodar isoladamente

```bash
cd backend
export DATABASE_URL=postgresql://...
pytest tests/test_chaos_failures.py -v -m requires_postgres
```

---

## BLOCO 4 — Testes de lock / DB lento

**Arquivo:** `backend/tests/test_db_lock_and_latency.py`

### O que cobre

- **4.1** Simular banco lento: uso de `SELECT pg_sleep(...)` (ex.: 0.1 s no teste; em CI pode-se usar 3 s para cenário mais realista), seguido de uma operação de criação de transação.

### Tipo de falha real que representa

- Latência alta ou bloqueio no banco; timeout no client; retry pelo client.

### Invariantes que protege

- Nenhum commit parcial (uma execução completa não deixa estado inconsistente).
- Retry não duplica dados (o teste valida uma execução; documenta o comportamento esperado em retry).

### Como rodar isoladamente

```bash
cd backend
export DATABASE_URL=postgresql://...
pytest tests/test_db_lock_and_latency.py -v -m requires_postgres
```

---

## Rodar todos os testes avançados

```bash
cd backend
export DATABASE_URL=postgresql://user:pass@host:5432/dbname
pytest tests/test_concurrency_transactions.py tests/test_idempotency.py tests/test_chaos_failures.py tests/test_db_lock_and_latency.py -v -m requires_postgres
```

Ou, para rodar apenas os que têm o marker (sem PostgreSQL os que dependem dele serão ignorados):

```bash
pytest tests/ -v -m requires_postgres
```

---

## Fixtures e helpers

- **PostgreSQL:** as fixtures `postgres_engine`, `postgres_session_factory` e `postgres_db` estão em `backend/tests/conftest.py`. Sem `DATABASE_URL` com `postgresql://`, os testes que as usam são ignorados.
- **Helpers:** `backend/tests/helpers_postgres.py` fornece `create_test_user_account_category`, `create_second_account` e `cleanup_test_user` para montar dados de teste e limpeza em PostgreSQL.

---

## Critério de aceitação

O trabalho de testes avançados é considerado concluído quando:

- Todos os **novos** testes passam (ou são skip por falta de PostgreSQL, ou xfail documentado onde aplicável).
- Nenhum **teste antigo** quebra.
- Nenhuma **regra financeira** foi relaxada.
- O **ledger** continua **append-only**.
- O sistema continua **determinístico sob falha** (rollback total em falha no meio da operação).
