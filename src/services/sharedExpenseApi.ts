import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface PendingShareItem {
  id: string;
  expense_id: string;
  user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  expense_amount: number;
  expense_description: string;
  creator_name: string;
}

export interface SharedExpenseParticipantCreate {
  user_id?: string;
  email?: string;
  percentage?: number;
  amount?: number; // centavos (custom)
}

export interface SharedExpenseCreatePayload {
  total_cents: number; // centavos (int). Nunca amount em reais.
  description: string;
  split_type?: "equal" | "percentage" | "custom";
  invited_email?: string;
  participants?: SharedExpenseParticipantCreate[];
}

export interface SharedExpenseResponse {
  id: string;
  created_by: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface ExpenseShareResponse {
  id: string;
  expense_id: string;
  user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export interface ExpenseShareEventItem {
  id: string;
  share_id: string;
  action: string;
  performed_by: string;
  performed_by_name: string | null;
  created_at: string;
}

/** GOD MODE: Read model (backend como fonte de verdade) */
export interface SharedExpenseParticipantRead {
  user_id: string;
  user_name: string;
  user_email: string;
  share_status: string;
  amount: number;
  percentage?: number;
  paid: boolean;
}

export interface SharedExpenseItemRead {
  id: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  status: string;
  split_type?: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string | null;
  participants: SharedExpenseParticipantRead[];
}

export interface SharedExpensesTotalsRead {
  total_count: number;
  settled_count: number;
  pending_count: number;
  cancelled_count: number;
  total_value: number;
}

export interface SharedExpensesReadModel {
  expenses: SharedExpenseItemRead[];
  totals: SharedExpensesTotalsRead;
  last_updated: string | null;
}

export const sharedExpenseApi = {
  /** GOD MODE: Fetch read model (todas despesas do usuário + totais) */
  async getReadModel(): Promise<SharedExpensesReadModel> {
    const response = await httpClient.get<SharedExpensesReadModel>(
      API_ENDPOINTS.sharedExpenses.readModel
    );
    return apiHelpers.handleResponse(response);
  },

  async getPendingShares(): Promise<PendingShareItem[]> {
    const response = await httpClient.get<PendingShareItem[]>(
      API_ENDPOINTS.sharedExpenses.pending
    );
    return apiHelpers.handleResponse(response);
  },

  async createSharedExpense(
    payload: SharedExpenseCreatePayload
  ): Promise<SharedExpenseResponse> {
    const response = await httpClient.post<SharedExpenseResponse>(
      API_ENDPOINTS.sharedExpenses.create,
      payload
    );
    return apiHelpers.handleResponse(response);
  },

  async respondToShare(
    shareId: string,
    action: "accept" | "reject"
  ): Promise<ExpenseShareResponse> {
    const response = await httpClient.patch<ExpenseShareResponse>(
      API_ENDPOINTS.sharedExpenses.respond(shareId),
      { action }
    );
    return apiHelpers.handleResponse(response);
  },

  async getShareEvents(shareId: string): Promise<ExpenseShareEventItem[]> {
    const response = await httpClient.get<ExpenseShareEventItem[]>(
      API_ENDPOINTS.sharedExpenses.shareEvents(shareId)
    );
    return apiHelpers.handleResponse(response);
  },
};
