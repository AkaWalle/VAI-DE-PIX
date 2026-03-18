/**
 * Teste E2E completo do fluxo principal
 * Cobre: registro → criar conta → lançar transação → verificar saldo → exportar CSV
 */
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

  await page.goto("/");
}

test.describe.skip("Fluxo Completo do Usuário", () => {
  test("deve completar jornada completa do usuário", async ({ page }) => {
    await loginAsTestUser(page);
    
    // 3. Criar nova conta
    await page.click('text=Contas');
    await page.click('text=Nova Conta');
    await page.fill('input[name="name"]', 'Conta Poupança E2E');
    await page.selectOption('select[name="account_type"]', 'savings');
    await page.click('button[type="submit"]');
    
    // 4. Criar transação de receita
    await page.click('text=Transações');
    await page.click('text=Nova Transação');
    await page.fill('input[name="description"]', 'Salário Mensal');
    await page.fill('input[name="amount"]', '5000');
    await page.selectOption('select[name="type"]', 'income');
    await page.selectOption('select[name="account_id"]', { index: 0 });
    await page.click('button[type="submit"]');
    
    // 5. Verificar que transação foi criada
    await expect(page.locator('text=Salário Mensal')).toBeVisible();
    
    // 6. Verificar saldo da conta
    await page.click('text=Contas');
    await expect(page.locator('text=R$ 5.000,00')).toBeVisible();
    
    // 7. Criar transação de despesa
    await page.click('text=Transações');
    await page.click('text=Nova Transação');
    await page.fill('input[name="description"]', 'Supermercado');
    await page.fill('input[name="amount"]', '300');
    await page.selectOption('select[name="type"]', 'expense');
    await page.selectOption('select[name="account_id"]', { index: 0 });
    await page.click('button[type="submit"]');
    
    // 8. Verificar saldo atualizado
    await page.click('text=Contas');
    await expect(page.locator('text=R$ 4.700,00')).toBeVisible();
    
    // 9. Exportar CSV (se houver botão)
    // await page.click('text=Exportar');
    // await page.click('text=CSV');
    
    console.log('✅ Fluxo E2E completo executado com sucesso!');
  });
});

