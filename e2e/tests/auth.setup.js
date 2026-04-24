/**
 * Setup de autenticação — executa antes dos testes para salvar o estado de login.
 * O estado é reutilizado por todos os testes, evitando login repetido.
 *
 * Reutiliza o user.json existente enquanto o JWT ainda for válido (8h),
 * evitando hits desnecessários ao rate limit do backend (5 tentativas/15min).
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');

function tokenAindaValido() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return false;
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    const ls = state?.origins?.[0]?.localStorage ?? [];
    const tokenEntry = ls.find((e) => e.name === 'token');
    if (!tokenEntry?.value) return false;
    const payload = JSON.parse(Buffer.from(tokenEntry.value.split('.')[1], 'base64').toString());
    // Válido se ainda tiver mais de 10 minutos de vida
    return payload.exp * 1000 > Date.now() + 10 * 60 * 1000;
  } catch {
    return false;
  }
}

setup('autenticar como administrador', async ({ page }) => {
  if (tokenAindaValido()) {
    console.log('[auth.setup] Token ainda válido — reutilizando user.json existente.');
    return;
  }

  const email = process.env.ADMIN_EMAIL || 'admin@fluxy.local';
  const senha = process.env.ADMIN_SENHA || 'admin123';

  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(senha);
  await page.locator('button[type="submit"]').click();

  // Superadmin vai para / (dashboard), outros perfis para /solicitacoes
  await expect(page).toHaveURL(/http:\/\/localhost:5173\/(solicitacoes)?$/, { timeout: 10_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
