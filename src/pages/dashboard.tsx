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
import { formatCurrency } from "@/utils/format";
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
} from "recharts";
// Removed ChartTooltip imports to avoid context requirement outside ChartContainer

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function Dashboard() {
  const {
    getTotalBalance,
    getIncomeThisMonth,
    getExpensesThisMonth,
    getCashflow,
    updateDateRangeToCurrentMonth,
    goals,
    transactions,
    categories,
  } = useFinancialStore();

  // Atualizar dateRange para o mês atual quando o componente for montado
  // Executar apenas uma vez na montagem para evitar re-renders desnecessários
  useEffect(() => {
    updateDateRangeToCurrentMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas na montagem inicial

  const totalBalance = getTotalBalance();
  const monthlyIncome = getIncomeThisMonth();
  const monthlyExpenses = getExpensesThisMonth();
  const cashflowData = getCashflow(6);

  // Category spending data
  const categoryData = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const currentMonth = new Date();
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

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
  }, [transactions, categories]);

  // Goal progress
  const goalProgress = useMemo(() => {
    return goals.map((goal) => ({
      ...goal,
      progressPercentage: Math.min(
        (goal.currentAmount / goal.targetAmount) * 100,
        100,
      ),
    }));
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
  const chartHeight = isMobile ? 192 : 256;
  const chartFontSize = isMobile ? 10 : 12;

  // Banner: notificações de insights não lidas (C2)
  const [unreadInsightCount, setUnreadInsightCount] = useState(0);
  useEffect(() => {
    notificationsService
      .getUnreadInsightCount()
      .then(setUnreadInsightCount)
      .catch(() => setUnreadInsightCount(0));
  }, []);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Visão geral da sua situação financeira
        </p>
      </div>

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

      {/* Financial Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <FinancialCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          variant="balance"
          trend={{
            value: 12.5,
            direction: totalBalance > 20000 ? "up" : "down",
            label: "vs mês anterior",
          }}
        />

        <FinancialCard
          title="Receitas do Mês"
          value={formatCurrency(monthlyIncome)}
          icon={TrendingUp}
          variant="income"
          description="Entradas confirmadas"
        />

        <FinancialCard
          title="Despesas do Mês"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          variant="expense"
          description="Gastos registrados"
        />

        <FinancialCard
          title="Economia do Mês"
          value={formatCurrency(monthlyIncome - monthlyExpenses)}
          icon={PiggyBank}
          variant={monthlyIncome > monthlyExpenses ? "income" : "expense"}
          description="Sobrou este mês"
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
                          item.variation_pct > 0
                            ? "text-expense"
                            : item.variation_pct < 0
                              ? "text-success"
                              : "text-muted-foreground"
                        }
                      >
                        {item.variation_pct > 0 ? "+" : ""}
                        {item.variation_pct.toFixed(1)}%
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
                          className="h-9 px-3 text-sm"
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
                          className="h-9 px-3 text-sm text-muted-foreground"
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
            <CardDescription className="text-xs sm:text-sm">Evolução de receitas e despesas</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="overflow-x-auto -mx-1">
              <div className="min-w-[280px]" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: chartFontSize }}
                      interval={isMobile ? 2 : 0}
                    />
                    <YAxis
                      width={isMobile ? 55 : 70}
                      tick={{ fontSize: chartFontSize }}
                      tickFormatter={(value) =>
                        formatCurrency(value, { abbreviated: true })
                      }
                    />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === "income"
                      ? "Receita"
                      : name === "expense"
                        ? "Despesa"
                        : "Saldo",
                  ]}
                  position={{ x: 0, y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    border: "1px solid hsl(var(--border))",
                    padding: "8px 12px",
                    borderRadius: 8,
                    boxShadow:
                      "0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.1)",
                    opacity: 1,
                    backdropFilter: "none",
                    zIndex: 1000,
                    fontSize: isMobile ? 11 : undefined,
                  }}
                  labelStyle={{
                    color: "hsl(var(--card-foreground))",
                    marginBottom: 4,
                    fontWeight: 500,
                    fontSize: isMobile ? 11 : undefined,
                  }}
                  itemStyle={{
                    color: "hsl(var(--card-foreground))",
                    padding: 0,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    fontSize: isMobile ? 11 : undefined,
                  }}
                  wrapperStyle={{
                    outline: "none",
                    zIndex: 1000,
                  }}
                  offset={20}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stackId="1"
                  stroke="hsl(var(--income))"
                  fill="hsl(var(--income))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stackId="2"
                  stroke="hsl(var(--expense))"
                  fill="hsl(var(--expense))"
                  fillOpacity={0.6}
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
            <CardDescription className="text-xs sm:text-sm">Distribuição dos gastos deste mês</CardDescription>
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
                      const percentage = (
                        (entry.value /
                          categoryData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          )) *
                        100
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
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    Nenhum gasto registrado
                  </p>
                  <p className="text-sm">
                    Adicione transações de despesas para ver a distribuição por
                    categoria
                  </p>
                </div>
              </div>
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
            {goalProgress.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} /{" "}
                    {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <Progress value={goal.progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goal.progressPercentage.toFixed(1)}% concluído</span>
                  <span
                    className={`flex items-center gap-1 ${
                      goal.status === "on_track"
                        ? "text-success"
                        : goal.status === "at_risk"
                          ? "text-warning"
                          : goal.status === "achieved"
                            ? "text-success"
                            : "text-destructive"
                    }`}
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
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Transações Recentes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Últimas movimentações</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
            {transactions.slice(0, 5).map((transaction) => {
              const category = categories.find(
                (c) => c.id === transaction.category,
              );
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg">{category?.icon || "💰"}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category?.name} •{" "}
                        {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      transaction.type === "income"
                        ? "text-success"
                        : "text-expense"
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
