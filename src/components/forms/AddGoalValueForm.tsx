import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { goalsService } from "@/services/goals.service";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { toApiAmount } from "@/utils/currency";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

interface AddValueFormData {
  amount: number;
  description: string;
  date: string;
}

interface AddGoalValueFormProps {
  goalId: string;
  goalName: string;
  trigger?: React.ReactNode;
}

export function AddGoalValueForm({
  goalId,
  goalName,
  trigger,
}: AddGoalValueFormProps) {
  const { updateGoal, goals } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<AddValueFormData>({
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const goal = goals.find((g) => g.id === goalId);

  const defaultTrigger = (
    <ActionButton
      variant="outline"
      size="sm"
      icon={PlusCircle}
      className="flex-1"
    >
      Adicionar Valor
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      const amount = toApiAmount(formData.amount);
      if (amount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, insira um valor válido maior que zero.",
          variant: "destructive",
        });
        return;
      }

      if (!goal) {
        toast({
          title: "Meta não encontrada",
          description: "A meta não foi encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Salvar na API e atualizar o store
      const result = await goalsService.addValueToGoal(goalId, amount);
      updateGoal(goalId, {
        currentAmount: result.new_amount,
      });

      toast({
        title: "Valor adicionado!",
        description: `${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionado à meta "${goalName}".`,
      });

      // Reset form
      setFormData({
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      setIsOpen(false);
    } catch {
      toast({
        title: "Erro ao adicionar valor",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    field: keyof AddValueFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!goal) return null;

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title={`Adicionar Valor - ${goalName}`}
      description={`Valor atual: ${goal.currentAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de ${goal.targetAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Adicionar Valor"
    >
      <div className="space-y-2">
        <Label htmlFor="amount">Valor a Adicionar *</Label>
        <MoneyInput
          id="amount"
          value={formData.amount}
          onChange={(v) => updateFormData("amount", v)}
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => updateFormData("date", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Ex: Depósito mensal, bônus do trabalho..."
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          rows={2}
        />
      </div>
    </FormDialog>
  );
}
