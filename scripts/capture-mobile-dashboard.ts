/**
 * Captura screenshots de todas as telas em viewport mobile (390×844) com emulação
 * completa de dispositivo (iPhone).
 *
 * Fluxo:
 *  - Fase 1: obter sessão autenticada em produção (token via env ou login automatizado)
 *  - Fase 2: capturar as telas diretamente em produção com emulação mobile
 *
 * Uso (produção):
 *  - Recomenda-se obter o token uma vez com scripts/get-session-token.ts
 *  - Depois rodar:
 *      $env:VAI_DE_PIX_TOKEN='...'; `
 *      $env:VAI_DE_PIX_AUTH='...'; `
 *      $env:CAPTURE_EMAIL='SEU_EMAIL'; `
 *      $env:CAPTURE_PASSWORD='SUA_SENHA'; `
 *      npx tsx scripts/capture-mobile-dashboard.ts
 *
 * Variáveis opcionais:
 *  - CAPTURE_PROD_URL  (default: https://vai-de-pix.vercel.app)
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

  const prodUrl =
    process.env.CAPTURE_PROD_URL || "https://vai-de-pix.vercel.app";
  const baseUrl = prodUrl;

  console.log("Fase 1: obtendo sessão em produção...");
  console.log("  PROD URL :", prodUrl);

  const browser = await chromium.launch({ headless: true });

  let token: string | null = null;
  let authState: string | null = null;

  try {
    const envToken = process.env.VAI_DE_PIX_TOKEN;
    const envAuthState = process.env.VAI_DE_PIX_AUTH ?? null;

    if (envToken) {
      console.log("Usando token fornecido via VAI_DE_PIX_TOKEN...");
      token = envToken;
      authState = envAuthState;
    } else {
      console.log(
        "Nenhum VAI_DE_PIX_TOKEN definido. Fazendo login automatizado...",
      );
      const context = await browser.newContext({
        ...MOBILE_DEVICE,
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      await page.goto(`${prodUrl}/auth`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      await page.locator("#login-email").fill(email);
      await page.locator("#login-password").fill(password);
      await page.locator('button[type="submit"]').click();

      await page
        .waitForURL(
          (url) => url.pathname === "/" || url.pathname === "/auth",
          { timeout: 20000 },
        )
        .catch(() => {});

      if (page.url().includes("/auth")) {
        console.error(
          "Login em produção falhou: ainda em",
          page.url(),
        );
        await context.close();
        await browser.close();
        process.exit(1);
      }

      const storage = await page.evaluate(() => {
        const result: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          result[key] = localStorage.getItem(key);
        }
        return result;
      });

      token = storage["vai-de-pix-token"] ?? null;
      authState = storage["vai-de-pix-auth"] ?? null;

      if (!token) {
        console.error(
          "Nenhum token encontrado em localStorage['vai-de-pix-token'] após login em produção.",
        );
        await context.close();
        await browser.close();
        process.exit(1);
      }

      console.log("Token capturado com sucesso via login automatizado.");
      await context.close();
    }

    console.log("Fase 2: capturando telas diretamente em produção...");

    const context = await browser.newContext({
      ...MOBILE_DEVICE,
      ignoreHTTPSErrors: true,
    });

    if (token) {
      await context.addInitScript(
        ([t, state]) => {
          try {
            if (t) {
              localStorage.setItem("vai-de-pix-token", t);
            }
            if (state) {
              localStorage.setItem("vai-de-pix-auth", state);
            }
          } catch {
            // ignora erros de localStorage
          }
        },
        [token, authState],
      );
    }

    const page = await context.newPage();

    for (const { path: route, filename } of SCREENS) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);
      const outputPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`  ${filename}.png ✓`);
    }

    console.log(
      "Concluído. 11 screenshots em docs/screenshots-prod/ (produção).",
    );

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
