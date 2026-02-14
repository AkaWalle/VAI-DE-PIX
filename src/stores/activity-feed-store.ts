import { create } from "zustand";
import { activityFeedApi, type ActivityFeedItem } from "@/services/activityFeedApi";
import { activityFeedRealtime } from "@/services/activityFeedRealtime";
import { tokenManager } from "@/lib/http-client";
import { soundService } from "@/services/soundService";
import axios, { AxiosError } from "axios";
import { apiHelpers } from "@/lib/http-client";

export interface ActivityFeedState {
  items: ActivityFeedItem[];
  unreadCount: number;
  isConnectedRealtime: boolean;
  loading: boolean;
  error: string | null;
}

export interface ActivityFeedActions {
  loadFeed: (params?: { limit?: number; offset?: number; only_unread?: boolean }) => Promise<void>;
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setUnreadCount: (n: number) => void;
  addItemFromRealtime: (item: ActivityFeedItem) => void;
}

export type ActivityFeedStore = ActivityFeedState & ActivityFeedActions;

export const useActivityFeedStore = create<ActivityFeedStore>((set, get) => ({
  items: [],
  unreadCount: 0,
  isConnectedRealtime: false,
  loading: false,
  error: null,

  loadFeed: async (params) => {
    set({ loading: true, error: null });
    try {
      const items = await activityFeedApi.getFeed({ limit: 50, ...params });
      const count = await activityFeedApi.getUnreadCount();
      set({ items, unreadCount: count, loading: false });
    } catch (err) {
      const message = axios.isAxiosError(err) ? apiHelpers.handleError(err as AxiosError) : "Erro ao carregar feed.";
      set({ error: message, loading: false, items: [] });
    }
  },

  connectRealtime: () => {
    const token = tokenManager.get();
    if (!token) return;
    activityFeedRealtime.onMessage((msg) => {
      if (msg.type === "feed_new" && msg.data) {
        const data = msg.data as unknown as ActivityFeedItem;
        get().addItemFromRealtime(data);
        get().setUnreadCount(get().unreadCount + 1);
        soundService.playMoneyReceiveSound();
      }
    });
    activityFeedRealtime.connect(token);
    set({ isConnectedRealtime: true });
  },

  disconnectRealtime: () => {
    activityFeedRealtime.disconnect();
    set({ isConnectedRealtime: false });
  },

  addItemFromRealtime: (item) => {
    set((state) => ({
      items: [item, ...state.items],
    }));
  },

  markAsRead: async (id) => {
    try {
      await activityFeedApi.markAsRead(id);
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, is_read: true } : i)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // keep state unchanged on error
    }
  },

  markAllRead: async () => {
    try {
      await activityFeedApi.markAllAsRead();
      set((state) => ({
        items: state.items.map((i) => ({ ...i, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // keep state unchanged on error
    }
  },

  setUnreadCount: (n) => set({ unreadCount: n }),
}));
