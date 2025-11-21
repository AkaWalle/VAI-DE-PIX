import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store-index';
import { useFinancialStore } from '@/stores/financial-store';
import { transactionsService } from '@/services/transactions.service';
import { categoriesService } from '@/services/categories.service';
import { accountsService } from '@/services/accounts.service';

/**
 * Hook para carregar dados da API quando o usuário faz login
 */
export function useLoadData() {
  const { user, isAuthenticated } = useAuthStore();
  const { 
    transactions, 
    categories, 
    accounts,
    setTransactions,
    setCategories,
    setAccounts
  } = useFinancialStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const loadData = async () => {
      try {
        // Carregar categorias
        const loadedCategories = await categoriesService.getCategories();
        
        if (loadedCategories && loadedCategories.length > 0) {
          setCategories(loadedCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            type: cat.type as 'income' | 'expense',
            icon: cat.icon,
            color: cat.color,
          })));
        }

        // Carregar contas
        const loadedAccounts = await accountsService.getAccounts();
        
        if (loadedAccounts && loadedAccounts.length > 0) {
          setAccounts(loadedAccounts.map(acc => {
            // Mapear tipos do backend para tipos do frontend
            // FIXME: Backend usa account_type, frontend usa type localmente
            let frontendType: 'bank' | 'cash' | 'card' = 'bank';
            const accountType = (acc as any).account_type || (acc as any).type; // Suporta ambos durante migração
            if (accountType === 'cash') frontendType = 'cash';
            else if (accountType === 'credit') frontendType = 'card';
            else if (accountType === 'checking' || accountType === 'savings' || accountType === 'investment') frontendType = 'bank';
            
            return {
              id: acc.id,
              name: acc.name,
              type: frontendType,
              balance: acc.balance,
              currency: 'BRL' as const,
              color: '#3b82f6', // Cor padrão
            };
          }));
        }

        // Carregar transações
        const loadedTransactions = await transactionsService.getTransactions();
        
        if (loadedTransactions && loadedTransactions.length > 0) {
          setTransactions(loadedTransactions.map(t => ({
            id: t.id,
            date: t.date,
            account: ('account_id' in t ? (t as { account_id: string }).account_id : undefined) || ('account' in t ? (t as { account: string }).account : ''),
            category: ('category_id' in t ? (t as { category_id: string }).category_id : undefined) || ('category' in t ? (t as { category: string }).category : ''),
            type: t.type,
            amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
            description: t.description,
            tags: t.tags || [],
            createdAt: t.createdAt || new Date().toISOString(),
          })));
        }
      } catch (error: unknown) {
        // Erros são tratados silenciosamente - logging no backend
        // Em produção, pode-se adicionar toast de erro se necessário
      }
    };

    loadData();
  }, [isAuthenticated, user?.id, setCategories, setAccounts, setTransactions]);
  
  // Retornar função para recarregar manualmente se necessário
  return {
    reload: () => {
      if (isAuthenticated && user) {
        const loadData = async () => {
          try {
            const loadedCategories = await categoriesService.getCategories();
            if (loadedCategories && loadedCategories.length > 0) {
              setCategories(loadedCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                type: cat.type as 'income' | 'expense',
                icon: cat.icon,
                color: cat.color,
              })));
            }
            
            const loadedAccounts = await accountsService.getAccounts();
            if (loadedAccounts && loadedAccounts.length > 0) {
              setAccounts(loadedAccounts.map(acc => {
                // FIXME: Backend usa account_type, frontend usa type localmente
                let frontendType: 'bank' | 'cash' | 'card' = 'bank';
                const accountType = (acc as any).account_type || (acc as any).type; // Suporta ambos durante migração
                if (accountType === 'cash') frontendType = 'cash';
                else if (accountType === 'credit') frontendType = 'card';
                else if (accountType === 'checking' || accountType === 'savings' || accountType === 'investment') frontendType = 'bank';
                
                return {
                  id: acc.id,
                  name: acc.name,
                  type: frontendType,
                  balance: acc.balance,
                  currency: 'BRL' as const,
                  color: '#3b82f6',
                };
              }));
            }
            
            const loadedTransactions = await transactionsService.getTransactions();
            if (loadedTransactions && loadedTransactions.length > 0) {
              setTransactions(loadedTransactions.map(t => ({
                id: t.id,
                date: t.date,
                account: ('account_id' in t ? (t as { account_id: string }).account_id : undefined) || ('account' in t ? (t as { account: string }).account : ''),
                category: ('category_id' in t ? (t as { category_id: string }).category_id : undefined) || ('category' in t ? (t as { category: string }).category : ''),
                type: t.type,
                amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
                description: t.description,
                tags: t.tags || [],
                createdAt: t.createdAt || new Date().toISOString(),
              })));
            }
          } catch (error: unknown) {
            // Erros são tratados silenciosamente - logging no backend
          }
        };
        loadData();
      }
    }
  };
}

