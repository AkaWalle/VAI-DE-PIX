import { Badge } from "@/components/ui/badge";
import { formatCurrencyFromCents } from "@/utils/currency";
import { Calculator } from "lucide-react";
import type { SplitValidation } from "./sharedExpense.types";

type SplitSummaryProps = {
  totalCents: number;
  validation: SplitValidation;
};

export function SplitSummary({
  totalCents,
  validation,
}: SplitSummaryProps) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        <span className="font-medium">Resumo da divisao</span>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span>Valor total:</span>
          <span className="text-right font-semibold">
            {formatCurrencyFromCents(totalCents)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span>Total dividido:</span>
          <span className="text-right font-semibold">
            {formatCurrencyFromCents(validation.totalSplitCents)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span>Diferenca:</span>
          <span
            className={`font-semibold ${
              validation.isValid ? "text-green-600" : "text-red-600"
            } text-right`}
          >
            {formatCurrencyFromCents(validation.differenceCents)}
          </span>
        </div>
      </div>

      {validation.isValid ? (
        <Badge variant="secondary" className="bg-green-500/20 text-green-700">
          Divisao valida
        </Badge>
      ) : (
        <Badge variant="destructive">Os valores nao coincidem</Badge>
      )}
    </div>
  );
}
