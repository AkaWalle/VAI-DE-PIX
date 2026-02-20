/**
 * Camada monetária segura — padrão financeiro (pt-BR).
 *
 * Regras do projeto:
 * - Estado/armazenamento: sempre em CENTAVOS (integer). Nunca string, nunca float para valor monetário.
 * - Inputs: usar somente CurrencyInput (value/onChange em centavos). Nunca input type="number" para moeda.
 * - Exibição: formatCurrencyFromCents(cents) para valores em centavos.
 * - APIs que ainda esperam reais (float): converter no ponto de chamada (cents / 100).
 */

/** Máximo de casas decimais (centavos). */
const DECIMAL_PLACES = 2;

/** Multiplicador para conversão reais ↔ centavos. */
const CENTS_FACTOR = 100;

/**
 * Parseia string no formato pt-BR para valor numérico (reais).
 * Regra: vírgula = decimal, ponto = milhar. Sem replace(/\D/g) inseguro.
 *
 * Exemplos:
 * - "10,00" → 10
 * - "9.000,00" → 9000
 * - "1.234,56" → 1234.56
 * - "R$ 100,50" → 100.5
 */
export function parseBrazilianCurrency(value: string): number {
  if (value == null || typeof value !== "string") return 0;
  const trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return 0;

  // Remove prefixo R$
  const withoutSymbol = trimmed.replace(/^r\$\s*/i, "").trim();
  if (!withoutSymbol) return 0;

  // Mantém apenas dígitos, vírgula e ponto
  const cleaned = withoutSymbol.replace(/[^\d,.]/g, "");
  if (!cleaned) return 0;

  let normalized: string;

  if (cleaned.includes(",")) {
    // pt-BR: vírgula = decimal, ponto = milhar → remove pontos e troca vírgula por ponto
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    // Um único ponto com 1 ou 2 dígitos após = decimal (ex: 10.50)
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = cleaned;
    } else {
      // Vários pontos = milhar (ex: 1.234.567)
      normalized = parts.join("");
    }
  } else {
    normalized = cleaned;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return roundToTwoDecimals(parsed);
}

/**
 * Arredonda para 2 casas decimais (evita drift de float).
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * CENTS_FACTOR) / CENTS_FACTOR;
}

/**
 * Formata valor (reais) para exibição em pt-BR (somente visual).
 * Não usar para enviar ao backend.
 */
export function formatBrazilianCurrency(
  value: number,
  options?: { showSymbol?: boolean },
): string {
  const { showSymbol = true } = options ?? {};
  if (!Number.isFinite(value)) return showSymbol ? "R$ 0,00" : "0,00";
  const fixed = roundToTwoDecimals(value).toFixed(DECIMAL_PLACES);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted = `${withThousands},${decPart}`;
  return showSymbol ? `R$ ${formatted}` : formatted;
}

/** Converte reais para centavos (int). Uso em splits e comparações exatas. */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * CENTS_FACTOR);
}

/** Converte centavos para reais. */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / CENTS_FACTOR;
}

/**
 * Formata valor em centavos para exibição em pt-BR (R$ 0,00).
 * Usar sempre que o valor vier do backend em centavos.
 */
export function formatCurrencyFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return (0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (cents / CENTS_FACTOR).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * @deprecated Use parseBrazilianCurrency. Mantido para compatibilidade durante migração.
 */
export function parseCurrencyInput(value: string): number {
  return parseBrazilianCurrency(value);
}

/**
 * Valida e retorna valor em reais para envio à API (sempre número, 2 decimais).
 * @deprecated Para envelopes use centavos (toCents) e envie inteiro.
 */
export function toApiAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundToTwoDecimals(value);
}

/**
 * Valida e retorna valor em centavos (integer) para envio à API de envelopes.
 * Garante: number, não NaN, não negativo.
 */
export function toCentsSafe(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * CENTS_FACTOR);
}

export function calculateSplit(
  total: number,
  participants: { amount: number }[],
): { totalSplit: number; difference: number; isValid: boolean } {
  const totalCents = toCents(total);
  const splitCents = participants.reduce(
    (acc, p) => acc + toCents(p.amount),
    0,
  );
  const diffCents = totalCents - splitCents;
  return {
    totalSplit: fromCents(splitCents),
    difference: fromCents(diffCents),
    isValid: diffCents === 0,
  };
}

export function getInvitedEmail(
  participants: { userEmail: string }[],
  currentUserEmail: string | undefined,
): string | null {
  const other = participants.find(
    (p) => p.userEmail && p.userEmail !== currentUserEmail,
  );
  return other?.userEmail ?? participants[1]?.userEmail ?? null;
}
