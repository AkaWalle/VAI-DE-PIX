import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { GoalCard } from "@/components/GoalCard";
import { SectionLabel } from "@/components/SectionLabel";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  fetchInsights,
  postInsightFeedback,
  type InsightsResponse,
} from "@/services/insights.service";
import { notificationsService } from "@/services/notifications.service";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { BankImportDialog } from "@/components/forms/BankImportDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InsightsRow } from "@/components/dashboard/InsightsRow";
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
  const navigate = useNavigate();
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
  const [cashflowPeriod, setCashflowPeriod] = useState<6 | 12 | "all">(6);
  const cashflowData = getCashflow(
    cashflowPeriod === "all" ? 999 : cashflowPeriod,
  );

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
  const chartHeight = isMobile ? 192 : 256;

  const hasCashflowData = cashflowData.some(
    (d) => Number(d.income) > 0 || Number(d.expense) > 0,
  );
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
    <PageLayout
      title="Dashboard"
      subtitle="Visão geral da sua situação financeira"
      className="space-y-3 sm:space-y-6"
    >

      {/* Banner: notificações de insights não lidas */}
      {unreadInsightCount > 0 && (
        <Alert className="border-[rgba(200,255,0,0.30)] bg-[rgba(200,255,0,0.04)]">
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
                  <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-[#c8ff00]" />
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
                        <span className="rounded bg-[rgba(200,255,0,0.10)] px-1.5 py-0.5 text-xs font-medium text-[#c8ff00]">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#c8ff00]" />
                  Fluxo de Caixa
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Evolução de receitas e despesas
                </CardDescription>
              </div>
              <div className="flex gap-1.5">
                {([6, 12, "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCashflowPeriod(p)}
                    className={cn(
                      "rounded-md px-2.5 py-1 transition-colors font-mono text-[9px] uppercase tracking-[0.05em]",
                      cashflowPeriod === p
                        ? "bg-[rgba(200,255,0,0.10)] text-[#c8ff00] border border-[rgba(200,255,0,0.18)]"
                        : "bg-white/[0.04] text-white/25 border border-white/[0.07] hover:text-foreground",
                    )}
                  >
                    {p === "all" ? "Tudo" : p === 6 ? "6M" : "1A"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {!hasCashflowData ? (
              <EmptyState
                icon={TrendingUp}
                title="Nenhum dado no fluxo de caixa"
                description="Adicione receitas e despesas ou importe um extrato para ver a evolução mensal."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <TransactionForm
                      trigger={
                        <Button size="sm">Adicionar transação</Button>
                      }
                    />
                    <BankImportDialog
                      trigger={
                        <Button size="sm" variant="outline">
                          Importar extrato
                        </Button>
                      }
                    />
                  </div>
                }
              />
            ) : (
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
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-[#c8ff00] font-mono text-[9px] uppercase tracking-[0.05em]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#c8ff00]"
                    aria-hidden
                  />
                  Receitas ↑
                </span>
                <span className="flex items-center gap-1.5 text-expense font-mono text-[9px] uppercase tracking-[0.05em]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm bg-expense"
                    aria-hidden
                  />
                  Despesas ↓
                </span>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Category Spending Chart */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-[#c8ff00]" />
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
              <EmptyState
                icon={CreditCard}
                title="Nenhum gasto registrado"
                description="Adicione transações de despesas para ver a distribuição por categoria."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <TransactionForm
                      trigger={
                        <Button size="sm">Adicionar transação</Button>
                      }
                    />
                    <BankImportDialog
                      trigger={
                        <Button size="sm" variant="outline">
                          Importar extrato
                        </Button>
                      }
                    />
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights proativos */}
      <InsightsRow
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        categoryData={categoryData}
        goalProgress={goalProgress}
      />

      {/* Goals and Recent Activity */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3">
        {/* Goals Progress */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card-custom">
          <CardHeader className="p-3 sm:p-6">
            <SectionLabel
              number="02"
              label="Metas em construção"
              action={{ text: "Ver todas", onClick: () => navigate("/goals") }}
            />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3">
              {goalProgress.slice(0, 3).map((goal) => (
                <div key={goal.id} className="min-w-[260px] md:min-w-0">
                  <GoalCard
                    name={goal.name}
                    currentAmount={goal.currentAmount}
                    targetAmount={goal.targetAmount}
                    dueDate={goal.dueDate}
                    status={goal.status}
                  />
                </div>
              ))}
            </div>
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
                        ? "text-neon-green"
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
    </PageLayout>
  );
}
