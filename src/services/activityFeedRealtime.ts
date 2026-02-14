import { getApiBaseURLDynamic } from "@/lib/api";

type FeedNewMessage = { type: "feed_new"; data: Record<string, unknown> };
type MessageCallback = (msg: FeedNewMessage) => void;

let ws: WebSocket | null = null;
let messageCallback: MessageCallback | null = null;

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

  isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN ?? false;
  },
};
