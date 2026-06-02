# 💰 VAI DE PIX — Resumo do Sistema

Resumo completo do projeto: o que é, como funciona, tecnologias usadas e melhorias aplicadas.

---

## 1. O que é o sistema

**VAI DE PIX** é um sistema de controle financeiro pessoal que permite:

- Registrar receitas e despesas com categorias e contas
- Definir metas financeiras e acompanhar progresso
- Organizar dinheiro em “caixinhas” (envelopes) por categoria/objetivo
- Ver relatórios, tendências e dashboard
- Usar automações (transações recorrentes, alertas, lembretes)
- Gerenciar despesas compartilhadas
- Funcionar em qualquer dispositivo via navegador (desktop, tablet ou mobile)

O frontend é uma SPA (React) que consome uma API REST (FastAPI); os dados ficam em PostgreSQL (ou SQLite em dev).

---

## 2. Como funciona

### 2.1 Visão geral

```
[Navegador]
       │
       │  HTTP/REST + JWT
       ▼
[API FastAPI]  ←→  [PostgreSQL]
       │
       │  JSON (CRUD)
       ▼
[React SPA]  (Zustand + React Query)
```

- **Usuário** acessa a aplicação (login/registro em `/auth`).
- **Frontend** envia requisições à API com token JWT no header.
- **Backend** valida o token, aplica regras de negócio e acessa o banco via repositórios.
- **Respostas** em JSON atualizam stores (Zustand) e a interface.

### 2.2 Autenticação

- **Registro:** `POST /api/auth/register` → senha hasheada (bcrypt) → usuário criado.
- **Login:** `POST /api/auth/login` → validação de credenciais → JWT gerado (HS256).
- **Rotas protegidas:** header `Authorization: Bearer <token>`; sem token ou token inválido → 401.
- **Frontend:** token armazenado (ex.: localStorage); `ProtectedRoute` redireciona para `/auth` se não autenticado.

### 2.3 Fluxo de dados (ex.: transação)

1. Usuário preenche formulário (ex.: Transactions).
2. Serviço frontend chama `POST /api/transactions` com o body.
3. Router FastAPI recebe, valida (Pydantic) e chama o service.
4. Service aplica regras (ex.: atualizar saldo da conta) e usa o repositório.
5. Repositório persiste no banco (SQLAlchemy).
6. Resposta JSON volta ao frontend; store é atualizado e a UI re-renderiza.

### 2.4 Principais entidades

| Entidade      | Descrição resumida |
|---------------|--------------------|
| **User**      | Usuário do sistema (email, senha hasheada, nome). |
| **Account**   | Conta financeira (corrente, poupança, etc.) com saldo. |
| **Category**  | Categoria de receita/despesa (nome, tipo, cor, ícone). |
| **Transaction** | Movimentação (valor, tipo, data, conta, categoria, descrição). |
| **Goal**      | Meta financeira (valor alvo, valor atual, data, status). |
| **Envelope** | “Caixinha” com saldo e opcionalmente valor alvo. |
| **Notification** | Notificações in-app (alertas, lembretes). |
| **AutomationRule** | Regras de automação (recorrentes, alertas, etc.). |

---

## 3. Tecnologias usadas

### 3.1 Frontend

| Tecnologia        | Uso principal |
|-------------------|----------------|
| **React 18.3**    | UI e componentes. |
| **TypeScript 5.8**| Tipagem estática. |
| **Vite 7.2**     | Build, dev server, HMR. |
| **Tailwind CSS 3.4** | Estilos utility-first. |
| **Zustand 5**     | Estado global (auth, dados financeiros). |
| **React Router 6** | Rotas SPA. |
| **TanStack React Query 5** | Cache e requisições à API. |
| **React Hook Form + Zod** | Formulários e validação. |
| **Radix UI**      | Componentes acessíveis (dialog, select, etc.). |
| **Recharts**      | Gráficos (dashboard, relatórios, tendências). |
| **Lucide React**  | Ícones. |
| **Axios**         | Cliente HTTP para a API. |
| **date-fns**      | Datas. |
| **next-themes**   | Tema claro/escuro. |
| **Vitest**       | Testes unitários. |

### 3.2 Backend

