/**
 * Serviço de estado inicial: GET /api/me/data e popular stores.
 * Ref: docs/architecture-sync.md § 9 — Story 3.1.
 * Uma única chamada após login substitui múltiplas requisições (categorias, contas, transações, metas, envelopes, sharedExpenses).
 */

import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";
import { useFinancialStore } from "@/stores/financial-store";
import type { Goal } from "@/stores/financial-store";
import { mapReadItemToStore } from "@/lib/shared-expenses-sync-engine";
import type { SharedExpenseItemRead } from "@/services/sharedExpenseApi";

// Tipos da resposta GET /me/data (mesmo contrato dos routers)
export interface MeDataTransaction {
  id: string;
  date: string;
  account_id: string;
  category_id: string;
  type: string;
  amount: number;
  description: string;
  tags?: string[] | null;
  created_at: string;
  updated_at?: string | null;
}

export interface MeDataAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  created_at: string;
}

export interface MeDataCategory {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface MeDataEnvelope {
  id: string;
  name: string;
  balance: number;
  target_amount: number | null;
  color: string;
  description?: string | null;
  progress_percentage?: number | null;
  created_at: string;
}

export interface MeDataGoal {
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

export interface MeDataSnapshot {
  transactions: MeDataTransaction[];
  accounts: MeDataAccount[];
  categories: MeDataCategory[];
  envelopes: MeDataEnvelope[];
  goals: MeDataGoal[];
  sharedExpenses: SharedExpenseItemRead[];
}

function mapAccountType(apiType: string): "bank" | "cash" | "card" | "refeicao" | "alimentacao" {
  if (apiType === "cash") return "cash";
  if (apiType === "credit") return "card";
  if (apiType === "refeicao") return "refeicao";
  if (apiType === "alimentacao") return "alimentacao";
  if (apiType === "checking" || apiType === "savings" || apiType === "investment") return "bank";
  return "bank";
}

function mapGoalStatus(apiStatus: string): Goal["status"] {
  if (apiStatus === "active") return "on_track";
  if (apiStatus === "on_track" || apiStatus === "at_risk" || apiStatus === "achieved" || apiStatus === "overdue") return apiStatus as Goal["status"];
  return "on_track";
}

/**
 * Busca o snapshot do usuário (GET /me/data). Sempre 200 com listas (podem ser vazias).
 */
export async function getMeData(): Promise<MeDataSnapshot> {
  const response = await httpClient.get<MeDataSnapshot>(API_ENDPOINTS.meData.get);
  return apiHelpers.handleResponse(response);
}

/**
 * Aplica o snapshot aos stores: mapeia respostas da API para o formato do frontend e chama os setters.
 * Idempotente: substitui listas; listas vazias limpam o estado correspondente.
 */
export function applyMeDataToStores(data: MeDataSnapshot): void {
  const {
    setTransactions,
    setAccounts,
    setCategories,
    setEnvelopes,
    setGoals,
    setSharedExpenses,
  } = useFinancialStore.getState();

  setTransactions(
    data.transactions.map((t) => ({
      id: t.id,
      date: typeof t.date === "string" ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10),
      account: t.account_id,
      category: t.category_id,
      type: t.type as "income" | "expense",
      amount: t.type === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount),
      description: t.description ?? "",
      tags: t.tags ?? [],
      createdAt: typeof t.created_at === "string" ? t.created_at : new Date(t.created_at).toISOString(),
    })),
  );

  setAccounts(
    data.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: mapAccountType(a.type),
      balance: a.balance,
      currency: "BRL" as const,
      color: "#3b82f6",
    })),
  );

  setCategories(
    data.categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as "income" | "expense",
      icon: c.icon,
      color: c.color,
    })),
  );

  setEnvelopes(
    data.envelopes.map((e) => ({
      id: e.id,
      name: e.name,
      balance: e.balance,
      targetAmount: e.target_amount ?? undefined,
      color: e.color,
      description: e.description ?? undefined,
    })),
  );

  setGoals(
    data.goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      category: g.category,
      period: "oneoff" as const,
      dueDate: g.target_date?.slice(0, 10) ?? undefined,
      status: mapGoalStatus(g.status),
    })),
  );

  setSharedExpenses((data.sharedExpenses ?? []).map(mapReadItemToStore));
}

/**
 * Carrega estado inicial: GET /me/data e aplica aos stores.
 * Em falha (rede, 401, etc.) não altera os stores e propaga o erro.
 */
export async function loadInitialDataFromMeData(): Promise<void> {
  const data = await getMeData();
  applyMeDataToStores(data);
}
