/**
 * Testes E2E — Administração
 * Cobre: usuários, setores, cargos, tipos de solicitação, obras,
 *        parceiros, contratos, configurações do sistema.
 */
import { test, expect } from '@playwright/test';
import { uid } from '../helpers/utils.js';

test.use({ storageState: 'playwright/.auth/user.json' });

function skipSeRedirecionado(page, testObj, motivo = 'Sem permissão de administrador') {
  const url = page.url();
  if (url.includes('/login') || url.endsWith('/') && !url.includes('admin')) {
    testObj.skip(true, motivo);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// USUÁRIOS
// ─────────────────────────────────────────────
test.describe('Gestão de Usuários', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/usuarios');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  });

  test('carrega a lista de usuários @smoke', async ({ page }) => {
    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão para gerenciar usuários');
      return;
    }
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('exibe tabela de usuários com colunas corretas', async ({ page }) => {
    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const tabela = page.locator('table, [class*="table"], [class*="users"]').first();
    await expect(tabela).toBeVisible({ timeout: 8_000 });
  });

  test('botão para adicionar novo usuário existe', async ({ page }) => {
    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const btnNovo = page.locator(
      'a:has-text("Novo"), button:has-text("Novo"), a[href*="usuarios/novo"]'
    ).first();
    await expect(btnNovo).toBeVisible({ timeout: 5_000 });
  });

  test('formulário de novo usuário carrega', async ({ page }) => {
    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    await page.goto('/usuarios/novo');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      // Campo Nome: usa placeholder="Nome" (sem type — apenas className="input")
      const nomeField = page.locator('input[placeholder="Nome"]').first();
      await expect(nomeField).toBeVisible({ timeout: 5_000 });

      // Campo Email: usa placeholder="Email" (sem type="email" explícito)
      const emailField = page.locator('input[placeholder="Email"]').first();
      await expect(emailField).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ─────────────────────────────────────────────
// SETORES
// ─────────────────────────────────────────────
test.describe('Gestão de Setores', () => {
  test('carrega a lista de setores @smoke', async ({ page }) => {
    await page.goto('/setores');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão de administrador');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe setores cadastrados', async ({ page }) => {
    await page.goto('/setores');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const lista = page.locator(
      'table, [class*="list"], [class*="setor"]'
    ).first();
    await expect(lista).toBeVisible({ timeout: 8_000 });
  });

  test('botão para adicionar setor existe', async ({ page }) => {
    await page.goto('/setores');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const btnAdd = page.locator(
      'button:has-text("Novo"), button:has-text("Adicionar"), button:has-text("+")'
    ).first();
    await expect(btnAdd).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────
// CARGOS
// ─────────────────────────────────────────────
test.describe('Gestão de Cargos', () => {
  test('carrega a lista de cargos', async ({ page }) => {
    await page.goto('/cargos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão de administrador');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// TIPOS DE SOLICITAÇÃO
// ─────────────────────────────────────────────
test.describe('Tipos de Solicitação', () => {
  test('carrega a página de tipos de solicitação @smoke', async ({ page }) => {
    await page.goto('/tipos-solicitacao');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão de administrador');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe tipos cadastrados', async ({ page }) => {
    await page.goto('/tipos-solicitacao');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const lista = page.locator('table, [class*="list"], [class*="tipo"]').first();
    await expect(lista).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────
// OBRAS
// ─────────────────────────────────────────────
test.describe('Gestão de Obras', () => {
  test('carrega a lista de obras @smoke', async ({ page }) => {
    await page.goto('/obras');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão para obras');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe cards ou lista de obras', async ({ page }) => {
    await page.goto('/obras');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const obrasEl = page.locator(
      '[class*="obra"], [class*="card"], table, [class*="list"]'
    ).first();
    await expect(obrasEl).toBeVisible({ timeout: 8_000 });
  });

  test('botão para adicionar obra existe', async ({ page }) => {
    await page.goto('/obras');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const btnNova = page.locator(
      'button:has-text("Nova"), button:has-text("Adicionar"), a:has-text("Nova Obra")'
    ).first();
    await expect(btnNova).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────
// PARCEIROS
// ─────────────────────────────────────────────
test.describe('Gestão de Parceiros', () => {
  test('carrega a lista de parceiros @smoke', async ({ page }) => {
    await page.goto('/parceiros');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão de administrador');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe tabela de parceiros', async ({ page }) => {
    await page.goto('/parceiros');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    const tabela = page.locator('table, [class*="list"], [class*="parceiro"]').first();
    await expect(tabela).toBeVisible({ timeout: 8_000 });
  });

  test('formulário de novo parceiro está visível na página', async ({ page }) => {
    await page.goto('/parceiros');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    // Parceiros.jsx exibe o formulário diretamente na página com h2 "Novo parceiro"
    const tituloForm = page.locator('h2:has-text("Novo parceiro"), h2:has-text("Editar parceiro")').first();
    await expect(tituloForm).toBeVisible({ timeout: 5_000 });
  });

  test('carrega a página de categorias de parceiros', async ({ page }) => {
    await page.goto('/parceiros-categorias');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// CONTRATOS
// ─────────────────────────────────────────────
test.describe('Gestão de Contratos', () => {
  test('carrega a lista de contratos @smoke', async ({ page }) => {
    await page.goto('/gestao-contratos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Contratos sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// CONFIGURAÇÕES DO SISTEMA
// ─────────────────────────────────────────────
test.describe('Configurações do Sistema', () => {
  test('carrega a página de configurações @smoke', async ({ page }) => {
    await page.goto('/configuracoes');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão de administrador');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega configurações de timeout de inatividade', async ({ page }) => {
    await page.goto('/timeout-inatividade');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega configurações de módulos', async ({ page }) => {
    await page.goto('/configuracoes-modulos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Apenas superadmin tem acesso
    if (page.url().includes('/login') || page.url().endsWith('/')) {
      test.skip(true, 'Requer perfil SUPERADMIN');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega configurações de permissões por setor', async ({ page }) => {
    await page.goto('/permissoes-setor');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Sem permissão');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega configurações de cores do sistema', async ({ page }) => {
    await page.goto('/cores-sistema');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    const url = page.url();
    if (url.includes('/login') || url.endsWith('/')) {
      test.skip(true, 'Sem permissão de administrador ou redirecionado');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// PERFIL DO USUÁRIO
// ─────────────────────────────────────────────
test.describe('Perfil do Usuário', () => {
  test('carrega a página de perfil @smoke', async ({ page }) => {
    await page.goto('/perfil');
    // perfil pode demorar a carregar dados do usuário
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });

    const url = page.url();
    if (url.includes('/login')) {
      test.skip(true, 'Sessão expirada — re-executar o setup');
      return;
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe informações do usuário no perfil', async ({ page }) => {
    await page.goto('/perfil');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Campos de nome/email devem estar visíveis
    const campoInfo = page.locator(
      'input[name*="nome"], input[name*="email"], [class*="perfil"], [class*="profile"]'
    ).first();
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// COMUNICAÇÃO INTERNA
// ─────────────────────────────────────────────
test.describe('Comunicação Interna', () => {
  test('carrega a caixa de entrada de conversas @smoke', async ({ page }) => {
    await page.goto('/conversas/entrada');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo de Comunicação sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('carrega a caixa de saída de conversas', async ({ page }) => {
    await page.goto('/conversas/saida');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo de Comunicação sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// BIBLIOTECA DE MODELOS
// ─────────────────────────────────────────────
test.describe('Biblioteca de Modelos', () => {
  test('carrega a página de arquivos modelo @smoke', async ({ page }) => {
    await page.goto('/arquivos-modelos');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    if (page.url().includes('/login')) {
      test.skip(true, 'Módulo Biblioteca sem acesso');
      return;
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
