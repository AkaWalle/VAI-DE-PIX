# Auditoria Auth / Token / Refresh / 401 — Relatório

Auditoria **sem alteração de comportamento funcional**. Foco em detecção de falhas, race conditions, loops e pontos frágeis.

---

## PARTE 1 — AUTH / TOKEN / REFRESH / 401

### 1️⃣ token-manager

| Pergunta | Resposta |
|----------|----------|
| `getTokenForRequest` sempre retorna token válido? | **Não.** Retorna o primeiro token encontrado em `vai-de-pix-token` → `token` (local) → `token` (session). Não valida `exp`; pode retornar token já expirado. |
| Chance de retornar null durante auth ready? | **Sim.** Entre logout (clear) e novo login, ou se apenas refresh cookie existir e access token ainda não foi escrito. |
| Race entre login e requests? | **Baixa.** Login chama `tokenManager.set(data.access_token)` após resposta; requests usam o mesmo storage. Possível janela mínima se um request disparar no mesmo tick antes do set. |

**Inconsistência:** `getTokenForRequest()` lê 3 chaves; `tokenManager.get()` só `TOKEN_KEY`. Se algo gravar só em `localStorage.token`, `tokenManager.isValid()` pode ser false enquanto `getTokenForRequest()` retorna valor. Hoje o login usa apenas `tokenManager.set` (TOKEN_KEY), então está alinhado.

---

### 2️⃣ AuthRuntimeGuard

| Pergunta | Resposta |
|----------|----------|
| Bloqueia requests antes de auth ready? | **Não bloqueia requests.** Só é usado pelo **sync engine** e por **useLoadData**. Quem chama API direto (ex.: NotificationBell) não passa pelo guard. |
| Pode gerar falso positivo? | **isAuthReady()** = `isAuthChecking === false`. Após bootstrap sem token, isso é true; não é falso positivo. **hasValidAccessToken()** pode ser false com token em outro storage (ex.: `token`) → possível falso negativo, não positivo. |
| Pode travar sync engine? | **Sim, por design.** Se `waitUntilAuthReady()` der timeout (15s), retorna false e useLoadData não carrega. Se `ensureValidSession()` nunca resolver (ex.: refresh pendente sem timeout), sync fica aguardando. O refresh em si não tem timeout; se o fetch travar, a Promise trava. |

---

### 3️⃣ RefreshLockManager

| Pergunta | Resposta |
|----------|----------|
| Garante 1 refresh concorrente? | **Sim.** `refreshPromise !== null` → retorna a mesma Promise; só cria nova após `finally { refreshPromise = null }`. |
| Requests aguardam corretamente? | **Sim.** Todos aguardam a mesma `refreshPromise` e recebem o mesmo resultado. |
| Deadlock possível? | **Não.** O lock é liberado no `finally` após refresh (sucesso ou falha). Único risco: se `refreshAccessTokenIfAvailable()` nunca resolver (ex.: fetch sem timeout), todas as requisições que aguardam ficam pendentes. |

---

### 4️⃣ http-client

| Pergunta | Resposta |
|----------|----------|
| Retry ocorre apenas após refresh válido? | **Sim.** Retry só é feito quando `refreshed === true` (linha 77). |
| Retry infinito é impossível? | **Sim.** `__retriedByRefresh` é incrementado e verificado `>= MAX_RETRY_AFTER_REFRESH` (1). Segundo 401 no mesmo request não retenta. |
| clearAllTokens limpa estado global? | **Sim.** Chama `resetRefreshLock()` + `clearAllTokensStoragesOnly()` (3 chaves em localStorage/sessionStorage). **Não** limpa cookies (refresh pode estar em HttpOnly); backend deve invalidar sessão no logout. |

---

### 5️⃣ Fluxo 401 — Simulação mental

