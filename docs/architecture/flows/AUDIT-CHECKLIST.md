# Checklist de Auditoria — Fluxogramas vs Código

Use este checklist antes de fechar alterações em auth/refresh/sync/metrics/WS. Se qualquer item falhar, revisar fluxograma ou código.

---

## 1. Auth Request Lifecycle

- [ ] Interceptor de request usa getTokenForRequest e isPublicAuthUrl (http-client.ts).
- [ ] 401 só tenta refresh se (__retriedByRefresh ?? 0) < MAX_RETRY_AFTER_REFRESH (1).
- [ ] clearAllTokens chama exportAuthMetricsToBackend(true), incrementSessionVersion, resetRefreshLock, clearAllTokensStoragesOnly.
- [ ] Redirect para /auth respeita REDIRECT_LOOP_THRESHOLD (5).

---

## 2. Refresh Pipeline

- [ ] runRefreshWithLock usa refreshPromise (in-process) e tryAcquireCrossTabLock (cross-tab).
- [ ] refreshAccessTokenInternal usa REFRESH_TIMEOUT_MS (10s) e MAX_REFRESH_RETRY_GLOBAL (2).
- [ ] Session version: capturedVersion no início; getSessionVersion() === capturedVersion antes de tokenManager.set.
- [ ] finally sempre: broadcastRefreshDone(refreshResult), releaseCrossTabLock(), refreshPromise = null.

---

## 3. Multi-Tab Refresh

- [ ] tryAcquireCrossTabLock usa readLock e LOCK_TTL_MS (15s); writeLock + re-read para weWon.
- [ ] Followers usam waitForRefreshResultFromOtherTab com timeout WAIT_RESULT_MS (14s).
- [ ] BroadcastChannel CHANNEL_NAME "vdp_auth_refresh"; mensagem refresh_done com success.

---

## 4. Sync Engine

- [ ] syncSharedExpensesFromBackend verifica isAuthReady() e ensureValidSession() antes de getReadModel.
- [ ] ensureValidSession usa hasValidAccessToken, hasAnySessionToken, safeRefreshAccessToken → runRefreshWithLock.
- [ ] Retry: SYNC_MAX_RETRIES 2, SYNC_RETRY_DELAY_MS 2000.

---

## 5. Metrics Lifecycle

- [ ] hydrateAuthMetricsFromStorage só sobrescreve se isAllZeros(metrics).
- [ ] Cada increment* chama schedulePersist; debounce PERSIST_DEBOUNCE_MS 500.
- [ ] startAuthMetricsExportSchedule: setInterval EXPORT_INTERVAL_MS 60_000.
- [ ] exportAuthMetricsToBackend em falha push em retryQueue (máx. MAX_RETRY_QUEUE 100).

---

## 6. WebSocket Token Lifecycle

- [ ] notifyTokenRefreshSuccess chamado apenas em refresh-internal após tokenManager.set.
- [ ] reconnectIfConnected só age se ws?.readyState === WebSocket.OPEN.
- [ ] WS_TOKEN_DRIFT: onclose verifica getLastTokenRefreshSuccessTimestamp e janela 10_000 ms (hardcoded).

---

## Constantes — conferência rápida

| Constante | Valor esperado | Arquivo |
|-----------|----------------|---------|
| REFRESH_TIMEOUT_MS | 10_000 | refresh-internal.ts |
| MAX_REFRESH_RETRY_GLOBAL | 2 | refresh-internal.ts |
| MAX_RETRY_AFTER_REFRESH | 1 | http-client.ts |
| LOCK_TTL_MS | 15_000 | cross-tab-refresh-coordinator.ts |
| WAIT_RESULT_MS | 14_000 | cross-tab-refresh-coordinator.ts |
| PERSIST_DEBOUNCE_MS | 500 | auth-metrics.ts |
| EXPORT_INTERVAL_MS | 60_000 | auth-metrics.ts |
| MAX_RETRY_QUEUE | 100 | auth-metrics.ts |
| SYNC_MAX_RETRIES | 2 | shared-expenses-sync-engine.ts |
| SYNC_RETRY_DELAY_MS | 2000 | shared-expenses-sync-engine.ts |

Se algum valor divergir no código, atualizar este checklist e o CODE-MAPPING.md.
