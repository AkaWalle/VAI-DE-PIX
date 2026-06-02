---
paths:
  - "backend/**/*.py"
---

# Regras — Backend FastAPI (`backend/`)

## Arquitetura

- `routers/` → HTTP apenas; delegar para `services/` → `repositories/`.
- Regras de negócio versionadas em `backend/domain/financial_policies/` (novo arquivo de versão, não editar política antiga in-place).

## Invariantes críticos

- **Ledger append-only** (`backend/core/ledger_utils.py`): nunca UPDATE/DELETE em `LedgerEntry`; saldo = soma do ledger.
- **Idempotency-Key** em POSTs de escrita novos.
- Jobs agendados: `pg_advisory_xact_lock` via `backend/core/job_lock.py`.
- Soft delete onde o modelo já usa `deleted_at` — filtrar `deleted_at IS NULL` nas queries.

## Código

- Type hints em funções públicas; Pydantic v2 nos schemas.
- `Depends(get_current_user)` em rotas protegidas (exceto auth público).
- Secrets só em `backend/.env`, nunca no código.

## Testes

- `pytest` a partir de `backend/`: `pytest tests/unit/ -v --tb=short`
- Integração/E2E: `tests/integration/`, `tests/e2e/` (podem exigir Postgres).
