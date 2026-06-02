/**
 * Bank statement CSV parsers (client-side).
 * Supports comma-separated generic exports and Itaú account extracts (;).
 */

export interface ParsedBankRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  rawData: Record<string, string>;
}

export type BankReportType = "extract" | "card";

/** Itaú CSV layouts exported from internet banking */
export type ItauCsvVariant = "lancamentos_conta" | "extrato_conta_corrente";

export interface ParseBankCsvResult {
  reportType: BankReportType;
  transactions: ParsedBankRow[];
  format: "itau" | "generic";
  itauVariant?: ItauCsvVariant;
}

const SALDO_DO_DIA = "saldo do dia";

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/"/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectDelimiter(firstLines: string[]): ";" | "," {
  const sample = firstLines.slice(0, 3).join("\n");
  const semicolons = (sample.match(/;/g) ?? []).length;
  const commas = (sample.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: ";" | ","): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function findCsvHeaderLineIndex(
  lines: string[],
  delimiter: ";" | ",",
): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const norm = normalizeHeader(line);

    if (norm.includes("lancamentos da conta")) {
      if (i + 1 < lines.length && lines[i + 1].includes(delimiter)) {
        return i + 1;
      }
      continue;
    }

    if (norm.includes("extrato conta corrente")) {
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].includes(delimiter)) continue;
        const headerNorm = normalizeHeader(lines[j]);
        if (
          headerNorm.includes("data") &&
          headerNorm.includes("valor") &&
          headerNorm.includes("historico")
        ) {
          return j;
        }
      }
      continue;
    }

    if (!line.includes(delimiter)) continue;

    if (
      norm.includes("data") &&
      norm.includes("historico") &&
      (norm.includes("credito") ||
        norm.includes("debito") ||
        norm.includes("valor"))
    ) {
      return i;
    }
  }

  const fallback = lines.findIndex((l) => l.includes(delimiter));
  return fallback >= 0 ? fallback : 0;
}

function parseCsvRows(
  csvText: string,
  delimiter: ";" | ",",
): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headerLineIndex = findCsvHeaderLineIndex(lines, delimiter);
  const headerLine = lines[headerLineIndex];
  const headers = splitCsvLine(headerLine, delimiter);
  const dataLines = lines.slice(headerLineIndex + 1);

  const rows = dataLines.map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

export function detectItauVariant(
  csvText: string,
  headers: string[],
  delimiter: ";" | ",",
): ItauCsvVariant | null {
  const firstLine = normalizeHeader(csvText.split(/\r?\n/)[0]?.trim() ?? "");
  const normalizedHeaders = headers.map(normalizeHeader);

  if (firstLine.includes("lancamentos da conta")) {
    return "lancamentos_conta";
  }
  if (firstLine.includes("extrato conta corrente")) {
    return "extrato_conta_corrente";
  }

  if (delimiter !== ";") {
    return null;
  }

  const hasHistorico = normalizedHeaders.some((h) => h.includes("historico"));
  const hasDocto = normalizedHeaders.some(
    (h) => h === "docto." || h === "docto" || h.startsWith("docto"),
  );
  const hasCredito = normalizedHeaders.some((h) => h.includes("credito"));
  const hasDebito = normalizedHeaders.some((h) => h.includes("debito"));

  if (hasHistorico && hasDocto && (hasCredito || hasDebito)) {
    return "lancamentos_conta";
  }

  const hasDataLancamento = normalizedHeaders.some(
    (h) => h.includes("data") && h.includes("lancamento"),
  );
  const hasDescricao = normalizedHeaders.some((h) => h.includes("descricao"));
  const hasValor = normalizedHeaders.some((h) => h === "valor");

  if (hasDataLancamento && hasHistorico && hasDescricao && hasValor) {
    return "extrato_conta_corrente";
  }

  return null;
}

function isItauFormat(
  csvText: string,
  headers: string[],
  delimiter: ";" | ",",
): boolean {
  return detectItauVariant(csvText, headers, delimiter) !== null;
}

function parseBrazilianAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parses Valor column with optional sign (prefix -, suffix -, or parentheses). */
function parseSignedBrazilianAmount(value: string): number {
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

function parseDateToIso(dateStr: string): string | null {
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

function findColumnKey(
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

function findValorColumnKey(row: Record<string, string>): string | null {
  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    if (normalized === "valor") return key;
  }
  return findColumnKey(row, ["valor"]);
}

function isSaldoDoDiaText(...parts: string[]): boolean {
  return parts.some((p) => p.trim().toLowerCase() === SALDO_DO_DIA);
}

function buildItauDescription(
  historico: string,
  descricao: string,
): string {
  const h = historico.trim();
  const d = descricao.trim();
  if (h && d && h !== d) return `${h} - ${d}`;
  return d || h;
}

function parseItauLancamentosRows(rows: Record<string, string>[]): ParsedBankRow[] {
  const transactions: ParsedBankRow[] = [];

  for (const row of rows) {
    const dateKey = findColumnKey(row, ["data"]);
    const descKey = findColumnKey(row, ["historico"]);
    const creditKey = findColumnKey(row, ["credito"]);
    const debitKey = findColumnKey(row, ["debito"]);

    if (!dateKey || !descKey) continue;

    const description = (row[descKey] ?? "").trim();
    if (!description) continue;
    if (description.toLowerCase() === SALDO_DO_DIA) continue;

    const creditRaw = creditKey ? row[creditKey] ?? "" : "";
    const debitRaw = debitKey ? row[debitKey] ?? "" : "";
    if (!creditRaw.trim() && !debitRaw.trim()) continue;

    const credit = parseBrazilianAmount(creditRaw);
    const debit = parseBrazilianAmount(debitRaw);

    let amount = 0;
    let type: "income" | "expense" = "expense";

    if (credit > 0) {
      amount = credit;
      type = "income";
    } else if (debit > 0) {
      amount = -debit;
      type = "expense";
    } else {
      continue;
    }

    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push({
      date,
      description,
      amount,
      type,
      rawData: row,
    });
  }

  return transactions;
}

function parseItauExtratoContaCorrenteRows(
  rows: Record<string, string>[],
): ParsedBankRow[] {
  const transactions: ParsedBankRow[] = [];

  for (const row of rows) {
    const dateKey =
      findColumnKey(row, ["data lancamento"]) ?? findColumnKey(row, ["data"]);
    const histKey = findColumnKey(row, ["historico"]);
    const descKey = findColumnKey(row, ["descricao"]);
    const valorKey = findValorColumnKey(row);

    if (!dateKey || !valorKey) continue;

    const historico = histKey ? (row[histKey] ?? "").trim() : "";
    const descricao = descKey ? (row[descKey] ?? "").trim() : "";
    if (isSaldoDoDiaText(historico, descricao)) continue;

    const description = buildItauDescription(historico, descricao);
    if (!description) continue;

    const signed = parseSignedBrazilianAmount(row[valorKey] ?? "");
    if (signed === 0) continue;

    const type: "income" | "expense" = signed > 0 ? "income" : "expense";
    const date =
      parseDateToIso(row[dateKey] ?? "") ??
      new Date().toISOString().split("T")[0];

    transactions.push({
      date,
      description,
      amount: signed,
      type,
      rawData: row,
    });
  }

  return transactions;
}

function parseItauRows(
  rows: Record<string, string>[],
  variant: ItauCsvVariant,
): ParsedBankRow[] {
  if (variant === "extrato_conta_corrente") {
    return parseItauExtratoContaCorrenteRows(rows);
  }
  return parseItauLancamentosRows(rows);
}

const fieldMappings = {
  extract: {
    date: ["data", "date", "data_transacao", "data_movimento"],
    description: [
      "descricao",
      "description",
      "historico",
      "descricao_detalhada",
    ],
    amount: ["valor", "amount", "valor_transacao", "valor_movimento"],
    type: ["tipo", "type", "natureza", "debito_credito"],
  },
  card: {
    date: ["data", "date", "data_compra", "data_transacao"],
    description: ["descricao", "description", "estabelecimento", "local"],
    amount: ["valor", "amount", "valor_compra", "valor_transacao"],
    type: ["tipo", "type", "natureza"],
  },
} as const;

export function detectReportType(headers: string[]): BankReportType | null {
  const headerText = headers.map(normalizeHeader).join(" ");

  const extractIndicators = [
    "saldo",
    "saldo_anterior",
    "data_movimento",
    "historico",
    "valor_movimento",
    "credito",
    "debito",
    "docto",
  ];
  const cardIndicators = [
    "estabelecimento",
    "data_compra",
    "valor_compra",
    "parcelas",
    "categoria_estabelecimento",
  ];

  const extractScore = extractIndicators.filter((indicator) =>
    headerText.includes(indicator),
  ).length;

  const cardScore = cardIndicators.filter((indicator) =>
    headerText.includes(indicator),
  ).length;

  if (extractScore > cardScore && extractScore > 0) return "extract";
  if (cardScore > extractScore && cardScore > 0) return "card";

  return null;
}

function mapGenericTransaction(
  row: Record<string, string>,
  type: BankReportType,
): ParsedBankRow | null {
  const mapping = fieldMappings[type];

  const findField = (fieldType: keyof typeof mapping) => {
    const possibleNames = mapping[fieldType];
    for (const name of possibleNames) {
      const foundKey = Object.keys(row).find((key) =>
        normalizeHeader(key).includes(name),
      );
      if (foundKey) return foundKey;
    }
    return null;
  };

  const dateField = findField("date");
  const descriptionField = findField("description");
  const amountField = findField("amount");
  const typeField = findField("type");

  if (!dateField || !descriptionField || !amountField) {
    return null;
  }

  if (!row[dateField] || !row[descriptionField] || !row[amountField]) {
    return null;
  }

  const date =
    parseDateToIso(row[dateField]) ?? new Date().toISOString().split("T")[0];

  let amount = parseBrazilianAmount(row[amountField]);
  if (amount === 0 && row[amountField].includes("-")) {
    amount = -Math.abs(parseBrazilianAmount(row[amountField].replace("-", "")));
  }

  let transactionType: "income" | "expense" = "expense";
  if (typeField && row[typeField]) {
    const typeValue = row[typeField].toLowerCase();
    if (
      typeValue.includes("credito") ||
      typeValue.includes("receita") ||
      typeValue.includes("entrada")
    ) {
      transactionType = "income";
    }
  } else if (type === "extract") {
    transactionType = amount < 0 ? "expense" : "income";
  } else {
    transactionType = "expense";
  }

  const signedAmount =
    transactionType === "expense" ? -Math.abs(amount) : Math.abs(amount);

  return {
    date,
    description: row[descriptionField] || "Transação importada",
    amount: signedAmount,
    type: transactionType,
    rawData: row,
  };
}

/**
 * Parse bank CSV text. PDF is not supported.
 */
export function parseBankCsv(
  csvText: string,
  reportTypeHint: "auto" | BankReportType = "auto",
): ParseBankCsvResult {
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const delimiter = detectDelimiter(rawLines);
  const { headers, rows } = parseCsvRows(csvText, delimiter);

  if (rows.length === 0) {
    throw new Error("Nenhuma transação encontrada no arquivo");
  }

  const itauVariant = detectItauVariant(csvText, headers, delimiter);
  if (itauVariant) {
    const transactions = parseItauRows(rows, itauVariant);
    if (transactions.length === 0) {
      throw new Error("Nenhuma transação válida encontrada no extrato Itaú");
    }
    return {
      reportType: "extract",
      transactions,
      format: "itau",
      itauVariant,
    };
  }

  const detected = detectReportType(headers);
  const finalType =
    reportTypeHint === "auto" ? detected : reportTypeHint;

  if (!finalType) {
    throw new Error(
      "Não foi possível identificar o tipo do relatório. Selecione manualmente.",
    );
  }

  const transactions = rows
    .map((row) => mapGenericTransaction(row, finalType))
    .filter((t): t is ParsedBankRow => t !== null);

  if (transactions.length === 0) {
    throw new Error("Nenhuma transação válida encontrada no arquivo");
  }

  return {
    reportType: finalType,
    transactions,
    format: "generic",
  };
}
