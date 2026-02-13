import type { AxiosError } from "axios";
import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "investment" | "credit" | "cash";
  balance: number;
  created_at?: string;
}

export interface AccountCreate {
  name: string;
  type: "checking" | "savings" | "investment" | "credit" | "cash";
  balance?: number;
}

export const accountsService = {
  // Get accounts
  async getAccounts(): Promise<Account[]> {
    try {
      apiHelpers.logRequest("GET", API_ENDPOINTS.accounts.list);

      const response = await httpClient.get<Account[]>(
        API_ENDPOINTS.accounts.list,
      );

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Create account
  async createAccount(account: AccountCreate): Promise<Account> {
    try {
      apiHelpers.logRequest("POST", API_ENDPOINTS.accounts.create, account);

      const response = await httpClient.post<Account>(
        API_ENDPOINTS.accounts.create,
        account,
      );

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Update account
  async updateAccount(
    id: string,
    updates: Partial<AccountCreate>,
  ): Promise<Account> {
    try {
      const url = API_ENDPOINTS.accounts.update(id);
      apiHelpers.logRequest("PUT", url, updates);

      const response = await httpClient.put<Account>(url, updates);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.accounts.delete(id);
      apiHelpers.logRequest("DELETE", url);

      await httpClient.delete(url);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },
};
