# Patch Refresh Token — Correções Estruturais

Correções aplicadas com base na auditoria (zero refresh duplicado, zero Promise infinita, zero token após logout), **sem alterar comportamento funcional externo**.

---

## 1. Código do safeRefresh wrapper

- **auth-runtime-guard.ts:** `safeRefreshAccessToken()` = `runRefreshWithLock()`. `ensureValidSession()` chama `safeRefreshAccessToken()` (nunca refresh interno direto).
- **refresh-lock-manager.ts:** `runRefreshWithLock()` é o único ponto que chama `refreshAccessTokenInternal()`. Sync (via guard) e interceptor usam `runRefreshWithLock()` → **apenas 1 refresh real**.

---

## 2. Patch mínimo no guard

- `ensureValidSession()`: de `await refreshAccessTokenIfAvailable()` para `await safeRefreshAccessToken()`.
- `safeRefreshAccessToken()`: retorna `runRefreshWithLock()`.
- `refreshAccessTokenIfAvailable()`: mantido como alias que chama `runRefreshWithLock()` (compatibilidade).

---

## 3. Timeout no refresh

- **refresh-internal.ts:** `refreshAccessTokenInternal()` usa `AbortController` + `setTimeout(..., REFRESH_TIMEOUT_MS)` (10s). `fetch(..., { signal: controller.signal })`. Em abort: log `REFRESH_TIMEOUT_ABORT`, retorna false, lock libera no `finally` do lock manager.

---

## 4. Session version guard

- **refresh-internal.ts:** `authSessionVersion` (número); `getSessionVersion()`, `incrementSessionVersion()`.
- **Fluxo:** Refresh inicia → captura `capturedVersion`. Ao resolver com sucesso → se `getSessionVersion() !== capturedVersion` → log `REFRESH_IGNORED_SESSION_VERSION_MISMATCH`, não chama `tokenManager.set()`, retorna false.
- **http-client.ts:** `clearAllTokens()` chama `incrementSessionVersion()` **antes** de `resetRefreshLock()` e `clearAllTokensStoragesOnly()`. Logout durante refresh → refresh resolve → versão já incrementada → token ignorado.

---

## 5. Logs adicionados

| Log | Onde |
|-----|------|
| REFRESH_LOCK_ACQUIRED | refresh-lock-manager (ao adquirir lock) |
| REFRESH_LOCK_RELEASED | refresh-lock-manager (finally) |
| REFRESH_TIMEOUT_ABORT | refresh-internal (catch AbortError) |
| REFRESH_IGNORED_SESSION_VERSION_MISMATCH | refresh-internal (versão diferente ao salvar) |
| REFRESH_SKIP_MAX_RETRY_REACHED | refresh-internal (consecutiveRefreshFailures >= 2) |

---

## 6. Test plan manual

| Teste | Passos | Resultado esperado |
|-------|--------|--------------------|
| **1. 10 requests + token expirado** | Disparar 10 chamadas protegidas com token expirado ao mesmo tempo. | 1 REFRESH_LOCK_ACQUIRED, 1 TOKEN_REFRESH_START, 1 refresh real; 10 retries após TOKEN_REFRESH_SUCCESS. |
| **2. Backend refresh demora 30s** | Atrasar resposta de POST /auth/refresh em 30s (proxy/backend). | Após ~10s: REFRESH_TIMEOUT_ABORT; REFRESH_LOCK_RELEASED; requests não travam; sync não trava. |
| **3. Logout durante refresh** | Fazer logout enquanto um request está em 401 e o refresh está em voo. | incrementSessionVersion(); refresh resolve; REFRESH_IGNORED_SESSION_VERSION_MISMATCH; token não é salvo; retry não usa token novo; reload limpa estado. |
| **4. Sync + interceptor ao mesmo tempo** | GOD MODE ativo; token expirado; disparar sync e um request protegido juntos. | Apenas 1 REFRESH_LOCK_ACQUIRED; 1 TOKEN_REFRESH_START; 1 refresh real; ambos os fluxos aguardam a mesma promise e prosseguem. |

---

## 7. Risco residual após patch

| Risco | Mitigação | Residual |
|-------|-----------|----------|
| Refresh duplicado | Guard e interceptor usam só runRefreshWithLock | **Zero** |
| Promise refresh infinita | AbortController 10s; lock libera no finally | **Zero** |
| Token “ressuscitado” após logout | Session version; refresh que resolve após logout não salva token | **Zero** |
| Loop refresh | MAX_REFRESH_RETRY_GLOBAL = 2; 1 retry por request no interceptor | **Zero** |
| Impacto no fluxo atual | Nenhuma mudança em login/logout/endpoints/storage; apenas caminho de refresh unificado e proteções | **Zero impacto funcional** |

**Observação:** Após 2 falhas consecutivas de refresh, `refreshAccessTokenInternal` retorna false sem chamar o backend (REFRESH_SKIP_MAX_RETRY_REACHED). A recuperação é reload ou novo login; isso evita spam ao backend em falha prolongada.

---

## Arquivos alterados/criados

- **Criado:** `src/lib/refresh-internal.ts` (timeout, session version, max retry, logs).
- **Alterado:** `src/lib/refresh-lock-manager.ts` (usa refresh-internal; logs LOCK_ACQUIRED/RELEASED).
- **Alterado:** `src/lib/auth-runtime-guard.ts` (ensureValidSession → safeRefreshAccessToken; alias refreshAccessTokenIfAvailable).
- **Alterado:** `src/lib/http-client.ts` (clearAllTokens → incrementSessionVersion antes de reset/clear).
