// API configuration for VAI DE PIX
import { getApiUrl } from './api-detector';

// Obter URL da API (prioridade: localStorage > env > padrão)
// Em produção, sempre usar VITE_API_URL se configurado
// Em desenvolvimento, usar proxy do Vite se não houver URL customizada
let apiUrl = getApiUrl();

if (import.meta.env.PROD) {
  // Em produção, priorizar VITE_API_URL da variável de ambiente
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    apiUrl = envUrl;
  }
  // Se não houver VITE_API_URL em produção, usar localStorage ou padrão
  // (não usar proxy em produção)
} else if (import.meta.env.DEV) {
  // Em desenvolvimento, forçar uso do proxy se não houver URL customizada
  const storedUrl = localStorage.getItem('vai-de-pix-api-url');
  if (storedUrl && (storedUrl.startsWith('http://') || storedUrl.startsWith('https://'))) {
    // Se não for localhost:8000, manter; caso contrário, usar proxy
    if (storedUrl.includes('localhost:8000') || storedUrl.includes('127.0.0.1:8000')) {
      localStorage.removeItem('vai-de-pix-api-url');
      apiUrl = '/api';
    }
  } else {
    // Sem URL customizada, usar proxy
    apiUrl = '/api';
  }
}

export const API_CONFIG = {
  baseURL: apiUrl,
  timeout: 120000, // 120 segundos (2 minutos) para dar tempo ao Ollama processar
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  
  // Transactions
  transactions: {
    list: '/transactions',
    create: '/transactions',
    update: (id: string) => `/transactions/${id}`,
    delete: (id: string) => `/transactions/${id}`,
    summary: '/transactions/summary/monthly',
  },
  
  // Goals
  goals: {
    list: '/goals',
    create: '/goals',
    update: (id: string) => `/goals/${id}`,
    delete: (id: string) => `/goals/${id}`,
    addValue: (id: string) => `/goals/${id}/add-value`,
  },
  
  // Envelopes
  envelopes: {
    list: '/envelopes',
    create: '/envelopes',
    update: (id: string) => `/envelopes/${id}`,
    delete: (id: string) => `/envelopes/${id}`,
    addValue: (id: string) => `/envelopes/${id}/add-value`,
    withdrawValue: (id: string) => `/envelopes/${id}/withdraw-value`,
  },
  
  // Categories
  categories: {
    list: '/categories',
    create: '/categories',
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },
  
  // Accounts
  accounts: {
    list: '/accounts',
    create: '/accounts',
    update: (id: string) => `/accounts/${id}`,
    delete: (id: string) => `/accounts/${id}`,
  },
  
  // Reports
  reports: {
    summary: '/reports/summary',
    cashflow: '/reports/cashflow',
    categories: '/reports/categories/summary',
    export: '/reports/export',
    monthlyComparison: '/reports/monthly-comparison',
    wealthEvolution: '/reports/wealth-evolution',
  },
  
} as const;
