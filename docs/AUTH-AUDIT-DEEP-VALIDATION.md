# Auditoria técnica profunda — Auth / Refresh / Sync / HTTP

**Objetivo:** Validar zero loops de refresh, zero race críticas, zero refresh duplicado, zero travamento de Promise, zero requests protegidos antes de auth ready, e observabilidade suficiente.

**Regras:** Apenas detectar + provar + classificar. Sem alteração de código. Evidência de código em todos os checks.

---

## FASE 1 — Validação dos 3 riscos principais

### CHECK 1 — Refresh fora do lock (Sync vs Interceptor)

#### 1️⃣ ensureValidSession chama o quê?

**Evidência:**

```85:98:src/lib/auth-runtime-guard.ts
export async function ensureValidSession(): Promise<boolean> {
  // ...
  const refreshed = await refreshAccessTokenIfAvailable();
  return refreshed;
}
```

- **Resposta:** Chama **refreshAccessTokenIfAvailable** direto (não usa runRefreshWithLock).

#### 2️⃣ Cenário onde Sync e Interceptor geram 2 refreshes simultâneos

**Caminho de import:**

- **Sync:** `shared-expenses-sync-engine.ts` → importa `ensureValidSession` de `auth-runtime-guard` → ensureValidSession chama `refreshAccessTokenIfAvailable()` (direto).
- **Interceptor:** `http-client.ts` → importa `runRefreshWithLock` de `refresh-lock-manager` → runRefreshWithLock chama `refreshAccessTokenIfAvailable()` (via lock).

**Fluxo real:**

1. Sync chama `ensureValidSession()` → token expirado → `refreshAccessTokenIfAvailable()` (fetch POST /auth/refresh) — **sem lock**.
2. Ao mesmo tempo um request via httpClient retorna 401 → interceptor chama `runRefreshWithLock()` → cria `refreshPromise` e chama `refreshAccessTokenIfAvailable()` — **com lock**.
3. Duas chamadas a `refreshAccessTokenIfAvailable()` podem estar em voo ao mesmo tempo → **2 POST /auth/refresh simultâneos**.

**Stack call simplificado:**

- **Sync:** syncSharedExpensesFromBackend → ensureValidSession → refreshAccessTokenIfAvailable (direto).
- **Interceptor:** response interceptor (401) → runRefreshWithLock → refreshAccessTokenIfAvailable (dentro da promise do lock).

**Classificação:** **Risco médio.** Dois refreshes paralelos são possíveis; impacto depende do backend (idempotência, rate limit). Não é deadlock nem loop; é uso redundante e possível condição de corrida no backend.

---

### CHECK 2 — Refresh sem timeout

**Evidência:**

```105:130:src/lib/auth-runtime-guard.ts
export async function refreshAccessTokenIfAvailable(): Promise<boolean> {
  // ...
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    // ...
  } catch {
    return false;
  }
}
```

- **Resposta:** Usa **fetch sem AbortController**; não há timeout; a Promise pode ficar **pendente indefinidamente** se o servidor não responder.

**Simulação mental — backend travado:**

1. Request A recebe 401 → interceptor chama runRefreshWithLock() → refreshAccessTokenIfAvailable() → fetch pendente.
2. refreshPromise não é liberada até o fetch resolver (finally só roda ao terminar).
3. **Lock nunca libera** até o fetch terminar (ou falhar por rede).
4. **Sync:** se sync chamou ensureValidSession() e token estava expirado, sync aguarda refreshAccessTokenIfAvailable() direto (fora do lock) — **sync também trava** na mesma fetch pendente.
5. **Interceptor:** outros requests 401 aguardam refreshPromise; todos ficam pendentes.

**Classificação impacto produção:** **Risco médio.** Backend travado ou rede muito lenta pode deixar todas as requisições que dependem de refresh (e o sync) travadas até timeout de rede do browser ou usuário fechar a aba. Não há loop; há bloqueio prolongado.

---

### CHECK 3 — Logout durante refresh

**Evidência — logout:**

```100:106:src/services/auth.service.ts
  logout(): void {
    clearAllTokens();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
```

```39:44:src/lib/http-client.ts
export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  resetRefreshLock();
  clearAllTokensStoragesOnly();
}
```

- resetRefreshLock() → `refreshPromise = null` (refresh-lock-manager.ts linha 43-44).
- A **Promise de refresh já em andamento** não é cancelada; ela continua até o fetch resolver.

**Timeline (milissegundo a milissegundo):**

