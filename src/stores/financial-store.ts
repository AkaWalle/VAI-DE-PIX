import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  type: "income" | "expense";
  tags: string[];
  attachment?: string;
  recurring?: {
    frequency: "weekly" | "monthly" | "yearly";
    endDate?: string;
  };
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "card" | "refeicao" | "alimentacao";
  balance: number;
  currency: "BRL";
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
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
  period: "monthly" | "yearly" | "oneoff";
  dueDate?: string;
  status: "on_track" | "at_risk" | "achieved" | "overdue";
}

export interface Envelope {
  id: string;
  name: string;
  targetAmount?: number;
  balance: number;
  color: string;
  description?: string;
}

export interface SharedExpense {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: "BRL";
  category: string;
  date: string;
  createdBy: string; // ID do usuário que criou
  participants: SharedExpenseParticipant[];
  status: "pending" | "settled" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface SharedExpenseParticipant {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number; // Valor que a pessoa deve pagar
  paid: boolean;
  paidAt?: string;
}

export interface ExpenseSplit {
  id: string;
  sharedExpenseId: string;
  splitType: "equal" | "percentage" | "custom";
  splits: {
    userId: string;
    amount: number;
    percentage?: number;
  }[];
}

export interface AutomationRule {
  id: string;
  name: string;
  type: "threshold" | "goal_achieved" | "envelope_low";
  enabled: boolean;
  conditions: Record<string, unknown>;
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
  sharedExpenses: SharedExpense[];
  expenseSplits: ExpenseSplit[];

  // UI State
  selectedAccount: string | null;
  dateRange: { from: Date; to: Date };

  // Actions
  addTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => void;
  setTransactions: (transactions: Transaction[]) => void;

  addAccount: (account: Omit<Account, "id">) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  setAccounts: (accounts: Account[]) => void;

  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  setCategories: (categories: Category[]) => void;

  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setGoals: (goals: Goal[]) => void;

  addEnvelope: (envelope: Omit<Envelope, "id">) => void;
  updateEnvelope: (id: string, updates: Partial<Envelope>) => void;
  deleteEnvelope: (id: string) => void;
  setEnvelopes: (envelopes: Envelope[]) => void;
  transferBetweenEnvelopes: (
    fromId: string,
    toId: string,
    amount: number,
  ) => void;

  // Shared Expenses Actions
  addSharedExpense: (
    expense: Omit<SharedExpense, "id" | "createdAt" | "updatedAt">,
  ) => void;
  /** GOD MODE: Substitui lista por projeção do backend (sync). */
  setSharedExpenses: (expenses: SharedExpense[]) => void;
  updateSharedExpense: (id: string, updates: Partial<SharedExpense>) => void;
  deleteSharedExpense: (id: string) => void;
  markParticipantAsPaid: (expenseId: string, participantId: string) => void;
  settleSharedExpense: (id: string) => void;

  // Expense Split Actions
  createExpenseSplit: (split: Omit<ExpenseSplit, "id">) => void;
  updateExpenseSplit: (id: string, updates: Partial<ExpenseSplit>) => void;
  deleteExpenseSplit: (id: string) => void;

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
  getCashflow: (
    months: number,
  ) => Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  updateDateRangeToCurrentMonth: () => void;
}

// Dados mockados removidos - todos os dados agora vêm da API
// Os dados serão carregados do backend via API

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
      sharedExpenses: [],
      expenseSplits: [],