| Tecnologia     | Uso principal |
|----------------|----------------|
| **FastAPI 0.104** | API REST, documentação OpenAPI. |
| **Uvicorn**    | Servidor ASGI (dev). |
| **Gunicorn**   | Servidor de produção (workers Uvicorn). |
| **SQLAlchemy 1.4** | ORM e acesso ao banco. |
| **Alembic**    | Migrações de schema. |
| **Pydantic 2** | Validação e serialização. |
| **python-jose** | Geração/validação de JWT. |
| **passlib + bcrypt** | Hash de senhas. |
| **slowapi**    | Rate limiting. |
| **APScheduler**| Jobs (recorrentes, alertas). |
| **pytest**     | Testes (unit + integration). |
| **PostgreSQL**| Banco em produção (psycopg2-binary). |

### 3.3 Infraestrutura e ferramentas

| Item | Uso |
|------|-----|
| **GitHub Actions** | CI: lint, type-check, testes, build. |
| **Vercel** | Deploy do frontend (e serverless API quando usado). |
| **ESLint + Prettier** | Lint e formatação no frontend. |
| **Husky** | Hooks Git (ex.: pre-commit). |

---

## 4. Estrutura do projeto

### 4.1 Raiz

```
VAI DE PIX/
├── backend/          # API FastAPI
├── src/               # Frontend React
├── api/               # Serverless (ex.: Vercel)
├── tests/             # Testes frontend (Vitest, E2E)
├── docs/              # Documentação
├── public/            # Assets estáticos
├── package.json
├── vite.config.ts
└── README.md
```

### 4.2 Backend (`backend/`)

- **routers/** — Endpoints: auth, transactions, goals, envelopes, categories, accounts, reports, notifications, automations, tags.
- **models.py** — Modelos SQLAlchemy (User, Transaction, Goal, Envelope, etc.).
- **schemas.py** — Schemas Pydantic (request/response).
- **repositories/** — Acesso a dados (transações, contas, categorias, etc.).
- **services/** — Lógica de negócio (transações, contas, notificações).
- **core/** — Validadores, segurança, sanitização, jobs (ex.: recorrentes).
- **alembic/versions/** — Migrações do banco.
- **tests/** — pytest (unit, integration, e2e).

### 4.3 Frontend (`src/`)

- **pages/** — Auth, Dashboard, Transactions, Goals, Envelopes, SharedExpenses, Reports, Trends, Automations, Settings, NotFound.
- **components/** — UI (shadcn-style), formulários, ErrorBoundary, ProtectedRoute, theme-provider, sidebar.
- **stores/** — Estado global (auth, dados financeiros).
- **services/** — Chamadas à API (auth, transactions, goals, etc.).
- **hooks/** — Hooks customizados (ex.: persistência).
- **layouts/** — Layout principal com sidebar.

---

## 5. Melhorias já aplicadas

Resumo do que já foi implementado no projeto:

| Área | Melhoria |
|------|----------|
| **Erro em runtime** | Error Boundary no React para evitar tela branca em erros de renderização. |
| **Segurança** | Rate limiting (slowapi), CORS configurável, senhas com bcrypt, JWT. |
| **Qualidade de código** | ESLint, TypeScript strict, Prettier; Flake8/Black no backend. |
| **Testes** | Vitest (frontend, testes unitários); pytest (backend, unit + integration). |
| **CI** | GitHub Actions: lint frontend/backend, type-check, testes, build. |
| **Deploy** | Build de produção (Vite); Vercel e Railway. |
| **UX** | Lazy loading de rotas, React Query para cache, tema claro/escuro. |
| **Documentação** | README, ARCHITECTURE, CONTRIBUTING, CHANGELOG; docs em `docs/`. |
| **Ambiente** | `.env.example` no backend; variáveis documentadas. |
| **API** | Documentação automática (OpenAPI/Swagger) no FastAPI. |

---

## 6. Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o frontend em modo desenvolvimento. |
| `npm run build` | Build de produção do frontend. |
| `npm run test` | Testes unitários do frontend (Vitest). |
| `npm run lint` | ESLint no frontend. |
| `npm run type-check` | Verificação de tipos (TypeScript). |
| `cd backend && python main.py` | Sobe a API em desenvolvimento. |
| `cd backend && pytest tests/unit tests/integration -v` | Testes do backend. |

---

## 7. Documentos relacionados

- **README.md** — Visão geral, instalação e uso rápido.
- **ARCHITECTURE.md** — Arquitetura, fluxos e decisões técnicas.
- **CONTRIBUTING.md** — Como contribuir.
- **CHANGELOG.md** — Histórico de versões.
- **docs/VERIFICACAO-MELHORIAS-PENDENTES.md** — Checklist do que ainda é opcional.
- **docs/README.md** — Índice da documentação em `docs/`.

---

**Última atualização:** Fevereiro 2025
