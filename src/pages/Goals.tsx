import { useFinancialStore } from "@/stores/financial-store";
import { goalsService } from "@/services/goals.service";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GoalForm } from "@/components/forms/GoalForm";
import { AddGoalValueForm } from "@/components/forms/AddGoalValueForm";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Target, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Trash2, Calendar,
} from "lucide-react";

function StatCard({ label, value, sub, colorClass }: { label: string; value: string | number; sub: string; colorClass: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${colorClass}`}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export default function Goals() {
  const { goals, deleteGoal } = useFinancialStore();
  const { toast } = useToast();

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    try {
      await goalsService.deleteGoal(goalId);
      deleteGoal(goalId);
      toast({ title: "Meta removida!", description: `"${goalName}" foi removida.` });
    } catch {
      toast({ title: "Erro ao remover meta", variant: "destructive" });
    }
  };

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
    achieved: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/8",  border: "border-emerald-500/20", label: "Atingida"   },
    on_track: { icon: TrendingUp,  color: "text-[#128c7e]",   bg: "bg-[rgba(18,140,126,0.08)]", border: "border-[rgba(18,140,126,0.2)]", label: "No ritmo"   },
    at_risk:  { icon: AlertTriangle,color: "text-amber-400",  bg: "bg-amber-500/8",    border: "border-amber-500/20",   label: "Em risco"   },
    overdue:  { icon: Clock,       color: "text-rose-400",    bg: "bg-rose-500/8",     border: "border-rose-500/20",    label: "Atrasada"   },
  };
  const defaultStatus = { icon: Target, color: "text-muted-foreground", bg: "bg-white/3", border: "border-white/8", label: "—" };

  const periodLabel = (p: string) => ({ monthly: "Mensal", yearly: "Anual", oneoff: "Único" }[p] || p);

  const achieved = goals.filter(g => g.status === "achieved").length;
  const onTrack  = goals.filter(g => g.status === "on_track").length;
  const atRisk   = goals.filter(g => g.status === "at_risk" || g.status === "overdue").length;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#128c7e] mb-1">Objetivos</p>
          <h1 className="text-2xl font-bold text-foreground">Metas Financeiras</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Acompanhe seus objetivos financeiros</p>
        </div>
        <GoalForm />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de Metas"      value={goals.length} sub="Objetivos cadastrados"   colorClass="border-white/8 bg-white/3" />
        <StatCard label="Atingidas"           value={achieved}     sub="Concluídas"               colorClass="border-emerald-500/20 bg-emerald-500/8" />
        <StatCard label="No Ritmo"            value={onTrack}      sub="Progredindo bem"          colorClass="border-[rgba(18,140,126,0.2)] bg-[rgba(18,140,126,0.06)]" />
        <StatCard label="Atenção"             value={atRisk}       sub="Em risco ou atrasadas"    colorClass="border-amber-500/20 bg-amber-500/8" />
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-card py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Target className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Nenhuma meta criada</p>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
            Defina seus objetivos financeiros para acompanhar o progresso
          </p>
          <GoalForm trigger={<ActionButton icon={Plus}>Criar Primeira Meta</ActionButton>} />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const cfg = statusConfig[goal.status] || defaultStatus;
            const StatusIcon = cfg.icon;
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

            return (
              <div key={goal.id}
                className={`group relative flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.01] ${cfg.bg} ${cfg.border}`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-semibold text-foreground truncate">{goal.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color} ${cfg.border}`}>
                        <StatusIcon className="h-3 w-3" />{cfg.label}
                      </span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {periodLabel(goal.period)}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg} border ${cfg.border}`}>
                    <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span className="font-medium text-foreground">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? "bg-[#25d366]" : pct >= 60 ? "bg-[#128c7e]" : "bg-[#f59e0b]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Values */}
                <div className="space-y-1.5 border-t border-white/5 pt-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Acumulado</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatCurrency(goal.currentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="text-muted-foreground tabular-nums">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Restante</span>
                    <span className={`font-semibold tabular-nums ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>{formatCurrency(remaining)}</span>
                  </div>
                </div>

                {/* Due date */}
                {goal.dueDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <Calendar className="h-3 w-3" />
                    Prazo: {formatDate(goal.dueDate)}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <AddGoalValueForm goalId={goal.id} goalName={goal.name} />
                  <ConfirmDialog
                    trigger={
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 text-muted-foreground transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    }
                    title="Remover Meta"
                    description={`Tem certeza que deseja remover "${goal.name}"? Esta ação não pode ser desfeita.`}
                    confirmText="Remover"
                    onConfirm={() => handleDeleteGoal(goal.id, goal.name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
