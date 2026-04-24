/**
 * Utilitários compartilhados entre os testes E2E do FLUXY.
 */

/**
 * Realiza login diretamente via API (mais rápido que via UI).
 * Útil nos testes de autenticação onde o estado salvo não é usado.
 */
export async function loginViaAPI(request) {
  const email = process.env.ADMIN_EMAIL || 'admin@fluxy.com.br';
  const senha = process.env.ADMIN_SENHA || 'admin123';
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await request.post(`${apiURL}/api/login`, {
    data: { email, senha }
  });

  if (!response.ok()) {
    throw new Error(`Login via API falhou: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Realiza login via formulário da página de login.
 */
export async function loginViaUI(page, email, senha) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(senha);
  await page.locator('button[type="submit"]').click();
}

/**
 * Aguarda a página carregar completamente (sem spinner).
 */
export async function aguardarCarregamento(page, timeout = 8_000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Gera uma string única com timestamp para evitar conflitos nos testes.
 */
export function uid(prefix = 'teste') {
  return `${prefix}_${Date.now()}`;
}

/**
 * Formata data para o padrão do input date HTML (YYYY-MM-DD).
 */
export function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retorna uma data futura (N dias a partir de hoje) em formato YYYY-MM-DD.
 */
export function dataFutura(dias = 30) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}