| t (ms) | Evento |
|--------|--------|
| 0 | Request X 401 → interceptor chama runRefreshWithLock() → refreshPromise = Promise em execução (fetch /auth/refresh). |
| 50 | Usuário clica Logout → authService.logout() → clearAllTokens() → resetRefreshLock() → refreshPromise = null. **Storages limpos.** window.location.reload() é chamado. |
| 51 | Navegador inicia reload (pode não ser imediato). |
| 200 | Fetch de refresh (iniciado em t=0) **responde** no backend. Resposta chega ao cliente. |
| 201 | Promise do refresh resolve → tokenManager.set(data.access_token) é executado (guard linha 124). **Token é escrito após o clear.** |
| 202 | Interceptor do request X que estava aguardando refreshPromise recebe true → faz retry com config. **Retry acontece com o token recém-escrito.** |
| 203 | Reload (disparado em t=50) pode ainda não ter ocorrido; depende do event loop. |
| 500 | window.location.reload() efetivamente recarrega a página → estado limpo, sem token. |

**Respostas diretas:**

- **Refresh ainda escreve token depois?** Sim. A Promise já estava em voo; clearAllTokens não aborta o fetch; quando a resposta chega, o callback executa e tokenManager.set() é chamado.
- **Retry ainda acontece?** Sim. Quem estava aguardando refreshPromise recebe true e executa return httpClient.request(config).
- **Reload mata estado?** Sim, mas com atraso. Entre a escrita do token (t≈201) e o reload efetivo (t≈500+) existe janela onde o token está de volta no storage.
- **Janela de inconsistência?** Sim. Janela de ~300–500 ms (ou mais em máquina lenta) onde: storage foi limpo, depois reescrito pelo refresh, retry pode ter sucesso, e em seguida reload apaga tudo.

**Classificação:** **Risco médio.** Estado inconsistente por curto período; reload corrige. Pior caso: retry bem-sucedido e usuário vê dados por instante antes do reload.

---

## FASE 2 — Validação do pipeline Auth

### Token flow

| Onde | Evidência |
|------|-----------|
| **Token nasce** | Backend retorna access_token em POST /auth/login, POST /auth/register, POST /auth/refresh. auth.service.ts linhas 41, 63; auth-runtime-guard.ts linha 124. |
| **Token é salvo** | tokenManager.set(token) — token-manager.ts linha 31-34: localStorage.setItem(TOKEN_KEY, "vai-de-pix-token"). |
| **Token é lido** | getTokenForRequest() (http-client request interceptor) — token-manager.ts 8-15: localStorage TOKEN_KEY → localStorage "token" → sessionStorage "token". tokenManager.get() — só TOKEN_KEY (token-manager.ts 27-28). |
| **Token é invalidado** | clearAllTokens() → clearAllTokensStoragesOnly() — token-manager.ts 19-24: remove TOKEN_KEY, "token" (local e session). |

**Divergência getTokenForRequest vs tokenManager.get:**

- getTokenForRequest: 3 fontes (TOKEN_KEY, localStorage "token", sessionStorage "token").
- tokenManager.get: só TOKEN_KEY.
- **Risco:** Se algo gravar só em "token", getTokenForRequest retorna valor e tokenManager.get/isValid retornam null/false. Hoje login e refresh usam tokenManager.set(TOKEN_KEY), então estão alinhados.

---

### Storage consistency

| Storage | Uso |
|---------|-----|
| **Memory** | refreshPromise (refresh-lock-manager); redirectCount (http-client). Não espelham token; são estado de controle. |
| **localStorage** | TOKEN_KEY ("vai-de-pix-token"), "token". clearAllTokensStoragesOnly limpa ambos. |
| **sessionStorage** | "token". Limpo por clearAllTokensStoragesOnly. |
| **Cookie refresh** | HttpOnly, gerenciado pelo backend. Front não lê/escreve; apenas envia credentials: "include" no fetch de refresh. |

Sincronização: escrita de token é só via tokenManager.set (TOKEN_KEY). Limpeza é única (clearAllTokensStoragesOnly). Cookie não é limpo pelo front no logout; backend deve invalidar sessão.

---

### Bootstrap flow

**Evidência ProtectedRoute:**

```10:14:src/components/ProtectedRoute.tsx
  const { user, isAuthChecking } = useAuthStore();
  const hasToken = hasSessionToken();
  const userLoaded = user !== null;
```

```35:44:src/components/ProtectedRoute.tsx
  if (hasToken && isAuthChecking) {
    return ( /* loading "Carregando dados..." */ );
  }
  if (hasToken && !userLoaded) {
    navigate("/auth", ...);
  }
  return <>{children}</>;
```

