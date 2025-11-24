import { httpClient } from "@/lib/http-client";

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  type: "recurring_transaction" | "budget_alert" | "goal_reminder" | "webhook";
  is_active: boolean;
  conditions: {
    trigger: string;
    frequency?: string;
    amount?: number;
    category?: string;
    account?: string;
  };
  actions: {
    type: string;
    value: string;
  };
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at?: string;
}

export interface AutomationRuleCreate {
  name: string;
  description?: string;
  type: "recurring_transaction" | "budget_alert" | "goal_reminder" | "webhook";
  is_active?: boolean;
  conditions: {
    trigger: string;
    frequency?: string;
    amount?: number;
    category?: string;
    account?: string;
  };
  actions: {
    type: string;
    value: string;
  };
}

export interface AutomationRuleUpdate {
  name?: string;
  description?: string;
  type?: "recurring_transaction" | "budget_alert" | "goal_reminder" | "webhook";
  is_active?: boolean;
  conditions?: {
    trigger?: string;
    frequency?: string;
    amount?: number;
    category?: string;
    account?: string;
  };
  actions?: {
    type?: string;
    value?: string;
  };
}

export const automationsService = {
  async getAutomations(): Promise<AutomationRule[]> {
    const response =
      await httpClient.get<AutomationRule[]>("/api/automations/");
    return response.data;
  },

  async getAutomation(id: string): Promise<AutomationRule> {
    const response = await httpClient.get<AutomationRule>(
      `/api/automations/${id}`,
    );
    return response.data;
  },

  async createAutomation(
    automation: AutomationRuleCreate,
  ): Promise<AutomationRule> {
    const response = await httpClient.post<AutomationRule>(
      "/api/automations/",
      automation,
    );
    return response.data;
  },

  async updateAutomation(
    id: string,
    automation: AutomationRuleUpdate,
  ): Promise<AutomationRule> {
    const response = await httpClient.put<AutomationRule>(
      `/api/automations/${id}`,
      automation,
    );
    return response.data;
  },

  async deleteAutomation(id: string): Promise<void> {
    await httpClient.delete(`/api/automations/${id}`);
  },
};
