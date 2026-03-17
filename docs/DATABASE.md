> Última atualização: 2025-03-16

# Banco de dados

## Convenções de nomenclatura

- **Tabelas:** snake_case no plural (ex.: `users`, `transactions`, `expense_shares`).
- **Colunas:** snake_case (ex.: `user_id`, `created_at`, `target_amount`).
- **PKs:** coluna `id` do tipo String (UUID gerado na aplicação).
- **FKs:** `<tabela_singular>_id` (ex.: `account_id`, `category_id`).
- **Timestamps:** `created_at`, `updated_at` (DateTime com timezone); quando há soft delete, `deleted_at`.

## Tabelas e campos

### users

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(100) | NOT NULL, length >= 2 |
| email | String(255) | NOT NULL, UNIQUE, index |
| hashed_password | String(255) | NOT NULL |
| is_active | Boolean | NOT NULL, default True |
| created_at | DateTime(TZ) | NOT NULL, server_default now() |
| updated_at | DateTime(TZ) | nullable, onupdate |
| insights_last_notified_at | DateTime(TZ) | nullable |

### accounts

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(100) | NOT NULL, length >= 1 |
| type | String(20) | NOT NULL, IN (checking, savings, investment, credit, cash, refeicao, alimentacao) |
| balance | Numeric(15,2) | NOT NULL, default 0 |
| row_version | Integer | NOT NULL, default 0 (optimistic lock) |
| is_active | Boolean | NOT NULL, default True (soft delete) |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

Índice: idx_accounts_user_type (user_id, type).

### account_balance_snapshots

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| account_id | String | NOT NULL, FK accounts.id CASCADE, index |
| snapshot_date | DateTime(TZ) | NOT NULL, index (primeiro dia do mês) |
| balance | Numeric(15,2) | NOT NULL |
| created_at | DateTime(TZ) | NOT NULL, server_default |

Índice único: idx_balance_snapshots_account_date (account_id, snapshot_date).

