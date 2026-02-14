import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface FeedQueryParams {
  limit?: number;
  offset?: number;
  only_unread?: boolean;
}

export const activityFeedApi = {
  async getFeed(params?: FeedQueryParams): Promise<ActivityFeedItem[]> {
    const response = await httpClient.get<ActivityFeedItem[]>(
      API_ENDPOINTS.activityFeed.list,
      { params: { limit: 50, ...params } }
    );
    return apiHelpers.handleResponse(response);
  },

  async getUnreadCount(): Promise<number> {
    const response = await httpClient.get<{ count: number }>(
      API_ENDPOINTS.activityFeed.unreadCount
    );
    return apiHelpers.handleResponse(response).count;
  },

  async markAsRead(id: string): Promise<ActivityFeedItem> {
    const response = await httpClient.patch<ActivityFeedItem>(
      API_ENDPOINTS.activityFeed.markRead(id)
    );
    return apiHelpers.handleResponse(response);
  },

  async markAllAsRead(): Promise<{ marked: number }> {
    const response = await httpClient.patch<{ marked: number }>(
      API_ENDPOINTS.activityFeed.markAllRead
    );
    return apiHelpers.handleResponse(response);
  },
};
