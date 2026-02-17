# Arquitetura GOD MODE — Despesas Compartilhadas

## 1. Arquitetura final (alvo)

### Visão geral

- **Backend** = única fonte de verdade.
- **Store frontend** = projeção sincronizada do backend (cache local com persist).
- **Read Model** = endpoint otimizado para dashboard (totais + lista).
- **Sync** = REST inicial + (futuro) realtime/SSE + fallback polling.
- **Offline** = cache do último read-model + fila de ações pendentes (fase futura).

### Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                        │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  UI (pages) │   │ Sync Engine      │   │ financial-store │  │
│  │             │◄──│ (read-model →    │──►│ (projeção)      │  │
│  │             │   │  setSharedExpenses)   │ + persist       │  │
│  └─────────────┘   └────────┬─────────┘   └─────────────────┘  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ GET /shared-expenses/read-model
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND                                                         │
│  ┌──────────────────┐   ┌─────────────────┐   ┌──────────────┐ │
│  │ GET /read-model  │   │ SharedExpense   │   │ ExpenseShare │ │
│  │ (Read Model API) │◄──│ Service         │◄──│ Repository   │ │
│  └──────────────────┘   └────────┬────────┘   └──────┬───────┘ │
│                                   │                    │         │
│                                   ▼                    ▼         │
│                          ┌────────────────────────────────────┐ │
│                          │ DB: shared_expenses, expense_shares │ │
│                          └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Event Layer (fase futura)

- Domínio emite: `ExpenseCreated`, `ShareInvited`, `ShareAccepted`, `ShareRejected`, `ExpenseUpdated`.
- Persistência em tabela de eventos ou log estruturado; opcionalmente publicar em event bus.
- Realtime envia ao front: `expense_created`, `share_accepted`, `share_rejected`, `expense_updated`.

### Sync Layer

- **REST Sync inicial**: ao carregar dados (useLoadData) ou ao aceitar/criar, se GOD MODE ativo → `GET /read-model` → `setSharedExpenses`.
- **Realtime (futuro)**: WebSocket/SSE; ao receber evento → atualização incremental no store.
- **Fallback polling (futuro)**: intervalo configurável quando realtime não estiver disponível.

### Read Model Layer

- **GET /shared-expenses/read-model**: retorna `{ expenses[], totals, last_updated }`.
- Despesas onde o usuário é criador OU possui share com status `accepted`.
- Totais: total_count, settled_count, pending_count, cancelled_count, total_value.

### Front Projection Layer

- Store = projeção; nunca fonte primária quando GOD MODE ativo.
- Persist = cache offline; ao voltar online, sync sobrescreve.

---

## 2. Plano de migração incremental

| Etapa | Descrição | Estado |
|-------|-----------|--------|
| **1** | Criar GET /read-model; front continua usando store local | ✅ Feito |
| **2** | Front faz sync em background quando flag ativa; dashboard usa dados sincronizados | ✅ Feito |
| **3** | Após criar/aceitar, disparar sync para atualizar dashboard sem refresh | ✅ Feito |
| **4** | Realtime (WebSocket/SSE) opcional | Pendente |
| **5** | Offline-first: fila de ações + reconciliação | Pendente |
| **6** | Observabilidade: SYNC_START/SUCCESS/FAIL, REALTIME_* | Parcial (logs no console) |

---

## 3. Código backend (Fase 1)

- **Schemas** (`backend/schemas.py`): `SharedExpenseParticipantReadSchema`, `SharedExpenseItemReadSchema`, `SharedExpensesTotalsReadSchema`, `SharedExpensesReadModelSchema`.
- **Repository** (`backend/repositories/shared_expense_repository.py`): `list_for_user_read_model(user_id)` — despesas onde usuário é criador OU tem share aceito.
- **Service** (`backend/services/shared_expense_service.py`): `get_read_model(db, current_user)` — monta read model com totais e last_updated.
- **Router** (`backend/routers/shared_expenses.py`): `GET /read-model` — chama `get_read_model`; rota registrada **antes** de `/{expense_id}/full-details` para não capturar `read-model` como id.

Nenhum endpoint existente foi alterado ou removido.

---

## 4. Código frontend (Sync Engine)

