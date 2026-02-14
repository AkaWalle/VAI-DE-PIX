/**
 * Fintech-safe currency e split. Produção.
 * Sem zero à esquerda, sem NaN, sem float drift (centavos inteiros).
 */

export function parseCurrencyInput(value: string): number {
  if (!value) return 0;

  let cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  const parsed = Number(cleaned);

  if (!isFinite(parsed)) return 0;
  if (parsed < 0) return 0;

  return parsed;
}

export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;

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

/**
 * Primeiro participante diferente do usuário logado. Fallback: participants[1].
 * Preparado para multi-participantes (API atual: 1 invited_email).
 */
export function getInvitedEmail(
  participants: { userEmail: string }[],
  currentUserEmail: string | undefined,
): string | null {
  const other = participants.find(
    (p) => p.userEmail && p.userEmail !== currentUserEmail,
  );
  return other?.userEmail ?? participants[1]?.userEmail ?? null;
}
