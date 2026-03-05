import { useState, useRef } from "react";
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
import { automationsService } from "@/services/automations.service";

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

/** Gera UUID v4 para Idempotency-Key (uma por intenção de criação; reutilizado em retries). */
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function TransactionForm({ trigger }: TransactionFormProps) {
  const { addTransaction, transactions, categories, accounts } = useFinancialStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

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
          title: "Campos incompletos",
          description: "Preencha valor (maior que zero), descrição, categoria e conta.",
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
            description: "Informe um e-mail válido para dividir a despesa.",
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

      // Salvar transação na API (Idempotency-Key: uma por abertura do dialog, reutilizada em retries)
      const idempotencyKey = idempotencyKeyRef.current ?? generateIdempotencyKey();
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = idempotencyKey;
      const savedTransaction = await transactionsService.createTransaction(
        transactionData,
        idempotencyKey,
      );

      // Converter formato da API para formato do store
      const respAmount = typeof (savedTransaction as { amount?: number }).amount === "number"
        ? (savedTransaction as { amount: number }).amount
        : 0;
      addTransaction({
        id: savedTransaction.id,
        createdAt: (savedTransaction as { createdAt?: string }).createdAt ?? new Date().toISOString(),
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

      // Verificar limite de categoria (apenas para despesas)
      if (formData.type === "expense" && formData.category) {
        try {
          const rules = await automationsService.getAutomations();
          const categoryLimits = rules.filter(
            (r) => r.type === "category_limit" && r.conditions?.category_id === formData.category,
          );
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const monthSumFromStore = transactions
            .filter(
              (t) =>
                t.type === "expense" &&
                t.category === formData.category &&
                new Date(t.date) >= startOfMonth &&
                new Date(t.date) <= endOfMonth,
            )
            .reduce((s, t) => s + Math.abs(t.amount), 0);
          // Incluir a transação recém-criada (store pode ainda não ter atualizado)
          const monthSumCents = Math.round(monthSumFromStore * 100) + amountCents;
          for (const rule of categoryLimits) {
            const limitCents = Number(rule.conditions?.amount_cents ?? rule.conditions?.amount ?? 0) || 0;
            if (limitCents > 0 && monthSumCents > limitCents) {
              const cat = categories.find((c) => c.id === formData.category);
              toast({
                title: "Limite de categoria ultrapassado",
                description: `A categoria "${cat?.name ?? "Despesa"}" passou do limite mensal de ${formatCurrencyFromCents(limitCents)}. Gasto no mês: ${formatCurrencyFromCents(monthSumCents)}.`,
                variant: "destructive",
              });
              break;
            }
          }
        } catch {
          // Não falhar o fluxo por causa da verificação de limite
        }
      }

      // Alerta de gasto incomum: valor > 2x a média dos últimos 3 meses na categoria
      if (formData.type === "expense" && formData.category && amountCents > 0) {
        try {
          const now = new Date();
          const amountsByMonth: Record<string, number> = {};
          for (let m = 0; m < 3; m++) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            amountsByMonth[key] = 0;
          }
          transactions
            .filter(
              (t) =>
                t.type === "expense" &&
                t.category === formData.category &&
                t.date,
            )
            .forEach((t) => {
              const dt = new Date(t.date);
              const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
              if (key in amountsByMonth)
                amountsByMonth[key] += Math.abs(t.amount);
            });
          const totalThreeMonths = Object.values(amountsByMonth).reduce(
            (a, b) => a + b,
            0,
          );
          const avgMonthly = totalThreeMonths / 3;
          const currentAmountReais = amountCents / 100;
          if (
            avgMonthly > 0 &&
            currentAmountReais > 2 * avgMonthly
          ) {
            const cat = categories.find((c) => c.id === formData.category);
            toast({
              title: "Gasto incomum",
              description: `${formatCurrencyFromCents(amountCents)} é mais de 2x sua média em ${cat?.name ?? "esta categoria"} (média ~${formatCurrencyFromCents(Math.round(avgMonthly * 100))}/mês).`,
              variant: "destructive",
            });
          }
        } catch {
          // Não bloquear criação
        }
      }

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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const detailStr = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
      const message = (err as { message?: string })?.message ?? "";

      if (status === 400 && (detailStr.includes("convidar a si mesmo") || detailStr.includes("você mesmo"))) {
        toast({
          title: "E-mail inválido",
          description: "Você não pode dividir uma despesa com você mesmo.",
          variant: "destructive",
        });
      } else if ((status !== undefined && status >= 500) || status === 0 || /network|timeout|conexão/i.test(message)) {
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Algo deu errado. Se persistir, tente recarregar a página.",
          variant: "destructive",
        });
      }
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

  const handleOpenChange = (open: boolean) => {
    if (open) {
      idempotencyKeyRef.current = generateIdempotencyKey();
      // Garantir formulário vazio ao abrir para nova transação (evita dados da anterior)
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
    } else {
      idempotencyKeyRef.current = null;
    }
    setIsOpen(open);
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Transação"
      description="Adicione uma nova receita ou despesa ao seu controle financeiro."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={handleOpenChange}
      submitLabel="Criar Transação"
    >
      {/* Mobile bottom-sheet pattern: container flex + scroll único; header/footer ficam no FormDialog */}
      <div className="flex flex-col max-h-[90dvh] sm:max-h-none">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 sm:pb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </div>
    </FormDialog>
  );
}
