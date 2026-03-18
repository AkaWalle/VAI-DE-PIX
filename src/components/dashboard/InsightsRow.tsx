/**
 * Faixa de insights proativos no Dashboard.
 * Exibe até 3 insights: economia positiva, alerta de categoria, progresso de meta.
 * Só renderiza quando há dados reais.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { TrendingUp, AlertCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategorySpending {
  name: string;
  value: number;
  color?: string;
}

export interface GoalProgress {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
}

interface InsightsRowProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryData: CategorySpending[];
  goalProgress: GoalProgress[];
}

const INSIGHT_ICON_CLASS = "h-4 w-4 shrink-0";
const INSIGHT_BORDER = "border-[rgba(50,188,173,0.2)]";

export function InsightsRow({
  monthlyIncome,
  monthlyExpenses,
  categoryData,
  goalProgress,
}: InsightsRowProps) {
  const insights = useMemo(() => {
    const items: Array<{
      type: "positive" | "alert" | "progress";
      icon: typeof TrendingUp;
      text: string;
      highlight: string;
    }> = [];

    const economy = monthlyIncome - monthlyExpenses;

    // 1. Insight positivo: economia > 0
    if (economy > 0) {
      const valor = formatCurrency(economy, { showSign: false });
      items.push({
        type: "positive",
        icon: TrendingUp,
        text: `Economia acima da meta. Você guardou ${valor} este mês. Continue assim!`,
        highlight: valor,
      });
    }

    // 2. Insight de alerta: categoria com maior gasto
    if (categoryData.length > 0) {
      const totalExpenses = categoryData.reduce((sum, c) => sum + c.value, 0);
      if (totalExpenses > 0) {
        const topCategory = categoryData[0];
        const pct = ((topCategory.value / totalExpenses) * 100).toFixed(0);
        const highlight = `${topCategory.name} representa ${pct}%`;
        items.push({
          type: "alert",
          icon: AlertCircle,
          text: `${highlight} dos gastos este mês. Considere revisar o orçamento.`,
          highlight,
        });
      }
    }

    // 3. Insight de progresso: meta com maior % (não concluída)
    const incompleteGoals = goalProgress.filter((g) => g.progressPercentage < 100);
    if (incompleteGoals.length > 0) {
      const topGoal = incompleteGoals.sort(
        (a, b) => b.progressPercentage - a.progressPercentage,
      )[0];
      const remaining = topGoal.targetAmount - topGoal.currentAmount;
      if (remaining > 0) {
        const highlight = `Meta "${topGoal.name}" a ${topGoal.progressPercentage.toFixed(0)}%`;
        items.push({
          type: "progress",
          icon: Star,
          text: `${highlight}. Faltam ${formatCurrency(remaining, { showSign: false })} para atingir o objetivo.`,
          highlight,
        });
      }
    }

    return items.slice(0, 3);
  }, [
    monthlyIncome,
    monthlyExpenses,
    categoryData,
    goalProgress,
  ]);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <Card
            key={index}
            className={cn(
              "bg-gradient-card shadow-card-custom border",
              INSIGHT_BORDER,
            )}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    "bg-primary/15 text-primary",
                  )}
                >
                  <Icon className={INSIGHT_ICON_CLASS} />
                </div>
                <p className="text-sm leading-relaxed">
                  {insight.text.split(insight.highlight).map((part, i) =>
                    i === 0 ? (
                      part
                    ) : (
                      <span key={i}>
                        <span className="font-semibold">{insight.highlight}</span>
                        {part}
                      </span>
                    ),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
