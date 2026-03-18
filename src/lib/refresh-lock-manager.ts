/**
 * Refresh Lock Manager — evita múltiplos refresh em paralelo.
 * N requests com 401 → 1 refresh → todos aguardam o mesmo resultado e retentam.
 * Único caminho de refresh: runRefreshWithLock() → refreshAccessTokenInternal().
 *
 * Cross-tab: apenas UMA aba executa o refresh; outras aguardam via BroadcastChannel.
 * Lock com TTL em localStorage; recuperação automática se a aba líder travar.
 */

import { refreshAccessTokenInternal } from "./refresh-internal";
import { incrementRefreshCalls } from "./metrics/auth-metrics";
import {
  tryAcquireCrossTabLock,
  releaseCrossTabLock,
  broadcastRefreshStarted,
  broadcastRefreshDone,
  waitForRefreshResultFromOtherTab,
} from "./cross-tab-refresh-coordinator";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Executa refresh uma única vez; chamadas concorrentes (e outras abas) aguardam o mesmo resultado.
 * Retorna true se novo token foi obtido, false caso contrário.
 * Guard e interceptor devem usar APENAS esta função para refresh.
 */
export async function runRefreshWithLock(): Promise<boolean> {
  if (refreshPromise !== null) {
    return refreshPromise;
  }

  // Cross-tab: se outra aba já tem o lock, aguardamos o resultado (sem UI freeze; async).
  if (typeof window !== "undefined" && !tryAcquireCrossTabLock()) {
    const result = await waitForRefreshResultFromOtherTab();
    return result;
  }

  broadcastRefreshStarted();
  incrementRefreshCalls();

  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __REFRESH_LOCK_STATE__?: { hasActiveRefresh: boolean } }).__REFRESH_LOCK_STATE__ = {
      hasActiveRefresh: true,
    };
  }

  let refreshResult = false;
  refreshPromise = (async () => {
    try {
      refreshResult = await refreshAccessTokenInternal();
      return refreshResult;
    } finally {
      broadcastRefreshDone(refreshResult);
      releaseCrossTabLock();
      if (import.meta.env.DEV && typeof window !== "undefined") {
        (window as unknown as { __REFRESH_LOCK_STATE__?: { hasActiveRefresh: boolean } }).__REFRESH_LOCK_STATE__ = {
          hasActiveRefresh: false,
        };
      }
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Invalida o lock (ex.: após logout) para que próxima 401 tente refresh de novo.
 * Libera também o lock cross-tab para esta aba.
 */
export function resetRefreshLock(): void {
  refreshPromise = null;
  releaseCrossTabLock();
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __REFRESH_LOCK_STATE__?: { hasActiveRefresh: boolean } }).__REFRESH_LOCK_STATE__ = {
      hasActiveRefresh: false,
    };
  }
}
