import type { ImportedTransaction } from "../types";
import {
  parseBrazilianAmount,
  parseDateToIso,
  parseSignedBrazilianAmount,
  toImportedTransaction,
} from "../utils";

const MONTHS: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

const DATE_HEADER_RE =
  /(\d{1,2})\s+de\s+([\p{L}]+)\s+de\s+(\d{4})/iu;

const TX_LINE_RE =
  /^(.+?)\s+(-?R\$\s*[\d.,]+)\s+R\$\s*[\d.,-]+\s*$/i;

function parseInterAmount(raw: string): number {
  const cleaned = raw.replace(/R\$\s*/gi, "").trim();
  return parseSignedBrazilianAmount(cleaned);
}

function parseInterDateHeader(line: string): string | null {
  const match = line.match(DATE_HEADER_RE);
  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const monthName = match[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const month = MONTHS[monthName];
  const year = match[3];
  if (!month) return null;

  return `${year}-${month}-${day}`;
}

function isInterNoise(line: string): boolean {
  const norm = line.toLowerCase();
  return (
    line.startsWith("--") ||
    norm.includes("fale com a gente") ||
    norm.includes("saldo total") ||
    norm.includes("saldo disponivel") ||
    norm.includes("saldo bloqueado") ||
    norm.includes("solicitado em:") ||
    norm.includes("valor saldo por transacao") ||
    norm.includes("cpf/cnpj:")
  );
}

export function parseInterPdfLines(text: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  let currentDate: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isInterNoise(line)) continue;

    const dateFromHeader = parseInterDateHeader(line);
    if (dateFromHeader) {
      currentDate = dateFromHeader;
      continue;
    }

    if (line.toLowerCase().includes("saldo do dia")) continue;

    const txMatch = line.match(TX_LINE_RE);
    if (!txMatch || !currentDate) continue;

    const description = txMatch[1].trim();
    const amount = parseInterAmount(txMatch[2]);
    if (!description || amount === 0) continue;

    transactions.push(
      toImportedTransaction(currentDate, description, amount, {
        bank: "inter",
        layout: "inter_statement",
        source: "pdf",
      }),
    );
  }

  return transactions;
}

export function parseInterPdfText(text: string): ImportedTransaction[] {
  const primary = parseInterPdfLines(text);
  if (primary.length > 0) return primary;

  return parseInterPdfLines(text.replace(/\t/g, "   "));
}
