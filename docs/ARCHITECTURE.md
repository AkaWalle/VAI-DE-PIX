> Última atualização: 2025-03-16

# Arquitetura

## Visão geral das camadas

O sistema tem quatro camadas principais:

1. **Frontend** — SPA React (Vite), roda no navegador; consome a API REST e mantém estado local (Zustand).
2. **Backend** — API FastAPI (Python); expõe REST, aplica regras de negócio e persiste no banco.
3. **Banco de dados** — PostgreSQL em produção; SQLite permitido só em desenvolvimento. Fonte da verdade para usuários, contas, transações, envelopes, metas, despesas compartilhadas, etc.
4. **Integrações** — Sentry (erros), SMTP (e-mail opcional), Prometheus (métricas). Nenhuma é obrigatória para o núcleo do app.

## Diagrama textual

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (SPA)                                                   │
│  React + Vite · Zustand · React Query · Axios                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST (JWT Bearer)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                               │
│  Routers → Services / Repositories → Models                      │
│  Middlewares: CORS, logging, request-id, rate limit (auth)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQLAlchemy
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL (ou SQLite em dev)                                  │
│  users, accounts, transactions, ledger_entries, envelopes,       │
│  goals, shared_expenses, expense_shares, ...                     │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Sentry (opcional)   SMTP (opcional)    Prometheus /metrics
```

## Fluxo principal de uma transação (ponta a ponta)

1. Usuário cria uma transação no frontend (formulário).
2. Frontend envia `POST /api/transactions` com body (date, account_id, category_id, type, amount, description) e header `Authorization: Bearer <access_token>`.
3. Backend valida JWT, obtém `user_id`, valida payload (Pydantic) e chama o serviço de transações.
4. Serviço aplica regras de domínio (ex.: ledger, saldo); persiste em `transactions` e em `ledger_entries` (movimentação de conta).
5. Resposta 201 com o recurso criado; frontend atualiza a lista (store/React Query).

Transfers: duas transações vinculadas por `transfer_transaction_id`; débito em uma conta e crédito em outra, com entradas no ledger para cada conta.

## Decisões técnicas relevantes

| Decisão | Motivo |
|---------|--------|
| **Ledger append-only** | Saldo derivado da soma do ledger; auditoria e consistência sem alterar histórico. |
| **JWT stateless** | Escala horizontal sem sessão no servidor; refresh opcional via cookie e tabela `user_sessions`. |
| **Valores monetários** | Transações/contas em `Numeric(15,2)`; envelopes e parcelas de despesa compartilhada em centavos (integer) no backend. Frontend usa centavos para envelopes (CurrencyInput). |
| **Idempotency-Key** | Tabela `idempotency_keys` e middleware para evitar duplicar efeito em POST críticos (ex.: transações). |
| **Sync (GET/POST /me/data e /me/sync)** | Backup/restore e sync incremental; servidor como fonte da verdade; cliente envia snapshot ou delta e recebe estado atual. |
| **Rate limit** | Aplicado no router de auth (SlowAPI) para mitigar abuso em login/registro. |
| **CORS** | Em produção permitem-se todas as origens; em dev lista fixa de localhost. |

## O que não está implementado (débitos técnicos conhecidos)

- **Activity feed REST** — O router `activity_feed` existe no código mas não está incluído em `main.py`; portanto `GET/PATCH /api/activity-feed` não estão ativos. O frontend chama essas rotas; sem o include o feed não retorna dados da API.
- **WebSocket activity feed** — Endpoint `/ws/activity-feed` definido em `activity_feed_ws.py` não está registrado em `main.py`; tempo real do feed não funciona.
- **Production server incompleto** — `production_server.py` não inclui os routers: insights, privacy, shared_expenses, automations, me_data (nem activity_feed); quem usa esse servidor tem um subconjunto da API.
- **Filas/workers** — Não há fila assíncrona (ex.: Redis/Celery) para jobs pesados; automações e insights usam APScheduler no processo da API.
- **Cache distribuído** — Cache de insights é por instância (tabela `insight_cache`); não há Redis compartilhado entre múltiplas instâncias.
