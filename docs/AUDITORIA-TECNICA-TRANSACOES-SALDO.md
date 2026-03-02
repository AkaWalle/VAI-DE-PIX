# Auditoria técnica — Vai de Pix (transações, saldo, listagem)

**Escopo:** problemas relatados: duplicidade ao criar, transações que voltam após apagar, lentidão ao criar/listar, mistura de mês atual e anterior ao atualizar.  
**Foco:** backend (transações, delete, listagem, índices, saldo) + frontend (criação, delete, listagem) + performance.

---

## PARTE 1 — BACKEND

### 1. Fluxo de criação de transação

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **atomic_transaction** | OK | `routers/transactions.py` usa `with atomic_transaction(db):` ao redor de `TransactionService.create_transaction`. Rollback em caso de exceção. |
| **Commit duplicado** | OK | Um único `atomic_transaction`; não há segundo commit no mesmo handler. |
| **Execução dupla** | RISCO | Idempotência só vale se o cliente enviar header `Idempotency-Key`. O frontend **não envia** esse header → retentativas ou duplo clique geram duas transações. |
| **Idempotência isolada** | OK | `middleware/idempotency.py`: acquire/save_success/save_failed usam `run_with_idempotency_session` (sessão separada). Crash após commit da transação principal não deixa idempotency “completed” sem resposta. |
| **save_success() sempre chamado** | OK | Em sucesso: `idem.save_success(200, resp.model_dump(mode="json"))`. Em exceção: `idem.save_failed()` nos blocos `except`. |
| **UNIQUE no banco** | AUSÊNCIA | Não existe UNIQUE em `transactions` (ex.: user_id + date + amount_cents + description) para impedir duplicidade real. Duplicatas só são evitadas se o cliente enviar Idempotency-Key. |

**Trecho problemático (frontend não envia idempotency):**

- Backend espera header opcional; sem ele, cada POST cria nova transação.

**Correção sugerida (frontend):**

- Em `src/services/transactions.service.ts`, ao chamar `createTransaction`, enviar header `Idempotency-Key` com valor único por “ação” (ex.: `crypto.randomUUID()` gerado uma vez no clique do botão e reutilizado em retentativas).

```ts
// Exemplo em createTransaction - gerar key no componente e passar
const idempotencyKey = useRef<string | null>(null);
// No handleSubmit, antes do createTransaction:
if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
const response = await httpClient.post(API_ENDPOINTS.transactions.create, transaction, {
  headers: { 'Idempotency-Key': idempotencyKey.current },
});
// Após sucesso, limpar para próxima criação: idempotencyKey.current = null;
```

- **Backend (recomendação):** considerar constraint UNIQUE (user_id, request_hash, created_at truncado ao minuto) ou tabela de “deduplicação” por hash do payload para camada extra contra duplicatas quando não houver key.

---

### 2. DELETE de transação

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **Soft vs hard** | INCONSISTÊNCIA | Router chama `TransactionService.delete_transaction(..., hard=True)` → **hard delete**. Service suporta soft (`deleted_at`) mas a API está configurada para remoção física. |
| **Filtro deleted_at nas queries** | PARCIAL | `TransactionRepository.get_by_user` e `get_by_user_and_id` filtram `Transaction.deleted_at.is_(None)`. **GET /transactions/:id** no router **não** filtra `deleted_at` → transação soft-deletada ainda poderia ser lida por id (hoje irrelevante pois a API usa hard delete). |
| **Reidratação de dados antigos** | N/A | Com hard delete não há “reidratação” no backend. O problema de “transações que voltam” está no **frontend** (ver Parte 2). |

**Trecho problemático (GET por id sem deleted_at):**

```python
# backend/routers/transactions.py, ~203-206
transaction = db.query(Transaction).filter(
    Transaction.id == transaction_id,
    Transaction.user_id == current_user.id
).first()
```

**Correção sugerida:**

- Se no futuro a API passar a usar soft delete, incluir `Transaction.deleted_at.is_(None)` no filtro.
- Manter documentação clara: hoje a API faz **hard** delete; o comentário no router diz "Delete (hard)".

---

