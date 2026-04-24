/**
 * Setup de autenticação — executa antes dos testes para salvar o estado de login.
 * O estado é reutilizado por todos os testes, evitando login repetido.
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');

setup('autenticar como administrador', async ({ page }) => {
  const email = process.env.ADMIN_EMAIL || 'admin@fluxy.com.br';
  const senha = process.env.ADMIN_SENHA || 'admin123';

  await page.goto('/login');

  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(senha);
  await page.locator('button[type="submit"]').click();

  // Aguarda redirecionar para dashboard ou solicitações após login
  await expect(page).toHaveURL(/\/(solicitacoes)?$/, { timeout: 10_000 });

  // Salva o estado (cookies + localStorage) para reutilização
  await page.context().storageState({ path: AUTH_FILE });
});
