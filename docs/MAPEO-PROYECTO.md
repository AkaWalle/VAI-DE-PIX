# Mapeamento do projeto VAI DE PIX (Fase 2)

Documento de referência: estrutura, camadas, dependências, ambiente, modelos, API, integrações, migrations e frontend. Usado como base para documentação (Fase 3) e para corrigir gaps.

---

## 1. Estrutura de pastas

```
Vai de pix/
├── backend/                    # API FastAPI
│   ├── alembic/                 # Migrations
│   │   └── versions/            # 35 arquivos de migração
│   ├── core/                    # Middlewares, segurança, jobs, políticas
│   ├── domain/                  # Regras de negócio (financial_policies, insight_policies)
│   ├── middleware/              # Idempotência
│   ├── realtime/                # WebSocket (activity feed)
│   ├── repositories/            # Acesso a dados
│   ├── routers/                 # Endpoints por domínio
│   ├── scripts/                 # Utilitários (validate_env, backfill, etc.)
│   ├── security/                # Roles e permissions
│   ├── services/                # Orquestração (transações, contas, reports, etc.)
│   ├── tests/                   # Unit, integration, e2e
│   ├── auth_utils.py
│   ├── database.py
│   ├── main.py                  # Servidor de desenvolvimento
│   ├── models.py
│   ├── production_server.py     # Servidor que serve API + estáticos
│   ├── schemas.py
│   └── .env.example
├── src/                         # Frontend React + Vite
│   ├── components/              # UI (shadcn), forms, layout, auth
│   ├── forms/                   # Controllers/schemas de formulários (transaction)
│   ├── hooks/
│   ├── layouts/
│   ├── lib/                     # api.ts, http-client, auth, token-manager, sync
│   ├── pages/
│   ├── services/                # Chamadas à API por domínio
│   ├── stores/                  # Zustand (auth, financial, sync, activity-feed, shared-expenses)
│   └── utils/
├── tests/                       # E2E Playwright (frontend)
├── api/                         # requirements.txt (provavelmente serverless/Vercel)
├── docs/
├── scripts/
├── env.local.example            # Variáveis do frontend
├── package.json
├── requirements.txt             # Dependências raiz (mangum, etc.)
├── vite.config.ts
├── tailwind.config.ts
├── CHANGELOG.md
└── README.md
```

---

## 2. Arquivos principais por camada

| Camada | Arquivos principais |
|--------|----------------------|
| Backend entrada | `backend/main.py` (dev), `backend/production_server.py` (API + estáticos) |
| Banco | `backend/database.py` (engine, SessionLocal, get_db), `backend/models.py` (SQLAlchemy) |
| API | `backend/routers/*.py` (auth, transactions, goals, envelopes, categories, accounts, reports, notifications, insights, privacy, shared_expenses, automations, me_data) |
| Frontend entrada | `src/main.tsx`, `src/App.tsx`, `vite.config.ts` |
| Cliente API | `src/lib/api.ts` (API_ENDPOINTS, baseURL), `src/lib/http-client.ts` (axios + JWT) |
| Estado | `src/stores/auth-store-api.ts`, `src/stores/financial-store.ts`, `src/stores/sync-store.ts`, `src/stores/shared-expenses-store.ts`, `src/stores/activity-feed-store.ts` |

**Observação:** O router `activity_feed` existe em `backend/routers/activity_feed.py`, mas **não está registrado** em `main.py` nem em `production_server.py`. O frontend chama `/activity-feed`; sem esse include a rota REST de activity feed não está ativa.

---

## 3. Dependências

**Frontend (package.json):** React 18, react-router-dom, @tanstack/react-query, axios, zustand, react-hook-form, zod, recharts, date-fns, lucide-react, radix-ui (vários), tailwindcss, sonner, vaul, cmdk, next-themes, @sentry/react. Build: Vite 7, @vitejs/plugin-react-swc, TypeScript, tailwind, postcss, autoprefixer. Testes: vitest, @playwright/test.

**Backend (backend/requirements.txt):** fastapi 0.104.1, uvicorn, gunicorn, sqlalchemy 1.4.53, psycopg2-binary, python-jose[cryptography], passlib[bcrypt], python-multipart, python-dotenv, pydantic 2.9.2, pytest, httpx, bcrypt, alembic 1.13.1, email-validator, requests, slowapi, APScheduler, sentry-sdk[fastapi], prometheus_client.

**Raiz (requirements.txt):** fastapi, mangum (serverless), mesmas libs principais; usado para deploy (ex.: Vercel). **api/requirements.txt:** subset para API serverless.

---

## 4. Variáveis de ambiente

**Backend (backend/.env.example):** DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, USE_REFRESH_TOKENS, REFRESH_TOKEN_*, PORT, HOST, DEBUG, FRONTEND_URL, SMTP_*, WEBHOOK_SECRET, SENTRY_DSN, ENVIRONMENT, VERCEL, RAILWAY_ENVIRONMENT.

**Frontend (env.local.example):** VITE_API_URL, VITE_APP_NAME, VITE_APP_VERSION, VITE_DEBUG, VITE_SENTRY_DSN.

---

## 5. Modelos do banco (backend/models.py)

