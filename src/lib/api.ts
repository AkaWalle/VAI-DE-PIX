// API configuration for VAI DE PIX
// Em produção, VITE_API_URL deve estar configurada no Vercel
// Em desenvolvimento, usa localhost como fallback
// Para Raspberry Pi, detecta automaticamente o hostname/IP
const getApiBaseURL = () => {
  // Prioridade 1: localStorage (permite override manual)
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem("vai-de-pix-api-url");
    if (storedUrl) {
      return storedUrl;
    }
  }
  
  // Prioridade 2: Variável de ambiente (obrigatória em produção)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Prioridade 3: Detectar hostname/IP automaticamente (funciona em dev e prod)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    
    // Se não for localhost/127.0.0.1, usar o hostname/IP atual
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Se porta 80 ou 443, não incluir porta na URL
      if (port === '80' || port === '443' || !port) {
        return `${window.location.protocol}//${hostname}/api`;
      }
      return `${window.location.protocol}//${hostname}:${port}/api`;
    }
    
    // Se for localhost em produção, usar URL relativa (Vercel serverless)
    if (import.meta.env.PROD) {
      return "/api";
    }
  }
  
  // Prioridade 4: Desenvolvimento local
  return "http://localhost:8000/api";
};

// Função para obter baseURL dinamicamente (chamada em runtime)
export const getApiBaseURLDynamic = () => {
  return getApiBaseURL();
};

export const API_CONFIG = {
  get baseURL() {
    // Usar getter para calcular dinamicamente em runtime
    return getApiBaseURL();
  },
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