| Cenário | Comportamento | Risco |
|---------|----------------|-------|
| Token expirado | 401 → interceptor → runRefreshWithLock() → refresh → tokenManager.set() → retry request. | Baixo. |
| Refresh expirado | refresh retorna 4xx → refreshed = false → clearAllTokens() → redirect /auth. | Esperado. |
| Refresh falhou (rede) | refreshed = false → clear + redirect. Sem loop. | Baixo. |
| Múltiplos requests simultâneos 401 | Todos entram no interceptor; um cria refreshPromise, demais aguardam; 1 refresh; todos retentam. | Baixo. |
| Logout durante refresh | logout → clearAllTokens() → resetRefreshLock() → refreshPromise fica null. Quem estava aguardando a Promise antiga ainda recebe o resultado (true/false) quando o refresh terminar; depois fazem clear/redirect no seu próprio 401 se falharem. Se refresh já tiver escrito token, estado fica inconsistente até reload (logout faz reload). | Médio: ver “Pontos frágeis” abaixo. |

---

### Tabela PARTE 1 — Cenário | Risco | Impacto | Probabilidade | Correção segura

| Cenário | Risco | Impacto | Probabilidade | Correção segura |
|---------|--------|---------|--------------|-----------------|
| getTokenForRequest retorna token expirado | Médio | 401 → refresh → retry (OK) | Alta | Nenhuma; fluxo já cobre. |
| Token em `localStorage.token` mas não em TOKEN_KEY | Baixo | Guard/sync pode bloquear; request pode enviar token | Baixa | Garantir que login e refresh só usem tokenManager (TOKEN_KEY). Já é o caso. |
| ensureValidSession aguarda refresh sem timeout | Médio | Sync pode travar até resposta do fetch | Baixa | Adicionar timeout (ex.: 10s) ao fetch em refreshAccessTokenIfAvailable e rejeitar. |
| Logout durante refresh: requests em espera recebem token depois | Médio | Token escrito após logout; estado inconsistente até reload | Baixa | No logout, além de clearAllTokens, abortar refresh em andamento (ex.: AbortController) ou ignorar resultado do refresh se “logout requested”. |
| ProtectedRoute renderiza filhos antes de bootstrap | Nenhum | — | N/A | ProtectedRoute já espera !isAuthChecking e userLoaded. |
| NotificationBell monta e chama API antes de auth | Baixo | 401 → refresh → retry (se token existir) | Baixa | MainLayout só monta após ProtectedRoute liberar (auth pronto). |

---

## PARTE 2 — FRONT ↔ API ↔ SYNC ENGINE

### SYNC ENGINE

- **Usa isAuthReady antes de rodar?** Sim (`syncSharedExpensesFromBackend`).
- **Usa ensureValidSession?** Sim (await antes de `sharedExpenseApi.getReadModel()`).
- **Pode iniciar sync durante refresh?** Sim. `ensureValidSession()` chama `refreshAccessTokenIfAvailable()`; não usa `runRefreshWithLock()`. Ou seja, sync pode disparar um refresh próprio em paralelo ao do http-client. Dois refreshes simultâneos são possíveis (guard vs interceptor). **Risco:** dois POSTs /auth/refresh; comportamento do backend define se é idempotente.

### REQUEST FLOW

```
Front (MainLayout)
  → useLoadData: waitUntilAuthReady() → loadData() [categories, accounts, …]
  → Sync (se GOD MODE): isAuthReady() + ensureValidSession() → sharedExpenseApi.getReadModel()
  → httpClient (interceptor request) → getTokenForRequest() → Authorization
  → API
  → 401 → interceptor response → runRefreshWithLock() → refreshAccessTokenIfAvailable() → tokenManager.set()
  → retry httpClient.request(config)
  → Sync/loadData continuam com novo token
```

### VALIDAÇÃO

