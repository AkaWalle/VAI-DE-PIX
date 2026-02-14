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
    config.baseURL = getApiBaseURLDynamic();
    return config;
  });
}

// Token management
const TOKEN_KEY = "vai-de-pix-token";

/**
 * Ordem de busca obrigatória (todas as requisições autenticadas):
 * 1. localStorage.getItem(TOKEN_KEY)
 * 2. localStorage.getItem("token")
 * 3. sessionStorage.getItem("token")
 * Se existir token em qualquer storage → usar.
 */
function getTokenForRequest(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    null
  );
}

/**
 * Remove token de todos os storages (401/403).
 * localStorage: vai-de-pix-token, token
 * sessionStorage: token
 */
function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

export const tokenManager = {
  get: (): string | null => {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  },

  set: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  remove: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  isValid: (): boolean => {
    const token = tokenManager.get();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },
};

// Request interceptor — JWT sempre que existir (backend valida expiração; não usar tokenManager.isValid() aqui)
httpClient.interceptors.request.use(
  (config) => {
    const token = getTokenForRequest();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // DEBUG TEMPORÁRIO — quando não for mais necessário, remover a linha abaixo
    console.log("[API AUTH CHECK]", { hasToken: !!token });
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — 401/403: clearAllTokens() depois, se rota atual != /auth → redirecionar para /auth
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      clearAllTokens();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
        window.location.href = "/auth";
      }
    }
    if (!error.response) {
      console.error("Network error:", error.message);
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
