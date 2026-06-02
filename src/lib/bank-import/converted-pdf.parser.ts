import type { ImportedTransaction } from "./types";
import {
  findColumnKey,
  parseDateToIso,
  parseSignedBrazilianAmount,
  toImportedTransaction,
} from "./utils";

export function isConvertedPdfCsv(headers: string[]): boolean {
  const normalized = headers.map((h) =>
    h
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );

  const hasData = normalized.some((h) => h === "data");
  const hasDescricao = normalized.some((h) => h === "descricao");
  const hasValor = normalized.some((h) => h === "valor");
  const hasHistorico = normalized.some((h) => h.includes("historico"));
  const hasCreditoDebito =
    normalized.some((h) => h.includes("credito")) ||
    normalized.some((h) => h.includes("debito"));

  return hasData && hasDescricao && hasValor && !hasHistorico && !hasCreditoDebito;
}

export function parseConvertedPdfRows(
  rows: Record<string, string>[],
): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  for (const row of rows) {
    const dateKey = findColumnKey(row, ["data"]);
    const descKey = findColumnKey(row, ["descricao"]);
    const valorKey = findColumnKey(row, ["valor"]);

    if (!dateKey || !descKey || !valorKey) continue;

    const description = (row[descKey] ?? "").trim();
    if (!description) continue;

    const amount = parseSignedBrazilianAmount(row[valorKey] ?? "");
    if (amount === 0) continue;

    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push(toImportedTransaction(date, description, amount));
  }

  return transactions;
}
