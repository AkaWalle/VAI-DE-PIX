import { useEffect } from "react";
import { useAuthStore } from "../stores/auth-store-index";
import { useFinancialStore } from "../stores/financial-store";

/**
 * Hook para gerenciar a persistência de dados no localStorage
 * Garante que os dados sejam carregados corretamente ao inicializar a aplicação
 */
export function usePersistence() {
  const { user, isAuthenticated } = useAuthStore();
  const { initializeUserData } = useFinancialStore();

  useEffect(() => {
    // Verificar se há dados salvos no localStorage
    const checkStoredData = () => {
      try {
        // Verificar se há dados de autenticação salvos
        const authData = localStorage.getItem("vai-de-pix-auth");
        const financialData = localStorage.getItem("vai-de-pix-financial");

        if (authData) {
          const parsedAuth = JSON.parse(authData);

          // Se há usuário autenticado mas não há dados financeiros, inicializar
          if (parsedAuth.state?.user && parsedAuth.state?.isAuthenticated) {
            if (
              !financialData ||
              !JSON.parse(financialData).state?.transactions?.length
            ) {
              initializeUserData(parsedAuth.state.user.id);
            }
          }
        }
      } catch {
        // Ignorar erro ao ler localStorage
      }
    };

    // Executar verificação após um pequeno delay para garantir que os stores estejam prontos
    const timeoutId = setTimeout(checkStoredData, 100);

    return () => clearTimeout(timeoutId);
  }, [initializeUserData]);

  useEffect(() => {
    // Quando o usuário faz login, dados são persistidos automaticamente pelos stores.
  }, [user, isAuthenticated]);

  return {
    isDataPersisted: !!user && isAuthenticated,
    clearAllData: () => {
      localStorage.removeItem("vai-de-pix-auth");
      localStorage.removeItem("vai-de-pix-financial");
    },
  };
}
