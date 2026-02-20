#!/usr/bin/env node
/**
 * CI Guard: falha se "miro" for reintroduzido no repositório.
 * Exclui: node_modules, dist, .git, package-lock.json, e o próprio relatório de remoção.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(["node_modules", "dist", ".git", ".cursor", "backend/__pycache__"]);
const EXCLUDE_FILES = new Set([
  "package-lock.json",
  "scripts/guard-no-miro.mjs",
  "docs/architecture/flows/REMOCAO_MIRO_RELATORIO.md",
  ".github/workflows/ci.yml", // step "Guard anti-reintrodução Miro" é meta
]);
const PATTERN = /miro/i;

/** package.json: permitir só script "guard:no-miro" e path guard-no-miro.mjs; qualquer outra ref (ex.: dependência) = hit. */
function checkPackageJson(content) {
  const semGuard = content.replace(/"guard:no-miro"/gi, "").replace(/guard-no-miro\.mjs/g, "");
  return PATTERN.test(semGuard);
}

function walk(dir, base = "") {
  const hits = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return hits;
  }
  for (const ent of entries) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(rel) || EXCLUDE_DIRS.has(ent.name)) continue;
      hits.push(...walk(join(dir, ent.name), rel));
      continue;
    }
    if (!ent.isFile()) continue;
    const norm = rel.replace(/\\/g, "/");
    if (EXCLUDE_FILES.has(norm) || EXCLUDE_FILES.has(ent.name)) continue;
    try {
      const content = readFileSync(join(dir, ent.name), "utf8");
      if (norm === "package.json") {
        if (checkPackageJson(content)) hits.push(rel);
      } else if (PATTERN.test(content)) {
        hits.push(rel);
      }
    } catch {
      // binários ou permissão negada: ignorar
    }
  }
  return hits;
}

const hits = walk(ROOT);
if (hits.length > 0) {
  console.error("guard-no-miro: referências a 'miro' encontradas (reintrodução proibida):");
  hits.forEach((p) => console.error("  -", p));
  process.exit(1);
}
console.log("guard-no-miro: OK — nenhuma referência a Miro no repositório.");
process.exit(0);
