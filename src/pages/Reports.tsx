import { useState, useMemo } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import { downloadReportsCsv } from "@/services/reports-export.service";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  DollarSign,
  ChevronDown,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

function buildCashflowFromTransactions(
  transactions: { date: string; type: string; amount: number }[],
  months: number,
) {
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12);
  };
  const result: {
    month: string;
    income: number;
    expense: number;
    balance: number;
  }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const monthTransactions = transactions.filter((t) => {
      const tDate = parseLocalDate(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
    });

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    result.push({
      month: date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
      income,
      expense,
      balance: income - expense,
    });
  }

  return result;
}

export default function Reports() {
  const { transactions, categories } = useFinancialStore();
  const reduceMotion = usePrefersReducedMotion();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("6");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [cashflowOpen, setCashflowOpen] = useState(true);
  const [pieOpen, setPieOpen] = useState(true);

  const filteredTransactions = useMemo(() => {
    if (categoryFilter === "all") return transactions;
    return transactions.filter((t) => t.category === categoryFilter);
  }, [transactions, categoryFilter]);

  const reportSummary = useMemo(() => {
    const txs = filteredTransactions;
    const totalIncome = txs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = txs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const categoryExpenses = categories
      .filter((c) => c.type === "expense")
      .map((category) => {
        const categoryTransactions = txs.filter(
          (t) => t.category === category.id && t.type === "expense",
        );
        const total = categoryTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0,
        );
        return {
          name: category.name,
          value: total,
          color: category.color,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      totalTransactions: txs.length,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryExpenses,
    };
  }, [filteredTransactions, categories]);

  const {
    totalTransactions,
    totalIncome,
    totalExpenses,
    netBalance,
    categoryExpenses,
  } = reportSummary;

  const cashflowData = useMemo(
    () =>
      buildCashflowFromTransactions(
        filteredTransactions,
        parseInt(selectedPeriod, 10),
      ),
    [filteredTransactions, selectedPeriod],
  );

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await downloadReportsCsv(parseInt(selectedPeriod, 10));
      toast({
        title: "CSV exportado",
        description:
          "Arquivo gerado no servidor (transações do período configurado na API).",
      });
    } catch (err) {
      toast({
        title: "Falha na exportação",
        description:
          err instanceof Error
            ? err.message
            : "Verifique sua sessão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const expenseCategoryOptions = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Filtros, gráficos expansíveis e exportação CSV (API).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-44 min-w-0">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {expenseCategoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ActionButton
            icon={Download}
            loading={isExporting}
            loadingText="Gerando CSV..."
            onClick={handleExportCsv}
            size="sm"
            className="w-full sm:w-auto"
          >
            Exportar CSV (servidor)
          </ActionButton>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        O filtro por categoria restringe apenas transações e gráficos nesta página.
        A exportação CSV do servidor usa somente o período (meses), até a API
        passar a aceitar categoria no contrato de export.
      </p>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Transações (filtradas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Linhas após filtro de categoria
            </p>
          </CardContent>
        </Card>

        <Card className="border-income/20 bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-income" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-expense/20 bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-expense" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Saldo líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${netBalance >= 0 ? "text-income" : "text-expense"}`}
            >
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Collapsible open={cashflowOpen} onOpenChange={setCashflowOpen}>
          <Card className="bg-gradient-card shadow-card-custom">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
                  Fluxo de caixa — {selectedPeriod} meses
                </CardTitle>
                <CardDescription className="mt-1">
                  Receitas e despesas por mês (dados filtrados)
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-expanded={cashflowOpen}
                  aria-label={cashflowOpen ? "Recolher gráfico" : "Expandir gráfico"}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      cashflowOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent className="data-[state=closed]:motion-safe:animate-out">
              <CardContent className="pt-0">
                <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashflowData}>
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
                          formatCurrency(Number(value)),
                          name === "income" ? "Receitas" : "Despesas",
                        ]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey="income"
                        fill="hsl(var(--income))"
                        name="income"
                        isAnimationActive={!reduceMotion}
                        className="motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in-0 motion-reduce:animate-none"
                      />
                      <Bar
                        dataKey="expense"
                        fill="hsl(var(--expense))"
                        name="expense"
                        isAnimationActive={!reduceMotion}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={pieOpen} onOpenChange={setPieOpen}>
          <Card className="bg-gradient-card shadow-card-custom">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-5 w-5 shrink-0 text-primary" />
                  Despesas por categoria
                </CardTitle>
                <CardDescription className="mt-1">
                  Distribuição (filtro aplicado)
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-expanded={pieOpen}
                  aria-label={pieOpen ? "Recolher gráfico" : "Expandir gráfico"}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      pieOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={categoryExpenses.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          isAnimationActive={!reduceMotion}
                          animationDuration={reduceMotion ? 0 : 400}
                        >
                          {categoryExpenses.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-col justify-center gap-3 lg:w-auto lg:min-w-[200px]">
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                      Legenda
                    </h4>
                    {categoryExpenses.slice(0, 6).map((entry, index) => {
                      const total = categoryExpenses.reduce(
                        (sum, item) => sum + (item.value ?? 0),
                        0,
                      );
                      const percentage = (
                        ((entry.value ?? 0) / (total || 1)) *
                        100
                      ).toFixed(1);
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {entry.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(entry.value)} ({percentage}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle>Top 5 categorias de despesa</CardTitle>
          <CardDescription>Maior volume após filtros ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryExpenses.slice(0, 5).map((cat, index) => (
              <div
                key={cat.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(cat.value)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(((cat.value ?? 0) / (totalExpenses || 1)) * 100).toFixed(
                      1,
                    )}
                    % do total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
