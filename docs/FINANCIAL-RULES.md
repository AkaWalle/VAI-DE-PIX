# Regras Financeiras — Vai de Pix

Documento de auditoria de regras (Trilha 1 do Roadmap Técnico).  
**Objetivo:** Garantir que todas as regras são matematicamente corretas, consistentes no tempo e não permitem estados financeiros inválidos.

---

## 1. Transações (Transactions)

### Regras

- Toda transação é **income** ou **expense** (ou **transfer**, que gera duas transações income/expense).
- **amount** sempre > 0 (constraint no banco: `check_transaction_amount_positive`).
- Transação pertence a uma **conta** e uma **categoria**; usuário dono da conta = dono da transação.
- **Soft delete:** `deleted_at` preenchido; transação não some do banco; histórico preservado.
- **Efeito no saldo:** registrado no **ledger** (append-only), não por atualização direta de `account.balance`.

### Fórmulas

- **Income:** uma entrada no ledger: `entry_type='credit'`, `amount=+transaction.amount`.
- **Expense:** uma entrada no ledger: `entry_type='debit'`, `amount=-transaction.amount`.
- **Saldo da conta:** não é alterado diretamente; após cada operação, `account.balance = SUM(ledger_entries.amount)` para aquela conta (sync).

### Invariantes

- Para cada transação (não transfer) não deletada: existe exatamente uma entrada no ledger com `transaction_id = transaction.id`.
- Transação com `deleted_at` não null: existe entrada de **reversão** no ledger (mesmo `transaction_id`, amount de sinal oposto), de modo que a contribuição líquida daquela transação para o saldo seja zero.

### Efeitos colaterais

- Criação/atualização/deleção de transação altera ledger e dispara `sync_account_balance_from_ledger(account_id)` para as contas envolvidas.
- Soft delete: reversão no ledger + `deleted_at` na transação (e na parceira, se for transfer).

### Edge cases (regras explícitas)

| Caso | Regra | Resultado |
|------|--------|-----------|
| amount ≤ 0 na API | Validação Pydantic / constraint | Erro 422 ou constraint no banco |
| Update com valor negativo | Não permitido (amount > 0) | Erro |
| Delete duplo (já soft-deleted) | Operação idempotente ou erro conforme implementação | Documentar no código |
| Transação com categoria/conta inexistente | FK + ownership; conta/categoria devem existir e ser do usuário | 404 ou 400 |
| **Idempotency-Key (Trilha 6.1)** | Header opcional em POST /api/transactions; mesma key + mesmo body → mesma resposta; mesma key + body diferente → 409 | Retry não duplica; conflito explícito |
| **Concorrência (Trilha 6.2)** | row_version em Account; sync com optimistic locking; conflito de versão → HTTP 409 (refaça a operação) | Evita sobrescrita silenciosa em atualizações concorrentes |
| **Locking forte (Trilha 6)** | Advisory locks transacionais (pg_advisory_xact_lock); lock em contas/metas em ordem determinística; evita deadlock e double-spend | db/locks.py; TransactionService e goals; apenas PostgreSQL |

---

## 2. Transferências (Transfers)

### Regras

- Uma **transferência** é duas transações do tipo **transfer** ligadas por `transfer_transaction_id`.
- Transação de **origem:** `account_id = conta origem`, `amount = valor`, `transfer_transaction_id = id da transação destino`.
- Transação de **destino:** `account_id = conta destino`, `amount = mesmo valor`, `transfer_transaction_id = id da transação origem` (ou null na criação, atualizado em seguida).
- **Débito na conta origem, crédito na conta destino.** Soma líquida entre as duas contas = 0 (não cria nem destrói dinheiro).

### Fórmulas

- Ledger conta origem: uma entrada `entry_type='debit'`, `amount=-amount`.
- Ledger conta destino: uma entrada `entry_type='credit'`, `amount=+amount`.
- Soma das duas entradas: `(-amount) + (+amount) = 0`.

### Invariantes

- Para cada transferência (par de transações): existem exatamente duas entradas no ledger, uma por conta; soma dos `amount` = 0.
- Conta origem e destino devem ser distintas (regra de negócio; validar no router/service).
- Ambas as contas pertencem ao mesmo usuário.

### Efeitos colaterais

