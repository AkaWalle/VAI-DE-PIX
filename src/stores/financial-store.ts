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
  updateDateRangeToCurrentMonth: () => void;
}

// IDs dos usuários de teste que terão dados mockados
const TEST_USER_IDS = ['1', '2'];

// Mock data - apenas para usuários de teste
const mockAccounts: Account[] = [
  { id: '1', name: 'Conta Corrente', type: 'bank', balance: 18500.00, currency: 'BRL', color: '#22c55e' },
  { id: '2', name: 'Poupança', type: 'bank', balance: 12500.00, currency: 'BRL', color: '#3b82f6' },
  { id: '3', name: 'Carteira', type: 'cash', balance: 180.00, currency: 'BRL', color: '#f59e0b' },
  { id: '4', name: 'Cartão de Crédito', type: 'card', balance: -850.00, currency: 'BRL', color: '#ef4444' },
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

// Gerar transações realistas para um ano completo baseadas em salário de R$ 5.000
const generateYearlyTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const currentYear = new Date().getFullYear();
  let transactionId = 1;

  // Arrays de dados para variação realista
  const salaryVariations = [5000, 5000, 5200, 5000, 5000, 4800, 5000, 5000, 5000, 5000, 5000, 5500]; // Salários mensais
  const freelanceProjects = [
    { amount: 1200, description: 'Desenvolvimento App Mobile' },
    { amount: 800, description: 'Consultoria TI' },
    { amount: 1500, description: 'Projeto Website' },
    { amount: 600, description: 'Manutenção Sistema' },
    { amount: 2000, description: 'Desenvolvimento E-commerce' }
  ];

  const marketPlaces = ['Supermercado Extra', 'Carrefour', 'Pão de Açúcar', 'Atacadão', 'Mercado Municipal'];
  const transportOptions = ['Uber', '99', 'Taxi', 'Metrô', 'Ônibus', 'Gasolina'];
  const restaurants = ['McDonald\'s', 'Subway', 'Pizza Hut', 'Restaurante Local', 'Delivery iFood'];
  const healthExpenses = ['Farmácia', 'Consulta Médica', 'Exame Laboratorial', 'Dentista', 'Fisioterapia'];
  const educationExpenses = ['Curso Online', 'Livros Técnicos', 'Certificação', 'Workshop', 'Material Escolar'];

  // Gerar transações para cada mês do ano
  for (let month = 0; month < 12; month++) {
    const year = currentYear;
    const monthStr = String(month + 1).padStart(2, '0');
    
    // Salário mensal (dia 5 de cada mês)
    transactions.push({
      id: String(transactionId++),
      date: `${year}-${monthStr}-05`,
      account: '1',
      category: '6',
      description: 'Salário',
      amount: salaryVariations[month],
      type: 'income',
      tags: ['trabalho', 'mensal'],
      createdAt: new Date(year, month, 5).toISOString()
    });

    // Aluguel (dia 10 de cada mês)
    transactions.push({
      id: String(transactionId++),
      date: `${year}-${monthStr}-10`,
      account: '1',
      category: '3',
      description: 'Aluguel',
      amount: -1800,
      type: 'expense',
      tags: ['moradia', 'aluguel'],
      createdAt: new Date(year, month, 10).toISOString()
    });

    // Contas básicas (luz, água, internet) - dia 15
    transactions.push({
      id: String(transactionId++),
      date: `${year}-${monthStr}-15`,
      account: '1',
      category: '3',
      description: 'Contas Básicas (Luz, Água, Internet)',
      amount: -280,
      type: 'expense',
      tags: ['moradia', 'contas'],
      createdAt: new Date(year, month, 15).toISOString()
    });

    // Supermercado (2-3 vezes por mês)
    for (let i = 0; i < 3; i++) {
      const day = 8 + (i * 7) + Math.floor(Math.random() * 3);
      if (day <= 28) {
        transactions.push({
          id: String(transactionId++),
          date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
          account: '1',
          category: '1',
          description: marketPlaces[Math.floor(Math.random() * marketPlaces.length)],
          amount: -(180 + Math.random() * 120), // R$ 180-300
          type: 'expense',
          tags: ['alimentação', 'mercado'],
          createdAt: new Date(year, month, day).toISOString()
        });
      }
    }

    // Transporte (8-12 vezes por mês)
    for (let i = 0; i < 10; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const transport = transportOptions[Math.floor(Math.random() * transportOptions.length)];
      let amount = -15;
      
      if (transport === 'Gasolina') amount = -(80 + Math.random() * 40); // R$ 80-120
      else if (transport === 'Metrô' || transport === 'Ônibus') amount = -(4 + Math.random() * 2); // R$ 4-6
      else amount = -(12 + Math.random() * 18); // R$ 12-30 para Uber/99/Taxi

      transactions.push({
        id: String(transactionId++),
        date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
        account: Math.random() > 0.7 ? '4' : '1', // 30% no cartão
        category: '2',
        description: transport,
        amount: amount,
        type: 'expense',
        tags: ['transporte'],
        createdAt: new Date(year, month, day).toISOString()
      });
    }

    // Restaurantes/Lanches (4-6 vezes por mês)
    for (let i = 0; i < 5; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      transactions.push({
        id: String(transactionId++),
        date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
        account: Math.random() > 0.5 ? '4' : '1',
        category: '1',
        description: restaurants[Math.floor(Math.random() * restaurants.length)],
        amount: -(25 + Math.random() * 35), // R$ 25-60
        type: 'expense',
        tags: ['alimentação', 'restaurante'],
        createdAt: new Date(year, month, day).toISOString()
      });
    }

    // Freelance (1-2 projetos por mês, aleatório)
    if (Math.random() > 0.6) {
      const day = 15 + Math.floor(Math.random() * 14);
      const project = freelanceProjects[Math.floor(Math.random() * freelanceProjects.length)];
      transactions.push({
        id: String(transactionId++),
        date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
      account: '2',
      category: '7',
        description: project.description,
        amount: project.amount,
      type: 'income',
        tags: ['freelance', 'trabalho'],
        createdAt: new Date(year, month, day).toISOString()
      });
    }

    // Saúde (1-2 vezes por mês)
    if (Math.random() > 0.7) {
      const day = 1 + Math.floor(Math.random() * 28);
      const healthExpense = healthExpenses[Math.floor(Math.random() * healthExpenses.length)];
      let amount = -50;
      if (healthExpense === 'Consulta Médica') amount = -150;
      else if (healthExpense === 'Exame Laboratorial') amount = -200;
      else if (healthExpense === 'Dentista') amount = -300;

      transactions.push({
        id: String(transactionId++),
        date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
        account: '1',
        category: '4',
        description: healthExpense,
        amount: amount,
        type: 'expense',
        tags: ['saúde'],
        createdAt: new Date(year, month, day).toISOString()
      });
    }

    // Educação (1 vez por mês, ocasional)
    if (Math.random() > 0.8) {
      const day = 1 + Math.floor(Math.random() * 28);
      const educationExpense = educationExpenses[Math.floor(Math.random() * educationExpenses.length)];
      let amount = -80;
      if (educationExpense === 'Curso Online') amount = -200;
      else if (educationExpense === 'Certificação') amount = -400;

      transactions.push({
        id: String(transactionId++),
        date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
        account: '1',
        category: '5',
        description: educationExpense,
        amount: amount,
        type: 'expense',
        tags: ['educação'],
        createdAt: new Date(year, month, day).toISOString()
      });
    }

    // Outros gastos variados
    const otherExpenses = [
      { desc: 'Cinema', amount: -25, category: '4' },
      { desc: 'Livro', amount: -45, category: '5' },
      { desc: 'Roupas', amount: -120, category: '4' },
      { desc: 'Presente', amount: -80, category: '4' },
      { desc: 'Assinatura Netflix', amount: -32, category: '4' }
    ];

    // 2-3 outros gastos por mês
    for (let i = 0; i < 2; i++) {
      if (Math.random() > 0.5) {
        const day = 1 + Math.floor(Math.random() * 28);
        const expense = otherExpenses[Math.floor(Math.random() * otherExpenses.length)];
        transactions.push({
          id: String(transactionId++),
          date: `${year}-${monthStr}-${String(day).padStart(2, '0')}`,
          account: Math.random() > 0.6 ? '4' : '1',
          category: expense.category,
          description: expense.desc,
          amount: expense.amount,
          type: 'expense',
          tags: ['outros'],
          createdAt: new Date(year, month, day).toISOString()
        });
      }
    }
  }

  // Ordenar por data
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const mockTransactions: Transaction[] = generateYearlyTransactions();

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
    currentAmount: 650.00,
    category: '1',
    period: 'monthly',
    status: 'on_track'
  },
  {
    id: '3',
    name: 'Viagem Europa',
    targetAmount: 15000.00,
    currentAmount: 8500.00,
    period: 'oneoff',
    dueDate: '2025-06-01',
    status: 'on_track'
  },
  {
    id: '4',
    name: 'Notebook Novo',
    targetAmount: 4000.00,
    currentAmount: 2200.00,
    period: 'oneoff',
    dueDate: '2025-03-01',
    status: 'on_track'
  }
];

