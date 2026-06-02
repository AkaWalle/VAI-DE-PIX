# VAI DE PIX

> Aplicação web de controle financeiro pessoal: transações, metas, envelopes (caixinhas), relatórios, automações e despesas compartilhadas — com API REST em FastAPI e interface React.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, TypeScript 5, Vite 7, Tailwind CSS 3, Radix UI, Zustand, TanStack React Query, Axios, Zod |
| Backend | Python 3.11+, FastAPI 0.104, SQLAlchemy 1.4, Alembic, Pydantic 2, JWT, APScheduler |
| Banco | PostgreSQL 15 (obrigatório em dev/prod; SQLite só para casos pontuais documentados no backend) |
| Testes | Vitest (frontend), Pytest (backend) |
| Deploy opcional | Vercel (frontend + serverless `api/`), Railway (`railway.json`) |

## Pré-requisitos

- **Node.js** 20.x e npm
- **Python** 3.11+
- **PostgreSQL** 15+ acessível localmente (ou serviço gerenciado, ex.: Neon)
- Git

## Como rodar

### 1. Banco de dados

Crie o banco `vai_de_pix` no PostgreSQL e anote usuário, senha e host.

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-test.txt
cp .env.example .env
```

Edite `backend/.env` (mínimo):

- `DATABASE_URL` — connection string PostgreSQL
- `SECRET_KEY` — mínimo 32 caracteres
- `FRONTEND_URL` — `http://localhost:5000` (porta do Vite neste projeto)

```bash
alembic upgrade head
python init_db.py
python main.py
```

API: `http://localhost:8000` · OpenAPI: `http://localhost:8000/docs`

### 3. Frontend

Em outro terminal, na raiz do repositório:

```bash
cp env.local.example .env.local
npm install
npm run dev
```

App: `http://localhost:5000`

### 4. Verificação rápida

```bash
npm run type-check
npx vitest run tests/basic.spec.ts
cd backend && pytest tests/unit/ -q --tb=line
```

### Produção local (API + static)

```bash
npm run build
cd backend && python production_server.py
```

## Estrutura do projeto

```
├── src/                 # SPA React (pages, components, stores, services, hooks, lib)
├── backend/             # API FastAPI (routers, services, repositories, domain, core)
│   ├── alembic/         # Migrações de banco
│   └── tests/           # Pytest (unit, integration, e2e)
├── tests/               # Vitest (unit, integration, e2e, basic.spec.ts)
├── api/                 # Entry Vercel serverless (Mangum + FastAPI)
├── docs/                # PRD, arquitetura, runbooks, relatórios
├── specs/               # Templates de especificação de features
├── scripts/             # Utilitários de deploy, migração e manutenção
├── .claude/             # Configuração Claude Code (equipe)
├── .github/workflows/   # CI (Postgres + pytest, etc.)
├── CLAUDE.md            # Regras para agentes de código
└── INDEX.md             # Mapa detalhado do repositório
```

## Variáveis de ambiente

### Frontend (`.env.local` — use `env.local.example`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | Base da API, ex.: `http://localhost:8000/api` |
| `VITE_APP_NAME` | Nome exibido na UI |
| `VITE_DEBUG` | Logs de debug no cliente |
| `VITE_SENTRY_DSN` | Opcional — Sentry no frontend |

### Backend (`backend/.env` — use `backend/.env.example`)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL |
| `SECRET_KEY` | Assinatura JWT |
| `ALGORITHM` | Padrão `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiração do access token |
| `FRONTEND_URL` | Origem CORS (dev: `http://localhost:5000`) |
| `USE_REFRESH_TOKENS` | Opcional — refresh token |
| `SMTP_*` | Opcional — e-mail |
| `WEBHOOK_SECRET` | Opcional — webhooks |

Nunca commite `.env` ou `.env.local`. Apenas os arquivos `*.example`.

### CI/CD — Secrets necessários no GitHub Actions

| Secret | Onde usar | Descrição |
|--------|-----------|-----------|
| `CI_POSTGRES_PASSWORD` | backend-postgres-ci.yml | Senha efêmera do Postgres no CI (não usar a de produção) |
| `VERCEL_TOKEN` | deploy.yml | Token de deploy na Vercel |
| `VERCEL_ORG_ID` | deploy.yml | ID da organização na Vercel |
| `VERCEL_PROJECT_ID` | deploy.yml | ID do projeto na Vercel |
| `RAILWAY_TOKEN` | ci-cd.yml | Token de deploy no Railway |
| `NETLIFY_AUTH_TOKEN` | deploy.yml | Token de deploy no Netlify |
| `NETLIFY_SITE_ID` | deploy.yml | ID do site no Netlify |

Configure em: GitHub → Settings → Secrets and variables → Actions

### Deploy serverless (Vercel — `api/index.py`)

- CORS, `/docs` e OpenAPI seguem `ENVIRONMENT` e `VERCEL` (alinhado a `backend/main.py`).
- Rate limiting usa SlowAPI (`auth.limiter`); na Vercel o IP pode ser do edge — para limites rígidos, use rate limit na plataforma.

## Scripts disponíveis

### npm (raiz)

| Script | Uso |
|--------|-----|
| `npm run dev` | Dev server Vite (porta 5000) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Preview do build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test` / `test:unit` | Vitest em `tests/unit/` |
| `npm run test:all` | Vitest em todo `tests/` |
| `npm run test:prod` | Testes contra API de produção configurada |
| `npm run format` / `format:check` | Prettier em `src/` |
| `npm run assert-auth` | Guarda de refresh token (`scripts/`) |

### Make (raiz)

| Alvo | Uso |
|------|-----|
| `make install` | Backend + frontend |
| `make dev-backend` | `python main.py` |
| `make dev-frontend` | `npm run dev` |
| `make test` | Pytest completo + Vitest unit |
| `make test-unit` | Unitários back + front |
| `make test-e2e` | E2E Pytest + Vitest (`test:all`) |
| `make build` | `npm run build` |
| `make clean` | Remove artefatos de build/cache |

### Backend (`cd backend`)

| Comando | Uso |
|---------|-----|
| `python main.py` | Servidor de desenvolvimento |
| `python production_server.py` | API + frontend estático |
| `alembic upgrade head` | Aplicar migrações |
| `pytest tests/ -v --tb=short` | Suite de testes |

## Contribuindo

1. Fork e branch: `feat/<escopo>/descricao` ou `fix/<escopo>/descricao`
2. Configure `.env` / `.env.local` a partir dos exemplos
3. Antes do PR: `npm run type-check`, `npm run test:unit`, `cd backend && pytest tests/unit/ -v`
4. **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `tipo(escopo): descrição imperativa` (máx. 72 caracteres)

   Escopos comuns: `frontend`, `backend`, `api`, `auth`, `db`, `ui`, `store`, `docs`, `test`

5. Detalhes: [CONTRIBUTING.md](CONTRIBUTING.md) · Mapa: [INDEX.md](INDEX.md) · Agentes: [CLAUDE.md](CLAUDE.md)

## Documentação adicional

- [docs/PRD.md](docs/PRD.md) — requisitos de produto (SDD)
- [ARCHITECTURE.md](ARCHITECTURE.md) — visão arquitetural
- [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) — modelo de ameaças

## Licença

MIT — ver [LICENSE](LICENSE).
