/**
 * Refresh interno: fetch com timeout, session version guard e max retry global.
 * Único ponto que executa POST /auth/refresh; usado pelo lock (nunca direto pelo guard).
 */

import { tokenManager } from "./token-manager";
import {
  incrementRefreshTimeout,
  incrementRefreshSessionMismatch,
  incrementRefreshSkipMaxRetry,
  incrementRefreshSuccess,
} from "./metrics/auth-metrics";
import { notifyTokenRefreshSuccess } from "./token-refresh-notify";

const REFRESH_LOG_PREFIX = "[RefreshInternal]";

/** Timeout do fetch de refresh (ms). Backend travado → lock libera. */
export const REFRESH_TIMEOUT_MS = 10_000;

/** Máximo de falhas consecutivas de refresh antes de não tentar de novo (evita spam). */
export const MAX_REFRESH_RETRY_GLOBAL = 2;

/** Versão da sessão: logout incrementa; refresh só salva token se versão igual à capturada no início. */
let authSessionVersion = 0;

/** Falhas consecutivas de refresh; resetado em sucesso. */
let consecutiveRefreshFailures = 0;

export function getSessionVersion(): number {
  return authSessionVersion;
}

/** Chamado em logout (clearAllTokens) para que refresh in-flight ignore o token ao resolver. */
export function incrementSessionVersion(): void {
  authSessionVersion += 1;
}

/** Reseta contador de falhas consecutivas (ex.: após login/registro). Nova sessão = nova cota de retry. */
export function resetRefreshRetryCount(): void {
  consecutiveRefreshFailures = 0;
}

/**
 * Executa o refresh real (fetch). Com timeout, session version check e max retry global.
 * Não usar direto: usar sempre via runRefreshWithLock (refresh-lock-manager).
 */
export async function refreshAccessTokenInternal(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (consecutiveRefreshFailures >= MAX_REFRESH_RETRY_GLOBAL) {
    if (typeof window !== "undefined") {
      console.warn(`${REFRESH_LOG_PREFIX} REFRESH_SKIP_MAX_RETRY_REACHED`);
    }
    incrementRefreshSkipMaxRetry();
    return false;
  }

  const capturedVersion = authSessionVersion;
  const url = `${window.location.origin}/api/auth/refresh`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      consecutiveRefreshFailures += 1;
      return false;
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      consecutiveRefreshFailures += 1;
      return false;
    }

    if (getSessionVersion() !== capturedVersion) {
      if (typeof window !== "undefined") {
        console.warn(`${REFRESH_LOG_PREFIX} REFRESH_IGNORED_SESSION_VERSION_MISMATCH`);
      }
      incrementRefreshSessionMismatch();
      return false;
    }

    tokenManager.set(data.access_token);
    consecutiveRefreshFailures = 0;
    incrementRefreshSuccess();
    notifyTokenRefreshSuccess();
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    consecutiveRefreshFailures += 1;
    if (err instanceof Error && err.name === "AbortError") {
      if (typeof window !== "undefined") {
        console.warn(`${REFRESH_LOG_PREFIX} REFRESH_TIMEOUT_ABORT`);
      }
      incrementRefreshTimeout();
    }
    return false;
  }
}
