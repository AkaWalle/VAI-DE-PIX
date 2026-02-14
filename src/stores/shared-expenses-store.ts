import { create } from "zustand";
import {
  sharedExpenseApi,
  type PendingShareItem,
  type SharedExpenseCreatePayload,
} from "@/services/sharedExpenseApi";
import { apiHelpers } from "@/lib/http-client";
import axios, { AxiosError } from "axios";

export interface SharedExpensesState {
  pendingShares: PendingShareItem[];
  loading: boolean;
  error: string | null;
  respondingShareId: string | null;
}

export interface SharedExpensesActions {
  fetchPendingShares: () => Promise<void>;
  respondShare: (shareId: string, action: "accept" | "reject") => Promise<void>;
  createExpense: (payload: SharedExpenseCreatePayload) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type SharedExpensesStore = SharedExpensesState & SharedExpensesActions;

export const useSharedExpensesStore = create<SharedExpensesStore>((set, get) => ({
  pendingShares: [],
  loading: false,
  error: null,
  respondingShareId: null,

  fetchPendingShares: async () => {
    set({ loading: true, error: null });
    try {
      const items = await sharedExpenseApi.getPendingShares();
      set({ pendingShares: items, loading: false });
    } catch (err) {
      const message =
        axios.isAxiosError(err) ? apiHelpers.handleError(err as AxiosError) : "Erro ao carregar pendências.";
      set({ error: message, loading: false, pendingShares: [] });
    }
  },

  respondShare: async (shareId: string, action: "accept" | "reject") => {
    set({ respondingShareId: shareId, error: null });
    try {
      await sharedExpenseApi.respondToShare(shareId, action);
      set((state) => ({
        pendingShares: state.pendingShares.filter((s) => s.id !== shareId),
        respondingShareId: null,
      }));
    } catch (err) {
      const message =
        axios.isAxiosError(err) ? apiHelpers.handleError(err as AxiosError) : "Erro ao responder.";
      set({ error: message, respondingShareId: null });
      throw err;
    }
  },

  createExpense: async (payload: SharedExpenseCreatePayload) => {
    set({ error: null });
    try {
      await sharedExpenseApi.createSharedExpense(payload);
    } catch (err) {
      const message =
        axios.isAxiosError(err) ? apiHelpers.handleError(err as AxiosError) : "Erro ao criar despesa.";
      set({ error: message });
      throw err;
    }
  },

  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
