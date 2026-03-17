# Arquitetura de sincronização — VAI DE PIX

**Objetivo:** Definir modelo de dados, fonte da verdade, estratégia de conflitos e fases de migração para sair de “dados só no dispositivo” e evoluir para dados na nuvem com sync e multi-dispositivo.

**Referência:** Sprint em `docs/SPRINT-SYNC.md`. Este documento é o entregável da Story 1.1 e a referência para Backend e Frontend.

---

## 1. Entidades a sincronizar

Alinhado ao `financial-store` e aos serviços existentes no frontend:

| Entidade | Descrição | Observação |
|----------|-----------|------------|
| **Transações** | Receitas e despesas (id, date, account, category, description, amount, type, tags, etc.) | Já existe API de transações; associar a `user_id`. |
| **Contas** | Contas bancárias, dinheiro, cartão, etc. (id, name, type, balance, currency, color) | API de contas; persistir por usuário. |
| **Categorias** | Categorias de receita/despesa (id, name, type, icon, color) | Podem ser globais ou por usuário; definir no backend. |
| **Envelopes (caixinhas)** | Envelopes de orçamento (id, name, balance, targetAmount, color, description) | Persistir por usuário. |
| **Metas** | Metas financeiras (id, name, targetAmount, currentAmount, period, dueDate, status) | Persistir por usuário. |
| **Despesas compartilhadas** | Despesas divididas entre pessoas (já possui fluxo próprio no backend) | Manter contrato atual; incluir no snapshot/sync quando aplicável. |

Todas as entidades devem ter, no servidor, pelo menos:

- `id` (UUID ou string estável)
- `user_id` (ou equivalente) para isolamento
- `updated_at` (ISO 8601) para ordenação e resolução de conflitos

---

## 2. Fonte da verdade

- **Servidor:** fonte da verdade para todas as entidades listadas. Qualquer dado “oficial” é o que está persistido no backend associado ao usuário autenticado.
- **Cliente:** mantém um **cache local** (ex.: Zustand persistido ou IndexedDB) para:
  - Exibir dados rapidamente ao abrir a app.
  - Permitir uso offline limitado (Fase 3), com fila de mudanças a enviar quando online.

Regra: em caso de divergência entre cache local e servidor, o servidor prevalece após sync (exceto quando a estratégia de conflitos definir o contrário para um caso específico).

---

## 3. Estratégia de conflitos

- **Padrão:** **last-write-wins (LWW)** por recurso: a versão com `updated_at` mais recente vence.
  - Ao receber dados do servidor (pull), o cliente substitui o cache local para aqueles recursos cujo `updated_at` do servidor seja ≥ ao local (ou sempre substituir no primeiro pull da sessão).
  - Ao enviar mudanças (push), o servidor aceita a atualização se o `updated_at` enviado for ≥ ao que está armazenado (ou ignorar conflito e sempre aceitar no primeiro MVP, documentando o risco).
- **Merge por lista:** para listas (ex.: transações), não fazer merge campo a campo; tratar cada item como um recurso com seu próprio `id` e `updated_at`. Itens novos do servidor são adicionados ao cache; itens removidos no servidor devem ser removidos do cache na próxima sync.
- **Conflito explícito (opcional, fases futuras):** se o servidor detectar que o cliente enviou uma versão antiga (ex.: `updated_at` do cliente &lt; `updated_at` do servidor), pode retornar `409 Conflict` com o estado atual do recurso; o cliente então atualiza o cache e pode informar o usuário (“este dado foi alterado em outro dispositivo”).

Resumo: **LWW por recurso com `updated_at`**; primeira entrega pode aceitar sempre o push do cliente e sobrescrever no servidor (simplificado), evoluindo depois para 409 em conflito real.

---

## 4. Fases de migração

### Fase 1 — Backup e restore via API (primeira entrega recomendada)

- **Backend:** Endpoints para exportar e importar um **snapshot completo** do usuário:
  - `GET /me/data` (ou `GET /api/v1/me/data`): retorna JSON com transações, contas, categorias, envelopes, metas (e despesas compartilhadas se fizer sentido) do usuário autenticado. Retornar `404` ou `{ "transactions": [], ... }` se não houver dados.
  - `POST /me/data` ou `PUT /me/data`: recebe o mesmo formato e **substitui** ou **mescla** o estado do usuário no servidor (escolher uma política e documentar). Autenticação obrigatória; ignorar qualquer `user_id` vindo no body (usar o do token).
