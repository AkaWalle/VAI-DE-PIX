import { usePersistence } from "../hooks/use-persistence";
import { useEffect } from "react";

/**
 * Componente para gerenciar a persistência de dados
 * Deve ser renderizado uma vez na aplicação
 */
export function PersistenceManager() {
  const { isDataPersisted } = usePersistence();

  useEffect(() => {
    // Persistência gerenciada pelo usePersistence; sem side-effect visual aqui.
  }, [isDataPersisted]);

  // Este componente não renderiza nada, apenas gerencia a persistência
  return null;
}
