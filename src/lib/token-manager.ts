/**
 * Gerenciamento de access token (sessionStorage).
 * SEGURANÇA: Migrado de localStorage para sessionStorage para reduzir janela de ataque XSS.
 * SessionStorage é limpo ao fechar a aba, reduzindo exposição do token.
 * Refresh tokens permanecem em HttpOnly cookies no backend.
 */

const TOKEN_KEY = "vai-de-pix-token";

export function getTokenForRequest(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem("token") ||
    // Fallback para localStorage apenas para migração (será removido após login)
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    null
  );
}

/** Remove token de todos os storages (sem side effects como reset de lock). */
export function clearAllTokensStoragesOnly(): void {
  if (typeof window === "undefined") return;
  // Limpar ambos storages (sessão atual + migração)
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("token");
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
}

export const tokenManager = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    // Priorizar sessionStorage
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;
    
    // Migração: se ainda existe em localStorage, mover para sessionStorage
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) {
      sessionStorage.setItem(TOKEN_KEY, localToken);
      localStorage.removeItem(TOKEN_KEY);
      return localToken;
    }
    
    return null;
  },

  set: (token: string): void => {
    if (typeof window !== "undefined") {
      // MUDANÇA: Armazenar em sessionStorage ao invés de localStorage
      sessionStorage.setItem(TOKEN_KEY, token);
      // Limpar localStorage se existir (migração)
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("token");
    }
  },

  remove: (): void => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      // Limpar localStorage também (para garantir migração completa)
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("token");
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