      // UI State
      selectedAccount: null,
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      },

      // Actions
      addTransaction: (transaction) =>
        set((state) => {
          // Update account balance when transaction is added
          const updatedAccounts = state.accounts.map((account) => {
            if (account.id === transaction.account) {
              if (transaction.type === "income") {
                return {
                  ...account,
                  balance: account.balance + Math.abs(transaction.amount),
                };
              } else {
                // expense
                return {
                  ...account,
                  balance: account.balance - Math.abs(transaction.amount),
                };
              }
            }
            return account;
          });

          return {
            transactions: [
              {
                ...transaction,
                id: generateUniqueId(),
                createdAt: new Date().toISOString(),
              },
              ...state.transactions,
            ],
            accounts: updatedAccounts,
          };
        }),

      updateTransaction: (id, updates) =>
        set((state) => {
          const oldTransaction = state.transactions.find((t) => t.id === id);
          if (!oldTransaction) return state;

          // Revert old transaction effect on account balance
          let updatedAccounts = state.accounts.map((account) => {
            if (account.id === oldTransaction.account) {
              if (oldTransaction.type === "income") {
                return {
                  ...account,
                  balance: account.balance - Math.abs(oldTransaction.amount),
                };
              } else {
                // expense
                return {
                  ...account,
                  balance: account.balance + Math.abs(oldTransaction.amount),
                };
              }
            }
            return account;
          });

          // Apply new transaction effect on account balance
          const newAccountId = updates.account || oldTransaction.account;
          const newType = updates.type || oldTransaction.type;
          const newAmount =
            updates.amount !== undefined
              ? updates.amount
              : oldTransaction.amount;

          updatedAccounts = updatedAccounts.map((account) => {
            if (account.id === newAccountId) {
              if (newType === "income") {
                return {
                  ...account,
                  balance: account.balance + Math.abs(newAmount),
                };
              } else {
                // expense
                return {
                  ...account,
                  balance: account.balance - Math.abs(newAmount),
                };
              }
            }
            return account;
          });

          return {
            transactions: state.transactions.map((t) =>
              t.id === id ? { ...t, ...updates } : t,
            ),
            accounts: updatedAccounts,
          };
        }),

      deleteTransaction: (id) =>
        set((state) => {
          const transaction = state.transactions.find((t) => t.id === id);
          if (!transaction) return state;

          // Revert transaction effect on account balance
          const updatedAccounts = state.accounts.map((account) => {
            if (account.id === transaction.account) {
              if (transaction.type === "income") {
                return {
                  ...account,
                  balance: account.balance - Math.abs(transaction.amount),
                };
              } else {
                // expense
                return {
                  ...account,
                  balance: account.balance + Math.abs(transaction.amount),
                };
              }
            }
            return account;
          });

          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            accounts: updatedAccounts,
          };
        }),

      clearAllTransactions: () =>
        set(() => ({
          transactions: [],
        })),

      setTransactions: (transactions) => set({ transactions }),

      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, { ...account, id: generateUniqueId() }],
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      setAccounts: (accounts) => set({ accounts }),

      addCategory: (category) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { ...category, id: generateUniqueId() },
          ],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      setCategories: (categories) => set({ categories }),

      addGoal: (goal) =>
        set((state) => ({
          goals: [
            ...state.goals,
            { ...goal, id: generateUniqueId(), currentAmount: 0 },
          ],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...updates } : g,
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      setGoals: (goals) => set({ goals }),

      addEnvelope: (envelope) =>
        set((state) => ({
          envelopes: [
            ...state.envelopes,
            { ...envelope, id: generateUniqueId() },
          ],
        })),

      updateEnvelope: (id, updates) =>
        set((state) => ({
          envelopes: state.envelopes.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        })),

      deleteEnvelope: (id) =>
        set((state) => ({
          envelopes: state.envelopes.filter((e) => e.id !== id),
        })),

      setEnvelopes: (envelopes) => set({ envelopes }),

      transferBetweenEnvelopes: (fromId, toId, amount) =>
        set((state) => ({
          envelopes: state.envelopes.map((e) => {
            if (e.id === fromId) return { ...e, balance: e.balance - amount };
            if (e.id === toId) return { ...e, balance: e.balance + amount };
            return e;
          }),
        })),

      // Shared Expenses Actions
      addSharedExpense: (expense) =>
        set((state) => ({
          sharedExpenses: [
            ...state.sharedExpenses,
            {
              ...expense,
              id: generateUniqueId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      setSharedExpenses: (expenses) =>
        set({ sharedExpenses: expenses }),

      updateSharedExpense: (id, updates) =>
        set((state) => ({
          sharedExpenses: state.sharedExpenses.map((expense) =>
            expense.id === id
              ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
              : expense,
          ),
        })),

      deleteSharedExpense: (id) =>
        set((state) => ({
          sharedExpenses: state.sharedExpenses.filter(
            (expense) => expense.id !== id,
          ),
          expenseSplits: state.expenseSplits.filter(
            (split) => split.sharedExpenseId !== id,
          ),
        })),

      markParticipantAsPaid: (expenseId, participantId) =>
        set((state) => ({
          sharedExpenses: state.sharedExpenses.map((expense) =>
            expense.id === expenseId
              ? {
                  ...expense,
                  participants: expense.participants.map((participant) =>
                    participant.userId === participantId
                      ? {
                          ...participant,
                          paid: true,
                          paidAt: new Date().toISOString(),
                        }
                      : participant,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : expense,
          ),
        })),

      settleSharedExpense: (id) =>
        set((state) => ({
          sharedExpenses: state.sharedExpenses.map((expense) =>
            expense.id === id
              ? {
                  ...expense,
                  status: "settled",
                  updatedAt: new Date().toISOString(),
                }
              : expense,
          ),
        })),

      // Expense Split Actions
      createExpenseSplit: (split) =>
        set((state) => ({
          expenseSplits: [
            ...state.expenseSplits,
            {
              ...split,
              id: generateUniqueId(),
            },
          ],
        })),

      updateExpenseSplit: (id, updates) =>
        set((state) => ({
          expenseSplits: state.expenseSplits.map((split) =>
            split.id === id ? { ...split, ...updates } : split,
          ),
        })),

      deleteExpenseSplit: (id) =>
        set((state) => ({
          expenseSplits: state.expenseSplits.filter((split) => split.id !== id),
        })),

      setSelectedAccount: (accountId) => set({ selectedAccount: accountId }),
      setDateRange: (range) => set({ dateRange: range }),

      // User management
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura mantida para compatibilidade
      initializeUserData: (_userId: string) => {
        // Inicializar dados vazios - dados virão da API
        const now = new Date();
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        const currentMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

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
            to: currentMonthEnd,
          },
        });
      },

      clearUserData: () => {
        const now = new Date();
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        const currentMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        set({
          transactions: [],
          accounts: [],
          categories: [],
          goals: [],
          envelopes: [],
          automationRules: [],
          sharedExpenses: [],
          expenseSplits: [],
          selectedAccount: null,
          dateRange: {
            from: currentMonthStart,
            to: currentMonthEnd,
          },
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
          const [y, m, d] = dateStr.split("-").map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        return transactions
          .filter((t) => {
            const transactionDate = parseLocalDate(t.date);
            return (
              t.type === "income" &&
              transactionDate >= dateRange.from &&
              transactionDate <= dateRange.to
            );
          })
          .reduce((total, t) => total + t.amount, 0);
      },

      getExpensesThisMonth: () => {
        const { transactions, dateRange } = get();
        const parseLocalDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split("-").map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        return transactions
          .filter((t) => {
            const transactionDate = parseLocalDate(t.date);
            return (
              t.type === "expense" &&
              transactionDate >= dateRange.from &&
              transactionDate <= dateRange.to
            );
          })
          .reduce((total, t) => total + Math.abs(t.amount), 0);
      },

      getTransactionsByCategory: () => {
        const { transactions } = get();
        return transactions.reduce(
          (acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(transaction);
            return acc;
          },
          {} as Record<string, Transaction[]>,
        );
      },

      getCashflow: (months) => {
        const { transactions } = get();
        const parseLocalDate = (dateStr: string) => {
          const [y, m, d] = dateStr.split("-").map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 12);
        };
        const result = [];

        for (let i = months - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
            0,
            0,
            0,
            0,
          );
          const monthEnd = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );

          const monthTransactions = transactions.filter((t) => {
            const tDate = parseLocalDate(t.date);
            return tDate >= monthStart && tDate <= monthEnd;
          });

          const income = monthTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const expense = monthTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          result.push({
            month: date.toLocaleDateString("pt-BR", {
              month: "short",
              year: "2-digit",
            }),
            income,
            expense,
            balance: income - expense,
          });
        }

        return result;
      },

      updateDateRangeToCurrentMonth: () => {
        const now = new Date();
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        const currentMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        set({
          dateRange: {
            from: currentMonthStart,
            to: currentMonthEnd,
          },
        });
      },
    }),
    {
      name: "vai-de-pix-financial",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
