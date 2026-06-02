import type { BankId, ImportedTransaction } from "./types";

export const SALDO_DO_DIA = "saldo do dia";

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/"/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function detectDelimiter(firstLines: string[]): ";" | "," {
  const sample = firstLines.slice(0, 5).join("\n");
  const semicolons = (sample.match(/;/g) ?? []).length;
  const commas = (sample.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function splitCsvLine(line: string, delimiter: ";" | ","): string[] {
  if (delimiter === ";") {
    return line
      .split(";")
      .map((cell) => cell.trim().replace(/^"|"$/g, ""));
  }

  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, ""));
}

export function parseBrazilianAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parses Valor column with optional sign (prefix -, suffix -, or parentheses). */
export function parseSignedBrazilianAmount(value: string): number {
  let s = value.trim();
  if (!s) return 0;

  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1).trim();
  } else if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1).trim();
  }

  const abs = parseBrazilianAmount(s);
  if (abs === 0) return 0;
  return negative ? -abs : abs;
}

export function parseDateToIso(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const ddMmYyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const day = ddMmYyyy[1].padStart(2, "0");
    const month = ddMmYyyy[2].padStart(2, "0");
    const year = ddMmYyyy[3];
    const testDate = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
    if (
      testDate.getFullYear() === parseInt(year, 10) &&
      testDate.getMonth() === parseInt(month, 10) - 1 &&
      testDate.getDate() === parseInt(day, 10)
    ) {
      return `${year}-${month}-${day}`;
    }
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;

  return null;
}

export function findColumnKey(
  row: Record<string, string>,
  matchers: string[],
): string | null {
  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    if (matchers.some((m) => normalized.includes(m))) {
      return key;
    }
  }
  return null;
}

export function isSaldoDoDiaText(...parts: string[]): boolean {
  return parts.some((p) => p.trim().toLowerCase() === SALDO_DO_DIA);
}

export function buildItauDescription(
  historico: string,
  descricao: string,
): string {
  const h = historico.trim();
  const d = descricao.trim();
  if (h && d && h !== d) return `${h} - ${d}`;
  return d || h;
}

import type { BankId, ImportedTransaction } from "./types";

export function toImportedTransaction(
  date: string,
  description: string,
  amount: number,
  meta?: {
    bank?: BankId;
    layout?: string;
    source?: string;
    balance?: number;
    category?: string;
  },
): ImportedTransaction {
  const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
  return {
    date,
    description,
    amount,
    type,
    ...meta,
  };
}
