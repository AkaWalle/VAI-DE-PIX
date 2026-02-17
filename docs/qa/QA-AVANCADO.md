# QA Avançado — Auth, Refresh, Sync e Resiliência

**Não é só:** testar tela, endpoint, login/logout.  
**É:** concorrência real, rede ruim, multi-aba, race de timing, backend degradado, estado corrompido, storage divergente, feature flags, sessão sobrevivendo a caos.

---

## Princípios

| Evitar | Focar em |
|--------|----------|
| Testar tela isolada | Fluxo completo (login → dashboard → sync → requests) |
| Testar endpoint sozinho | 401 → refresh → retry → sucesso |
| Só happy path | Token expirado, refresh timeout, logout durante refresh |
| Uma aba | Multi-aba, 10 requests simultâneos |
| Rede boa | 3G lento, timeout, backend instável |
| Estado limpo | Storage divergente, session version, GOD MODE on/off |

---

## CAMADA 1 — Auth Lifecycle QA

### Teste 1 — Login → Dashboard Cold Start

**Objetivo:** Zero request sem token; sync só após AUTH_READY.

**Simular:**
1. Limpar storage (DevTools → Application → Local Storage / Session Storage: remover `vai-de-pix-token`, `token`, limpar `vai-de-pix-auth` se existir).
2. Recarregar app (F5).
3. Fazer login (credenciais válidas).
4. Observar Network (F12 → Network): filtrar XHR/Fetch.

**Validar:**
- Nenhum 401 após o primeiro 200 do login.
- Nenhuma chamada protegida (ex.: `/transactions`, `/accounts`, `/notifications/unread-count`) antes do login completar.
- Console: `[AuthGuard] AUTH_READY` (already ou after wait) antes de carregar dados.
- Sync (se GOD MODE): `[SharedExpensesSync] SYNC_START` só após AUTH_READY e após loadData iniciar; não aparece `SYNC_BLOCKED_AUTH_NOT_READY` após login bem-sucedido.
- Token já está em localStorage (`vai-de-pix-token`) antes da primeira chamada protegida.

**Critério de sucesso:** Zero 401 após login; ordem: login → AUTH_READY → requests protegidos.

---

### Teste 2 — Token Expira Durante Uso Normal

**Objetivo:** 401 → 1 refresh → retry → sucesso; sem erro visível.

**Simular:**
1. Login normal.
2. Forçar token expirado: DevTools → Application → Local Storage → `vai-de-pix-token` → editar o JWT e reduzir `exp` para um valor no passado (ou esperar expiração real se curta).
3. Fazer ação normal: abrir Dashboard, ou Transações, ou Notificações.

**Validar:**
- Network: primeiro request protegido retorna 401; em seguida 1 POST `/api/auth/refresh`; depois retry do request original com 200.
- Console: exatamente 1 `[RefreshLock] REFRESH_LOCK_ACQUIRED`, 1 `TOKEN_REFRESH_START`, 1 `TOKEN_REFRESH_SUCCESS`, `REQUEST_RETRY_AFTER_REFRESH`.
- Usuário não vê tela de erro; não é redirecionado para /auth; dados carregam.

**Critério de sucesso:** 1 refresh; retry com sucesso; UX intacta.

---

### Teste 3 — Refresh Timeout Real

**Objetivo:** Backend refresh não responde → timeout 10s → lock libera → sessão limpa.

**Simular:**
1. Bloquear ou atrasar **apenas** POST `/api/auth/refresh` (proxy, DevTools Request blocking, ou backend mock que demora 30s).
2. Login; expirar token (editar JWT ou esperar); disparar uma ação que cause 401.

**Validar:**
- Após ~10s: Console `[RefreshInternal] REFRESH_TIMEOUT_ABORT`.
- Console `[RefreshLock] REFRESH_LOCK_RELEASED`.
- Sistema redireciona para /auth (clearAllTokens + redirect) ou pede login; nenhum request fica pendente indefinidamente.
- Nova ação (ex.: outro request) não fica travada esperando o mesmo refresh.

**Critério de sucesso:** Timeout em 10s; lock liberado; usuário pode tentar de novo (reload/login).

