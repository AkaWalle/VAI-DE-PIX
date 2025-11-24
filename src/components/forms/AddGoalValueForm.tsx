import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

interface AddValueFormData {
  amount: string;
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
    amount: "",
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
      if (!formData.amount) {
        toast({
          title: "Valor obrigatório",
          description: "Por favor, insira o valor a ser adicionado.",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(formData.amount.replace(",", "."));
      if (isNaN(amount) || amount <= 0) {
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

      // Atualizar meta
      const newCurrentAmount = goal.currentAmount + amount;
      updateGoal(goalId, {
        currentAmount: newCurrentAmount,
      });

      toast({
        title: "Valor adicionado!",
        description: `${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionado à meta "${goalName}".`,
      });

      // Reset form
      setFormData({
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao adicionar valor",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof AddValueFormData, value: string) => {
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
        <Input
          id="amount"
          type="text"
          placeholder="0,00"
          value={formData.amount}
          onChange={(e) => updateFormData("amount", e.target.value)}
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
