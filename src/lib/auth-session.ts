import { tokenManager } from "@/lib/token-manager";

/**
 * Helper de sessão para auth guard / router check.
 * Não confiar só em token: usuário logado = hasToken && userLoaded.
 * Access token vive em memória (token-manager), não em localStorage.
 */

export function hasSessionToken(): boolean {
  return Boolean(tokenManager.get());
}
