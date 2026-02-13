import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
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
    deleteSharedExpense,
    markParticipantAsPaid,
    settleSharedExpense,
  } = useFinancialStore();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

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

  const handleDeleteExpense = (id: string) => {
    deleteSharedExpense(id);
    toast({
      title: "Despesa removida",
      description: "A despesa compartilhada foi removida com sucesso.",
    });
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Despesas Compartilhadas
          </h1>
          <p className="text-muted-foreground">
            Gerencie despesas divididas entre múltiplas pessoas
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton
            variant="default"
            icon={Plus}
            onClick={() => setShowForm(true)}
          >
            Nova Despesa
          </ActionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedExpenses.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Quitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {sharedExpenses.filter((e) => e.status === "settled").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {sharedExpenses.filter((e) => e.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
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
            <ActionButton
              variant="default"
              icon={Plus}
              onClick={() => setShowForm(true)}
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
                className="bg-gradient-card shadow-card-custom"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold">
                          {expense.title}
                        </h3>
                        <Badge
                          variant={statusConfig.variant}
                          className="text-xs"
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {expense.description && (
                        <p className="text-muted-foreground">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <ActionButton
                        variant="outline"
                        size="sm"
                        icon={Edit}
                        onClick={() => setEditingExpense(expense.id)}
                      >
                        Editar
                      </ActionButton>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <ActionButton
                            variant="outline"
                            size="sm"
                            icon={Trash2}
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

                <CardContent className="space-y-4">
                  {/* Expense Details */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Valor Total:</span>
                      <span className="font-semibold">
                        {formatCurrency(expense.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Participantes:
                      </span>
                      <span className="font-semibold">
                        {expense.participants.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Data:</span>
                      <span className="font-semibold">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso do Pagamento</span>
                      <span>
                        {formatCurrency(totalPaid)} /{" "}
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(totalPaid / totalAmount) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Participantes:</h4>
                    <div className="grid gap-2">
                      {expense.participants.map((participant) => (
                        <div
                          key={participant.userId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {participant.userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {participant.userName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {participant.userEmail}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
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
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => handleSettleExpense(expense.id)}
                        className="w-full"
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