---

## CAMADA 2 — Concorrência Hard QA

### Teste 4 — 10 Requests Simultâneos com Token Expirado

**Objetivo:** Apenas 1 refresh; todos os requests aguardam e retentam com sucesso.

**Simular:**
1. Login; expirar token (editar JWT `exp` no passado).
2. Abrir várias áreas ao mesmo tempo (ou script que dispara em paralelo): Dashboard, Notificações, Shared Expenses, Transações, Configurações, Contas, Metas. Idealmente 10+ chamadas protegidas no mesmo momento (ex.: abrir 10 abas com rotas diferentes ou um script que chama várias APIs em paralelo).

**Validar:**
- Network: 1 único POST `/api/auth/refresh`; múltiplos retries dos requests originais após 200 do refresh.
- Console: exatamente 1 `REFRESH_LOCK_ACQUIRED`, 1 `TOKEN_REFRESH_START`; depois vários `REQUEST_RETRY_AFTER_REFRESH` (um por request que recebeu 401).
- Nenhum 401 “final” visível ao usuário (todos retentados com sucesso).

**Critério de sucesso:** 1 refresh; N retries; zero refresh duplicado.

---

### Teste 5 — Multi-Aba Real

**Objetivo:** Várias abas com token expirado; apenas uma “dispara” o refresh real; outras aguardam o resultado.

**Simular:**
1. Aba 1: login; navegar para Dashboard.
2. Aba 2: mesma origem, abrir Shared Expenses (ou outra rota protegida).
3. Aba 3: mesma origem, abrir Settings.
4. Em uma aba (ou via script): expirar token (localStorage é compartilhado entre abas).
5. Em cada aba: disparar uma ação que cause request protegido (ex.: recarregar, clicar em algo que chame API).

**Validar:**
- Apenas 1 POST `/api/auth/refresh` na rede (qualquer aba pode ser a que “ganhou” o lock).
- Nas outras abas: requests podem ter recebido 401 e aguardado a mesma Promise de refresh; após refresh, retry com sucesso.
- Console (em qualquer aba): 1 `REFRESH_LOCK_ACQUIRED`, 1 `TOKEN_REFRESH_START`; depois `TOKEN_REFRESH_SUCCESS` e retries.

**Critério de sucesso:** 1 refresh global; abas não disparam refreshes paralelos.

---

## CAMADA 3 — Logout Race QA

### Teste 6 — Logout Durante Refresh

**Objetivo:** Refresh em voo; usuário faz logout; token não é salvo; app volta para login limpo.

**Simular:**
1. Login; expirar token.
2. Disparar uma ação que cause 401 (ex.: abrir Notificações) → refresh inicia (POST /api/auth/refresh em voo).
3. **Antes** da resposta do refresh: clicar em Logout (ou chamar logout programaticamente).
4. Observar: resposta do refresh pode chegar depois do logout.

**Validar:**
- Console: `[RefreshInternal] REFRESH_IGNORED_SESSION_VERSION_MISMATCH` (refresh resolveu mas versão já incrementada).
- Token **não** volta para localStorage (session version guard).
- Nenhum retry com token “ressuscitado”; redirect para /auth; reload; estado limpo.
- Usuário vê tela de login; não vê dados da sessão anterior.

**Critério de sucesso:** Session version mismatch logado; token não salvo; UX de logout limpa.

---

## CAMADA 4 — Sync Engine QA

### Teste 7 — Sync Durante Refresh (Token Expira no Meio)

**Objetivo:** Sync chama API → 401 → interceptor faz refresh → retry → sync continua.

**Simular:**
1. GOD MODE ativo (localStorage `shared_expenses_god_mode_enabled` = `true` ou env).
2. Login; depois expirar token (editar JWT).
3. Disparar sync (ex.: recarregar dashboard ou página que chama `syncSharedExpensesFromBackend()`). Sync passa por `ensureValidSession()` (que chama `runRefreshWithLock`) ou a primeira chamada `getReadModel()` pode 401 e o interceptor faz refresh.

