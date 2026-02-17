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

function getWsUrl(token: string): string {
  const base = getApiBaseURLDynamic();
  if (typeof window === "undefined") return "";
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const path = base.startsWith("http") ? new URL(base).pathname.replace(/\/$/, "") : base || "";
  const wsPath = path ? `${path}/ws/activity-feed` : "/ws/activity-feed";
  return `${wsProtocol}://${host}${wsPath}?token=${encodeURIComponent(token)}`;
}

export const activityFeedRealtime = {
  connect(token: string): void {
    setupTokenRefreshReconnect(activityFeedRealtime);
    if (ws?.readyState === WebSocket.OPEN) return;
    const url = getWsUrl(token);
    ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as FeedNewMessage;
        if (msg.type === "feed_new" && messageCallback) {
          messageCallback(msg);
        }
      } catch {
        // ignore invalid JSON
      }
    };
    ws.onclose = () => {
      const closedAt = Date.now();
      if (getLastTokenRefreshSuccessTimestamp() > 0 && closedAt - getLastTokenRefreshSuccessTimestamp() < 10_000) {
        console.warn("[WS_TOKEN_DRIFT] WebSocket fechou logo após refresh success");
      }
      ws = null;
    };
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

  /** Reconecta com token atual se já estava conectado (ex.: após refresh). Uma vez por evento; sem storm. */
  reconnectIfConnected(): void {
    if (ws?.readyState !== WebSocket.OPEN) return;
    const newToken = tokenManager.get();
    if (!newToken) return;
    ws.close();
    ws = null;
    const url = getWsUrl(newToken);
    ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as FeedNewMessage;
        if (msg.type === "feed_new" && messageCallback) {
          messageCallback(msg);
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      const closedAt = Date.now();
      if (getLastTokenRefreshSuccessTimestamp() > 0 && closedAt - getLastTokenRefreshSuccessTimestamp() < 10_000) {
        console.warn("[WS_TOKEN_DRIFT] WebSocket fechou logo após refresh success");
      }
      ws = null;
    };
  },

  isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN ?? false;
  },
};
