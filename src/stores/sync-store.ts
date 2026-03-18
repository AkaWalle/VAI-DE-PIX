/**
 * Estado de sincronização com o servidor (Story 3.2 / 3.3).
 * Ref: docs/architecture-sync.md § 6 — indicador: synced | syncing | offline | error.
 */

import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface SyncState {
  status: SyncStatus;
  lastError: string | null;
  setSyncing: () => void;
  setSynced: () => void;
  setError: (message: string) => void;
  setOffline: () => void;
  setOnline: () => void;
  clearError: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastError: null,

  setSyncing: () => set({ status: "syncing", lastError: null }),
  setSynced: () => set({ status: "synced", lastError: null }),
  setError: (message: string) =>
    set({ status: "error", lastError: message }),
  setOffline: () => set({ status: "offline", lastError: null }),
  setOnline: () =>
    set((s) => (s.status === "offline" ? { status: "idle", lastError: null } : {})),
  clearError: () =>
    set((s) => (s.status === "error" ? { status: "idle", lastError: null } : {})),
}));