### categories

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(50) | NOT NULL, length >= 1 |
| type | String(20) | NOT NULL, IN (income, expense) |
| color | String(7) | NOT NULL, length = 7 (#RRGGBB) |
| icon | String(10) | NOT NULL |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

Índices: idx_categories_user_type, idx_categories_user_name.

### transactions

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| date | DateTime(TZ) | NOT NULL, index |
| account_id | String | NOT NULL, FK accounts.id CASCADE, index |
| category_id | String | NOT NULL, FK categories.id CASCADE, index |
| type | String(20) | NOT NULL, IN (income, expense, transfer) |
| amount | Numeric(15,2) | NOT NULL, > 0 |
| description | String(200) | NOT NULL, length >= 1 |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| transfer_transaction_id | String | nullable, FK transactions.id SET NULL, index |
| shared_expense_id | String | nullable, FK shared_expenses.id SET NULL, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |
| deleted_at | DateTime(TZ) | nullable (soft delete) |
| idempotency_key | String(64) | nullable, index |

Índices: idx_transactions_user_date, idx_transactions_user_type, idx_transactions_account_date, idx_transactions_category_date.

### goals

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(100) | NOT NULL, length >= 1 |
| target_amount | Numeric(15,2) | NOT NULL, > 0 |
| current_amount | Numeric(15,2) | NOT NULL, default 0, >= 0, <= target_amount |
| target_date | DateTime(TZ) | NOT NULL, index |
| description | Text | nullable |
| category | String(50) | NOT NULL |
| priority | String(20) | NOT NULL, IN (low, medium, high) |
| status | String(20) | NOT NULL, default active, IN (active, achieved, on_track, at_risk, overdue) |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

Índices: idx_goals_user_status, idx_goals_user_priority, idx_goals_user_target_date.

### envelopes

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(100) | NOT NULL, length >= 1 |
| balance | Integer | NOT NULL, default 0, >= 0 (centavos) |
| target_amount | Integer | nullable, > 0 se not null (centavos) |
| color | String(7) | NOT NULL, length = 7 |
| description | Text | nullable |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

Índice: idx_envelopes_user_name.

### automation_rules

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(100) | NOT NULL, length >= 1 |
| description | Text | nullable |
| type | String(30) | NOT NULL (recurring_transaction, budget_alert, goal_reminder, webhook, low_balance_alert, category_limit, weekly_report, round_up, payment_reminder) |
| is_active | Boolean | NOT NULL, default True |
| conditions | JSON | NOT NULL |
| actions | JSON | NOT NULL |
| last_run | DateTime(TZ) | nullable |
| next_run | DateTime(TZ) | nullable, index |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |
| deleted_at | DateTime(TZ) | nullable (soft delete) |

Índices: idx_automation_user_active, idx_automation_user_type, idx_automation_next_run.

### notifications

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| type | String(50) | NOT NULL |
| title | String(200) | NOT NULL, length >= 1 |
| body | Text | nullable |
| read_at | DateTime(TZ) | nullable |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| metadata | JSON | nullable (coluna nomeada metadata_) |

Índices: idx_notifications_user_read, idx_notifications_user_created.

### shared_expenses

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| created_by | String | NOT NULL, FK users.id CASCADE, index |
| amount | Numeric(15,2) | NOT NULL, > 0 |
| description | Text | NOT NULL |
| status | String(20) | NOT NULL, default active, IN (active, cancelled) |
| split_type | String(20) | NOT NULL, default equal, IN (equal, percentage, custom) |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

### expense_shares

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| expense_id | String | NOT NULL, FK shared_expenses.id CASCADE, index |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| status | String(20) | NOT NULL, default pending, IN (pending, accepted, rejected) |
| percentage | Numeric(5,2) | nullable, 0–100 se not null |
| amount | Integer | nullable, >= 0 (centavos) |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| responded_at | DateTime(TZ) | nullable |

Índice: idx_expense_shares_expense_user (expense_id, user_id).

### expense_share_events

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| share_id | String | NOT NULL, FK expense_shares.id CASCADE, index |
| action | String(20) | NOT NULL, IN (created, accepted, rejected) |
| performed_by | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |

### activity_feed

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| type | String(50) | NOT NULL, index |
| title | String(200) | NOT NULL |
| description | String(500) | nullable |
| entity_type | String(50) | nullable |
| entity_id | String | nullable |
| metadata | JSON | nullable (coluna metadata_) |
| is_read | Boolean | NOT NULL, default False, index |
| created_at | DateTime(TZ) | NOT NULL, server_default, index |

### tags

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| name | String(50) | NOT NULL |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| updated_at | DateTime(TZ) | nullable, onupdate |

### transaction_tags

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| transaction_id | String | NOT NULL, FK transactions.id CASCADE, index |
| tag_id | String | NOT NULL, FK tags.id CASCADE, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |

### ledger_entries

Append-only. Saldo por conta = soma de amount por account_id.

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| account_id | String | NOT NULL, FK accounts.id CASCADE, index |
| transaction_id | String | nullable, FK transactions.id SET NULL, index |
| amount | Numeric(15,2) | NOT NULL (positivo = credit, negativo = debit) |
| entry_type | String(10) | NOT NULL, IN (credit, debit) |
| created_at | DateTime(TZ) | NOT NULL, server_default |

Check: (entry_type = 'credit' AND amount > 0) OR (entry_type = 'debit' AND amount < 0). Índices: idx_ledger_entries_account_created, idx_ledger_entries_user_created.

### idempotency_keys

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| key | String(64) | NOT NULL, index |
| endpoint | String(128) | NOT NULL, index |
| request_hash | String(64) | NOT NULL |
| status | String(20) | NOT NULL, default in_progress, IN (in_progress, completed, failed) |
| response_status | Integer | nullable |
| response_body | JSON | nullable |
| response_payload | JSON | nullable (legado) |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| expires_at | DateTime(TZ) | nullable (TTL) |

Índice único: idx_idempotency_user_key_endpoint (user_id, key, endpoint). Índice: idx_idempotency_expires_at.

### user_sessions

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| refresh_token_hash | String(64) | NOT NULL, UNIQUE, index (SHA-256 hex) |
| device | String(200) | nullable |
| ip | String(45) | nullable |
| expires_at | DateTime(TZ) | NOT NULL, index |
| created_at | DateTime(TZ) | NOT NULL, server_default |
| revoked_at | DateTime(TZ) | nullable |

Índice: idx_user_sessions_user_expires.

### insight_cache

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| user_id | String | PK, FK users.id CASCADE |
| computed_at | DateTime(TZ) | NOT NULL |
| data | JSON | NOT NULL |

### insight_feedback

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| id | String (UUID) | PK |
| user_id | String | NOT NULL, FK users.id CASCADE, index |
| insight_type | String(50) | NOT NULL |
| insight_hash | String(255) | NOT NULL, index |
| status | String(20) | NOT NULL, IN (seen, ignored) |
| created_at | DateTime(TZ) | NOT NULL, server_default |

Índice: idx_insight_feedback_user_ignored (user_id, insight_hash, created_at).

### user_insight_preferences

| Campo | Tipo | Constraints / padrão |
|-------|------|----------------------|
| user_id | String | PK, FK users.id CASCADE |
| enable_category_variation | Boolean | NOT NULL, default True |
| enable_goals_at_risk | Boolean | NOT NULL, default True |
| updated_at | DateTime(TZ) | nullable, onupdate |

## Índices — resumo do porquê

- **user_id + entidade:** listagens e filtros por usuário (isolamento e performance).
- **(user_id, date)** em transactions: listagens por período.
- **account_id + created_at** em ledger_entries: cálculo de saldo por conta.
- **idempotency:** (user_id, key, endpoint) único para deduplicação; expires_at para limpeza futura.
- **user_sessions:** user_id + expires_at para revogação e limpeza de tokens expirados.

## Migrations (Alembic)

- **Aplicar:** dentro de `backend/`, com venv ativo e `DATABASE_URL` configurada: `alembic upgrade head`.
- **Reverter uma revisão:** `alembic downgrade -1`. Reverter até revisão específica: `alembic downgrade <revision_id>`.
- **Histórico:** `backend/alembic/versions/` contém os scripts; não alterar revisões já aplicadas em produção; criar nova migração para mudanças adicionais.
