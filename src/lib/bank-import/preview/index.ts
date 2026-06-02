import type { BankImportResult, ImportPreview } from "../types";
import { BANK_LABELS } from "../types/banks";
import { formatLabel } from "../detectors/format-label";

const PREVIEW_ROW_LIMIT = 20;

export function buildImportPreview(
  result: BankImportResult | BankImportResult["transactions"],
): ImportPreview {
  const transactions = Array.isArray(result) ? result : result.transactions;
  const meta = Array.isArray(result)
    ? null
    : {
        bank: result.bank,
        layout: result.layout,
        format: result.format,
        fileType: result.fileType,
      };

  const incomes = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");
  const incomeTotal = incomes.reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    bank: meta ? BANK_LABELS[meta.bank] : "—",
    format: meta ? formatLabel(meta.format) : "—",
    layout: meta?.layout ?? "—",
    fileType: meta?.fileType?.toUpperCase() ?? "—",
    totalCount: transactions.length,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    incomeTotal,
    expenseTotal,
    netBalance: incomeTotal - expenseTotal,
    previewRows: transactions.slice(0, PREVIEW_ROW_LIMIT),
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
