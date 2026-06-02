import type { BankId, BankLayout, FileType, LayoutDetection } from "../types";
import { parseCsvRows } from "../csv-utils";
import { isConvertedPdfCsv } from "../parsers/converted-pdf.parser";
import { detectDelimiter, normalizeHeader, normalizeText } from "../utils";
import {
  detectItauCreditDebit,
  detectItauExtrato,
} from "./csv-layout-helpers";

function withBank(bank: BankId, layout: BankLayout): LayoutDetection {
  return { bank, layout };
}

export function detectLayout(
  content: string,
  bank: BankId,
  fileType: FileType,
): LayoutDetection {
  const norm = normalizeText(content.slice(0, 5000));

  if (fileType === "ofx") {
    return withBank(bank, "ofx_standard");
  }

  if (fileType === "pdf") {
    if (norm.includes("lancamentos da conta")) {
      return withBank(bank === "generic" || bank === "unknown" ? "itau" : bank, "lancamentos_conta");
    }
    if (
      norm.includes("extrato conta corrente") ||
      norm.includes("extrato conta / lancamentos") ||
      norm.includes("data lancamentos valor")
    ) {
      return withBank(bank, "extrato_conta_corrente");
    }
    if (norm.includes("extrato consolidado")) {
      return withBank(bank, "extrato_consolidado");
    }
    if (bank === "inter" || norm.includes("instituicao: banco inter")) {
      return withBank("inter", "inter_statement");
    }
    return withBank(bank, "unknown");
  }

  const rawLines = content.split(/\r?\n/).filter((l) => l.trim());
  const delimiter = detectDelimiter(rawLines);
  const { headers } = parseCsvRows(content, delimiter);
  const headerNorm = headers.map(normalizeHeader).join(" ");

  if (headers.length > 0 && isConvertedPdfCsv(headers)) {
    return withBank(bank, "converted_pdf");
  }

  const firstLine = normalizeHeader(content.split(/\r?\n/)[0]?.trim() ?? "");
  if (firstLine.includes("lancamentos da conta")) {
    return withBank("itau", "lancamentos_conta");
  }
  if (firstLine.includes("extrato conta corrente")) {
    return withBank(bank, "extrato_conta_corrente");
  }
  if (detectItauCreditDebit(content, headers, delimiter)) {
    return withBank(bank === "generic" || bank === "unknown" ? "itau" : bank, "lancamentos_conta");
  }
  if (detectItauExtrato(content, headers, delimiter)) {
    return withBank(bank, "extrato_conta_corrente");
  }

  if (headerNorm.includes("data") && headerNorm.includes("valor")) {
    return withBank(bank, "generic");
  }

  return withBank(bank, "unknown");
}
