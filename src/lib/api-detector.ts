/**
 * Detector e Configurador de URL da API
 * Detecta automaticamente a melhor URL para conectar ao backend
 */

export interface ApiConfig {
  baseURL: string;
  isLocal: boolean;
  isNetwork: boolean;
  detectedIP?: string;
}

/**
 * Detecta o IP da máquina na rede local
 */
export function detectLocalIP(): string | null {
  // Em produção, isso seria feito no servidor
  // Por enquanto, retorna null para usar localhost
  return null;
}

/**
 * Testa se uma URL está acessível
 */
export async function testApiUrl(
  url: string,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    const healthUrl = url.replace("/api", "/api/health");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      mode: "cors",
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Detecta automaticamente a melhor URL da API
 */
export async function detectApiUrl(): Promise<ApiConfig> {
  // 1. Verificar variável de ambiente primeiro (OBRIGATÓRIA em produção)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const isAccessible = await testApiUrl(envUrl, 3000);
    if (isAccessible) {
      return {
        baseURL: envUrl,
        isLocal: envUrl.includes("localhost") || envUrl.includes("127.0.0.1"),
        isNetwork:
          !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1"),
      };
    }
  }

  // 2. Em produção, detectar hostname/IP automaticamente
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    
    // Se não for localhost/127.0.0.1, usar o hostname/IP atual
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      let baseURL: string;
      if (port === '80' || port === '443' || !port) {
        baseURL = `${window.location.protocol}//${hostname}/api`;
      } else {
        baseURL = `${window.location.protocol}//${hostname}:${port}/api`;
      }
      
      return {
        baseURL,
        isLocal: false,
        isNetwork: true,
        detectedIP: hostname,
      };
    }
    
    // Se for localhost, usar URL relativa (Vercel serverless)
    return {
      baseURL: "/api",
      isLocal: false,
      isNetwork: true,
    };
  }

  // 3. Apenas em desenvolvimento: tentar localhost
  const localhostUrl = "http://localhost:8000/api";
  const localhostAccessible = await testApiUrl(localhostUrl, 3000);
  if (localhostAccessible) {
    return {
      baseURL: localhostUrl,
      isLocal: true,
      isNetwork: false,
    };
  }

  // 4. Se não conseguir detectar, retornar padrão baseado no ambiente
  if (import.meta.env.PROD) {
    return {
      baseURL: "/api",
      isLocal: false,
      isNetwork: true,
    };
  }
  
  return {
    baseURL: envUrl || localhostUrl,
    isLocal: true,
    isNetwork: false,
  };
}

/**
 * Obtém a URL da API configurada
 * Prioridade: localStorage > env > padrão baseado em ambiente
 */
export function getApiUrl(): string {
  // Verificar localStorage (pode ter sido configurado manualmente)
  const storedUrl = localStorage.getItem("vai-de-pix-api-url");
  if (storedUrl) {
    return storedUrl;
  }

  // Verificar variável de ambiente (OBRIGATÓRIA em produção)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Em produção, detectar hostname/IP automaticamente
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    
    // Se não for localhost/127.0.0.1, usar o hostname/IP atual
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (port === '80' || port === '443' || !port) {
        return `${window.location.protocol}//${hostname}/api`;
      }
      return `${window.location.protocol}//${hostname}:${port}/api`;
    }
    
    // Se for localhost, usar URL relativa (Vercel serverless)
    return "/api";
  }

  // Padrão para desenvolvimento
  return "http://localhost:8000/api";
}

/**
 * Define a URL da API manualmente
 */
export function setApiUrl(url: string): void {
  localStorage.setItem("vai-de-pix-api-url", url);
  // Recarregar página para aplicar mudança
  window.location.reload();
}

/**
 * Limpa a URL da API armazenada (volta para padrão)
 */
export function clearApiUrl(): void {
  localStorage.removeItem("vai-de-pix-api-url");
  window.location.reload();
}
