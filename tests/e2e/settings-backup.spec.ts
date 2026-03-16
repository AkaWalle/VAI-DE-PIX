import { test, expect } from "@playwright/test";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("vai-de-pix-token", "e2e-test-token");
  });

  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-e2e",
        name: "Usuário E2E",
        email: "e2e@example.com",
      }),
    });
  });

  await page.goto("/settings");
}

test.describe("Configurações - contas e backup", () => {
  test("deve criar conta com balanceCents, exibir saldo e gerar backup", async ({
    page,
  }) => {
    await loginAsTestUser(page);

    // Intercepta criação de conta para garantir que backend ainda recebe reais (float)
    let capturedAccountBody: unknown;
    await page.route("**/accounts/**", async (route, request) => {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        capturedAccountBody = body;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "account-e2e-1",
            name: body.name,
            type: body.type ?? "checking",
            balance: body.balance,
          }),
        });
        return;
      }
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "account-e2e-1",
              name: "Conta E2E",
              type: "checking",
              balance: 123.45,
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    // Espiona criação de URL para validar que backup foi disparado
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__backupUrls__ = [];
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function (blob: Blob) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__backupUrls__.push(blob);
        return originalCreateObjectURL.call(this, blob);
      };
    });

    // Navega até configurações
    await page.click('a:has-text("Configurações")');
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();

    // Abre formulário de nova conta
    await page.click('button:has-text("Nova Conta")');

    await page.fill("#new-account-name", "Conta E2E");
    await page.click("#new-account-type");
    await page.getByRole("option", { name: "Conta Corrente" }).click();

    // CurrencyInput para saldo inicial
    const balanceInput = page.locator("#new-account-balance");
    await balanceInput.click();
    await balanceInput.fill("");
    await balanceInput.type("12345"); // R$ 123,45

    await page.click('button:has-text("Adicionar")');

    // Verifica que conta aparece com saldo formatado (usa apenas o texto de saldo para evitar ambiguidade)
    await expect(page.getByText("R$ 123,45")).toBeVisible();

    // Garante que conversão balanceCents / 100 foi aplicada no payload enviado
    expect(capturedAccountBody).toBeDefined();
    const body = capturedAccountBody as { balance?: number };
    expect(typeof body.balance).toBe("number");
    expect(body.balance).toBeCloseTo(123.45);

    // Dispara backup
    await page.click('button:has-text("Fazer Backup")');

    // Valida que backup foi disparado criando um Blob via URL.createObjectURL
    const backupBlobs = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return (window.__backupUrls__ as Blob[]) ?? [];
    });
    expect(backupBlobs.length).toBeGreaterThan(0);
  });
});

