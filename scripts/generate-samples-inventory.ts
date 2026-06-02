import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = process.cwd();
const SAMPLES_DIR = join(ROOT, "samples");

interface InventoryEntry {
  bank: string;
  fileType: string;
  fileName: string;
  size: string;
  detectedLayout: string;
  path: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function detectLayoutFromContent(content: string, fileType: string): string {
  const norm = content.slice(0, 4000).toLowerCase();

  if (fileType === "ofx") return "ofx_standard";
  if (norm.includes("lancamentos da conta")) return "lancamentos_conta";
  if (norm.includes("extrato conta corrente")) return "extrato_conta_corrente";
  if (norm.includes("extrato conta / lancamentos")) return "extrato_conta_corrente";
  if (norm.includes("instituicao: banco inter") || norm.includes("banco intermedium")) {
    return fileType === "pdf" ? "inter_statement" : "extrato_conta_corrente";
  }
  if (norm.startsWith("data,descricao,valor") || norm.includes("data,descricao,valor")) {
    return "converted_pdf";
  }
  if (norm.includes("<stmttrn>")) return "ofx_standard";
  return "unknown";
}

function walkSamples(): InventoryEntry[] {
  const entries: InventoryEntry[] = [];

  function walk(dir: string, bank: string) {
    if (!readdirSync(dir, { withFileTypes: true })) return;

    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) {
        walk(full, item.name === "desconhecidos" ? "desconhecidos" : bank || item.name);
        continue;
      }

      const ext = extname(item.name).toLowerCase().replace(".", "");
      if (!["csv", "pdf", "ofx"].includes(ext)) continue;
      const stat = statSync(full);
      let content = "";

      try {
        if (fileType === "pdf") {
          content = readFileSync(full).slice(0, 4096).toString("latin1");
        } else {
          content = readFileSync(full, "utf-8");
        }
      } catch {
        content = "";
      }

      const relativeParts = full.replace(SAMPLES_DIR, "").split(/[/\\]/).filter(Boolean);
      const resolvedBank = relativeParts[0] ?? bank;

      entries.push({
        bank: resolvedBank,
        fileType,
        fileName: basename(item.name),
        size: formatSize(stat.size),
        detectedLayout: detectLayoutFromContent(content, fileType),
        path: full.replace(ROOT + "\\", "").replace(ROOT + "/", ""),
      });
    }
  }

  walk(SAMPLES_DIR, "");
  return entries;
}

async function main() {
  mkdirSync(SAMPLES_DIR, { recursive: true });
  const inventory = walkSamples();
  const outPath = join(SAMPLES_DIR, "inventory.json");
  writeFileSync(outPath, JSON.stringify(inventory, null, 2), "utf-8");
  console.log(JSON.stringify(inventory, null, 2));
}

main();
