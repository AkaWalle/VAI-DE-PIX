/**
 * Auth Runtime Guard — garante que sync e requests protegidos só rodem
 * após auth confirmado e token válido (ou refresh bem-sucedido).
 * Não substitui auth existente; camada protetora adicional.
 */

import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { tokenManager } from "@/lib/token-manager";
import { runRefreshWithLock } from "@/lib/refresh-lock-manager";

const AUTH_LOG_PREFIX = "[AuthGuard]";

/** Máximo de espera por auth ready (ms) para evitar espera infinita */
const WAIT_AUTH_READY_TIMEOUT_MS = 15_000;
const WAIT_AUTH_POLL_MS = 100;

/**
 * Auth está "pronto" quando o bootstrap terminou e sabemos se temos sessão ou não.
 * true = isAuthChecking === false (bootstrap já rodou).
 */
export function isAuthReady(): boolean {
  if (typeof window === "undefined") return false;
  const state = useAuthStore.getState();
  return state.isAuthChecking === false;
}

/**
 * Temos access token presente e não expirado (decodifica JWT exp).
 */
export function hasValidAccessToken(): boolean {
  if (typeof window === "undefined") return false;
  return tokenManager.isValid();
}

/**
 * Temos algum token em storage (pode estar expirado).
 */
export function hasAnySessionToken(): boolean {
  return hasSessionToken();
}

/**
 * Aguarda até isAuthReady() ser true ou timeout.
 * Uso: await waitUntilAuthReady() antes de loadData/sync.
 */
export function waitUntilAuthReady(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    if (isAuthReady()) {
      if (typeof window !== "undefined") {
        console.log(`${AUTH_LOG_PREFIX} AUTH_READY (already)`);
      }
      resolve(true);
      return;
    }

    const deadline = Date.now() + WAIT_AUTH_READY_TIMEOUT_MS;
    const t = setInterval(() => {
      if (isAuthReady()) {
        clearInterval(t);
        if (typeof window !== "undefined") {
          console.log(`${AUTH_LOG_PREFIX} AUTH_READY (after wait)`);
        }
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        clearInterval(t);
        if (typeof window !== "undefined") {
          console.warn(`${AUTH_LOG_PREFIX} AUTH_READY timeout`);
        }
        resolve(false);
      }
    }, WAIT_AUTH_POLL_MS);
  });
}

/**
 * Verifica se a sessão é válida para chamadas protegidas:
 * - Se não há token → false (não chamar API protegida).
 * - Se token válido (não expirado) → true.
 * - Se token existe mas expirado → tenta refresh; se refresh ok → true, senão false.
 * Não limpa tokens; apenas retorna se está ok para prosseguir.
 */
export async function ensureValidSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (hasValidAccessToken()) {
    return true;
  }

  if (!hasAnySessionToken()) {
    return false;
  }

  const refreshed = await safeRefreshAccessToken();
  return refreshed;
}

/**
 * Único ponto de refresh: passa pelo lock (evita refresh duplicado Sync vs Interceptor).
 * ensureValidSession e interceptor usam este caminho.
 */
export function safeRefreshAccessToken(): Promise<boolean> {
  return runRefreshWithLock();
}

/**
 * @deprecated Use safeRefreshAccessToken() ou runRefreshWithLock(). Mantido para compatibilidade.
 */
export async function refreshAccessTokenIfAvailable(): Promise<boolean> {
  return runRefreshWithLock();
}
