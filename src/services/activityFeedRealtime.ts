import { getApiBaseURLDynamic } from "@/lib/api";
import { tokenManager } from "@/lib/http-client";
import { getLastTokenRefreshSuccessTimestamp, registerTokenRefreshListener } from "@/lib/token-refresh-notify";

type FeedNewMessage = { type: "feed_new"; data: Record<string, unknown> };
type MessageCallback = (msg: FeedNewMessage) => void;

let ws: WebSocket | null = null;
let messageCallback: MessageCallback | null = null;
let unsubscribeTokenRefresh: (() => void) | null = null;

function setupTokenRefreshReconnect(client: { reconnectIfConnected(): void }): void {
  if (unsubscribeTokenRefresh) return;
  unsubscribeTokenRefresh = registerTokenRefreshListener(client);
}

// No token in the URL — auth is done via message handshake after connection.
function getWsUrl(): string {
  const base = getApiBaseURLDynamic();
  if (typeof window === "undefined") return "";
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const path = base.startsWith("http") ? new URL(base).pathname.replace(/\/$/, "") : base || "";
  const wsPath = path ? `${path}/ws/activity-feed` : "/ws/activity-feed";
  return `${wsProtocol}://${host}${wsPath}`;
}

/**
 * Creates a WebSocket connection and performs the auth handshake:
 *   server → {"type":"auth_required"}
 *   client → {"type":"auth","token":"<JWT>"}
 * After handshake, forwards {"type":"feed_new"} messages to the registered callback.
 */
function buildConnection(token: string): WebSocket {
  const socket = new WebSocket(getWsUrl());

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as { type: string; data?: Record<string, unknown> };

      if (msg.type === "auth_required") {
        socket.send(JSON.stringify({ type: "auth", token }));
        return;
      }

      if (msg.type === "feed_new" && messageCallback) {
        messageCallback(msg as FeedNewMessage);
      }
    } catch {
      // ignore invalid JSON
    }
  };

  socket.onclose = () => {
    const closedAt = Date.now();
    if (
      getLastTokenRefreshSuccessTimestamp() > 0 &&
      closedAt - getLastTokenRefreshSuccessTimestamp() < 10_000
    ) {
      console.warn("[WS_TOKEN_DRIFT] WebSocket fechou logo após refresh success");
    }
    ws = null;
  };

  return socket;
}

export const activityFeedRealtime = {
  connect(token: string): void {
    setupTokenRefreshReconnect(activityFeedRealtime);
    if (ws?.readyState === WebSocket.OPEN) return;
    ws = buildConnection(token);
  },

  onMessage(callback: MessageCallback): void {
    messageCallback = callback;
  },

  disconnect(): void {
    if (ws) {
      ws.close();
      ws = null;
    }
    messageCallback = null;
  },

  /** Reconecta com token atual se já estava conectado (ex.: após refresh). */
  reconnectIfConnected(): void {
    if (ws?.readyState !== WebSocket.OPEN) return;
    const newToken = tokenManager.get();
    if (!newToken) return;
    ws.close();
    ws = null;
    ws = buildConnection(newToken);
  },

  isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN ?? false;
  },
};
