import { useMemo, useEffect, useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { FinancialCard } from "@/components/ui/financial-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import { formatDistanceToNow, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchInsights,
  postInsightFeedback,
  type InsightsResponse,
} from "@/services/insights.service";
import { notificationsService } from "@/services/notifications.service";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CategorySpendingEmpty } from "@/components/dashboard/category-spending-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalProgressRing } from "@/components/goals/GoalProgressRing";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
// Removed ChartTooltip imports to avoid context requirement outside ChartContainer

function goalDueCaption(due?: string): string {
  if (!due?.trim()) return "Sem prazo";
  const d = parseISO(due);
  if (!isValid(d)) return "Sem prazo";
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

function goalDueAbsolute(due?: string): string | undefined {
  if (!due?.trim()) return undefined;
  const d = parseISO(due);
  if (!isValid(d)) return undefined;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

/** Placeholder alinhado ao grid do dashboard até o Zustand `persist` reidratar (evita flash de zeros). */
function DashboardPageSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/60">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-2/3 max-w-[180px]" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-10 w-full rounded-md opacity-80" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/60">
            <CardHeader className="p-3 sm:p-6 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-full max-w-md" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <Skeleton className="w-full rounded-lg" style={{ height: 280 }} />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-border/60">
          <CardHeader className="p-3 sm:p-6 space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/60">
          <CardHeader className="p-3 sm:p-6 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full max-w-[140px]" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardContent() {
  const {
    getTotalBalance,
    getIncomeThisMonth,
    getExpensesThisMonth,
    getCashflow,
    dateRange,
    goals,
    transactions,
    categories,
  } = useFinancialStore();

  const reduceMotion = usePrefersReducedMotion();

  const totalBalance = getTotalBalance();
  const monthlyIncome = getIncomeThisMonth();
  const monthlyExpenses = getExpensesThisMonth();
  const cashflowData = getCashflow(6);

  /**
   * Últimos 30 dias (dia calendário): séries diárias para sparklines e tendência 7d vs 7d anterior.
   * Saldo: reconstrução retroativa a partir de getTotalBalance() e fluxo diário (aproximação).
   */
  const kpiSeries = useMemo(() => {
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1, 12);
    };

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const startMidnight = new Date();
    startMidnight.setHours(0, 0, 0, 0);
    startMidnight.setDate(startMidnight.getDate() - 29);

    const days: { key: string; income: number; expense: number; net: number }[] =
      [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startMidnight);
      d.setDate(startMidnight.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ key, income: 0, expense: 0, net: 0 });
    }

    const byKey = new Map(days.map((x) => [x.key, x]));
    for (const t of transactions) {
      const td = parseLocalDate(t.date);
      td.setHours(12, 0, 0, 0);
      if (td < startMidnight || td > end) continue;
      const key = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}-${String(td.getDate()).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      if (t.type === "income") bucket.income += t.amount;
      else bucket.expense += Math.abs(t.amount);
    }
    days.forEach((d) => {
      d.net = d.income - d.expense;
    });

    const incomeByDay = days.map((d) => d.income);
    const expenseByDay = days.map((d) => d.expense);
    const netByDay = days.map((d) => d.net);

    const balanceSeries: number[] = new Array(30);
    balanceSeries[29] = totalBalance;
    for (let i = 29; i >= 1; i--) {
      balanceSeries[i - 1] = balanceSeries[i] - days[i].net;
    }

    const sumSlice = (arr: number[], from: number, to: number) =>
      arr.slice(from, to).reduce((a, b) => a + b, 0);
    const meanSlice = (arr: number[], from: number, to: number) => {
      const slice = arr.slice(from, to);
      return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
    };

    const pct = (cur: number, prev: number) => {
      if (Math.abs(prev) < 1e-9) {
        if (cur > 0) return 100;
        if (cur < 0) return -100;
        return 0;
      }
      return ((cur - prev) / Math.abs(prev)) * 100;
    };

    const iLast = sumSlice(incomeByDay, 23, 30);
    const iPrev = sumSlice(incomeByDay, 16, 23);
    const eLast = sumSlice(expenseByDay, 23, 30);
    const ePrev = sumSlice(expenseByDay, 16, 23);
    const nLast = sumSlice(netByDay, 23, 30);
    const nPrev = sumSlice(netByDay, 16, 23);
    const bLast = meanSlice(balanceSeries, 23, 30);
    const bPrev = meanSlice(balanceSeries, 16, 23);

    const wrap = (cur: number, prev: number) => {
      const raw = pct(cur, prev);
      const direction = raw >= 0 ? ("up" as const) : ("down" as const);
      return { value: Math.min(Math.abs(raw), 999), direction };
    };

    return {
      balance: balanceSeries,
      income: incomeByDay,
      expense: expenseByDay,
      savings: netByDay,
      trends: {
        balance: wrap(bLast, bPrev),
        income: wrap(iLast, iPrev),
        expense: wrap(eLast, ePrev),
        savings: wrap(nLast, nPrev),
      },
    };
  }, [transactions, totalBalance]);

  // Category spending data (alinhado ao período do header / `dateRange`)
  const categoryData = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const monthStart = new Date(dateRange.from);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(dateRange.to);
    monthEnd.setHours(23, 59, 59, 999);

    // Função para parsing consistente de datas (igual ao financial-store)
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1, 12);
    };

    return expenseCategories
      .map((category) => {
        const categoryTransactions = transactions.filter((t) => {
          const transactionDate = parseLocalDate(t.date);
          return (
            t.category === category.id &&
            t.type === "expense" &&
            transactionDate >= monthStart &&
            transactionDate <= monthEnd
          );
        });

        const total = categoryTransactions.reduce(
          (sum, t) => sum + Math.abs(Number(t.amount) || 0),
          0,
        );

        return {
          name: category.name,
          value: Number.isFinite(total) ? total : 0,
          color: category.color,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, dateRange.from, dateRange.to]);

  // Goal progress
  const goalProgress = useMemo(() => {
    return goals.map((goal) => {
      const target = goal.targetAmount ?? 0;
      const current = goal.currentAmount ?? 0;
      const progressPercentage =
        target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return {
        ...goal,
        progressPercentage,
      };
    });
  }, [goals]);

  // Insights (variação mensal por categoria, metas em risco)
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  const loadInsights = () => {
    setInsightsLoading(true);
    fetchInsights()
      .then((data) => setInsights(data))
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchInsights()
      .then((data) => {
        if (!cancelled) setInsights(data);
      })
      .catch(() => {
        if (!cancelled) setInsights(null);
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInsightFeedback = async (
    insightType: "category_variation" | "goal_at_risk",
    insightHash: string,
    status: "seen" | "ignored"
  ) => {
    if (!insightHash) return;
    setFeedbackLoading(insightHash);
    try {
      await postInsightFeedback(insightType, insightHash, status);
      await loadInsights();
    } finally {
      setFeedbackLoading(null);
    }
  };

  const categoryVariation = insights?.category_monthly_variation ?? [];
  const goalsAtRisk = insights?.goals_at_risk?.filter((g) => g.at_risk) ?? [];

  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 260 : 340;
  const chartFontSize = isMobile ? 11 : 12;

  // Banner: notificações de insights não lidas (C2)
  const [unreadInsightCount, setUnreadInsightCount] = useState(0);
  useEffect(() => {
    notificationsService
      .getUnreadInsightCount()
      .then(setUnreadInsightCount)
      .catch(() => setUnreadInsightCount(0));
  }, []);

  return (
    <>
      {/* Banner: notificações de insights não lidas */}
      {unreadInsightCount > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Novos insights para você</AlertTitle>
          <AlertDescription>
            Você tem {unreadInsightCount} notificação(ões) de insights (metas em risco ou variação de gastos).
            Confira no sino ao lado ou role até a seção de insights abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs + sparkline (30 dias) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          variant="balance"
          sparkline={kpiSeries.balance}
          trend={{
            ...kpiSeries.trends.balance,
            label: "média 7d vs anterior",
          }}
        />

        <FinancialCard
          title="Receitas do Mês"
          value={formatCurrency(monthlyIncome)}
          icon={TrendingUp}
          variant="income"
          description="Entradas confirmadas"
          sparkline={kpiSeries.income}
          trend={{
            ...kpiSeries.trends.income,
            label: "últ. 7d vs ant.",
          }}
        />

        <FinancialCard
          title="Despesas do Mês"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          variant="expense"
          description="Gastos registrados"
          sparkline={kpiSeries.expense}
          trendPolarity="inverted"
          trend={{
            ...kpiSeries.trends.expense,
            label: "últ. 7d vs ant.",
          }}
        />

        <FinancialCard
          title="Economia do Mês"
          value={formatCurrency(monthlyIncome - monthlyExpenses)}
          icon={PiggyBank}
          variant="savings"
          description="Receitas − despesas (mês atual)"
          sparkline={kpiSeries.savings}
          trend={{
            ...kpiSeries.trends.savings,
            label: "últ. 7d vs ant.",
          }}
        />
      </div>

      {/* Insights Section */}
      {(categoryVariation.length > 0 || goalsAtRisk.length > 0) && !insightsLoading && (
        <div id="insights" className="grid gap-3 sm:gap-6 md:grid-cols-2">
          {categoryVariation.length > 0 && (
            <Card className="bg-gradient-card shadow-card-custom">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Variação por categoria
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Este mês vs mês anterior (despesas). Explicável e sem IA opaca.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                {categoryVariation.slice(0, 5).map((item) => (
                  <div
                    key={item.category_id}
                    className="flex flex-col gap-1 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.category_name}</span>
                      <span
                        className={
                          (item.variation_pct ?? 0) > 0
                            ? "text-expense"
                            : (item.variation_pct ?? 0) < 0
                              ? "text-success"
                              : "text-muted-foreground"
                        }
                      >
                        {(item.variation_pct ?? 0) > 0 ? "+" : ""}
                        {(item.variation_pct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {goalsAtRisk.length > 0 && (
            <Card className="bg-gradient-card shadow-card-custom">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                  Metas em risco
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Metas que podem não ser atingidas no prazo. Critério explicável.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
                {goalsAtRisk.slice(0, 5).map((item, index) => (
                  <div
                    key={item.goal_id}
                    className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.goal_name}</span>
                      {index === 0 && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Maior impacto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.risk_reason}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Necessário ~{formatCurrency(item.required_per_month)}/mês •{" "}
                      {item.days_left} dias restantes
                    </div>
                    {item.insight_hash && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={feedbackLoading === item.insight_hash}
                          onClick={() =>
                            handleInsightFeedback(
                              "goal_at_risk",
                              item.insight_hash!,
                              "seen"
                            )
                          }
                        >
                          Entendi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={feedbackLoading === item.insight_hash}
                          onClick={() =>
                            handleInsightFeedback(
                              "goal_at_risk",
                              item.insight_hash!,
                              "ignored"
                            )
                          }
                        >
                          Ignorar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        {/* Cashflow Chart */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Fluxo de Caixa (6 meses)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Receita e despesa por mês (valores em R$). Passe o mouse para ver o
              total de cada série.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="overflow-x-auto -mx-1">
              <p className="mb-2 text-[10px] text-muted-foreground sm:text-xs md:hidden">
                ● Receita ● Despesa — cores também na legenda do gráfico.
              </p>
              <div className="min-w-[280px]" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: chartFontSize }}
                      interval={isMobile ? 2 : 0}
                      tickLine={false}
                    />
                    <YAxis
                      width={isMobile ? 58 : 76}
                      tick={{ fontSize: chartFontSize }}
                      tickFormatter={(value) =>
                        formatCurrency(value, { abbreviated: true })
                      }
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-card-foreground shadow-lg">
                            <p className="mb-2 border-b border-border/60 pb-1.5 text-xs font-medium text-muted-foreground">
                              Período:{" "}
                              <span className="text-foreground">{label}</span>
                            </p>
                            <ul className="space-y-2">
                              {payload.map((entry) => (
                                <li
                                  key={String(entry.dataKey)}
                                  className="flex items-center justify-between gap-6 text-sm"
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor: entry.color ?? "#999",
                                      }}
                                    />
                                    <span>{entry.name}</span>
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {formatCurrency(Number(entry.value))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: chartFontSize }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Receita"
                      stroke="hsl(142 72% 46%)"
                      fill="hsl(142 72% 42%)"
                      fillOpacity={0.45}
                      strokeWidth={2}
                      isAnimationActive={!reduceMotion}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Despesa"
                      stroke="hsl(350 78% 54%)"
                      fill="hsl(350 70% 48%)"
                      fillOpacity={0.38}
                      strokeWidth={2}
                      isAnimationActive={!reduceMotion}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Spending Chart */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Gastos por Categoria
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Despesas por categoria no período selecionado no topo (mês)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {categoryData.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
                {/* Gráfico: legenda abaixo no mobile (vertical), pizza menor no mobile */}
                <div className="flex-1 min-w-0 overflow-x-auto min-w-[280px]">
                  <div style={{ height: chartHeight }} className="min-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        label={false}
                        labelLine={false}
                        outerRadius={isMobile ? 90 : 120}
                        fill="#8884d8"
                        dataKey="value"
                        isAnimationActive={!reduceMotion}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                {/* Legenda: abaixo do gráfico, layout vertical, text-xs no mobile */}
                <div className="flex flex-col justify-center gap-3 w-full lg:w-auto lg:min-w-[200px]">
                  <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">
                    Legenda
                  </h4>
                  <div className="flex flex-col gap-2">
                    {categoryData.map((entry, index) => {
                      const total = categoryData.reduce(
                        (sum, item) => sum + (item.value ?? 0),
                        0,
                      );
                      const percentage = (
                        ((entry.value ?? 0) / (total || 1)) * 100
                      ).toFixed(1);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 text-xs sm:text-sm"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                entry.color || COLORS[index % COLORS.length],
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {entry.name}
                            </div>
                            <div className="text-muted-foreground">
                              {formatCurrency(entry.value)} ({percentage}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <CategorySpendingEmpty />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals and Recent Activity */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3">
        {/* Goals Progress */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Progresso das Metas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Acompanhe o progresso dos seus objetivos</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
            {goalProgress.map((goal) => {
              const dueAbs = goalDueAbsolute(goal.dueDate);
              return (
                <div
                  key={goal.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <div className="relative grid place-items-center">
                      <GoalProgressRing pct={goal.progressPercentage} />
                      <span className="absolute text-sm font-semibold tabular-nums text-foreground">
                        {(goal.progressPercentage ?? 0).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(goal.currentAmount)} /{" "}
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <Progress value={goal.progressPercentage} className="h-2" />
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span
                        title={dueAbs}
                        className="inline-flex items-center gap-1"
                      >
                        Prazo: {goalDueCaption(goal.dueDate)}
                        {dueAbs ? ` (${dueAbs})` : null}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          goal.status === "on_track"
                            ? "text-success"
                            : goal.status === "at_risk"
                              ? "text-warning"
                              : goal.status === "achieved"
                                ? "text-success"
                                : "text-destructive",
                        )}
                      >
                        {goal.status === "on_track" && (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {goal.status === "at_risk" && (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {goal.status === "on_track"
                          ? "No ritmo"
                          : goal.status === "at_risk"
                            ? "Em risco"
                            : goal.status === "achieved"
                              ? "Atingida"
                              : "Atrasada"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Transações Recentes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Últimas movimentações</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="divide-y divide-border/50">
              {transactions.slice(0, 5).map((transaction) => {
                const category = categories.find(
                  (c) => c.id === transaction.category,
                );
                const isIncome = transaction.type === "income";
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/80 text-base"
                        aria-hidden
                      >
                        {category?.icon || "💰"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {transaction.description}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                              isIncome
                                ? "border-success/40 text-success bg-success/5"
                                : "border-expense/40 text-expense bg-expense/5",
                            )}
                          >
                            {isIncome ? "Entrada" : "Saída"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {category?.name} •{" "}
                          {new Date(transaction.date).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums shrink-0",
                        isIncome ? "text-success" : "text-expense",
                      )}
                    >
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [storeHydrated, setStoreHydrated] = useState(() =>
    useFinancialStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useFinancialStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
    if (useFinancialStore.persist.hasHydrated()) {
      setStoreHydrated(true);
    }
    return unsub;
  }, []);

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Visão geral da sua situação financeira"
      className="space-y-3 sm:space-y-6"
    >
      {storeHydrated ? <DashboardContent /> : <DashboardPageSkeleton />}
    </PageLayout>
  );
}
