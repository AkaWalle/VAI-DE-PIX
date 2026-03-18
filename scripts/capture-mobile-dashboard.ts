/**
 * Captura screenshots de todas as telas em viewport mobile (390×844) com emulação
 * completa de dispositivo (iPhone).
 *
 * Fluxo:
 *  - Fase 1: login em produção, captura de sessão (token + estado auth) em memória
 *  - Fase 2: injeção dessa sessão no localhost e captura das telas mobile
 *
 * Uso:
 *  - Terminal 1: npm run dev            (app local em http://localhost:5000)
 *  - Terminal 2:
 *      $env:CAPTURE_EMAIL='SEU_EMAIL'; `
 *      $env:CAPTURE_PASSWORD='SUA_SENHA'; `
 *      npx tsx scripts/capture-mobile-dashboard.ts
 *
 * Variáveis opcionais:
 *  - CAPTURE_PROD_URL  (default: https://vai-de-pix.vercel.app)
 *  - CAPTURE_BASE_URL  (default: http://localhost:5000)
 *
 * Saída:
 *  - docs/screenshots-prod/01-dashboard-mobile.png ... 11-settings-mobile.png
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "docs", "screenshots-prod");

const MOBILE_DEVICE = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false,
};

/** Rota → nome do arquivo (sem extensão) */
const SCREENS: { path: string; filename: string }[] = [
  { path: "/", filename: "01-dashboard-mobile" },
  { path: "/transactions", filename: "02-transactions-mobile" },
  { path: "/goals", filename: "03-goals-mobile" },
  { path: "/envelopes", filename: "04-envelopes-mobile" },
  { path: "/shared-expenses", filename: "05-shared-expenses-mobile" },
  { path: "/shared-expenses/pending", filename: "06-pending-mobile" },
  { path: "/activity-feed", filename: "07-activity-feed-mobile" },
  { path: "/reports", filename: "08-reports-mobile" },
  { path: "/trends", filename: "09-trends-mobile" },
  { path: "/automations", filename: "10-automations-mobile" },
  { path: "/settings", filename: "11-settings-mobile" },
];

async function main() {
  const email = process.env.CAPTURE_EMAIL;
  const password = process.env.CAPTURE_PASSWORD;
  if (!email || !password) {
    console.error("Defina CAPTURE_EMAIL e CAPTURE_PASSWORD no ambiente.");
    process.exit(1);
  }

  const prodUrl = process.env.CAPTURE_PROD_URL || "https://vai-de-pix.vercel.app";
  const baseUrl = process.env.CAPTURE_BASE_URL || "http://localhost:5000";

  console.log("Fase 1: fazendo login em produção...");
  console.log("  PROD URL :", prodUrl);
  console.log("  LOCAL URL:", baseUrl);

  const browser = await chromium.launch({ headless: true });

  let prodToken: string | null = null;
  let prodAuthState: string | null = null;

  try {
    // FASE 1 — Login em produção e captura de sessão
    const prodContext = await browser.newContext({
      ...MOBILE_DEVICE,
      ignoreHTTPSErrors: true,
    });
    const prodPage = await prodContext.newPage();

    await prodPage.goto(`${prodUrl}/auth`, { waitUntil: "networkidle" });

    await prodPage.locator("#login-email").fill(email);
    await prodPage.locator("#login-password").fill(password);
    await prodPage.locator('button[type="submit"]').click();

    await prodPage
      .waitForURL(
        (url) => url.pathname === "/" || url.pathname === "/auth",
        { timeout: 20000 },
      )
      .catch(() => {});

    if (prodPage.url().includes("/auth")) {
      console.error("Login em produção falhou: ainda em", prodPage.url());
      await prodContext.close();
      await browser.close();
      process.exit(1);
    }

    // Captura de sessão em memória (localStorage da aba de produção)
    const storage = await prodPage.evaluate(() => {
      const result: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        result[key] = localStorage.getItem(key);
      }
      return result;
    });

    prodToken = storage["vai-de-pix-token"] ?? null;
    prodAuthState = storage["vai-de-pix-auth"] ?? null;

    if (!prodToken) {
      console.error("Nenhum token encontrado em localStorage['vai-de-pix-token'] após login em produção.");
      await prodContext.close();
      await browser.close();
      process.exit(1);
    }

    console.log("Token capturado com sucesso.");
    if (prodAuthState) {
      console.log("Estado de auth (vai-de-pix-auth) também capturado.");
    } else {
      console.log("Aviso: vai-de-pix-auth não encontrado; app local irá re-hidratar user via /auth/me.");
    }

    await prodContext.close();

    // FASE 2 — Injetar sessão em localhost e capturar telas
    console.log("Fase 2: injetando sessão em localhost...");

    const localContext = await browser.newContext({
      ...MOBILE_DEVICE,
      ignoreHTTPSErrors: true,
    });

    await localContext.addInitScript(
      ([token, authState]) => {
        if (!token) return;
        try {
          localStorage.setItem("vai-de-pix-token", token);
          if (authState) {
            localStorage.setItem("vai-de-pix-auth", authState);
          }
        } catch {
          // Ignorar erros de localStorage
        }
      },
      [prodToken, prodAuthState],
    );

    const page = await localContext.newPage();

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

    if (page.url().includes("/auth")) {
      console.error("Sessão injetada mas app local redirecionou para /auth. Verifique API local.");
      await localContext.close();
      await browser.close();
      process.exit(1);
    }

    console.log("Sessão injetada. App autenticado em localhost.");
    console.log("Capturando telas...");

    for (const { path: route, filename } of SCREENS) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const outputPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`  ${filename}.png ✓`);
    }

    console.log("Concluído. 11 screenshots em docs/screenshots-prod/");

    await localContext.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