- **Frontend:** Na inicialização (após login), chamar `GET /me/data`. Se houver dados, popular os stores (substituindo o estado local). Ao criar/editar/excluir entidades, além de atualizar o store local, chamar os endpoints existentes (ou um único `POST /me/data` periódico) para persistir no servidor. Opcional: botão “Fazer backup na nuvem” que chama `POST /me/data` com o estado atual.
- **Decisão:** Fase 1 = **backup/restore em snapshot completo**. Sem sync incremental ainda; sem fila offline. Objetivo: dados não ficam só no dispositivo; usuário pode restaurar em outro dispositivo ou após limpar dados locais.

### Fase 2 — Sync contínuo (pull ao abrir, push ao editar)

- **Backend:** Endpoint de sync incremental, ex.: `GET /me/sync?since=<timestamp>` retorna apenas entidades com `updated_at` &gt; `since` (transações, contas, categorias, envelopes, metas). Opcional: `POST /me/sync` recebendo lista de criações/atualizações e aplicando em lote (com LWW).
- **Frontend:** Ao abrir a app (ou ao voltar para a aba), fazer pull com `since=<último updated_at conhecido>`. Ao criar/editar/remover, fazer push imediato (POST/PUT/DELETE nos recursos ou via `POST /me/sync`). Manter cache local atualizado com as respostas do servidor.
- **Objetivo:** Multi-dispositivo: alterações feitas em um dispositivo aparecem no outro após abrir a app ou receber atualizações.

### Fase 3 — Offline-first com fila

- **Frontend:** Quando offline, enfileirar criações/edições/remoções em uma fila local (ex.: IndexedDB ou store persistido). Ao voltar online, enviar a fila em ordem (ou em lote) e processar respostas (atualizar cache, tratar 409 se houver).
- **Backend:** Pode permanecer igual à Fase 2; opcionalmente aceitar batch em `POST /me/sync` e retornar lista de conflitos por recurso.
- **Objetivo:** Usuário pode usar a app offline e as mudanças são enviadas quando a conexão voltar.

---

## 5. Contrato de API (resumo para Backend)

- **Autenticação:** Todos os endpoints de dados do usuário exigem token (JWT) válido. O `user_id` é sempre derivado do token, nunca aceito no body.
- **Snapshot (Fase 1):**
  - `GET /me/data` → `200` + JSON `{ "transactions": [...], "accounts": [...], "categories": [...], "envelopes": [...], "goals": [...], "sharedExpenses": [...] }`. Sempre `200`; listas vazias quando não houver dados.
  - `POST /me/data` ou `PUT /me/data` → body no mesmo formato; servidor persiste/atualiza por usuário. **Política implementada:** merge por id (upsert). Contas, categorias, envelopes e metas são criados/atualizados; transações e despesas compartilhadas não são alteradas por este endpoint (Fase 1). Retorna `200` + estado atual (snapshot). Validação e sanitização obrigatórias; `user_id` somente do token.
- **Sync incremental (Fase 2 — implementado):**
  - `GET /me/sync?since=<ISO8601>` → `200` + mesmo formato do GET /me/data, apenas itens com `COALESCE(updated_at, created_at) > since`. Parâmetro `since` obrigatório (ISO8601); `since` inválido → `400` com mensagem clara. O front pode mesclar as listas no cache local.
  - `POST /me/sync` → body no mesmo formato de POST /me/data (merge por id); servidor aplica e retorna `200` + snapshot completo (estado atual após o merge). Permite push em lote no fluxo incremental.
- **Versionamento:** Cada recurso deve ter `updated_at` (e opcionalmente `version` numérico) para LWW e sync.

---

## 6. Contrato de dados (resumo para Frontend)

- **Carregar estado inicial:** Após login, chamar `GET /me/data`. Sempre retorna `200`; se houver dados, popular `financial-store` (e demais) com o snapshot; se listas vazias, manter estado local (comportamento atual).
- **Persistir mudanças:** Ao criar/editar/remover transação, conta, envelope, meta (e onde aplicável), chamar o endpoint REST correspondente (ou `POST /me/data` / `POST /me/sync` conforme contrato). Em caso de erro de rede, exibir toast ou marcar “pendente de sync” (Fase 3: enfileirar).
- **Indicador de sync:** Expor estado: `synced` | `syncing` | `offline` | `error` e exibir na UI (ex.: ícone no header).

---

## 7. Decisão registrada

- **Primeira entrega:** Implementar **Fase 1** (backup/restore via API) como escopo mínimo. Backend expõe `GET /me/data` e `POST /me/data` (ou `PUT /me/data`); Frontend carrega ao iniciar e envia mudanças via APIs existentes ou via snapshot. Fases 2 e 3 ficam para iterações seguintes.
- **Aprovação:** Este documento deve ser aprovado por Backend e Frontend antes de implementar; ajustes finos (nomes de endpoints, formato exato do JSON) podem ser refinados em PR.

---

## 8. Referências no código (frontend)

