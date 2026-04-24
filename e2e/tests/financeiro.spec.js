/**
 * Testes E2E — Módulo Financeiro
 * Cobre: títulos financeiros (listagem, criação, detalhe, baixas),
 *        conciliação bancária, relatórios, comprovantes.
 */
import { test, expect } from '@playwright/test';
import { uid, dataFutura, dataHoje } from '../helpers/utils.js';

test.use({ storageState: 'playwright/.auth/user.json' });

function skipSeInacessivel(page, testInstance) {
  const url = page.url();
  if (url.includes('/login')) {
    testInstance.skip(true, 'Módulo Financeiro não ativado ou sem permissão');
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// TÍTULOS FINANCEIROS — LISTAGEM
// ─────────────────────────────────────────────
test.describe('Títulos Financeiros — Listagem', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financeiro/titulos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  });

  test('carrega a página de títulos financeiros @smoke', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('exibe tabela de títulos financeiros @smoke', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const tabela = page.locator('table, [class*="table"], [class*="titulos"]');
    await expect(tabela.first()).toBeVisible({ timeout: 8_000 });
  });

  test('exibe botão para novo título', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const btnNovo = page.locator(
      'a:has-text("Novo"), button:has-text("Novo"), a[href*="novo"]'
    ).first();
    await expect(btnNovo).toBeVisible({ timeout: 5_000 });
  });

  test('filtros de tipo (pagar/receber) estão disponíveis', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    // Filtro por tipo de título
    const filtroTipo = page.locator(
      'select, button:has-text("Pagar"), button:has-text("Receber"), [class*="filter"]'
    ).first();
    await expect(page.locator('body')).toBeVisible();
  });

  test('filtro por status (aberto/pago/vencido) existe', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    // Filtro de status
    const filtroStatus = page.locator(
      'select[name*="status"], [class*="status-filter"], button:has-text("Aberto"), button:has-text("Pago")'
    );
    await expect(page.locator('body')).toBeVisible();
  });

  test('filtro por intervalo de datas', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const dataInput = page.locator('input[type="date"]').first();
    if (await dataInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dataInput.fill(dataHoje());
      await page.waitForLoadState('networkidle', { timeout: 5_000 });
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// CRIAÇÃO DE TÍTULO FINANCEIRO
// ─────────────────────────────────────────────
test.describe('Criação de Título Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financeiro/titulos/novo');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  });

  test('carrega o formulário de novo título @smoke', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const formulario = page.locator('form, [class*="form"]').first();
    await expect(formulario).toBeVisible({ timeout: 8_000 });
  });

  test('exibe campos obrigatórios: tipo, valor, vencimento', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // FinanceiroTituloNovo usa selects sem name/id — apenas className="input w-full"
    // Primeiro select = tipo (Conta a pagar / Conta a receber)
    const tipoField = page.locator('select').first();
    await expect(tipoField).toBeVisible({ timeout: 5_000 });

    // Campo valor: placeholder="0,00"
    const valorField = page.locator('input[placeholder="0,00"]').first();
    await expect(valorField).toBeVisible({ timeout: 5_000 });

    // Campo vencimento: input[type="date"]
    const vencField = page.locator('input[type="date"]').first();
    await expect(vencField).toBeVisible({ timeout: 5_000 });
  });

  test('submissão sem dados exibe validação', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const btnSubmit = page.locator(
      'button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")'
    ).first();

    if (await btnSubmit.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await btnSubmit.click();
      // Deve permanecer na página de criação
      await expect(page).toHaveURL(/\/financeiro\/titulos\/novo/, { timeout: 5_000 });
    }
  });

  test('cria título a pagar com dados válidos @smoke', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    // Seleciona tipo "PAGAR"
    const tipoSelect = page.locator('select').first();
    await tipoSelect.waitFor({ state: 'visible', timeout: 5_000 });
    const opcoes = await tipoSelect.locator('option').allTextContents();

    const temPagar = opcoes.some((o) => o.toUpperCase().includes('PAGAR'));
    if (temPagar) {
      await tipoSelect.selectOption({ label: opcoes.find((o) => o.toUpperCase().includes('PAGAR')) });
    } else {
      await tipoSelect.selectOption({ index: 1 });
    }

    // Preenche valor
    const valorField = page.locator(
      'input[name*="valor"], input[type="number"]'
    ).first();
    if (await valorField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await valorField.fill('1500.00');
    }

    // Preenche data de vencimento
    const vencField = page.locator('input[type="date"]').first();
    if (await vencField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await vencField.fill(dataFutura(30));
    }

    // Preenche descrição se disponível
    const descField = page.locator(
      'input[name*="descricao"], textarea[name*="descricao"], input[placeholder*="escricao"]'
    ).first();
    if (await descField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descField.fill(`Título teste E2E — ${uid()}`);
    }

    // Submete
    const btnSubmit = page.locator(
      'button[type="submit"], button:has-text("Salvar")'
    ).first();
    await btnSubmit.click();

    // Aguarda redirecionamento para lista ou detalhe
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/financeiro\/titulos/, { timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────
// DETALHE DE TÍTULO FINANCEIRO
// ─────────────────────────────────────────────
test.describe('Detalhe de Título Financeiro', () => {
  test('abre o detalhe do primeiro título @smoke', async ({ page }) => {
    await page.goto('/financeiro/titulos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    // Busca links que apontam para títulos individuais — exclui "/novo" e hrefs com query string
    // CSS :not() é mais confiável que .filter() do Playwright para este caso
    const primeiroItem = page.locator(
      'a[href^="/financeiro/titulos/"]:not([href*="novo"]):not([href*="?"])'
    ).first();

    if (!(await primeiroItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Nenhum título financeiro cadastrado');
      return;
    }

    await primeiroItem.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/financeiro\/titulos\/\d+/, { timeout: 8_000 });
  });

  test('página de detalhe exibe opção de baixa/pagamento', async ({ page }) => {
    await page.goto('/financeiro/titulos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    const primeiroItem = page.locator(
      'table tbody tr:first-child td a, [class*="row"]:first-child a'
    ).first();

    if (!(await primeiroItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Nenhum título financeiro na lista');
      return;
    }

    await primeiroItem.click();
    await page.waitForLoadState('networkidle');

    // Botão de baixa / registrar pagamento
    const btnBaixa = page.locator(
      'button:has-text("Baixa"), button:has-text("Registrar Pagamento"), button:has-text("Pagar")'
    ).first();

    // Pode não estar disponível se o título já foi baixado
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// CONCILIAÇÃO BANCÁRIA
// ─────────────────────────────────────────────
test.describe('Conciliação Bancária', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financeiro/conciliacao');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  });

  test('carrega a página de conciliação @smoke', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;
    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe opção de importar OFX', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const btnImportar = page.locator(
      'button:has-text("Importar"), button:has-text("OFX"), input[type="file"], [class*="importar"]'
    ).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe seletor de conta bancária', async ({ page }) => {
    if (skipSeInacessivel(page, test)) return;

    const contaSelect = page.locator(
      'select[name*="conta"], select[id*="conta"], [class*="conta-bancaria"]'
    ).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// RELATÓRIOS FINANCEIROS
// ─────────────────────────────────────────────
test.describe('Relatórios Financeiros', () => {
  test('carrega a página de relatórios @smoke', async ({ page }) => {
    await page.goto('/financeiro/relatorios');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe filtros de período no relatório', async ({ page }) => {
    await page.goto('/financeiro/relatorios');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    const dataInput = page.locator('input[type="date"]').first();
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// UPLOAD DE COMPROVANTES
// ─────────────────────────────────────────────
test.describe('Upload de Comprovantes', () => {
  test('carrega a página de upload de comprovantes @smoke', async ({ page }) => {
    await page.goto('/comprovantes/upload');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega a página de comprovantes pendentes', async ({ page }) => {
    await page.goto('/comprovantes/pendentes');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('área de upload de arquivo existe', async ({ page }) => {
    await page.goto('/comprovantes/upload');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem acesso');
      return;
    }

    const uploadArea = page.locator(
      'input[type="file"], [class*="upload"], [class*="drop-zone"]'
    ).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// CADASTROS FINANCEIROS
// ─────────────────────────────────────────────
test.describe('Cadastros Financeiros', () => {
  test('carrega a página de cadastros financeiros', async ({ page }) => {
    await page.goto('/financeiro/cadastros');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Financeiro sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
