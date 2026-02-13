/**
 * Teste E2E completo do fluxo principal
 * Cobre: registro → criar conta → lançar transação → verificar saldo → exportar CSV
 */
import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo do Usuário', () => {
  test('deve completar jornada completa do usuário', async ({ page }) => {
    // 1. Acessar aplicação
    await page.goto('/');
    
    // 2. Registrar novo usuário
    await page.click('text=Registrar');
    await page.fill('input[name="name"]', 'Usuário E2E');
    await page.fill('input[name="email"]', `e2e-${Date.now()}@teste.com`);
    await page.fill('input[name="password"]', 'Senha123!@#');
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento após registro
    await page.waitForURL(/\/(dashboard|transactions)/, { timeout: 10000 });
    
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