- Duas linhas em `transactions`; duas linhas em `ledger_entries`. Dois `sync_account_balance_from_ledger` (origem e destino).
- Delete (soft) da transferência: reversão das duas pernas no ledger + soft delete das duas transações.

### Edge cases (regras explícitas)

| Caso | Regra | Resultado |
|------|--------|-----------|
| Transferência para a **mesma conta** | Proibido | 400 Bad Request (implementado em `transaction_service._create_transfer`: `to_account_id == account.id`) |
| `to_account_id` ausente quando type=transfer | Obrigatório | 400 / ValueError |
| Conta destino de outro usuário | Ownership | 404 ou 403 |
| amount ≤ 0 | amount > 0 | 422 / constraint |

---

## 3. Contas (Accounts)

### Regras

- Cada conta tem `balance` (Float). Quando o ledger está em uso, **a fonte da verdade é o ledger**: `account.balance` é cópia sincronizada de `SUM(ledger_entries.amount)` para aquela conta.
- Tipos: checking, savings, investment, credit, cash (constraint no banco).
- Conta pertence a um usuário; todas as transações da conta são do mesmo usuário.

### Fórmulas

- **Saldo calculado:** `balance_calculado(account_id) = SUM(ledger_entries.amount) WHERE account_id = account_id`.
- **Invariante:** `account.balance == balance_calculado(account_id)` após toda operação que altera o ledger para essa conta (sync garantido no service).

### Invariantes

- Para toda conta que possui entradas no ledger: `account.balance == get_balance_from_ledger(account_id)` após cada create/update/delete de transação que a envolve.
- Contas podem ter saldo negativo (ex.: cartão de crédito); não há constraint de balance >= 0 no modelo Account.

### Efeitos colaterais

- Nenhum efeito “criar dinheiro”: toda entrada de crédito em uma conta tem contrapartida (débito em outra ou entrada de despesa/reversão).

### Edge cases

| Caso | Regra | Resultado |
|------|--------|-----------|
| Leitura de saldo antes de sync | Sempre chamar sync após alterar ledger | Saldo correto após commit |
| Conta sem nenhuma entrada no ledger | balance = 0 ou valor de abertura (entrada de abertura no ledger em testes) | Coerente com SUM=0 |

---

## 4. Ledger (Ledger entries)

### Regras

- **Append-only:** não há UPDATE nem DELETE de entradas; apenas INSERT.
- Cada entrada: `user_id`, `account_id`, `amount` (com sinal), `entry_type` ('credit' | 'debit'), `transaction_id` (opcional).
- **credit:** amount > 0; **debit:** amount < 0 (constraint `check_ledger_amount_sign`).
- Saldo da conta = SUM(amount) para essa conta.

### Fórmulas

- `saldo(account_id) = SUM(ledger_entries.amount) WHERE account_id = account_id`.
- Reversão (ex.: soft delete): nova entrada com mesmo `transaction_id`, `amount` e `entry_type` invertidos (sinal oposto, tipo oposto), de forma que a contribuição líquida daquela transação seja zero.

### Invariantes

- Nenhuma entrada é alterada nem removida após criação.
- Para cada transação (não deletada) existe pelo menos uma entrada com `transaction_id = transaction.id`; para transação soft-deleted, a soma das entradas com esse `transaction_id` é zero (reversão completa).

### Efeitos colaterais

- Ledger não altera outros domínios diretamente; é apenas escrito por TransactionService e lido por ledger_utils / repositório.

### Edge cases

| Caso | Regra | Resultado |
|------|--------|-----------|
| credit com amount <= 0 | Constraint / LedgerRepository.append | ValueError ou constraint |
| debit com amount >= 0 | Idem | ValueError ou constraint |
| Operação falha após append e antes de sync | atomic_transaction (rollback) | Nada persistido |

### 4.1 Snapshots de saldo (Trilha 5)

- **Objetivo:** performance em leituras históricas; ledger continua fonte da verdade.
- **Modelo:** `AccountBalanceSnapshot` — account_id, snapshot_date (YYYY-MM-01), balance; UNIQUE(account_id, snapshot_date).
- **Regra:** snapshot.balance = soma do ledger até o último instante do mês (snapshot_date). Job mensal recalcula do ledger (idempotente).
- **Conciliação:** job diário compara snapshot com soma do ledger; divergência > ε → log ERROR (sem valores financeiros em texto).
- **Invariante:** snapshot é **derivado**; não altera ledger nem account.balance. Leitura histórica pode usar `get_balance_from_ledger_until(account_id, until_dt)`.

