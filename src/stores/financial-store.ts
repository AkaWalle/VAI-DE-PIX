import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Função para gerar ID único compatível com todos os navegadores
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export interface Transaction {
  id: string;
  date: string;
  account: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  tags: string[];
  attachment?: string;
  recurring?: {
    frequency: 'weekly' | 'monthly' | 'yearly';
    endDate?: string;
  };
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'card';
  balance: number;
  currency: 'BRL';
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent?: string;
  icon: string;
  color: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  period: 'monthly' | 'yearly' | 'oneoff';
  dueDate?: string;
  status: 'on_track' | 'at_risk' | 'achieved' | 'overdue';
}

export interface Envelope {
  id: string;
  name: string;
  targetAmount?: number;
  balance: number;
  color: string;
  description?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: 'threshold' | 'goal_achieved' | 'envelope_low';
  enabled: boolean;
  conditions: Record<string, any>;
  webhookUrl?: string;
}

interface FinancialStore {
  // Data
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  envelopes: Envelope[];
  automationRules: AutomationRule[];
  
  // UI State
  selectedAccount: string | null;
  dateRange: { from: Date; to: Date };
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => void;
  
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  addEnvelope: (envelope: Omit<Envelope, 'id'>) => void;
  updateEnvelope: (id: string, updates: Partial<Envelope>) => void;
  deleteEnvelope: (id: string) => void;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => void;
  
  setSelectedAccount: (accountId: string | null) => void;
  setDateRange: (range: { from: Date; to: Date }) => void;
  
  // User management
  initializeUserData: (userId: string) => void;
  clearUserData: () => void;
  
  // Computed values
  getTotalBalance: () => number;
  getIncomeThisMonth: () => number;
  getExpensesThisMonth: () => number;
  getTransactionsByCategory: () => Record<string, Transaction[]>;
  getCashflow: (months: number) => Array<{ month: string; income: number; expense: number; balance: number }>;
}

// IDs dos usuários de teste que terão dados mockados
const TEST_USER_IDS = ['1', '2'];

// Mock data - apenas para usuários de teste
const mockAccounts: Account[] = [
  { id: '1', name: 'Conta Corrente', type: 'bank', balance: 15420.50, currency: 'BRL', color: '#22c55e' },
  { id: '2', name: 'Poupança', type: 'bank', balance: 8900.00, currency: 'BRL', color: '#3b82f6' },
  { id: '3', name: 'Carteira', type: 'cash', balance: 250.00, currency: 'BRL', color: '#f59e0b' },
  { id: '4', name: 'Cartão de Crédito', type: 'card', balance: -1200.80, currency: 'BRL', color: '#ef4444' },
];

// Dados básicos para novos usuários
const defaultAccounts: Account[] = [
  { id: '1', name: 'Conta Principal', type: 'bank', balance: 0, currency: 'BRL', color: '#22c55e' },
  { id: '2', name: 'Carteira', type: 'cash', balance: 0, currency: 'BRL', color: '#f59e0b' },
];

// Categorias para usuários de teste
const mockCategories: Category[] = [
  { id: '1', name: 'Alimentação', type: 'expense', icon: '🍽️', color: '#f59e0b' },
  { id: '2', name: 'Transporte', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { id: '3', name: 'Moradia', type: 'expense', icon: '🏠', color: '#8b5cf6' },
  { id: '4', name: 'Saúde', type: 'expense', icon: '🏥', color: '#ef4444' },
  { id: '5', name: 'Educação', type: 'expense', icon: '📚', color: '#06b6d4' },
  { id: '6', name: 'Salário', type: 'income', icon: '💰', color: '#22c55e' },
  { id: '7', name: 'Freelance', type: 'income', icon: '💻', color: '#10b981' },
  { id: '8', name: 'Investimentos', type: 'income', icon: '📈', color: '#059669' },
];

// Categorias básicas para novos usuários
const defaultCategories: Category[] = [
  { id: '1', name: 'Alimentação', type: 'expense', icon: '🍽️', color: '#f59e0b' },
  { id: '2', name: 'Transporte', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { id: '3', name: 'Moradia', type: 'expense', icon: '🏠', color: '#8b5cf6' },
  { id: '4', name: 'Outros', type: 'expense', icon: '💳', color: '#6b7280' },
  { id: '5', name: 'Salário', type: 'income', icon: '💰', color: '#22c55e' },
  { id: '6', name: 'Outros', type: 'income', icon: '💵', color: '#10b981' },
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2024-08-30',
    account: '1',
    category: '6',
    description: 'Salário - Agosto',
    amount: 8500.00,
    type: 'income',
    tags: ['trabalho', 'mensal'],
    createdAt: '2024-08-30T10:00:00Z'
  },
  {
    id: '2',
    date: '2024-08-29',
    account: '1',
    category: '1',
    description: 'Supermercado Extra',
    amount: -320.50,
    type: 'expense',
    tags: ['mercado', 'alimentação'],
    createdAt: '2024-08-29T18:30:00Z'
  },
  {
    id: '3',
    date: '2024-08-28',
    account: '4',
    category: '2',
    description: 'Uber',
    amount: -25.80,
    type: 'expense',
    tags: ['transporte', 'uber'],
    createdAt: '2024-08-28T14:15:00Z'
  },
  {
    id: '4',
    date: '2024-08-27',
    account: '1',
    category: '3',
    description: 'Aluguel - Setembro',
    amount: -1800.00,
    type: 'expense',
    tags: ['aluguel', 'moradia'],
    createdAt: '2024-08-27T09:00:00Z'
  },
  {
    id: '5',
    date: '2024-08-26',
    account: '2',
    category: '7',
    description: 'Projeto Website',
    amount: 2500.00,
    type: 'income',
    tags: ['freelance', 'desenvolvimento'],
    createdAt: '2024-08-26T16:45:00Z'
  }
];

const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'Reserva de Emergência',
    targetAmount: 30000.00,
    currentAmount: 18500.00,
    period: 'oneoff',
    status: 'on_track'
  },
  {
    id: '2',
    name: 'Limite Alimentação',
    targetAmount: 800.00,
    currentAmount: 320.50,
    category: '1',
    period: 'monthly',
    status: 'on_track'
  },
  {
    id: '3',
    name: 'Viagem Europa',
    targetAmount: 15000.00,
    currentAmount: 5200.00,
    period: 'oneoff',
    dueDate: '2025-06-01',
    status: 'at_risk'
  }
];