### 3. Listagem de transações

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **Filtro por mês** | OPCIONAL / FRONTEND | API aceita `start_date` e `end_date`. O frontend **não envia** esses parâmetros no carregamento inicial → lista “últimas N” (50), que podem abranger dois meses. |
| **date_trunc** | NÃO USADO | Repo usa `Transaction.date >= start_date` e `Transaction.date <= end_date`. Para listagem por “mês” seria mais claro usar intervalo fechado do mês (primeiro e último instante). Não há erro de lógica; `extract(year/month)` em `get_monthly_summary` é consistente. |
| **Timezone** | CUIDADO | `Transaction.date` é `DateTime(timezone=True)`. Comparar com `date` em Python pode depender do timezone (meia-noite local vs UTC). Para relatórios por mês, definir se o “mês” é do usuário (timezone) ou UTC e documentar. |
| **Paginação** | OK | `skip` e `limit` (default 50, max 100) no repositório. Evita trazer tudo de uma vez. |
| **ORDER BY + LIMIT** | OK | `order_by(Transaction.date.desc()).offset(skip).limit(limit).all()`. |

**Trecho problemático (resumo mensal sem deleted_at):**

```python
# backend/routers/transactions.py, get_monthly_summary ~313-317
transactions = db.query(Transaction).filter(
    Transaction.user_id == current_user.id,
    extract('year', Transaction.date) == year,
    extract('month', Transaction.date) == month
).all()
```

**Correção sugerida:**

- Incluir `Transaction.deleted_at.is_(None)` para que totais e breakdown não incluam transações deletadas (quando/se passar a usar soft delete). Hoje com hard delete não há linha deletada, mas mantém consistência futura.

---

### 4. Índices no banco

| Índice / Uso | Situação | Observação |
|--------------|----------|------------|
| **(user_id, date)** | OK | `idx_transactions_user_date` em `models.py`. |
| **account_id, category_id** | OK | `idx_transactions_account_date`, `idx_transactions_category_date`; FKs indexadas. |
| **deleted_at** | OK | `idx_transactions_deleted_at` (alembic). |
| **Listagem típica** | OK | Filtro `user_id + deleted_at IS NULL + date` pode usar user_date; deleted_at em índice auxiliar. |
| **Full table scan** | BAIXO RISCO | Com user_id e opcionalmente start_date/end_date, índices cobrem. Monitorar planos se volume crescer. |

Nenhuma alteração crítica necessária; manter índices atuais.

---

### 5. Cálculo de saldo

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **SUM() no ledger** | OK | `get_balance_from_ledger` usa `func.sum(LedgerEntry.amount)` por conta. Fonte da verdade é o ledger. |
| **Mesma transação da criação** | OK | `create_transaction` faz append no ledger e em seguida `sync_account_balance_from_ledger` na mesma `atomic_transaction`. |
| **Race condition** | MITIGADO | Uso de `lock_account`, `_lock_accounts_for_update` (SELECT FOR UPDATE) e `sync_account_balance_from_ledger` com `row_version` (optimistic lock). Conflito → 409. |

Nenhum problema crítico identificado no fluxo de saldo.

---

## PARTE 2 — FRONTEND

### 1. Criação de transação

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **Botão desabilitado após clique** | OK | `FormDialog` recebe `isLoading` e desabilita o botão de submit (`disabled={isLoading}`). |
| **Debounce** | NÃO | Não há debounce no submit; apenas o estado de loading. Duplo clique muito rápido pode disparar dois requests antes de `setIsLoading(true)` refletir. |
| **Múltiplas requisições** | RISCO | Sem `Idempotency-Key`, cada request gera nova transação. |
| **StrictMode** | BAIXO RISCO | useEffect de loadData tem `cancelled`; submit é evento de formulário, não efeito duplicado. |

**Correção sugerida:**

- Enviar `Idempotency-Key` no POST de criação (ver sugestão de código na Parte 1).
- Opcional: debounce de 300–500 ms no submit ou desabilitar o botão no primeiro `mousedown` (não só no submit).

---