---

## 5. Envelopes (Envelopes)

### Regras

- **Envelope** tem `balance` e opcionalmente `target_amount`.
- **balance >= 0** (constraint `check_envelope_balance_non_negative`).
- **target_amount** NULL ou > 0 (constraint).
- Movimentações: adicionar valor ao envelope (crédito) ou retirar (débito). Retirada não pode exceder o saldo.

### Fórmulas

- Após crédito: `balance += amount` (amount > 0).
- Após débito: `balance -= amount`; deve valer `amount <= balance` antes da operação.

### Invariantes

- Para todo envelope: `balance >= 0`.
- Withdraw: somente se `amount <= envelope.balance` (validado no router, e.g. envelopes.py).

### Efeitos colaterais

- Envelopes são independentes do ledger de contas; não há dupla escritura automática conta ↔ envelope nas regras atuais (movimentação é só no envelope).

### Edge cases (regras explícitas)

| Caso | Regra | Resultado |
|------|--------|-----------|
| withdraw > saldo | Proibido | 400 (implementado em routers/envelopes.py) |
| amount <= 0 em add/withdraw | Proibido | 400 |
| target_amount = 0 | Constraint: NULL ou > 0 | Erro de constraint ou validação |

---

## 6. Metas (Goals)

### Regras

- **target_amount > 0** (constraint `check_goal_target_amount_positive`).
- **current_amount >= 0** e **current_amount <= target_amount** (constraints no banco).
- Aporte: soma ao `current_amount` sem exceder `target_amount` (validado no router, e.g. goals.py: `current_amount >= target_amount` → não aportar mais).

### Fórmulas

- Após aporte: `current_amount = min(current_amount + amount, target_amount)` (ou rejeitar se já atingiu).
- Status (achieved, on_track, at_risk, etc.) é derivado; não altera o invariante numérico.

### Invariantes

- Sempre: `0 <= current_amount <= target_amount` e `target_amount > 0`.

### Efeitos colaterais

- Metas não alteram ledger nem saldo de conta; apenas estado da própria meta.

### Edge cases (regras explícitas)

| Caso | Regra | Resultado |
|------|--------|-----------|
| Meta com target_amount = 0 | Constraint no banco | Inserção/update falha |
| Aporte com amount <= 0 | Rejeitado | 400 |
| Aporte quando current_amount >= target_amount | Rejeitado (goals.py) | 400 |
| Cálculo de insights (metas em risco) | Somente leitura | Insights não alteram estado |

---

## 7. Insights

### Regras

- **Somente leitura.** Nenhuma escrita em contas, ledger, transações, metas ou envelopes.
- Resultados vêm de agregações (transações, metas) e de cache (InsightCache).
- Cache é **derivado**; nunca é fonte da verdade para saldos ou transações.

### Fórmulas

- Variação mensal: soma de despesas por categoria (mês atual vs anterior); metas em risco: ritmo e gap (ver docs/insights/INSIGHTS-RULES.md).

### Invariantes

- GET /api/insights e jobs de insights **não** inserem/atualizam/deletam transações, ledger, contas, metas ou envelopes.
- Cache pode ser recalculado ou invalidado; dados financeiros canônicos estão em transactions, ledger, accounts, goals, envelopes.

### Efeitos colaterais

- Notificações (insight_goal_risk, insight_spending_spike, etc.) são criadas com base em eventos; não alteram saldos nem ledger.

### Edge cases

| Caso | Regra | Resultado |
|------|--------|-----------|
| Cache corrompido ou desatualizado | Recálculo; nunca usar cache para débito/crédito | Consistência nos dados canônicos |
| Job de insights falha | Retry / log; não altera estado financeiro | Idempotente do ponto de vista contábil |

---

## 8. Locks & Concorrência (Trilha 6)

### Regras

