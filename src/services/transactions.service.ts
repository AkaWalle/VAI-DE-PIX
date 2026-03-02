import type { AxiosError } from "axios";
import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface Transaction {
  id: string;
  date: string;
  account: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  tags?: string[];
  createdAt: string;
}

export interface TransactionCreate {
  date: string;
  account_id: string;
  category_id: string;
  type: "income" | "expense";
  /** Valor em centavos (int). Backend só aceita amount_cents. */
  amount_cents: number;
  description: string;
  tags?: string[];
  /** ID da despesa compartilhada vinculada (opcional). */
  shared_expense_id?: string;
}

export interface TransactionFilters {
  type?: "income" | "expense";
  category_id?: string;
  account_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  category_breakdown: Record<string, { income: number; expense: number }>;
}

export const transactionsService = {
  // Get transactions with filters
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const url = `${API_ENDPOINTS.transactions.list}?${params.toString()}`;
      apiHelpers.logRequest("GET", url);

      const response = await httpClient.get<Transaction[]>(url);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Create new transaction. idempotencyKey: UUID por intenção (reutilizar em retries).
  async createTransaction(
    transaction: TransactionCreate,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    try {
      apiHelpers.logRequest(
        "POST",
        API_ENDPOINTS.transactions.create,
        transaction,
      );

      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      const response = await httpClient.post<Transaction>(
        API_ENDPOINTS.transactions.create,
        transaction,
        { headers },
      );

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Update transaction
  async updateTransaction(
    id: string,
    updates: Partial<TransactionCreate>,
  ): Promise<Transaction> {
    try {
      const url = API_ENDPOINTS.transactions.update(id);
      apiHelpers.logRequest("PUT", url, updates);

      const response = await httpClient.put<Transaction>(url, updates);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Delete single transaction
  async deleteTransaction(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.transactions.delete(id);
      apiHelpers.logRequest("DELETE", url);

      await httpClient.delete(url);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Delete multiple transactions in one request (batch). Returns { deleted, deleted_ids, errors }.
  async deleteTransactions(
    ids: string[],
  ): Promise<{ deleted: number; deleted_ids: string[]; errors: Array<{ id: string; reason: string }> }> {
    try {
      if (ids.length === 0) {
        return { deleted: 0, deleted_ids: [], errors: [] };
      }
      apiHelpers.logRequest("DELETE", API_ENDPOINTS.transactions.deleteBatch, { ids });

      const response = await httpClient.delete<{
        deleted: number;
        deleted_ids: string[];
        errors: Array<{ id: string; reason: string }>;
      }>(API_ENDPOINTS.transactions.deleteBatch, { data: { ids } });

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Get monthly summary
  async getMonthlySummary(
    year?: number,
    month?: number,
  ): Promise<TransactionSummary> {
    try {
      const params = new URLSearchParams();
      if (year) params.append("year", year.toString());
      if (month) params.append("month", month.toString());

      const url = `${API_ENDPOINTS.transactions.summary}?${params.toString()}`;
      apiHelpers.logRequest("GET", url);

      const response = await httpClient.get<TransactionSummary>(url);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },
};
