# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Spec-Driven Development (SDD)

**Do not implement without an approved spec.** Phases:

1. **RESEARCH** → produce `docs/PRD.md` → new session
2. **PLANNING** → read `PRD.md` → produce `docs/SPEC.md` → new session
3. **IMPLEMENT** → read `SPEC.md` → implement phase by phase

If asked to implement directly, check whether `PRD.md` and `SPEC.md` exist; otherwise start from the correct phase.

---

## Commands

### Backend (run from `backend/`)
```bash
python main.py                            # Dev server (port 8000)
python production_server.py               # Prod server (API + static frontend)
python init_db.py                         # Initialize DB
alembic upgrade head                      # Run migrations
alembic revision --autogenerate -m "msg"  # Create migration
pytest tests/ -v --tb=short              # All backend tests
pytest tests/unit/ -v                    # Unit tests only
pytest tests/e2e/ -v                     # E2E tests only
pytest tests/ --cov=backend --cov-report=term-missing  # With coverage
```

### Frontend (run from root)
```bash
npm run dev          # Dev server (port 5000)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check (no emit)
npm run test         # Vitest unit tests
npm run test:unit    # Unit tests only
```

### Make shortcuts
```bash
make dev-backend     # Backend dev server
make dev-frontend    # Frontend dev server
make test            # All tests (backend + frontend)
make test-unit       # Unit tests only
make test-e2e        # E2E tests only
make coverage        # Coverage reports
make build           # Production build
make clean           # Remove build artifacts and caches
```

---

## Architecture

**VAI DE PIX** is a personal finance management system. The backend serves a REST API; the production server also serves the compiled frontend as static files.

### Request Flow
```
React SPA (port 5000 dev)
  → JWT Bearer token in Authorization header
  → FastAPI routers (port 8000 dev)
  → Service layer (business logic)
  → Repository layer
  → PostgreSQL (SQLAlchemy ORM)
```

### Key Directories

| Path | Purpose |
|------|---------|
| `src/` | React + TypeScript frontend |
| `src/pages/` | 13 lazy-loaded route pages |
| `src/stores/` | Zustand state (auth, financial data, activity feed) |
| `src/services/` | Axios-based API service layer |
| `backend/routers/` | FastAPI route handlers (16 files) |
| `backend/services/` | Business logic layer |
| `backend/repositories/` | Data access layer |
| `backend/domain/` | Versioned financial & insight policies |
| `backend/core/` | Shared utilities (security, ledger, jobs, metrics) |
| `backend/alembic/` | Database migrations |
| `backend/tests/` | Backend test suite |
| `docs/` | Architecture, threat model, runbooks (40+ files) |

### Critical Backend Modules
- `backend/core/ledger_utils.py` — Append-only ledger; balances are derived from ledger sums, never stored directly
- `backend/core/job_lock.py` — `pg_advisory_xact_lock` ensures single-worker execution per background job
- `backend/core/security.py` — Password hashing and JWT verification
- `backend/auth_utils.py` — JWT generation with optional refresh token support
- `backend/domain/financial_policies/` — Versioned business rules (ledger_v1, transfers_v1, goals_v1)

### Frontend State
- `src/stores/auth-store-api.ts` — Auth state (Zustand); JWT stored in localStorage
- `src/lib/api.ts` — Axios instance with base URL from `VITE_API_URL`
- React Query (TanStack) handles server-state caching on top of the service layer

### Background Jobs (APScheduler)
Recurring transactions, budget alerts, insights computation, balance snapshots, and weekly notifications. All jobs use advisory locks for concurrency safety. Jobs are registered in `backend/main.py`.

---

## Environment Setup

**Backend** — copy `backend/.env.example` to `backend/.env`:
```
DATABASE_URL=postgresql://user:pass@host:5432/vai_de_pix
SECRET_KEY=<min 32 chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:5000
```

**Frontend** — copy `env.local.example` to `.env.local`:
```
VITE_API_URL=http://localhost:8000/api
```

---

## Key Invariants

- **Ledger is append-only.** Never update or delete `LedgerEntry` rows; balance is always computed from the ledger sum.
- **Idempotency.** POST endpoints accept an `Idempotency-Key` header — honor it when adding new write endpoints.
- **Validation split.** Frontend uses Zod; backend uses Pydantic. Both must validate; backend is authoritative.
- **Background job safety.** New scheduled jobs must acquire `pg_advisory_xact_lock` via `job_lock.py`.
- **Versioned policies.** Business rule changes go in a new version file under `backend/domain/`, not in-place edits.

---

## Language & Communication

- Respostas ao usuário em **português (pt-BR)**.
- Código, nomes de variáveis e commits em **inglês** (padrão do repositório).
- Preferências pessoais (caminhos, tokens, aliases): `CLAUDE.local.md` (gitignored).

---

## Commit Convention (Conventional Commits 1.0.0)

Formato: `tipo(escopo): descrição imperativa` (máx. 72 caracteres, sem ponto final).

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Testes |
| `docs` | Documentação |
| `chore` | Tooling, deps |
| `ci` | Pipelines |

Escopos comuns neste repo: `frontend`, `backend`, `api`, `auth`, `db`, `ui`, `store`, `pix`, `deploy`, `docs`, `test`.

Exemplos:

```
feat(api): add idempotency key to transfer endpoint
fix(auth): prevent refresh token reuse after rotation
test(ledger): assert balance derived from append-only entries
```

Nunca commitar `.env`, `backend/.env`, chaves ou tokens. Preferir commits atômicos.
