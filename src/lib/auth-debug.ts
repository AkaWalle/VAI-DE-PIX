/**
 * Debug hooks apenas em DEV: expõe snapshot read-only em window para QA/automação.
 * Não altera fluxo; apenas observabilidade.
 */

import { getAuthMetricsSnapshot } from "./metrics/auth-metrics";
import { getSessionVersion } from "./refresh-internal";

declare global {
  interface Window {
    __AUTH_DEBUG_STATE__?: Readonly<{
      metrics: ReturnType<typeof getAuthMetricsSnapshot>;
      sessionVersion: number;
    }>;
  }
}

const REQUEST_WITHOUT_TOKEN_WARN_THROTTLE_MS = 10_000;
let lastRequestWithoutTokenWarnTs = 0;

function updateAuthDebugState(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  try {
    const metrics = getAuthMetricsSnapshot();
    window.__AUTH_DEBUG_STATE__ = {
      metrics,
      sessionVersion: getSessionVersion(),
    };
    if (metrics.request_without_token_total > 0) {
      const now = Date.now();
      if (now - lastRequestWithoutTokenWarnTs >= REQUEST_WITHOUT_TOKEN_WARN_THROTTLE_MS) {
        lastRequestWithoutTokenWarnTs = now;
        console.warn("[AuthDebug] request_without_token_total > 0 — possível request protegido sem token", metrics.request_without_token_total);
      }
    }
  } catch {
    // ignore
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Ativa atualização periódica do __AUTH_DEBUG_STATE__ (apenas DEV). Chamar uma vez no bootstrap. */
export function attachAuthDebugHooks(): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  updateAuthDebugState();
  intervalId = setInterval(updateAuthDebugState, 1000);
}

/** Remove hooks (cleanup). */
export function detachAuthDebugHooks(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (typeof window !== "undefined") {
    delete (window as Window).__AUTH_DEBUG_STATE__;
  }
}
