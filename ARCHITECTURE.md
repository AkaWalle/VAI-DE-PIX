# 🏗️ Arquitetura do Sistema

Este documento descreve a arquitetura completa do **VAI DE PIX**, incluindo estrutura de pastas, fluxo de dados e decisões técnicas.

## 📐 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite + TypeScript + Tailwind)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │  Components  │  │   Services   │  │  Stores   │  │   │
│  │  │   (UI)       │→ │   (API)      │→ │ (Zustand) │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST (JSON)
                            │ JWT Authentication
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVIDOR (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI Application                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │   Routers    │→ │   Services   │→ │Repository │  │   │
│  │  │  (Endpoints) │  │  (Business)  │  │   (Data)  │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLAlchemy ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL                                          │   │
│  │  - Users, Transactions, Goals, Envelopes, etc.      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura de Pastas

### Raiz do Projeto

```
VAI-DE-PIX/
├── backend/              # Backend Python (FastAPI)
├── src/                  # Frontend React (TypeScript)
├── scripts/              # Scripts de automação
├── docs/                 # Documentação adicional
├── public/               # Arquivos estáticos públicos
├── dist/                 # Build de produção (gerado)
├── docker-compose.yml    # Orquestração Docker
├── package.json          # Dependências Node.js
└── README.md             # Este arquivo
```

### Backend (`backend/`)

```
backend/
├── routers/              # Endpoints da API REST
│   ├── auth.py          # Autenticação (login, register)
│   ├── transactions.py  # CRUD de transações
│   ├── goals.py         # Metas financeiras
│   ├── envelopes.py     # Sistema de caixinhas
│   ├── categories.py    # Categorias
│   ├── accounts.py      # Contas bancárias
│   └── reports.py       # Relatórios e análises
├── models.py            # Modelos SQLAlchemy (ORM)
├── schemas.py           # Schemas Pydantic (validação)
├── database.py          # Configuração do banco
├── auth_utils.py        # Utilitários de autenticação
├── repositories/        # Camada de acesso a dados
│   ├── base_repository.py
│   ├── transaction_repository.py
│   └── ...
├── services/            # Lógica de negócio
│   ├── transaction_service.py
│   └── ...
├── core/                # Utilitários core
│   ├── validators.py
│   ├── security.py
│   └── ...
├── alembic/             # Migrações de banco
│   └── versions/        # Histórico de migrações
├── tests/               # Testes automatizados
│   ├── unit/            # Testes unitários
│   ├── integration/     # Testes de integração
│   └── e2e/             # Testes end-to-end
├── main.py              # Servidor de desenvolvimento
├── production_server.py # Servidor de produção (serve frontend + API)
└── requirements.txt     # Dependências Python
```

### Frontend (`src/`)

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── forms/          # Formulários específicos
│   └── ...
├── pages/              # Páginas da aplicação
│   ├── Auth.tsx        # Login/Registro
│   ├── dashboard.tsx   # Dashboard principal
│   ├── Transactions.tsx
│   ├── Goals.tsx
│   └── ...
├── services/           # Serviços de comunicação com API
│   ├── auth.service.ts
│   ├── transactions.service.ts
│   └── ...
├── stores/             # Estado global (Zustand)
│   ├── auth-store-api.ts
│   └── financial-store.ts
├── lib/                # Bibliotecas e utilitários
│   ├── api.ts          # Configuração da API
│   ├── http-client.ts  # Cliente HTTP (Axios)
│   └── utils.ts        # Funções utilitárias
├── hooks/              # Custom React Hooks
├── layouts/             # Layouts da aplicação
└── App.tsx             # Componente raiz
```

## 🔄 Fluxo de Dados

### 1. Autenticação

```
User → Auth.tsx → auth.service.ts → POST /api/auth/login
                                              ↓
                                    FastAPI Router (auth.py)
                                              ↓
                                    auth_utils.py (verify_password)
                                              ↓
                                    JWT Token gerado
                                              ↓
                                    Token salvo no localStorage
                                              ↓
                                    Redireciona para Dashboard
```

### 2. Criar Transação

```
User → TransactionForm → transactions.service.ts → POST /api/transactions
                                                              ↓
                                                    FastAPI Router → TransactionService
                                                              ↓
                                                    INSERT transaction + ledger_entries (append-only)
                                                              ↓
                                                    sync account.balance = SUM(ledger)
                                                              ↓
                                                    PostgreSQL (commit atômico)
                                                              ↓
                                                    Resposta JSON
                                                              ↓
                                                    Store atualizado
                                                              ↓
                                                    UI re-renderizada
```

### 3. Carregar Dashboard

```
Dashboard → useLoadData() → services/*.service.ts → GET /api/*
                                                          ↓
                                                    FastAPI Routers
                                                          ↓
                                                    Repositories
                                                          ↓
                                                    PostgreSQL (SELECT)
                                                          ↓
                                                    Dados retornados
                                                          ↓
                                                    Stores populados
                                                          ↓
                                                    Gráficos renderizados
```

## 🗄️ Modelo de Dados

### Principais Entidades

```
User
├── id (UUID)
├── email (unique)
├── name
├── hashed_password
└── created_at

Transaction
├── id (UUID)
├── user_id (FK → User)
├── amount (decimal)
├── type (income/expense/transfer)
├── category_id (FK → Category)
├── account_id (FK → Account)
├── description
└── date

Goal
├── id (UUID)
├── user_id (FK → User)
├── name
├── target_amount
├── current_amount
├── deadline
└── category_id (FK → Category)

Envelope
├── id (UUID)
├── user_id (FK → User)
├── name
├── balance
└── category_id (FK → Category)

Category
├── id (UUID)
├── user_id (FK → User)
├── name
├── type (income/expense)
├── color
└── icon

LedgerEntry (append-only, imutável)
├── id (UUID)
├── user_id (FK → User)
├── account_id (FK → Account)
├── transaction_id (FK → Transaction, nullable)
├── amount (signed: credit > 0, debit < 0)
├── entry_type ('credit' | 'debit')
└── created_at
```

### Ledger contábil (append-only)

O saldo das contas é derivado do **ledger** (`ledger_entries`), não atualizado diretamente em `accounts.balance`.

- **Regra:** Ledger é **append-only**. Nunca UPDATE nem DELETE nas entradas; apenas INSERT (reversões são novas linhas).
- **Saldo:** `account.balance` = `SUM(ledger_entries.amount)` por `account_id`. O campo `accounts.balance` é mantido em sincronia para compatibilidade com listagens.
- **Migração:** Transações antigas são migradas para o ledger via script `backend/scripts/backfill_ledger.py` (executar uma vez após aplicar a migração `add_ledger_entries_table`).

### Insights financeiros

- **Serviço:** `services/insights_service.py` — variação mensal por categoria e metas em risco (determinístico, sem IA).
- **Cache:** Tabela `insight_cache` (JSON em `data`); job diário e GET /api/insights preenchem/atualizam.
- **Ranking:** Cada insight tem `impact_score` (categoria: |current − previous|; meta: gap). Listas retornadas ordenadas por `impact_score` DESC para mostrar primeiro o maior impacto financeiro.
- **Documentação:** Regras e versões em `docs/insights/INSIGHTS-RULES.md`.
- **Métricas Prometheus:** GET /metrics expõe `insights_compute_duration_seconds`, `insights_cache_hits_total`, `insights_cache_misses_total`, `insights_errors_total` (detalhes em `docs/insights/INSIGHTS-RULES.md`).
- **Policies:** Regras de insights em `backend/domain/insight_policies/` (category_variation_v1, goals_at_risk_v1); o serviço orquestra por versão, sem regras hardcoded no serviço.
- **Eventos de insights:** Barramento in-memory em `core/events.py`; `core/insight_events.py` emite `goal_entered_risk_state` e `spending_spike_detected` após recalcular insights (API e job). C2 pode registrar handlers para notificações.

## 🔐 Segurança

### Autenticação

- **JWT (JSON Web Tokens)** - Tokens stateless
- **Bcrypt** - Hash de senhas (salt rounds: 12)
- **HTTP Bearer** - Autenticação via header `Authorization: Bearer <token>`

### Autorização

- **Middleware de autenticação** - Verifica token em rotas protegidas
- **User isolation** - Cada usuário só acessa seus próprios dados
- **Rate limiting** - Proteção contra abuso (slowapi)

### Validação

- **Pydantic** - Validação de dados no backend
- **Zod** - Validação de formulários no frontend
- **Input sanitization** - Limpeza de dados de entrada

## 🚀 Deploy

### Desenvolvimento

- **Frontend:** Vite dev server (HMR)
- **Backend:** Uvicorn (reload automático)
- **Banco:** SQLite (desenvolvimento) ou PostgreSQL

### Produção

- **Frontend:** Build estático servido pelo FastAPI
- **Backend:** Gunicorn + Uvicorn workers
- **Banco:** PostgreSQL
- **Raspberry Pi:** Modo kiosk 24/7

## 📊 Performance

### Otimizações

- **Lazy loading** - Rotas carregadas sob demanda
- **Code splitting** - Bundle otimizado por rota
- **React Query** - Cache de requisições API
- **Database indexing** - Índices em campos frequentes
- **Connection pooling** - Pool de conexões PostgreSQL

### Métricas

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **API Response Time:** < 200ms (média)

## 🔧 Decisões Técnicas

### Por que FastAPI?

- Performance superior (baseado em Starlette)
- Validação automática com Pydantic
- Documentação automática (Swagger/OpenAPI)
- Type hints nativos do Python

### Por que React + TypeScript?

- Type safety em tempo de compilação
- Ecossistema maduro e comunidade ativa
- Componentes reutilizáveis
- Ferramentas de desenvolvimento excelentes

### Por que PostgreSQL?

- ACID compliance
- Relacionamentos complexos
- Performance para grandes volumes
- Extensibilidade (JSONB, Full-text search)

### Por que Zustand?

- Leve e simples
- Sem boilerplate
- TypeScript first-class
- Performance otimizada

## 📝 Convenções

### Nomenclatura

- **Arquivos:** `kebab-case.tsx` ou `snake_case.py`
- **Componentes:** `PascalCase`
- **Funções/Variáveis:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`

### Estrutura de Commits

```
tipo(escopo): descrição curta

tipo: feat, fix, docs, style, refactor, test, chore
escopo: frontend, backend, docs, etc.
```

## 🔗 Links Úteis

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Raspberry Pi Docs](https://www.raspberrypi.com/documentation/)

---

**Última atualização:** Janeiro 2025

