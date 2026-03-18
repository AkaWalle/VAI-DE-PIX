/**
 * GOD MODE: Sync Engine para despesas compartilhadas.
 * Backend = fonte de verdade; store = projeção sincronizada.
 * - Sync inicial via REST (GET /shared-expenses/read-model)
 * - Nunca roda sem auth pronto e token válido (AuthRuntimeGuard)
 */

import { sharedExpenseApi, type SharedExpensesReadModel, type SharedExpenseItemRead } from "@/services/sharedExpenseApi";
import type { SharedExpense, SharedExpenseParticipant } from "@/stores/financial-store";
import { useFinancialStore } from "@/stores/financial-store";
import { isAuthReady, ensureValidSession } from "@/lib/auth-runtime-guard";

/** Backoff: esperar antes de retry após falha (ms) */
const SYNC_RETRY_DELAY_MS = 2000;
const SYNC_MAX_RETRIES = 2;

/** Mapeia item do read-model (API/me/data) para formato do store. Exportado para uso em me-data.service. */
export function mapReadItemToStore(item: SharedExpenseItemRead): SharedExpense {
  const createdAt = typeof item.created_at === "string" ? item.created_at : new Date(item.created_at).toISOString();
  const updatedAt = (item.updated_at && (typeof item.updated_at === "string" ? item.updated_at : new Date(item.updated_at).toISOString())) || createdAt;
  const date = createdAt.slice(0, 10);

  const participants: SharedExpenseParticipant[] = item.participants.map((p) => ({
    userId: p.user_id,
    userName: p.user_name,
    userEmail: p.user_email,
    amount: p.amount,
    paid: p.paid,
    paidAt: undefined,
  }));

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    totalAmount: item.total_amount,
    currency: "BRL",
    category: "",
    date,
    createdBy: item.created_by,
    participants,
    status: item.status as "pending" | "settled" | "cancelled",
    createdAt,
    updatedAt,
  };
}

function applyReadModelToStore(data: SharedExpensesReadModel): void {
  const setSharedExpenses = useFinancialStore.getState().setSharedExpenses;
  const expenses = data.expenses.map(mapReadItemToStore);
  setSharedExpenses(expenses);
}

/**
 * Executa uma sincronização: busca read-model no backend e atualiza o store.
 * Só roda se auth está pronto e sessão válida (token ou refresh).
 * Retorna true se sucesso, false se falha ou bloqueado.
 */
export async function syncSharedExpensesFromBackend(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!isAuthReady()) {
    return false;
  }

  const sessionOk = await ensureValidSession();
  if (!sessionOk) {
    return false;
  }

  for (let attempt = 1; attempt <= SYNC_MAX_RETRIES; attempt++) {
    try {
      const data = await sharedExpenseApi.getReadModel();
      applyReadModelToStore(data);
      return true;
    } catch {
      if (attempt < SYNC_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY_MS));
      } else {
        return false;
      }
    }
  }

  return false;
}

/**
 * Verifica se GOD MODE está habilitado (feature flag).
 * Ordem: env VITE_SHARED_EXPENSES_GOD_MODE > localStorage shared_expenses_god_mode_enabled > false
 */
export function isSharedExpensesGodModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const env = import.meta.env.VITE_SHARED_EXPENSES_GOD_MODE;
  if (env === "true" || env === "1") return true;
  try {
    return localStorage.getItem("shared_expenses_god_mode_enabled") === "true";
  } catch {
    return false;
  }
}

/**
 * Habilita/desabilita GOD MODE via localStorage (para rollback por usuário).
 */
export function setSharedExpensesGodModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.setItem("shared_expenses_god_mode_enabled", "true");
    } else {
      localStorage.removeItem("shared_expenses_god_mode_enabled");
    }
  } catch {
    // ignore
  }
}
