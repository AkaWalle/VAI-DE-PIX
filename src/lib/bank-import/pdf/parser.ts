import type { BankImportResult, PdfItauVariant } from "../types";
import { detectBank } from "../detectors/bank";
import { detectLayout } from "../detectors/layout";
import { normalizeTransactions } from "../normalizers/transaction";
import { parseItauCreditDebitPdfLines } from "../parsers/itau-credit-debit.parser";
import { parseItauExtratoPdfLines } from "../itau-extrato.parser";
import { parseInterPdfText } from "../parsers/inter-pdf.parser";
import { normalizeText } from "../utils";
import { extractPdfText } from "./extract";

export function detectPdfItauVariant(text: string): PdfItauVariant {
  const norm = normalizeText(text);

  if (norm.includes("lancamentos da conta")) {
    return "lancamentos_conta";
  }

  return "extrato_conta_corrente";
}

function layoutToFormat(
  layout: string,
): BankImportResult["format"] {
  switch (layout) {
    case "lancamentos_conta":
      return "itau_credit_debit";
    case "inter_statement":
      return "inter_extrato";
    case "extrato_conta_corrente":
    case "extrato_consolidado":
      return "itau_extrato";
    default:
      return "generic_csv";
  }
}

export function parsePdfTextUniversal(text: string): BankImportResult {
  const bankDetection = detectBank(text, "pdf");
  const layoutDetection = detectLayout(text, bankDetection.bank, "pdf");
  let { bank, layout } = layoutDetection;

  let transactions;
  let pdfVariant: PdfItauVariant | undefined;

  const tryItauExtrato = () => parseItauExtratoPdfLines(text);
  const tryItauCreditDebit = () => parseItauCreditDebitPdfLines(text);
  const tryInter = () => parseInterPdfText(text);

  if (layout === "inter_statement" || bank === "inter") {
    transactions = tryInter();
    bank = "inter";
    layout = "inter_statement";
  } else if (layout === "lancamentos_conta") {
    pdfVariant = "lancamentos_conta";
    transactions = tryItauCreditDebit();
  } else {
    pdfVariant = detectPdfItauVariant(text);
    transactions = tryItauExtrato();
  }

  if (transactions.length === 0) {
    transactions = tryItauExtrato();
  }
  if (transactions.length === 0) {
    transactions = tryInter();
    if (transactions.length > 0) {
      bank = "inter";
      layout = "inter_statement";
    }
  }

  if (transactions.length === 0) {
    throw new Error("Nenhuma transação válida encontrada no PDF");
  }

  if (bank === "unknown") {
    bank =
      layout === "inter_statement"
        ? "inter"
        : pdfVariant === "lancamentos_conta" || layout === "lancamentos_conta"
          ? "itau"
          : "itau";
  }

  const resolvedLayout =
    layout === "unknown" && bank === "inter"
      ? "inter_statement"
      : layout === "unknown"
        ? "extrato_conta_corrente"
        : layout;

  return {
    source: "pdf",
    fileType: "pdf",
    bank,
    layout: resolvedLayout,
    format: layoutToFormat(resolvedLayout),
    pdfVariant,
    transactions: normalizeTransactions(transactions, {
      bank,
      layout: resolvedLayout,
      source: "pdf",
    }),
  };
}

export async function parsePdfUniversal(data: ArrayBuffer): Promise<BankImportResult> {
  const text = await extractPdfText(data);
  return parsePdfTextUniversal(text);
}

export async function parsePdfStatement(data: ArrayBuffer): Promise<BankImportResult> {
  return parsePdfUniversal(data);
}

export function parsePdfStatementText(text: string): BankImportResult {
  return parsePdfTextUniversal(text);
}

export { extractPdfText };
