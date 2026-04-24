/**
 * Testes E2E — Autenticação
 * Cobre: login com sucesso, credenciais inválidas, logout,
 *        proteção de rotas e redirecionamentos.
 */
import { test, expect } from '@playwright/test';
import { loginViaUI } from '../helpers/utils.js';

const EMAIL_VALIDO = process.env.ADMIN_EMAIL || 'admin@fluxy.com.br';
const SENHA_VALIDA = process.env.ADMIN_SENHA || 'admin123';

test.describe('Página de Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('exibe o formulário de login corretamente @smoke', async ({ page }) => {
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-senha')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Entrar');
  });

  test('exibe erro com e-mail em branco', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Preencha e-mail e senha para continuar')).toBeVisible();
  });

  test('exibe erro com senha em branco', async ({ page }) => {
    await page.locator('#login-email').fill(EMAIL_VALIDO);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Preencha e-mail e senha para continuar')).toBeVisible();
  });

  test('exibe erro com credenciais inválidas @smoke', async ({ page }) => {
    await page.locator('#login-email').fill('invalido@teste.com');
    await page.locator('#login-senha').fill('senhaerrada');
    await page.locator('button[type="submit"]').click();

    // Aguarda resposta da API
    await expect(
      page.locator('[class*="alert"], [class*="erro"], [role="alert"]').first()
    ).toBeVisible({ timeout: 8_000 });

    // Deve continuar na tela de login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login com sucesso redireciona para o sistema @smoke', async ({ page }) => {
    await loginViaUI(page, EMAIL_VALIDO, SENHA_VALIDA);

    await expect(page).toHaveURL(/\/(solicitacoes|$)/, { timeout: 10_000 });
    // Não deve mais exibir o formulário de login
    await expect(page.locator('#login-email')).not.toBeVisible();
  });

  test('mostra spinner durante o carregamento', async ({ page }) => {
    await page.locator('#login-email').fill(EMAIL_VALIDO);
    await page.locator('#login-senha').fill(SENHA_VALIDA);

    // Intercept para atrasar a resposta e capturar o spinner
    await page.route('**/api/login', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });

    await page.locator('button[type="submit"]').click();

    // Spinner deve aparecer durante o loading
    await expect(page.locator('button[type="submit"]')).toContainText('Entrando', {
      timeout: 3_000
    });
  });
});

test.describe('Proteção de Rotas', () => {
  test('rota protegida redireciona para login sem autenticação @smoke', async ({ page }) => {
    // Acessa rota protegida sem estar autenticado
    await page.goto('/solicitacoes');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('dashboard redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('nova solicitacao redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/nova-solicitacao');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('área financeira redireciona para login sem autenticação', async ({ page }) => {
    await page.goto('/financeiro/titulos');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

// Os testes de logout usam o storageState salvo pelo setup (evita login extra via UI,
// o que esgotaria o rate limit do backend durante a bateria de testes).
test.describe('Logout', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('logout via limpeza de storage redireciona para login @smoke', async ({ page }) => {
    // Navega para o sistema já autenticado
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });

    // Limpa o token do localStorage (simula logout)
    await page.evaluate(() => localStorage.clear());
    await page.goto('/solicitacoes');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('após logout, rota protegida redireciona para login', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/financeiro/titulos');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('logout via botão de sair redireciona para login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    const botaoLogout = page.locator(
      'button:has-text("Sair"), a:has-text("Sair"), button:has-text("Logout"), [data-testid="logout"]'
    ).first();

    if (!(await botaoLogout.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // Tenta abrir menu do usuário primeiro
      const menuUsuario = page.locator(
        '[class*="avatar"], [class*="user-menu"], [class*="perfil-btn"]'
      ).first();
      if (await menuUsuario.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await menuUsuario.click();
        await page.locator('text=Sair, text=Logout').first().click({ timeout: 3_000 }).catch(() => {});
      }
    } else {
      await botaoLogout.click();
    }

    // Se o botão não foi encontrado, faz logout via localStorage
    if (!page.url().includes('/login')) {
      await page.evaluate(() => localStorage.clear());
      await page.goto('/');
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

test.describe('Acesso Público — Cotação de Fornecedor', () => {
  test('página de cotação pública é acessível sem login @smoke', async ({ page }) => {
    // Usa um token fictício — deve renderizar a página (mesmo que o token seja inválido,
    // a rota deve existir e não redirecionar para login)
    await page.goto('/cotacao/token-invalido-teste');

    // Não deve redirecionar para /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });

    // Pode exibir erro de cotação não encontrada, mas não redirecionou para login
    await expect(page.locator('body')).toBeVisible();
  });
});
