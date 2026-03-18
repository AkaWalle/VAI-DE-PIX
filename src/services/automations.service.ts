import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export type AutomationRuleType =
  | "recurring_transaction"
  | "budget_alert"
  | "goal_reminder"
  | "webhook"
  | "low_balance_alert"
  | "category_limit"
  | "weekly_report"
  | "round_up"
  | "payment_reminder";

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  type: AutomationRuleType;
  is_active: boolean;
  conditions: {
    trigger?: string;
    frequency?: string;
    amount?: number;
    amount_cents?: number;
    category?: string;
    account?: string;
    account_id?: string;
    start_date?: string;
    end_date?: string;
    day_of_week?: number;
    destination_email?: string;
    email?: string;
    envelope_id?: string;
    round_to_cents?: number;
    days_after_creation?: number;
  };
  actions: {
    type: string;
    value: string;
    account_id?: string;
    category_id?: string;
    amount?: number;
    amount_cents?: number;
    envelope_id?: string;
    round_to_cents?: number;
  };
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at?: string;
}

export interface AutomationRuleCreate {
  name: string;
  description?: string;
  type: AutomationRuleType;
  is_active?: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
}

export interface AutomationRuleUpdate {
  name?: string;
  description?: string;
  type?: AutomationRuleType;
  is_active?: boolean;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

export const automationsService = {
  async getAutomations(): Promise<AutomationRule[]> {
    const response =
      await httpClient.get<AutomationRule[]>(API_ENDPOINTS.automations.list + "/");
    return response.data;
  },

  async getAutomation(id: string): Promise<AutomationRule> {
    const response = await httpClient.get<AutomationRule>(
      API_ENDPOINTS.automations.get(id),
    );
    return response.data;
  },

  async createAutomation(
    automation: AutomationRuleCreate,
  ): Promise<AutomationRule> {
    const response = await httpClient.post<AutomationRule>(
      API_ENDPOINTS.automations.create + "/",
      automation,
    );
    return response.data;
  },

  async updateAutomation(
    id: string,
    automation: AutomationRuleUpdate,
  ): Promise<AutomationRule> {
    const response = await httpClient.put<AutomationRule>(
      API_ENDPOINTS.automations.update(id),
      automation,
    );
    return response.data;
  },

  async deleteAutomation(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.automations.delete(id));
  },
};
