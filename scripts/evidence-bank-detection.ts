import { readFileSync } from "node:fs";
import { parseBankImportCsv, buildImportPreview } from "../src/lib/bank-import";

const interCsv = readFileSync("tests/fixtures/inter-extrato.csv", "utf-8");
const result = parseBankImportCsv(interCsv);
const preview = buildImportPreview(result);

console.log(
  JSON.stringify(
    {
      evidencia: "CSV Inter sem metadados de banco",
      bank: result.bank,
      previewBank: preview.bank,
      layout: result.layout,
      total: result.transactions.length,
      receitas: result.transactions.filter((t) => t.type === "income").length,
      despesas: result.transactions.filter((t) => t.type === "expense").length,
    },
    null,
    2,
  ),
);