| Pergunta | Resposta |
|----------|----------|
| Existe caminho sem token injection? | **Sim, por design:** login, register, health. Qualquer chamada que use `fetch` direto (ex.: refresh em auth-runtime-guard, api-detector health) não passa pelo interceptor; refresh não precisa de Bearer. |
| Existe caminho com token stale? | **Sim.** Primeiro request após expiração usa token stale até 401; depois refresh + retry. Esperado. |
| Existe dupla execução? | **Possível.** ensureValidSession() no sync chama refresh; se vários 401 no http-client acontecem ao mesmo tempo, todos compartilham o mesmo refresh via lock. Mas sync pode estar chamando refresh em paralelo (sem lock compartilhado com o guard). |

### Fluxo textual + pontos frágeis

**Fluxo: Login → Dashboard load → Sync start**

1. Usuário faz login → authService.login → tokenManager.set → store (user, isAuthenticated).
2. Navega para / → ProtectedRoute: hasToken, isAuthChecking (bootstrap já rodou), userLoaded → renderiza MainLayout.
3. MainLayout monta → useLoadData effect → waitUntilAuthReady() (já true) → loadData() → várias chamadas via httpClient (token injetado).
4. Se GOD MODE: loadData chama syncSharedExpensesFromBackend() → isAuthReady() + ensureValidSession() → getReadModel() via httpClient.

**Pontos frágeis:**

- **[F1]** ensureValidSession no sync usa refresh direto (sem runRefreshWithLock). Se o sync e o interceptor precisarem de refresh ao mesmo tempo, podem ocorrer 2 refreshes paralelos.
- **[F2]** useLoadData.reload() (manual) não chama waitUntilAuthReady(); usa só isAuthenticated && user. Em teoria pode rodar antes de auth pronto se chamado de contexto antigo.
- **[F3]** NotificationBell monta no MainLayout; MainLayout só monta após auth pronto (ProtectedRoute), então primeiro getUnreadCount já tem sessão válida. Sem fragilidade extra.

**Fluxo: Token expira → Sync rodando → 401 → Refresh → Retry → Continue sync**

1. Sync chama getReadModel() com token expirado.
2. API retorna 401.
3. Interceptor: runRefreshWithLock() → refresh → tokenManager.set() → retry getReadModel().
4. Retry usa novo token; sync recebe dados e aplica no store.

Sem loop: retry é 1x por request. **Ponto frágil:** se refresh travar (sem timeout), sync e outros requests ficam pendentes.

---

## PARTE 3 — LOGS / OBSERVABILIDADE / PRODUÇÃO

### Validação de existência dos logs

| Log | Onde | Existe? |
|-----|------|--------|
| AUTH_READY | auth-runtime-guard (waitUntilAuthReady) | Sim |
| TOKEN_INJECTED | http-client (request interceptor, só DEV) | Sim (apenas DEV) |
| TOKEN_REFRESH_START | refresh-lock-manager | Sim |
| TOKEN_REFRESH_SUCCESS | refresh-lock-manager | Sim |
| TOKEN_REFRESH_FAIL | refresh-lock-manager | Sim |
| REQUEST_RETRY_AFTER_REFRESH | http-client | Sim |
| SYNC_BLOCKED_AUTH_NOT_READY | shared-expenses-sync-engine | Sim |
| SYNC_FAIL_401 | shared-expenses-sync-engine | Sim |
| SYNC_STARTED | Doc; no código é SYNC_START | Nome no código: SYNC_START |

### Validação qualitativa

- **Reconstruir incidentes?** Parcial. Falta request id / correlation id em todos os logs; ordem temporal no console ajuda, mas em produção com muitos usuários é limitado.
- **Log silencioso em falhas críticas?** Refresh falha → TOKEN_REFRESH_FAIL; depois clear + redirect. Não há log explícito “REDIRECT_AFTER_401” ou “LOGOUT_AFTER_REFRESH_FAIL”.
- **Correlação de request id?** Não existe. Axios não injeta x-request-id por padrão; não há trace único por fluxo.

### Score (0–10)

