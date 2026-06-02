/**
 * Anonimiza fixtures em tests/fixtures/ e samples/.
 * Preserva valores, datas e quantidade de transações.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  join(ROOT, "tests/fixtures"),
  join(ROOT, "samples"),
];

/** Ordem decrescente de tamanho para evitar substituições parciais */
const REPLACEMENTS: [string, string][] = [
  ["JOSE WALLACE VENTURA DA SILVA", "CLIENTE EXEMPLO TITULAR"],
  ["Jose Wallace Ventura Da Silva", "CLIENTE EXEMPLO TITULAR"],
  ["MARIA CLEMILDA VENTURA CORREIA", "CLIENTE EXEMPLO 002"],
  ["Maria Clemilda Ventura Correia", "CLIENTE EXEMPLO 002"],
  ["Gabriel Kaique Araujo De Lima", "CLIENTE EXEMPLO 004"],
  ["Gislaine Cifuentes Vicente", "CLIENTE EXEMPLO 005"],
  ["Guilherme Jose Vicente", "CLIENTE EXEMPLO 008"],
  ["Barbara Vicente", "CLIENTE EXEMPLO 001"],
  ["Bárbara Vicente", "CLIENTE EXEMPLO 001"],
  ["BARBARA VICENTE", "CLIENTE EXEMPLO 001"],
  ["Valdeci Pollheim", "CLIENTE EXEMPLO 003"],
  ["Thiago Oliveira Dos Santos", "CLIENTE EXEMPLO 006"],
  ["Sandro Flores Airoso", "CLIENTE EXEMPLO 007"],
  ["Mercado Weise", "ESTABELECIMENTO EXEMPLO 001"],
  ["PIX TRANSF JOSE WA", "PIX TRANSF CLNT EX"],
  ["PIX TRANSF Barbara", "PIX TRANSF CLNT EX"],
  ["Pagamento Fatura - CLIENTE EXEMPLO TITULAR", "Pagamento Fatura - CLIENTE EXEMPLO TITULAR"],
  ["066.707.154-71", "000.000.000-00"],
  ["06670715471", "00000000000"],
  ["11238410-2", "0000000-1"],
  ["112384102", "000000001"],
  ["82639451", "000000001"],
  ["18236120", "000000002"],
  ["22896431", "000000003"],
  ["60746948", "000000004"],
  ["60701190", "000000005"],
  ["00360305", "000000006"],
  ["00000000", "000000007"],
  ["049.331.", "000.000."],
  ["Agência: 0132", "Agencia: 0001"],
  ["agência: 0132", "agencia: 0001"],
  ["Agência: 0001-9", "Agencia: 0001-0"],
  ["Instituição: Banco Inter", "Instituicao: Banco Inter"],
];

function anonymizeContent(content: string): string {
  let result = content;
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if ([".csv", ".ofx", ".pdf", ".txt"].includes(ext)) {
      files.push(full);
    }
  }
  return files;
}

interface AuditFinding {
  file: string;
  patterns: string[];
}

function audit(content: string): string[] {
  const findings: string[] = [];
  const checks: [string, RegExp][] = [
    ["CPF", /\d{3}\.\d{3}\.\d{3}-\d{2}/],
    ["nome real (JOSE WALLACE)", /JOSE WALLACE|Jose Wallace/i],
    ["CLIENTE EXEMPLO ausente", /Barbara Vicente|Maria Clemilda/i],
    ["conta real", /112384102/],
  ];
  for (const [label, re] of checks) {
    if (re.test(content)) findings.push(label);
  }
  return findings;
}

function main() {
  const allFiles = TARGET_DIRS.flatMap((d) => collectFiles(d));
  const report: AuditFinding[] = [];
  const beforeAfter: { file: string; changed: boolean }[] = [];

  for (const file of allFiles) {
    const original = readFileSync(file);
    const isPdf = file.toLowerCase().endsWith(".pdf");
    const text = isPdf
      ? original.toString("latin1")
      : original.toString("utf-8");

    const anonymized = anonymizeContent(text);
    const changed = anonymized !== text;

    if (changed) {
      writeFileSync(
        file,
        isPdf ? Buffer.from(anonymized, "latin1") : anonymized,
        "utf-8",
      );
    }

    const remaining = audit(anonymized);
    if (remaining.length > 0) {
      report.push({ file: file.replace(ROOT + "\\", ""), patterns: remaining });
    }
    beforeAfter.push({ file: file.replace(ROOT + "\\", ""), changed });
  }

  console.log("=== RELATÓRIO DE ANONIMIZAÇÃO ===");
  console.log(JSON.stringify({ processed: beforeAfter.length, changed: beforeAfter.filter((f) => f.changed).length }, null, 2));
  console.log("\n=== ACHADOS RESIDUAIS ===");
  console.log(JSON.stringify(report, null, 2));
}

main();
