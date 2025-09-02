import { usePersistence } from '../hooks/use-persistence';
import { useAuthStore } from '../stores/auth-store';
import { useFinancialStore } from '../stores/financial-store';
import { useState } from 'react';

/**
 * Componente de debug para mostrar informações sobre persistência
 * Apenas para desenvolvimento - pode ser removido em produção
 */
export function DebugPersistence() {
  const { isDataPersisted, clearAllData } = usePersistence();
  const { user, isAuthenticated } = useAuthStore();
  const { transactions, accounts, categories, goals, envelopes } = useFinancialStore();
  const [showDebug, setShowDebug] = useState(false);

  // Só mostrar em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-blue-500 text-white px-3 py-2 rounded text-xs font-mono"
      >
        Debug Persist
      </button>
      
      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-black text-white p-4 rounded text-xs font-mono max-w-sm">
          <div className="mb-2">
            <strong>🔐 Auth:</strong> {isAuthenticated ? '✅' : '❌'}
          </div>
          <div className="mb-2">
            <strong>👤 User:</strong> {user?.name || 'N/A'}
          </div>
          <div className="mb-2">
            <strong>💾 Persisted:</strong> {isDataPersisted ? '✅' : '❌'}
          </div>
          <div className="mb-2">
            <strong>📊 Data:</strong>
          </div>
          <div className="ml-2 text-xs">
            • Transações: {transactions.length}
          </div>
          <div className="ml-2 text-xs">
            • Contas: {accounts.length}
          </div>
          <div className="ml-2 text-xs">
            • Categorias: {categories.length}
          </div>
          <div className="ml-2 text-xs">
            • Metas: {goals.length}
          </div>
          <div className="ml-2 text-xs">
            • Envelopes: {envelopes.length}
          </div>
          <button
            onClick={clearAllData}
            className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
          >
            🗑️ Limpar Tudo
          </button>
        </div>
      )}
    </div>
  );
}
