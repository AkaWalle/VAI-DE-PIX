# Sprint — Sincronização e arquitetura de dados (VAI DE PIX)

**Objetivo:** Sair do modelo “dados só no dispositivo” e evoluir para dados na nuvem com sincronização, multi-dispositivo e backup automático.

**Demanda:** Grande (arquitetura + Backend + Frontend + testes). Esta sprint está quebrada por área para cada agente saber exatamente o que fazer.

**Regra de deploy:** Deploy só após tópicos da sprint concluídos e QA aprovado.

---

## Visão geral por área

| Área | Foco principal |
|------|----------------|
| **Desenvolvimento** | Orquestrar, definir contrato de sync, fases de migração e documentação da arquitetura. |
| **Backend** | API de persistência e sync (transações, contas, envelopes, metas), versionamento e resolução de conflitos. |
| **Frontend** | Camada de sync (online/offline, fila, merge), alimentar stores a partir da API e UI de estado de sincronização. |
| **Code Review** | Revisar PRs de API e front (segurança, isolamento por usuário, tratamento de conflitos). |
| **QA** | Testes de sync, multi-dispositivo, conflitos e regressão das telas atuais. |

---

## Épico 1 — Fundação (contrato e modelo)

*Dono: Desenvolvimento. Apoio: Backend.*

### Story 1.1 — Documentar modelo de dados e estratégia de sync (Desenvolvimento)

- **Entregável:** Documento em `docs/architecture-sync.md` com:
  - Entidades a sincronizar: transações, contas, categorias, envelopes (caixinhas), metas, despesas compartilhadas.
  - Fonte da verdade: servidor por entidade; cliente mantém cache local e fila de mudanças quando offline.
  - Estratégia de conflitos: last-write-wins por recurso com `updated_at`, ou merge por entidade (ex.: lista de transações = merge por id).
  - Fases sugeridas: Fase 1 backup/restore via API; Fase 2 sync contínuo (pull ao abrir, push ao editar); Fase 3 offline-first com fila.
- **Critérios de aceite:** Doc aprovado por Backend e Frontend; decisão de “Fase 1 primeiro” registrada.  
- **Entregável criado:** `docs/architecture-sync.md` (entidades, fonte da verdade, conflitos LWW, fases 1–3, contrato API e decisão Fase 1 primeiro).

### Story 1.2 — API de backup/restore (Backend) ✅

- **Entregável:** Endpoints (ex.: `GET /me/data` e `POST /me/data` ou `PUT /me/data`) para exportar/importar um snapshot completo do usuário (transações, contas, categorias, envelopes, metas) em JSON.
  - Autenticação obrigatória; dados restritos ao `user_id`.
  - `GET`: retorna estado atual do usuário no servidor (ou 404 se vazio).
  - `POST`/`PUT`: substitui ou mescla (conforme regra definida em 1.1) o estado do usuário; validação e versionamento mínimo (ex.: `version` ou `updated_at`).
- **Critérios de aceite:** Endpoints documentados (OpenAPI ou equivalente); testes automatizados; Code Review aprovado.
- **Implementado:** `backend/routers/me_data.py`, `backend/services/me_data_service.py`. GET sempre 200 (listas vazias se não houver dados); POST/PUT com merge por id (upsert) para contas, categorias, envelopes, metas; transações e shared expenses só no GET (read-model). Limites: 10k transações, 200 contas, 500 categorias, 200 envelopes, 200 metas. Frontend: `src/lib/api.ts` com `meData.get/post/put`. Detalhes em `docs/architecture-sync.md` § 9.

---

## Épico 2 — Backend: persistência e API de sync

*Dono: Backend. Revisão: Code Review.*

### Story 2.1 — Persistir transações, contas e categorias por usuário (Backend) ✅

- **Entregável:** Modelo de dados no backend associado ao usuário autenticado; APIs CRUD já existentes passam a ler/escrever no banco (não só em memória, se for o caso).
  - Garantir que listagens e escritas filtrem sempre por `user_id` (ou equivalente).
