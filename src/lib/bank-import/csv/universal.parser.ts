import type { BankId, BankLayout, ImportedTransaction } from "../types";
import { parseCsvRows } from "../csv-utils";
import { parseConvertedPdfRows } from "../parsers/converted-pdf.parser";
import { parseItauCreditDebitRows } from "../parsers/itau-credit-debit.parser";
import { parseItauExtratoRows } from "../parsers/itau-extrato.parser";
import { normalizeTransactions } from "../normalizers/transaction";
import {
  buildItauDescription,
  detectDelimiter,
  findColumnKey,
  isSaldoDoDiaText,
  parseBrazilianAmount,
  parseDateToIso,
  parseSignedBrazilianAmount,
  toImportedTransaction,
} from "../utils";
import { detectLayout } from "../detectors/layout";
import { detectBank } from "../detectors/bank";
import { hasUniversalCsvColumns, mapCsvColumns } from "./column-dictionary";

function parseUniversalRows(
  rows: Record<string, string>[],
  headers: string[],
  bank: BankId,
  layout: BankLayout,
): ImportedTransaction[] {
  const mapping = mapCsvColumns(headers);
  const transactions: ImportedTransaction[] = [];

  for (const row of rows) {
    const dateKey = mapping.date ?? findColumnKey(row, ["data"]);
    const histKey = mapping.historico ?? findColumnKey(row, ["historico"]);
    const descKey =
      mapping.description ??
      mapping.descricao ??
      findColumnKey(row, ["descricao", "description", "memo"]);
    const valorKey = mapping.amount ?? findColumnKey(row, ["valor", "amount"]);
    const creditKey = mapping.credit ?? findColumnKey(row, ["credito"]);
    const debitKey = mapping.debit ?? findColumnKey(row, ["debito"]);
    const balanceKey = mapping.balance ?? findColumnKey(row, ["saldo"]);

    if (!dateKey) continue;

    const historico = histKey ? (row[histKey] ?? "").trim() : "";
    const descricao = descKey ? (row[descKey] ?? "").trim() : "";
    if (isSaldoDoDiaText(historico, descricao)) continue;

    let description = buildItauDescription(historico, descricao);
    if (!description && descricao) description = descricao;
    if (!description && historico) description = historico;
    if (!description) continue;

    let amount = 0;
    if (valorKey && row[valorKey]?.trim()) {
      amount = parseSignedBrazilianAmount(row[valorKey]);
    } else {
      const credit = creditKey ? parseBrazilianAmount(row[creditKey] ?? "") : 0;
      const debit = debitKey ? parseBrazilianAmount(row[debitKey] ?? "") : 0;
      if (credit > 0) amount = credit;
      else if (debit > 0) amount = -debit;
      else continue;
    }

    if (amount === 0) continue;

    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    const balanceRaw = balanceKey ? row[balanceKey] : undefined;
    const balance = balanceRaw
      ? parseSignedBrazilianAmount(balanceRaw)
      : undefined;

    transactions.push(
      toImportedTransaction(date, description, amount, {
        bank,
        layout,
        source: "csv",
        balance,
      }),
    );
  }

  return transactions;
}

export function parseUniversalCsv(content: string): ImportedTransaction[] {
  const bankDetection = detectBank(content, "csv");
  const layoutDetection = detectLayout(content, bankDetection.bank, "csv");
  const rawLines = content.split(/\r?\n/).filter((l) => l.trim());
  const delimiter = detectDelimiter(rawLines);
  const { headers, rows } = parseCsvRows(content, delimiter);

  if (rows.length === 0) {
    throw new Error("Nenhuma transação encontrada no arquivo");
  }

  const { layout } = layoutDetection;
  const bank = bankDetection.bank;

  if (layout === "lancamentos_conta") {
    return normalizeTransactions(parseItauCreditDebitRows(rows), {
      bank: bank === "generic" ? "itau" : bank,
      layout,
      source: "csv",
    });
  }

  if (layout === "extrato_conta_corrente") {
    return normalizeTransactions(parseItauExtratoRows(rows), {
      bank,
      layout,
      source: "csv",
    });
  }

  if (layout === "converted_pdf") {
    return normalizeTransactions(parseConvertedPdfRows(rows), {
      bank,
      layout,
      source: "csv",
    });
  }

  const mapping = mapCsvColumns(headers);
  if (hasUniversalCsvColumns(mapping)) {
    return parseUniversalRows(rows, headers, bank, layout);
  }

  throw new Error(
    "Não foi possível identificar o formato do CSV. Formatos suportados: Itaú, Inter, CSV convertido ou layout genérico com colunas Data/Descrição/Valor.",
  );
}
