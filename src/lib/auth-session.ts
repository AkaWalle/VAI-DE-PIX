/**
 * Helper de sessão para auth guard / router check.
 * Não confiar só em token: usuário logado = hasToken && userLoaded.
 */

export function hasSessionToken(): boolean {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("vai-de-pix-token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
  );
}
