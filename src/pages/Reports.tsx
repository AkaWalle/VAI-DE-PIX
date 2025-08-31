import { useState } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/action-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3,
  DollarSign
} from 'lucide-react';
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
  Cell
} from 'recharts';

export default function Reports() {
  const { transactions, categories, accounts, getCashflow } = useFinancialStore();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [isExporting, setIsExporting] = useState(false);

  // Análises de dados
  const totalTransactions = transactions.length;
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  // Dados para gráficos
  const cashflowData = getCashflow(parseInt(selectedPeriod));
  
  const categoryExpenses = categories
    .filter(c => c.type === 'expense')
    .map(category => {
      const categoryTransactions = transactions.filter(t => t.category === category.id && t.type === 'expense');
      const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return {
        name: category.name,
        value: total,
        color: category.color
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Criar relatório detalhado
      const reportData = {
        periodo: `Últimos ${selectedPeriod} meses`,
        resumo: {
          totalTransacoes: totalTransactions,
          totalReceitas: formatCurrency(totalIncome),
          totalDespesas: formatCurrency(totalExpenses),
          saldoLiquido: formatCurrency(netBalance)
        },
        fluxoCaixa: cashflowData,
        categorias: categoryExpenses,
        transacoes: transactions.map(t => ({
          data: new Date(t.date).toLocaleDateString('pt-BR'),
          tipo: t.type === 'income' ? 'Receita' : 'Despesa',
          descricao: t.description,
          categoria: categories.find(c => c.id === t.category)?.name || 'N/A',
          conta: accounts.find(a => a.id === t.account)?.name || 'N/A',
          valor: formatCurrency(Math.abs(t.amount))
        }))
      };

      // Simular download do relatório
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Relatório exportado!",
        description: "Seu relatório financeiro foi gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises detalhadas e exportações dos seus dados financeiros
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <ActionButton
            icon={Download}
            loading={isExporting}
            loadingText="Exportando..."
            onClick={handleExportReport}
          >
            Exportar Relatório
          </ActionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Registros no período</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-income/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-income" />
              Total de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Entradas confirmadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-expense/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-expense" />
              Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Saídas registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Saldo Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fluxo de Caixa */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Fluxo de Caixa - {selectedPeriod} meses
            </CardTitle>
            <CardDescription>
              Evolução mensal de receitas e despesas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value, { abbreviated: true })}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'income' ? 'Receitas' : 'Despesas'
                  ]}
                />
                <Bar dataKey="income" fill="hsl(var(--income))" name="income" />
                <Bar dataKey="expense" fill="hsl(var(--expense))" name="expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Despesas por Categoria */}
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Despesas por Categoria
            </CardTitle>
            <CardDescription>
              Distribuição percentual dos gastos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categoryExpenses.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryExpenses.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Valor']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle>Top 5 Categorias de Despesa</CardTitle>
          <CardDescription>
            Categorias com maior volume de gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryExpenses.slice(0, 5).map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(category.value)}</div>
                  <div className="text-xs text-muted-foreground">
                    {((category.value / totalExpenses) * 100).toFixed(1)}% do total
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