import type { BankImportFormat } from "../types";
import { BANK_LABELS, type BankId } from "../types/banks";

export function formatLabel(format: BankImportFormat): string {
  switch (format) {
    case "itau_credit_debit":
      return "Itaú — Lançamentos (Crédito/Débito)";
    case "itau_extrato":
      return "Itaú — Extrato Conta Corrente";
    case "converted_pdf_csv":
      return "CSV convertido de PDF";
    case "inter_extrato":
      return "Inter — Extrato";
    case "ofx_standard":
      return "OFX padrão";
    case "generic_csv":
      return "CSV genérico";
    default:
      return format;
  }
}

export function formatBankLabel(bank: BankId): string {
  return BANK_LABELS[bank];
}
