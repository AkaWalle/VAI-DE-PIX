# Relatório técnico: viabilidade do fluxo de despesa compartilhada com confirmação

**Objetivo:** Permitir compartilhamento de despesa entre usuários com confirmação obrigatória via notificação no aplicativo (e opcionalmente e-mail).

**Escopo da análise:** Código atual do projeto (backend, frontend, infra). Nenhuma implementação foi feita; apenas análise e plano sugerido.

---

## 1. BANCO DE DADOS

### O que já existe

| Recurso | Situação |
|--------|----------|
| **Tabela `users`** | Existe. Campos: `id` (UUID), `name`, `email` (unique, index), `hashed_password`, `is_active`, `created_at`, `updated_at`, `insights_last_notified_at`. Migrations: `85c9ce9f5c40_initial_migration`, etc. |
| **Tabela `notifications`** | Existe. Campos: `id`, `user_id` (FK users), `type`, `title`, `body`, `read_at`, `created_at`, `metadata` (JSON). Migration: `add_notifications_table`. |
| **Transações** | Existe tabela `transactions` (transações financeiras por usuário, com `account_id`, `category_id`, etc.). **Não** é o conceito de “despesa compartilhada” (split entre pessoas); é lançamento contábil do usuário. |

### O que NÃO existe e precisa ser criado

| Recurso | Descrição |
|--------|-----------|
| **Tabela `shared_expenses` (ou `expenses`)** | Não existe. Necessária para: `id`, `created_by` (FK users), `amount`, `description`, `title`, `currency`, `status` (ex.: draft/active/settled/cancelled), `created_at`, `updated_at`. Opcional: `category`, `date`. |
| **Tabela `expense_shares` (ou equivalente)** | Não existe. Necessária para: `id`, `expense_id` (FK shared_expenses), `user_id` (FK users), `status` (pending / accepted / rejected), `amount` (parcela do usuário), `created_at`, `responded_at`. Garantir índice em `(expense_id, user_id)` e filtros por `user_id` para “pendências para mim”. |

### Conclusão BD

- **Tabela users:** já existe; atende ao fluxo.
- **Tabela expenses:** não existe; precisa ser criada (nova migration).
- **Tabela expense_shares:** não existe; precisa ser criada (pode ser na mesma migration que `shared_expenses` ou em uma sequencial).
- **Migration:** uma nova migration Alembic deve criar `shared_expenses` e `expense_shares`, com FKs e índices adequados.

---

## 2. BACKEND

### O que já existe

| Recurso | Situação |
|--------|----------|
| **Autenticação por usuário** | Sim. JWT (access token) com `sub` = email; `auth_utils.get_current_user` retorna `User`; refresh token opcional (cookie HttpOnly). |
| **Middleware / dependência de usuário logado** | Sim. Rotas protegidas usam `current_user: User = Depends(get_current_user)`. Ex.: `transactions`, `notifications`, `goals`, `accounts`, etc. |
| **Sistema de notificações internas** | Sim. Model `Notification`, `NotificationRepository`, `notification_service.create_notification()`, rotas GET/PATCH/POST em `routers/notifications.py`. Tipos livres em `type`; `metadata` para link (ex.: `expense_share_id`). |
| **ORM** | SQLAlchemy com `Base` em `database.py`, modelos em `models.py`, `SessionLocal`, `get_db()`. Alembic configurado com `target_metadata = Base.metadata`. |
| **Busca de usuário por e-mail** | Sim. `User` com `email` unique; em auth já existe `db.query(User).filter(User.email == email).first()`. |

### O que NÃO existe e precisa ser implementado

| Recurso | Descrição |
|--------|-----------|
| **Envio de e-mail** | Não existe. Apenas referência em `scripts/validate_env.py` (SMTP_HOST, SMTP_PORT, etc.). Seria necessário: serviço de envio (ex.: SMTP ou SendGrid), template de “convite para confirmar despesa”, envio ao criar `expense_share` em status pending (opcional). |
| **Rotas de despesa compartilhada** | Não existe. Backend não tem nenhum router ou modelo para “shared expense”. Toda a lógica atual de despesas compartilhadas está no frontend (Zustand + localStorage). |
| **Lógica de negócio** | Criar: (1) serviço/repositório para `SharedExpense` e `ExpenseShare`; (2) ao criar despesa com e-mail do B: buscar usuário por e-mail; se existir, criar `ExpenseShare` (pending) e notificação para B; se não existir, pode apenas salvar e-mail para “convite futuro” (conforme regra) ou retornar aviso. |
| **Ações Aceitar/Recusar** | Endpoints para o usuário B: ex. `PATCH /api/expense-shares/{id}/respond` com `action: accept | reject`; validar que o recurso pertence ao `current_user.id` e que status é `pending`; atualizar `status` e `responded_at`; se aceitar, eventualmente refletir no cálculo de dívida (ver item 5). |

