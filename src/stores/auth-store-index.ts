/**
 * Exporta o store de autenticação usando sempre a API
 * Sistema configurado para usar apenas banco de dados via backend
 */

// Exporta diretamente o store da API
export { useAuthStore } from "./auth-store-api";

// Re-exportar tipos
export type { User, AuthState, AuthActions, AuthStore } from "./auth-store-api";