**Validar:**
- Sync não roda sem auth: se token já expirado antes do sync, `ensureValidSession()` dispara 1 refresh; sync aguarda e depois chama API.
- Se 401 acontecer durante `getReadModel()`: interceptor → refresh com lock → retry → sync recebe dados.
- Console: `SYNC_START`; não `SYNC_BLOCKED_AUTH_NOT_READY` após refresh bem-sucedido; `SYNC_SUCCESS` ou retry controlado (no máximo 2 tentativas com delay 2s).

**Critério de sucesso:** Sync aguarda refresh; continua normalmente; sem loop.

---

### Teste 8 — Sync com Backend Lento

**Objetivo:** Read model demora (ex.: 15s); timeout ou retry controlado; sem loop infinito.

**Simular:**
1. Atrasar GET `/api/shared-expenses/read-model` em 15s (proxy/mock).
2. GOD MODE ativo; login; disparar sync.

**Validar:**
- Request pode atingir timeout do axios (10s) ou completar após 15s conforme config.
- Sync tem no máximo 2 tentativas (SYNC_MAX_RETRIES = 2) com delay 2s; depois retorna false e para.
- Console: `SYNC_START`; depois `SYNC_FAIL` ou timeout; não há dezenas de tentativas.

**Critério de sucesso:** Retry limitado; sem storm; sem loading infinito.

---

## CAMADA 5 — Storage Consistency QA

### Teste 9 — Storage Divergente

**Objetivo:** Fonte de token única em uso; não entrar em loop de refresh.

**Simular:**
1. Login (token salvo em `vai-de-pix-token`).
2. Manualmente: colocar outro valor (ou token expirado) em `localStorage.token` ou `sessionStorage.token`, mantendo `vai-de-pix-token` válido ou inválido de forma controlada.
3. Navegar e disparar requests.

**Validar:**
- `getTokenForRequest()` lê na ordem: `vai-de-pix-token` → `localStorage.token` → `sessionStorage.token`. O primeiro presente é usado.
- Se o token usado for expirado: 401 → 1 refresh → retry; não múltiplos refreshes em loop.
- Após refresh, `tokenManager.set()` grava em `vai-de-pix-token`; comportamento permanece consistente.

**Critério de sucesso:** Sistema usa uma fonte coerente; sem loop; MAX_REFRESH_RETRY e 1 retry por request respeitados.

---

## CAMADA 6 — Rede Ruim Real

### Teste 10 — 3G Lento

**Objetivo:** Latência alta; refresh ainda completa ou faz timeout; sync não vira storm.

**Simular:**
1. Chrome DevTools → Network → Throttling: Slow 3G (ou Custom: alta latência, baixa throughput).
2. Login; expirar token; disparar ações (dashboard, notificações, sync).

**Validar:**
- Refresh pode demorar; se passar de 10s → REFRESH_TIMEOUT_ABORT; lock libera; usuário pode tentar de novo.
- Sync: no máximo 2 tentativas com delay 2s; não dezenas de requests.
- Nenhum loading infinito sem feedback; usuário pode relogar ou recarregar.

**Critério de sucesso:** Timeout respeitado; retry limitado; UX degradada mas recuperável.

---

## CAMADA 7 — Chaos QA (Hard)

### Teste 11 — Backend Refresh Instável (Falha 1x, Sucesso 2ª)

**Objetivo:** MAX_REFRESH_RETRY respeitado; sistema recupera.

**Simular:**
1. Mock/proxy: primeira chamada a POST `/api/auth/refresh` retorna 401 ou 500; segunda retorna 200 com `access_token`.
2. Login; expirar token; disparar 1 request que cause 401.

**Validar:**
- Primeira tentativa: refresh falha → TOKEN_REFRESH_FAIL; interceptor não retenta o request com sucesso (refresh retornou false).
- Usuário pode fazer nova ação (ex.: novo request); segunda vez: refresh é chamado de novo (lock já liberado); mock retorna 200 → refresh success → retry do request com sucesso.
- Após 2 falhas consecutivas de refresh (sem sucesso entre elas): REFRESH_SKIP_MAX_RETRY_REACHED; próxima tentativa não chama backend até reload/login.

**Critério de sucesso:** Comportamento conforme MAX_REFRESH_RETRY_GLOBAL; recuperação com nova ação ou login.

