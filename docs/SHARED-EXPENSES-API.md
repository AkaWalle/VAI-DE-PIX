# Despesas compartilhadas — implementação (Fase 1)

## 1. Arquivos criados

### Migration
- `backend/alembic/versions/add_shared_expenses_and_expense_shares.py`

### Models
- Novos models em `backend/models.py`: `SharedExpense`, `ExpenseShare` (e relacionamentos em `User`)

### Schemas
- Novos schemas em `backend/schemas.py`: `SharedExpenseCreateSchema`, `ExpenseShareResponseSchema`, `SharedExpenseResponseSchema`, `ExpenseShareRespondSchema`, `PendingShareItemSchema`

### Repositories
- `backend/repositories/shared_expense_repository.py` — `SharedExpenseRepository`
- `backend/repositories/expense_share_repository.py` — `ExpenseShareRepository`

### Services
- `backend/services/shared_expense_service.py` — `create_shared_expense`, `respond_to_share`

### Routers
- `backend/routers/shared_expenses.py` — `shared_expenses_router`

### Integração
- `api/index.py` — import e registro do router `shared_expenses` (prefixo `shared-expenses`)

---

## 2. Migrations

- **Revision:** `add_shared_expenses`
- **Arquivo:** `backend/alembic/versions/add_shared_expenses_and_expense_shares.py`
- **Tabelas:** `shared_expenses`, `expense_shares` (com FKs, índices e check constraints)

Para rodar no Neon (ou local):

```bash
cd backend
python -m alembic upgrade head
```

Ou usar o script existente (carrega `.env` da raiz):

```bash
python scripts/run-migrations-neon.py
```

---

## 3. Rotas disponíveis

Todas exigem autenticação (Bearer JWT).

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/shared-expenses` ou `/api/shared-expenses` | Cria despesa compartilhada e convite para o e-mail |
| GET | `/shared-expenses/pending` ou `/api/shared-expenses/pending` | Lista convites pendentes do usuário logado |
| PATCH | `/shared-expenses/shares/{share_id}` ou `/api/shared-expenses/shares/{share_id}` | Aceita ou recusa o convite |

---

## 4. Exemplos de request/response

### POST /api/shared-expenses — Criar despesa e convidar

**Request:**

```http
POST /api/shared-expenses
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "amount": 75.50,
  "description": "Almoço no restaurante",
  "invited_email": "amigo@email.com"
}
```

**Response 200:**

```json
{
  "id": "uuid-da-despesa",
  "created_by": "uuid-do-criador",
  "amount": 75.5,
  "description": "Almoço no restaurante",
  "status": "active",
  "created_at": "2026-02-13T12:00:00Z",
  "updated_at": null
}
```

**Response 400 (auto-convite):**

```json
{
  "detail": "Não é possível convidar a si mesmo para a despesa."
}
```

**Response 400 (e-mail não cadastrado):**

```json
{
  "detail": "Usuário com este e-mail não está cadastrado."
}
```

---

### GET /api/shared-expenses/pending — Listar pendências

**Request:**

```http
GET /api/shared-expenses/pending
Authorization: Bearer <access_token>
```

**Response 200:**

```json
[
  {
    "id": "uuid-do-share",
    "expense_id": "uuid-da-despesa",
    "user_id": "uuid-do-usuario-logado",
    "status": "pending",
    "created_at": "2026-02-13T12:00:00Z",
    "responded_at": null,
    "expense_amount": 75.5,
    "expense_description": "Almoço no restaurante",
    "creator_name": "João Silva"
  }
]
```

---

### PATCH /api/shared-expenses/shares/{share_id} — Aceitar ou recusar

**Request (aceitar):**

```http
PATCH /api/shared-expenses/shares/uuid-do-share
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "action": "accept"
}
```

**Request (recusar):**

```json
{
  "action": "reject"
}
```

**Response 200:**

```json
{
  "id": "uuid-do-share",
  "expense_id": "uuid-da-despesa",
  "user_id": "uuid-do-usuario",
  "status": "accepted",
  "created_at": "2026-02-13T12:00:00Z",
  "responded_at": "2026-02-13T12:05:00Z"
}
```

**Response 404 (share não encontrado ou de outro usuário):**

```json
{
  "detail": "Este convite não pertence a você."
}
```

**Response 400 (já respondido):**

```json
{
  "detail": "Este convite já foi respondido."
}
```

---

## 5. Notificações

- **Tipo:** `expense_share_pending`
- **Quando:** ao criar o convite (share) para outro usuário.
- **Metadata:** `{ "expense_id": "<uuid>", "share_id": "<uuid>" }` para o frontend poder abrir a tela de aceitar/recusar.

---

## 6. Segurança (resumo)

- Apenas o usuário do share (`user_id`) pode responder (aceitar/recusar).
- Não é permitido convidar a si mesmo (e-mail do criador = convidado).
- Usuário convidado deve existir (e-mail cadastrado).
- Rotas protegidas com `get_current_user`; listagem e PATCH filtrados por usuário logado.
