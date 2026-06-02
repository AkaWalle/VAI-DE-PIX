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
  Upload,
  FileText,
  X,
  Download,
} from "lucide-react";
import {
  parseBankCsv,
  type ParsedBankRow,
  type BankReportType,
} from "@/lib/bank-csv-parser";

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
  const [reportType, setReportType] = useState<"auto" | BankReportType>("auto");
  const [, setDetectedType] = useState<BankReportType | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedBankRow[]>(
    [],
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      toast({
        title: "Formato não suportado",
        description: "Importação disponível apenas para arquivos CSV.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      setImportProgress(25);

      const result = parseBankCsv(text, reportType);
      setDetectedType(result.reportType);
      setImportProgress(100);
      setParsedTransactions(result.transactions);
      setShowPreview(true);

      const formatLabel =
        result.format === "itau" ? " (formato Itaú detectado)" : "";

      toast({
        title: "Arquivo processado com sucesso!",
        description: `${result.transactions.length} transações encontradas${formatLabel}.`,
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
    setShowPreview(false);
    setDetectedType(null);
    setReportType("auto");
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
              Importe extratos bancários ou relatórios de cartão de crédito em
              formato CSV (inclui exportação Itaú com separador ;)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Selecionar Arquivo</CardTitle>
                <CardDescription>
                  Escolha um arquivo CSV com suas transações bancárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
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

            {showPreview && parsedTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    2. Preview das Transações
                  </CardTitle>
                  <CardDescription>
                    {parsedTransactions.length} transações encontradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {parsedTransactions
                      .slice(0, 10)
                      .map((transaction, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {transaction.date} •{" "}
                              {transaction.type === "income"
                                ? "Receita"
                                : "Despesa"}
                            </div>
                          </div>
                          <div
                            className={`font-semibold text-sm ${
                              transaction.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            R$ {Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    {parsedTransactions.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        ... e mais {parsedTransactions.length - 10} transações
                      </div>
                    )}
                  </div>
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
              transações. Esta ação não pode ser desfeita. Deseja continuar?
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