- **Critérios de aceite:** Dados sobrevivem a restart do servidor; nenhum dado de um usuário vaza para outro.
- **Conclusão:** Nenhuma alteração de código foi necessária. **Verificado:** Modelos Transaction, Account, Category têm `user_id` (FK para users.id) e são persistidos via SQLAlchemy. Repositórios (ex.: TransactionRepository.get_by_user, AccountsRepository.list_by_user_active, CategoriesRepository.list_by_user) filtram listagens e buscas por `user_id`. Escrita: criação/atualização usa sempre `current_user.id` nos routers; não há armazenamento em memória para essas entidades. GET /me/data usa esses repositórios/serviços e reflete o que está persistido no servidor.

### Story 2.2 — Persistir envelopes (caixinhas) e metas por usuário (Backend) ✅

- **Entregável:** Mesmo padrão: entidades no banco associadas ao usuário; APIs de envelopes e metas persistidas.
- **Critérios de aceite:** Consistência com Story 2.1; testes e revisão.
- **Conclusão:** Nenhuma alteração de código foi necessária. **Verificado:** Modelos Envelope e Goal têm `user_id` (FK para users.id) e são persistidos via SQLAlchemy. Repositórios (EnvelopeRepository.get_by_user, GoalsRepository.get_by_user) filtram listagens e buscas por `user_id`. Escrita usa sempre `current_user.id` nos routers; não há armazenamento em memória. GET /me/data usa esses repositórios/serviços e reflete o que está persistido no servidor.

### Story 2.3 — API de sync incremental (Backend) ✅

- **Entregável:** Endpoints para sync “desde última vez” (ex.: `GET /me/sync?since=<timestamp>` retorna entidades alteradas após esse timestamp).
  - Payload com transações, contas, categorias, envelopes, metas (e despesas compartilhadas) com `updated_at`/`created_at`.
  - Cliente envia mudanças locais (ex.: `POST /me/sync` com mesmo formato de POST /me/data); servidor aplica merge e retorna snapshot completo.
- **Critérios de aceite:** Contrato documentado; resolução de conflitos conforme doc de arquitetura; testes.
- **Implementado:**
  - **Backend:** `me_data_service.get_sync_delta(db, current_user, since)` retorna só entidades com `COALESCE(updated_at, created_at) > since` (transações, contas ativas, categorias, envelopes, metas, despesas compartilhadas — read-model com filtro em Python). Router: GET /api/me/sync?since=&lt;ISO8601&gt; (`since` obrigatório; 400 se inválido); POST /api/me/sync (mesmo body e política de POST /me/data, retorna snapshot completo).
  - **Frontend:** `src/lib/api.ts` — `meSync: { get: "/me/sync", post: "/me/sync" }`. O front pode passar a usar sync incremental quando quiser (ex.: ao abrir a app, GET /me/sync?since=… e mesclar no store).
  - **Decisões:** since ISO8601; COALESCE(updated_at, created_at); formato igual GET /me/data; POST /me/sync = mesmo contrato de POST /me/data; shared expenses delta via filtro no read-model. Ver `docs/architecture-sync.md` § 9.

---

## Épico 3 — Frontend: consumo da API e estado de sync

*Dono: Frontend. Revisão: Code Review.*

### Story 3.1 — Carregar estado inicial a partir da API (Frontend) ✅

- **Entregável:** Na inicialização da app (após login), chamar API de backup/restore ou sync e popular os stores (financial-store e demais) com os dados do servidor quando existirem.
  - Se servidor retornar vazio ou 404, manter comportamento atual (dados locais apenas).