### 2. Estado após delete

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **Chamada à API de delete** | CRÍTICO — AUSENTE | Na página de Transações, **handleDeleteSelected** e **handleClearAllTransactions** só chamam `deleteTransaction(id)` / `clearAllTransactions()` do **store**. Não há chamada a `transactionsService.deleteTransaction(id)`. As transações continuam no backend. |
| **Optimistic update** | PARCIAL | O store remove do estado local, mas como a API não é chamada, no próximo refresh o `useLoadData` busca da API e as “apagadas” voltam. |
| **Persistência Zustand** | OK | Store persistido em `vai-de-pix-financial`. Após refresh, `loadData()` chama `setTransactions(loadedTransactions)` e **substitui** pelo que veio da API; o problema não é reidratação do localStorage e sim o fato de a API ainda ter as transações. |
| **Reidratação antiga** | N/A | Se `loadedTransactions.length > 0`, substitui; se `length === 0`, não chama `setTransactions` e o estado anterior permanece (correto para “zero transações”). |

**Trecho problemático:**

```ts
// src/pages/Transactions.tsx, handleDeleteSelected ~276-291
const handleDeleteSelected = async () => {
  // ...
  selectedTransactions.forEach((id) => {
    deleteTransaction(id);  // apenas store local — API nunca é chamada
  });
  // ...
};
```

**Correção sugerida:**

- Chamar a API para cada transação a apagar e só então atualizar o store (ou fazer um delete em lote se o backend oferecer). Exemplo para delete em lote por id:

```ts
const handleDeleteSelected = async () => {
  if (selectedTransactions.size === 0) return;
  setIsDeleting(true);
  try {
    await Promise.all(
      Array.from(selectedTransactions).map((id) =>
        transactionsService.deleteTransaction(id)
      )
    );
    selectedTransactions.forEach((id) => deleteTransaction(id));
    setSelectedTransactions(new Set());
    toast({ title: "Transações apagadas!", ... });
  } catch {
    toast({ title: "Erro ao apagar", variant: "destructive", ... });
  } finally {
    setIsDeleting(false);
  }
};
```

- Para “apagar todas”, ou chamar delete para cada id do store (com cuidado de performance) ou implementar endpoint `DELETE /api/transactions?ids=...` e usar esse contrato no frontend.

---

### 3. Listagem e “mês atual vs mês anterior”

| Verificação | Situação | Detalhe |
|-------------|----------|---------|
| **Chamadas múltiplas à API** | OK | `useLoadData` chama uma vez `transactionsService.getTransactions()` (sem filtros). |
| **Dependências do useEffect** | OK | `[isAuthenticated, user, setTransactions, ...]`; não há loop óbvio. |
| **Mês atual** | PROBLEMA | `getTransactions()` é chamado **sem** `start_date`/`end_date`. A API devolve as últimas 50 (por `date` desc). Assim, a lista pode conter transações do mês atual e do mês anterior. A UI filtra por “mês” apenas no cliente (`dateFilter`, `selectedMonth`), mas os dados já vêm misturados. |
| **Concatenar meses sem querer** | PARCIAL | O frontend não concatena chamadas; o efeito de “dois meses juntos” vem de: 1) uma única chamada sem filtro de mês; 2) exibição dessas 50 transações; 3) filtro de mês apenas no cliente. Se o usuário escolhe “mês atual”, ainda vê apenas o subconjunto daquelas 50 que caem no mês; pode faltar transações antigas do mês se houver mais de 50 no total. |

**Trecho problemático:**

```ts
// src/hooks/use-load-data.ts
const loadedTransactions = await transactionsService.getTransactions();
// Sem start_date/end_date → API retorna últimas 50 (qualquer mês)
```

**Correção sugerida:**

- Definir “período padrão” (ex.: mês atual) e enviar na primeira carga:

```ts
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
const loadedTransactions = await transactionsService.getTransactions({
  start_date: startOfMonth.toISOString().slice(0, 10),
  end_date: endOfMonth.toISOString().slice(0, 10),
  limit: 100,
});
```

- Para “ver todos” ou outros meses, usar filtros (start_date/end_date) conforme seleção do usuário e manter paginação (skip/limit) para não trazer tudo de uma vez.

---

## PARTE 3 — PERFORMANCE

### 1. Queries e padrões

