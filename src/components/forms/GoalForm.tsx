import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { goalsService } from "@/services/goals.service";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Label } from "@/components/ui/label";
import { formatCurrencyFromCents } from "@/utils/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Target } from "lucide-react";

interface GoalFormData {
  name: string;
  targetAmountCents: number;
  targetDate: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
}

interface GoalFormProps {
  trigger?: React.ReactNode;
}

export function GoalForm({ trigger }: GoalFormProps) {
  const { goals, setGoals } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<GoalFormData>({
    name: "",
    targetAmountCents: 0,
    targetDate: "",
    description: "",
    category: "savings",
    priority: "medium",
  });

  const defaultTrigger = (
    <ActionButton icon={Target} variant="default">
      Nova Meta
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      if (!formData.name || formData.targetAmountCents <= 0 || !formData.targetDate) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (targetDate <= today) {
        toast({
          title: "Data inválida",
          description: "A data da meta deve ser posterior à data atual.",
          variant: "destructive",
        });
        return;
      }

      // Salvar na API (contrato: target_amount_cents int) e atualizar o store
      const created = await goalsService.createGoal({
        name: formData.name,
        target_amount_cents: formData.targetAmountCents,
        target_date: formData.targetDate,
        description: formData.description || null,
        category: formData.category,
        priority: formData.priority,
      });

      const newGoal = {
        id: created.id,
        name: created.name,
        targetAmount: created.target_amount,
        currentAmount: created.current_amount,
        category: created.category,
        period: "oneoff" as const,
        dueDate: created.target_date.slice(0, 10),
        status: (created.status === "active" ? "on_track" : (created.status as "on_track" | "at_risk" | "achieved" | "overdue")) ?? "on_track",
      };
      setGoals([...goals, newGoal]);

      toast({
        title: "Meta criada!",
        description: `Meta "${formData.name}" de ${formatCurrencyFromCents(formData.targetAmountCents)} criada com sucesso.`,
      });

      // Reset form
      setFormData({
        name: "",
        targetAmountCents: 0,
        targetDate: "",
        description: "",
        category: "savings",
        priority: "medium",
      });

      setIsOpen(false);
    } catch {
      toast({
        title: "Erro ao criar meta",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    field: keyof GoalFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Meta Financeira"
      description="Defina um objetivo financeiro para acompanhar seu progresso."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Criar Meta"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Meta *</Label>
        <Input
          id="name"
          placeholder="Ex: Viagem para Europa"
          value={formData.name}
          onChange={(e) => updateFormData("name", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetAmount">Valor da Meta *</Label>
          <CurrencyInput
            id="targetAmount"
            value={formData.targetAmountCents}
            onChange={(v) => updateFormData("targetAmountCents", v)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">Data Objetivo *</Label>
          <Input
            id="targetDate"
            type="date"
            value={formData.targetDate}
            onChange={(e) => updateFormData("targetDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">💰 Poupança</SelectItem>
              <SelectItem value="investment">📈 Investimento</SelectItem>
              <SelectItem value="travel">✈️ Viagem</SelectItem>
              <SelectItem value="house">🏠 Casa</SelectItem>
              <SelectItem value="car">🚗 Veículo</SelectItem>
              <SelectItem value="education">🎓 Educação</SelectItem>
              <SelectItem value="health">🏥 Saúde</SelectItem>
              <SelectItem value="emergency">🚨 Emergência</SelectItem>
              <SelectItem value="other">📦 Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: "low" | "medium" | "high") =>
              updateFormData("priority", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Baixa</SelectItem>
              <SelectItem value="medium">🟡 Média</SelectItem>
              <SelectItem value="high">🔴 Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Descreva sua meta e como pretende alcançá-la..."
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          rows={3}
        />
      </div>
    </FormDialog>
  );
}
