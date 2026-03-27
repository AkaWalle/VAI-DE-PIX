import { useFinancialStore } from "@/stores/financial-store";
import { useSyncStore } from "@/stores/sync-store";
import { goalsService } from "@/services/goals.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GoalForm } from "@/components/forms/GoalForm";
import { AddGoalValueForm } from "@/components/forms/AddGoalValueForm";
import { GoalProgressRing } from "@/components/goals/GoalProgressRing";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";

export default function Goals() {
  const { goals, deleteGoal } = useFinancialStore();
  const { toast } = useToast();

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    try {
      await goalsService.deleteGoal(goalId);
      deleteGoal(goalId);
      useSyncStore.getState().setSynced();
      toast({
        title: "Meta removida!",
        description: `A meta "${goalName}" foi removida com sucesso.`,
      });
    } catch {
      useSyncStore.getState().setError("Não foi possível remover a meta.");
      toast({
        title: "Erro ao remover meta",
        description: "Não foi possível remover a meta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "achieved":
        return {
          icon: CheckCircle,
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
          label: "Atingida",
          variant: "default" as const,
        };
      case "on_track":
        return {
          icon: TrendingUp,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          label: "No ritmo",
          variant: "default" as const,
        };
      case "at_risk":
        return {
          icon: AlertTriangle,
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
          label: "Em risco",
          variant: "secondary" as const,
        };
      case "overdue":
        return {
          icon: Clock,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "Atrasada",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: Target,
          color: "text-muted-foreground",
          bgColor: "bg-muted/10",
          borderColor: "border-muted/20",
          label: "Indefinido",
          variant: "outline" as const,
        };
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "monthly":
        return "Mensal";
      case "yearly":
        return "Anual";
      case "oneoff":
        return "Único";
      default:
        return period;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Metas Financeiras
          </h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie seus objetivos financeiros
          </p>
        </div>
        <GoalForm />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
            <p className="text-xs text-muted-foreground">Objetivos ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Metas Atingidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals.filter((g) => g.status === "achieved").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivos concluídos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              No Ritmo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals.filter((g) => g.status === "on_track").length}
            </div>
            <p className="text-xs text-muted-foreground">Progredindo bem</p>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning">
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                goals.filter(
                  (g) => g.status === "at_risk" || g.status === "overdue",
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Precisam de foco</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma meta criada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Comece definindo seus objetivos financeiros para acompanhar seu
              progresso
            </p>
            <GoalForm
              trigger={
                <ActionButton icon={Plus}>Criar Primeira Meta</ActionButton>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const statusConfig = getStatusConfig(goal.status);
            const StatusIcon = statusConfig.icon;
            const target = goal.targetAmount ?? 0;
            const current = goal.currentAmount ?? 0;
            const progressPercentage =
              target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const remaining = Math.max(
              goal.targetAmount - goal.currentAmount,
              0,
            );

            return (
              <Card
                key={goal.id}
                className={`${statusConfig.bgColor} ${statusConfig.borderColor} shadow-card-custom transition-all hover:shadow-financial`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {goal.name}
                    </CardTitle>
                    <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getPeriodLabel(goal.period)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative mx-auto shrink-0 sm:mx-0">
                      <GoalProgressRing pct={progressPercentage} />
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold tabular-nums leading-none text-foreground">
                          {(progressPercentage ?? 0).toFixed(0)}
                          <span className="text-xs font-semibold text-muted-foreground">%</span>
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Acumulado / meta
                        </p>
                        <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                          {formatCurrency(goal.currentAmount)}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            / {formatCurrency(goal.targetAmount)}
                          </span>
                        </p>
                      </div>
                      <Progress value={progressPercentage} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Falta</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                      {goal.dueDate && (
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>
                            Prazo: <strong className="text-foreground">{formatDate(goal.dueDate)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
                    <AddGoalValueForm goalId={goal.id} goalName={goal.name} />
                    <ActionButton
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      className="flex-1 sm:flex-initial"
                    >
                      Editar
                    </ActionButton>
                    <ConfirmDialog
                      trigger={
                        <ActionButton
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      }
                      title="Remover Meta"
                      description={`Tem certeza que deseja remover a meta "${goal.name}"? Esta ação não pode ser desfeita.`}
                      confirmText="Remover"
                      onConfirm={() => handleDeleteGoal(goal.id, goal.name)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
