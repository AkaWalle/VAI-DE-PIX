import { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import { parseCurrencyInput, calculateSplit, getInvitedEmail } from "@/utils/currency";
import {
  X,
  Plus,
  Trash2,
  Users,
  DollarSign,
  Calculator,
  UserPlus,
} from "lucide-react";

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
  const { sharedExpenses, categories, addSharedExpense, updateSharedExpense } =
    useFinancialStore();
  const { user } = useAuthStore();
  const { createExpense } = useSharedExpensesStore();
  const { toast } = useToast();

  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    totalAmount: 0,
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

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        description: expense.description || "",
        totalAmount: expense.totalAmount,
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
  }, [user?.id, user?.email, user?.name, expense]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "totalAmount" || field === "splitType") {
      const total = field === "totalAmount" ? (value as number) : formData.totalAmount;
      const splitType = field === "splitType" ? (value as string) : formData.splitType;
      recalculateSplit(total, splitType);
    }
  };

  const recalculateSplit = (total?: number, splitType?: string) => {
    const t = total ?? formData.totalAmount;
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
      const total = formData.totalAmount;
      const participantCount = participants.length + 1;
      const amountPerPersonCents = Math.round((total * 100) / participantCount);
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
      const total = formData.totalAmount;
      const participantCount = participants.length - 1;
      const amountPerPersonCents =
        participantCount > 0 ? Math.round((total * 100) / participantCount) : 0;
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

  const splitInfo = calculateSplit(formData.totalAmount, participants);
  const isSubmitDisabled =
    formData.totalAmount <= 0 ||
    participants.length === 0 ||
    !splitInfo.isValid ||
    isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitDisabled) return;

    console.log("[SharedExpense Submit]", {
      totalAmount: formData.totalAmount,
      participantsCount: participants.length,
      splitValid: splitInfo.isValid,
    });

    try {
      setIsSubmitting(true);

      if (isEditing) {
        const expenseData = {
          title: formData.title,
          description: formData.description,
          totalAmount: formData.totalAmount,
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

      const invitedEmail = getInvitedEmail(
        participants,
        user?.email,
      );
      if (!invitedEmail) {
        toast({
          title: "Adicione um participante",
          description: "Informe o e-mail de quem vai dividir a despesa.",
          variant: "destructive",
        });
        return;
      }

      await createExpense({
        amount: formData.totalAmount,
        description: formData.description || formData.title,
        invited_email: invitedEmail,
      });

      toast({ title: "Despesa criada com sucesso" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao criar despesa",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {isEditing
                  ? "Editar Despesa Compartilhada"
                  : "Nova Despesa Compartilhada"}
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Atualize os detalhes da despesa"
                  : "Crie uma nova despesa para dividir entre múltiplas pessoas"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="min-h-[44px] min-w-[44px] touch-manipulation" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-hide">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  <SelectTrigger>
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
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Valor Total *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="totalAmount"
                    type="text"
                    inputMode="decimal"
                    value={
                      isFocused
                        ? formData.totalAmount === 0
                          ? ""
                          : formData.totalAmount.toString()
                        : formatCurrency(formData.totalAmount, { showSign: false })
                    }
                    onChange={(e) => {
                      const parsed = parseCurrencyInput(e.target.value);
                      handleInputChange("totalAmount", parsed);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={(e) => {
                      setIsFocused(false);
                      if (!e.target.value.trim()) {
                        handleInputChange("totalAmount", 0);
                      }
                    }}
                    placeholder="0,00"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
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
                <SelectTrigger>
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
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Nome"
                  value={newParticipant.name}
                  onChange={(e) =>
                    setNewParticipant((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newParticipant.email}
                  onChange={(e) =>
                    setNewParticipant((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  onClick={addParticipant}
                  variant="outline"
                  className="min-h-[44px] touch-manipulation"
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
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
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

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            participant.amount === 0
                              ? ""
                              : formatCurrency(participant.amount, { showSign: false })
                          }
                          onChange={(e) =>
                            updateParticipantAmount(
                              participant.userId,
                              parseCurrencyInput(e.target.value),
                            )
                          }
                          className="w-24 pl-6 text-sm"
                          disabled={formData.splitType === "equal"}
                        />
                      </div>

                      {participants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(participant.userId)}
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
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <span className="font-semibold">
                    {formatCurrency(formData.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Dividido:</span>
                  <span className="font-semibold">
                    {formatCurrency(splitInfo.totalSplit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Diferença:</span>
                  <span
                    className={`font-semibold ${splitInfo.isValid ? "text-green-500" : "text-red-500"}`}
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

            {/* Actions - altura mínima para toque no mobile */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 min-h-[44px] touch-manipulation"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-[44px] touch-manipulation"
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