| Camada | Arquivo(s) |
|--------|------------|
| Store (modelo local) | `src/stores/financial-store.ts` (Transaction, Account, Category, Goal, Envelope, SharedExpense) |
| Serviços API | `src/services/transactions.service.ts`, `accounts.service.ts`, `categories.service.ts`, `envelopes.service.ts`, `goals.service.ts` |
| Auth | `src/stores/auth-store-index.ts`, `src/lib/http-client.ts` |
| Endpoints me/data | `src/lib/api.ts` — `meData.get`, `meData.post`, `meData.put` (base path `/me/data`) |
| Endpoints me/sync | `src/lib/api.ts` — `meSync.get` (query `since=<ISO8601>`), `meSync.post` (sync incremental) |
| Serviço me-data | `src/services/me-data.service.ts` — getMeData, applyMeDataToStores, loadInitialDataFromMeData |
| Carregamento pós-login | `src/hooks/use-load-data.ts` — chama loadInitialDataFromMeData após auth pronto; atualiza sync-store (syncing/synced/error) |
| Estado de sync | `src/stores/sync-store.ts` — status e setError/setSynced usados nas mutações e no load |
| Indicador de sync | `src/components/SyncIndicator.tsx` — ícone no header; `MainLayout` escuta online/offline |

---

## 9. Implementado — Fase 1 (Backend + Frontend API)

### Backend

- **Router:** `backend/routers/me_data.py` (prefixo `/api` → endpoints em `/api/me/data`).
- **GET /api/me/data:** Sempre `200`. Snapshot do usuário autenticado: transações (limite 10k), contas, categorias, envelopes, metas, despesas compartilhadas (read-model). Listas vazias quando não houver dados.
- **POST /api/me/data e PUT /api/me/data:** Recebem o mesmo formato. Política: **merge por id (upsert)**. Persistem apenas **contas, categorias, envelopes e metas**. Transações e despesas compartilhadas **não** são alteradas por este endpoint na Fase 1. Retornam `200` e o estado atual (snapshot).
- **Serviço:** `backend/services/me_data_service.py`
  - `get_snapshot(db, current_user)` — monta o snapshot a partir dos repositórios/serviços existentes.
  - `apply_snapshot_merge(db, user_id, body)` — validação/sanitização (strings com trim e limite; tipos/enums validados; `user_id` só do token). Limites: 200 contas, 500 categorias, 200 envelopes, 200 metas. Upsert por id (id do body mantido para consistência com o cliente).

### Frontend

- **API:** `src/lib/api.ts` — `meData: { get: "/me/data", post: "/me/data", put: "/me/data" }` para uso com o `httpClient`.

#### Story 3.1 — Carregar estado inicial (implementado)

- **Serviço:** `src/services/me-data.service.ts`
  - `getMeData()` — chama `GET /api/me/data` e retorna snapshot tipado (`MeDataSnapshot`).
  - `applyMeDataToStores(data)` — mapeia a resposta para o formato dos stores e chama os setters: transações (account_id/category_id → account/category; amount com sinal para expense); contas (tipo API → tipo store: bank/card/cash/refeicao/alimentacao); categorias, envelopes (já em centavos), metas (target_date → dueDate, status ativo → on_track); shared expenses via `mapReadItemToStore` do sync-engine.
  - `loadInitialDataFromMeData()` — executa `getMeData()` e em seguida `applyMeDataToStores(data)`. Em erro, não altera os stores e propaga a exceção.
- **Sync-engine:** `src/lib/shared-expenses-sync-engine.ts` — `mapReadItemToStore` exportada para uso pelo me-data ao popular `sharedExpenses` a partir do array de `/me/data`.
- **Hook:** `src/hooks/use-load-data.ts` — pós-login: em vez de várias chamadas separadas, chama apenas `loadInitialDataFromMeData()` após `waitUntilAuthReady()` e usuário autenticado. Antes do GET chama `setSyncing()`; no sucesso `setSynced()`; no catch `setError(msg)`. Em falha (rede, 401, etc.) o store não é alterado e o erro não quebra a UI (tratamento silencioso). `reload()` também usa `loadInitialDataFromMeData()` para manter a mesma fonte de verdade.
- **Fluxo:** login → auth pronto → uma requisição `GET /api/me/data` → resposta mapeada e aplicada aos stores (transactions, accounts, categories, envelopes, goals, sharedExpenses). Recarregar manualmente chama a mesma função novamente.

#### Story 3.2 — Enviar mudanças para o servidor (implementado)

