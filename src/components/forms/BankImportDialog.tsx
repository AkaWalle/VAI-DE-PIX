import { useState, useRef } from "react";
import {
  useFinancialStore,
  type SharedExpense,
  type SharedExpenseParticipant,
} from "@/stores/financial-store";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  X,
  Download,
} from "lucide-react";
import { formatCurrencyFromCents } from "@/utils/currency";

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  account?: string;
  rawData: Record<string, unknown>;
}

interface BankImportDialogProps {
  trigger?: React.ReactNode;
}

/** Sugere categoria com base em transações com descrição similar (match parcial). Retorna id da categoria mais frequente ou undefined. */
function suggestCategory(
  description: string,
  type: "income" | "expense",
  historicalTransactions: { description: string; category: string; type: string }[],
  categoryIds: string[],
): string | undefined {
  const norm = description.toLowerCase().trim();
  if (!norm) return undefined;
  const words = norm.split(/\s+/).filter((w) => w.length >= 2);
  const sameType = historicalTransactions.filter((t) => t.type === type);
  const countByCategory: Record<string, number> = {};

  for (const t of sameType) {
    const tNorm = t.description.toLowerCase().trim();
    const tWords = tNorm.split(/\s+/).filter((w) => w.length >= 2);
    const match =
      norm.includes(tNorm) ||
      tNorm.includes(norm) ||
      (words.length > 0 && tWords.some((w) => words.includes(w))) ||
      (tWords.length > 0 && words.some((w) => tWords.includes(w)));
    if (match && t.category) {
      countByCategory[t.category] = (countByCategory[t.category] ?? 0) + 1;
    }
  }

  let bestId: string | undefined;
  let bestCount = 0;
  for (const [catId, count] of Object.entries(countByCategory)) {
    if (categoryIds.includes(catId) && count > bestCount) {
      bestCount = count;
      bestId = catId;
    }
  }
  return bestId;
}

/** Encontra despesa compartilhada pendente com participante não pago cujo valor bate com o PIX (valor + opcional descrição). */
function findPixMatch(
  amountReais: number,
  _description: string,
  sharedExpenses: SharedExpense[],
): { expense: SharedExpense; participant: SharedExpenseParticipant } | null {
  const absAmount = Math.abs(amountReais);
  for (const expense of sharedExpenses) {
    if (expense.status === "cancelled") continue;
    for (const participant of expense.participants) {
      if (participant.paid) continue;
      const participantAmount = Math.abs(participant.amount ?? 0);
      if (Math.abs(participantAmount - absAmount) < 0.02) {
        return { expense, participant };
      }
    }
  }
  return null;
}

