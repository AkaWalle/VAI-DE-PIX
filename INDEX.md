# INDEX — Mapa do repositório VAI DE PIX

Sistema de controle financeiro pessoal (React + FastAPI + PostgreSQL).

Documentação detalhada: [README.md](README.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript 5, Vite 7, Tailwind, Zustand, React Query |
| Backend | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Testes | Vitest (raiz), Pytest (`backend/tests/`) |
| Infra | Makefile, Vercel/Railway (opcional) |

---

## Pastas principais

| Pasta | Conteúdo |
|-------|----------|
| `src/` | SPA React: `pages/`, `components/`, `stores/`, `services/`, `hooks/`, `lib/` |
| `backend/` | API: `routers/`, `services/`, `repositories/`, `domain/`, `core/`, `alembic/` |
| `backend/tests/` | Pytest: `unit/`, `integration/`, `e2e/` |
| `tests/` | Vitest: `unit/`, `integration/`, `basic.spec.ts` (sanidade) |
| `docs/` | PRD, SPEC, runbooks, threat model, relatórios |
| `specs/` | Templates de feature (`specs/feature.md`) |
| `.claude/` | Config Claude Code: hooks, rules, settings, agents |

---

## Como rodar (desenvolvimento)

### Pré-requisitos

- Node 20.x, npm
- Python 3.11+, venv em `backend/`
- PostgreSQL 15+ (local ou gerenciado)

### Backend (`backend/`)

```bash
cp .env.example .env   # editar DATABASE_URL, SECRET_KEY
pip install -r requirements.txt
python init_db.py
alembic upgrade head
python main.py         # http://localhost:8000
```

### Frontend (raiz)

```bash
cp env.local.example .env.local   # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev            # http://localhost:5000
```

### Atalhos Make

```bash
make install
make dev-backend
make dev-frontend
make test
make build
```

---

## Testes

```bash
# Sanidade rápida
npx vitest run tests/basic.spec.ts

# Frontend
npm run type-check
npm run test:unit

# Backend
cd backend && pytest tests/unit/ -v --tb=short
cd backend && pytest tests/ -v --tb=short   # suite completa
```

### Pre-push (Claude Code / Git)

Script: [.claude/hooks/pre-push.sh](.claude/hooks/pre-push.sh)

```bash
# Git hook manual (Git Bash / Linux / macOS)
cp .claude/hooks/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

---

## Spec-Driven Development (SDD)

1. **RESEARCH** → `docs/PRD.md`
2. **PLANNING** → `docs/SPEC.md`
3. **IMPLEMENT** → seguir fases da SPEC

Template de feature: [specs/feature.md](specs/feature.md)

---

## Claude Code / Cursor

| Arquivo | Uso |
|---------|-----|
| [CLAUDE.md](CLAUDE.md) | Regras compartilhadas da equipe |
| `CLAUDE.local.md` | Preferências pessoais (gitignored) |
| [.claude/settings.json](.claude/settings.json) | Permissões e hooks do time |
| `.claude/settings.local.json` | Overrides locais (gitignored) |
| [.claude/rules/](.claude/rules/) | Regras por glob (`src/**`, `backend/**`) |
| [.claude/agents/](.claude/agents/) | Subagentes (security, UI/UX) |

---

## Como contribuir

1. Branch: `feat/<escopo>/descricao` ou `fix/<escopo>/descricao`
2. Conventional Commits: `tipo(escopo): descrição imperativa` (máx. 72 caracteres)
3. Rodar `npm run type-check`, testes Vitest e Pytest relevantes
4. Abrir PR — ver [CONTRIBUTING.md](CONTRIBUTING.md)

### Escopos comuns de commit

`frontend`, `backend`, `api`, `auth`, `db`, `ui`, `store`, `pix`, `deploy`, `docs`, `test`

---

## Invariantes (não quebrar)

- Ledger append-only — saldo derivado, nunca armazenado direto
- `Idempotency-Key` em POSTs de escrita
- Validação: Zod (front) + Pydantic (back); back autoritativo
- Jobs: advisory lock em `backend/core/job_lock.py`
