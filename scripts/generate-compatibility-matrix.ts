import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const inventoryPath = join(ROOT, "samples/inventory.json");

interface InventoryEntry {
  bank: string;
  fileType: string;
  detectedLayout: string;
}

function loadInventory(): InventoryEntry[] {
  try {
    return JSON.parse(readFileSync(inventoryPath, "utf-8"));
  } catch {
    return [];
  }
}

const BANKS = [
  "itau",
  "inter",
  "nubank",
  "bradesco",
  "santander",
  "caixa",
  "bb",
  "sicredi",
  "sicoob",
  "btg",
  "c6",
] as const;

function statusFor(bank: string, type: string, inventory: InventoryEntry[]): string {
  const hasSample = inventory.some(
    (e) => e.bank === bank && e.fileType === type,
  );
  const hasParser =
    (bank === "itau" || bank === "inter") &&
    (type === "csv" || type === "pdf" || type === "ofx");

  if (bank === "itau" || bank === "inter") {
    if (hasSample && hasParser) return "✅ Completo";
    if (hasParser) return "✅ Completo";
    return "⚠️ Parcial";
  }

  if (type === "ofx") return "✅ OFX universal";
  if (hasSample) return "⚠️ Parcial";
  return "❌ Sem amostra";
}

function main() {
  const inventory = loadInventory();
  const lines = [
    "# Matriz de Compatibilidade — Importação Bancária",
    "",
    "Gerada automaticamente com base em `samples/inventory.json`.",
    "",
    "| Banco | CSV | PDF | OFX | Status |",
    "|--------|--------|--------|--------|--------|",
  ];

  for (const bank of BANKS) {
    const label =
      bank === "bb"
        ? "Banco do Brasil"
        : bank.charAt(0).toUpperCase() + bank.slice(1);

    const csv = statusFor(bank, "csv", inventory).includes("✅") ? "✅" : statusFor(bank, "csv", inventory).includes("⚠️") ? "⚠️" : "❌";
    const pdf = statusFor(bank, "pdf", inventory).includes("✅") ? "✅" : statusFor(bank, "pdf", inventory).includes("⚠️") ? "⚠️" : "❌";
    const ofx = statusFor(bank, "ofx", inventory).includes("✅") ? "✅" : "❌";

    let overall = "Parcial";
    if (bank === "itau" || bank === "inter") overall = "Completo";
    else if (ofx === "✅") overall = "OFX only";

    lines.push(`| ${label} | ${csv} | ${pdf} | ${ofx} | ${overall} |`);
  }

  lines.push("");
  lines.push("## Amostras mapeadas");
  lines.push("");
  for (const entry of inventory) {
    lines.push(
      `- **${entry.bank}** / ${entry.fileType}: \`${entry.detectedLayout}\``,
    );
  }

  const out = join(ROOT, "docs/COMPATIBILITY-MATRIX.md");
  writeFileSync(out, lines.join("\n"), "utf-8");
  console.log(lines.join("\n"));
}

main();
