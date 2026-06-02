/**
 * Bank statement CSV parsers (client-side).
 * Supports comma-separated generic exports and Itaú account extracts (;).
 * @deprecated Prefer `@/lib/bank-import` for CSV and PDF imports.
 */

import {
  parseBankImportCsv,
  type ImportedTransaction,
} from "@/lib/bank-import";

export interface ParsedBankRow extends ImportedTransaction {
  rawData: Record<string, string>;
}

export type BankReportType = "extract" | "card";

/** Itaú CSV layouts exported from internet banking */
export type ItauCsvVariant = "lancamentos_conta" | "extrato_conta_corrente";

export interface ParseBankCsvResult {
  reportType: BankReportType;
  transactions: ParsedBankRow[];
  format: "itau" | "generic";
  itauVariant?: ItauCsvVariant;
}

function mapItauVariant(
  format: string,
): ItauCsvVariant | undefined {
  if (format === "itau_credit_debit") return "lancamentos_conta";
  if (format === "itau_extrato") return "extrato_conta_corrente";
  return undefined;
}

export function detectItauVariant(
  csvText: string,
  headers: string[],
  delimiter: ";" | ",",
): ItauCsvVariant | null {
  void csvText;
  void headers;
  void delimiter;
  try {
    const result = parseBankImportCsv(csvText);
    return mapItauVariant(result.format) ?? null;
  } catch {
    return null;
  }
}

export function detectReportType(headers: string[]): BankReportType | null {
  void headers;
  return "extract";
}

/**
 * Parse bank CSV text. For PDF use `@/lib/bank-import`.
 */
export function parseBankCsv(
  csvText: string,
  reportTypeHint: "auto" | BankReportType = "auto",
): ParseBankCsvResult {
  void reportTypeHint;

  const result = parseBankImportCsv(csvText);
  const itauVariant = mapItauVariant(result.format);

  return {
    reportType: "extract",
    transactions: result.transactions.map((t) => ({
      ...t,
      rawData: {},
    })),
    format:
      result.format === "itau_credit_debit" ||
      result.format === "itau_extrato"
        ? "itau"
        : "generic",
    itauVariant,
  };
}
