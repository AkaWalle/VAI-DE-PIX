/**
 * Access token só em memória (OWASP Top 10 A07:2021 Identification and Authentication Failures).
 * XSS no SPA não persiste o JWT. Refresh permanece em cookie HttpOnly.
 * Módulo isolado para http-client e auth-runtime-guard sem dependência circular.
 */

const LEGACY_TOKEN_KEYS = ["vai-de-pix-token", "token"] as const;

let accessToken: string | null = null;

function purgeLegacyStorages(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function getTokenForRequest(): string | null {
  return accessToken;
}

/** Zera a variável e remove leftovers de storage (sem side effects de lock). */
export function clearAllTokensStoragesOnly(): void {
  accessToken = null;
  purgeLegacyStorages();
}

export const tokenManager = {
  get: (): string | null => accessToken,

  set: (token: string): void => {
    accessToken = token;
    purgeLegacyStorages();
  },

  remove: (): void => {
    accessToken = null;
    purgeLegacyStorages();
  },

  isValid: (): boolean => {
    const token = tokenManager.get();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },
};
