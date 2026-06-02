import type { ImportedTransaction } from "../types";
import { parseDateToIso, parseSignedBrazilianAmount, toImportedTransaction } from "../utils";

interface OfxFieldMap {
  [key: string]: string;
}

function parseOfxDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length >= 8) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    return parseDateToIso(`${d}/${m}/${y}`);
  }
  return null;
}

function parseOfxBlocks(content: string): OfxFieldMap[] {
  const transactions: OfxFieldMap[] = [];
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(content)) !== null) {
    const block = match[1];
    const fields: OfxFieldMap = {};
    const fieldRe = /<(\w+)>([^<\r\n]+)/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRe.exec(block)) !== null) {
      fields[fieldMatch[1].toUpperCase()] = fieldMatch[2].trim();
    }

    if (fields.TRNAMT) transactions.push(fields);
  }

  return transactions;
}

export function parseOfxContent(content: string): ImportedTransaction[] {
  const blocks = parseOfxBlocks(content);
  const transactions: ImportedTransaction[] = [];

  for (const block of blocks) {
    const amount = parseFloat(block.TRNAMT.replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) continue;

    const memo = block.MEMO ?? "";
    const name = block.NAME ?? "";
    const description = [memo, name].filter(Boolean).join(" — ") || "Transação OFX";
    const date =
      parseOfxDate(block.DTPOSTED ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push(
      toImportedTransaction(date, description, amount, {
        source: "ofx",
        layout: "ofx_standard",
      }),
    );
  }

  return transactions;
}

export function countOfxTransactions(content: string): number {
  return (content.match(/<STMTTRN>/gi) ?? []).length;
}
