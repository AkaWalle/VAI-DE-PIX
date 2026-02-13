import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface CategoryVariationItem {
  category_id: string;
  category_name: string;
  current_month_total?: number;
  previous_month_total?: number;
  previous_amount?: number;
  current_amount?: number;
  variation_pct?: number | null;
  variation_percent?: number | null;
  explanation: string;
  /** Maior impacto primeiro (|current - previous|). Backend retorna ordenado. */
  impact_score?: number;
  /** Identificador estável para feedback visto/ignorado. */
  insight_hash?: string;
}

export interface GoalAtRiskItem {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  gap: number;
  days_left: number;
  required_per_month: number;
  risk_reason: string;
  at_risk: boolean;
  /** gap = maior impacto. Backend retorna ordenado por impact_score DESC. */
  impact_score?: number;
  /** Identificador estável para feedback visto/ignorado. */
  insight_hash?: string;
}

export interface InsightsResponse {
  category_monthly_variation: CategoryVariationItem[];
  goals_at_risk: GoalAtRiskItem[];
  computed_at: string;
}

export async function fetchInsights(): Promise<InsightsResponse> {
  const { data } = await httpClient.get<InsightsResponse>(API_ENDPOINTS.insights);
  return data;
}

export type InsightFeedbackStatus = "seen" | "ignored";

export async function postInsightFeedback(
  insightType: "category_variation" | "goal_at_risk",
  insightHash: string,
  status: InsightFeedbackStatus
): Promise<void> {
  await httpClient.post(API_ENDPOINTS.insightsFeedback, {
    insight_type: insightType,
    insight_hash: insightHash,
    status,
  });
}

export interface InsightPreferences {
  enable_category_variation: boolean;
  enable_goals_at_risk: boolean;
}

export async function getInsightPreferences(): Promise<InsightPreferences> {
  const { data } = await httpClient.get<InsightPreferences>(
    API_ENDPOINTS.insightsPreferences
  );
  return data;
}

export async function patchInsightPreferences(
  prefs: Partial<InsightPreferences>
): Promise<InsightPreferences> {
  const { data } = await httpClient.patch<InsightPreferences>(
    API_ENDPOINTS.insightsPreferences,
    prefs
  );
  return data;
}
