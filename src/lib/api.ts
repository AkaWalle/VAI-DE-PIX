// API configuration for VAI DE PIX
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 10000,
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    logout: "/auth/logout",
  },

  // Transactions
  transactions: {
    list: "/transactions",
    create: "/transactions",
    update: (id: string) => `/transactions/${id}`,
    delete: (id: string) => `/transactions/${id}`,
    summary: "/transactions/summary/monthly",
  },

  // Goals
  goals: {
    list: "/goals",
    create: "/goals",
    update: (id: string) => `/goals/${id}`,
    delete: (id: string) => `/goals/${id}`,
    addValue: (id: string) => `/goals/${id}/add-value`,
  },

  // Envelopes
  envelopes: {
    list: "/envelopes",
    create: "/envelopes",
    update: (id: string) => `/envelopes/${id}`,
    delete: (id: string) => `/envelopes/${id}`,
    addValue: (id: string) => `/envelopes/${id}/add-value`,
    withdrawValue: (id: string) => `/envelopes/${id}/withdraw-value`,
  },

  // Categories
  categories: {
    list: "/categories",
    create: "/categories",
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },

  // Accounts
  accounts: {
    list: "/accounts",
    create: "/accounts",
    update: (id: string) => `/accounts/${id}`,
    delete: (id: string) => `/accounts/${id}`,
  },

  // Reports
  reports: {
    summary: "/reports/summary",
    cashflow: "/reports/cashflow",
    categories: "/reports/categories/summary",
    export: "/reports/export",
  },
} as const;