const mockEnvelopes: Envelope[] = [
  { id: '1', name: 'Emergência', balance: 18500.00, targetAmount: 30000.00, color: '#ef4444', description: 'Fundo de emergência 6 meses' },
  { id: '2', name: 'Viagem', balance: 5200.00, targetAmount: 15000.00, color: '#3b82f6', description: 'Europa 2025' },
  { id: '3', name: 'Casa Própria', balance: 12300.00, targetAmount: 80000.00, color: '#22c55e', description: 'Entrada apartamento' },
  { id: '4', name: 'Investimentos', balance: 8900.00, color: '#8b5cf6', description: 'Renda variável' },
];

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      // Initial data - será definido dinamicamente baseado no usuário
      transactions: [],
      accounts: [],
      categories: [],
      goals: [],
      envelopes: [],
      automationRules: [],
      
      // UI State
      selectedAccount: null,
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      },
      
      // Actions
      addTransaction: (transaction) => set((state) => ({
        transactions: [
          {
            ...transaction,
            id: generateUniqueId(),
            createdAt: new Date().toISOString()
          },
          ...state.transactions
        ]
      })),
      
      updateTransaction: (id, updates) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      })),

      clearAllTransactions: () => set((state) => ({
        transactions: []
      })),
      
      addAccount: (account) => set((state) => ({
        accounts: [...state.accounts, { ...account, id: generateUniqueId() }]
      })),
      
      updateAccount: (id, updates) => set((state) => ({
        accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, { ...category, id: generateUniqueId() }]
      })),
      
      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, { ...goal, id: generateUniqueId(), currentAmount: 0 }]
      })),
      
      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      
      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      })),
      
      addEnvelope: (envelope) => set((state) => ({
        envelopes: [...state.envelopes, { ...envelope, id: generateUniqueId() }]
      })),
      
      updateEnvelope: (id, updates) => set((state) => ({
        envelopes: state.envelopes.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      
      deleteEnvelope: (id) => set((state) => ({
        envelopes: state.envelopes.filter(e => e.id !== id)
      })),
      
      transferBetweenEnvelopes: (fromId, toId, amount) => set((state) => ({
        envelopes: state.envelopes.map(e => {
          if (e.id === fromId) return { ...e, balance: e.balance - amount };
          if (e.id === toId) return { ...e, balance: e.balance + amount };
          return e;
        })
      })),
      
      setSelectedAccount: (accountId) => set({ selectedAccount: accountId }),
      setDateRange: (range) => set({ dateRange: range }),

      // User management
      initializeUserData: (userId: string) => {
        const isTestUser = TEST_USER_IDS.includes(userId);
        
        set({
          transactions: isTestUser ? mockTransactions : [],
          accounts: isTestUser ? mockAccounts : defaultAccounts,
          categories: isTestUser ? mockCategories : defaultCategories,
          goals: isTestUser ? mockGoals : [],
          envelopes: isTestUser ? mockEnvelopes : [],
          automationRules: [],
          selectedAccount: null,
          dateRange: {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          }
        });
      },

      clearUserData: () => set({
        transactions: [],
        accounts: [],
        categories: [],
        goals: [],
        envelopes: [],
        automationRules: [],
        selectedAccount: null,
        dateRange: {
          from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
      }),
      
      // Computed values
      getTotalBalance: () => {
        const { accounts } = get();
        return accounts.reduce((total, account) => total + account.balance, 0);
      },
      
      getIncomeThisMonth: () => {
        const { transactions, dateRange } = get();
        return transactions
          .filter(t => {
            const transactionDate = new Date(t.date);
            return t.type === 'income' && 
                   transactionDate >= dateRange.from && 
                   transactionDate <= dateRange.to;
          })
          .reduce((total, t) => total + t.amount, 0);
      },
      
      getExpensesThisMonth: () => {
        const { transactions, dateRange } = get();
        return transactions
          .filter(t => {
            const transactionDate = new Date(t.date);
            return t.type === 'expense' && 
                   transactionDate >= dateRange.from && 
                   transactionDate <= dateRange.to;
          })
          .reduce((total, t) => total + Math.abs(t.amount), 0);
      },
      
      getTransactionsByCategory: () => {
        const { transactions } = get();
        return transactions.reduce((acc, transaction) => {
          const category = transaction.category;
          if (!acc[category]) acc[category] = [];
          acc[category].push(transaction);
          return acc;
        }, {} as Record<string, Transaction[]>);
      },
      
      getCashflow: (months) => {
        const { transactions } = get();
        const result = [];
        
        for (let i = months - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= monthStart && tDate <= monthEnd;
          });
          
          const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
          const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          
          result.push({
            month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            income,
            expense,
            balance: income - expense
          });
        }
        
        return result;
      }
    }),
    {
      name: 'financial-store',
    }
  )
);