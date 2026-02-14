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

export interface SharedExpenseCreatePayload {
  amount: number;
  description: string;
  invited_email: string;
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

export const sharedExpenseApi = {
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
