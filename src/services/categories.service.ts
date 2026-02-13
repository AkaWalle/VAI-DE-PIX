import type { AxiosError } from "axios";
import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  created_at?: string;
}

export interface CategoryCreate {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

export const categoriesService = {
  // Get categories
  async getCategories(type?: "income" | "expense"): Promise<Category[]> {
    try {
      const params = new URLSearchParams();
      if (type) {
        params.append("type_filter", type);
      }

      const url = `${API_ENDPOINTS.categories.list}${params.toString() ? `?${params.toString()}` : ""}`;
      console.log("🌐 GET categorias:", url);
      apiHelpers.logRequest("GET", url);

      const response = await httpClient.get<Category[]>(url);
      console.log("📦 Resposta categorias:", response.data);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("❌ Erro ao buscar categorias:", error);
      console.error("❌ Detalhes:", err.response?.data ?? (err as Error).message);
      throw new Error(apiHelpers.handleError(err));
    }
  },

  // Create category
  async createCategory(category: CategoryCreate): Promise<Category> {
    try {
      apiHelpers.logRequest("POST", API_ENDPOINTS.categories.create, category);

      const response = await httpClient.post<Category>(
        API_ENDPOINTS.categories.create,
        category,
      );

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Update category
  async updateCategory(
    id: string,
    updates: Partial<CategoryCreate>,
  ): Promise<Category> {
    try {
      const url = API_ENDPOINTS.categories.update(id);
      apiHelpers.logRequest("PUT", url, updates);

      const response = await httpClient.put<Category>(url, updates);

      return apiHelpers.handleResponse(response);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },

  // Delete category
  async deleteCategory(id: string): Promise<void> {
    try {
      const url = API_ENDPOINTS.categories.delete(id);
      apiHelpers.logRequest("DELETE", url);

      await httpClient.delete(url);
    } catch (error: unknown) {
      throw new Error(apiHelpers.handleError(error as AxiosError));
    }
  },
};
