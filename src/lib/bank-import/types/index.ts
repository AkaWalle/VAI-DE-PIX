import type { BankId } from "./banks";

export type { BankId };
export { BANK_LABELS } from "./banks";

export interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  source?: string;
  category?: string;
  balance?: number;
  bank?: BankId;
  layout?: string;
}

export type FileType = "csv" | "pdf" | "ofx";

export type BankImportSource = FileType;

export type BankImportFormat =
  | "itau_credit_debit"
  | "itau_extrato"
  | "converted_pdf_csv"
  | "generic_csv"
  | "inter_extrato"
  | "ofx_standard";

export type PdfItauVariant = "extrato_conta_corrente" | "lancamentos_conta";

export type BankLayout =
  | "lancamentos_conta"
  | "extrato_conta_corrente"
  | "extrato_consolidado"
  | "converted_pdf"
  | "inter_statement"
  | "ofx_standard"
  | "generic"
  | "unknown";

export interface BankImportResult {
  source: BankImportSource;
  fileType: FileType;
  bank: BankId;
  layout: BankLayout;
  format: BankImportFormat;
  pdfVariant?: PdfItauVariant;
  transactions: ImportedTransaction[];
}

export interface ImportPreview {
  bank: string;
  format: string;
  layout: string;
  fileType: string;
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  netBalance: number;
  previewRows: ImportedTransaction[];
}

export interface FileTypeDetection {
  fileType: FileType;
}

export interface BankDetection {
  bank: BankId;
  confidence: "high" | "medium" | "low";
}

export interface LayoutDetection {
  bank: BankId;
  layout: BankLayout;
}
