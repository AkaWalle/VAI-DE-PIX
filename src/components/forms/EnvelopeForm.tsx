import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { envelopesService } from "@/services/envelopes.service";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { SimpleMoneyInput, displayValueToCents } from "@/components/ui/SimpleMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

/** displayValue = string para input; conversão para centavos só no submit. */
interface EnvelopeFormData {
  name: string;
  balanceDisplay: string;
  targetAmountDisplay: string;
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
  const { envelopes, setEnvelopes } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<EnvelopeFormData>({
    name: "",
    balanceDisplay: "",
    targetAmountDisplay: "",
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
      if (!formData.name) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, insira o nome da caixinha.",
          variant: "destructive",
        });
        return;
      }

      const balanceCents = displayValueToCents(formData.balanceDisplay);
      if (balanceCents === null || balanceCents < 0) {
        toast({
          title: "Saldo inválido",
          description: "Por favor, insira um saldo válido (ex: 0 ou 10,50).",
          variant: "destructive",
        });
        return;
      }

      const targetCents = displayValueToCents(formData.targetAmountDisplay);
      if (targetCents !== null && targetCents <= 0) {
        toast({
          title: "Meta inválida",
          description: "Se informar meta, deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }

      const created = await envelopesService.createEnvelope({
        name: formData.name,
        balance: balanceCents,
        target_amount: targetCents !== null && targetCents > 0 ? targetCents : null,
        color: formData.color,
        description: formData.description || null,
      });

      const newEnvelope = {
        id: created.id,
        name: created.name,
        balance: created.balance,
        targetAmount: created.target_amount ?? undefined,
        color: created.color,
        description: created.description ?? undefined,
      };
      setEnvelopes([...envelopes, newEnvelope]);

      toast({
        title: "Caixinha criada!",
        description: `Caixinha "${formData.name}" criada com sucesso.`,
      });

      setFormData({
        name: "",
        balanceDisplay: "",
        targetAmountDisplay: "",
        color: "#3b82f6",
        description: "",
      });

      setIsOpen(false);
    } catch {
      toast({
        title: "Erro ao criar caixinha",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof EnvelopeFormData, value: string | number) => {
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
          <SimpleMoneyInput
            id="balance"
            value={formData.balanceDisplay}
            onChange={(v) => updateFormData("balanceDisplay", v)}
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAmount">Meta (opcional)</Label>
          <SimpleMoneyInput
            id="targetAmount"
            value={formData.targetAmountDisplay}
            onChange={(v) => updateFormData("targetAmountDisplay", v)}
            placeholder="0,00"
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
