import { detectDelimiter, normalizeHeader, splitCsvLine } from "./utils";

export function findCsvHeaderLineIndex(
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

    if (norm === "data,descricao,valor") {
      return i;
    }

    if (!line.includes(delimiter)) continue;

    if (
      norm.includes("data") &&
      norm.includes("descricao") &&
      norm.includes("valor") &&
      !norm.includes("historico")
    ) {
      return i;
    }

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

export function parseCsvRows(
  csvText: string,
  delimiter?: ";" | ",",
): { headers: string[]; rows: Record<string, string>[]; delimiter: ";" | "," } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [], delimiter: delimiter ?? "," };
  }

  const resolvedDelimiter = delimiter ?? detectDelimiter(lines);
  const headerLineIndex = findCsvHeaderLineIndex(lines, resolvedDelimiter);
  const headerLine = lines[headerLineIndex];
  const headers = splitCsvLine(headerLine, resolvedDelimiter);
  const dataLines = lines.slice(headerLineIndex + 1);

  const rows = dataLines.map((line) => {
    const values = splitCsvLine(line, resolvedDelimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows, delimiter: resolvedDelimiter };
}
