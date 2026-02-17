# Hardening do fluxo de transações — Resumo

## Objetivo

- **Crash safety:** idempotência em sessão separada; transação principal commitada apenas no router.
- **Idempotência real:** acquire/save_success/save_failed sempre em sessão própria; retry não duplica.
- **Observabilidade:** X-Request-ID (middleware + contextvar); logs com request_id e idempotency_key.
- **Consistência:** service não faz commit; router controla `atomic_transaction`.
- **Zero breaking change:** contratos de API, payload e erros inalterados; sem novas dependências.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `backend/database.py` | `run_with_idempotency_session(operation)` + hook `_idempotency_session_factory` para testes |
| `backend/services/idempotency_service.py` | `save_completed_by_key`, `save_failed_by_key` (por user_id/key/endpoint) |
| `backend/middleware/idempotency.py` | IdempotencyContext sem `db`; acquire/save_success/save_failed usam `run_with_idempotency_session` |
| `backend/services/transaction_service.py` | Remoção de `atomic_transaction` em create/transfer/update/delete; ignora `transfer_transaction_id` no update |
| `backend/routers/transactions.py` | POST: `atomic_transaction(db)` no router; um commit; set_idempotency_key; update/delete em `atomic_transaction(db)` |
| `backend/routers/goals.py` | Remoção do `db.commit()` redundante após save_success |
| `backend/core/request_context.py` | **Novo:** contextvars request_id, idempotency_key; `RequestContextLoggingFilter`; `_ensure_filter_registered()` |
| `backend/core/request_id_middleware.py` | **Novo:** middleware X-Request-ID; gera UUID se ausente; seta contextvar e response header |
| `backend/core/logging_config.py` | JSONFormatter inclui request_id e idempotency_key quando existirem |
| `backend/main.py` | Registro de `RequestIDMiddleware` |
| `backend/production_server.py` | Registro de `RequestIDMiddleware` |
| `backend/tests/conftest.py` | Fixture `client`: `_idempotency_session_factory = TestingSessionLocal` para mesmo engine |
| `backend/tests/test_idempotency.py` | Retry após falha: esperar HTTPException(500) e `postgres_db.rollback()` |
| `backend/tests/test_db_locking.py` | Worker de double-spend: `atomic_transaction(db)` em volta de create_transaction |

---

## Justificativas técnicas

### 1. Idempotência em sessão separada

- **Problema:** transação de negócio e linha de idempotency eram commitadas juntas; crash após commit da transação e antes de save_success deixava a key em `in_progress` e retry devolvia 409 com transação já criada.
- **Solução:** acquire, save_completed e save_failed rodam em `run_with_idempotency_session()`, que usa uma sessão nova (commit/rollback independentes). O router usa outra sessão e só commita a transação de negócio dentro de `atomic_transaction(db)`.
- **Efeito:** crash após commit da transação não altera o fato de que só existe uma transação; retry com mesma key pode devolver 409 (in_progress) até algum processo concluir save_success, mas **nunca duplica** transação.

### 2. Service não faz commit

- **Problema:** commit dentro do service acoplava transação e idempotency na mesma transação de DB.
- **Solução:** create_transaction, _create_transfer, update_transaction e delete_transaction só usam a sessão recebida (locks, flush, ledger, etc.). O router envolve as chamadas em `with atomic_transaction(db):` e faz um único commit por operação.
- **Efeito:** transação de negócio e idempotency ficam em sessões/transações distintas; rollback da negócio não mexe no estado de idempotency.

### 3. save_failed com commit independente

- **Problema:** save_failed era chamado na sessão da request, que em caso de exceção era fechada sem commit; estado `failed` não era persistido.
- **Solução:** save_failed chama `run_with_idempotency_session(lambda db: save_failed_by_key(...))`, que abre nova sessão, atualiza a key para `failed` e commita.
- **Efeito:** falhas passam a persistir estado `failed` na tabela de idempotency.

### 4. transfer_transaction_id não aceito do cliente

- **Problema:** update_transaction aplicava `update_data['transfer_transaction_id']`, permitindo manipulação do vínculo de transferência se o payload viesse a incluir o campo.
- **Solução:** remoção do bloco que aplicava `transfer_transaction_id` no update; comentário explicando que o campo é apenas interno (criação de transfer).
- **Efeito:** cliente não pode alterar o par de transações de transferência.

### 5. X-Request-ID e correlation em logs

- **Problema:** difícil correlacionar erros em produção sem request_id/idempotency_key antes de existir transaction_id.
- **Solução:** middleware lê ou gera X-Request-ID, grava em contextvar e em response; filtro de logging adiciona request_id e idempotency_key a todos os log records; JSONFormatter inclui esses campos quando presentes.
- **Efeito:** todo log pode ser correlacionado por request e por idempotency key.

### 6. Um único commit no router (transações)

- **Problema:** dois `db.commit()` no POST (um após create_transaction, outro após save_success); o primeiro era redundante e confundia o desenho.
- **Solução:** apenas `with atomic_transaction(db): ... create_transaction(...)`; depois `idem.save_success(200, payload)` (que commita em sessão separada). Remoção do commit extra em goals.
- **Efeito:** um commit por operação de negócio no router; idempotency continua com commits próprios.

---

## Testes

- **Idempotência:** mesma key + mesmo body → mesma resposta; mesma key + body diferente → 400; retry após falha simulada → rollback + uma transação após retry.
- **Lock/concorrência:** double-spend com 2 workers → uma transferência commitada, outra 400/409; worker passa a usar `atomic_transaction(db)` em volta de create_transaction.
- **Transações:** create/update/delete e saldo (test_transactions, test_atomic_transaction_integrity) seguem passando.

---

## Não alterado (conforme regras)

- Endpoints, payloads e estrutura de erros da API.
- Auth, JWT, refresh.
- Locks (advisory, SELECT FOR UPDATE), row_version, regras do ledger.
- Schema do banco (sem novas colunas/tabelas).
- Sem novas dependências, filas, workers ou event bus.

---

## Validação

- `pytest tests/test_idempotency.py tests/test_transactions.py tests/test_db_locking.py tests/test_atomic_transaction_integrity.py` (e testes relacionados) passando.
- Contrato da API inalterado; resposta e códigos de erro 400/404/409/422/500 mantidos.
