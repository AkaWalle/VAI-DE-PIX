import { test, expect } from "@playwright/test";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  // 1) Define token fake para satisfazer ProtectedRoute / hasSessionToken
  await page.addInitScript(() => {
    window.localStorage.setItem("vai-de-pix-token", "e2e-test-token");
  });

  // 2) Mock de /auth/me para o bootstrapAuth
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

  // 3) Navega direto para rota protegida; ProtectedRoute verá token + user do /auth/me
  await page.goto("/shared-expenses");
}

test.describe("Despesa compartilhada - happy path", () => {
  test("deve criar despesa compartilhada com total em centavos e toast de sucesso", async ({
    page,
  }) => {
    await loginAsTestUser(page);

    // Intercepta criação de despesa compartilhada para inspecionar payload
    let capturedRequestBody: unknown;
    await page.route("**/shared-expenses/**", async (route, request) => {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        capturedRequestBody = body;
        // Responde com mock mínimo esperado pelo frontend
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "shared-expense-e2e-1",
            created_by: "user-e2e",
            amount: body.total_cents,
            description: body.description,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: null,
          }),
        });
        return;
      }
      await route.continue();
    });

    await expect(page.getByRole("heading", { name: "Despesas Compartilhadas" })).toBeVisible();

    await page.click('button:has-text("Nova Despesa")');

    // Preenche formulário
    await page.fill("#title", "Jantar E2E");
    await page.fill('input[type="date"]#date', "2025-12-31");

    // Seleciona uma categoria obrigatória
    await page.getByText("Categoria *").click();
    await page.getByRole("option").first().click();

    // Valor com CurrencyInput (digitação em centavos)
    const totalInput = page.locator("#totalAmount");
    await totalInput.click();
    await totalInput.fill(""); // garante estado limpo
    await totalInput.type("12345"); // R$ 123,45

    // Adiciona participante convidado
    await page.fill("#participant-name", "Convidado E2E");
    await page.fill("#participant-email", "convidado-e2e@example.com");
    await page.click('button:has-text("Adicionar")');

    // Envia o formulário
    await page.click('button:has-text("Criar Despesa")');

    // Valida toast de sucesso
    await expect(page.getByText("Despesa criada com sucesso")).toBeVisible();

    // Valida que payload usa centavos
    expect(capturedRequestBody).toBeDefined();
    const body = capturedRequestBody as { total_cents: number; participants?: unknown[] };
    expect(body.total_cents).toBe(12345);
    expect(typeof body.total_cents).toBe("number");
  });
});

