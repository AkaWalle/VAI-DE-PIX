import type { ImportedTransaction } from "./types";
import {
  buildItauDescription,
  findColumnKey,
  isSaldoDoDiaText,
  parseBrazilianAmount,
  parseDateToIso,
  toImportedTransaction,
} from "./utils";

export function parseItauCreditDebitRows(
  rows: Record<string, string>[],
): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  for (const row of rows) {
    const dateKey = findColumnKey(row, ["data"]);
    const descKey = findColumnKey(row, ["historico"]);
    const creditKey = findColumnKey(row, ["credito"]);
    const debitKey = findColumnKey(row, ["debito"]);

    if (!dateKey || !descKey) continue;

    const description = (row[descKey] ?? "").trim();
    if (!description || isSaldoDoDiaText(description)) continue;

    const creditRaw = creditKey ? (row[creditKey] ?? "") : "";
    const debitRaw = debitKey ? (row[debitKey] ?? "") : "";
    if (!creditRaw.trim() && !debitRaw.trim()) continue;

    const credit = parseBrazilianAmount(creditRaw);
    const debit = parseBrazilianAmount(debitRaw);

    let amount = 0;
    if (credit > 0) {
      amount = credit;
    } else if (debit > 0) {
      amount = -debit;
    } else {
      continue;
    }

    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push(toImportedTransaction(date, description, amount));
  }

  return transactions;
}

/** PDF Lançamentos da Conta: linhas com colunas crédito/débito no texto. */
export function parseItauCreditDebitPdfLines(
  text: string,
): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  const creditDebitLineRe =
    /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})?\s+(\d{1,3}(?:\.\d{3})*,\d{2})?\s*$/;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(creditDebitLineRe);
    if (!match) continue;

    const [, dateStr, description, creditRaw, debitRaw] = match;
    if (isSaldoDoDiaText(description)) continue;

    const credit = parseBrazilianAmount(creditRaw ?? "");
    const debit = parseBrazilianAmount(debitRaw ?? "");
    if (credit === 0 && debit === 0) continue;

    const amount = credit > 0 ? credit : -debit;
    const date =
      parseDateToIso(dateStr) ?? new Date().toISOString().split("T")[0];

    transactions.push(toImportedTransaction(date, description.trim(), amount));
  }

  return transactions;
}

export function buildItauCreditDebitDescription(
  historico: string,
  descricao: string,
): string {
  return buildItauDescription(historico, descricao);
}
