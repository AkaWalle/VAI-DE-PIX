/**
 * Gerenciamento de access token (localStorage/sessionStorage).
 * Módulo isolado para uso por http-client e auth-runtime-guard sem dependência circular.
 */

const TOKEN_KEY = "vai-de-pix-token";

export function getTokenForRequest(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    null
  );
}

/** Remove token de todos os storages (sem side effects como reset de lock). */
export function clearAllTokensStoragesOnly(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

export const tokenManager = {
  get: (): string | null => {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  },

  set: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  remove: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
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
