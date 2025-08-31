import { useMemo } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { FinancialCard } from '@/components/ui/financial-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/format';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank
} from 'lucide-react';
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
  BarChart,
  Bar
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const {
    getTotalBalance,
    getIncomeThisMonth,
    getExpensesThisMonth,
    getCashflow,
    goals,
    transactions,
    categories,
    accounts
  } = useFinancialStore();

  const totalBalance = getTotalBalance();
  const monthlyIncome = getIncomeThisMonth();
  const monthlyExpenses = getExpensesThisMonth();
  const cashflowData = getCashflow(6);

  // Category spending data
  const categoryData = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    return expenseCategories.map(category => {
      const categoryTransactions = transactions.filter(t => 
        t.category === category.id && 
        t.type === 'expense' &&
        new Date(t.date) >= monthStart
      );
      
      const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      return {
        name: category.name,
        value: total,
        color: category.color
      };
    }).filter(item => item.value > 0)
     .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Goal progress
  const goalProgress = useMemo(() => {
    return goals.map(goal => ({
      ...goal,
      progressPercentage: Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    }));
  }, [goals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da sua situação financeira
        </p>
      </div>

      {/* Financial Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FinancialCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          variant="balance"
          trend={{
            value: 12.5,
            direction: totalBalance > 20000 ? 'up' : 'down',
            label: 'vs mês anterior'
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
          variant={monthlyIncome > monthlyExpenses ? 'income' : 'expense'}
          description="Sobrou este mês"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cashflow Chart */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Fluxo de Caixa (6 meses)
            </CardTitle>
            <CardDescription>
              Evolução de receitas e despesas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value, { abbreviated: true })}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)), 
                    name === 'income' ? 'Receita' : 
                    name === 'expense' ? 'Despesa' : 'Saldo'
                  ]}
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
          </CardContent>
        </Card>

        {/* Category Spending Chart */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Gastos por Categoria
            </CardTitle>
            <CardDescription>
              Distribuição dos gastos deste mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
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
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Gasto']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Goals and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals Progress */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Progresso das Metas
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso dos seus objetivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalProgress.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <Progress 
                  value={goal.progressPercentage} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goal.progressPercentage.toFixed(1)}% concluído</span>
                  <span className={`flex items-center gap-1 ${
                    goal.status === 'on_track' ? 'text-success' :
                    goal.status === 'at_risk' ? 'text-warning' :
                    goal.status === 'achieved' ? 'text-success' : 'text-destructive'
                  }`}>
                    {goal.status === 'on_track' && <ArrowUpRight className="h-3 w-3" />}
                    {goal.status === 'at_risk' && <ArrowDownRight className="h-3 w-3" />}
                    {goal.status === 'on_track' ? 'No ritmo' :
                     goal.status === 'at_risk' ? 'Em risco' :
                     goal.status === 'achieved' ? 'Atingida' : 'Atrasada'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>
              Últimas movimentações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => {
              const category = categories.find(c => c.id === transaction.category);
              return (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {category?.icon || '💰'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category?.name} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    transaction.type === 'income' ? 'text-success' : 'text-expense'
                  }`}>
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