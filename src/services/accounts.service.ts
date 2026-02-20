import type { AxiosError } from "axios";
import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";
import type { Account as StoreAccount } from "@/stores/financial-store";

export type AccountTypeApi =
  | "checking"
  | "savings"
  | "investment"
  | "credit"
  | "cash"
  | "refeicao"
  | "alimentacao";

export interface Account {
  id: string;
  name: string;
  type: AccountTypeApi;
  balance: number;
  created_at?: string;
}

export interface AccountCreate {
  name: string;
  type: AccountTypeApi;
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

  // Delete account (soft delete no backend)
  async deleteAccount(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.accounts.delete(id);
      apiHelpers.logRequest("DELETE", url);

      await httpClient.delete(url);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  /** Mapeia lista da API para o formato do store (para atualizar lista após delete/load). */
  mapApiAccountsToStore(accounts: Account[]): StoreAccount[] {
    return accounts.map((acc) => {
      let type: StoreAccount["type"] = "bank";
      if (acc.type === "cash") type = "cash";
      else if (acc.type === "credit") type = "card";
      else if (acc.type === "refeicao") type = "refeicao";
      else if (acc.type === "alimentacao") type = "alimentacao";
      else if (["checking", "savings", "investment"].includes(acc.type)) type = "bank";
      return {
        id: acc.id,
        name: acc.name,
        type,
        balance: acc.balance,
        currency: "BRL",
        color: "#3b82f6",
      };
    });
  },
};