---

## 3. FRONTEND

### O que já existe

| Recurso | Situação |
|--------|----------|
| **Notificações** | Sim. `NotificationBell` no layout; `notificationsService` (list, getUnreadCount, markAsRead, markAllAsRead); lista no popover; notificações vêm da API. |
| **Despesas compartilhadas (só local)** | Página `SharedExpenses.tsx` e `SharedExpenseForm.tsx`; store `sharedExpenses` em Zustand com persist em `vai-de-pix-financial` (localStorage). Fluxo atual: criar/editar/excluir/marcar quitado só no cliente; nenhuma API. |
| **Estrutura de dados** | Interface `SharedExpense` com `participants` (userId, userName, userEmail, amount, paid, paidAt); status pending/settled/cancelled. Não há conceito de “confirmação pelo outro usuário”. |

### Onde encaixar e o que falta

| Recurso | Onde encaixar / o que fazer |
|--------|-----------------------------|
| **Lista de pendências (para eu confirmar)** | Nova seção ou página “Pendências de confirmação”: lista de `expense_shares` com status `pending` onde `user_id` = usuário logado. Pode ser: (1) aba/seção em “Despesas compartilhadas”, ou (2) lista no próprio NotificationBell (link “Ver pendências”) ou (3) página dedicada `/shared-expenses/pending`. |
| **Tela de confirmação (Aceitar / Recusar)** | Por notificação: tipo `expense_share_pending` com `metadata: { expense_share_id, expense_id, amount, description, created_by_name }`. Ao clicar na notificação, abrir modal ou página com detalhe da despesa e botões “Aceitar” e “Recusar” que chamam `PATCH /api/expense-shares/{id}/respond`. Alternativa: lista de pendências com ação por item. |
| **Integração com API** | Substituir/estender a fonte de dados: hoje `sharedExpenses` vem só do store local; será necessário buscar despesas compartilhadas e shares da API, e manter store (ou estado) sincronizado com backend. Manter compatibilidade ou migração para “despesas só da API” quando o backend existir. |

### Resumo frontend

- Notificações e listagem já existem; basta novo tipo de notificação (`expense_share_pending`) e uso de `metadata` para linkar à pendência.
- Lista de pendências e tela Aceitar/Recusar são novos componentes/páginas, consumindo novos endpoints.

---

## 4. INFRA (VERCEL + NEON)

| Ponto | Situação |
|-------|----------|
| **Conexão DB** | PostgreSQL (Neon) via `DATABASE_URL`; limpeza de prefixo `psql '...'` em `database.py`; SSL com `sslmode=require`. |
| **Pooling** | Em produção: `pool_size=1`, `max_overflow=0`, `pool_recycle=600`, `pool_pre_ping=True`. Adequado para serverless (evita conexões obsoletas). Neon oferece connection pooling (pooler); hoje a URL parece direta; pode-se considerar uso do pooler do Neon se houver muitas conexões concorrentes. |
| **Variáveis de ambiente** | DATABASE_URL, SECRET_KEY, etc. configuradas no dashboard Vercel; documentado em `docs/deploy/VERCEL-NEON-DEPLOY.md`. |
| **Cold start** | Típico de serverless: primeira requisição pode ser mais lenta (carregar app + conexão DB). Não bloqueia a funcionalidade; apenas impacto de latência ocasional. |

Conclusão: infra está estável para adicionar novas tabelas e rotas; nenhuma mudança obrigatória para o fluxo de confirmação.

---

## 5. SEGURANÇA

| Ponto | Situação e recomendação |
|-------|-------------------------|
| **Validação de e-mail do criador** | Hoje não há “despesa compartilhada” no backend. Ao implementar: o criador é sempre `current_user` (via `get_current_user`); não é necessário “validar se o email pertence ao usuário” para o criador — o backend usa o usuário autenticado. Para o participante B: buscar usuário por e-mail apenas para criar o share; não expor dados sensíveis de B. |
| **Aceitar dívida de outro usuário** | Crítico: o endpoint de Aceitar/Recusar deve verificar que `expense_share.user_id == current_user.id`. Assim só o usuário B pode aceitar/recusar a própria parcela. Repositório/rota devem filtrar por `current_user.id`. |
| **Permissões por user_id** | Padrão atual: todas as rotas protegidas usam `get_current_user` e filtram por `current_user.id` (ex.: transações, notificações). Para `expense_shares`: listar apenas shares onde `user_id == current_user.id` (pendências para mim) ou onde o usuário é criador da despesa; atualizar apenas o próprio share. |
| **Não permitir criar share para si mesmo** | Validação no backend: ao criar despesa compartilhada, se o e-mail informado for o do `current_user`, rejeitar ou ignorar (evitar auto-atribuição de dívida). |

