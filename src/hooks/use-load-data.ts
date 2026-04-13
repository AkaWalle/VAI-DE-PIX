import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store-index";
import { useFinancialStore, type Goal } from "@/stores/financial-store";
import { transactionsService } from "@/services/transactions.service";
import { categoriesService } from "@/services/categories.service";
import { accountsService } from "@/services/accounts.service";
import { goalsService } from "@/services/goals.service";
import { envelopesService } from "@/services/envelopes.service";
import {
  isSharedExpensesGodModeEnabled,
  syncSharedExpensesFromBackend,
} from "@/lib/shared-expenses-sync-engine";
import { waitUntilAuthReady } from "@/lib/auth-runtime-guard";

/**
 * Hook para carregar dados da API quando o usuário faz login.
 * Só inicia loadData após auth estar pronto (bootstrap terminado), evitando 401 por sync antecipado.
 */
export function useLoadData() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    setTransactions,
    setCategories,
    setAccounts,
    setGoals,
    setEnvelopes,
    setEnvelopesLoading,
    setEnvelopesError,
    setDataLoading,
  } = useFinancialStore();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const authReady = await waitUntilAuthReady();
      if (cancelled || !authReady) return;

      const state = useAuthStore.getState();
      if (!state.isAuthenticated || !state.user) {
        console.log("⏸️ Usuário não autenticado, pulando carregamento de dados");
        return;
      }

      console.log(
        "✅ Usuário autenticado, iniciando carregamento de dados...",
        state.user,
      );

      const loadData = async () => {
      try {
        console.log("🔄 Carregando dados da API...");
        setDataLoading(true);

        // Carregar categorias
        console.log("📂 Carregando categorias...");
        const loadedCategories = await categoriesService.getCategories();
        console.log("✅ Categorias carregadas:", loadedCategories);

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
          console.log("✅ Categorias atualizadas no store");
        } else {
          console.warn("⚠️ Nenhuma categoria encontrada");
        }

        // Carregar contas
        console.log("💳 Carregando contas...");
        const loadedAccounts = await accountsService.getAccounts();
        console.log("✅ Contas carregadas:", loadedAccounts);

        if (loadedAccounts && loadedAccounts.length > 0) {
          setAccounts(
            loadedAccounts.map((acc) => {
              // Mapear tipos do backend para tipos do frontend
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
                color: "#3b82f6", // Cor padrão
              };
            }),
          );
          console.log("✅ Contas atualizadas no store");
        } else {
          console.warn("⚠️ Nenhuma conta encontrada");
        }

        // Carregar transações
        console.log("💰 Carregando transações...");
        const loadedTransactions = await transactionsService.getTransactions();
        console.log("✅ Transações carregadas:", loadedTransactions.length);

        if (loadedTransactions && loadedTransactions.length > 0) {
          setTransactions(
            loadedTransactions.map((t) => ({
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
          console.log("✅ Transações atualizadas no store");
        }

        // Carregar metas
        console.log("🎯 Carregando metas...");
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
            console.log("✅ Metas atualizadas no store:", loadedGoals.length);
          }
        } catch (err) {
          console.warn("⚠️ Erro ao carregar metas:", err);
        }

        // Carregar caixinhas (envelopes)
        console.log("📦 Carregando caixinhas...");
        setEnvelopesLoading(true);
        setEnvelopesError(null);
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
            console.log("✅ Caixinhas atualizadas no store:", loadedEnvelopes.length);
          }
        } catch (err) {
          console.warn("⚠️ Erro ao carregar caixinhas:", err);
          const msg = err instanceof Error ? err.message : "Erro ao carregar caixinhas";
          setEnvelopesError(msg);
        } finally {
          setEnvelopesLoading(false);
        }

        // GOD MODE: sync despesas compartilhadas do backend (read-model)
        if (isSharedExpensesGodModeEnabled()) {
          await syncSharedExpensesFromBackend();
        }

        console.log("✅ Dados carregados com sucesso!");
      } catch (error: unknown) {
        console.error("❌ Erro ao carregar dados da API:", error);
        const err = error as { message?: string; response?: { status?: number; data?: unknown } };
        console.error("❌ Detalhes do erro:", err.message);
        if (err.response) {
          console.error("❌ Status:", err.response.status);
          console.error("❌ Dados:", err.response.data);
        }
      } finally {
        setDataLoading(false);
      }
    };

      loadData();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, setCategories, setAccounts, setTransactions, setGoals, setEnvelopes, setEnvelopesLoading, setEnvelopesError, setDataLoading]);

  // Retornar função para recarregar manualmente se necessário
  return {
    reload: () => {
      if (isAuthenticated && user) {
        const loadData = async () => {
          try {
            console.log("🔄 Recarregando dados manualmente...");
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

            const loadedTransactions =
              await transactionsService.getTransactions();
            if (loadedTransactions && loadedTransactions.length > 0) {
              setTransactions(
                loadedTransactions.map((t) => ({
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
            }

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

            if (isSharedExpensesGodModeEnabled()) {
              await syncSharedExpensesFromBackend();
            }
          } catch (error) {
            console.error("Erro ao recarregar:", error);
          }
        };
        loadData();
      }
    },
  };
}