| Critério | Score | Justificativa |
|----------|-------|----------------|
| Observabilidade geral | 6 | Logs de auth/sync/refresh existem e cobrem os fluxos principais; falta request id e log de redirect/logout. |
| Debugabilidade produção | 5 | Console.log suficiente para dev; em produção sem centralização fica difícil. |
| Rastreabilidade incidentes | 4 | Sem correlation id não dá para agrupar todos os requests de um usuário/sessão. |

---

## ETAPA A — ESTRUTURA (mapa de dependências)

```
/auth (pages/Auth.tsx)          → authStore, authService (http-client)
/http (lib/http-client.ts)      → refresh-lock-manager, token-manager, api
/sync (shared-expenses-sync-engine) → sharedExpenseApi (http-client), auth-runtime-guard
/lib
  auth-runtime-guard.ts         → auth-store-index, auth-session, token-manager
  refresh-lock-manager.ts       → auth-runtime-guard
  token-manager.ts              → (nenhum)
  http-client.ts                → refresh-lock-manager, token-manager, api
  auth-session.ts               → (nenhum)
/hooks
  use-load-data.ts              → auth-store, services (httpClient), sync engine, auth-runtime-guard
/components críticos
  ProtectedRoute                → auth-store, auth-session
  MainLayout                    → useLoadData, NotificationBell
  NotificationBell              → notifications.service (httpClient)
```

**Ciclos:** Nenhum. auth-runtime-guard não importa http-client; http-client não importa auth-runtime-guard.

**Acoplamentos perigosos:**

- **refresh-lock-manager → auth-runtime-guard:** refresh real vive no guard; lock só orquestra. Se alguém chamar refreshAccessTokenIfAvailable() direto (ex.: sync via ensureValidSession), fica fora do lock.
- **Vários serviços importam http-client:** correto; único ponto de interceptação.

---

## ETAPA B — IMPORTS E DEPENDÊNCIAS

- **Import circular indireto:** Nenhum detectado.
- **Módulos que importam http-client + token-manager juntos:** Nenhum; token-manager é importado por auth-runtime-guard e por http-client; serviços usam só http-client (e re-export de tokenManager onde necessário).
- **Estado global compartilhado sem controle:** redirectCount no http-client (módulo) é global; resetado em respostas 2xx. Loop threshold 5 evita redirect infinito.

**Lista priorizada por risco:**

1. **Médio:** ensureValidSession (guard) chama refresh sem runRefreshWithLock → possível refresh duplicado quando sync e interceptor precisam ao mesmo tempo.
2. **Baixo:** useLoadData.reload() não usa waitUntilAuthReady (impacto baixo; reload é manual e usuário já está logado).
3. **Baixo:** TOKEN_INJECTED só em DEV; em produção não há log de “request com token” (pode ser intencional para não logar token).

---

## ETAPA C — ESTADO GLOBAL (tokens)

| Onde | O que |
|------|--------|
| Memory | redirectCount (http-client); refreshPromise (refresh-lock-manager). |
| LocalStorage | vai-de-pix-token, token (token-manager / auth-session). |
| SessionStorage | token. |
| Cookies | Refresh (HttpOnly) gerenciado pelo backend. |

**Consistência:**

- **Token divergente?** Possível se algo escrever em `localStorage.token` ou `sessionStorage.token` sem escrever em TOKEN_KEY. Hoje só authService e guard (após refresh) usam tokenManager.set(TOKEN_KEY). getTokenForRequest lê as 3 fontes; tokenManager.get só TOKEN_KEY.
- **Leitura antes de escrita?** Sim: primeiro render após reload pode ter persist rehydrated (user, isAuthenticated) antes de bootstrapAuth terminar. ProtectedRoute evita renderizar rotas protegidas até !isAuthChecking e userLoaded, então não há request protegido antes do bootstrap terminar.

---

## ETAPA D — CONCORRÊNCIA

**Cenário: 10 requests simultâneos com token expirado**

- Todos recebem 401; todos entram no interceptor; o primeiro cria refreshPromise; os outros 9 aguardam a mesma Promise; 1 refresh; todos retentam. OK.

**Cenário: Logout durante refresh**

