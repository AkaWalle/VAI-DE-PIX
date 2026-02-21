// API configuration for VAI DE PIX
// Em produção, VITE_API_URL deve estar configurada no Vercel
// Em desenvolvimento, usa localhost como fallback
// Para Raspberry Pi, detecta automaticamente o hostname/IP
const getApiBaseURL = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL || "/api";
  }

  const hostname = window.location.hostname;
  const currentPort = window.location.port;

  // Produção (ex.: Vercel): mesma origem = usar /api (evita loop no celular e :8000 errado)
  if (import.meta.env.PROD && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const isSameOrigin = !currentPort || currentPort === '443' || currentPort === '80';
    if (isSameOrigin) {
      return "/api";
    }
    // Rede local com porta (ex.: Raspberry Pi)
    const protocol = window.location.protocol;
    const apiPort = currentPort || '8000';
    return `${protocol}//${hostname}:${apiPort}/api`;
  }

  // Prioridade 1: localStorage (em dev; em prod ignorar se for localhost para não travar no celular)
  const storedUrl = localStorage.getItem("vai-de-pix-api-url");
  if (storedUrl) {
    const isProdWithLocalhost = import.meta.env.PROD && (storedUrl.includes("localhost") || storedUrl.includes("127.0.0.1"));
    if (!isProdWithLocalhost) {
      return storedUrl;
    }
  }

  // Prioridade 2: Variável de ambiente
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Produção localhost (fallback)
  if (import.meta.env.PROD) {
    return "/api";
  }

  // Desenvolvimento local
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

  // Insights (variação mensal por categoria, metas em risco)
  insights: "/insights",
  insightsFeedback: "/insights/feedback",
  insightsPreferences: "/insights/preferences",

  // Shared expenses (despesas compartilhadas com confirmação)
  sharedExpenses: {
    list: "/shared-expenses",
    create: "/shared-expenses",
    delete: (expenseId: string) => `/shared-expenses/${expenseId}`,
    pending: "/shared-expenses/pending",
    readModel: "/shared-expenses/read-model",
    respond: (shareId: string) => `/shared-expenses/shares/${shareId}`,
    shareEvents: (shareId: string) => `/shared-expenses/shares/${shareId}/events`,
    fullDetails: (expenseId: string) => `/shared-expenses/${expenseId}/full-details`,
  },

  activityFeed: {
    list: "/activity-feed",
    unreadCount: "/activity-feed/unread-count",
    markRead: (id: string) => `/activity-feed/${id}/read`,
    markAllRead: "/activity-feed/read-all",
  },

  automations: {
    list: "/automations",
    get: (id: string) => `/automations/${id}`,
    create: "/automations",
    update: (id: string) => `/automations/${id}`,
    delete: (id: string) => `/automations/${id}`,
  },
} as const;

// Cliente HTTP central (com interceptor JWT) — usar para todas as requisições autenticadas
export { httpClient as api } from "./http-client";
