import { usePersistence } from "../hooks/use-persistence";
import { useEffect } from "react";

/**
 * Componente para gerenciar a persistência de dados
 * Deve ser renderizado uma vez na aplicação
 */
export function PersistenceManager() {
  const { isDataPersisted } = usePersistence();

  useEffect(() => {
    // Log para debug
    if (isDataPersisted) {
      console.log("✅ Dados persistidos carregados com sucesso");
    } else {
      console.log("ℹ️ Nenhum dado persistido encontrado");
    }
  }, [isDataPersisted]);

  // Este componente não renderiza nada, apenas gerencia a persistência
  return null;
}
