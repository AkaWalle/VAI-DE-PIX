> Última atualização: 2025-03-16

# API

Base URL em desenvolvimento: `http://localhost:8000/api`. Todas as rotas protegidas exigem header `Authorization: Bearer <access_token>` exceto login, register e (quando aplicável) refresh.

## Autenticação

- **Como funciona:** JWT (HS256). O cliente envia `Authorization: Bearer <access_token>` em cada requisição. O token contém identificação do usuário; o backend valida assinatura e expiração.
- **Onde o token vai:** Header HTTP `Authorization: Bearer <token>`.
- **Renovação:** Opcional. Se `USE_REFRESH_TOKENS=1` no backend, o refresh token é enviado em cookie HttpOnly (`refresh_token`). O cliente chama `POST /api/auth/refresh` (com o cookie); a resposta devolve novo `access_token` e dados do usuário. Access token com refresh ativo tem vida curta (ex.: 10 min); sem refresh, usa `ACCESS_TOKEN_EXPIRE_MINUTES` (ex.: 30 min).
- **Logout:** `POST /api/auth/logout` invalida a sessão (revoga refresh no servidor) e remove o cookie de refresh no cliente.

## Endpoints por domínio

### Auth (`/api/auth`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| POST | /register | Registrar usuário | `{ "name", "email", "password" }` | 200 + `{ access_token, token_type, user }` | 400 validação, 429 rate limit |
| POST | /login | Login | `{ "email", "password" }` ou form | 200 + Token + cookie refresh (se ativo) | 401, 429 |
| POST | /refresh | Renovar access token | — (cookie refresh_token) | 200 + Token | 401 |
| POST | /logout | Encerrar sessão | — | 204 | 401 |
| GET | /me | Dados do usuário logado | — | 200 + User | 401 |
| PUT | /me | Atualizar perfil | `{ "name"?, "email"?, "password"? }` | 200 + User | 400, 401 |

### Transações (`/api/transactions`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar transações | Query: month, year, account_id, etc. | 200 + lista | 401 |
| GET | /summary/monthly | Resumo mensal | Query: month, year | 200 + resumo | 401 |
| GET | /{transaction_id} | Uma transação | — | 200 + objeto | 401, 404 |
| POST | / | Criar transação | `{ date, account_id, category_id, type, amount, description }` + opcional Idempotency-Key | 201 + objeto | 400, 401, 409 idempotência |
| PUT | /{transaction_id} | Atualizar | Campos editáveis | 200 + objeto | 400, 401, 404 |
| DELETE | /{transaction_id} | Excluir (hard delete) | — | 204 | 401, 404 |
| DELETE | / | Excluir em lote | `{ "ids": ["..."] }` | 200 | 401 |

### Metas (`/api/goals`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar metas | — | 200 + lista | 401 |
| GET | /{goal_id} | Uma meta | — | 200 + objeto | 401, 404 |
| POST | / | Criar meta | name, target_amount, target_date, description?, category, priority | 201 + objeto | 400, 401 |
| PUT | /{goal_id} | Atualizar | Campos editáveis | 200 + objeto | 400, 401, 404 |
| DELETE | /{goal_id} | Excluir | — | 204 | 401, 404 |
| POST | /{goal_id}/add-value | Adicionar valor | `{ "amount": number }` | 200 | 400, 401, 404 |

### Envelopes / Caixinhas (`/api/envelopes`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar envelopes | — | 200 + lista (balance/target em centavos) | 401 |
| POST | / | Criar envelope | name, balance?, target_amount?, color, description? (centavos) | 201 + objeto | 400, 401 |
| PUT | /{envelope_id} | Atualizar | Campos editáveis | 200 + objeto | 400, 401, 404 |
| DELETE | /{envelope_id} | Excluir | — | 204 | 401, 404 |
| POST | /{envelope_id}/add-value | Adicionar valor | `{ "amount": number }` (centavos) | 200 | 400, 401, 404 |
| POST | /{envelope_id}/withdraw-value | Retirar valor | `{ "amount": number }` (centavos) | 200 | 400, 401, 404 |

### Categorias (`/api/categories`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar categorias | — | 200 + lista | 401 |
| POST | / | Criar categoria | name, type (income/expense), color, icon | 201 + objeto | 400, 401 |
| PUT | /{category_id} | Atualizar | Campos editáveis | 200 + objeto | 400, 401, 404 |
| DELETE | /{category_id} | Excluir | — | 204 | 401, 404 |

### Contas (`/api/accounts`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar contas (ativas) | — | 200 + lista | 401 |
| POST | / | Criar conta | name, type, balance? | 201 + objeto | 400, 401 |
| PUT | /{account_id} | Atualizar | Campos editáveis (row_version para concorrência) | 200 + objeto | 400, 401, 404, 409 conflito |
| DELETE | /{account_id} | Soft delete (is_active=false) | — | 204 | 401, 404 |

### Relatórios (`/api/reports`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | /summary | Resumo financeiro | Query: período | 200 + objeto | 401 |
| GET | /cashflow | Dados de fluxo de caixa | Query | 200 + lista | 401 |
| GET | /categories/summary | Resumo por categoria | Query | 200 + lista | 401 |
| GET | /export | Exportar (ex.: CSV) | Query | 200 + arquivo | 401 |

