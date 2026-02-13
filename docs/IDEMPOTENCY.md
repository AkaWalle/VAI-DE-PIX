# Idempotência Real (Trilha 5)

Documento da Trilha 5 — Idempotência em nível de produção no VAI DE PIX.  
**Objetivo:** Garantir que requisições repetidas nunca gerem efeitos colaterais duplicados (transação, ledger, saldo), mesmo com retry automático, timeout do cliente, concorrência ou falha parcial seguida de retry.

---

## Definição

- **Mesmo** `Idempotency-Key` + **mesmo** usuário + **mesma** rota + **mesmo** payload  
  → **sempre** o mesmo efeito e a mesma resposta (status + corpo).

- **Nunca duplicar:** transaction, ledger_entry, side-effects (saldo, insights, jobs).

- **Idempotência é lógica, não só transacional:** retry não pode recalcular regras financeiras; apenas uma execução real por (user, key, endpoint) com sucesso.

- **Erro ≠ efeito:** requests que falharam antes do commit **não** são cacheados; apenas requests concluídos com sucesso geram resposta cacheada. Status `failed` permite nova tentativa (retry) com a mesma key.

---

## Quando usar

- **POST /api/transactions** (inclui transferências via `type=transfer`): use `Idempotency-Key` em todo request que cria ou altera dinheiro (criação de transação, transferência).
- **POST /api/goals**: use em criação de meta.
- **Frontend / cliente:** em qualquer operação mutável que possa ser reenviada por retry, timeout ou duplo clique, envie um header `Idempotency-Key` único por “operação lógica” (ex.: UUID por clique ou por fluxo).

---

## Exemplos HTTP

### Request com idempotência (retry seguro)

```http
POST /api/transactions HTTP/1.1
Host: api.vaidepix.example
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "date": "2025-02-03T12:00:00",
  "account_id": "acc-123",
  "category_id": "cat-456",
  "type": "income",
  "amount": 100.00,
  "description": "Salário",
  "tags": []
}
```

- **Primeira vez:** execução normal; resposta 200 + corpo da transação criada; resultado é cacheado.
- **Retry (mesmo key + mesmo body):** resposta 200 + **mesmo** corpo cacheado; **nenhuma** nova transação nem nova entrada no ledger.

### Mesma key com payload diferente

```http
POST /api/transactions HTTP/1.1
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
...
{ "amount": 200.00, ... }
```

- **Resposta:** `400 Bad Request` — “Idempotency-Key já usada com outro corpo de requisição. Use outra key ou o mesmo payload.”

### Outro request em andamento (concorrência)

- Dois clientes enviam a **mesma** key + **mesmo** payload ao mesmo tempo.
- Um vira “dono” da execução; o outro recebe `409 Conflict` — “Outra requisição com a mesma Idempotency-Key está em andamento. Aguarde ou retente.”

---

## Erros possíveis

| Código | Situação |
|--------|----------|
| **400** | Mesma key já usada com **payload diferente**. Use outra key ou reenvie o mesmo body. |
| **409** | Mesma key já em execução (status `in_progress`). Aguarde e retente. |
| **200** | Sucesso; em retry com mesma key + mesmo body, resposta é a cacheada (mesmo efeito, mesma resposta). |

---

## Impacto no frontend (retry seguro)

- **Sempre** que o frontend (ou qualquer cliente) for reenviar um request mutável (ex.: criar transação, criar meta), envie um **Idempotency-Key** único por “operação lógica” (ex.: um UUID por ação do usuário).
- **Retry** (automático ou manual) com a **mesma** key e o **mesmo** body é seguro: não duplica transação, não duplica ledger, não duplica dinheiro.
- **Timeout / rede:** se o servidor processou com sucesso mas o cliente não recebeu a resposta, o retry com a mesma key + mesmo body devolve a resposta cacheada (200 + mesmo corpo).
- **Duplo clique:** usar a mesma key para o mesmo clique (ex.: key por `requestId` do fluxo) garante uma única transação.

---

## Implementação (backend)

- **Tabela:** `idempotency_keys` — campos: `user_id`, `key`, `endpoint`, `request_hash`, `status` (in_progress | completed | failed), `response_status`, `response_body`, `created_at`, `expires_at`. UNIQUE (user_id, key, endpoint). Índice em `expires_at` (TTL; limpeza futura documentada).
- **Middleware / dependency:** `middleware/idempotency.py` — `IdempotencyContext` + dependencies por rota (`get_idempotency_context_transactions`, `get_idempotency_context_goals`). Fluxo: acquire (INSERT in_progress ou SELECT por status) → handler → save_success ou save_failed.
- **Serviço:** `services/idempotency_service.py` — `acquire_idempotency`, `save_completed`, `save_failed`; idempotência é cross-cutting; services financeiros (ex.: `TransactionService`) não conhecem idempotência.
- **Testes:** `tests/test_idempotency.py`, `tests/test_idempotency_strict.py` (PostgreSQL para testes estritos).

---

## Referências

- READY-TO-SCALE-CHECKLIST.md — Idempotência: IMPLEMENTADO (safe retry garantido).
- FINANCIAL-RULES.md — Ledger append-only; invariantes.
- ADVANCED-TESTING.md — Testes de concorrência e idempotência.
