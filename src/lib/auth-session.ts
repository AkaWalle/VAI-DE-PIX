/**
 * Helper de sessão para auth guard / router check.
 * Não confiar só em token: usuário logado = hasToken && userLoaded.
 * SEGURANÇA: Prioriza sessionStorage (menos persistente que localStorage).
 */

export function hasSessionToken(): boolean {
  if (typeof window === "undefined") return false;

  return Boolean(
    sessionStorage.getItem("vai-de-pix-token") ||
      sessionStorage.getItem("token") ||
      // Fallback para localStorage apenas durante migração
      localStorage.getItem("vai-de-pix-token") ||
      localStorage.getItem("token")
  );
}
