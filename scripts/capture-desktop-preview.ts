/**
 * Captura screenshot desktop (1280x900) de uma rota.
 *
 * Uso:
 *   npx tsx scripts/capture-desktop-preview.ts <rota> <arquivo-saida>
 *
 * Variáveis de ambiente (opcionais):
 *   CAPTURE_BASE_URL (default: http://localhost:5000)
 *   VAI_DE_PIX_TOKEN, VAI_DE_PIX_AUTH (se quiser capturar rotas protegidas)
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const UX_PREVIEWS_DIR = path.join(PROJECT_ROOT, "docs", "ux-previews");

const DESKTOP = {
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  isLandscape: true,
};

async function main() {
  const route = process.argv[2] ?? "/";
  const outputName = process.argv[3] ?? "preview-desktop";
  const baseUrl = process.env.CAPTURE_BASE_URL || "http://localhost:5000";

  const token = process.env.VAI_DE_PIX_TOKEN ?? null;
  const authState = process.env.VAI_DE_PIX_AUTH ?? null;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      ...DESKTOP,
      ignoreHTTPSErrors: true,
    });

    if (token || authState) {
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const filename = outputName.endsWith(".png")
      ? outputName
      : `${outputName}.png`;
    const outputPath = path.join(UX_PREVIEWS_DIR, filename);
    await page.screenshot({ path: outputPath, fullPage: false });

    console.log(`URL solicitada: ${url}`);
    console.log(`URL final: ${page.url()}`);
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

