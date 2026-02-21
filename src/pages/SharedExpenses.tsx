import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { sharedExpenseApi } from "@/services/sharedExpenseApi";
import { syncSharedExpensesFromBackend } from "@/lib/shared-expenses-sync-engine";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SharedExpenseForm } from "@/components/forms/SharedExpenseForm";

export default function SharedExpenses() {
  const {
    sharedExpenses,
    markParticipantAsPaid,
    settleSharedExpense,
  } = useFinancialStore();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [expandedParticipantsIds, setExpandedParticipantsIds] = useState<Set<string>>(new Set());

  const toggleParticipants = (expenseId: string) => {
    setExpandedParticipantsIds((prev) => {
      const next = new Set(prev);
      if (next.has(expenseId)) next.delete(expenseId);
      else next.add(expenseId);
      return next;
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pendente",
          variant: "secondary" as const,
          icon: Clock,
          color: "text-yellow-500",
        };
      case "settled":
        return {
          label: "Quitado",
          variant: "default" as const,
          icon: CheckCircle,
          color: "text-green-500",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-500",
        };
      default:
        return {
          label: "Desconhecido",
          variant: "secondary" as const,
          icon: Clock,
          color: "text-gray-500",
        };
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await sharedExpenseApi.deleteSharedExpense(id);
      await syncSharedExpensesFromBackend();
      toast({
        title: "Despesa removida",
        description: "A despesa compartilhada foi removida com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a despesa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = (expenseId: string, participantId: string) => {
    markParticipantAsPaid(expenseId, participantId);
    toast({
      title: "Pagamento registrado",
      description: "O pagamento foi registrado com sucesso.",
    });
  };

  const handleSettleExpense = (id: string) => {
    settleSharedExpense(id);
    toast({
      title: "Despesa quitada",
      description: "A despesa foi marcada como quitada.",
    });
  };

  const getTotalPaid = (participants: { paid?: boolean; amount: number }[]) => {
    return participants.reduce(
      (sum, participant) => (participant.paid ? sum + participant.amount : sum),
      0,
    );
  };

  const getTotalAmount = (participants: { shareAmount?: number; amount: number }[]) => {
    return participants.reduce(
      (sum, participant) => sum + (participant.amount ?? participant.shareAmount ?? 0),
      0,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header - botão em destaque e área de toque adequada no mobile */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Despesas Compartilhadas
          </h1>
          <p className="text-muted-foreground">
            Gerencie despesas divididas entre múltiplas pessoas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ActionButton
            variant="default"
            icon={Plus}
            onClick={() => setShowForm(true)}
            className="h-9 px-4 text-sm"
          >
            Nova Despesa
          </ActionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom p-3 sm:p-6">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold">{sharedExpenses.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-green-500/20 p-3 sm:p-6">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Quitadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold text-green-500">
              {sharedExpenses.filter((e) => e.status === "settled").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-yellow-500/20 p-3 sm:p-6">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold text-yellow-500">
              {sharedExpenses.filter((e) => e.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-blue-500/20 p-3 sm:p-6">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold text-blue-500">
              {formatCurrency(
                sharedExpenses.reduce(
                  (sum, expense) => sum + expense.totalAmount,
                  0,
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shared Expenses List */}
      {sharedExpenses.length === 0 ? (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Share2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma despesa compartilhada
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Comece criando uma despesa para dividir entre múltiplas pessoas
            </p>
            <p className="text-xs text-muted-foreground text-center mb-4 max-w-sm">
              Por enquanto as despesas ficam salvas só no seu dispositivo. A pessoa adicionada por e-mail verá a dívida quando a sincronização estiver disponível.
            </p>
            <ActionButton
              variant="default"
              icon={Plus}
              onClick={() => setShowForm(true)}
              className="min-h-[44px] px-6 w-full sm:w-auto touch-manipulation"
            >
              Criar Primeira Despesa
            </ActionButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sharedExpenses.map((expense) => {
            const statusConfig = getStatusConfig(expense.status);
            const StatusIcon = statusConfig.icon;
            const totalPaid = getTotalPaid(expense.participants);
            const totalAmount = getTotalAmount(expense.participants);
            const isFullyPaid = totalPaid >= totalAmount;

            return (
              <Card
                key={expense.id}
                className="bg-gradient-card shadow-card-custom p-4 sm:p-6"
              >
                <CardHeader className="p-0 pb-3 sm:pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-semibold truncate">
                          {expense.title}
                        </h3>
                        <Badge
                          variant={statusConfig.variant}
                          className="text-xs shrink-0"
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {expense.description && (
                        <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <ActionButton
                        variant="outline"
                        size="sm"
                        icon={Edit}
                        onClick={() => setEditingExpense(expense.id)}
                        className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                      >
                        Editar
                      </ActionButton>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <ActionButton
                            variant="outline"
                            size="sm"
                            icon={Trash2}
                            className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                          >
                            Excluir
                          </ActionButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir esta despesa
                              compartilhada? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 space-y-3 sm:space-y-4">
                  {/* Expense Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Valor Total:</span>
                      <span className="text-xs sm:text-sm font-semibold">
                        {formatCurrency(expense.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Participantes:</span>
                      <span className="text-xs sm:text-sm font-semibold">
                        {expense.participants.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Data:</span>
                      <span className="text-xs sm:text-sm font-semibold">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progresso do Pagamento</span>
                      <span>
                        {formatCurrency(totalPaid)} / {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalAmount ? (totalPaid / totalAmount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Participants: colapsável no mobile, sempre visível no desktop */}
                  <div className="space-y-2 sm:space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleParticipants(expense.id)}
                      className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
                    >
                      {expandedParticipantsIds.has(expense.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      Ver participantes ({expense.participants.length})
                    </button>
                    <h4 className="font-medium text-sm hidden sm:block">Participantes:</h4>
                    <div
                      className={`grid gap-2 ${
                        expandedParticipantsIds.has(expense.id) ? "block" : "hidden sm:grid"
                      }`}
                    >
                      {expense.participants.map((participant) => (
                        <div
                          key={participant.userId}
                          className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs sm:text-sm font-medium text-primary">
                                {participant.userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">
                                {participant.userName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {participant.userEmail}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span className="font-semibold text-xs sm:text-sm">
                              {formatCurrency(participant.amount)}
                            </span>
                            {participant.paid ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Pago
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleMarkAsPaid(
                                    expense.id,
                                    participant.userId,
                                  )
                                }
                                className="h-8 text-xs sm:h-9 sm:text-sm"
                              >
                                Marcar como Pago
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {expense.status === "pending" && isFullyPaid && (
                    <div className="pt-3 sm:pt-4 border-t">
                      <Button
                        onClick={() => handleSettleExpense(expense.id)}
                        className="w-full h-9 text-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Quitar Despesa
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Forms */}
      {showForm && (
        <SharedExpenseForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            toast({
              title: "Despesa criada",
              description: "A despesa compartilhada foi criada com sucesso.",
            });
          }}
        />
      )}

      {editingExpense && (
        <SharedExpenseForm
          expenseId={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null);
            toast({
              title: "Despesa atualizada",
              description:
                "A despesa compartilhada foi atualizada com sucesso.",
            });
          }}
        />
      )}
    </div>
  );
}
