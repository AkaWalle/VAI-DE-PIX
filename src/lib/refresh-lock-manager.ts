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

const LOCK_LOG_PREFIX = "[RefreshLock]";

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
    if (import.meta.env.DEV) {
      console.log(`${LOCK_LOG_PREFIX} REFRESH_WAITED_OTHER_TAB`, result);
    }
    return result;
  }

  if (typeof window !== "undefined") {
    console.log(`${LOCK_LOG_PREFIX} REFRESH_LOCK_ACQUIRED`);
    console.log(`${LOCK_LOG_PREFIX} TOKEN_REFRESH_START`);
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
      if (typeof window !== "undefined") {
        console.log(`${LOCK_LOG_PREFIX} TOKEN_REFRESH_${refreshResult ? "SUCCESS" : "FAIL"}`);
      }
      return refreshResult;
    } finally {
      broadcastRefreshDone(refreshResult);
      releaseCrossTabLock();
      if (import.meta.env.DEV && typeof window !== "undefined") {
        (window as unknown as { __REFRESH_LOCK_STATE__?: { hasActiveRefresh: boolean } }).__REFRESH_LOCK_STATE__ = {
          hasActiveRefresh: false,
        };
      }
      if (typeof window !== "undefined") {
        console.log(`${LOCK_LOG_PREFIX} REFRESH_LOCK_RELEASED`);
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
