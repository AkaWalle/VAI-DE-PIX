export type BankId =
  | "itau"
  | "inter"
  | "nubank"
  | "bradesco"
  | "santander"
  | "caixa"
  | "bb"
  | "sicredi"
  | "sicoob"
  | "btg"
  | "c6"
  | "original"
  | "xp"
  | "generic"
  | "unknown";

export const BANK_LABELS: Record<BankId, string> = {
  itau: "Itaú",
  inter: "Inter",
  nubank: "Nubank",
  bradesco: "Bradesco",
  santander: "Santander",
  caixa: "Caixa Econômica",
  bb: "Banco do Brasil",
  sicredi: "Sicredi",
  sicoob: "Sicoob",
  btg: "BTG Pactual",
  c6: "C6 Bank",
  original: "Original",
  xp: "XP Investimentos",
  generic: "Genérico",
  unknown: "Não identificado",
};
