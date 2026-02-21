import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { BankImportDialog } from "@/components/forms/BankImportDialog";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Upload,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Calendar,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Transactions() {
  const {
    transactions,
    categories,
    accounts,
    clearAllTransactions,
    deleteTransaction,
  } = useFinancialStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "income" | "expense"
  >("all");

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );

  // Filtros de data
  const [dateFilter, setDateFilter] = useState<
    "all" | "specific" | "month" | "year"
  >("all");
  const [specificDate, setSpecificDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === "all" || transaction.type === selectedType;

    // Filtro de data
    let matchesDate = true;
    if (dateFilter !== "all") {
      const transactionDate = new Date(transaction.date);

      switch (dateFilter) {
        case "specific":
          if (specificDate) {
            const filterDate = new Date(specificDate);
            matchesDate =
              transactionDate.toDateString() === filterDate.toDateString();
          }
          break;
        case "month":
          if (selectedMonth) {
            const [year, month] = selectedMonth.split("-");
            matchesDate =
              transactionDate.getFullYear() === parseInt(year) &&
              transactionDate.getMonth() === parseInt(month) - 1;
          }
          break;
        case "year":
          if (selectedYear) {
            matchesDate =
              transactionDate.getFullYear() === parseInt(selectedYear);
          }
          break;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const getCategoryName = (categoryId: string) => {
    return (
      categories.find((c) => c.id === categoryId)?.name ||
      "Categoria não encontrada"
    );
  };

  const getAccountName = (accountId: string) => {
    return (
      accounts.find((a) => a.id === accountId)?.name || "Conta não encontrada"
    );
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setDateFilter("all");
    setSpecificDate("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  // Gerar opções de mês e ano baseadas nas transações
  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Funções de seleção
  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(filteredTransactions.map((t) => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const isAllSelected =
    filteredTransactions.length > 0 &&
    selectedTransactions.size === filteredTransactions.length;
  const isIndeterminate =
    selectedTransactions.size > 0 &&
    selectedTransactions.size < filteredTransactions.length;
  // Reservado para uso em checkbox indeterminado
  void isIndeterminate;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simular exportação
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Criar dados para exportação
      const exportData = filteredTransactions.map((transaction) => ({
        Data: formatDate(transaction.date),
        Tipo: transaction.type === "income" ? "Receita" : "Despesa",
        Descrição: transaction.description,
        Categoria: getCategoryName(transaction.category),
        Conta: getAccountName(transaction.account),
        Valor: formatCurrency(Math.abs(transaction.amount)),
        Tags: transaction.tags?.join(", ") || "",
      }));

      // Criar CSV
      const csvContent = [
        Object.keys(exportData[0] || {}).join(","),
        ...exportData.map((row) =>
          Object.values(row)
            .map((val) => `"${val}"`)
            .join(","),
        ),
      ].join("\n");

      // Download do arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `transacoes-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída!",
        description: `${exportData.length} transações exportadas com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao tentar exportar as transações.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAllTransactions = async () => {
    setIsDeleting(true);
    try {
      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      clearAllTransactions();
      setSelectedTransactions(new Set());

      toast({
        title: "Transações apagadas!",
        description: "Todas as transações foram removidas com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao apagar",
        description: "Ocorreu um erro ao tentar apagar as transações.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) return;

    setIsDeleting(true);
    try {
      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Apagar transações selecionadas
      selectedTransactions.forEach((id) => {
        deleteTransaction(id);
      });

      const count = selectedTransactions.size;
      setSelectedTransactions(new Set());

      toast({
        title: "Transações apagadas!",
        description: `${count} transação${count > 1 ? "ões" : ""} removida${count > 1 ? "s" : ""} com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro ao apagar",
        description: "Ocorreu um erro ao tentar apagar as transações.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap items-center">
          <BankImportDialog
            trigger={
              <ActionButton
                variant="outline"
                size="sm"
                icon={Download}
                className="h-9 px-3 text-sm"
              >
                Importar Relatório
              </ActionButton>
            }
          />
          <ActionButton
            variant="outline"
            size="sm"
            icon={Upload}
            loading={isExporting}
            loadingText="Exportando..."
            onClick={handleExport}
            className="h-9 px-3 text-sm"
          >
            Exportar
          </ActionButton>

          {/* Botões de seleção - aparecem apenas quando há transações */}
          {filteredTransactions.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(!isAllSelected)}
                className="h-9 px-3 text-sm flex items-center gap-2"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isAllSelected ? "Desmarcar Todas" : "Selecionar Todas"}
              </Button>

              {selectedTransactions.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <ActionButton
                      variant="destructive"
                      size="sm"
                      icon={Trash2}
                      loading={isDeleting}
                      loadingText="Apagando..."
                      className="h-9 px-3 text-sm"
                    >
                      Apagar Selecionadas ({selectedTransactions.size})
                    </ActionButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Apagar transações selecionadas?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.{" "}
                        {selectedTransactions.size} transação
                        {selectedTransactions.size > 1 ? "ões" : ""} será
                        {selectedTransactions.size > 1 ? "ão" : ""}{" "}
                        permanentemente removida
                        {selectedTransactions.size > 1 ? "s" : ""}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sim, apagar selecionadas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {transactions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <ActionButton
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  loading={isDeleting}
                  loadingText="Apagando..."
                  className="h-9 px-3 text-sm text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Apagar Todas
                </ActionButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Apagar todas as transações?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as suas transações (
                    {transactions.length}) serão permanentemente removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllTransactions}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, apagar todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <TransactionForm
            trigger={
              <ActionButton
                icon={Plus}
                variant="default"
                className="h-9 px-3 text-sm"
              >
                Nova Transação
              </ActionButton>
            }
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Refine sua busca por transações</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-sm flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primeira linha: Busca e Tipo */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={selectedType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("all")}
                  className="h-9 px-3 text-sm"
                >
                  Todas
                </Button>
                <Button
                  variant={selectedType === "income" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("income")}
                  className="h-9 px-3 text-sm"
                >
                  Receitas
                </Button>
                <Button
                  variant={selectedType === "expense" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("expense")}
                  className="h-9 px-3 text-sm"
                >
                  Despesas
                </Button>
              </div>
            </div>

            {/* Segunda linha: Filtros de Data */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtro por Data:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={dateFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter("all")}
                  className="h-9 px-3 text-sm"
                >
                  Todas as Datas
                </Button>
                <Button
                  variant={dateFilter === "specific" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter("specific")}
                  className="h-9 px-3 text-sm"
                >
                  Data Específica
                </Button>
                <Button
                  variant={dateFilter === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter("month")}
                  className="h-9 px-3 text-sm"
                >
                  Por Mês
                </Button>
                <Button
                  variant={dateFilter === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter("year")}
                  className="h-9 px-3 text-sm"
                >
                  Por Ano
                </Button>
              </div>
            </div>

            {/* Terceira linha: Controles de Data */}
            {dateFilter !== "all" && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {dateFilter === "specific" && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Data:</label>
                    <Input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                )}

                {dateFilter === "month" && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Mês:</label>
                    <Select
                      value={selectedMonth}
                      onValueChange={setSelectedMonth}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableMonths().map((month) => {
                          const [year, monthNum] = month.split("-");
                          const monthName = new Date(
                            parseInt(year),
                            parseInt(monthNum) - 1,
                          ).toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          });
                          return (
                            <SelectItem key={month} value={month}>
                              {monthName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {dateFilter === "year" && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Ano:</label>
                    <Select
                      value={selectedYear}
                      onValueChange={setSelectedYear}
                    >
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableYears().map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-income/10 border-income/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-income">
              Total Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredTransactions
                  .filter((t) => t.type === "income")
                  .reduce((sum, t) => sum + t.amount, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((t) => t.type === "income").length}{" "}
              transações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-expense/10 border-expense/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-expense">
              Total Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredTransactions
                  .filter((t) => t.type === "expense")
                  .reduce((sum, t) => sum + Math.abs(t.amount), 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((t) => t.type === "expense").length}{" "}
              transações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Saldo Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} transações total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle>Lista de Transações</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transações encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todas as transações"
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          Nenhuma transação encontrada
                        </p>
                        <TransactionForm
                          trigger={
                            <ActionButton size="sm" icon={Plus}>
                              Adicionar Transação
                            </ActionButton>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={
                        selectedTransactions.has(transaction.id)
                          ? "bg-muted/50"
                          : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.has(transaction.id)}
                          onCheckedChange={(checked) =>
                            handleSelectTransaction(
                              transaction.id,
                              checked as boolean,
                            )
                          }
                          aria-label={`Selecionar transação ${transaction.description}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCategoryName(transaction.category)}
                      </TableCell>
                      <TableCell>
                        {getAccountName(transaction.account)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {transaction.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {transaction.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{transaction.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            transaction.type === "income"
                              ? "text-success"
                              : "text-expense"
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
