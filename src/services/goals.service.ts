import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface GoalApi {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  progress_percentage: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface GoalCreateApi {
  name: string;
  target_amount: number;
  target_date: string;
  description?: string | null;
  category: string;
  priority: string;
}

export const goalsService = {
  async getGoals(): Promise<GoalApi[]> {
    const response = await httpClient.get<GoalApi[]>(API_ENDPOINTS.goals.list);
    return apiHelpers.handleResponse(response);
  },

  async createGoal(data: GoalCreateApi): Promise<GoalApi> {
    const response = await httpClient.post<GoalApi>(API_ENDPOINTS.goals.create, data);
    return apiHelpers.handleResponse(response);
  },

  async updateGoal(id: string, updates: Partial<GoalCreateApi> & { current_amount?: number; status?: string }): Promise<GoalApi> {
    const payload: Record<string, unknown> = {};
    if (updates.name != null) payload.name = updates.name;
    if (updates.target_amount != null) payload.target_amount = updates.target_amount;
    if (updates.current_amount != null) payload.current_amount = updates.current_amount;
    if (updates.target_date != null) payload.target_date = updates.target_date;
    if (updates.description != null) payload.description = updates.description;
    if (updates.category != null) payload.category = updates.category;
    if (updates.priority != null) payload.priority = updates.priority;
    if (updates.status != null) payload.status = updates.status;
    const response = await httpClient.put<GoalApi>(API_ENDPOINTS.goals.update(id), payload);
    return apiHelpers.handleResponse(response);
  },

  async deleteGoal(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.goals.delete(id));
  },

  async addValueToGoal(goalId: string, amount: number): Promise<{ new_amount: number }> {
    const response = await httpClient.post<{ new_amount: number }>(
      API_ENDPOINTS.goals.addValue(goalId),
      null,
      { params: { amount } },
    );
    return apiHelpers.handleResponse(response);
  },
};
