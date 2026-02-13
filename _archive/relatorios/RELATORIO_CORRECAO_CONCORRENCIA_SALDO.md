# Relatório — Correção de concorrência (saldo insuficiente em despesas/transferências)

**Projeto:** Vai de Pix  
**Data:** 2026-02-04  
**Objetivo:** Garantir que em cenário concorrente apenas uma operação que exceda o saldo seja aceita; impedir saldo negativo.

---

## 1. Estratégia escolhida: FOR UPDATE + validação de saldo

Foi mantida a estratégia já existente (**advisory lock + SELECT FOR UPDATE**) e adicionada **validação explícita de saldo** após o lock:

1. **Lock já existente:** `lock_account(account_id, db)` (pg_advisory_xact_lock) e `_lock_accounts_for_update([account.id], db)` (SELECT ... FOR UPDATE) garantem serialização por conta.
2. **Novo:** Após adquirir o lock, **antes** de criar a transação e inserir no ledger:
   - **Despesa (expense):** `current_balance = get_balance_from_ledger(account.id, db)`; se `current_balance < amount` → `HTTP 400 Bad Request` ("Saldo insuficiente para esta despesa.").
   - **Transferência:** mesma checagem na conta de origem; se `current_balance < amount` → `HTTP 400 Bad Request` ("Saldo insuficiente para esta transferência.").

Assim, a race condition é eliminada porque:

- O **lock** (advisory + FOR UPDATE) serializa as operações na mesma conta: a segunda requisição só vê o saldo **depois** da primeira ter commitado (ou ter feito rollback).
- A **validação** ocorre **dentro** da mesma transação, **depois** do lock: o saldo lido é o saldo atual (incluindo débitos já commitados por outras transações). Se for insuficiente, a transação atual é abortada (rollback) e o cliente recebe 400, sem nenhuma escrita no ledger.

Não foi usado isolamento SERIALIZABLE nem retry; apenas a validação de saldo após o lock já existente.

---

## 2. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `backend/services/transaction_service.py` | (1) Import de `Decimal` e `get_balance_from_ledger`. (2) No fluxo **income/expense** (`create_transaction`): após `_lock_accounts_for_update([account.id], db)`, se `transaction_type == 'expense'`, calcula `current_balance = get_balance_from_ledger(account.id, db)` e, se `current_balance < Decimal(amount)`, lança `HTTPException(400, "Saldo insuficiente para esta despesa.")`. (3) No fluxo **transfer** (`_create_transfer`): após `_lock_accounts_for_update([account.id, to_account.id], db)`, calcula `current_balance = get_balance_from_ledger(account.id, db)` e, se `current_balance < Decimal(amount)`, lança `HTTPException(400, "Saldo insuficiente para esta transferência.")`. |

Nenhuma migration, nenhuma alteração de schema, contrato da API ou teste existente.

---

## 3. Por que a race condition foi eliminada

- **Antes:** Duas requisições de despesa (ex.: 80 cada) em conta com saldo 100 podiam ser serializadas pelo lock, mas **não havia checagem de saldo**. A primeira debitava 80 (saldo 20); a segunda também debitava 80 (saldo -60), pois o código apenas gravava no ledger sem validar saldo.
- **Agora:** A primeira requisição adquire o lock, lê saldo 100, 100 >= 80, cria transação e ledger, faz commit. A segunda adquire o lock (após o commit da primeira), lê saldo **20** (já atualizado pelo ledger), 20 < 80 → lança 400 e faz rollback; nenhuma linha nova no ledger. Assim:
  - **Saldo negativo** deixa de ser possível para despesas e transferências (conta de origem).
  - **Duas despesas concorrentes** não podem exceder o saldo: uma passa, a outra recebe 400.
  - O **ledger** permanece consistente (apenas débitos com saldo suficiente são persistidos).

O lock garante que a leitura do saldo (via `get_balance_from_ledger`) e a escrita no ledger ocorrem em sequência correta; a validação garante que nenhum débito ultrapasse o saldo lido.

---

## 4. Resultado dos testes

### 4.1 Host Windows (SQLite para invariants; Postgres com encoding conhecido)

- **`pytest backend/tests/test_financial_invariants.py -v`:** **8 passed** (sem regressão nos invariantes financeiros).
- **`pytest backend/tests/test_concurrency_transactions.py -v`:** 2 failed com `UnicodeDecodeError` ao conectar ao PostgreSQL (psycopg2 + path/usuário Windows); 1 xfailed. Falhas atribuídas ao ambiente (encoding), não à correção.

### 4.2 Container backend (Linux, PostgreSQL)

- **`pytest tests/test_financial_invariants.py tests/test_concurrency_transactions.py -v`:**  
  **10 passed**, **1 xfailed** (teste marcado como xfail por design).
  - Incluindo:
    - `test_concurrent_transfers_limited_balance_only_one_succeeds` — **PASSED**
    - `test_concurrent_update_vs_delete_consistent_final_state` — **PASSED**

Conclusão: testes de concorrência passam no ambiente com PostgreSQL (container); invariantes financeiros seguem passando; nenhuma regressão observada.

---

## 5. Garantias após a correção

- **Saldo negativo:** Impedido para despesas e para a conta de origem em transferências (validação após lock).
- **Duas despesas/transferências concorrentes excedendo o saldo:** Apenas uma é aceita; a outra recebe HTTP 400 e não persiste no ledger.
- **Ledger:** Continua consistente; débitos só são inseridos quando o saldo (calculado do ledger) é suficiente.

---

*Relatório gerado ao final da correção de concorrência (saldo insuficiente). Nenhuma migration criada; nenhuma alteração de schema ou contrato da API.*
