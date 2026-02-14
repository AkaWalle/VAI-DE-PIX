import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store-index";
import {
  canRespondShare,
  canEditExpense,
  canDeleteExpense,
} from "@/utils/permissions";

export type PermissionFn = (context: Record<string, string>) => boolean;

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const userId = user?.id ?? "";

    const canRespondShareCheck: PermissionFn = (ctx) =>
      canRespondShare(userId, ctx.shareUserId ?? "");

    const canEditExpenseCheck: PermissionFn = (ctx) =>
      canEditExpense(userId, ctx.createdBy ?? "");

    const canDeleteExpenseCheck: PermissionFn = (ctx) =>
      canDeleteExpense(userId, ctx.createdBy ?? "");

    return {
      userId,
      canRespondShare: canRespondShareCheck,
      canEditExpense: canEditExpenseCheck,
      canDeleteExpense: canDeleteExpenseCheck,
    };
  }, [user?.id]);
}
