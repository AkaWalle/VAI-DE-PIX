import { normalizeHeader } from "../utils";

export type ColumnRole =
  | "date"
  | "description"
  | "amount"
  | "credit"
  | "debit"
  | "balance"
  | "historico"
  | "descricao";

const COLUMN_ALIASES: Record<ColumnRole, string[]> = {
  date: [
    "data",
    "data lancamento",
    "data lançamento",
    "dt movimento",
    "data movimento",
    "date",
    "dt lanc",
  ],
  description: [
    "descricao",
    "descrição",
    "description",
    "memo",
    "narrativa",
    "detalhe",
    "lancamento",
  ],
  historico: ["historico", "histórico", "history"],
  descricao: ["descricao complementar", "complemento"],
  amount: ["valor", "amount", "vlr", "value"],
  credit: ["credito", "crédito", "credit"],
  debit: ["debito", "débito", "debit"],
  balance: ["saldo", "balance", "saldo final"],
};

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aTokens = a.split(/\s+/);
  const bTokens = b.split(/\s+/);
  const overlap = aTokens.filter((t) => bTokens.includes(t)).length;
  return overlap / Math.max(aTokens.length, bTokens.length);
}

export function matchColumnRole(header: string): ColumnRole | null {
  const norm = normalizeHeader(header);
  let bestRole: ColumnRole | null = null;
  let bestScore = 0.6;

  for (const [role, aliases] of Object.entries(COLUMN_ALIASES) as [
    ColumnRole,
    string[],
  ][]) {
    for (const alias of aliases) {
      const aliasNorm = normalizeHeader(alias);
      const score = similarity(norm, aliasNorm);
      if (score > bestScore) {
        bestScore = score;
        bestRole = role;
      }
    }
  }

  return bestRole;
}

export function mapCsvColumns(
  headers: string[],
): Partial<Record<ColumnRole, string>> {
  const mapping: Partial<Record<ColumnRole, string>> = {};

  for (const header of headers) {
    const role = matchColumnRole(header);
    if (role && !mapping[role]) {
      mapping[role] = header;
    }
  }

  return mapping;
}

export function hasUniversalCsvColumns(
  mapping: Partial<Record<ColumnRole, string>>,
): boolean {
  const hasDate = Boolean(mapping.date);
  const hasDesc = Boolean(
    mapping.description || mapping.historico || mapping.descricao,
  );
  const hasAmount =
    Boolean(mapping.amount) ||
    Boolean(mapping.credit) ||
    Boolean(mapping.debit);

  return hasDate && hasDesc && hasAmount;
}
