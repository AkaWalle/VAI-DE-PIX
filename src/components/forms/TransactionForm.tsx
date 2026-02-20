import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  transactionsService,
  TransactionCreate,
} from "@/services/transactions.service";
import { sharedExpenseApi } from "@/services/sharedExpenseApi";
import { syncSharedExpensesFromBackend } from "@/lib/shared-expenses-sync-engine";
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
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

/** Validação simples de e-mail (formato básico). */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface TransactionFormData {
  type: "income" | "expense";
  amountCents: number;
  description: string;
  category: string;
  account: string;
  date: string;
  tags: string;
  isSharedExpense: boolean;
  sharedWithEmail: string;
}

interface TransactionFormProps {
  trigger?: React.ReactNode;
}

export function TransactionForm({ trigger }: TransactionFormProps) {
  const { addTransaction, categories, accounts } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: "expense",
    amountCents: 0,
    description: "",
    category: "",
    account: "",
    date: new Date().toISOString().split("T")[0],
    tags: "",
    isSharedExpense: false,
    sharedWithEmail: "",
  });

  const defaultTrigger = (
    <ActionButton icon={Plus} variant="default">
      Nova Transação
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const amountCents = formData.amountCents;
      if (amountCents <= 0 || !formData.description || !formData.category || !formData.account) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha valor (maior que zero), descrição, categoria e conta.",
          variant: "destructive",
        });
        return;
      }

      // Despesa compartilhada: tipo deve ser expense e e-mail obrigatório/válido
      if (formData.isSharedExpense) {
        if (formData.type !== "expense") {
          toast({
            title: "Inválido",
            description: "Despesa compartilhada só é permitida para tipo Despesa.",
            variant: "destructive",
          });
          return;
        }
        const email = formData.sharedWithEmail.trim();
        if (!email) {
          toast({
            title: "E-mail obrigatório",
            description: "Informe o e-mail de quem divide a despesa.",
            variant: "destructive",
          });
          return;
        }
        if (!isValidEmail(email)) {
          toast({
            title: "E-mail inválido",
            description: "Informe um e-mail válido para quem divide a despesa.",
            variant: "destructive",
          });
          return;
        }
      }

      let sharedExpenseId: string | undefined;

      if (formData.isSharedExpense) {
        // 1. Criar despesa compartilhada (divisão igual, 2 pessoas)
        const shared = await sharedExpenseApi.createSharedExpense({
          total_cents: amountCents,
          description: formData.description,
          invited_email: formData.sharedWithEmail.trim(),
        });
        sharedExpenseId = shared.id;
        // 2. Atualizar lista de despesas no store
        await syncSharedExpensesFromBackend();
      }

      const transactionData: TransactionCreate = {
        date: new Date(formData.date).toISOString(),
        account_id: formData.account,
        category_id: formData.category,
        type: formData.type,
        amount_cents: amountCents,
        description: formData.description,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
      };
      if (sharedExpenseId) {
        transactionData.shared_expense_id = sharedExpenseId;
      }

      // Salvar transação na API
      const savedTransaction =
        await transactionsService.createTransaction(transactionData);

      // Converter formato da API para formato do store
      const respAmount = typeof (savedTransaction as { amount?: number }).amount === "number"
        ? (savedTransaction as { amount: number }).amount
        : 0;
      addTransaction({
        type: savedTransaction.type as "income" | "expense",
        amount:
          savedTransaction.type === "expense"
            ? -Math.abs(respAmount)
            : Math.abs(respAmount),
        description: savedTransaction.description,
        category:
          (savedTransaction as { category_id?: string; category?: string }).category_id ||
          savedTransaction.category,
        account:
          (savedTransaction as { account_id?: string; account?: string }).account_id ||
          savedTransaction.account,
        date: savedTransaction.date,
        tags: savedTransaction.tags || [],
      });

      toast({
        title: "Transação criada!",
        description: formData.isSharedExpense
          ? `Despesa compartilhada de ${formatCurrencyFromCents(amountCents)} adicionada. Aparece em Transações e Despesas Compartilhadas.`
          : `${formData.type === "income" ? "Receita" : "Despesa"} de ${formatCurrencyFromCents(amountCents)} adicionada com sucesso.`,
      });

      // Reset form
      setFormData({
        type: "expense",
        amountCents: 0,
        description: "",
        category: "",
        account: "",
        date: new Date().toISOString().split("T")[0],
        tags: "",
        isSharedExpense: false,
        sharedWithEmail: "",
      });

      setIsOpen(false);
    } catch {
      toast({
        title: "Erro ao criar transação",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    field: keyof TransactionFormData,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Ao mudar tipo para receita, desligar despesa compartilhada
      if (field === "type" && value === "income") {
        next.isSharedExpense = false;
      }
      return next;
    });
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Transação"
      description="Adicione uma nova receita ou despesa ao seu controle financeiro."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Criar Transação"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "income" | "expense") =>
              updateFormData("type", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">💰 Receita</SelectItem>
              <SelectItem value="expense">💸 Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor *</Label>
          <CurrencyInput
            id="amount"
            value={formData.amountCents}
            onChange={(v) => updateFormData("amountCents", v)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          placeholder="Ex: Compra no supermercado"
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
        />
      </div>

      {/* Toggle despesa compartilhada: só para tipo Despesa */}
      {formData.type === "expense" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isSharedExpense">É uma despesa compartilhada?</Label>
              <p className="text-xs text-muted-foreground">
                Divide com outra pessoa (divisão igual). A despesa aparecerá em Transações e em Despesas Compartilhadas.
              </p>
            </div>
            <Switch
              id="isSharedExpense"
              checked={formData.isSharedExpense}
              onCheckedChange={(checked) =>
                updateFormData("isSharedExpense", checked)
              }
            />
          </div>
          {formData.isSharedExpense && (
            <div className="space-y-2">
              <Label htmlFor="sharedWithEmail">E-mail de quem divide *</Label>
              <Input
                id="sharedWithEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.sharedWithEmail}
                onChange={(e) =>
                  updateFormData("sharedWithEmail", e.target.value)
                }
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((cat) => cat.type === formData.type)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account">Conta *</Label>
          <Select
            value={formData.account}
            onValueChange={(value) => updateFormData("account", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <Label htmlFor="tags">Tags (opcional)</Label>
        <Input
          id="tags"
          placeholder="Ex: supermercado, alimentação, casa"
          value={formData.tags}
          onChange={(e) => updateFormData("tags", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Separe as tags por vírgula
        </p>
      </div>
    </FormDialog>
  );
}
