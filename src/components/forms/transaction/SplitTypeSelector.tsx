import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SharedExpenseSplitType } from "./sharedExpense.types";

type SplitTypeSelectorProps = {
  value: SharedExpenseSplitType;
  onChange: (value: SharedExpenseSplitType) => void;
  error?: string;
};

export function SplitTypeSelector({
  value,
  onChange,
  error,
}: SplitTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="shared-split-type">Tipo de Divisao</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="shared-split-type"
          className="min-h-[44px] w-full"
          aria-invalid={Boolean(error)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="equal">Divisao igual</SelectItem>
          <SelectItem value="percentage">Percentual</SelectItem>
          <SelectItem value="custom">Valor personalizado</SelectItem>
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