- **ProtectedRoute impede render de children antes de:** (1) hasToken (hasSessionToken()), (2) **auth checking finished** (isAuthChecking === false), (3) **user loaded** (user !== null).
- **Conclusão:** Nenhum request protegido (MainLayout, NotificationBell, etc.) é montado antes de bootstrap terminar e user estar carregado.

---

## FASE 3 — HTTP Client / Interceptor hard check

### Request interceptor

**Evidência:**

```46:58:src/lib/http-client.ts
httpClient.interceptors.request.use(
  (config) => {
    const token = getTokenForRequest();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // ...
    }
    return config;
  },
  ...
);
```

- **Sempre injeta token?** Sim, sempre que getTokenForRequest() retorna valor (qualquer uma das 3 chaves).
- **Pode injetar token expirado?** Sim. getTokenForRequest não valida exp; token pode estar expirado.
- **Esperado?** Sim. Fluxo é: request com token (pode expirado) → 401 → refresh → retry.

### Response interceptor — 401 e retry

**Evidência:**

```72:86:src/lib/http-client.ts
    if (status === 401 && config && typeof window !== "undefined") {
      const retried = (config.__retriedByRefresh ?? 0) >= MAX_RETRY_AFTER_REFRESH;
      if (!retried) {
        const refreshed = await runRefreshWithLock();
        if (refreshed) {
          config.__retriedByRefresh = (config.__retriedByRefresh ?? 0) + 1;
          console.log(/* REQUEST_RETRY_AFTER_REFRESH */);
          return httpClient.request(config);
        }
        // ...
      }
    }
```

- **401 → refresh → retry:** Sim; retry só se refreshed === true.
- **Apenas 1 vez:** Sim. MAX_RETRY_AFTER_REFRESH = 1 (linha 18); (config.__retriedByRefresh ?? 0) >= 1 → retried = true → não entra no if (!retried) de novo.
- **Flags:** __retriedByRefresh incrementado em 1 após retry; na segunda 401 do mesmo request, retried é true e não há segundo retry.

---

## FASE 4 — Sync engine hard check

**Sequência real no código:**

```59:76:src/lib/shared-expenses-sync-engine.ts
export async function syncSharedExpensesFromBackend(): Promise<boolean> {
  if (!isAuthReady()) {
    console.warn(/* SYNC_BLOCKED_AUTH_NOT_READY */);
    return false;
  }
  const sessionOk = await ensureValidSession();
  if (!sessionOk) {
    console.warn(/* SYNC_BLOCKED_AUTH_NOT_READY (no valid session) */);
    return false;
  }
  console.log(/* SYNC_START */);
  // ...
  const data = await sharedExpenseApi.getReadModel();
```

Ordem: **isAuthReady()** → **ensureValidSession()** → **API CALL** (getReadModel). Confirmado.

**Simulação: token expira durante sync**

1. Sync passou em isAuthReady e ensureValidSession (token ainda válido).
2. getReadModel() é chamado (httpClient) → token já expirou no servidor → 401.
3. Interceptor: runRefreshWithLock() → refresh → tokenManager.set → retry getReadModel().
4. Retry com novo token → sync recebe dados e continua. **Esperado: 401 → refresh → retry → continuar sync.** Comportamento correto.

**Sync pode rodar durante refresh?** Sim. ensureValidSession pode estar aguardando refreshAccessTokenIfAvailable (ou o sync já passou e a chamada getReadModel está no interceptor em refresh). Em ambos os casos não há “bloqueio” do sync por “estado de refresh”; o sync ou já tem sessão válida ou está esperando ensureValidSession.

**Sync pode criar refresh paralelo?** Sim. ensureValidSession chama refreshAccessTokenIfAvailable direto; se ao mesmo tempo o interceptor chama runRefreshWithLock(), há dois refreshes (CHECK 1).

**Sync pode entrar em loop retry?** Não. Sync tem for com SYNC_MAX_RETRIES = 2 (até 2 tentativas) e depois return false. Não há loop infinito.

---

## FASE 5 — Concorrência extrema

### 10 requests simultâneos + token expirado

- Todos recebem 401; todos caem no interceptor; o primeiro que entra em runRefreshWithLock() cria refreshPromise; os outros 9 fazem return refreshPromise e aguardam a mesma Promise.
- **Resultado:** 1 refresh global, 10 requests retentados após refresh. **Confirmado.**

### Logout durante refresh