export function BankImportDialog({ trigger }: BankImportDialogProps) {
  const {
    addTransaction,
    accounts,
    categories,
    transactions,
    sharedExpenses,
    markParticipantAsPaid,
    settleSharedExpense,
  } = useFinancialStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<"auto" | "extract" | "card">(
    "auto",
  );
  const [, setDetectedType] = useState<"extract" | "card" | null>(
    null,
  );
  const [parsedTransactions, setParsedTransactions] = useState<
    ImportedTransaction[]
  >([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPixMatches, setPendingPixMatches] = useState<
    { amount: number; description: string; expense: SharedExpense; participant: SharedExpenseParticipant }[]
  >([]);
  const [showPixModal, setShowPixModal] = useState(false);

  // Templates de mapeamento para diferentes tipos de relatório
  const fieldMappings = {
    extract: {
      date: ["data", "date", "data_transacao", "data_movimento"],
      description: [
        "descricao",
        "description",
        "historico",
        "histórico",
        "descricao_detalhada",
      ],
      amount: [
        "valor",
        "amount",
        "valor_transacao",
        "valor_movimento",
        "crédito",
        "débito",
        "valor (brl)",
      ],
      type: ["tipo", "type", "natureza", "debito_credito"],
    },
    card: {
      date: ["data", "date", "data_compra", "data_transacao"],
      description: ["descricao", "description", "estabelecimento", "local"],
      amount: ["valor", "amount", "valor_compra", "valor_transacao"],
      type: ["tipo", "type", "natureza"],
    },
  };

  const detectReportType = (headers: string[]): "extract" | "card" | null => {
    const headerText = headers.join(" ").toLowerCase();

    // Indicadores de extrato bancário (incl. Itaú, Inter, Mercado Pago)
    const extractIndicators = [
      "saldo",
      "saldo_anterior",
      "data_movimento",
      "historico",
      "histórico",
      "valor_movimento",
      "data",
      "crédito",
      "débito",
      "descrição",
      "valor",
      "tipo",
      "valor (brl)",
    ];
    // Indicadores de cartão de crédito
    const cardIndicators = [
      "estabelecimento",
      "data_compra",
      "valor_compra",
      "parcelas",
      "categoria_estabelecimento",
    ];

    const extractScore = extractIndicators.filter((indicator) =>
      headerText.includes(indicator),
    ).length;

    const cardScore = cardIndicators.filter((indicator) =>
      headerText.includes(indicator),
    ).length;

    if (extractScore > cardScore && extractScore > 0) return "extract";
    if (cardScore > extractScore && cardScore > 0) return "card";

    return null;
  };

  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : ",";

    const headers = firstLine
      .split(separator)
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line
        .split(separator)
        .map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    });

    return rows;
  };

  const parseAmountFromCell = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    const s = value.toString().trim().replace(/\s/g, "");
    const normalized = s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s;
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  /** Classificação por palavras-chave na descrição. Retorna indefinido se nenhuma regra bater. */
  const classifyByDescription = (
    description: string,
  ): "income" | "expense" | "indefinido" => {
    const d = description.toLowerCase().trim();
    const receitaKeywords = [
      "salário",
      "salario",
      "recebido",
      "recebemos",
      "crédito",
      "credito",
      "rendimento",
      "ted receb",
      "doc receb",
      "pix receb",
      "depósito",
      "deposito",
      "reembolso",
      "cashback",
      "estorno",
    ];
    const despesaKeywords = [
      "compra",
      "pagto",
      "pagamento",
      "débito",
      "debito",
      "enviado",
      "transferência enviada",
      "pix enviado",
      "saque",
      "tarifa",
      "mensalidade",
      "fatura",
      "boleto",
      "qr code",
      "uber",
      "ifood",
      "amazon",
    ];
    if (receitaKeywords.some((k) => d.includes(k))) return "income";
    if (despesaKeywords.some((k) => d.includes(k))) return "expense";
    return "indefinido";
  };

  const mapTransaction = (
    row: Record<string, string>,
    type: "extract" | "card",
  ): ImportedTransaction | null => {
    const mapping = fieldMappings[type];

    // Encontrar campos por similaridade
    const findField = (fieldType: keyof typeof mapping) => {
      const possibleNames = mapping[fieldType];
      for (const name of possibleNames) {
        const foundKey = Object.keys(row).find((key) =>
          key.toLowerCase().includes(name.toLowerCase()),
        );
        if (foundKey) return foundKey;
      }
      return null;
    };

    const dateField = findField("date");
    const descriptionField = findField("description");
    let amountField = findField("amount");
    const typeField = findField("type");

    // Itaú: valor = Crédito - Débito (colunas separadas)
    const creditoKey = Object.keys(row).find(
      (k) => k.toLowerCase() === "crédito" || k.toLowerCase() === "credito",
    );
    const debitoKey = Object.keys(row).find(
      (k) => k.toLowerCase() === "débito" || k.toLowerCase() === "debito",
    );
    const useItauCreditoDebito =
      type === "extract" && creditoKey && debitoKey;

    if (!dateField || !descriptionField) {
      return null;
    }
    if (!useItauCreditoDebito && !amountField) {
      return null;
    }

    // Verificar se os campos existem no row
    if (!row[dateField] || !row[descriptionField]) {
      return null;
    }
    if (!useItauCreditoDebito && amountField && !row[amountField]) {
      return null;
    }

    // Parse da data
    let date = row[dateField];
    if (date) {
      const dateStr = date.toString().trim();

      // Tentar diferentes formatos de data
      const dateFormats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
        /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // D/M/YYYY ou DD/MM/YYYY
      ];

      let parsedDate = null;

      for (const format of dateFormats) {
        const match = dateStr.match(format);
        if (match) {
          let year, month, day;

          if (
            format.source.includes("YYYY") &&
            format.source.indexOf("YYYY") === 0
          ) {
            // YYYY-MM-DD ou YYYY/MM/DD
            year = match[1];
            month = match[2];
            day = match[3];
          } else {
            // DD/MM/YYYY ou DD-MM-YYYY
            day = match[1];
            month = match[2];
            year = match[3];
          }

          // Validar se a data é válida
          const testDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
          );
          if (
            testDate.getFullYear() == year &&
            testDate.getMonth() == month - 1 &&
            testDate.getDate() == day
          ) {
            parsedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            break;
          }
        }
      }

      // Se não conseguiu parsear, usar data atual
      if (!parsedDate) {
        const today = new Date();
        parsedDate = today.toISOString().split("T")[0];
      }

      date = parsedDate;
    } else {
      // Se não há data, usar data atual
      const today = new Date();
      date = today.toISOString().split("T")[0];
    }

    // Parse do valor
    let amount = 0;
    let credito = 0;
    let debito = 0;
    if (useItauCreditoDebito && creditoKey && debitoKey) {
      credito = parseAmountFromCell(row[creditoKey] ?? "");
      debito = parseAmountFromCell(row[debitoKey] ?? "");
      amount = credito - debito;
    } else if (amountField && row[amountField]) {
      amount = parseAmountFromCell(row[amountField]);
    }

    const description = row[descriptionField] || "Transação importada";

    // Classificação receita/despesa: prioridade 1) TIPO (reconhecido), 2) sinal do valor, 3) descrição, 4) expense
    let transactionType: "income" | "expense" = "expense";

    const isMercadoPago =
      amountField &&
      amountField.toLowerCase().includes("valor (brl)") &&
      typeField;

    if (useItauCreditoDebito) {
      // Itaú: Crédito/Débito
      if (credito > 0 && debito === 0) transactionType = "income";
      else if (debito > 0 && credito === 0) transactionType = "expense";
      else {
        const byDesc = classifyByDescription(description);
        transactionType = byDesc === "indefinido" ? "expense" : byDesc;
      }
    } else if (isMercadoPago && typeField && row[typeField]) {
      const tipoVal = row[typeField].toLowerCase().trim();
      if (
        ["pix_received", "yield", "credito", "credit"].some((k) =>
          tipoVal.includes(k),
        )
      ) {
        transactionType = "income";
      } else if (
        ["pix_sent", "qr_payment", "debito", "debit"].some((k) =>
          tipoVal.includes(k),
        )
      ) {
        transactionType = "expense";
      } else {
        if (amount !== 0) transactionType = amount > 0 ? "income" : "expense";
        else {
          const byDesc = classifyByDescription(description);
          transactionType = byDesc === "indefinido" ? "expense" : byDesc;
        }
      }
    } else if (typeField && row[typeField]) {
      const typeValue = row[typeField].toLowerCase();
      if (
        typeValue.includes("credito") ||
        typeValue.includes("crédito") ||
        typeValue.includes("receita") ||
        typeValue.includes("entrada") ||
        typeValue.includes("credit")
      ) {
        transactionType = "income";
      } else if (
        typeValue.includes("debito") ||
        typeValue.includes("débito") ||
        typeValue.includes("despesa") ||
        typeValue.includes("debit")
      ) {
        transactionType = "expense";
      } else {
        if (amount !== 0) transactionType = amount > 0 ? "income" : "expense";
        else {
          const byDesc = classifyByDescription(description);
          transactionType = byDesc === "indefinido" ? "expense" : byDesc;
        }
      }
    } else {
      if (amount !== 0) {
        transactionType = amount > 0 ? "income" : "expense";
      } else {
        const byDesc = classifyByDescription(description);
        transactionType = byDesc === "indefinido" ? "expense" : byDesc;
      }
    }

    amount = Math.abs(amount);

    return {
      date,
      description,
      amount: transactionType === "expense" ? -amount : amount,
      type: transactionType,
      rawData: row,
    };
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      setImportProgress(25);

      const rows = parseCSV(text);
      setImportProgress(50);

      if (rows.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo");
      }

      // Detectar tipo do relatório
      const headers = Object.keys(rows[0]);
      const detected = detectReportType(headers);
      setDetectedType(detected);

      setImportProgress(75);

      // Usar tipo detectado ou selecionado
      const finalType = reportType === "auto" ? detected : reportType;
      if (!finalType) {
        throw new Error(
          "Não foi possível identificar o tipo do relatório. Selecione manualmente.",
        );
      }

      // Mapear transações
      const mapped = rows
        .map((row) => mapTransaction(row, finalType))
        .filter((t): t is ImportedTransaction => t !== null);

      // Sugestão de categoria por descrição similar (editável depois)
      const withSuggestions = mapped.map((t) => ({
        ...t,
        category:
          t.category ||
          suggestCategory(
            t.description,
            t.type,
            transactions.map((h) => ({
              description: h.description,
              category: h.category,
              type: h.type,
            })),
            categories.filter((c) => c.type === t.type).map((c) => c.id),
          ),
      }));

      setImportProgress(100);
      setParsedTransactions(withSuggestions);
      setShowPreview(true);

      toast({
        title: "Arquivo processado com sucesso!",
        description: `${transactions.length} transações encontradas.`,
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
        // Usar primeira conta disponível se não especificada
        const accountId = transaction.account || accounts[0]?.id || "1";

        // Usar categoria sugerida/editada ou fallback por descrição
        let categoryId = transaction.category?.trim() || undefined;
        if (!categoryId) {
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
        }

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

      // Sugestão de quitação por PIX: receitas que batem com despesa compartilhada pendente
      const pixMatches: { amount: number; description: string; expense: SharedExpense; participant: SharedExpenseParticipant }[] = [];
      for (const tx of parsedTransactions) {
        if (tx.type !== "income") continue;
        const match = findPixMatch(Math.abs(tx.amount), tx.description, sharedExpenses);
        if (match) pixMatches.push({ amount: Math.abs(tx.amount), description: tx.description, expense: match.expense, participant: match.participant });
      }
      setPendingPixMatches(pixMatches);
      setShowPixModal(pixMatches.length > 0);

      // Resetar estado (mantemos dialog aberto se houver modais PIX)
      setSelectedFile(null);
      setParsedTransactions([]);
      setShowPreview(false);
      setShowConfirmDialog(false);
      if (pixMatches.length === 0) setIsOpen(false);
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
    setPendingPixMatches([]);
    setShowPixModal(false);
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
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Relatório Bancário
            </DialogTitle>
            <DialogDescription>
              Importe extratos bancários ou relatórios de cartão de crédito em
              formato CSV
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seleção de Arquivo */}
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

            {/* Preview das Transações */}
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
                          className="flex items-center gap-2 p-2 border rounded flex-wrap"
                        >
                          <div className="flex-1 min-w-0">
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
                            className={`font-semibold text-sm shrink-0 ${
                              transaction.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            R$ {Math.abs(transaction.amount).toFixed(2)}
                          </div>
                          <div className="w-[180px] shrink-0">
                            <Select
                              value={transaction.category || ""}
                              onValueChange={(value) =>
                                setParsedTransactions((prev) =>
                                  prev.map((t, i) =>
                                    i === index
                                      ? { ...t, category: value }
                                      : t,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Categoria (sugestão)" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter((c) => c.type === transaction.type)
                                  .map((c) => (
                                    <SelectItem
                                      key={c.id}
                                      value={c.id}
                                      className="text-xs"
                                    >
                                      {c.icon} {c.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    {parsedTransactions.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        ... e mais {parsedTransactions.length - 10} transações
                        (categoria sugerida aplicada; edite as primeiras e
                        importe)
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

      {/* Dialog de Confirmação */}
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

      {/* Modal: PIX parece ser quitação de despesa compartilhada — sempre pedir confirmação */}
      <AlertDialog open={showPixModal} onOpenChange={(open) => { if (!open) { setPendingPixMatches([]); setIsOpen(false); } setShowPixModal(open); }}>
        <AlertDialogContent>
          {pendingPixMatches[0] && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Quitar despesa compartilhada?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este PIX de {formatCurrencyFromCents(Math.round(pendingPixMatches[0].amount * 100))} parece ser
                  referente à despesa &quot;{pendingPixMatches[0].expense.title || pendingPixMatches[0].expense.description}&quot;.
                  Deseja marcar {pendingPixMatches[0].participant.userName} como pago?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setPendingPixMatches((prev) => {
                      const next = prev.slice(1);
                      if (next.length === 0) {
                        setShowPixModal(false);
                        setIsOpen(false);
                      }
                      return next;
                    });
                  }}
                >
                  Não
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const { expense, participant } = pendingPixMatches[0];
                    markParticipantAsPaid(expense.id, participant.userId);
                    const updated = useFinancialStore.getState().sharedExpenses.find((e) => e.id === expense.id);
                    if (updated?.participants.every((p) => p.paid)) settleSharedExpense(expense.id);
                    toast({ title: "Marcado como pago", description: `${participant.userName} foi marcado como pago nesta despesa.` });
                    setPendingPixMatches((prev) => {
                      const next = prev.slice(1);
                      if (next.length === 0) {
                        setShowPixModal(false);
                        setIsOpen(false);
                      }
                      return next;
                    });
                  }}
                >
                  Sim, marcar como pago
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
