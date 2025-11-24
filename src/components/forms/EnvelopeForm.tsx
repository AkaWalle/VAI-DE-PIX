import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

interface EnvelopeFormData {
  name: string;
  balance: string;
  targetAmount: string;
  color: string;
  description: string;
}

interface EnvelopeFormProps {
  trigger?: React.ReactNode;
}

const colorOptions = [
  { value: "#ef4444", label: "Vermelho", color: "bg-red-500" },
  { value: "#f97316", label: "Laranja", color: "bg-orange-500" },
  { value: "#eab308", label: "Amarelo", color: "bg-yellow-500" },
  { value: "#22c55e", label: "Verde", color: "bg-green-500" },
  { value: "#3b82f6", label: "Azul", color: "bg-blue-500" },
  { value: "#6366f1", label: "Índigo", color: "bg-indigo-500" },
  { value: "#8b5cf6", label: "Roxo", color: "bg-purple-500" },
  { value: "#ec4899", label: "Rosa", color: "bg-pink-500" },
];

export function EnvelopeForm({ trigger }: EnvelopeFormProps) {
  const { addEnvelope } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<EnvelopeFormData>({
    name: "",
    balance: "",
    targetAmount: "",
    color: "#3b82f6",
    description: "",
  });

  const defaultTrigger = (
    <ActionButton icon={Wallet} variant="default">
      Nova Caixinha
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      if (!formData.name) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, insira o nome da caixinha.",
          variant: "destructive",
        });
        return;
      }

      const balance = formData.balance
        ? parseFloat(formData.balance.replace(",", "."))
        : 0;
      if (formData.balance && (isNaN(balance) || balance < 0)) {
        toast({
          title: "Saldo inválido",
          description:
            "Por favor, insira um saldo válido maior ou igual a zero.",
          variant: "destructive",
        });
        return;
      }

      const targetAmount = formData.targetAmount
        ? parseFloat(formData.targetAmount.replace(",", "."))
        : undefined;
      if (
        formData.targetAmount &&
        (isNaN(targetAmount!) || targetAmount! <= 0)
      ) {
        toast({
          title: "Meta inválida",
          description: "Por favor, insira uma meta válida maior que zero.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar caixinha
      addEnvelope({
        name: formData.name,
        balance,
        targetAmount,
        color: formData.color,
        description: formData.description || undefined,
      });

      toast({
        title: "Caixinha criada!",
        description: `Caixinha "${formData.name}" criada com sucesso.`,
      });

      // Reset form
      setFormData({
        name: "",
        balance: "",
        targetAmount: "",
        color: "#3b82f6",
        description: "",
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao criar caixinha",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof EnvelopeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Caixinha"
      description="Crie uma caixinha para organizar seu orçamento por categoria."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Criar Caixinha"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Caixinha *</Label>
        <Input
          id="name"
          placeholder="Ex: Emergência, Viagem, Casa..."
          value={formData.name}
          onChange={(e) => updateFormData("name", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="balance">Saldo Inicial</Label>
          <Input
            id="balance"
            type="text"
            placeholder="0,00"
            value={formData.balance}
            onChange={(e) => updateFormData("balance", e.target.value)}
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAmount">Meta (opcional)</Label>
          <Input
            id="targetAmount"
            type="text"
            placeholder="0,00"
            value={formData.targetAmount}
            onChange={(e) => updateFormData("targetAmount", e.target.value)}
            className="text-right"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Cor da Caixinha</Label>
        <div className="grid grid-cols-4 gap-2">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                flex items-center gap-2 p-2 rounded-md border transition-all
                ${
                  formData.color === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }
              `}
              onClick={() => updateFormData("color", option.value)}
            >
              <div className={`w-4 h-4 rounded-full ${option.color}`} />
              <span className="text-xs">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Para que serve esta caixinha?"
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          rows={2}
        />
      </div>
    </FormDialog>
  );
}