---

### Teste 12 — Rede Cai Durante Refresh

**Objetivo:** Abort ou falha de rede; lock libera; sistema tenta de novo depois.

**Simular:**
1. Disparar refresh (token expirado + request 401).
2. Durante o fetch de refresh: desconectar rede (DevTools Offline) ou matar o backend.

**Validar:**
- Fetch falha (ou AbortError se timeout); REFRESH_LOCK_RELEASED no finally.
- Nenhum request fica pendente para sempre; clearAllTokens + redirect ou retry em nova ação.
- Reconectar rede / subir backend e nova ação (ou reload + login) → fluxo normal.

**Critério de sucesso:** Lock libera; sem deadlock; recuperação possível.

---

## CAMADA 8 — Observabilidade QA

**Objetivo:** Logs aparecem nos cenários corretos.

**Validar presença e contexto:**

| Log | Quando deve aparecer |
|-----|------------------------|
| `[RefreshLock] REFRESH_LOCK_ACQUIRED` | Início de um refresh (primeira 401 que dispara refresh). |
| `[RefreshLock] REFRESH_LOCK_RELEASED` | Sempre após refresh terminar (sucesso ou falha). |
| `[RefreshInternal] REFRESH_TIMEOUT_ABORT` | Quando o fetch de refresh é abortado por timeout (10s). |
| `[RefreshInternal] REFRESH_IGNORED_SESSION_VERSION_MISMATCH` | Quando refresh resolve com sucesso mas a versão da sessão já foi incrementada (ex.: logout durante refresh). |
| `[HTTP] REQUEST_RETRY_AFTER_REFRESH` | Após refresh success; retry do request original. |
| `[AuthGuard] AUTH_READY` | Quando bootstrap terminou (already ou after wait). |
| `[SharedExpensesSync] SYNC_BLOCKED_AUTH_NOT_READY` | Quando sync não roda porque auth não está pronto ou sessão inválida. |
| `[SharedExpensesSync] SYNC_START` / `SYNC_SUCCESS` / `SYNC_FAIL_401` | Início, sucesso ou 401 do sync. |

**Critério de sucesso:** Cada log no contexto esperado; nenhum log crítico silencioso (ex.: timeout sem REFRESH_TIMEOUT_ABORT).

---

## CAMADA 9 — GOD MODE QA

### Teste 13 — GOD MODE + Login Fresh

**Objetivo:** Sync só após auth ready; zero 401.

**Simular:**
1. Ativar GOD MODE (localStorage `shared_expenses_god_mode_enabled` = `true`).
2. Storage limpo; abrir app; login.

**Validar:**
- useLoadData espera `waitUntilAuthReady()`; depois loadData; sync (`syncSharedExpensesFromBackend`) é chamado dentro de loadData.
- Sync executa `isAuthReady()` e `ensureValidSession()` antes de chamar API; não aparece SYNC_BLOCKED_AUTH_NOT_READY após login bem-sucedido.
- Nenhum 401 nas chamadas de sync ou nas demais do dashboard.

**Critério de sucesso:** Sync só após auth; zero 401 no fluxo normal.

---

### Teste 14 — GOD MODE + Token Expirando Durante Sync

**Objetivo:** 401 no getReadModel → refresh → retry → sync continua.

**Simular:**
1. GOD MODE ativo; login; expirar token; disparar sync (ex.: recarregar página após login).

**Validar:**
- ensureValidSession pode disparar refresh (token expirado); ou getReadModel retorna 401 e interceptor faz refresh + retry.
- Console: 1 refresh; SYNC_SUCCESS ou retry do sync (até 2 tentativas com delay 2s).
- Sem SYNC_FAIL_401 sem recuperação; ou SYNC_FAIL_401 com retry e depois sucesso.

**Critério de sucesso:** Refresh → retry → sync continua; sem loop.

---

## CAMADA 10 — UX Resilience QA

**Validar em todos os cenários acima:**

- Usuário **não** vê tela quebrada (branco, crash).
- Usuário **não** vê erro técnico exposto (stack, 401 bruto) a menos que seja mensagem tratada.
- **Não** há loading infinito sem fim (timeout ou retry limitado).
- **Não** é necessário relogar aleatoriamente no meio do uso (exceto quando refresh falhou de fato ou logout durante refresh).

