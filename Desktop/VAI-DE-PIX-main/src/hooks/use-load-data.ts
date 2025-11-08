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
      console.log('⏸️ Usuário não autenticado, pulando carregamento de dados');
      return;
    }

    console.log('✅ Usuário autenticado, iniciando carregamento de dados...', user);

    const loadData = async () => {
      try {
        console.log('🔄 Carregando dados da API...');
        
        // Carregar categorias
        console.log('📂 Carregando categorias...');
        const loadedCategories = await categoriesService.getCategories();
        console.log('✅ Categorias carregadas:', loadedCategories);
        
        if (loadedCategories && loadedCategories.length > 0) {
          setCategories(loadedCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            type: cat.type as 'income' | 'expense',
            icon: cat.icon,
            color: cat.color,
          })));
          console.log('✅ Categorias atualizadas no store');
        } else {
          console.warn('⚠️ Nenhuma categoria encontrada');
        }

        // Carregar contas
        console.log('💳 Carregando contas...');
        const loadedAccounts = await accountsService.getAccounts();
        console.log('✅ Contas carregadas:', loadedAccounts);
        
        if (loadedAccounts && loadedAccounts.length > 0) {
          setAccounts(loadedAccounts.map(acc => {
            // Mapear tipos do backend para tipos do frontend
            let frontendType: 'bank' | 'cash' | 'card' = 'bank';
            if (acc.type === 'cash') frontendType = 'cash';
            else if (acc.type === 'credit') frontendType = 'card';
            else if (acc.type === 'checking' || acc.type === 'savings' || acc.type === 'investment') frontendType = 'bank';
            
            return {
              id: acc.id,
              name: acc.name,
              type: frontendType,
              balance: acc.balance,
              currency: 'BRL' as const,
              color: '#3b82f6', // Cor padrão
            };
          }));
          console.log('✅ Contas atualizadas no store');
        } else {
          console.warn('⚠️ Nenhuma conta encontrada');
        }

        // Carregar transações
        console.log('💰 Carregando transações...');
        const loadedTransactions = await transactionsService.getTransactions();
        console.log('✅ Transações carregadas:', loadedTransactions.length);
        
        if (loadedTransactions && loadedTransactions.length > 0) {
          setTransactions(loadedTransactions.map(t => ({
            id: t.id,
            date: t.date,
            account: (t as any).account_id || t.account,
            category: (t as any).category_id || t.category,
            type: t.type,
            amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
            description: t.description,
            tags: t.tags || [],
            createdAt: t.createdAt || new Date().toISOString(),
          })));
          console.log('✅ Transações atualizadas no store');
        }
        
        console.log('✅ Dados carregados com sucesso!');
      } catch (error: any) {
        console.error('❌ Erro ao carregar dados da API:', error);
        console.error('❌ Detalhes do erro:', error.message);
        if (error.response) {
          console.error('❌ Status:', error.response.status);
          console.error('❌ Dados:', error.response.data);
        }
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
            console.log('🔄 Recarregando dados manualmente...');
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
                let frontendType: 'bank' | 'cash' | 'card' = 'bank';
                if (acc.type === 'cash') frontendType = 'cash';
                else if (acc.type === 'credit') frontendType = 'card';
                else if (acc.type === 'checking' || acc.type === 'savings' || acc.type === 'investment') frontendType = 'bank';
                
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
                account: (t as any).account_id || t.account,
                category: (t as any).category_id || t.category,
                type: t.type,
                amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
                description: t.description,
                tags: t.tags || [],
                createdAt: t.createdAt || new Date().toISOString(),
              })));
            }
          } catch (error) {
            console.error('Erro ao recarregar:', error);
          }
        };
        loadData();
      }
    }
  };
}

