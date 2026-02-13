// API configuration for VAI DE PIX
// Em produção, VITE_API_URL deve estar configurada no Vercel
// Em desenvolvimento, usa localhost como fallback
// Para Raspberry Pi, detecta automaticamente o hostname/IP
const getApiBaseURL = () => {
  // Prioridade 1: localStorage (permite override manual)
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem("vai-de-pix-api-url");
    if (storedUrl) {
      console.log('🔧 [API] Usando URL do localStorage:', storedUrl);
      return storedUrl;
    }
  }
  
  // Prioridade 2: Variável de ambiente (obrigatória em produção)
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 [API] Usando URL da variável de ambiente:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Prioridade 3: Detectar hostname/IP automaticamente (funciona em dev e prod)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const currentPort = window.location.port;
    const protocol = window.location.protocol;
    
    console.log('🔧 [API] Detecção automática:', { hostname, currentPort, protocol });
    
    // Se não for localhost/127.0.0.1, usar o hostname/IP atual
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Sempre usar a mesma porta que o frontend está usando
      const apiPort = currentPort || '8000';
      const apiUrl = `${protocol}//${hostname}:${apiPort}/api`;
      console.log('🔧 [API] URL detectada (rede):', apiUrl);
      return apiUrl;
    }
    
    // Se for localhost em produção, usar URL relativa (Vercel serverless)
    if (import.meta.env.PROD) {
      console.log('🔧 [API] Usando URL relativa (produção):', '/api');
      return "/api";
    }
  }
  
  // Prioridade 4: Desenvolvimento local
  const localUrl = "http://localhost:8000/api";
  console.log('🔧 [API] Usando URL padrão (desenvolvimento):', localUrl);
  return localUrl;
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
} as const;