- logout() → clearAllTokens() → resetRefreshLock() (refreshPromise = null) + clearAllTokensStoragesOnly() → window.location.reload().
- A Promise de refresh em voo não é cancelada; quando resolver, pode escrever token e retry executar (janela de inconsistência); reload limpa estado. **Comportamento:** clear + reload; estado limpo após reload. Janela antes do reload descrita no CHECK 3.

### 3 abas + sync + refresh falha 1x

- Uma aba faz sync; token expirado; ensureValidSession chama refresh; refresh falha (rede) → ensureValidSession retorna false → sync não chama API (SYNC_BLOCKED_AUTH_NOT_READY).
- Outra aba: request 401 → interceptor → runRefreshWithLock → mesmo refresh (ou novo se lock já liberado) → falha → clearAllTokens + redirect.
- **Sem loop infinito.** Para “funcionar de novo” o usuário precisa fazer nova ação (login ou novo request após rede voltar). **Sistema recupera com nova ação do usuário.**

---

## FASE 6 — Fail safety

| Pergunta | Evidência | Resposta |
|----------|-----------|----------|
| Refresh falhou → sistema limpa sessão? | Interceptor: se !refreshed, cai no bloco status === 401 \|\| 403 → clearAllTokens() → redirect /auth. auth.store checkAuth catch → authService.logout(). | Sim. |
| Retry storm? | MAX_RETRY_AFTER_REFRESH = 1; __retriedByRefresh >= 1 impede novo retry. Sync: no máximo 2 tentativas com delay 2s. | Não. |
| Deadlock? | refreshPromise liberada no finally após refresh (refresh-lock-manager). Nenhum lock que espere outro. | Não. |
| Infinite redirect? | redirectCount++; if (redirectCount > 5) não redireciona, só log. Respostas 2xx zeram redirectCount. | Não. |

---

## FASE 7 — Observabilidade produção

**Presença real dos logs:**

| Log | Arquivo | Linha | Presente |
|-----|---------|--------|----------|
| AUTH_READY | auth-runtime-guard.ts | 52, 63 | Sim ("AUTH_READY (already)" / "(after wait)") |
| TOKEN_REFRESH_START | refresh-lock-manager.ts | 22 | Sim |
| TOKEN_REFRESH_SUCCESS | refresh-lock-manager.ts | 29 | Sim (template TOKEN_REFRESH_${ok ? "SUCCESS" : "FAIL"}) |
| TOKEN_REFRESH_FAIL | refresh-lock-manager.ts | 29 | Sim |
| REQUEST_RETRY_AFTER_REFRESH | http-client.ts | 80 | Sim |
| SYNC_BLOCKED_AUTH_NOT_READY | shared-expenses-sync-engine.ts | 64, 70 | Sim |
| SYNC_START | shared-expenses-sync-engine.ts | 74 | Sim (nome é SYNC_START, não SYNC_STARTED) |
| SYNC_FAIL_401 | shared-expenses-sync-engine.ts | 85 | Sim |

**O que falta:**

- **Correlation id / request id:** Não existe; nenhum interceptor adiciona x-request-id ou similar; logs não permitem agrupar por request.
- **Logout reason log:** Não há log explícito do tipo "LOGOUT_AFTER_REFRESH_FAIL" ou "REDIRECT_AFTER_401"; apenas clearAllTokens + redirect.

---

## FASE FINAL — Score produção

| Critério | Nota | Justificativa |
|----------|------|----------------|
| **Auth pipeline segurança** | 7/10 | Bootstrap + ProtectedRoute impedem requests antes de auth ready. Token flow claro; divergência getTokenForRequest vs tokenManager.get é baixa. Falta: guard usar lock no refresh. |
| **Race condition safety** | 6/10 | Lock no interceptor evita múltiplos refreshes entre requests. Sync pode disparar refresh paralelo (risco médio). Logout durante refresh gera janela de inconsistência. |
| **Refresh robustez** | 5/10 | Sem timeout no fetch → possível travamento. Sem cancelamento no logout. Lógica de retry e lock corretas. |
| **Observabilidade** | 5/10 | Logs principais presentes; TOKEN_INJECTED só em DEV. Falta correlation id e log de motivo de redirect/logout. |
| **Resiliência rede ruim** | 5/10 | Timeout axios 10s; refresh sem timeout. Rede ruim pode travar refresh ou deslogar após 401. |

---

## Resultado final obrigatório

**Classificação do sistema:** **Produção aceitável.**

- Zero loops de refresh (retry limitado; lock liberado).
- Zero deadlock (lock em finally).
- Refresh duplicado possível (sync vs interceptor) — risco médio.
- Travamento de Promise de refresh possível se backend/rede travar — risco médio.
- Zero requests protegidos antes de auth ready (ProtectedRoute + bootstrap).
- Observabilidade suficiente para debug básico; insuficiente para rastreio fino em produção.

