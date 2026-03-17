import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store-index";
import { loadInitialDataFromMeData } from "@/services/me-data.service";
import { waitUntilAuthReady } from "@/lib/auth-runtime-guard";
import { useSyncStore } from "@/stores/sync-store";

/**
 * Hook para carregar dados da API quando o usuário faz login.
 * Story 3.1: uma única chamada GET /api/me/data popula todos os stores (transactions, accounts, categories, envelopes, goals, sharedExpenses).
 * Só inicia após auth estar pronto (waitUntilAuthReady + user autenticado).
 */
export function useLoadData() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const authReady = await waitUntilAuthReady();
      if (cancelled || !authReady) return;

      const state = useAuthStore.getState();
      if (!state.isAuthenticated || !state.user) {
        return;
      }

      try {
        useSyncStore.getState().setSyncing();
        await loadInitialDataFromMeData();
        useSyncStore.getState().setSynced();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao carregar dados";
        useSyncStore.getState().setError(msg);
        // Store permanece intacto; não quebra a UI
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  return {
    /** Recarrega estado inicial via GET /me/data (mesma fonte que o load pós-login). */
    reload: () => {
      if (isAuthenticated && user) {
        useSyncStore.getState().setSyncing();
        loadInitialDataFromMeData()
          .then(() => useSyncStore.getState().setSynced())
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "Falha ao recarregar";
            useSyncStore.getState().setError(msg);
            console.error("Erro ao recarregar dados:", err);
          });
      }
    },
  };
}