const mockEnvelopes: Envelope[] = [
  { id: '1', name: 'Emergência', balance: 18500.00, targetAmount: 30000.00, color: '#ef4444', description: 'Fundo de emergência 6 meses' },
  { id: '2', name: 'Viagem', balance: 8500.00, targetAmount: 15000.00, color: '#3b82f6', description: 'Europa 2025' },
  { id: '3', name: 'Casa Própria', balance: 12300.00, targetAmount: 80000.00, color: '#22c55e', description: 'Entrada apartamento' },
  { id: '4', name: 'Investimentos', balance: 12500.00, color: '#8b5cf6', description: 'Renda variável' },
  { id: '5', name: 'Notebook', balance: 2200.00, targetAmount: 4000.00, color: '#f59e0b', description: 'Notebook para trabalho' },
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
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        set({
          transactions: isTestUser ? mockTransactions : [],
          accounts: isTestUser ? mockAccounts : defaultAccounts,
          categories: isTestUser ? mockCategories : defaultCategories,
          goals: isTestUser ? mockGoals : [],
          envelopes: isTestUser ? mockEnvelopes : [],
          automationRules: [],
          selectedAccount: null,
          dateRange: {
            from: currentMonthStart,
            to: currentMonthEnd
          }
        });
      },

      clearUserData: () => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        set({
          transactions: [],
          accounts: [],
          categories: [],
          goals: [],
          envelopes: [],
          automationRules: [],
          selectedAccount: null,
          dateRange: {
            from: currentMonthStart,
            to: currentMonthEnd
          }
        });
      },
      
      // Computed values
      getTotalBalance: () => {
        const { accounts } = get();
        return accounts.reduce((total, account) => total + account.balance, 0);
      },
      
      getIncomeThisMonth: () => {
        const { transactions, dateRange } = get();
        const parseLocalDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        return transactions
          .filter(t => {
            const transactionDate = parseLocalDate(t.date);
            return t.type === 'income' && 
                   transactionDate >= dateRange.from && 
                   transactionDate <= dateRange.to;
          })
          .reduce((total, t) => total + t.amount, 0);
      },
      
      getExpensesThisMonth: () => {
        const { transactions, dateRange } = get();
        const parseLocalDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        return transactions
          .filter(t => {
            const transactionDate = parseLocalDate(t.date);
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
        const parseLocalDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        const result = [];
        
        for (let i = months - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const monthTransactions = transactions.filter(t => {
            const tDate = parseLocalDate(t.date);
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
      },
      
      updateDateRangeToCurrentMonth: () => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        set({
          dateRange: {
            from: currentMonthStart,
            to: currentMonthEnd
          }
        });
      }
    }),
    {
      name: 'financial-store',
    }
  )
);