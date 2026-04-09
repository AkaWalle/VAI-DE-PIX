import { useMemo, useEffect, useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
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
  Sparkles,
} from "lucide-react";
import {
  fetchInsights,
  postInsightFeedback,
  type InsightsResponse,
} from "@/services/insights.service";
import { notificationsService } from "@/services/notifications.service";
import { Button } from "@/components/ui/button";
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

const PIE_COLORS = ["#25d366", "#34b7f1", "#128c7e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/* ── Stat Card ── */
function StatCard({
  title,
  value,
  icon: Icon,
  variant,
  sub,
  delay = 0,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  variant: "balance" | "income" | "expense" | "savings";
  sub?: string;
  delay?: number;
}) {
  const styles = {
    balance: {
      wrap: "border-[rgba(18,140,126,0.2)] bg-gradient-to-br from-[rgba(18,140,126,0.08)] to-[rgba(18,140,126,0.02)]",
      icon: "bg-[rgba(18,140,126,0.12)] text-[#128c7e]",
      val:  "text-foreground",
    },
    income: {
      wrap: "border-[rgba(37,211,102,0.2)] bg-gradient-to-br from-[rgba(37,211,102,0.08)] to-[rgba(37,211,102,0.02)]",
      icon: "bg-[rgba(220,248,198,0.6)] text-[#25d366]",
      val:  "text-[#25d366]",
    },
    expense: {
      wrap: "border-[rgba(239,68,68,0.2)] bg-gradient-to-br from-[rgba(239,68,68,0.08)] to-[rgba(239,68,68,0.02)]",
      icon: "bg-[rgba(239,68,68,0.12)] text-[#ef4444]",
      val:  "text-[#ef4444]",
    },
    savings: {
      wrap: "border-[rgba(52,183,241,0.2)] bg-gradient-to-br from-[rgba(52,183,241,0.08)] to-[rgba(52,183,241,0.02)]",
      icon: "bg-[rgba(52,183,241,0.12)] text-[#34b7f1]",
      val:  "text-[#34b7f1]",
    },
  }[variant];

  return (
    <div
      className={`animate-fade-in-up relative overflow-hidden rounded-[12px] border p-5 transition-all duration-200 hover:scale-[1.01] bg-card ${styles.wrap}`}
      style={{ animationDelay: `${delay}ms`, boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className={`tabular text-[28px] font-bold tracking-tight ${styles.val}`}>
            {value}
          </p>
          {sub && <p className="mt-1.5 text-[13px] text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ── Section Header ── */
function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(18,140,126,0.12)]">
        <Icon className="h-4 w-4 text-[#128c7e]" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Panel ── */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[12px] border border-border bg-card p-5 ${className}`}
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {children}
    </div>
  );
}

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

  useEffect(() => {
    updateDateRangeToCurrentMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBalance    = getTotalBalance();
  const monthlyIncome   = getIncomeThisMonth();
  const monthlyExpenses = getExpensesThisMonth();
  const savings         = monthlyIncome - monthlyExpenses;
  const cashflowData    = getCashflow(6);

  // Category spending
  const categoryData = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const parseLocal = (d: string) => {
      const [y, m, dd] = d.split("-").map(Number);
      return new Date(y, (m || 1) - 1, dd || 1, 12);
    };
    return expenseCategories
      .map((cat) => {
        const total = transactions
          .filter((t) => {
            const td = parseLocal(t.date);
            return t.category === cat.id && t.type === "expense" && td >= monthStart && td <= monthEnd;
          })
          .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { name: cat.name, value: Number.isFinite(total) ? total : 0, color: cat.color };
      })
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  const totalCategorySpend = categoryData.reduce((s, x) => s + x.value, 0);

  // Goals
  const goalProgress = useMemo(
    () => goals.map((g) => ({ ...g, pct: Math.min((g.currentAmount / g.targetAmount) * 100, 100) })),
    [goals],
  );

  // Insights
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadInsights = () => {
    setInsightsLoading(true);
    fetchInsights().then(setInsights).catch(() => setInsights(null)).finally(() => setInsightsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchInsights()
      .then((d) => { if (!cancelled) setInsights(d); })
      .catch(() => { if (!cancelled) setInsights(null); })
      .finally(() => { if (!cancelled) setInsightsLoading(false); });
    notificationsService.getUnreadInsightCount().then(setUnreadCount).catch(() => setUnreadCount(0));
    return () => { cancelled = true; };
  }, []);

  const handleFeedback = async (
    type: "category_variation" | "goal_at_risk",
    hash: string,
    status: "seen" | "ignored",
  ) => {
    setFeedbackLoading(hash);
    try { await postInsightFeedback(type, hash, status); loadInsights(); }
    finally { setFeedbackLoading(null); }
  };

  const categoryVariation = insights?.category_monthly_variation ?? [];
  const goalsAtRisk = insights?.goals_at_risk?.filter((g) => g.at_risk) ?? [];

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#128c7e] mb-1">
            {greeting}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(18,140,126,0.2)] bg-[rgba(18,140,126,0.08)] px-3 py-2 text-xs font-medium text-[#128c7e]">
            <Sparkles className="h-3.5 w-3.5" />
            {unreadCount} insight{unreadCount > 1 ? "s" : ""} novo{unreadCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Saldo Total"  value={formatCurrency(totalBalance)}    icon={Wallet}      variant="balance"                          sub="Todas as contas"   delay={0}   />
        <StatCard title="Receitas"     value={formatCurrency(monthlyIncome)}   icon={TrendingUp}  variant="income"                           sub="Este mês"          delay={80}  />
        <StatCard title="Despesas"     value={formatCurrency(monthlyExpenses)} icon={TrendingDown} variant="expense"                         sub="Este mês"          delay={160} />
        <StatCard title="Economia"     value={formatCurrency(savings)}         icon={PiggyBank}   variant={savings >= 0 ? "savings" : "expense"} sub="Sobrou este mês" delay={240} />
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Cashflow — 3 cols */}
        <Panel className="lg:col-span-3">
          <SectionTitle icon={TrendingUp} title="Fluxo de Caixa" sub="Últimos 6 meses" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cashflowData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#25d366" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#25d366" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, { abbreviated: true })}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  boxShadow: "var(--shadow-md)",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 6 }}
                itemStyle={{ color: "hsl(var(--muted-foreground))", padding: "1px 0" }}
                formatter={(v, n) => [formatCurrency(Number(v)), n === "income" ? "Receita" : "Despesa"]}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#25d366"
                strokeWidth={2}
                fill="url(#gradIncome)"
                dot={false}
                activeDot={{ r: 4, fill: "#25d366", strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#gradExpense)"
                dot={false}
                activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-5 px-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#25d366]" /> Receita
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" /> Despesa
            </span>
          </div>
        </Panel>

        {/* Pie — 2 cols */}
        <Panel className="lg:col-span-2">
          <SectionTitle icon={CreditCard} title="Gastos por Categoria" sub="Este mês" />
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      boxShadow: "var(--shadow-md)",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(v) => [formatCurrency(Number(v)), "Gasto"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2.5">
                {categoryData.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color || PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-xs text-muted-foreground">{entry.name}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {((entry.value / totalCategorySpend) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum gasto registrado</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Goals + Recent Transactions ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Goals — 3 cols */}
        <Panel className="lg:col-span-3">
          <SectionTitle icon={Target} title="Progresso das Metas" sub="Seus objetivos financeiros" />
          {goalProgress.length > 0 ? (
            <div className="space-y-4">
              {goalProgress.map((goal) => (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate pr-4">{goal.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${
                      goal.status === "achieved" || goal.status === "on_track"
                        ? "text-[#25d366]"
                        : goal.status === "at_risk"
                          ? "text-[#f59e0b]"
                          : "text-[#ef4444]"
                    }`}>
                      {goal.status === "on_track" || goal.status === "achieved"
                        ? <ArrowUpRight className="h-3 w-3" />
                        : <ArrowDownRight className="h-3 w-3" />}
                      {goal.status === "on_track" ? "No ritmo" : goal.status === "achieved" ? "Atingida" : goal.status === "at_risk" ? "Em risco" : "Atrasada"}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${goal.pct}%`,
                        background: goal.pct >= 100 ? "#25d366" : goal.pct >= 60 ? "#128c7e" : "#f59e0b",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span>{goal.pct.toFixed(0)}% de {formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada</p>
            </div>
          )}
        </Panel>

        {/* Recent Transactions — 2 cols */}
        <Panel className="lg:col-span-2">
          <SectionTitle icon={CreditCard} title="Últimas Transações" />
          {transactions.length > 0 ? (
            <div className="space-y-1">
              {transactions.slice(0, 6).map((tx) => {
                const cat = categories.find((c) => c.id === tx.category);
                const isIncome = tx.type === "income";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-[8px] p-2.5 transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-secondary text-base">
                      {cat?.icon || "💰"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat?.name} · {new Date(tx.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${isIncome ? "text-[#25d366]" : "text-[#ef4444]"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhuma transação</p>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Insights ── */}
      {!insightsLoading && (categoryVariation.length > 0 || goalsAtRisk.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {categoryVariation.length > 0 && (
            <Panel>
              <SectionTitle icon={Lightbulb} title="Variação por Categoria" sub="Este mês vs. mês anterior" />
              <div className="space-y-2.5">
                {categoryVariation.slice(0, 5).map((item) => (
                  <div key={item.category_id} className="rounded-[8px] border border-border bg-secondary p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.category_name}</span>
                      <span className={`text-xs font-semibold ${item.variation_pct > 0 ? "text-[#ef4444]" : item.variation_pct < 0 ? "text-[#25d366]" : "text-muted-foreground"}`}>
                        {item.variation_pct > 0 ? "+" : ""}{item.variation_pct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {goalsAtRisk.length > 0 && (
            <Panel>
              <SectionTitle icon={AlertTriangle} title="Metas em Risco" sub="Podem não ser atingidas no prazo" />
              <div className="space-y-2.5">
                {goalsAtRisk.slice(0, 5).map((item, idx) => (
                  <div key={item.goal_id} className="rounded-[8px] border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.05)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate pr-2">{item.goal_name}</span>
                      {idx === 0 && (
                        <span className="shrink-0 rounded-full bg-[rgba(18,140,126,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#128c7e]">
                          Maior impacto
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-1">{item.risk_reason}</p>
                    <p className="text-[11px] text-[#f59e0b]">
                      ~{formatCurrency(item.required_per_month)}/mês · {item.days_left} dias restantes
                    </p>
                    {item.insight_hash && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="ghost"
                          className="h-6 rounded-[6px] px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          disabled={feedbackLoading === item.insight_hash}
                          onClick={() => handleFeedback("goal_at_risk", item.insight_hash!, "seen")}>
                          Entendi
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-6 rounded-[6px] px-2 text-[11px] text-muted-foreground hover:text-[#ef4444]"
                          disabled={feedbackLoading === item.insight_hash}
                          onClick={() => handleFeedback("goal_at_risk", item.insight_hash!, "ignored")}>
                          Ignorar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
