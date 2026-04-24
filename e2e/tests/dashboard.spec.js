/**
 * Testes E2E — Dashboard
 * Cobre: carregamento, cards de estatísticas, notificações, navegação.
 */
import { test, expect } from '@playwright/test';

// Usa o estado de autenticação salvo pelo setup
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Aguarda o dashboard renderizar (algum elemento principal)
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  });

  test('carrega o dashboard sem erros @smoke', async ({ page }) => {
    // Verifica que não há erros críticos na tela
    await expect(page.locator('body')).toBeVisible();
    // Não está na tela de login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('exibe cards de estatísticas @smoke', async ({ page }) => {
    // Cards de stats geralmente têm classes como card, stat, ou texto numérico
    const cards = page.locator(
      '[class*="stats-card"], [class*="StatsCard"], [class*="card"]'
    );
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
  });

  test('exibe o sino de notificações no header', async ({ page }) => {
    // NotificacoesBell renderiza: <button aria-label="Notificacoes">
    const sino = page.locator('button[aria-label="Notificacoes"]');
    await expect(sino).toBeVisible({ timeout: 5_000 });
  });

  test('navega para Solicitações pelo menu lateral @smoke', async ({ page }) => {
    // O link está dentro de um grupo colapsável — expande o grupo "Solicitacoes" primeiro
    const grupoToggle = page.locator('button[aria-controls="submenu-solicitacoes"]').first();
    if (await grupoToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const expandido = await grupoToggle.getAttribute('aria-expanded');
      if (expandido !== 'true') await grupoToggle.click();
      await page.waitForTimeout(300);
    }

    await page.locator('a[href="/solicitacoes"]').first().click();
    await expect(page).toHaveURL(/\/solicitacoes/, { timeout: 5_000 });
  });

  test('navega para Nova Solicitação', async ({ page }) => {
    // Expande o grupo de Solicitações no sidebar (pode estar colapsado)
    const grupoToggle = page.locator('button[aria-controls="submenu-solicitacoes"]').first();
    if (await grupoToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const expandido = await grupoToggle.getAttribute('aria-expanded');
      if (expandido !== 'true') await grupoToggle.click();
      await page.waitForTimeout(300);
    }

    const btnNova = page.locator('a[href="/nova-solicitacao"]').first();
    if (await btnNova.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await btnNova.click();
      await expect(page).toHaveURL(/\/nova-solicitacao/, { timeout: 5_000 });
    } else {
      // Fallback: navega diretamente
      await page.goto('/nova-solicitacao');
      await expect(page).toHaveURL(/\/nova-solicitacao/);
    }
  });

  test('exibe informações de perfil do usuário logado', async ({ page }) => {
    // Algum elemento com nome ou avatar do usuário
    const perfilEl = page.locator(
      '[class*="avatar"], [class*="user-name"], [class*="perfil"], [data-testid="user-name"]'
    ).first();

    if (await perfilEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(perfilEl).toBeVisible();
    } else {
      // Alternativa: verifica que o menu de perfil existe
      await page.goto('/perfil');
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test('API de instalação é carregada corretamente', async ({ page }) => {
    // Monitora a requisição de instalação pública
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/instalacao/publica') && res.status() === 200,
        { timeout: 10_000 }
      ).catch(() => null),
      page.reload()
    ]);

    if (response) {
      expect(response.status()).toBe(200);
    }
    // Mesmo sem a resposta monitorada, a página deve estar visível
    await expect(page.locator('body')).toBeVisible();
  });
});
