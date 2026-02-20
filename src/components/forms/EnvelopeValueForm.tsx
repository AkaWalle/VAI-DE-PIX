import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { envelopesService } from "@/services/envelopes.service";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Label } from "@/components/ui/label";
import { formatCurrencyFromCents } from "@/utils/currency";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle } from "lucide-react";

interface ValueFormData {
  type: "add" | "withdraw";
  amount: number; // centavos
  description: string;
  date: string;
}

interface EnvelopeValueFormProps {
  envelopeId: string;
  envelopeName: string;
  currentBalance: number; // centavos
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
    amount: 0,
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
      const amountCents = formData.amount;
      if (
        typeof amountCents !== "number" ||
        Number.isNaN(amountCents) ||
        amountCents <= 0
      ) {
        toast({
          title: "Valor inválido",
          description: "Por favor, insira um valor válido maior que zero.",
          variant: "destructive",
        });
        return;
      }

      if (isWithdraw && amountCents > currentBalance) {
        toast({
          title: "Saldo insuficiente",
          description: `Você não pode retirar mais que o saldo atual (${formatCurrencyFromCents(currentBalance)}).`,
          variant: "destructive",
        });
        return;
      }

      const result = isWithdraw
        ? await envelopesService.withdrawValueFromEnvelope(envelopeId, amountCents)
        : await envelopesService.addValueToEnvelope(envelopeId, amountCents);

      const newBalance = result.new_balance;
      updateEnvelope(envelopeId, {
        balance: newBalance,
      });

      toast({
        title: `Valor ${isWithdraw ? "retirado" : "adicionado"}!`,
        description: `${formatCurrencyFromCents(amountCents)} ${isWithdraw ? "retirado da" : "adicionado à"} caixinha "${envelopeName}".`,
      });

      setFormData({
        type,
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      setIsOpen(false);
    } catch {
      toast({
        title: `Erro ao ${isWithdraw ? "retirar" : "adicionar"} valor`,
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    field: keyof ValueFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title={`${isWithdraw ? "Retirar de" : "Adicionar à"} ${envelopeName}`}
      description={`Saldo atual: ${formatCurrencyFromCents(currentBalance)}`}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel={isWithdraw ? "Retirar Valor" : "Adicionar Valor"}
    >
      <div className="space-y-2">
        <Label htmlFor="amount">Valor *</Label>
        <CurrencyInput
          id="amount"
          value={formData.amount}
          onChange={(v) => updateFormData("amount", v)}
        />
        {isWithdraw && (
          <p className="text-xs text-muted-foreground">
            Máximo: {formatCurrencyFromCents(currentBalance)}
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
