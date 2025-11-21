// API configuration for VAI DE PIX
import { getApiUrl } from './api-detector';

// Obter URL da API (prioridade: localStorage > env > padrão)
// Em desenvolvimento, forçar uso do proxy se não houver URL customizada
let apiUrl = getApiUrl();
if (import.meta.env.DEV) {
  // Se houver URL absoluta no localStorage, limpar para usar proxy
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
  },
  
} as const;