- **Estratégia:** Usar os **endpoints REST existentes** por entidade (não POST /me/data para cada mutação). Ao criar/editar/remover, a UI chama o serviço correspondente e, em sucesso, atualiza o store e marca sync como `synced`; em falha, marca `error` e exibe toast.
- **Onde foi integrado:**
  - **Transações:** criação já via `transactionsService.createTransaction` (transaction.controller); exclusão (lote e seleção) via `transactionsService.deleteTransactions` — em erro: `useSyncStore.setError` + toast.
  - **Contas:** criação em Settings via `accountsService.createAccount` e `setAccounts([...accounts, created])`; exclusão já via `accountsService.deleteAccount` + `setAccounts(loaded)`. Erro: setError + toast.
  - **Categorias:** criação em Settings via `categoriesService.createCategory` e `setCategories([...categories, created])`. Erro: setError + toast.
  - **Envelopes:** criação (EnvelopeForm) e exclusão (Envelopes) já chamam a API; **transferência entre caixinhas** passou a chamar `envelopesService.withdrawValueFromEnvelope` + `addValueToEnvelope` e só então `transferBetweenEnvelopes`. Adição/retirada de valor (EnvelopeValueForm) já via API. Em todos os erros: setError + toast.
  - **Metas:** criação (GoalForm), exclusão (Goals) e adicionar valor (AddGoalValueForm) já chamam a API. Em erro: setError + toast.
- **Store de sync:** `src/stores/sync-store.ts` — estado `idle` | `syncing` | `synced` | `error` | `offline`; ações `setSyncing`, `setSynced`, `setError(msg)`, `setOffline`, `setOnline`, `clearError`. Em sucesso de mutação: `setSynced()`; em catch: `setError(mensagem)` e toast.

#### Story 3.3 — Indicador de sync na UI (implementado)

- **Componente:** `src/components/SyncIndicator.tsx` — lê `useSyncStore` e exibe no header: Check (sincronizado / dados locais), Loader2 animado (sincronizando), AlertCircle vermelho com tooltip em `lastError` (erro), WifiOff (sem conexão).
- **Posição:** Header do `MainLayout`, ao lado do sino de notificações. Em `MainLayout`, um `useEffect` escuta `window` `online`/`offline` e chama `setOffline()`/`setOnline()` para o indicador refletir falta de conexão.

### Decisões técnicas

- **Segurança:** Autenticação via `get_current_user`; `user_id` só do token; body validado e sanitizado; limites por lista.
- **Performance:** GET agrega em uma única viagem; transações limitadas a 10k no snapshot.
- **Fase 1:** Transações e despesas compartilhadas continuam sendo alteradas apenas pelos endpoints próprios; inclusão no POST/PUT do snapshot pode ser feita em iteração posterior (com cuidado com ledger e FKs).

### Sync incremental — Story 2.3 (implementado)

- **Backend — Serviço:** `backend/services/me_data_service.py`
  - `get_sync_delta(db, current_user, since)` — retorna só entidades com `COALESCE(updated_at, created_at) > since`: transações (sem soft delete), contas ativas, categorias, envelopes, metas (com `progress_percentage` quando aplicável). Despesas compartilhadas: read-model completo com filtro em Python por `updated_at`/`created_at` do item. Uso de `func.coalesce(updated_at, created_at)` nas queries para incluir registros só com `created_at`.
- **Backend — Router:** `backend/routers/me_data.py`
  - **GET /api/me/sync?since=&lt;ISO8601&gt;** — `since` obrigatório (ex.: 2024-01-15T10:00:00Z). Resposta no mesmo formato do GET /me/data (só itens alterados após `since`). `since` inválido → `400` com mensagem clara.
  - **POST /api/me/sync** — mesmo body e política de POST /me/data (merge por id). Retorna `200` + snapshot completo (estado atual após o merge).
- **Frontend:** `src/lib/api.ts` — `meSync: { get: "/me/sync", post: "/me/sync" }` para uso com o httpClient. Exemplo de pull incremental: `GET /me/sync?since=${lastSyncAt.toISOString()}` e mesclar as listas no cache local (ex.: ao abrir a app).
- **Decisões:** `since` em ISO8601; comparação via `COALESCE(updated_at, created_at)` para tratar registros sem `updated_at`. Formato igual ao GET /me/data para o cliente reutilizar a mesma lógica de merge. POST /me/sync com mesmo contrato de POST /me/data para push em lote. Shared expenses: delta obtido filtrando o read-model por `updated_at`/`created_at` do item (evita alterar o serviço de shared expenses).

### Próximos passos (sprint)

Conforme `docs/SPRINT-SYNC.md`: **Sprint de sync concluída.** Stories 2.1, 2.2, 2.3, 5.1 (Code Review), 5.2 (QA multi-dispositivo/sessão) e 5.3 (documentação e aceite final) concluídas. Deploy aprovado. Escopo entregue: Fase 1 + sync incremental.

---

*Documento criado para a Sprint de Sincronização. Atualizar conforme decisões de implementação (ex.: nomes finais de endpoints e formato do payload).*
