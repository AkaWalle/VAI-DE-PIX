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
  amount: number;
  description: string;
  tags?: string[];
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
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Create new transaction
  async createTransaction(
    transaction: TransactionCreate,
  ): Promise<Transaction> {
    try {
      apiHelpers.logRequest(
        "POST",
        API_ENDPOINTS.transactions.create,
        transaction,
      );

      const response = await httpClient.post<Transaction>(
        API_ENDPOINTS.transactions.create,
        transaction,
      );

      return apiHelpers.handleResponse(response);
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
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
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Delete transaction
  async deleteTransaction(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.transactions.delete(id);
      apiHelpers.logRequest("DELETE", url);

      await httpClient.delete(url);
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
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
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },
};
