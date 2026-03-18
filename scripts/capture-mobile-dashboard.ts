/**
 * Captura screenshots de todas as telas em viewport mobile (390×844) com emulação
 * completa de dispositivo (iPhone). Uso: definir CAPTURE_EMAIL e CAPTURE_PASSWORD
 * no ambiente e rodar: npx tsx scripts/capture-mobile-dashboard.ts
 *
 * Requer app rodando localmente (npm run dev) ou defina CAPTURE_BASE_URL.
 * Salva em: docs/screenshots-prod/01-dashboard-mobile.png ... 11-settings-mobile.png
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

  const baseUrl = process.env.CAPTURE_BASE_URL || "http://localhost:5000";
  console.log("Base URL:", baseUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...MOBILE_DEVICE,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });

    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/auth", { timeout: 20000 }).catch(() => {});
    if (page.url().includes("/auth")) {
      console.error("Login falhou: ainda em", page.url());
      await page.screenshot({
        path: path.join(PROJECT_ROOT, "debug-login-failed.png"),
      });
      console.error("Screenshot salvo em debug-login-failed.png");
      await browser.close();
      process.exit(1);
    }

    console.log("Login OK. Capturando telas...");

    for (const { path: route, filename } of SCREENS) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const outputPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log("  ", filename + ".png");
    }

    console.log("Concluído. Screenshots em docs/screenshots-prod/");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