---

### Top 10 riscos reais

1. **Refresh fora do lock no guard** — Sync e interceptor podem gerar 2 POST /auth/refresh simultâneos.
2. **Refresh sem timeout** — Fetch pode pendurar e travar sync + requests que aguardam lock.
3. **Logout durante refresh** — Token pode ser reescrito e retry executado antes do reload; janela de inconsistência.
4. **getTokenForRequest vs tokenManager.get** — Divergência se algo escrever só em "token"; baixa probabilidade.
5. **TOKEN_INJECTED só em DEV** — Produção sem log de “request com token” para debug.
6. **Sem correlation id** — Dificulta rastreio de incidentes com muitos usuários.
7. **redirectCount global** — Compartilhado entre abas (mesmo módulo); threshold 5 é por “processo”.
8. **useLoadData.reload()** — Não chama waitUntilAuthReady; impacto baixo (reload manual).
9. **Cookie de refresh não limpo no front** — Logout limpa só access token; backend deve invalidar sessão.
10. **Sync retry com delay fixo 2s** — Em latência alta pode parecer lento; não é storm.

---

### Top 5 melhorias seguras (sem refactor pesado)

1. **Guard usar runRefreshWithLock em ensureValidSession** — Exige quebrar ciclo (ex.: extrair refresh para módulo neutro); evita refresh duplicado.
2. **Timeout no fetch de refresh** — AbortController + 10–15 s; rejeitar e retornar false em timeout.
3. **Log antes de redirect em 401** — Ex.: "REDIRECT_AFTER_401" ou "LOGOUT_AFTER_REFRESH_FAIL" para observabilidade.
4. **Padronizar SYNC_START vs SYNC_STARTED** — Alinhar nome do log à documentação (cosmético).
5. **Opcional: header x-request-id** — Gerar no request interceptor e repetir nos logs para correlação.

---

### Bugs silenciosos possíveis

- **Token em localStorage "token" mas não em TOKEN_KEY:** hasSessionToken() true, getTokenForRequest() retorna valor, tokenManager.isValid() false → ensureValidSession pode tentar refresh; sync pode passar se refresh funcionar; UI que dependa só de tokenManager.get() pode mostrar “não logado”.
- **Persist rehydrate com user mas token expirado:** Bootstrap faz getProfile; 401 → interceptor refresh; se refresh falhar, logout + redirect. Não é silencioso.
- **Duas abas: uma faz logout, outra tinha request aguardando refresh:** Request da segunda aba pode receber resultado do refresh (true) após clear na primeira; retry usa token que já foi limpo na outra aba; compartilhamento de storage faz a primeira aba ter “voltado” o token até o reload. Reload na aba que fez logout resolve.

---

## Modo hard extra — 3 abas, sync, token expira, refresh falha, rede volta, novo request funciona

**Passo a passo:**

1. **Aba 1:** Sync rodando (getReadModel em voo). Token expira.
2. **Aba 2 e 3:** Requests normais (ex.: getUnreadCount) com mesmo token.
3. Backend retorna 401 para getReadModel (aba 1) e para os requests das abas 2 e 3.
4. **Interceptor (qualquer aba):** runRefreshWithLock() → refreshAccessTokenIfAvailable() → fetch /auth/refresh. Rede falha → fetch rejeita ou backend retorna 4xx → refreshed = false.
5. refreshPromise resolve false; finally → refreshPromise = null. Interceptor faz clearAllTokens() + redirect /auth. **Em todas as abas que recebem 401,** clearAllTokens é o mesmo (storages compartilhados); redirect leva para /auth. Usuário vê login em todas.
6. **Rede volta.** Usuário não fez logout explícito; já foi redirecionado. Para “novo request funcionar” o usuário precisa **fazer login de novo** (ou já estar na tela de login e logar). Não há “novo request” automático que tente refresh de novo sem nova ação (ex.: clicar em algo que dispare request).
7. Após login: token novo; requests usam interceptor; tudo normal.

**Conclusão:** Sistema não entra em loop. Após falha de refresh, clear + redirect; recuperação exige nova ação (login). “Rede volta” sozinha não dispara novo refresh; usuário precisa navegar/acionar algo que cause request. **Sistema recupera com nova ação do usuário (login).**

---

*Auditoria apenas de detecção e classificação. Nenhuma alteração de código ou sugestão de refactor estrutural.*
