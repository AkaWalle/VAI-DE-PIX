import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store-index";
import { useFinancialStore, type Goal } from "@/stores/financial-store";
import { transactionsService } from "@/services/transactions.service";
import { categoriesService } from "@/services/categories.service";
import { accountsService } from "@/services/accounts.service";
import { goalsService } from "@/services/goals.service";
import { envelopesService } from "@/services/envelopes.service";
import { syncSharedExpensesFromBackend } from "@/lib/shared-expenses-sync-engine";
import { waitUntilAuthReady } from "@/lib/auth-runtime-guard";

/**
 * Hook para carregar dados da API quando o usuário faz login.
 * Só inicia loadData após auth estar pronto (bootstrap terminado), evitando 401 por sync antecipado.
 */
export function useLoadData() {
  const { user, isAuthenticated } = useAuthStore();
  const { setTransactions, setCategories, setAccounts, setGoals, setEnvelopes } =
    useFinancialStore();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const authReady = await waitUntilAuthReady();
      if (cancelled || !authReady) return;

      const state = useAuthStore.getState();
      if (!state.isAuthenticated || !state.user) {
        return;
      }

      const loadData = async () => {
      try {
        // Carregar categorias
        const loadedCategories = await categoriesService.getCategories();

        if (loadedCategories && loadedCategories.length > 0) {
          setCategories(
            loadedCategories.map((cat) => ({
              id: cat.id,
              name: cat.name,
              type: cat.type as "income" | "expense",
              icon: cat.icon,
              color: cat.color,
            })),
          );
        }
        // Carregar contas
        const loadedAccounts = await accountsService.getAccounts();

        if (loadedAccounts && loadedAccounts.length > 0) {
          setAccounts(
            loadedAccounts.map((acc) => {
              let frontendType: "bank" | "cash" | "card" | "refeicao" | "alimentacao" = "bank";
              if (acc.type === "cash") frontendType = "cash";
              else if (acc.type === "credit") frontendType = "card";
              else if (acc.type === "refeicao") frontendType = "refeicao";
              else if (acc.type === "alimentacao") frontendType = "alimentacao";
              else if (
                acc.type === "checking" ||
                acc.type === "savings" ||
                acc.type === "investment"
              )
                frontendType = "bank";

              return {
                id: acc.id,
                name: acc.name,
                type: frontendType,
                balance: acc.balance,
                currency: "BRL" as const,
                color: "#3b82f6",
              };
            }),
          );
        }
        // Carregar transações do mês atual (evita mistura com mês anterior)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const loadedTransactions = await transactionsService.getTransactions({
          start_date: startOfMonth.toISOString().slice(0, 10),
          end_date: endOfMonth.toISOString().slice(0, 10),
          limit: 100,
        });

        setTransactions(
          (loadedTransactions ?? []).map((t) => ({
            id: t.id,
            date: t.date,
            account:
              (t as { account_id?: string; account?: string }).account_id ??
              (t as { account?: string }).account,
            category:
              (t as { category_id?: string; category?: string }).category_id ??
              (t as { category?: string }).category,
            type: t.type,
            amount:
              t.type === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount),
            description: t.description,
            tags: t.tags || [],
            createdAt: t.createdAt || new Date().toISOString(),
          })),
        );
        // Carregar metas
        try {
          const loadedGoals = await goalsService.getGoals();
          if (loadedGoals && loadedGoals.length >= 0) {
            setGoals(
              loadedGoals.map((g) => ({
                id: g.id,
                name: g.name,
                targetAmount: g.target_amount,
                currentAmount: g.current_amount,
                category: g.category,
                period: "oneoff" as const,
                dueDate: g.target_date?.slice(0, 10) ?? undefined,
                status: (g.status === "active" ? "on_track" : (g.status as Goal["status"])) ?? "on_track",
              })),
            );
          }
        } catch {
          // Metas opcional
        }
        // Carregar caixinhas (envelopes)
        try {
          const loadedEnvelopes = await envelopesService.getEnvelopes();
          if (loadedEnvelopes && loadedEnvelopes.length >= 0) {
            setEnvelopes(
              loadedEnvelopes.map((e) => ({
                id: e.id,
                name: e.name,
                balance: e.balance,
                targetAmount: e.target_amount ?? undefined,
                color: e.color,
                description: e.description ?? undefined,
              })),
            );
          }
        } catch {
          // Caixinhas opcional
        }
        // Sync despesas compartilhadas do backend (criador + participante com share aceito)
        await syncSharedExpensesFromBackend();
      } catch {
        // Erro ao carregar dados — silencioso no UI; store permanece anterior
      }
    };

      loadData();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, setCategories, setAccounts, setTransactions, setGoals, setEnvelopes]);

  // Retornar função para recarregar manualmente se necessário
  return {
    reload: () => {
      if (isAuthenticated && user) {
        const loadData = async () => {
          try {
            const loadedCategories = await categoriesService.getCategories();
            if (loadedCategories && loadedCategories.length > 0) {
              setCategories(
                loadedCategories.map((cat) => ({
                  id: cat.id,
                  name: cat.name,
                  type: cat.type as "income" | "expense",
                  icon: cat.icon,
                  color: cat.color,
                })),
              );
            }

            const loadedAccounts = await accountsService.getAccounts();
            if (loadedAccounts && loadedAccounts.length > 0) {
              setAccounts(
                loadedAccounts.map((acc) => {
                  let frontendType: "bank" | "cash" | "card" = "bank";
                  if (acc.type === "cash") frontendType = "cash";
                  else if (acc.type === "credit") frontendType = "card";
                  else if (
                    acc.type === "checking" ||
                    acc.type === "savings" ||
                    acc.type === "investment"
                  )
                    frontendType = "bank";

                  return {
                    id: acc.id,
                    name: acc.name,
                    type: frontendType,
                    balance: acc.balance,
                    currency: "BRL" as const,
                    color: "#3b82f6",
                  };
                }),
              );
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const loadedTransactions =
              await transactionsService.getTransactions({
                start_date: startOfMonth.toISOString().slice(0, 10),
                end_date: endOfMonth.toISOString().slice(0, 10),
                limit: 100,
              });
            setTransactions(
              (loadedTransactions ?? []).map((t) => ({
                id: t.id,
                date: t.date,
                account:
                  (t as { account_id?: string; account?: string }).account_id ??
                  (t as { account?: string }).account,
                category:
                  (t as { category_id?: string; category?: string }).category_id ??
                  (t as { category?: string }).category,
                type: t.type,
                amount:
                  t.type === "expense"
                    ? -Math.abs(t.amount)
                    : Math.abs(t.amount),
                description: t.description,
                tags: t.tags || [],
                createdAt: t.createdAt || new Date().toISOString(),
              })),
            );

            const loadedGoals = await goalsService.getGoals();
            if (loadedGoals && loadedGoals.length >= 0) {
              setGoals(
                loadedGoals.map((g) => ({
                  id: g.id,
                  name: g.name,
                  targetAmount: g.target_amount,
                  currentAmount: g.current_amount,
                  category: g.category,
                  period: "oneoff" as const,
                  dueDate: g.target_date?.slice(0, 10) ?? undefined,
                  status: (g.status === "active" ? "on_track" : (g.status as Goal["status"])) ?? "on_track",
                })),
              );
            }

            const loadedEnvelopes = await envelopesService.getEnvelopes();
            if (loadedEnvelopes && loadedEnvelopes.length >= 0) {
              setEnvelopes(
                loadedEnvelopes.map((e) => ({
                  id: e.id,
                  name: e.name,
                  balance: e.balance,
                  targetAmount: e.target_amount ?? undefined,
                  color: e.color,
                  description: e.description ?? undefined,
                })),
              );
            }

            await syncSharedExpensesFromBackend();
          } catch (error) {
            console.error("Erro ao recarregar:", error);
          }
        };
        loadData();
      }
    },
  };
}
