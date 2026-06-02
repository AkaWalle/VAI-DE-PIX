import { normalizeHeader } from "../utils";

export function detectItauCreditDebit(
  csvText: string,
  headers: string[],
  delimiter: ";" | ",",
): boolean {
  const firstLine = normalizeHeader(csvText.split(/\r?\n/)[0]?.trim() ?? "");
  if (firstLine.includes("lancamentos da conta")) return true;

  if (delimiter !== ";") return false;

  const normalizedHeaders = headers.map(normalizeHeader);
  const hasHistorico = normalizedHeaders.some((h) => h.includes("historico"));
  const hasDocto = normalizedHeaders.some(
    (h) => h === "docto." || h === "docto" || h.startsWith("docto"),
  );
  const hasCredito = normalizedHeaders.some((h) => h.includes("credito"));
  const hasDebito = normalizedHeaders.some((h) => h.includes("debito"));

  return hasHistorico && hasDocto && (hasCredito || hasDebito);
}

export function detectItauExtrato(
  csvText: string,
  headers: string[],
  delimiter: ";" | ",",
): boolean {
  const firstLine = normalizeHeader(csvText.split(/\r?\n/)[0]?.trim() ?? "");
  if (firstLine.includes("extrato conta corrente")) return true;

  if (delimiter !== ";") return false;

  const normalizedHeaders = headers.map(normalizeHeader);
  const hasDataLancamento = normalizedHeaders.some(
    (h) => h.includes("data") && h.includes("lancamento"),
  );
  const hasHistorico = normalizedHeaders.some((h) => h.includes("historico"));
  const hasDescricao = normalizedHeaders.some((h) => h.includes("descricao"));
  const hasValor = normalizedHeaders.some((h) => h === "valor");

  return hasDataLancamento && hasHistorico && hasDescricao && hasValor;
}
