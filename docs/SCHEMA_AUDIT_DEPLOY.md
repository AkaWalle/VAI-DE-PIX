# Auditoria de schemas — pré-deploy

**Data:** 2025-02-19  
**Escopo:** backend (models, schemas, routers, migrations), frontend (services), consistência entre camadas.

---

## Checklist

### Models vs Migrations
- [x] Cada campo em `models.py` tem migration correspondente (incl. `deleted_at` em `automation_rules` — ajustado no model).
- [x] Tipos alinhados: String/UUID, Integer, Decimal, Boolean, DateTime.
- [x] Nullable/not null consistentes entre model e migrations.
- [x] FKs com ondelete correto (CASCADE em user/account/category; SET NULL em `transfer_transaction_id` e `shared_expense_id`).
- [x] CHECK `check_automation_type` inclui os 9 tipos: `recurring_transaction`, `budget_alert`, `goal_reminder`, `webhook`, `low_balance_alert`, `category_limit`, `weekly_report`, `round_up`, `payment_reminder`.

### Schemas vs Models
- [x] O **router** `transactions.py` define seu próprio `TransactionCreate`/`TransactionResponse` (não usa `schemas.TransactionCreate`): `amount_cents` (int), `shared_expense_id` (Optional[str]). Alinhado ao model `Transaction` e ao contrato da API.
- [x] `shared_expense_id`: Optional[str] em `TransactionCreate` e `TransactionResponse` do **router** (e no model).
- [x] Enum `AutomationType` em `schemas.py` inclui os 9 tipos.
- [x] `SharedExpenseCreateSchema` bate com o uso no serviço: `total_cents`, `description`, `split_type`, `invited_email`, `participants`, `account_id`, `category_id` (opcionais).
- [x] Conditions/actions em automations são JSON/dict; o backend não valida estrutura por tipo. Frontend envia os campos corretos por tipo (recurring, low_balance_alert, category_limit, weekly_report, round_up, payment_reminder).

### Frontend vs Backend
- [x] `TransactionCreate` (TS) tem `amount_cents` e `shared_expense_id?: string`.
- [x] `AutomationRuleType` (TS) inclui os 9 tipos.
- [x] Payload de criação de cada automação (conditions/actions) bate com o que o backend armazena (dict flexível).
- [x] Campos de conditions/actions enviados pelo frontend cobrem todos os tipos listados no checklist.

### Routers
- [x] Endpoints de transações retornam `TransactionResponse` com `amount`, `amount_str`, `shared_expense_id`, etc.
- [x] Status codes: POST 200/201, DELETE 204, GET 200; erros 400/404/422 conforme regras.
- [x] Campos opcionais tratados com checagem (ex.: `if transaction.shared_expense_id is not None`).

---

## Inconsistências encontradas e correções

### 1. Model `AutomationRule` sem coluna `deleted_at`
- **Arquivo:** `backend/models.py`
- **Problema:** A migration `final_pre_launch_critical_fixes` adiciona `deleted_at` em `automation_rules`, mas o model não declarava a coluna.
- **Correção:** Adicionada no model:  
  `deleted_at = Column(DateTime(timezone=True), nullable=True)`

### 2. Documentação dos schemas de transação
- **Arquivo:** `backend/schemas.py`
- **Problema:** `TransactionBase`/`TransactionCreate`/`TransactionResponse` em schemas usam `amount` (float) e não têm `shared_expense_id`; a API real usa schemas definidos em `routers/transactions.py` (amount_cents, shared_expense_id).
- **Correção:** Comentário em `schemas.py` informando que a API de transações usa os schemas do router.

---

## Resultado

**Schemas e modelos estão consistentes e alinhados ao contrato da API.**  
As únicas alterações feitas foram: inclusão de `deleted_at` no model `AutomationRule` e o comentário em `schemas.py`.  
**Considerado seguro para deploy** do ponto de vista de schemas, models, migrations e frontend/backend.

---

## Referência rápida — tipos de automação e campos

| Tipo                 | Conditions (ex.)                                      | Actions (ex.)                    |
|----------------------|--------------------------------------------------------|----------------------------------|
| recurring_transaction| frequency, start_date, end_date                        | account_id, category_id, amount_cents |
| low_balance_alert   | account_id, amount_cents                               | —                                |
| category_limit      | category_id, amount_cents                               | —                                |
| weekly_report       | day_of_week, destination_email                        | —                                |
| round_up            | envelope_id, round_to_cents                            | —                                |
| payment_reminder    | days_after_creation                                    | —                                |
