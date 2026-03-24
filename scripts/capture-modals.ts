/**
 * Captura screenshots dos modais Nova Transação e Nova Despesa Compartilhada.
 *
 * Requer:
 *   - App frontend rodando em localhost:5000 (npm run dev)
 *   - Token em VAI_DE_PIX_TOKEN (qualquer string; API é mockada)
 *
 * Uso (PowerShell):
 *   $env:VAI_DE_PIX_TOKEN='qualquer-token'
 *   npx tsx scripts/capture-modals.ts
 *
 * Saída: docs/ux-previews/modal-transaction.png e modal-shared.png
 */
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:5000";
const TOKEN = process.env.VAI_DE_PIX_TOKEN;
const OUT_DIR = path.join(process.cwd(), "docs", "ux-previews");

async function main() {
  const token = TOKEN || "capture-modals-token";

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  await context.addInitScript((t: string) => {
    window.localStorage.setItem("vai-de-pix-token", t);
  }, token);

  const page = await context.newPage();

  // Mock API no context para persistir em todas as navegações
  await context.route(/auth\/me/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "user-1", name: "Usuário", email: "user@example.com" }),
    })
  );
  await context.route(/me\/data/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accounts: [{ id: "acc-1", name: "Conta", type: "checking", balance: 0, created_at: new Date().toISOString() }],
        categories: [{ id: "cat-1", name: "Alimentação", type: "expense", color: "#22c55e", icon: "🍽", created_at: new Date().toISOString() }],
        transactions: [],
        envelopes: [],
        goals: [],
        sharedExpenses: [],
      }),
    })
  );
  await context.route(/auth\/refresh/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: token, token_type: "bearer" }),
    })
  );

  try {
    // 1. Modal Nova Transação
    console.log("Navegando para /transactions...");
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: "load", timeout: 20000 });

    if (page.url().includes("/auth")) {
      throw new Error("Redirecionado para /auth - token inválido ou expirado?");
    }

    // Aguarda página carregar (botão Nova Transação ou FAB)
    const txBtn = page.locator('button:has-text("Nova Transação"), button[aria-label*="Nova transação"]').first();
    await txBtn.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(500);

    await txBtn.click({ timeout: 5000 });
    await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 5000 });

    const txPath = path.join(OUT_DIR, "modal-transaction.png");
    await page.locator('[role="dialog"]').screenshot({ path: txPath });
    console.log("Capturado:", txPath);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 2. Modal Nova Despesa Compartilhada
    console.log("Navegando para /shared-expenses...");
    await page.goto(`${BASE_URL}/shared-expenses`, { waitUntil: "load", timeout: 20000 });

    if (page.url().includes("/auth")) {
      throw new Error("Redirecionado para /auth - token inválido ou expirado?");
    }

    const sharedBtn = page.locator('button:has-text("Nova Despesa")').first();
    await sharedBtn.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(500);
    await sharedBtn.click({ timeout: 5000 });
    await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 5000 });

    const sharedPath = path.join(OUT_DIR, "modal-shared.png");
    await page.locator('[role="dialog"]').screenshot({ path: sharedPath });
    console.log("Capturado:", sharedPath);

    console.log("\nScreenshots salvos em docs/ux-previews/");
  } catch (err) {
    console.error("Erro:", err);
    const debugPath = path.join(OUT_DIR, "capture-debug.png");
    try {
      if (page) await page.screenshot({ path: debugPath });
      console.error("Screenshot de debug salvo em:", debugPath);
    } catch {
      /* ignore */
    }
    await browser.close();
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
