# Auditoria Externa & Forense — Vai de Pix

Documento da Trilha 10. Como reconstruir estado financeiro passado e auditar operações.

---

## 1. Princípios

- **Ledger append-only:** tabela `ledger_entries` não possui UPDATE nem DELETE. Toda alteração de saldo é representada por novas linhas (incluindo reversões).
- **Saldo = SUM(ledger_entries.amount)** por `account_id`. A qualquer momento, o saldo de uma conta pode ser recalculado a partir do ledger.
- **Transações** (`transactions`) podem ter `deleted_at` (soft delete). O ledger contém tanto as entradas originais quanto as entradas de reversão (mesmo `transaction_id`, amount de sinal oposto).

---

## 2. Reconstruir saldo histórico

Para uma conta e uma data/hora no passado (T):

1. **Saldo em T** = `SUM(ledger_entries.amount)` onde `account_id = ?` e `created_at <= T`.
2. Implementação: `services/balance_snapshot_service.get_balance_from_ledger_until(account_id, until_dt, db)`.
3. **Snapshots mensais** (`account_balance_snapshots`): cache do saldo ao fim de cada mês; recalculável a partir do ledger com `compute_monthly_snapshots` (idempotente).

**Exemplo (T-1, T-2):** Para “saldo há 1 dia” e “saldo há 2 dias”, use `get_balance_from_ledger_until(account_id, T-1, db)` e `get_balance_from_ledger_until(account_id, T-2, db)`.

---

## 3. Auditar uma transferência

Uma transferência é composta por:

- Duas linhas em `transactions` (origem e destino), ligadas por `transfer_transaction_id`.
- Duas ou mais linhas em `ledger_entries`: débito na conta de origem, crédito na conta de destino (e, em caso de exclusão, entradas de reversão com mesmo `transaction_id`).

**Passos:**

1. Localizar a transação de origem: `transactions WHERE id = ? AND type = 'transfer'`.
2. Obter a parceira: `transactions WHERE id = transaction.transfer_transaction_id`.
3. Listar entradas do ledger: `ledger_entries WHERE transaction_id IN (id_origem, id_destino)` ordenado por `created_at`.
4. Validar: soma das entradas por conta = zero (débito + crédito); soma global = zero.
5. Se a transação foi “deletada” (soft delete): `deleted_at IS NOT NULL`; o ledger já contém as reversões (entradas de sinal oposto), então o saldo atual reflete a exclusão.

---

## 4. Provar ausência de mutação no ledger

- **Schema:** não existem operações de UPDATE ou DELETE na tabela `ledger_entries` no código de aplicação nem em migrações destrutivas para essa tabela.
- **Reversões:** “estornar” uma transação não altera linhas antigas; insere-se novas linhas com `amount` de sinal oposto e mesmo `transaction_id`.
- **Auditoria:** qualquer ferramenta de auditoria do banco pode verificar que não há UPDATE/DELETE em `ledger_entries` (ex.: triggers, log de operações, ou inspeção do código em `repositories/ledger_repository.py` e `services/transaction_service.py`).

---

## 5. Relação ledger ↔ transaction ↔ reversal

| Evento | Ledger | Transaction |
|--------|--------|-------------|
| Criação (income/expense) | INSERT 1 linha (credit ou debit) | INSERT 1 linha |
| Criação (transfer) | INSERT 2 linhas (débito origem, crédito destino) | INSERT 2 linhas (parceiras) |
| Atualização | INSERT reversão da antiga + INSERT nova | UPDATE |
| Exclusão (soft) | INSERT reversões (uma por entrada original) | UPDATE deleted_at |
| Exclusão (hard) | Reversões já existem; não se remove ledger | DELETE da linha em transactions |

O ledger **nunca** remove nem altera linhas; apenas adiciona. Assim, o histórico completo é preservado e o saldo em qualquer T é sempre reconstruível.

---

## 6. Scripts e testes

- **Recálculo de saldo:** `scripts/recalculate_all_balances.py` (usa transações; em produção o saldo é derivado do ledger via `sync_account_balance_from_ledger`).
- **Backfill do ledger:** `scripts/backfill_ledger.py` (uma vez; migração de transações antigas para o ledger).
- **Testes forenses:** `backend/tests/test_auditability.py` — reconstrução de saldo em T-1/T-2, auditoria de transferência deletada, validação de reversões no ledger.

---

## Referências

- `backend/core/ledger_utils.py` — `get_balance_from_ledger`
- `backend/services/balance_snapshot_service.py` — `get_balance_from_ledger_until`, `compute_monthly_snapshots`
- `backend/repositories/ledger_repository.py` — append e consultas
- `backend/services/transaction_service.py` — reversões em update e delete
- `docs/FINANCIAL-RULES.md` — invariantes
