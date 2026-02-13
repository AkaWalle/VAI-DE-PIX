# Arquitetura — Vai de Pix

Visão técnica de componentes, fluxos e decisões. Atualizado com Trilhas 5–7.

---

## 1. Visão geral

- **Backend:** FastAPI + SQLAlchemy + Alembic. PostgreSQL em produção; SQLite em dev/test.
- **Fonte da verdade financeira:** Ledger contábil (append-only). Saldo da conta = soma do ledger; `account.balance` é cópia sincronizada.
- **Regras e invariantes:** `docs/FINANCIAL-RULES.md`; testes em `tests/test_financial_invariants.py`.

---

## 2. Ledger e saldo

- **ledger_entries:** apenas INSERT; sem UPDATE/DELETE na aplicação.
- **Saldo:** `core/ledger_utils.get_balance_from_ledger(account_id)`; `sync_account_balance_from_ledger(account_id)` atualiza `account.balance` após operações.
- **Transações atômicas:** `core/database_utils.atomic_transaction(db)` — commit em sucesso, rollback em exceção.

---

## 3. Snapshots de saldo (Trilha 5)

- **Objetivo:** performance em leituras históricas sem perder verdade; ledger continua fonte da verdade.
- **Modelo:** `AccountBalanceSnapshot` — `account_id`, `snapshot_date` (YYYY-MM-01), `balance`, UNIQUE(account_id, snapshot_date).
- **Serviço:** `services/balance_snapshot_service.py` — `compute_monthly_snapshots(db, account_id=None, year=None, month=None)` calcula saldo acumulado até o fim do mês via ledger e persiste/atualiza snapshot (idempotente).
- **Leitura histórica:** `get_balance_from_ledger_until(account_id, until_dt, db)` para saldo até uma data; para períodos longos pode-se usar snapshot mais recente + delta do ledger (opcional).
- **Jobs:** `execute_monthly_snapshots` (1º dia do mês às 1h); `execute_reconcile_snapshots` (diário às 2h) — recalcula via ledger, compara com snapshot; divergência > ε → log ERROR (sem dados financeiros em texto). Ver `FAILURE-SIMULATION.md` e `INCIDENT-PLAYBOOK.md`.

---

## 4. Idempotência (Trilha 6.1)

- **Objetivo:** retry seguro em ações mutáveis; mesma chave + mesmo body → mesma resposta; mesma chave + body diferente → 409.
- **Tabela:** `idempotency_keys` — key, user_id, endpoint, request_hash, response_payload, created_at; UNIQUE(key, endpoint).
- **Header:** `Idempotency-Key` (opcional). Endpoints: POST /api/transactions, POST /api/goals.
- **Fluxo:** antes de executar: se key existe e request_hash igual → retorna response_payload salvo; se key existe e request_hash diferente → 409; senão executa, salva resposta, retorna.
- **Serviço:** `services/idempotency_service.py`.

---

## 5. Concorrência (Trilha 6.2)

- **row_version em Account:** incrementado a cada mudança de saldo; validação em `sync_account_balance_from_ledger` (UPDATE … WHERE row_version=?); conflito → `ConcurrencyConflictError` → HTTP 409.
- **SELECT … FOR UPDATE:** em operações financeiras (criar/atualizar/deletar transação), as contas afetadas são bloqueadas com `with_for_update()` em ordem de id (evita deadlock) antes de ledger + sync.
- **Serviço:** `TransactionService` trata `ConcurrencyConflictError` e retorna 409; `core/ledger_utils.py` define a exceção e o sync com optimistic locking.
- **Testes:** `tests/test_concurrency.py` — row_version na conta, incremento após transação, sync com conflito (0 linhas) → exceção, e 409 na API.

---

## 6. Governança de regras (Trilha 7)

- **Versionamento:** toda regra deve ter rule_id, rule_version, effective_from. Insights persistem rule_id, rule_version e valores usados. Regras novas não recalculam histórico automaticamente.
- **Regressão:** para cada regra, dataset fixo e teste de resultado esperado; bug financeiro → novo teste + atualização em FINANCIAL-RULES.md.

---

## 7. Observabilidade e operação

- **Logs:** estruturados (core/logging_config); sem dados sensíveis em texto.
- **Sentry:** configurável; sem valores financeiros nem PII em mensagens.
- **Métricas:** GET /metrics (Prometheus); insights_*, etc.
- **Health:** GET /health, GET /api/health.
- **Backup:** docs/BACKUP-POSTGRESQL.md.

---

## Referências

- FINANCIAL-RULES.md — regras, fórmulas, invariantes, edge cases.
- DATA-CLASSIFICATION.md, DATA-RETENTION.md — LGPD.
- FAILURE-SIMULATION.md, INCIDENT-PLAYBOOK.md — falhas e resposta a incidentes.
- READY-TO-SCALE-CHECKLIST.md — checklist de escala.