**Checklist rápido:** Login → dashboard → expirar token → ação → refresh → retry → sucesso sem relogar. Logout durante refresh → tela de login limpa. Multi-aba e 10 requests → 1 refresh, sem travamento.

---

## Testes Automatizáveis (Recomendado)

### Cypress / Playwright

**Automatizar:**

1. **Login → Dashboard:** storage limpo → login → checar que não há 401 nas chamadas seguintes; opcional: checar AUTH_READY no console (se exposto ou via spy).
2. **Multi-request refresh:** token expirado (mock ou edição) → disparar N requests em paralelo → interceptar rede: 1 POST /auth/refresh; N retries com 200.
3. **Logout race:** token expirado → disparar request → antes da resposta do refresh, disparar logout → checar REFRESH_IGNORED_SESSION_VERSION_MISMATCH (console) e que não há token em localStorage após reload.
4. **Sync + refresh:** GOD MODE ativo; token expirado; disparar sync (navegar para dashboard) → 1 refresh; sync completa ou retry limitado.

### E2E com Network Mock

**Mockar:**

- POST `/api/auth/refresh`: lento (delay 15s), timeout (nunca resolve ou 404), ou falha 1x / sucesso 2ª.
- GET `/api/shared-expenses/read-model`: delay 15s para validar timeout/retry do sync.

**Assertivas:** REFRESH_TIMEOUT_ABORT quando refresh demora >10s; REFRESH_LOCK_RELEASED; no máximo 2 tentativas de sync com delay; redirect para /auth quando refresh falha.

---

## Métricas de Qualidade (Produção / Staging)

| Métrica | Definição | Alvo |
|---------|-----------|------|
| **Auth Success Rate** | % de sessões em que nenhum request protegido resulta em 401 “final” (após retry) visível ao usuário como erro. | Alto (ex.: >99% em sessões ativas). |
| **Refresh Success Rate** | % de chamadas POST /auth/refresh que retornam 200 vs 4xx/5xx/timeout. | Monitorar; degradação indica backend ou rede. |
| **Refresh Duplication Rate** | Em janelas de 1s, quantos refreshes por sessão. | Próximo de 0 em condições normais (1 refresh por “onda” de 401). |
| **SYNC_BLOCKED_AUTH_NOT_READY** | Contagem em produção. | Esperado em cold start antes de auth; não esperado após login estável. |
| **REFRESH_IGNORED_SESSION_VERSION_MISMATCH** | Contagem. | Indica logout durante refresh; esperado esporádico. |
| **REFRESH_TIMEOUT_ABORT** | Contagem. | Indica backend lento/rede ruim; alerta se alto. |

---

## Nível de QA Recomendado para o Projeto

| Camada | Manual | Automatizado | Observabilidade |
|--------|--------|--------------|-----------------|
| Auth Lifecycle (1–3) | Sim (smoke + regressão) | Login → dashboard; token expirado → refresh → retry | Logs em staging |
| Concorrência (4–5) | Sim (sprint/release) | Multi-request + multi-aba (Playwright/Cypress) | Métricas de refresh |
| Logout Race (6) | Sim (release) | Logout durante refresh (mock lento) | REFRESH_IGNORED_* |
| Sync (7–8) | Sim (GOD MODE) | Sync + token expirado; sync + backend lento | SYNC_* logs |
| Storage / Rede (9–10) | Amostral | — | — |
| Chaos (11–12) | Amostral / staging | Refresh falha 1x; rede cai durante refresh | Timeout / fail counts |
| Observabilidade (8) | Checagem de logs em cada release | — | Dashboards |
| GOD MODE (9) | Sempre que GOD MODE for usado | Sync após login; sync + 401 | SYNC_* |
| UX (10) | Checklist em smoke | — | — |

**Resumo:** Manual para fluxos críticos (auth, refresh, logout race, sync); automação para login → dashboard, multi-request refresh, logout race e sync + refresh; chaos e rede em staging/amostral; métricas e logs para produção.
