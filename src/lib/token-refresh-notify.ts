/**
 * Notificação de "token refreshed" para listeners (ex.: WebSocket reconnect).
 * Chamado apenas em refresh-internal após tokenManager.set (sucesso).
 * Sem lógica de auth; apenas pub/sub. Uma reconexão por evento (debounce implícito).
 */

type TokenRefreshCallback = () => void;

export interface TokenRefreshListener {
  reconnectIfConnected(): void;
}

const listeners: TokenRefreshCallback[] = [];

/** Timestamp do último refresh success (para WS token drift detector — observação apenas). */
let lastTokenRefreshSuccessTimestamp = 0;

export function getLastTokenRefreshSuccessTimestamp(): number {
  return lastTokenRefreshSuccessTimestamp;
}

/** Registra cliente WS (ou outro) para reconectar após refresh. Reconecta só se estava conectado; não reconecta se logout. */
export function registerTokenRefreshListener(wsClient: TokenRefreshListener): () => void {
  return onTokenRefreshSuccess(() => wsClient.reconnectIfConnected());
}

export function onTokenRefreshSuccess(cb: TokenRefreshCallback): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i !== -1) listeners.splice(i, 1);
  };
}

/** Chamar apenas após tokenManager.set no refresh (uma vez por refresh success). */
export function notifyTokenRefreshSuccess(): void {
  lastTokenRefreshSuccessTimestamp = typeof Date.now === "function" ? Date.now() : 0;
  for (const cb of listeners) {
    try {
      cb();
    } catch (e) {
      if (typeof window !== "undefined") {
        console.warn("[TokenRefreshNotify] Listener error:", e);
      }
    }
  }
}
