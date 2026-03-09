import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SharedExpenseToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function SharedExpenseToggle({
  checked,
  onCheckedChange,
}: SharedExpenseToggleProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="shared-expense-enabled">
          Dividir esta despesa com outras pessoas
        </Label>
        <p className="text-xs text-muted-foreground">
          Ative para adicionar participantes e definir como a despesa sera
          dividida.
        </p>
      </div>
      <Switch
        id="shared-expense-enabled"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="min-h-[24px] self-start md:self-auto"
      />
    </div>
  );
}
