import type { BankImportResult, BankLayout, BankImportFormat } from "./types";
import { detectBank } from "./detectors/bank";
import { detectLayout } from "./detectors/layout";
import { detectFileType, detectFileTypeFromBuffer } from "./detectors/file-type";
import { parseUniversalCsv } from "./csv/universal.parser";
import { parseOfxContent } from "./ofx/parser";
import { normalizeTransactions } from "./normalizers/transaction";
import { detectCsvFormat } from "./detect-format";

function layoutToFormat(layout: BankLayout, fileType: "csv" | "ofx"): BankImportFormat {
  switch (layout) {
    case "lancamentos_conta":
      return "itau_credit_debit";
    case "extrato_conta_corrente":
    case "extrato_consolidado":
      return "itau_extrato";
    case "converted_pdf":
      return "converted_pdf_csv";
    case "ofx_standard":
      return "ofx_standard";
    case "inter_statement":
      return "inter_extrato";
    default:
      return fileType === "ofx" ? "ofx_standard" : "generic_csv";
  }
}

function buildCsvResult(content: string): BankImportResult {
  const bankDetection = detectBank(content, "csv");
  const layoutDetection = detectLayout(content, bankDetection.bank, "csv");
  const legacyFormat = detectCsvFormat(content);

  const transactions = parseUniversalCsv(content);

  return {
    source: "csv",
    fileType: "csv",
    bank: bankDetection.bank,
    layout: layoutDetection.layout,
    format:
      legacyFormat !== "unknown"
        ? legacyFormat
        : layoutToFormat(layoutDetection.layout, "csv"),
    pdfVariant:
      layoutDetection.layout === "lancamentos_conta"
        ? "lancamentos_conta"
        : layoutDetection.layout === "extrato_conta_corrente"
          ? "extrato_conta_corrente"
          : undefined,
    transactions,
  };
}

function buildOfxResult(content: string): BankImportResult {
  const bankDetection = detectBank(content, "ofx");
  const layoutDetection = detectLayout(content, bankDetection.bank, "ofx");
  const transactions = normalizeTransactions(parseOfxContent(content), {
    bank: bankDetection.bank,
    layout: "ofx_standard",
    source: "ofx",
  });

  if (transactions.length === 0) {
    throw new Error("Nenhuma transação válida encontrada no arquivo OFX");
  }

  return {
    source: "ofx",
    fileType: "ofx",
    bank: bankDetection.bank,
    layout: layoutDetection.layout,
    format: "ofx_standard",
    transactions,
  };
}

export type {
  ImportedTransaction,
  BankImportResult,
  ImportPreview,
  BankId,
  FileType,
} from "./types";

export { BANK_LABELS } from "./types/banks";
export { buildImportPreview, formatCurrency } from "./preview/index";
export { formatLabel, formatBankLabel } from "./detectors/format-label";
export { detectCsvFormat } from "./detect-format";
export { detectFileType, detectFileTypeFromBuffer } from "./detectors/file-type";
export { detectBank } from "./detectors/bank";
export { detectLayout } from "./detectors/layout";
export { parsePdfStatementText as parseBankImportPdfText } from "./pdf/parser";

export function parseBankImportCsv(csvText: string): BankImportResult {
  return buildCsvResult(csvText);
}

export async function parseBankImportFile(
  file: File,
): Promise<BankImportResult> {
  const { fileType } = detectFileType(file.name, undefined, file.type);

  if (fileType === "pdf") {
    const { parsePdfUniversal } = await import("./pdf/parser");
    return parsePdfUniversal(await file.arrayBuffer());
  }

  if (fileType === "ofx") {
    const text = await file.text();
    return buildOfxResult(text);
  }

  const text = await file.text();
  return buildCsvResult(text);
}

export async function parseBankImportBuffer(
  data: ArrayBuffer,
  fileName: string,
): Promise<BankImportResult> {
  const { fileType } = detectFileTypeFromBuffer(data, fileName);

  if (fileType === "pdf") {
    const { parsePdfUniversal } = await import("./pdf/parser");
    return parsePdfUniversal(data);
  }

  const text = new TextDecoder("utf-8").decode(data);

  if (fileType === "ofx") {
    return buildOfxResult(text);
  }

  return buildCsvResult(text);
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const { extractPdfText: extract } = await import("./pdf/extract");
  return extract(data);
}

export async function parsePdfStatement(
  data: ArrayBuffer,
): Promise<BankImportResult> {
  const { parsePdfUniversal } = await import("./pdf/parser");
  return parsePdfUniversal(data);
}

export function parseBankImportOfx(content: string): BankImportResult {
  return buildOfxResult(content);
}

export async function parseUniversalImport(
  input: File | { data: ArrayBuffer; fileName: string } | string,
  fileName?: string,
): Promise<BankImportResult> {
  if (input instanceof File) {
    return parseBankImportFile(input);
  }

  if (typeof input === "string") {
    const { fileType } = detectFileType(fileName ?? "import.csv", input);
    if (fileType === "ofx") return buildOfxResult(input);
    return buildCsvResult(input);
  }

  return parseBankImportBuffer(input.data, input.fileName);
}
