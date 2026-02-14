/**
 * Helpers de permissão para despesas compartilhadas.
 * Apenas para UX (botões/tooltips). Backend é a fonte da verdade.
 */

export function canRespondShare(userId: string, shareUserId: string): boolean {
  return userId === shareUserId;
}

export function canEditExpense(userId: string, createdBy: string): boolean {
  return userId === createdBy;
}

export function canDeleteExpense(userId: string, createdBy: string): boolean {
  return userId === createdBy;
}
