import { httpClient } from "@/lib/http-client";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export const notificationsService = {
  async list(params?: { unread_only?: boolean; limit?: number; offset?: number }): Promise<NotificationItem[]> {
    const { data } = await httpClient.get<NotificationItem[]>("/notifications/", { params });
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await httpClient.get<{ count: number }>("/notifications/unread-count");
    return data.count;
  },

  async getUnreadInsightCount(): Promise<number> {
    const { data } = await httpClient.get<{ count: number }>("/notifications/unread-insight-count");
    return data.count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const { data } = await httpClient.patch<NotificationItem>(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead(): Promise<{ marked: number }> {
    const { data } = await httpClient.post<{ marked: number }>("/notifications/mark-all-read");
    return data;
  },
};
