import { chromium } from "playwright";

async function main() {
  const prodUrl =
    process.env.CAPTURE_PROD_URL || "https://vai-de-pix.vercel.app";

  console.log("Abrindo browser em modo visível...");
  console.log(
    "Faça login manualmente e aguarde a captura automática do token.",
  );

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${prodUrl}/auth`);

  console.log("Browser aberto. Faça login manualmente agora.");
  console.log("Aguardando redirecionamento para / ...");

  // Aguarda até 60 segundos para login manual
  await page.waitForURL(
    (url) => !url.pathname.includes("/auth"),
    { timeout: 60000 },
  );

  console.log("Login detectado! Capturando token...");

  const storage = await page.evaluate(() => {
    const result: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      result[key] = localStorage.getItem(key);
    }
    return result;
  });

  const token = storage["vai-de-pix-token"];
  const authState = storage["vai-de-pix-auth"];

  if (!token) {
    console.error("Token não encontrado no localStorage.");
    await browser.close();
    process.exit(1);
  }

  // Exibir valores para copiar manualmente
  console.log("\n=== COPIE OS VALORES ABAIXO ===\n");
  console.log("VAI_DE_PIX_TOKEN=" + token);
  console.log("\nVAI_DE_PIX_AUTH=" + authState);
  console.log("\n=== FIM ===\n");

  await browser.close();
  console.log("Pronto. Cole os valores acima como variáveis de ambiente.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

