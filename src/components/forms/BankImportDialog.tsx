import { useState, useRef } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  List,
} from "lucide-react";
import {
  parseBankImportFile,
  buildImportPreview,
  formatCurrency,
  formatLabel,
  type ImportedTransaction,
  type BankImportResult,
  type ImportPreview,
} from "@/lib/bank-import";

interface BankImportDialogProps {
  trigger?: React.ReactNode;
}

export function BankImportDialog({ trigger }: BankImportDialogProps) {
  const { addTransaction, accounts, categories } = useFinancialStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BankImportResult | null>(
    null,
  );
  const [parsedTransactions, setParsedTransactions] = useState<
    ImportedTransaction[]
  >([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith(".csv") &&
      !lowerName.endsWith(".pdf") &&
      !lowerName.endsWith(".ofx") &&
      !lowerName.endsWith(".txt")
    ) {
      toast({
        title: "Formato não suportado",
        description: "Importação disponível para arquivos CSV, PDF ou OFX.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsImporting(true);
    setImportProgress(0);

    try {
      setImportProgress(25);
      const result = await parseBankImportFile(file);
      setImportProgress(100);
      setImportResult(result);
      setParsedTransactions(result.transactions);
      setPreview(buildImportPreview(result));
      setShowPreview(true);

      toast({
        title: "Arquivo processado com sucesso!",
        description: `${result.transactions.length} transações encontradas — ${formatLabel(result.format)}.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (parsedTransactions.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      let imported = 0;
      const total = parsedTransactions.length;

      for (const transaction of parsedTransactions) {
        const accountId = accounts[0]?.id || "1";

        let categoryId: string | undefined;
        const description = transaction.description.toLowerCase();
        const category = categories.find(
          (c) =>
            c.type === transaction.type &&
            (description.includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(description.split(" ")[0])),
        );
        categoryId =
          category?.id ||
          categories.find((c) => c.type === transaction.type)?.id ||
          "4";

        addTransaction({
          date: transaction.date,
          account: accountId,
          category: categoryId,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          tags: ["importado", "banco"],
        });

        imported++;
        setImportProgress((imported / total) * 100);
      }

      toast({
        title: "Importação concluída!",
        description: `${imported} transações importadas com sucesso.`,
      });

      setSelectedFile(null);
      setParsedTransactions([]);
      setImportResult(null);
      setPreview(null);
      setShowPreview(false);
      setShowConfirmDialog(false);
      setIsOpen(false);
    } catch {
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar as transações.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setParsedTransactions([]);
    setImportResult(null);
    setPreview(null);
    setShowPreview(false);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar Relatório
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Relatório Bancário
            </DialogTitle>
            <DialogDescription>
              Importe extratos bancários em CSV, PDF ou OFX — detecção automática
              de banco e layout (Itaú, Inter e outros)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Selecionar Arquivo</CardTitle>
                <CardDescription>
                  Escolha um arquivo CSV, PDF ou OFX com suas transações bancárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.pdf,.ofx,.txt"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                      className="flex-1"
                    />
                    {selectedFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setImportResult(null);
                          setPreview(null);
                          setParsedTransactions([]);
                          setShowPreview(false);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = "/examples/extrato-bancario-exemplo.csv";
                        link.download = "extrato-bancario-exemplo.csv";
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exemplo Extrato
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = "/examples/cartao-credito-exemplo.csv";
                        link.download = "cartao-credito-exemplo.csv";
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exemplo Cartão
                    </Button>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name} (
                      {(selectedFile.size / 1024).toFixed(1)} KB)
                      {importResult && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {formatLabel(importResult.format)} •{" "}
                          {importResult.source.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Processando arquivo...</span>
                        <span>{importProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={importProgress} className="h-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {showPreview && preview && parsedTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    2. Preview da Importação
                  </CardTitle>
                  <CardDescription>
                    Revise os lançamentos antes de confirmar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="rounded border px-3 py-2">
                      <span className="text-muted-foreground">Banco: </span>
                      <span className="font-medium">{preview.bank}</span>
                    </div>
                    <div className="rounded border px-3 py-2">
                      <span className="text-muted-foreground">Formato: </span>
                      <span className="font-medium">{preview.fileType}</span>
                    </div>
                    <div className="rounded border px-3 py-2 md:col-span-2">
                      <span className="text-muted-foreground">Layout: </span>
                      <span className="font-medium">{preview.format}</span>
                      <span className="text-muted-foreground"> ({preview.layout})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <List className="h-3 w-3" />
                        Lançamentos
                      </div>
                      <div className="text-2xl font-bold">
                        {preview.totalCount}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Receitas ({preview.incomeCount})
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        {formatCurrency(preview.incomeTotal)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-red-600 text-xs mb-1">
                        <TrendingDown className="h-3 w-3" />
                        Despesas ({preview.expenseCount})
                      </div>
                      <div className="text-lg font-semibold text-red-600">
                        {formatCurrency(preview.expenseTotal)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground text-xs mb-1">
                        Saldo líquido
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          preview.netBalance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(preview.netBalance)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28">Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-24 text-right">Tipo</TableHead>
                          <TableHead className="w-32 text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.previewRows.map((transaction, index) => (
                          <TableRow key={`${transaction.date}-${index}`}>
                            <TableCell className="text-xs">
                              {transaction.date}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {transaction.type === "income"
                                ? "Receita"
                                : "Despesa"}
                            </TableCell>
                            <TableCell
                              className={`text-sm text-right font-medium ${
                                transaction.type === "income"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(Math.abs(transaction.amount))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {preview.totalCount > preview.previewRows.length && (
                    <p className="text-center text-sm text-muted-foreground">
                      Exibindo {preview.previewRows.length} de{" "}
                      {preview.totalCount} lançamentos
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            {parsedTransactions.length > 0 && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isImporting}
              >
                {isImporting
                  ? "Importando..."
                  : `Importar ${parsedTransactions.length} Transações`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a importar {parsedTransactions.length}{" "}
              transações
              {preview && (
                <>
                  {" "}
                  ({preview.incomeCount} receitas, {preview.expenseCount}{" "}
                  despesas)
                </>
              )}
              . Esta ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>
              Sim, Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