| Tabela | Descrição breve |
|--------|------------------|
| users | id (UUID), name, email, hashed_password, is_active, created_at, updated_at, insights_last_notified_at |
| accounts | id, name, type, balance, row_version, is_active, user_id, created_at, updated_at |
| account_balance_snapshots | id, account_id, snapshot_date, balance, created_at |
| categories | id, name, type, color, icon, user_id, created_at, updated_at |
| transactions | id, date, account_id, category_id, type, amount, description, user_id, transfer_transaction_id, shared_expense_id, created_at, updated_at, deleted_at, idempotency_key |
| goals | id, name, target_amount, current_amount, target_date, description, category, priority, status, user_id, created_at, updated_at |
| envelopes | id, name, balance (centavos), target_amount (centavos), color, description, user_id, created_at, updated_at |
| automation_rules | id, name, type, is_active, conditions (JSON), actions (JSON), user_id, created_at, updated_at, deleted_at |
| notifications | id, user_id, type, title, body, read_at, created_at, metadata (JSON) |
| shared_expenses, expense_shares, expense_share_events | Despesas compartilhadas e shares |
| activity_feed | id, user_id, type, title, description, entity_type, entity_id, metadata, is_read, created_at |
| tags, transaction_tags | Tags em transações |
| ledger_entries | Append-only; user_id, account_id, transaction_id, amount, entry_type, created_at |
| idempotency_keys, user_sessions | Idempotência e refresh tokens |
| insight_cache, insight_feedback, user_insight_preferences | Insights |

Índices e constraints em `__table_args__` de cada modelo.

---

## 6. Endpoints de API (registrados em main.py)

Prefixos: `/api/auth`, `/api/transactions`, `/api/goals`, `/api/envelopes`, `/api/categories`, `/api/accounts`, `/api/reports`, `/api/notifications`, `/api/insights`, `/api/privacy`, `/api/shared-expenses`, `/api/automations`; e me_data em `/api` (me/data, me/sync).

- **Auth:** POST register, login, refresh, logout; GET me; PUT me.
- **Transactions:** GET /, GET /summary/monthly, GET /{id}; POST /; PUT /{id}; DELETE /{id}, DELETE / (batch).
- **Goals, Envelopes, Categories, Accounts:** CRUD + endpoints específicos (add-value, withdraw-value).
- **Reports:** GET /summary, /cashflow, /categories/summary, /export.
- **Notifications:** GET /, /unread-count, /unread-insight-count, /{id}; PATCH /{id}/read; POST /mark-all-read.
- **Insights:** GET /; POST /feedback; GET/PATCH /preferences.
- **Privacy:** GET /export; POST /delete-account.
- **Shared expenses:** POST /; DELETE /{expense_id}; GET /read-model, /pending; PATCH /shares/{share_id}; etc.
- **Automations:** CRUD.
- **Me Data:** GET/POST/PUT /me/data; GET/POST /me/sync?since=.

Raiz: GET /, /api, /health, /api/health, /metrics, /api/protected.

**Activity feed:** Router em `routers/activity_feed.py` (GET /, /unread-count, PATCH /read-all, /{id}/read), mas **não incluído** em main.py nem em production_server.py — endpoints REST de activity feed **não estão ativos**. WebSocket em activity_feed_ws.py também não aparece registrado em main.py.

---

## 7. Integrações externas

| Integração | Onde | Configuração | Comportamento se cair |
|------------|------|--------------|------------------------|
| PostgreSQL | database.py | DATABASE_URL | API falha (health degraded). Obrigatório em prod. |
| Sentry | main.py, production_server.py | SENTRY_DSN (opcional) | App segue; sem envio de erros. |
| SMTP | email_service.py | SMTP_* | Notificações por e-mail falham; app segue. |
| Prometheus | core/prometheus_metrics.py, GET /metrics | — | Métricas não expostas; app segue. |
| Refresh token | auth_utils, auth router | USE_REFRESH_TOKENS, REFRESH_TOKEN_* | Login com access token; renovação pode falhar. |
| WebSocket activity feed | realtime/feed_ws_manager.py, activity_feed_ws.py | JWT query param | Feed em tempo real para se não registrado. |

WEBHOOK_SECRET aparece só no .env.example (não encontrado em código).

---

## 8. Migrations (Alembic)

- Pasta: `backend/alembic/versions/` — 35 arquivos.
- Comandos: `alembic upgrade head` (aplicar), `alembic downgrade -1` (reverter).
- env: `backend/alembic/env.py` usa DATABASE_URL.

---

## 9. Frontend — estado e fluxo

- **Estado global:** Zustand (auth-store-api, financial-store, sync-store, shared-expenses-store, activity-feed-store).
- **Auth:** token em memória/localStorage; refresh opcional por cookie; http-client envia Bearer e pode renovar.
- **Sync:** me-data.service.ts, shared-expenses-sync-engine.ts; API me/data e me/sync (backup/restore e sync incremental).
- **Rotas:** React Router 6; ProtectedRoute; lazy loading (Dashboard, Transactions, Goals, Envelopes, SharedExpenses, ActivityFeedPage, Reports, Trends, Automations, Settings, Auth, NotFound).

---

## 10. Gaps encontrados

1. **Activity feed REST:** Router `activity_feed` (e possivelmente WebSocket `activity_feed_ws`) **não estão incluídos** em main.py nem em production_server.py. `/api/activity-feed` não existe; a tela de activity feed no frontend não recebe dados da API.
2. **production_server.py:** Não inclui: insights, privacy, shared_expenses, automations, me_data, activity_feed — é um **subset** da API do main.py. Corrigir para alinhar ao main.py se o mesmo servidor for usado em produção.
3. **Frontend:** Espera activity feed em `/activity-feed`; sem o include do router, a funcionalidade fica inativa.

---

*Mapeamento gerado na Fase 2. Atualizar conforme alterações no projeto. Fase 3: documentação (docs/README.md com pré-requisitos, comandos, env, links).*
