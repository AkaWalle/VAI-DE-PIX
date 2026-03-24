/**
 * Captura screenshot de uma tela específica para preview de melhoria UX.
 * Viewport mobile 390×844.
 *
 * Uso:
 *   npx tsx scripts/capture-ux-preview.ts <rota> <arquivo-saida>
 *
 * Exemplo:
 *   npx tsx scripts/capture-ux-preview.ts /envelopes 5-envelopes-after
 *   npx tsx scripts/capture-ux-preview.ts / 6-dashboard-after
 *
 * Variáveis de ambiente (mesmas do capture-mobile-dashboard):
 *   VAI_DE_PIX_TOKEN, VAI_DE_PIX_AUTH (ou CAPTURE_EMAIL, CAPTURE_PASSWORD)
 *   CAPTURE_BASE_URL (default: https://vai-de-pix.vercel.app; use http://localhost:5173 para after)
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const UX_PREVIEWS_DIR = path.join(PROJECT_ROOT, "docs", "ux-previews");

const MOBILE_DEVICE = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false,
};

async function main() {
  const route = process.argv[2] ?? "/";
  const outputName = process.argv[3] ?? "preview";
  const baseUrl =
    process.env.CAPTURE_BASE_URL || "https://vai-de-pix.vercel.app";

  const envToken = process.env.VAI_DE_PIX_TOKEN;
  const email = process.env.CAPTURE_EMAIL;
  const password = process.env.CAPTURE_PASSWORD;
  if (!envToken && (!email || !password)) {
    console.error(
      "Defina VAI_DE_PIX_TOKEN ou CAPTURE_EMAIL+CAPTURE_PASSWORD no ambiente.",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  let token: string | null = null;
  let authState: string | null = null;

  try {
    const envAuthState = process.env.VAI_DE_PIX_AUTH ?? null;

    if (envToken) {
      token = envToken;
      authState = envAuthState;
    } else {
      const context = await browser.newContext({
        ...MOBILE_DEVICE,
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/auth`, {
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
        console.error("Login falhou.");
        await context.close();
        await browser.close();
        process.exit(1);
      }

      const storage = await page.evaluate(() => {
        const result: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) result[key] = localStorage.getItem(key);
        }
        return result;
      });
      token = storage["vai-de-pix-token"] ?? null;
      authState = storage["vai-de-pix-auth"] ?? null;
      await context.close();

      if (!token) {
        console.error("Token não encontrado após login.");
        await browser.close();
        process.exit(1);
      }
    }

    const context = await browser.newContext({
      ...MOBILE_DEVICE,
      ignoreHTTPSErrors: true,
    });

    if (token) {
      await context.addInitScript(
        ([t, state]) => {
          try {
            if (t) localStorage.setItem("vai-de-pix-token", t);
            if (state) localStorage.setItem("vai-de-pix-auth", state);
          } catch { // intentionally empty
          }
        },
        [token, authState],
      );
    }

    const page = await context.newPage();
    const url = `${baseUrl}${route}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    const filename = outputName.endsWith(".png") ? outputName : `${outputName}.png`;
    const outputPath = path.join(UX_PREVIEWS_DIR, filename);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Salvo: ${outputPath}`);

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
