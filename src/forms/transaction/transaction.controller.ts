import { useRef, useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { useAuthStore } from "@/stores/auth-store-index";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useSyncStore } from "@/stores/sync-store";
import {
  transactionsService,
  type TransactionCreate,
} from "@/services/transactions.service";
import { sharedExpenseApi } from "@/services/sharedExpenseApi";
import { syncSharedExpensesFromBackend } from "@/lib/shared-expenses-sync-engine";
import { formatCurrencyFromCents } from "@/utils/currency";
import { automationsService } from "@/services/automations.service";
import {
  buildSharedExpensePayload,
  normalizeParticipants,
  validateSplitTotal,
} from "@/components/forms/transaction/sharedExpense.helpers";
import type {
  TransactionFormState,
} from "./transaction.types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function useTransactionController() {
  const { addTransaction, transactions, categories, accounts } = useFinancialStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const beginTransactionSession = () => {
    idempotencyKeyRef.current = generateIdempotencyKey();
  };

  const clearTransactionSession = () => {
    idempotencyKeyRef.current = null;
  };

  const validateTransaction = (form: TransactionFormState): boolean => {
    if (
      form.amountCents <= 0 ||
      !form.description ||
      !form.category ||
      !form.account
    ) {
      toast({
        title: "Campos incompletos",
        description:
          "Preencha valor (maior que zero), descrição, categoria e conta.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateSharedExpense = (form: TransactionFormState): boolean => {
    if (!form.sharedExpense.enabled) return true;

    if (form.type !== "expense") {
      toast({
        title: "Inválido",
        description: "Despesa compartilhada só é permitida para tipo Despesa.",
        variant: "destructive",
      });
      return false;
    }

    const participants = normalizeParticipants(form.sharedExpense.participants);

    if (participants.length < 2) {
      toast({
        title: "Participantes insuficientes",
        description:
          "Adicione pelo menos 2 participantes para dividir a despesa.",
        variant: "destructive",
      });
      return false;
    }

    const hasInvalidParticipant = participants.some((participant) => {
      const isCurrentUser =
        participant.userId === "current-user" ||
        (!!user?.email &&
          participant.userEmail.toLowerCase() === user.email.toLowerCase());

      if (!participant.userName.trim()) return true;
      if (isCurrentUser && user?.id) return false;
      return !isValidEmail(participant.userEmail);
    });

    if (hasInvalidParticipant) {
      toast({
        title: "E-mail inválido",
        description:
          "Revise os participantes e informe e-mails válidos para dividir a despesa.",
        variant: "destructive",
      });
      return false;
    }

    const sharedExpenseValidation = validateSplitTotal(
      form.amountCents,
      form.sharedExpense.participants,
    );

    if (!sharedExpenseValidation.isValid) {
      toast({
        title: "Divisão inválida",
        description:
          "A soma da divisão deve ser igual ao valor total da transação.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const submitTransaction = async (form: TransactionFormState) => {
    setIsLoading(true);

    try {
      if (!validateTransaction(form) || !validateSharedExpense(form)) return false;

      const amountCents = form.amountCents;
      let sharedExpenseId: string | undefined;

      if (form.sharedExpense.enabled) {
        const sharedPayload = buildSharedExpensePayload({
          totalCents: amountCents,
          description: form.description,
          splitType: form.sharedExpense.splitType,
          participants: form.sharedExpense.participants,
          currentUserId: user?.id,
          currentUserEmail: user?.email,
        });

        const shared = await sharedExpenseApi.createSharedExpense(sharedPayload);
        sharedExpenseId = shared.id;
        await syncSharedExpensesFromBackend();
      }

      const transactionData: TransactionCreate = {
        date: new Date(form.date).toISOString(),
        account_id: form.account,
        category_id: form.category,
        type: form.type,
        amount_cents: amountCents,
        description: form.description,
        tags: form.tags ? form.tags.split(",").map((tag) => tag.trim()) : [],
      };

      if (sharedExpenseId) {
        transactionData.shared_expense_id = sharedExpenseId;
      }

      const idempotencyKey =
        idempotencyKeyRef.current ?? generateIdempotencyKey();
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = idempotencyKey;

      const savedTransaction = await transactionsService.createTransaction(
        transactionData,
        idempotencyKey,
      );

      const respAmount =
        typeof (savedTransaction as { amount?: number }).amount === "number"
          ? (savedTransaction as { amount: number }).amount
          : 0;

      addTransaction({
        id: savedTransaction.id,
        createdAt:
          (savedTransaction as { createdAt?: string }).createdAt ??
          new Date().toISOString(),
        type: savedTransaction.type as "income" | "expense",
        amount:
          savedTransaction.type === "expense"
            ? -Math.abs(respAmount)
            : Math.abs(respAmount),
        description: savedTransaction.description,
        category:
          (savedTransaction as { category_id?: string; category?: string })
            .category_id || savedTransaction.category,
        account:
          (savedTransaction as { account_id?: string; account?: string })
            .account_id || savedTransaction.account,
        date: savedTransaction.date,
        tags: savedTransaction.tags || [],
      });

      sonnerToast.success("Transação salva", {
        description: form.sharedExpense.enabled
          ? `Despesa compartilhada de ${formatCurrencyFromCents(amountCents)}. Veja em Transações e Despesas compartilhadas.`
          : `${form.type === "income" ? "Receita" : "Despesa"} de ${formatCurrencyFromCents(amountCents)} registrada.`,
      });

      if (form.type === "expense" && form.category) {
        try {
          const rules = await automationsService.getAutomations();
          const categoryLimits = rules.filter(
            (rule) =>
              rule.type === "category_limit" &&
              rule.conditions?.category_id === form.category,
          );
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
          );
          const monthSumFromStore = transactions
            .filter(
              (transaction) =>
                transaction.type === "expense" &&
                transaction.category === form.category &&
                new Date(transaction.date) >= startOfMonth &&
                new Date(transaction.date) <= endOfMonth,
            )
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
          const monthSumCents = Math.round(monthSumFromStore * 100) + amountCents;

          for (const rule of categoryLimits) {
            const limitCents =
              Number(
                rule.conditions?.amount_cents ?? rule.conditions?.amount ?? 0,
              ) || 0;
            if (limitCents > 0 && monthSumCents > limitCents) {
              const category = categories.find((item) => item.id === form.category);
              toast({
                title: "Limite de categoria ultrapassado",
                description: `A categoria "${category?.name ?? "Despesa"}" passou do limite mensal de ${formatCurrencyFromCents(limitCents)}. Gasto no mês: ${formatCurrencyFromCents(monthSumCents)}.`,
                variant: "destructive",
              });
              break;
            }
          }
        } catch {
          // Não falhar o fluxo por causa da verificação de limite.
        }
      }

      if (form.type === "expense" && form.category && amountCents > 0) {
        try {
          const now = new Date();
          const amountsByMonth: Record<string, number> = {};
          for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            const date = new Date(
              now.getFullYear(),
              now.getMonth() - monthOffset,
              1,
            );
            const key = `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, "0")}`;
            amountsByMonth[key] = 0;
          }

          transactions
            .filter(
              (transaction) =>
                transaction.type === "expense" &&
                transaction.category === form.category &&
                transaction.date,
            )
            .forEach((transaction) => {
              const date = new Date(transaction.date);
              const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1,
              ).padStart(2, "0")}`;
              if (key in amountsByMonth) {
                amountsByMonth[key] += Math.abs(transaction.amount);
              }
            });

          const totalThreeMonths = Object.values(amountsByMonth).reduce(
            (sum, value) => sum + value,
            0,
          );
          const avgMonthly = totalThreeMonths / 3;
          const currentAmountReais = amountCents / 100;

          if (avgMonthly > 0 && currentAmountReais > 2 * avgMonthly) {
            const category = categories.find((item) => item.id === form.category);
            toast({
              title: "Gasto incomum",
              description: `${formatCurrencyFromCents(amountCents)} é mais de 2x sua média em ${category?.name ?? "esta categoria"} (média ~${formatCurrencyFromCents(Math.round(avgMonthly * 100))}/mês).`,
              variant: "destructive",
            });
          }
        } catch {
          // Não bloquear criação.
        }
      }

      return true;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      const detailStr =
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : "";
      const message = (err as { message?: string })?.message ?? "";

      if (
        status === 400 &&
        (detailStr.includes("convidar a si mesmo") ||
          detailStr.includes("você mesmo"))
      ) {
        toast({
          title: "E-mail inválido",
          description: "Você não pode dividir uma despesa com você mesmo.",
          variant: "destructive",
        });
      } else if (
        (status !== undefined && status >= 500) ||
        status === 0 ||
        /network|timeout|conexão/i.test(message)
      ) {
        useSyncStore.getState().setError("Erro de conexão ao criar transação.");
        toast({
          title: "Erro de conexão",
          description:
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
          variant: "destructive",
        });
      } else {
        useSyncStore.getState().setError(message || "Erro ao criar transação.");
        toast({
          title: "Erro inesperado",
          description: "Algo deu errado. Se persistir, tente recarregar a página.",
          variant: "destructive",
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    categories,
    accounts,
    isLoading,
    beginTransactionSession,
    clearTransactionSession,
    validateTransaction,
    validateSharedExpense,
    submitTransaction,
  };
}
