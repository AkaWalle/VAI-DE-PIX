import type { ImportedTransaction } from "./types";
import {
  buildItauDescription,
  findColumnKey,
  isSaldoDoDiaText,
  normalizeHeader,
  parseDateToIso,
  parseSignedBrazilianAmount,
  toImportedTransaction,
} from "./utils";

function findValorColumnKey(row: Record<string, string>): string | null {
  for (const key of Object.keys(row)) {
    if (normalizeHeader(key) === "valor") return key;
  }
  return findColumnKey(row, ["valor"]);
}

export function parseItauExtratoRows(
  rows: Record<string, string>[],
): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  for (const row of rows) {
    const dateKey =
      findColumnKey(row, ["data lancamento"]) ?? findColumnKey(row, ["data"]);
    const histKey = findColumnKey(row, ["historico"]);
    const descKey = findColumnKey(row, ["descricao"]);
    const valorKey = findValorColumnKey(row);

    if (!dateKey || !valorKey) continue;

    const historico = histKey ? (row[histKey] ?? "").trim() : "";
    const descricao = descKey ? (row[descKey] ?? "").trim() : "";
    if (isSaldoDoDiaText(historico, descricao)) continue;

    const description = buildItauDescription(historico, descricao);
    if (!description) continue;

    const signed = parseSignedBrazilianAmount(row[valorKey] ?? "");
    if (signed === 0) continue;

    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push(toImportedTransaction(date, description, signed));
  }

  return transactions;
}

const PDF_EXTRATO_LINE_RE =
  /^(\d{2}\/\d{2}\/\d{4})\s+(.+)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

function isPdfNoiseLine(line: string): boolean {
  const norm = line.toLowerCase();
  return (
    line.startsWith("--") ||
    norm.includes("aviso!") ||
    norm.includes("consultas, informacoes") ||
    norm.includes("data lancamentos valor") ||
    norm.includes("extrato conta / lancamentos") ||
    norm.includes("periodo de visualizacao") ||
    norm.includes("saldo em conta") ||
    /^\d{3}\.\d{3}\.\d{3}-\d{2}/.test(line)
  );
}

/** PDF Extrato Conta Corrente / lançamentos com coluna Valor assinada. */
export function parseItauExtratoPdfLines(text: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isPdfNoiseLine(line)) continue;

    const match = line.match(PDF_EXTRATO_LINE_RE);
    if (!match) continue;

    const [, dateStr, description, amountStr] = match;
    if (isSaldoDoDiaText(description)) continue;

    const amount = parseSignedBrazilianAmount(amountStr);
    if (amount === 0) continue;

    const date =
      parseDateToIso(dateStr) ?? new Date().toISOString().split("T")[0];

    transactions.push(
      toImportedTransaction(date, description.trim(), amount),
    );
  }

  return transactions;
}
