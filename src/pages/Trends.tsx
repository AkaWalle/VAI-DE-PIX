import { useMemo } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function Trends() {
  const { transactions, categories, getCashflow } = useFinancialStore();

  // Análise de tendências
  const last6MonthsData = getCashflow(6);
  const last12MonthsData = getCashflow(12);
  const last3MonthsData = getCashflow(3);

  // Calcular tendências
  const calculateTrend = (data: { income: number; expense: number }[]) => {
    if (data.length < 3) return { trend: 0, direction: "neutral" as const };

    const recentAvgBase = 3;
    const recent =
      data
        .slice(-recentAvgBase)
        .reduce(
          (sum, item) =>
            sum + (Number(item.income) - Math.abs(Number(item.expense))),
          0,
        ) / recentAvgBase;
    const older =
      data
        .slice(0, recentAvgBase)
        .reduce(
          (sum, item) =>
            sum + (Number(item.income) - Math.abs(Number(item.expense))),
          0,
        ) / recentAvgBase;

    if (!Number.isFinite(older) || Math.abs(older) === 0) {
      return { trend: 0, direction: "neutral" as const };
    }

    const trend = ((recent - older) / Math.abs(older)) * 100;
    const direction = trend > 5 ? "up" : trend < -5 ? "down" : "neutral";

    return { trend: Math.abs(trend), direction };
  };

  const incomeTrend = calculateTrend(
    last6MonthsData.map((d) => ({ income: d.income, expense: 0 })),
  );
  const expenseTrend = calculateTrend(
    last6MonthsData.map((d) => ({ income: 0, expense: d.expense })),
  );
  const balanceTrend = calculateTrend(last6MonthsData);

  // Análise de categorias com maior crescimento/decrescimento
  const categoryTrends = useMemo(() => {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(currentMonth);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return categories
      .map((category) => {
        const currentMonthTransactions = transactions.filter((t) => {
          const tDate = new Date(t.date);
          return (
            t.category === category.id &&
            tDate.getMonth() === currentMonth.getMonth() &&
            tDate.getFullYear() === currentMonth.getFullYear()
          );
        });

        const lastMonthTransactions = transactions.filter((t) => {
          const tDate = new Date(t.date);
          return (
            t.category === category.id &&
            tDate.getMonth() === lastMonth.getMonth() &&
            tDate.getFullYear() === lastMonth.getFullYear()
          );
        });

        const currentTotal = currentMonthTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0,
        );
        const lastTotal = lastMonthTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0,
        );

        const change =
          lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

        return {
          category: category.name,
          color: category.color,
          currentTotal,
          lastTotal,
          change,
          direction: change > 10 ? "up" : change < -10 ? "down" : "stable",
        };
      })
      .filter((item) => item.currentTotal > 0 || item.lastTotal > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [transactions, categories]);

  // Previsões simples baseadas em tendências
  const predictions = useMemo(() => {
    if (!last3MonthsData.length) {
      return { income: 0, expense: 0, balance: 0 };
    }

    const avgIncome =
      last3MonthsData.reduce((sum, d) => sum + Number(d.income || 0), 0) /
      last3MonthsData.length;
    const avgExpense =
      last3MonthsData.reduce(
        (sum, d) => sum + Math.abs(Number(d.expense || 0)),
        0,
      ) / last3MonthsData.length;

    const incomeDelta =
      (incomeTrend.direction === "up"
        ? incomeTrend.trend
        : incomeTrend.direction === "down"
          ? -incomeTrend.trend
          : 0) / 100;
    const expenseDelta =
      (expenseTrend.direction === "up"
        ? expenseTrend.trend
        : expenseTrend.direction === "down"
          ? -expenseTrend.trend
          : 0) / 100;

    const nextMonthIncome = Number.isFinite(avgIncome)
      ? avgIncome * (1 + incomeDelta)
      : 0;
    const nextMonthExpense = Number.isFinite(avgExpense)
      ? avgExpense * (1 + expenseDelta)
      : 0;

    return {
      income: nextMonthIncome,
      expense: nextMonthExpense,
      balance: nextMonthIncome - nextMonthExpense,
    };
  }, [last3MonthsData, incomeTrend, expenseTrend]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tendências</h1>
        <p className="text-muted-foreground">
          Análise de padrões e tendências dos seus gastos
        </p>
      </div>

      {/* Trend Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendência de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${incomeTrend.direction === "up" ? "text-income" : incomeTrend.direction === "down" ? "text-expense" : "text-muted-foreground"}`}
              >
                {incomeTrend.trend.toFixed(1)}%
              </div>
              {incomeTrend.direction === "up" && (
                <TrendingUp className="h-5 w-5 text-income" />
              )}
              {incomeTrend.direction === "down" && (
                <TrendingDown className="h-5 w-5 text-expense" />
              )}
              {incomeTrend.direction === "neutral" && (
                <Target className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {incomeTrend.direction === "up"
                ? "Crescimento"
                : incomeTrend.direction === "down"
                  ? "Declínio"
                  : "Estável"}{" "}
              nos últimos 6 meses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Tendência de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${expenseTrend.direction === "up" ? "text-expense" : expenseTrend.direction === "down" ? "text-income" : "text-muted-foreground"}`}
              >
                {expenseTrend.trend.toFixed(1)}%
              </div>
              {expenseTrend.direction === "up" && (
                <TrendingUp className="h-5 w-5 text-expense" />
              )}
              {expenseTrend.direction === "down" && (
                <TrendingDown className="h-5 w-5 text-income" />
              )}
              {expenseTrend.direction === "neutral" && (
                <Target className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseTrend.direction === "up"
                ? "Aumento"
                : expenseTrend.direction === "down"
                  ? "Redução"
                  : "Estável"}{" "}
              nos gastos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tendência do Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${balanceTrend.direction === "up" ? "text-income" : balanceTrend.direction === "down" ? "text-expense" : "text-muted-foreground"}`}
              >
                {balanceTrend.trend.toFixed(1)}%
              </div>
              {balanceTrend.direction === "up" && (
                <TrendingUp className="h-5 w-5 text-income" />
              )}
              {balanceTrend.direction === "down" && (
                <TrendingDown className="h-5 w-5 text-expense" />
              )}
              {balanceTrend.direction === "neutral" && (
                <Target className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Evolução do saldo líquido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendência de 6 meses */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução - 6 Meses
            </CardTitle>
            <CardDescription>Tendência de receitas e despesas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last6MonthsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    formatCurrency(value, { abbreviated: true })
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value) || 0),
                    name === "income" ? "Receitas" : "Despesas",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--income))"
                  strokeWidth={2}
                  name="income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--expense))"
                  strokeWidth={2}
                  name="expense"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendência de 12 meses */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Visão Anual - 12 Meses
            </CardTitle>
            <CardDescription>Panorama completo do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={last12MonthsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    formatCurrency(value, { abbreviated: true })
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value) || 0),
                    name === "balance"
                      ? "Saldo"
                      : name === "income"
                        ? "Receitas"
                        : "Despesas",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Trends */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle>Tendências por Categoria</CardTitle>
          <CardDescription>
            Categorias com maiores variações no último mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryTrends.slice(0, 8).map((trend) => (
              <div
                key={trend.category}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: trend.color }}
                  />
                  <span className="font-medium">{trend.category}</span>
                  <Badge
                    variant={
                      trend.direction === "up"
                        ? "destructive"
                        : trend.direction === "down"
                          ? "default"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {trend.direction === "up" && (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    )}
                    {trend.direction === "down" && (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {trend.direction === "stable" && (
                      <Target className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(trend.change).toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(trend.currentTotal)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trend.change > 0 ? "+" : ""}
                    {formatCurrency(trend.currentTotal - trend.lastTotal)} vs
                    mês anterior
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Predictions */}
      <Card className="bg-gradient-card shadow-card-custom border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Previsões para Próximo Mês
          </CardTitle>
          <CardDescription>
            Estimativas baseadas nas tendências atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-income/10 border border-income/20">
              <div className="text-sm text-muted-foreground mb-1">
                Receitas Previstas
              </div>
              <div className="text-2xl font-bold text-income">
                {formatCurrency(predictions.income)}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-expense/10 border border-expense/20">
              <div className="text-sm text-muted-foreground mb-1">
                Despesas Previstas
              </div>
              <div className="text-2xl font-bold text-expense">
                {formatCurrency(predictions.expense)}
              </div>
            </div>
            <div
              className={`text-center p-4 rounded-lg ${predictions.balance >= 0 ? "bg-income/10 border-income/20" : "bg-expense/10 border-expense/20"}`}
            >
              <div className="text-sm text-muted-foreground mb-1">
                Saldo Previsto
              </div>
              <div
                className={`text-2xl font-bold ${predictions.balance >= 0 ? "text-income" : "text-expense"}`}
              >
                {formatCurrency(predictions.balance)}
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              * Previsões baseadas na média dos últimos 3 meses e tendências
              atuais
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