Resumo: com `get_current_user` e checagens explícitas de `user_id` nos recursos de expense_share, a implementação pode ser segura.

---

## 6. COMPLEXIDADE REAL

Classificação sugerida: **Média (3–5 dias)**.

- **Fácil (1–2 dias):** não se aplica — exige nova migration, novos modelos, rotas, serviço de notificação e mudanças no frontend.
- **Média (3–5 dias):** sim. Banco pequeno (2 tabelas), padrões já existentes (auth, notificações, repositórios), frontend com notificações e tela de despesas já prontos para estender.
- **Complexa (1+ semana):** só se incluir e-mail completo, convites para usuários não cadastrados, recálculo automático de “dívida” em todas as telas e integração com transações/ledger.

---

## 7. PLANO SUGERIDO

### Passo 1 — Banco

- Criar migration Alembic:
  - Tabela `shared_expenses`: id, created_by (FK users), amount, description, title, currency, status, created_at, updated_at.
  - Tabela `expense_shares`: id, expense_id (FK shared_expenses), user_id (FK users), status (pending/accepted/rejected), amount, created_at, responded_at.
- Índices: (expense_id, user_id), (user_id, status) para listar pendências.
- Rodar migration no Neon (ex.: `scripts/run-migrations-neon.py`).

### Passo 2 — Backend

- Models SQLAlchemy: `SharedExpense`, `ExpenseShare` com relationships.
- Schemas Pydantic: create/response para despesa e share.
- Repositórios (opcional mas recomendado): `SharedExpenseRepository`, `ExpenseShareRepository` (criar share, listar por user, atualizar status).
- Rotas (ex.: `/api/shared-expenses`, `/api/expense-shares`):
  - POST shared-expenses: body (amount, description, title, participant_email). Buscar usuário por email; se existir, criar despesa + expense_share (pending) e notificação para B; se não, retornar aviso (ou salvar “convite futuro” se for requisito).
  - GET expense-shares (query: status=pending): listar shares do current_user.
  - PATCH expense-shares/{id}/respond: body { action: "accept" \| "reject" }; validar ownership e status pending; atualizar status e responded_at.
- Todas as rotas com `Depends(get_current_user)` e filtros por `current_user.id`.

### Passo 3 — Notificações

- Ao criar `ExpenseShare` (pending): chamar `create_notification(db, user_id=B.id, type="expense_share_pending", title="...", body="...", metadata_={"expense_share_id": ..., "expense_id": ..., "amount": ..., "description": ..., "created_by_name": ...})`.
- Frontend: notificações com tipo `expense_share_pending` podem abrir modal/página de confirmação usando `metadata`.

### Passo 4 — Frontend

- Serviço API: `sharedExpensesService` / `expenseSharesService` (criar despesa, listar pendências, responder).
- Lista de pendências: nova seção ou página que chama GET expense-shares?status=pending e exibe cards com Aceitar/Recusar.
- Ao clicar em notificação do tipo expense_share_pending: navegar para pendência ou abrir modal com detalhe e botões.
- Integrar criação de despesa compartilhada: enviar para a API (e-mail do B); manter ou migrar store local para dados vindos da API conforme decisão de produto.

### Passo 5 — E-mail (opcional)

- Configurar SMTP (ou provedor) e variáveis de ambiente.
- Serviço de envio (ex.: `email_service.send_expense_share_pending(to_email, expense_description, link)`).
- Chamar após criar notificação in-app, quando o usuário B existir e tiver e-mail.

---

## 8. RESUMO EXECUTIVO

| Área | Pronto | A fazer |
|------|--------|--------|
| **BD** | users, notifications | shared_expenses, expense_shares (nova migration) |
| **Backend** | Auth, get_current_user, notificações, ORM | Rotas e modelos de despesa compartilhada e shares; validação de ownership |
| **Frontend** | Notificações, tela de despesas (local) | Lista de pendências, tela Aceitar/Recusar, integração com API |
| **Infra** | Vercel + Neon estáveis | Nenhum |
| **Segurança** | Padrão por user_id nas rotas | Garantir que apenas o user_id do share pode aceitar/recusar |
| **E-mail** | Não existe | Opcional: SMTP + template e envio ao criar share |

A implementação do fluxo descrito é **viável** com esforço de complexidade **média (3–5 dias)**, seguindo o plano em 5 passos acima.