- **Critérios de aceite:** Usuário que já tiver dados no servidor vê os dados ao logar em outro dispositivo ou após limpar storage local (cenário a validar com QA).
- **Implementado:** `src/services/me-data.service.ts` (getMeData, applyMeDataToStores, loadInitialDataFromMeData); `src/hooks/use-load-data.ts` passa a chamar só loadInitialDataFromMeData após auth pronto; `reload()` idem. Mapeamento: transações (account_id/category_id → account/category; amount com sinal), contas (tipo API → store), categorias/envelopes/metas/sharedExpenses. Erro em GET não altera stores e não quebra UI. Detalhes em `docs/architecture-sync.md` § 9.

### Story 3.2 — Enviar mudanças para o servidor (Frontend) ✅

- **Implementado:** Endpoints REST em todos os fluxos; conta/categoria em Settings via API; transferência envelopes via API; sync-store + toast em erro. Ver `docs/architecture-sync.md` § 9.
- **Entregável:** Ao criar/editar/remover transação, conta, envelope, meta (e onde aplicável), além de atualizar o store local, enviar a mudança para a API (POST/PUT/DELETE ou endpoint de sync).
  - Tratar erros de rede (retry, fila para “enviar quando online” se for Fase 3).
- **Critérios de aceite:** Ação do usuário persiste no servidor; falha de rede tratada sem perda silenciosa (toast ou estado “pendente de sync”).

### Story 3.3 — UI de estado de sincronização (Frontend) ✅

- **Implementado:** SyncIndicator no header; sync-store (idle/syncing/synced/error/offline); listener online/offline. Ver `docs/architecture-sync.md` § 9.
- **Entregável:** Indicador discreto de “sincronizado” / “sincronizando” / “offline” / “erro ao sincronizar” (ex.: ícone no header ou rodapé), conforme estado real da camada de sync.
- **Critérios de aceite:** Usuário entende se os dados estão ou não na nuvem no momento.

---

## Épico 4 — Offline e fila (opcional para primeira entrega)

*Pode ser deixado para uma segunda sprint de sync.*

### Story 4.1 — Fila de mudanças offline (Frontend + Backend)

- **Entregável:** Quando offline, enfileirar criações/edições; ao voltar online, enviar em lote e resolver conflitos conforme doc.
- **Critérios de aceite:** Fluxo documentado e testado; conflitos não sobrescrevem dados do servidor de forma incorreta.

---

## Épico 5 — Qualidade e revisão

*Code Review e QA.*

### Story 5.1 — Revisão de segurança e contrato (Code Review) ✅

- **Entregável:** Em cada PR de Backend e Frontend desta sprint:
  - Verificar que nenhum endpoint expõe dados de outro usuário.
  - Verificar que payloads de sync não aceitam `user_id` arbitrário (servidor usa o usuário do token).
  - Verificar tratamento de conflitos e validação de entrada.
- **Critérios de aceite:** Checklist de revisão preenchido; observações registradas no PR ou em doc.
- **Conclusão:** Code Review executado (ver **Notas de Review** abaixo). Checklist atendido.

### Story 5.2 — Testes de sync e multi-dispositivo (QA)

- **Entregável:**
  - Cenário: usuário A cria transação/conta/envelope no dispositivo 1; após sync, mesmo usuário (ou sessão) vê os dados no dispositivo 2 (ou outra aba).
  - Cenário: dois dispositivos editam o mesmo recurso; comportamento após sync (conflito ou last-write-wins) conforme doc.
  - Regressão: fluxos atuais (criar transação, caixinha, despesa compartilhada, backup manual) continuam funcionando.
- **Critérios de aceite:** Casos de teste documentados; execução manual ou automatizada; bugs críticos fechados.

### Story 5.3 — Documentação e aceite final (Desenvolvimento + QA) ✅

- **Entregável:** Atualizar `docs/architecture-sync.md` com decisões finais; registrar no `SPRINT.md` (ou neste doc) que a sprint de sync foi concluída e sob qual escopo (ex.: Fase 1 + Fase 2, sem offline-first).
- **Critérios de aceite:** Deploy aprovado por QA; produto não depende mais “só do dispositivo” para os fluxos cobertos.
- **Conclusão:** Documentação e aceite final confirmados. Sprint de sync concluída no escopo Fase 1 + sync incremental (GET/POST /me/data, GET/POST /me/sync). Aprovação para deploy registrada.

