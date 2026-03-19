import { useState, useEffect, useMemo, useId } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { useAuthStore } from "@/stores/auth-store-index";
import { useSharedExpensesStore } from "@/stores/shared-expenses-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import {
  fromCents,
  toCents,
  formatCurrencyFromCents,
  calculateSplit,
  getInvitedEmail,
} from "@/utils/currency";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  Plus,
  Trash2,
  Users,
  Calculator,
  UserPlus,
} from "lucide-react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { logError } from "@/lib/logger";

interface SharedExpenseFormProps {
  expenseId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Participant {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paid: boolean;
}

export function SharedExpenseForm({
  expenseId,
  onClose,
  onSuccess,
}: SharedExpenseFormProps) {
  const formId = useId();
  const { sharedExpenses, categories, updateSharedExpense } = useFinancialStore();
  const { user } = useAuthStore();
  const { createExpense } = useSharedExpensesStore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    totalAmountCents: 0,
    category: "",
    date: new Date().toISOString().split("T")[0],
    splitType: "equal" as "equal" | "percentage" | "custom",
  });

  const [participants, setParticipants] = useState<Participant[]>([
    {
      userId: "current-user",
      userName: user?.name ?? "Você",
      userEmail: user?.email ?? "seu@email.com",
      amount: 0,
      paid: false,
    },
  ]);

  const [newParticipant, setNewParticipant] = useState({
    name: "",
    email: "",
  });

  const isEditing = !!expenseId;
  const expense = isEditing
    ? sharedExpenses.find((e) => e.id === expenseId)
    : null;

  // Sincroniza formulário ao editar; apenas expense é dependência (user não é usado aqui)
  useEffect(() => {
    if (expense) {
      const totalAmountCents = toCents(expense.totalAmount);
      setFormData({
        title: expense.title,
        description: expense.description || "",
        totalAmountCents,
        category: expense.category,
        date: expense.date,
        splitType: "equal",
      });
      setParticipants(expense.participants);
    }
  }, [expense]);

  // Atualizar primeiro participante com e-mail e nome do usuário logado
  useEffect(() => {
    if (!user || expense) return;
    setParticipants((prev) => {
      if (prev.length === 0 || prev[0].userId !== "current-user") return prev;
      return [
        { ...prev[0], userName: user.name, userEmail: user.email },
        ...prev.slice(1),
      ];
    });
  }, [user, expense]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "totalAmountCents" || field === "splitType") {
      const totalReais =
        field === "totalAmountCents"
          ? (typeof value === "number" ? value / 100 : 0)
          : formData.totalAmountCents / 100;
      const splitType = field === "splitType" ? (value as string) : formData.splitType;
      recalculateSplit(totalReais, splitType);
    }
  };

  const recalculateSplit = (total?: number, splitType?: string) => {
    const t = total ?? formData.totalAmountCents / 100;
    const st = splitType ?? formData.splitType;
    if (participants.length === 0) return;
    if (st === "equal") {
      const amountPerPersonCents = Math.round((t * 100) / participants.length);
      const amountPerPerson = amountPerPersonCents / 100;
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, amount: amountPerPerson })),
      );
    }
  };

  const addParticipant = () => {
    if (!newParticipant.name || !newParticipant.email) return;

    const newUser: Participant = {
      userId: `user-${Date.now()}`,
      userName: newParticipant.name,
      userEmail: newParticipant.email,
      amount: 0,
      paid: false,
    };

    setParticipants((prev) => [...prev, newUser]);
    setNewParticipant({ name: "", email: "" });

    // Recalcular divisão
    setTimeout(() => {
      const totalReais = formData.totalAmountCents / 100;
      const participantCount = participants.length + 1;
      const amountPerPersonCents = Math.round((totalReais * 100) / participantCount);
      const amountPerPerson = amountPerPersonCents / 100;

      setParticipants((prev) =>
        prev.map((p) => ({ ...p, amount: amountPerPerson })),
      );
    }, 0);
  };

  const removeParticipant = (userId: string) => {
    if (participants.length <= 1) return;

    setParticipants((prev) => prev.filter((p) => p.userId !== userId));

    setTimeout(() => {
      const totalReais = formData.totalAmountCents / 100;
      const participantCount = participants.length - 1;
      const amountPerPersonCents =
        participantCount > 0 ? Math.round((totalReais * 100) / participantCount) : 0;
      const amountPerPerson = amountPerPersonCents / 100;

      setParticipants((prev) =>
        prev.map((p) => ({ ...p, amount: amountPerPerson })),
      );
    }, 0);
  };

  const updateParticipantAmount = (userId: string, amount: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, amount } : p)),
    );
  };

  const totalReaisForSplit = formData.totalAmountCents / 100;
  const splitInfo = calculateSplit(totalReaisForSplit, participants);
  const isSubmitDisabled =
    formData.totalAmountCents <= 0 ||
    participants.length === 0 ||
    !splitInfo.isValid ||
    isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitDisabled) {
      toast({
        title: "Campos incompletos",
        description: "Preencha valor total (maior que zero), participantes e confira se a divisão está correta.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing) {
        const totalReaisEdit = formData.totalAmountCents / 100;
        const expenseData = {
          title: formData.title,
          description: formData.description,
          totalAmount: totalReaisEdit,
          currency: "BRL" as const,
          category: formData.category,
          date: formData.date,
          createdBy: "current-user",
          participants,
          status: "pending" as const,
        };
        updateSharedExpense(expenseId, expenseData);
        onSuccess();
        return;
      }

      const totalCents = formData.totalAmountCents;
      const invitedEmail = getInvitedEmail(participants, user?.email);

      if (formData.splitType === "equal" && participants.length === 2 && invitedEmail) {
        await createExpense({
          total_cents: totalCents,
          description: formData.description || formData.title,
          invited_email: invitedEmail,
        });
      } else {
        const creatorId = user?.id;
        const participantsPayload = participants.map((p) => {
          const isCreator = p.userEmail === user?.email || p.userId === "current-user";
          const base: { user_id?: string; email?: string; percentage?: number; amount?: number } = {};
          if (isCreator && creatorId) {
            base.user_id = creatorId;
          } else {
            base.email = p.userEmail;
          }
          if (formData.splitType === "percentage") {
            const totalReais = totalCents / 100;
            const pct = totalReais > 0 ? Math.round((p.amount / totalReais) * 10000) / 100 : 0;
            base.percentage = pct;
          }
          if (formData.splitType === "custom") {
            base.amount = toCents(p.amount);
          }
          return base;
        });
        if (formData.splitType === "percentage" && participantsPayload.length > 0) {
          const sum = participantsPayload.reduce((s, p) => s + (p.percentage ?? 0), 0);
          if (sum !== 100) {
            participantsPayload[participantsPayload.length - 1].percentage =
              (participantsPayload[participantsPayload.length - 1].percentage ?? 0) + (100 - sum);
          }
        }
        await createExpense({
          total_cents: totalCents,
          description: formData.description || formData.title,
          split_type: formData.splitType,
          participants: participantsPayload,
        });
      }

      toast({ title: "Despesa criada com sucesso" });
      onSuccess();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const detailStr = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
      const message = (err as { message?: string })?.message ?? "";

      if (status === 422 && (detailStr.includes("Saldo") || detailStr.includes("insuficiente"))) {
        toast({
          title: "Saldo insuficiente",
          description: "O valor da despesa é maior que o saldo disponível na conta selecionada.",
          variant: "destructive",
        });
      } else if (status === 400 && (detailStr.includes("convidar a si mesmo") || detailStr.includes("você mesmo"))) {
        toast({
          title: "E-mail inválido",
          description: "Você não pode dividir uma despesa com você mesmo.",
          variant: "destructive",
        });
      } else if (status === 400 && (detailStr.includes("e-mail") || detailStr.includes("email") || detailStr.includes("cadastrado"))) {
        toast({
          title: "E-mail inválido",
          description: "Informe um e-mail válido para dividir a despesa.",
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

      logError(err, {
        feature: "shared-expense-form",
        action: "submit",
        isEditing,
        splitType: formData.splitType,
        participantCount: participants.length,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  return (
    <ResponsiveOverlay
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {isEditing
            ? "Editar Despesa Compartilhada"
            : "Nova Despesa Compartilhada"}
        </span>
      }
      description={
        isEditing
          ? "Atualize os detalhes da despesa"
          : "Crie uma nova despesa para dividir entre múltiplas pessoas"
      }
      mobileVariant="fullscreen"
      desktopContentClassName="flex max-h-[90vh] w-full max-w-lg flex-col overflow-x-hidden overflow-y-hidden md:max-w-2xl"
      mobileContentClassName="flex h-[100dvh] w-screen max-w-none flex-col rounded-none border-0 p-0"
      bodyClassName="scrollbar-hide px-4 pb-6 sm:px-6"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            fullWidthMobile
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="default"
            fullWidthMobile
            disabled={isSubmitDisabled}
          >
            {isSubmitting
              ? "Salvando..."
              : isEditing
                ? "Atualizar"
                : "Criar"}{" "}
            Despesa
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ex: Jantar no restaurante"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger className="min-h-[44px] w-full">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Detalhes adicionais sobre a despesa..."
                rows={3}
                className="w-full"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Valor Total *</Label>
                <CurrencyInput
                  id="totalAmount"
                  value={formData.totalAmountCents}
                  onChange={(v) => handleInputChange("totalAmountCents", v)}
                  placeholder="0,00"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
                  className="min-h-[44px] w-full"
                />
              </div>
            </div>

            {/* Split Type */}
            <div className="space-y-2">
              <Label>Tipo de Divisão</Label>
              <Select
                value={formData.splitType}
                onValueChange={(value: string) =>
                  handleInputChange("splitType", value)
                }
              >
                <SelectTrigger className="min-h-[44px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Divisão Igual</SelectItem>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="custom">Valores Personalizados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add Participant */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <Label>Adicionar Participante</Label>
              </div>
              {participants.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  O e-mail identifica a pessoa. Por enquanto a despesa fica só no seu dispositivo; ela verá a dívida quando a sincronização por e-mail estiver disponível.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  id="participant-name"
                  aria-label="Nome do participante"
                  placeholder="Nome"
                  value={newParticipant.name}
                  onChange={(e) =>
                    setNewParticipant((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full"
                />
                <Input
                  id="participant-email"
                  aria-label="Email do participante"
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  value={newParticipant.email}
                  onChange={(e) =>
                    setNewParticipant((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full"
                />
                <Button
                  type="button"
                  onClick={addParticipant}
                  variant="outline"
                  fullWidthMobile
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <Label>Participantes ({participants.length})</Label>
              </div>

              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center"
                  >
                    <div className="w-8 h-8 bg-[rgba(200,255,0,0.08)] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-[#c8ff00]">
                        {participant.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {participant.userName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {participant.userEmail}
                      </p>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap">
                      <div className="flex-1 md:flex-none">
                        <CurrencyInput
                          value={toCents(participant.amount)}
                          onChange={(value) =>
                            updateParticipantAmount(
                              participant.userId,
                              fromCents(value),
                            )
                          }
                          className="min-h-[44px] w-full min-w-0 text-sm md:w-32"
                          disabled={formData.splitType === "equal"}
                        />
                      </div>

                      {participants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(participant.userId)}
                          className="min-h-[44px] min-w-[44px] shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="font-medium">Resumo da Divisão</span>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span>Valor Total:</span>
                  <span className="text-right font-semibold">
                    {formatCurrencyFromCents(formData.totalAmountCents)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Total Dividido:</span>
                  <span className="text-right font-semibold">
                    {formatCurrency(splitInfo.totalSplit)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Diferença:</span>
                  <span
                    className={`text-right font-semibold ${splitInfo.isValid ? "text-green-500" : "text-red-500"}`}
                  >
                    {formatCurrency(splitInfo.difference)}
                  </span>
                </div>
              </div>

              {!splitInfo.isValid ? (
                <Badge variant="destructive" className="text-xs">
                  Os valores não coincidem
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400">
                  Divisão válida
                </Badge>
              )}
            </div>
      </form>
    </ResponsiveOverlay>
  );
}