### Notificações (`/api/notifications`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar notificações | — | 200 + lista | 401 |
| GET | /unread-count | Contagem não lidas | — | 200 + `{ count }` | 401 |
| GET | /unread-insight-count | Contagem não lidas (insights) | — | 200 + `{ count }` | 401 |
| GET | /{notification_id} | Uma notificação | — | 200 + objeto | 401, 404 |
| PATCH | /{notification_id}/read | Marcar como lida | — | 200 + objeto | 401, 404 |
| POST | /mark-all-read | Marcar todas como lidas | — | 200 | 401 |

### Insights (`/api/insights`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Insights (variação categoria, metas em risco) | — | 200 + objeto | 401 |
| POST | /feedback | Enviar feedback (visto/ignorado) | `{ "insight_type", "insight_hash", "status" }` | 200 | 400, 401 |
| GET | /preferences | Preferências de exibição | — | 200 + objeto | 401 |
| PATCH | /preferences | Atualizar preferências | `{ "enable_category_variation"?, "enable_goals_at_risk"? }` | 200 | 401 |

### Privacy (`/api/privacy`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | /export | Exportar dados do usuário | — | 200 + arquivo/JSON | 401 |
| POST | /delete-account | Excluir conta e dados | Body conforme contrato (ex.: confirmação) | 200/204 | 401, 400 |

### Despesas compartilhadas (`/api/shared-expenses`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| POST | / | Criar despesa compartilhada | amount, description, split_type, participantes/shares | 201 + objeto | 400, 401 |
| DELETE | /{expense_id} | Cancelar despesa | — | 204 | 401, 404 |
| GET | /read-model | Modelo de leitura (listagem) | — | 200 + objeto | 401 |
| GET | /pending | Convites pendentes do usuário | — | 200 + lista | 401 |
| PATCH | /shares/{share_id} | Aceitar/rejeitar convite | `{ "status": "accepted" \| "rejected" }` | 200 + objeto | 400, 401, 404 |
| GET | /shares/{share_id}/events | Eventos do share | — | 200 + lista | 401, 404 |
| GET | /{expense_id}/full-details | Detalhes completos da despesa | — | 200 + objeto | 401, 404 |

### Automações (`/api/automations`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | / | Listar regras | — | 200 + lista | 401 |
| GET | /{rule_id} | Uma regra | — | 200 + objeto | 401, 404 |
| POST | / | Criar regra | name, type, conditions, actions, etc. | 201 + objeto | 400, 401 |
| PUT | /{rule_id} | Atualizar | Campos editáveis | 200 + objeto | 400, 401, 404 |
| DELETE | /{rule_id} | Excluir | — | 204 | 401, 404 |

### Me Data / Sync (`/api`)

| Método | Rota | Descrição | Body | Sucesso | Erros comuns |
|--------|------|-----------|------|---------|--------------|
| GET | /me/data | Snapshot completo do usuário | — | 200 + JSON (transactions, accounts, categories, envelopes, goals, sharedExpenses) | 401 |
| POST | /me/data | Enviar snapshot (merge por id) | Mesmo formato do GET; transações/sharedExpenses não persistidos por este endpoint | 200 + snapshot atual | 400, 401 |
| PUT | /me/data | Idem POST | Idem POST | 200 + snapshot atual | 400, 401 |
| GET | /me/sync | Delta desde timestamp | Query: `since` (ISO8601 obrigatório) | 200 + entidades alteradas | 400, 401 |
| POST | /me/sync | Enviar mudanças e receber snapshot | Mesmo body de POST /me/data | 200 + snapshot completo | 400, 401 |

**Nota:** Os endpoints de **activity feed** (`GET/PATCH /api/activity-feed/...`) estão implementados no router `activity_feed` mas esse router não está incluído em `main.py`, portanto essas rotas não estão ativas na API atual.

### Rotas globais (sem prefixo /api ou em raiz)

| Método | Rota | Descrição | Autenticação |
|--------|------|-----------|--------------|
| GET | / | Mensagem e status da API | Não |
| GET | /api | Idem | Não |
| GET | /health, /api/health | Status + conexão com banco | Não |
| GET | /metrics | Métricas Prometheus (text/plain) | Não |
| GET | /api/protected | Exemplo de rota protegida | Sim (Bearer) |

## Códigos de erro padronizados

| Código | Significado |
|--------|-------------|
| 400 | Bad Request — payload inválido ou regra de negócio violada |
| 401 | Unauthorized — token ausente, inválido ou expirado |
| 403 | Forbidden — sem permissão para o recurso |
| 404 | Not Found — recurso não encontrado |
| 409 | Conflict — ex.: idempotency key já usada, conflito de versão (row_version) |
| 422 | Unprocessable Entity — validação Pydantic (campos incorretos) |
| 429 | Too Many Requests — rate limit (ex.: auth) |
| 500 | Internal Server Error — erro não tratado no servidor |

Respostas de erro da API podem incluir corpo JSON com `detail` (string ou lista de erros de validação).