- **Advisory locks transacionais** (PostgreSQL): `pg_advisory_xact_lock(key)` — lock liberado automaticamente ao fim da transação (commit/rollback).
- **Chaves de lock:** conta → `lock_account(account_id)`; múltiplas contas → `lock_accounts_ordered(account_ids)` (ordem determinística); meta → `lock_goal(goal_id)`.
- **Ordem determinística:** sempre ordenar IDs (ex.: `sorted(account_ids)`) antes de aplicar locks para **evitar deadlock** (ex.: transferência A→B e B→A).
- **Fluxo em transferências:** `lock_accounts_ordered([from_account, to_account])` → validar saldo → criar transações → append ledger (2 entradas) → sync_account_balance_from_ledger → commit.
- **Idempotência × locking:** locks ficam **dentro** da transação do service; o middleware de idempotência não segura locks — apenas garante que o mesmo request (mesma key) não execute duas vezes; o locking garante que operações concorrentes (keys diferentes) serializem nas contas/metas.

### Por que advisory lock

- Lock automático ao fim da transação (não precisa release explícito).
- Não depende de linhas existirem (funciona antes de INSERT).
- Barato e previsível; ideal para domínios financeiros.
- Evita double-spend e saldo negativo quando combinado com SELECT FOR UPDATE e sync com row_version.

### Por que SQLite não cobre esses cenários

- SQLite não possui advisory locks; os testes de locking (test_db_locking.py) são marcados com `@pytest.mark.requires_postgres` e rodam apenas com PostgreSQL.
- Em desenvolvimento com SQLite, as funções de lock são no-op; a consistência em concorrência real é garantida em produção com PostgreSQL.

### Referências de código

- `backend/db/locks.py`: `lock_account`, `lock_accounts_ordered`, `lock_goal`.
- `backend/services/transaction_service.py`: locks no início de cada `atomic_transaction` (create_transaction, _create_transfer, update_transaction, delete_transaction).
- `backend/routers/goals.py`: `lock_goal` em update_goal, delete_goal, add_value_to_goal.
- `backend/tests/test_db_locking.py`: testes de double-spend, deadlock, lock+idempotência, lock prolongado (PostgreSQL).

---

## Resumo de invariantes globais

1. **SUM(ledger.amount) por conta = account.balance** (após cada operação que toca essa conta).
2. **Transferência não cria dinheiro:** soma das duas entradas de ledger da transferência = 0.
3. **Soft delete não altera histórico:** transação mantida com deleted_at; reversão no ledger com mesmo transaction_id; contribuição líquida zero.
4. **Insights não alteram estado:** apenas leitura e cache/notificações.
5. **Ledger append-only:** nenhum UPDATE/DELETE em ledger_entries; reversões são novos INSERTs.
6. **Envelope:** balance >= 0; withdraw <= balance.
7. **Goal:** 0 <= current_amount <= target_amount, target_amount > 0.

---

## 1.3 Casos extremos (edge cases) — resumo

| Domínio | Caso extremo | Regra | Onde validado |
|---------|--------------|--------|----------------|
| Transferência | Mesma conta | Rejeitar | `transaction_service._create_transfer` (400) |
| Transferência | to_account_id ausente | Rejeitar | Pydantic + service (400) |
| Transação | amount ≤ 0 | Rejeitar | Pydantic + constraint `check_transaction_amount_positive` |
| Transação | Delete duplo | Idempotente ou erro | Service: soft delete só marca deleted_at; reversão no ledger já existe |
| Envelope | withdraw > saldo | Rejeitar | `routers/envelopes.py` (400) |
| Envelope | amount ≤ 0 em add/withdraw | Rejeitar | `routers/envelopes.py` |
| Meta | target_amount = 0 | Rejeitar | Constraint `check_goal_target_amount_positive` |
| Meta | Aporte quando current >= target | Rejeitar | `routers/goals.py` (400) |
| Ledger | credit amount ≤ 0 / debit amount ≥ 0 | Rejeitar | `LedgerRepository.append` (ValueError) + constraint |

Mensagens de erro devem ser consistentes (ex.: "Transferência para a mesma conta não é permitida", "Conta de destino não encontrada").

---

## Referências de código

- Ledger: `backend/core/ledger_utils.py`, `backend/repositories/ledger_repository.py`, `backend/models.py` (LedgerEntry).
- Transações e transferências: `backend/services/transaction_service.py`, `backend/routers/transactions.py`.
- Contas: `backend/models.py` (Account), sync em `sync_account_balance_from_ledger`.
- Envelopes: `backend/routers/envelopes.py`, constraints em `models.py` (Envelope).
- Metas: `backend/routers/goals.py`, constraints em `models.py` (Goal).
- Insights: `backend/services/insights_service.py`, `backend/domain/insight_policies/`, `docs/insights/INSIGHTS-RULES.md`.
