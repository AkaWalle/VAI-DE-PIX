import type { BankImportFormat } from "../types";
import { parseCsvRows } from "../csv-utils";
import { isConvertedPdfCsv } from "../parsers/converted-pdf.parser";
import { detectDelimiter } from "../utils";
import {
  detectItauCreditDebit,
  detectItauExtrato,
} from "./csv-layout-helpers";

export type CsvDetectedFormat =
  | "itau_credit_debit"
  | "itau_extrato"
  | "converted_pdf_csv"
  | "unknown";

export function detectCsvFormat(csvText: string): CsvDetectedFormat {
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const delimiter = detectDelimiter(rawLines);
  const { headers } = parseCsvRows(csvText, delimiter);

  if (headers.length === 0) return "unknown";

  if (isConvertedPdfCsv(headers)) return "converted_pdf_csv";
  if (detectItauCreditDebit(csvText, headers, delimiter)) {
    return "itau_credit_debit";
  }
  if (detectItauExtrato(csvText, headers, delimiter)) return "itau_extrato";

  return "unknown";
}

export function detectPdfFormat(text: string): BankImportFormat {
  const norm = text.toLowerCase();
  if (norm.includes("lancamentos da conta")) return "itau_credit_debit";
  if (norm.includes("banco inter")) return "inter_extrato";
  return "itau_extrato";
}
