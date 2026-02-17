#!/usr/bin/env node
/**
 * Safety guard anti-regressão: valida que não existe refresh fora do lock
 * nem tokenManager.set fora da zona segura (refresh-internal + auth.service).
 * Uso: node scripts/assert-no-refresh-outside-lock.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".git") yield* walk(full);
    } else if (e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx"))) {
      yield full;
    }
  }
}

const allowedRefreshInternalCallers = ["refresh-lock-manager.ts"];
const allowedRefreshInternalDef = "refresh-internal.ts";
const allowedTokenSetFiles = ["refresh-internal.ts", "auth.service.ts"];

let failed = false;

for (const file of walk(SRC)) {
  const content = fs.readFileSync(file, "utf-8");
  const base = path.basename(file);
  if (content.includes("refreshAccessTokenInternal")) {
    if (base === allowedRefreshInternalDef) continue;
    if (allowedRefreshInternalCallers.some((a) => base === a)) continue;
    console.error(`[FAIL] refreshAccessTokenInternal fora do lock: ${file}`);
    failed = true;
  }
}

for (const file of walk(SRC)) {
  const content = fs.readFileSync(file, "utf-8");
  const base = path.basename(file);
  if (content.includes("tokenManager.set(")) {
    if (allowedTokenSetFiles.some((a) => base === a)) continue;
    console.error(`[FAIL] tokenManager.set fora da zona segura: ${file}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("[OK] Nenhum refresh fora do lock; nenhum tokenManager.set fora da zona segura.");