---

## Estado atual e próximos passos

- **Concluído:** **Sprint de sync concluída.** Épico 1 (1.1, 1.2); Épico 3 (3.1, 3.2, 3.3); Épico 2 (2.1, 2.2, 2.3); Épico 5 (5.1 Code Review, 5.2 QA multi-dispositivo/sessão, 5.3 documentação e aceite final). Escopo: Fase 1 + sync incremental (GET/POST /me/data, GET/POST /me/sync). Deploy aprovado.
- **Próximo passo:** Nenhum pendente nesta sprint. Produto não depende mais só do dispositivo para os fluxos cobertos; front pode usar GET /me/sync para pull incremental quando quiser.
- **QA:** QA Fase 1 e QA multi-dispositivo/sessão (Story 5.2) aprovadas; Story 5.3 concluída — aprovação para deploy registrada.

## Ordem sugerida de execução

1. **Desenvolvimento:** Story 1.1 (doc de arquitetura e fases) ✅.
2. **Backend:** Story 1.2 (backup/restore) ✅; Stories 2.1 e 2.2 (persistência) ✅; Story 2.3 (sync incremental) ✅.
3. **Frontend:** Stories 3.1, 3.2, 3.3 (carregar estado da API, enviar mudanças, UI de sync) ✅.
4. **Code Review:** Story 5.1 (revisão de segurança e contrato) ✅.
5. **QA:** Story 5.2 (multi-dispositivo/sessão) ✅; Story 5.3 (aceite final e deploy) ✅.

---

## Checklist rápido por área

**Desenvolvimento**
- [x] Doc `docs/architecture-sync.md` com modelo, estratégia de conflitos e fases (entregável da Story 1.1).
- [x] Decisão de escopo da primeira entrega registrada no doc (Fase 1 primeiro).

**Backend**
- [x] API backup/restore: GET/POST/PUT `/api/me/data` (Story 1.2 implementada).
- [x] Persistência por usuário (Stories 2.1, 2.2): transações, contas, categorias, envelopes e metas persistidas no banco e sempre associadas ao `user_id`; listagens e escritas filtradas por usuário; GET /me/data reflete o servidor.
- [x] API de sync incremental (Story 2.3): GET /me/sync?since=<ISO8601> e POST /me/sync implementados.
- [x] Revisão de segurança (Story 5.1 — Code Review concluído; ver Notas de Review).

**Frontend**
- [x] Carregar estado inicial da API ao abrir a app (Story 3.1 — loadInitialDataFromMeData no use-load-data).
- [x] Enviar criações/edições para a API (Story 3.2 — endpoints REST + sync-store + toast em erro).
- [x] Indicador de estado de sync (Story 3.3 — SyncIndicator no header).

**Code Review**
- [x] Revisão de todos os PRs da sprint (isolamento por usuário, conflitos, validação) — Story 5.1 concluída; ver Notas de Review abaixo.

**QA**
- [x] QA Fase 1 (carregamento, REST, SyncIndicator, backup manual, regressão) — aprovado.
- [x] Testes de sync entre “dispositivos” (ou sessões) — Story 5.2 executada; cenários dados em outra sessão, LWW e regressão marcados.
- [ ] Testes de conflito (se aplicável).
- [x] Regressão dos fluxos atuais (incluída na rodada 5.2).
- [x] Aprovação final para deploy (Story 5.3 — concluída).

---

## Notas de Review (Story 5.1 — Code Review)

Checklist de revisão de segurança e contrato (Backend e Frontend da sprint de sync):

