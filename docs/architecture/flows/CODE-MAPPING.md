# Mapeamento Código → Fluxogramas

Fonte de verdade: código em `src/lib/` (estrutura plana). Nenhum subdiretório `auth/`, `http/`, `refresh/`, `sync/`, `metrics/`, `realtime/` — os módulos estão em `src/lib/*.ts` e `src/lib/metrics/*.ts`.

---

## Estrutura real do repositório

| Domínio | Arquivo real | Observação |
|---------|--------------|------------|
| HTTP / Interceptor | `src/lib/http-client.ts` | Interceptors request/response, clearAllTokens |
| Refresh lock | `src/lib/refresh-lock-manager.ts` | runRefreshWithLock, refreshPromise, resetRefreshLock |
| Refresh interno | `src/lib/refresh-internal.ts` | refreshAccessTokenInternal, session version, timeout |
| Cross-tab | `src/lib/cross-tab-refresh-coordinator.ts` | tryAcquireCrossTabLock, BroadcastChannel, lock TTL |
| Token | `src/lib/token-manager.ts` | Fonte única de token; set apenas em refresh ou login |
| Auth guard | `src/lib/auth-runtime-guard.ts` | isAuthReady, ensureValidSession, safeRefreshAccessToken |
| Auth session | `src/lib/auth-session.ts` | hasSessionToken (cookie/storage) |
| Sync engine | `src/lib/shared-expenses-sync-engine.ts` | syncSharedExpensesFromBackend, getReadModel |
| Métricas | `src/lib/metrics/auth-metrics.ts` | increment*, hydrate, persist, export |
| Persistência métricas | `src/lib/metrics/metrics-storage.ts` | getStoredMetrics, setStoredMetrics, IndexedDB/localStorage |
| Token refresh notify | `src/lib/token-refresh-notify.ts` | notifyTokenRefreshSuccess, registerTokenRefreshListener |
| WebSocket realtime | `src/services/activityFeedRealtime.ts` | connect, reconnectIfConnected, WS_TOKEN_DRIFT |

---

## Constantes extraídas do código (não inferidas)

| Constante | Valor | Arquivo | Uso no fluxo |
|-----------|-------|---------|--------------|
| **REFRESH_TIMEOUT_MS** | 10_000 | refresh-internal.ts | Timeout do fetch POST /auth/refresh; AbortController |
| **MAX_REFRESH_RETRY_GLOBAL** | 2 | refresh-internal.ts | Falhas consecutivas antes de skip (incrementRefreshSkipMaxRetry) |
| **MAX_RETRY_AFTER_REFRESH** | 1 | http-client.ts | Máximo de retry do mesmo request após refresh (anti-loop) |
| **REDIRECT_LOOP_THRESHOLD** | 5 | http-client.ts | Máximo redirects para /auth antes de reset |
| **LOCK_TTL_MS** | 15_000 | cross-tab-refresh-coordinator.ts | TTL do lock cross-tab (localStorage); > REFRESH_TIMEOUT_MS |
| **WAIT_RESULT_MS** | 14_000 | cross-tab-refresh-coordinator.ts | Timeout de espera por resultado de outra aba (BroadcastChannel) |
| **PERSIST_DEBOUNCE_MS** | 500 | auth-metrics.ts | Debounce antes de setStoredMetrics |
| **EXPORT_INTERVAL_MS** | 60_000 | auth-metrics.ts | setInterval para exportAuthMetricsToBackend(false) |
| **MAX_RETRY_QUEUE** | 100 | auth-metrics.ts | Tamanho máximo da fila de reenvio em falha de export |
| **WAIT_AUTH_READY_TIMEOUT_MS** | 15_000 | auth-runtime-guard.ts | Timeout de waitUntilAuthReady |
| **WAIT_AUTH_POLL_MS** | 100 | auth-runtime-guard.ts | Intervalo de polling em waitUntilAuthReady |
| **SYNC_RETRY_DELAY_MS** | 2000 | shared-expenses-sync-engine.ts | Delay entre tentativas de sync |
| **SYNC_MAX_RETRIES** | 2 | shared-expenses-sync-engine.ts | Tentativas de getReadModel antes de desistir |
| **WS_TOKEN_DRIFT (threshold)** | 10_000 (hardcoded) | activityFeedRealtime.ts | Janela em ms: se WS fechar dentro de 10s após refresh success → log [WS_TOKEN_DRIFT] |

Não existe constante nomeada `WS_TOKEN_DRIFT_THRESHOLD` no código; o valor 10_000 aparece inline em `onclose`.

---

## Contratos entre módulos (ordem de execução real)

- **Interceptor** nunca chama refresh direto: sempre `runRefreshWithLock()`.
- **Guard** nunca chama refresh direto: `safeRefreshAccessToken()` → `runRefreshWithLock()`.
- **Refresh interno** só é chamado por `refresh-lock-manager`; nunca por guard ou interceptor.
- **Token** só é escrito por: login/register (fora destes arquivos) ou `tokenManager.set()` em refresh-internal após session version check.
- **Lock** é liberado no `finally` de runRefreshWithLock (sempre); cross-tab lock é liberado em releaseCrossTabLock (apenas se tabId for desta aba).

Este documento deve ser atualizado quando constantes ou arquivos forem renomeados ou movidos.
