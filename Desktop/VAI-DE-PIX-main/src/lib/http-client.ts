import axios, { AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from './api';

// Create axios instance
export const httpClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'vai-de-pix-token';

export const tokenManager = {
  get: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  set: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  remove: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },
  
  isValid: (): boolean => {
    const token = tokenManager.get();
    if (!token) return false;
    
    try {
      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },
};

// Request interceptor - Add auth token
httpClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token && tokenManager.isValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      tokenManager.remove();
      
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    
    // Handle network errors with more details
    if (!error.response) {
      const baseURL = httpClient.defaults.baseURL;
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      
      console.error('❌ Network error:', {
        message: error.message,
        code: error.code,
        baseURL,
        isTimeout,
        url: error.config?.url
      });
      
      // Provide more helpful error message
      if (isTimeout) {
        error.message = `Timeout ao conectar com o servidor. O servidor pode estar demorando para responder. Verifique se o backend está rodando em ${baseURL}`;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        error.message = `Não foi possível conectar ao servidor em ${baseURL}. Verifique se o backend está rodando.`;
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper functions for common API patterns
export const apiHelpers = {
  // Handle API responses with error handling
  handleResponse: <T>(response: AxiosResponse<T>): T => {
    return response.data;
  },
  
  // Handle API errors with user-friendly messages
  handleError: (error: AxiosError): string => {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      
      // Tratar erros de validação do FastAPI/Pydantic (422)
      if (error.response?.status === 422 && Array.isArray(data.detail)) {
        const validationErrors = data.detail.map((err: any) => {
          const field = err.loc?.[err.loc.length - 1] || 'campo';
          const message = err.msg || 'Valor inválido';
          return `${field}: ${message}`;
        }).join(', ');
        return validationErrors || 'Dados inválidos. Verifique os campos preenchidos.';
      }
      
      // Tratar erro de detalhe simples
      if (data.detail) {
        if (typeof data.detail === 'string') {
          return data.detail;
        }
        if (Array.isArray(data.detail) && data.detail.length > 0) {
          return data.detail[0].msg || String(data.detail[0]);
        }
      }
      
      return data.message || 'Erro inesperado';
    }
    
    if (error.response?.status === 404) {
      return 'Recurso não encontrado';
    }
    
    if (error.response?.status === 403) {
      return 'Acesso negado';
    }
    
    if (error.response?.status === 422) {
      return 'Dados inválidos. Verifique os campos preenchidos.';
    }
    
    if (error.response?.status >= 500) {
      return 'Erro interno do servidor';
    }
    
    return error.message || 'Erro de conexão';
  },
  
  // Check if running in development mode
  isDev: (): boolean => {
    return import.meta.env.DEV;
  },
  
  // Log API calls in development
  logRequest: (method: string, url: string, data?: any): void => {
    if (apiHelpers.isDev()) {
    }
  },
};

export default httpClient;