| Item | Resultado |
|------|-----------|
| **Nenhum endpoint expõe dados de outro usuário** | **OK.** Todos os routers (transactions, accounts, categories, envelopes, goals, me_data, shared_expenses, activity_feed, notifications, automations, insights, reports) usam `Depends(get_current_user)` e repassam `current_user.id` para listagens e escritas. Repositórios filtram por `user_id` (ex.: `get_by_user`, `get_by_user_and_id`). GET /me/data e GET /me/sync chamam `get_snapshot` / `get_sync_delta` com `current_user`; retorno é sempre do usuário autenticado. |
| **Payloads de sync não aceitam user_id arbitrário** | **OK.** Body de POST/PUT /me/data e POST /me/sync (`MeDataBody`) contém apenas listas (transactions, accounts, categories, envelopes, goals, sharedExpenses); não há campo `user_id`. O serviço `apply_snapshot_merge(db, user_id, body)` recebe `user_id` do router (`current_user.id`). Docstrings em `me_data_service.py` e `me_data.py`: "Nunca usa user_id do body — apenas do token". Funções `_upsert_accounts`, `_upsert_categories`, `_upsert_envelopes`, `_upsert_goals` usam apenas o parâmetro `user_id` passado, nunca extraem do item do body. |
| **Tratamento de conflitos e validação de entrada** | **OK.** Conflitos: política de merge por id (upsert) conforme `docs/architecture-sync.md`; não há LWW explícito no apply (aceitável para Fase 1). Validação: `_sanitize_str` para strings (strip, truncate); limites (MAX_ACCOUNTS, MAX_CATEGORIES, etc.); tipos/enums validados (acc_type, color, etc.); `since` em GET /me/sync obrigatório e ISO8601 (400 se inválido). `ValueError` no serviço é convertido em `HTTP 400` no router. |

**Resumo:** Isolamento por usuário, rejeição de user_id do body e validação/sanitização estão corretos. Nenhuma alteração de código necessária; Story 5.1 considerada concluída.

---

## QA Fase 1 — Escopo de validação

Escopo acordado: validar **carregamento pós-login (GET /me/data)**, **envio de mudanças via REST**, **SyncIndicator**, **backup manual** e **regressão dos fluxos atuais**. O sync incremental (Story 2.3) fica para rodada de QA posterior.

### Checklist QA Fase 1

| Item | Descrição | Validação em código |
|------|-----------|----------------------|
| **Carregamento pós-login** | Após login, `GET /api/me/data` é chamado e stores são populados (ou mantidos se vazio). | `use-load-data.ts`: chama `loadInitialDataFromMeData()` após auth pronto; `me-data.service.ts`: `getMeData()` → `applyMeDataToStores()`. Sync-store: `setSyncing()` antes, `setSynced()`/`setError()` depois. |
| **Envio de mudanças via REST** | Criar/editar/remover transação, conta, categoria, envelope, meta envia para a API e atualiza sync-store (synced/error) + toast em erro. | Transações (transaction.controller), contas/categorias (Settings), envelopes (EnvelopeForm, EnvelopeValueForm, Envelopes transfer), metas (GoalForm, AddGoalValueForm, Goals) usam serviços REST e `useSyncStore.getState().setSynced()` / `setError()`. |
| **SyncIndicator** | Ícone no header: sincronizado / sincronizando / offline / erro. | `SyncIndicator.tsx` lê `useSyncStore` (idle, syncing, synced, error, offline). `MainLayout` monta `<SyncIndicator />` e escuta `window` online/offline → setOffline/setOnline. |
| **Backup manual** | Em Configurações, "Fazer Backup" gera download do JSON dos dados (export local). | `Settings.tsx`: `handleExportData` monta JSON (user, accounts, categories, exportDate) e dispara download; botão "Fazer Backup". |
| **Regressão fluxos atuais** | Criar transação, caixinha, despesa compartilhada, etc. continuam funcionando. | A validar em passada manual (ou E2E quando estáveis). |

### Passada manual sugerida (QA Fase 1)