- logout() → clearAllTokens() → resetRefreshLock() (refreshPromise = null). A Promise do refresh em andamento continua; quando resolver, quem estava aguardando recebe true/false. Se true, tokenManager já foi atualizado pelo refresh; em seguida o interceptor faz retry. Estado: “logout” mas token novo escrito. O reload em logout() limpa tudo. **Risco:** entre o fim do refresh e o reload, um retry poderia usar o novo token. O reload evita isso na prática.

**Cenário: Login + sync start simultâneo**

- Login chama tokenManager.set no callback do POST /login. Sync (useLoadData) só roda após waitUntilAuthReady e loadData; sync é chamado dentro de loadData. Ordem típica: login termina → store atualizado → MainLayout já montado (ou montando) → useLoadData já pode ter rodado waitUntilAuthReady. Não há corrida crítica; sync usa token já definido pelo login.

---

## ETAPA E — FAIL SAFETY

| Pergunta | Resposta |
|----------|----------|
| Se refresh falhar: sistema entra em loop? | Não. Sem retry de refresh no interceptor; após falha faz clear + redirect. |
| Sistema trava? | Só se o fetch de refresh nunca resolver (ex.: rede travada sem timeout). |
| Sistema desloga corretamente? | Sim. clearAllTokens + redirect /auth (e logout faz reload). |
| API lenta: timeout? | Sim. API_CONFIG.timeout 10000 no axios. |
| Retry storm? | Não. 1 retry por request após refresh; sync tem no máximo 2 tentativas com delay fixo. |

---

## MODO GOD MODE — CONCLUSÃO

### 1️⃣ Top 10 riscos reais

1. **Refresh no guard fora do lock:** ensureValidSession chama refreshAccessTokenIfAvailable direto; sync e interceptor podem gerar 2 refreshes paralelos.
2. **Refresh sem timeout:** fetch em refreshAccessTokenIfAvailable pode travar; bloqueia sync e quem aguarda o lock.
3. **Logout durante refresh:** refresh pode concluir após clear e escrever token; reload mitiga.
4. **TOKEN_INJECTED só em DEV:** em produção não há confirmação de que o request saiu com token (observabilidade).
5. **getTokenForRequest não valida exp:** envia token expirado; depende de 401 + refresh. Comportamento aceitável.
6. **redirectCount global:** se duas abas usam o mesmo módulo, compartilham o contador; threshold 5 é por “processo” (aba).
7. **useLoadData.reload() sem waitUntilAuthReady:** risco teórico; impacto baixo.
8. **Dois storages de token (token + TOKEN_KEY):** possível divergência se código legado escrever só em "token".
9. **Sem request id:** dificulta correlação de logs em produção.
10. **Sync retry com delay fixo (2s):** em latência alta pode parecer lento; não é storm.

### 2️⃣ Top 5 melhorias seguras de alto impacto

1. **Fazer ensureValidSession usar runRefreshWithLock:** no guard, chamar runRefreshWithLock() em vez de refreshAccessTokenIfAvailable() quando precisar de refresh. Assim sync e interceptor compartilham o mesmo refresh (evita duplo POST /auth/refresh). **Requer extrair a lógica de refresh para um módulo neutro (ex.: `refresh-impl.ts`) para evitar ciclo:** refresh-lock-manager → auth-runtime-guard → refresh-lock-manager. Ordem: criar `refresh-impl.ts` (fetch + tokenManager.set), refresh-lock-manager importar refresh-impl, auth-runtime-guard importar apenas runRefreshWithLock de refresh-lock-manager.
2. **Timeout no fetch de refresh:** AbortController com 10–15s; em timeout rejeitar e retornar false.
3. **Log REDIRECT_AFTER_401 ou LOGOUT_AFTER_REFRESH_FAIL:** antes de clearAllTokens + redirect, logar motivo (observabilidade).
4. **Padronizar log SYNC_START → SYNC_STARTED:** alinhar com doc (cosmético).
5. **Opcional: x-request-id no interceptor:** gerar UUID por request e logar nos eventos; facilita rastreio.