- **API** (`src/lib/api.ts`): `sharedExpenses.readModel`.
- **sharedExpenseApi** (`src/services/sharedExpenseApi.ts`): tipos read-model + `getReadModel()`.
- **shared-expenses-sync-engine** (`src/lib/shared-expenses-sync-engine.ts`):
  - `syncSharedExpensesFromBackend()`: GET read-model → mapeia para `SharedExpense[]` → `setSharedExpenses(expenses)`.
  - `isSharedExpensesGodModeEnabled()`: flag via `VITE_SHARED_EXPENSES_GOD_MODE` ou `localStorage.shared_expenses_god_mode_enabled`.
  - `setSharedExpensesGodModeEnabled(enabled)`: rollback por usuário.
- **financial-store**: nova action `setSharedExpenses(expenses)` (apenas adiciona; não remove nenhuma action existente).
- **useLoadData**: se GOD MODE ativo, após carregar categorias/contas/transações/metas/envelopes, chama `syncSharedExpensesFromBackend()`.
- **shared-expenses-store**: após `respondToShare` e após `createExpense` com sucesso, se GOD MODE ativo, chama `syncSharedExpensesFromBackend()`.

---

## 5. Estratégia realtime (fase futura)

- **Opção A**: WebSocket (ex.: canal `activity_feed_ws` ou dedicado `shared_expenses_ws`). Backend emite evento ao criar despesa, aceitar/recusar share; front subscreve e aplica atualização incremental no store.
- **Opção B**: SSE (Server-Sent Events). Endpoint `GET /shared-expenses/stream` que envia eventos `expense_created`, `share_accepted`, etc.; front escuta e chama `syncSharedExpensesFromBackend()` ou aplica patch.
- **Recomendação**: começar com re-sync completo após cada evento (chamar `syncSharedExpensesFromBackend()`); depois evoluir para patch incremental se necessário.

---

## 6. Estratégia offline-first (fase futura)

- **Persist** armazena: último read-model (ou snapshot), timestamp do sync, opcionalmente fila de ações pendentes (ex.: “aceitar share” quando offline).
- **Reconciliação**: server vence; conflitos podem ser logados para UX futura (ex.: “esta despesa foi alterada em outro dispositivo”).
- **Sync ao voltar online**: detectar conectividade e rodar `syncSharedExpensesFromBackend()`; esvaziar fila enviando ações para a API e depois re-sync.

---

## 7. Rollback

- **Feature flag**: `shared_expenses_god_mode_enabled` (localStorage) ou `VITE_SHARED_EXPENSES_GOD_MODE` (env). Se desativado, sync não roda; dashboard continua usando apenas store local/persist como antes.
- **Backend**: GET /read-model é aditivo; remover a rota ou desligar por flag no backend reverte ao comportamento anterior sem alterar outros endpoints.
- **Frontend**: não remover `setSharedExpenses` nem o sync engine; basta desligar a flag para voltar ao modo antigo.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|-------|------------|
| Read-model lento com muitas despesas | Paginação ou limite no backend; índice em (user_id, status) em expense_shares |
| Cache desatualizado entre abas | Realtime ou polling; ou single-tab (documentar limitação) |
| Conflito entre persist e API | GOD MODE: sempre sobrescrever store com resposta do read-model após sync |
| Regressão em fluxos atuais | Flag desligada por padrão; testes manuais e automatizados com flag on/off |

---

## 9. Testes recomendados

- **Backend**: GET /shared-expenses/read-model com usuário criador, usuário com share aceito, usuário sem despesas; validar totais e last_updated.
- **Frontend (flag off)**: criar/aceitar despesa; dashboard não deve depender de read-model (comportamento atual).
- **Frontend (flag on)**: após login, dashboard deve refletir read-model; após aceitar share, lista deve atualizar sem refresh; após criar despesa, lista deve incluir a nova.
- **Rollback**: ativar GOD MODE, depois desativar; dashboard volta a usar apenas dados locais sem erro.

---

## Como ativar GOD MODE

1. **Por ambiente**: `VITE_SHARED_EXPENSES_GOD_MODE=true` no build (ex.: Vercel env).
2. **Por usuário (dev)**: no console do navegador:  
   `localStorage.setItem('shared_expenses_god_mode_enabled', 'true');`  
   depois recarregar a página.
3. **Desativar**: `localStorage.removeItem('shared_expenses_god_mode_enabled');` ou env = false.