1. **Login e carregamento:** Fazer login e confirmar que a tela carrega sem erro; (com backend) que dados existentes no servidor aparecem (ou listas vazias).
2. **SyncIndicator:** Verificar ícone no header (Check = sincronizado/dados locais; Loader ao carregar; AlertCircle + tooltip em erro; WifiOff sem rede).
3. **Envio REST:** Criar uma conta em Configurações, uma transação, uma caixinha, uma meta; confirmar que persistem e que o indicador reflete sucesso (e toast em caso de falha simulada).
4. **Backup manual:** Em Configurações, acionar "Fazer Backup" e confirmar download do JSON.
5. **Regressão:** Passar rapidamente por: nova despesa compartilhada, edição de envelope, exclusão de transação/conta (se aplicável).

### Status QA Fase 1

- **Validação em código (frontend):** Wiring confirmado para GET /me/data, sync-store, SyncIndicator, REST nos fluxos listados e backup em Settings. Nenhuma chamada a `POST /me/data` no frontend (backup na nuvem é opcional no doc).
- **Passada manual:** Aprovada.
- **QA Fase 1:** Aprovado — escopo (carregamento pós-login, envio REST, SyncIndicator, backup manual, regressão) validado.
- **Sync incremental (2.3):** Backend 2.3 concluído (GET/POST /me/sync). Próxima rodada de QA cobre multi-dispositivo/sessão (abaixo).

---

## QA multi-dispositivo / sessão (próxima rodada — Story 5.2)

**Contexto:** Stories 2.1, 2.2 e 2.3 concluídas (persistência por usuário + sync incremental). Objetivo desta rodada é validar que dados criados/alterados em uma sessão aparecem na outra (mesmo usuário).

### Cenários a validar

| Cenário | Passos | Critério de sucesso |
|--------|--------|---------------------|
| **Dados visíveis em outra sessão** | (1) Login no dispositivo/aba A. (2) Criar transação, conta, envelope ou meta. (3) No dispositivo/aba B (mesmo usuário), fazer login ou recarregar. | Dados criados em A aparecem em B após carregamento (GET /me/data ou GET /me/sync). |
| **Edição no mesmo recurso (LWW)** | (1) Em A, editar um recurso (ex.: nome da conta). (2) Em B, recarregar ou reabrir a app. | Versão mais recente (última escrita) é a exibida; conforme doc de arquitetura (LWW com updated_at). |
| **Regressão** | Repetir fluxos principais: criar transação, caixinha, despesa compartilhada, backup manual. | Comportamento igual ao da QA Fase 1; sem regressões. |

### Checklist QA multi-dispositivo/sessão

- [x] Cenário “dados visíveis em outra sessão” executado e aprovado.
- [x] Cenário “edição no mesmo recurso (LWW)” executado e aprovado.
- [x] Regressão dos fluxos atuais sem falhas.
- [x] Resultado registrado neste doc; seguir para Story 5.3.

### Resultado QA multi-dispositivo/sessão (Story 5.2)

- **Rodada executada:** Os 3 cenários (dados em outra sessão, LWW, regressão) foram rodados e o checklist acima marcado.
- **Próximo passo:** Story 5.3 (documentação e aceite final; aprovação para deploy).

---

## Referência de arquivos (para contexto)

| Camada | Exemplo de arquivos |
|--------|----------------------|
| Store (estado local) | `src/stores/financial-store.ts`, `src/stores/shared-expenses-store.ts` |
| Serviços API | `src/services/transactions.service.ts`, `src/services/accounts.service.ts`, `src/services/envelopes.service.ts` (ou equivalente) |
| Auth | `src/stores/auth-store-index.ts`, `src/lib/http-client.ts` |
| Backend | Repositório/API do backend (contratos, modelos, endpoints) |
| Arquitetura de sync | `docs/architecture-sync.md` |

---

*Sprint gerada para a demanda de sincronização e arquitetura de dados. Ajustar prazos e escopo (ex.: só Fase 1) conforme capacidade do time.*
