import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle } from "lucide-react";

interface ValueFormData {
  type: "add" | "withdraw";
  amount: string;
  description: string;
  date: string;
}

interface EnvelopeValueFormProps {
  envelopeId: string;
  envelopeName: string;
  currentBalance: number;
  type: "add" | "withdraw";
  trigger?: React.ReactNode;
}

export function EnvelopeValueForm({
  envelopeId,
  envelopeName,
  currentBalance,
  type,
  trigger,
}: EnvelopeValueFormProps) {
  const { updateEnvelope } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ValueFormData>({
    type,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const isWithdraw = type === "withdraw";

  const defaultTrigger = (
    <ActionButton
      variant="outline"
      size="sm"
      icon={isWithdraw ? MinusCircle : PlusCircle}
      className="flex-1"
    >
      {isWithdraw ? "Retirar" : "Adicionar"}
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
          description: "Por favor, insira o valor.",
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

      // Verificar se há saldo suficiente para retirada
      if (isWithdraw && amount > currentBalance) {
        toast({
          title: "Saldo insuficiente",
          description: `Você não pode retirar mais que o saldo atual (${currentBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`,
          variant: "destructive",
        });
        return;
      }

      // Atualizar caixinha
      const newBalance = isWithdraw
        ? currentBalance - amount
        : currentBalance + amount;

      updateEnvelope(envelopeId, {
        balance: newBalance,
      });

      toast({
        title: `Valor ${isWithdraw ? "retirado" : "adicionado"}!`,
        description: `${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ${isWithdraw ? "retirado da" : "adicionado à"} caixinha "${envelopeName}".`,
      });

      // Reset form
      setFormData({
        type,
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: `Erro ao ${isWithdraw ? "retirar" : "adicionar"} valor`,
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof ValueFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title={`${isWithdraw ? "Retirar de" : "Adicionar à"} ${envelopeName}`}
      description={`Saldo atual: ${currentBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel={isWithdraw ? "Retirar Valor" : "Adicionar Valor"}
    >
      <div className="space-y-2">
        <Label htmlFor="amount">Valor *</Label>
        <Input
          id="amount"
          type="text"
          placeholder="0,00"
          value={formData.amount}
          onChange={(e) => updateFormData("amount", e.target.value)}
          className="text-right"
        />
        {isWithdraw && (
          <p className="text-xs text-muted-foreground">
            Máximo:{" "}
            {currentBalance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        )}
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
          placeholder={`Ex: ${isWithdraw ? "Compra no supermercado" : "Depósito mensal"}`}
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          rows={2}
        />
      </div>
    </FormDialog>
  );
}
