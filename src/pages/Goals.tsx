import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GoalForm } from "@/components/forms/GoalForm";
import { AddGoalValueForm } from "@/components/forms/AddGoalValueForm";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";

export default function Goals() {
  const { goals, deleteGoal } = useFinancialStore();
  const { toast } = useToast();

  const handleDeleteGoal = (goalId: string, goalName: string) => {
    deleteGoal(goalId);
    toast({
      title: "Meta removida!",
      description: `A meta "${goalName}" foi removida com sucesso.`,
    });
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
          <h1 className="text-3xl font-bold text-foreground">
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
            const progressPercentage = Math.min(
              (goal.currentAmount / goal.targetAmount) * 100,
              100,
            );
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
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  {/* Values */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atual:</span>
                      <span className="font-medium">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta:</span>
                      <span className="font-medium">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Restante:</span>
                      <span className="font-semibold">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  {goal.dueDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="h-3 w-3" />
                      <span>Prazo: {formatDate(goal.dueDate)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <ActionButton
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      className="flex-1"
                    >
                      Editar
                    </ActionButton>
                    <AddGoalValueForm goalId={goal.id} goalName={goal.name} />
                    <ConfirmDialog
                      trigger={
                        <ActionButton
                          variant="outline"
                          size="sm"
                          className="px-2"
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
