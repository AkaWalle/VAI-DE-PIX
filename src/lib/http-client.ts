import axios, { AxiosResponse, AxiosError } from "axios";
import { API_CONFIG, getApiBaseURLDynamic } from "./api";
import { runRefreshWithLock, resetRefreshLock } from "./refresh-lock-manager";
import { incrementSessionVersion } from "./refresh-internal";
import {
  getTokenForRequest,
  clearAllTokensStoragesOnly,
} from "./token-manager";
import {
  incrementRequestRetryAfterRefresh,
  incrementRequestWithoutToken,
  exportAuthMetricsToBackend,
} from "./metrics/auth-metrics";

export { tokenManager } from "./token-manager";

// Create axios instance with dynamic baseURL
const initialBaseURL = typeof window !== 'undefined' ? getApiBaseURLDynamic() : 'http://localhost:8000/api';

/** Máximo 1 retry após refresh por request (evita loop) */
const MAX_RETRY_AFTER_REFRESH = 1;

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

/**
 * Remove token de todos os storages e reseta lock de refresh (401/403 / anti-loop).
 * Incrementa session version para que refresh in-flight ignore token ao resolver.
 */
export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  exportAuthMetricsToBackend(true);
  incrementSessionVersion();
  resetRefreshLock();
  clearAllTokensStoragesOnly();
}

function isPublicAuthUrl(url: string | undefined): boolean {
  if (!url) return true;
  const u = String(url);
  return u.includes("/auth/login") || u.includes("/auth/register") || u.includes("/health");
}

// Request interceptor — JWT sempre que existir; log TOKEN_INJECTED
httpClient.interceptors.request.use(
  (config) => {
    const token = getTokenForRequest();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicAuthUrl(config.url)) {
      incrementRequestWithoutToken();
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Anti-loop: evita redirect infinito auth <-> /
let redirectCount = 0;
const REDIRECT_LOOP_THRESHOLD = 5;

// Response interceptor — 401: tentar refresh com lock, retry 1x; 403 ou falha: clear + redirect
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response?.status >= 200 && response?.status < 300) redirectCount = 0;
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as (typeof error.config) & { __retriedByRefresh?: number };

    if (status === 401 && config && typeof window !== "undefined") {
      const retried = (config.__retriedByRefresh ?? 0) >= MAX_RETRY_AFTER_REFRESH;
      if (!retried) {
        const refreshed = await runRefreshWithLock();
        if (refreshed) {
          config.__retriedByRefresh = (config.__retriedByRefresh ?? 0) + 1;
          incrementRequestRetryAfterRefresh();
          return httpClient.request(config);
        }
      }
    }

    if (status === 401 || status === 403) {
      clearAllTokens();
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith("/auth")) {
          redirectCount += 1;
          if (redirectCount > REDIRECT_LOOP_THRESHOLD) {
            redirectCount = 0;
          } else {
            window.location.href = "/auth";
          }
        }
      }
    }
    if (!error.response) {
      // Network error — rejeitado abaixo
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

  // Log API calls in development (sem output para evitar ruído)
  /** No-op em produção; parâmetros mantidos para uso futuro (log em dev). */
  logRequest: (_method: string, _url: string, _data?: unknown): void => {},
};

export default httpClient;