### 3️⃣ Bugs silenciosos possíveis

- **Persist rehydrate com user mas token já expirado:** bootstrapAuth faz checkAuth (getProfile); se token expirado, 401 → refresh no interceptor; se refresh ok, retry getProfile funciona. Se refresh falhar, logout. Não é silencioso (redirect).
- **Activity-feed-store ou outro usando tokenManager.get() para “isLoggedIn”:** se token estiver só em "token" e não em TOKEN_KEY, tokenManager.get() null e tokenManager.isValid() false. Possível UI “não logado” com token em outro storage. Baixa probabilidade.
- **Cookie de refresh expirado mas access token ainda válido:** até o access expirar, tudo OK; depois 401, refresh falha, clear + redirect. Comportamento correto.

### 4️⃣ Pontos que quebrariam em escala x10 usuários

- Nenhum estado global por usuário no front; cada aba/sessão é independente. Backend é que escala (sessões, refresh). Front só pode ter mais 401 + refresh simultâneos; lock evita múltiplos refreshes por “sessão”.

### 5️⃣ Pontos que quebrariam em latência alta

- Timeout do axios (10s): requests lentos falham; não há retry automático por timeout (só por 401 com refresh). Aceitável.
- Refresh sem timeout: se o backend demorar muito, refresh trava e bloqueia quem aguarda. **Recomendação:** timeout no fetch de refresh.

### 6️⃣ Pontos que quebrariam em mobile / rede ruim

- Timeout 10s pode ser pouco para rede ruim; usuário vê erro. Refresh em rede instável pode falhar e deslogar. Retry apenas 1x após refresh; não há “retry com backoff” para rede. **Recomendação:** considerar timeout maior em mobile ou mensagem “rede instável, tente de novo”.

---

## MODO HARD EXTRA — 3 abas, sync em background, token expirando, refresh falha 1x e funciona na 2ª

**Cenário:** 3 abas, sync rodando em uma, token expira durante sync, primeiro refresh falha (rede), segundo (retry ou nova ação) funciona.

- **Aba 1 (sync):** getReadModel 401 → runRefreshWithLock → refresh falha → refreshPromise = null (finally). Interceptor não retenta (refreshed = false) → clearAllTokens + redirect /auth. Nas 3 abas o módulo é compartilhado (mesmo origin), então clearAllTokens limpa storage; **todas as abas** perdem token. Redirect na aba 1; abas 2 e 3 na próxima request recebem 401, clear, redirect. **Não há “segunda tentativa de refresh” no mesmo request.** Para “refresh falha 1x e funciona na 2ª” seria preciso usuário fazer nova ação (ex.: clicar de novo) após falha; aí novo request, novo 401, novo refresh. Se o segundo refresh funcionar, retry desse segundo request funciona. **Conclusão:** sistema sobrevive; usuário pode precisar tentar de novo após uma falha de refresh (ex.: rede voltou).

---

## CHECK FINAL OBRIGATÓRIO

**O sistema está:**

- [ ] Produção segura  
- [x] **Produção aceitável**  
- [ ] Produção com risco  
- [ ] Produção crítica  

**Justificativa técnica:**

- Fluxo 401 → refresh com lock → retry único está correto e evita loop.
- Sync e loadData estão protegidos por guard e por waitUntilAuthReady.
- ProtectedRoute não renderiza rotas protegidas antes de auth pronto.
- Logout limpa tokens e faz reload; não há dependência de schema ou contrato novo.
- Riscos identificados são limitados: refresh duplicado (guard vs interceptor), falta de timeout no fetch de refresh, e observabilidade sem request id. Nenhum deles implica perda de dados ou auth quebrada de forma irreversível; com melhorias incrementais (lock no guard, timeout no refresh, logs) o sistema fica em “produção segura”.

---

*Documento gerado por auditoria estática e análise de fluxo; sem alteração de comportamento funcional.*