| Item | Situação | Recomendação |
|------|----------|--------------|
| **Listagem** | OK | Paginação (limit 50/100); índices em user_id e date. |
| **N+1** | ATENÇÃO | `TransactionRepository.get_by_user` usa `joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)` — evita N+1 em tags. Verificar se outras rotas que listam transações não fazem acesso lazy a relações. |
| **JOIN desnecessário** | OK | JOIN apenas para tags quando há tag_ids ou para carregar tags na resposta. |
| **Serialização** | OK | Uma lista de transações; sem serialização pesada óbvia. |
| **get_monthly_summary** | RISCO | Carrega **todas** as transações do mês em memória (sem limit) e soma em Python. Para usuários com muitos lançamentos, pode ficar pesado. Considerar agregação no banco (SUM por tipo, GROUP BY category_id). |

**Correção sugerida (resumo mensal):**

- Trocar por query de agregação, por exemplo:

```python
from sqlalchemy import func
income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
    Transaction.user_id == current_user.id,
    Transaction.deleted_at.is_(None),
    extract('year', Transaction.date) == year,
    extract('month', Transaction.date) == month,
    Transaction.type == 'income',
).scalar()
# Idem para expense; category_breakdown com group_by.
```

---

### 2. Gargalos possíveis

| Camada | Observação |
|--------|------------|
| **CPU** | Baixo; lógica simples. Maior custo em serialização JSON e possível agregação em Python no summary. |
| **Banco** | Listagem indexada; risco em `get_monthly_summary` com muitas linhas. Ledger com SUM por conta é leve. |
| **Rede** | Frontend faz várias chamadas em sequência no load (categories, accounts, transactions, goals, envelopes, shared expenses). Considerar endpoint “bootstrap” que devolva o necessário em uma resposta (ou paralelizar com Promise.all). |

---

## RESUMO — Problemas encontrados e criticidade

| # | Problema | Criticidade | Onde |
|---|----------|-------------|------|
| 1 | Delete de transações só no store; API nunca chamada → transações voltam após refresh | **CRÍTICO** | `src/pages/Transactions.tsx` (handleDeleteSelected, handleClearAllTransactions) |
| 2 | Frontend não envia Idempotency-Key → duplicidade em retry ou duplo clique | **CRÍTICO** | `src/services/transactions.service.ts` / TransactionForm |
| 3 | Listagem inicial sem start_date/end_date → últimas 50 podem ser de dois meses | **ALTO** | `src/hooks/use-load-data.ts` |
| 4 | GET /transactions/:id não filtra deleted_at (relevante se passar a usar soft delete) | **MÉDIO** | `backend/routers/transactions.py` |
| 5 | get_monthly_summary sem filtro deleted_at e carregando todas as linhas do mês | **MÉDIO** | `backend/routers/transactions.py` |
| 6 | Sem UNIQUE/deduplicação no banco para transações (mitigação adicional) | **MÉDIO** | Schema/migrations |
| 7 | Resumo mensal em Python com muitas linhas → risco de lentidão | **MÉDIO** | `backend/routers/transactions.py` get_monthly_summary |

---

## Melhorias estruturais recomendadas

1. **Delete:** Sempre chamar a API de delete e, em sucesso, atualizar o store (optimistic opcional com rollback em erro). Manter um único fluxo: “API delete → depois store”.
2. **Idempotência:** Enviar `Idempotency-Key` em todo POST de criação de transação (e retentativas) e documentar no frontend. Opcional no backend: constraint ou tabela de deduplicação por hash.
3. **Listagem:** Carregar transações já filtradas por período (ex.: mês atual) e usar start_date/end_date para outros períodos, com paginação.
4. **Resumo mensal:** Trocar “carregar todas e somar em Python” por agregação no banco (SUM, GROUP BY) e filtrar `deleted_at` em todas as queries que representem “transações ativas”.
5. **Bootstrap:** Avaliar um endpoint único de “dados iniciais” (contas, categorias, transações do mês, etc.) para reduzir round-trips e sensação de lentidão no primeiro load.
6. **Documentação:** Deixar explícito no código e no contrato da API: uso de Idempotency-Key, hard delete atual, e definição de “mês” (timezone) quando aplicável.

---

*Auditoria realizada com base no código do repositório (backend e frontend) e boas práticas de sistemas financeiros e fintech.*
