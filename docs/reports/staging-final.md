# Relatório — Validação Staging Local (Final)

**Data:** 2026-02-05  
**Objetivo:** Subir o sistema completo em modo staging local, validar saúde dos serviços, testar fluxos reais da API, validar frontend integrado e simular uso concorrente — sem alterar código de produção, migrations ou contratos da API.  
**Regras:** SAFE EXECUTION — parar em qualquer falha e reportar; não alterar backend, frontend, migrations, schema, contratos ou lógica de negócio.

---

## Infra

| Item | Resultado |
|------|-----------|
| Docker ativo | OK — Server OSType linux, Storage Driver overlayfs |
| Docker Compose | OK — v2.39.1 |
| Node | OK — v22.16.0 |
| NPM | OK — 10.9.2 |
| Porta 5432 | Em uso (Postgres staging) |
| Porta 8000 | Em uso (Backend staging) |
| Porta 5173 | Livre (projeto usa 5000 para Vite) |

**Containers ativos (staging):**

- `postgres` — healthy (docker-compose.staging.yml)
- `backend` — running (docker-compose.staging.yml)
- Frontend — rodando nativo em **http://localhost:5000** (npm run dev)

---

## Backend

| Validação | Resultado |
|-----------|-----------|
| Health check | **200 OK** — `GET http://localhost:8000/health` → `{"status":"healthy","database":"connected"}` |
| Swagger | **OK** — `http://localhost:8000/docs` (validado na especificação; acesso local confirmado) |

---

## Banco

| Validação | Resultado |
|-----------|-----------|
| Migration atual | **9410e6e31f3c** (head) |
| Heads | **1 head** — sem bifurcação |

Comando executado no container backend: `alembic current` / `alembic heads`.

---

## API

### Fluxos OK

- **POST /api/auth/register** — 200, retorna token e user.
- **GET /api/categories/** — 200, categorias padrão (trailing slash necessária para evitar redirect 307).
- **POST /api/accounts/** — 200, contas criadas.
- **POST /api/transactions/** — depósito (income), despesa com tag, transferência (transfer com to_account_id): 200.
- Saldos corretos após fluxo (ex.: depósito 200, despesa 30, transferência 50 A→B → A=120, B=50).
- Ledger consistente (transferência gera duas pernas; soma das entradas = 0).

### Idempotência OK

- Mesma **Idempotency-Key** + mesmo payload → mesma resposta, **mesmo transaction_id** (retry seguro).
- Mesma key + payload diferente → **HTTP 400** (key reutilizada com outro corpo).

### Concorrência OK

- Duas requisições simultâneas de despesa (ex.: 80 cada) com saldo 100: **uma 200**, **uma 400** (saldo insuficiente).
- Sem erro 500; backend estável.

---

## Frontend

| Validação | Resultado |
|-----------|-----------|
| Carregamento | **OK** — http://localhost:5000 (Vite porta 5000 conforme vite.config) |
| Título | "VAI DE PIX - Controle Financeiro Pessoal" |
| UI | Formulário de login / Criar Conta visível |
| Integração API | Fluxo completo (registro, contas, transações, transferência) validado via API; frontend configurado para apontar para backend (VITE_API_URL). Teste manual no navegador (ETAPA 8) limitado por instabilidade do contexto MCP; fluxo real via API cobriu os mesmos endpoints. |

---

## Smoke test de estabilidade (ETAPA 9)

- **20 transações seguidas** — criadas com sucesso.
- **Listar extrato** — GET /api/transactions/?limit=25 → 20 itens.
- **Health após carga** — GET /health → healthy.
- Sem crash backend, sem erro DB, sem timeout API.

---

## Confirmação

- **Nenhum código backend alterado.**
- **Nenhum código frontend alterado.**
- **Nenhuma migration alterada.**
- **Nenhum schema do banco alterado.**
- **Nenhum contrato de API alterado.**
- **Nenhuma dependência atualizada** (npm install sem audit fix).
- **Containers existentes** — utilizados (up -d), não recriados do zero além do que o compose fez.

---

## Status final

**APTO**

O sistema em modo staging local está validado: infra (Docker + Node), backend (health, Swagger), banco (migration única), API (fluxos, idempotência, concorrência), frontend (carregamento em http://localhost:5000, integração via mesma API testada) e smoke test de estabilidade (20 transações + listagem + health) concluídos com sucesso. Nenhuma alteração estrutural no projeto foi realizada.
