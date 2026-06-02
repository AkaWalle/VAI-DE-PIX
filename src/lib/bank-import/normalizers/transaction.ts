import type { BankId, ImportedTransaction } from "../types";

export interface TransactionMeta {
  bank?: BankId;
  layout?: string;
  source?: string;
  balance?: number;
  category?: string;
}

export function normalizeTransaction(
  tx: ImportedTransaction,
  meta: TransactionMeta,
): ImportedTransaction {
  return {
    ...tx,
    bank: tx.bank ?? meta.bank,
    layout: tx.layout ?? meta.layout,
    source: tx.source ?? meta.source,
    balance: tx.balance ?? meta.balance,
    category: tx.category ?? meta.category,
  };
}

export function normalizeTransactions(
  transactions: ImportedTransaction[],
  meta: TransactionMeta,
): ImportedTransaction[] {
  return transactions.map((tx) => normalizeTransaction(tx, meta));
}

export function enrichImportResult<T extends { transactions: ImportedTransaction[] }>(
  result: T,
  meta: TransactionMeta,
): T {
  return {
    ...result,
    transactions: normalizeTransactions(result.transactions, meta),
  };
}
