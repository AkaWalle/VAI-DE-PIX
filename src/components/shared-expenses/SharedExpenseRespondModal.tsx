import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import type { PendingShareItem } from "@/services/sharedExpenseApi";
import { ExpenseShareTimeline } from "./ExpenseShareTimeline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";

interface SharedExpenseRespondModalProps {
  share: PendingShareItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (shareId: string, action: "accept" | "reject") => Promise<void>;
  isSubmitting: boolean;
}

export function SharedExpenseRespondModal({
  share,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: SharedExpenseRespondModalProps) {
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(null);

  const handleConfirm = async (action: "accept" | "reject") => {
    if (!share) return;
    setConfirmAction(action);
  };

  const handleAlertConfirm = async () => {
    if (!share || !confirmAction) return;
    try {
      await onConfirm(share.id, confirmAction);
      setConfirmAction(null);
      onOpenChange(false);
    } catch {
      setConfirmAction(null);
    }
  };

  const handleAlertCancel = () => {
    setConfirmAction(null);
  };

  if (!share) return null;

  return (
    <>
      <ResponsiveOverlay
        open={open}
        onOpenChange={onOpenChange}
        title="Despesa compartilhada"
        description={share.expense_description}
        mobileVariant="sheet"
        desktopContentClassName="flex flex-col w-full max-h-[90vh] max-w-[95vw] overflow-x-hidden overflow-y-hidden sm:max-w-md"
        bodyClassName="space-y-2 py-2"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              fullWidthMobile
            >
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirm("reject")}
              disabled={isSubmitting}
              fullWidthMobile
            >
              Recusar
            </Button>
            <Button
              onClick={() => handleConfirm("accept")}
              disabled={isSubmitting}
              fullWidthMobile
            >
              Aceitar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Valor:</span>{" "}
          {formatCurrency(share.expense_amount, { showSign: false })}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Criado por:</span>{" "}
          {share.creator_name}
        </p>
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Histórico</p>
          <ExpenseShareTimeline shareId={share.id} />
        </div>
      </ResponsiveOverlay>

      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => !o && handleAlertCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "accept" ? "Aceitar despesa?" : "Recusar despesa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "accept"
                ? "A despesa será considerada na sua lista de despesas compartilhadas."
                : "A despesa não será adicionada. Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAlertCancel} disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlertConfirm}
              disabled={isSubmitting}
              className={confirmAction === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isSubmitting ? "Enviando..." : confirmAction === "accept" ? "Aceitar" : "Recusar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
