import axios, { AxiosResponse, AxiosError } from "axios";
import { API_CONFIG, getApiBaseURLDynamic } from "./api";

// Create axios instance with dynamic baseURL
const initialBaseURL = typeof window !== 'undefined' ? getApiBaseURLDynamic() : 'http://localhost:8000/api';
console.log('🚀 [HTTP Client] Inicializando com baseURL:', initialBaseURL);

export const httpClient = axios.create({
  baseURL: initialBaseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Atualizar baseURL dinamicamente em cada requisição
if (typeof window !== 'undefined') {
  // Interceptor para garantir que baseURL está sempre atualizado
  httpClient.interceptors.request.use((config) => {
    // SEMPRE recalcular baseURL em cada requisição
    const currentBaseURL = getApiBaseURLDynamic();
    
    // Forçar atualização da baseURL
    config.baseURL = currentBaseURL;
    
    // Log para debug
    if (config.url) {
      const fullUrl = config.baseURL + config.url;
      console.log('🌐 [HTTP Client] Requisição:', config.method?.toUpperCase(), fullUrl);
    }
    
    return config;
  });
}

// Token management
const TOKEN_KEY = "vai-de-pix-token";

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
      const payload = JSON.parse(atob(token.split(".")[1]));
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
  },
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
      if (!window.location.pathname.includes("/auth")) {
        window.location.href = "/auth";
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message);
      // Could show toast notification here
    }

    return Promise.reject(error);
  },
);

// Helper functions for common API patterns
export const apiHelpers = {
  // Handle API responses with error handling
  handleResponse: <T>(response: AxiosResponse<T>): T => {
    return response.data;
  },

  // Handle API errors with user-friendly messages
  handleError: (error: AxiosError): string => {
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as { detail?: string; message?: string };
      return data.detail ?? data.message ?? "Erro inesperado";
    }

    if (error.response?.status === 404) {
      return "Recurso não encontrado";
    }

    if (error.response?.status === 403) {
      return "Acesso negado";
    }

    if (error.response?.status >= 500) {
      return "Erro interno do servidor";
    }

    return error.message || "Erro de conexão";
  },

  // Check if running in development mode
  isDev: (): boolean => {
    return import.meta.env.DEV;
  },

  // Log API calls in development
  logRequest: (method: string, url: string, data?: unknown): void => {
    if (apiHelpers.isDev()) {
      console.log(`🌐 API ${method.toUpperCase()}: ${url}`, data || "");
    }
  },
};

export default httpClient;
