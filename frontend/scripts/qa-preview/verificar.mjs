/**
 * HARNESS DE QA VISUAL CONTRA O PREVIEW PUBLICADO
 * ============================================================================
 * Abre https://refactor-dev.jrfluxy.com.br, faz login com o usuário de QA e
 * verifica CADA tela do manifesto (telas.mjs) contra a Definição de Pronto
 * (docs/DEFINICAO-DE-PRONTO.md), com os DADOS REAIS do ambiente de dev.
 *
 * Regras de operação:
 * - Credenciais SOMENTE das variáveis de ambiente QA_PREVIEW_USER e
 *   QA_PREVIEW_PASS. Sem elas, aborta. A senha NUNCA vai para arquivo,
 *   log ou captura.
 * - SOMENTE navegação e leitura: nenhum registro é criado/alterado/apagado
 *   (modais são abertos e fechados sem submit; arrasto de coluna e filtro
 *   só tocam localStorage do navegador descartável do harness).
 * - Após um push, use --esperar-sha <sha> (ou --esperar-head) para aguardar
 *   o deploy da Vercel servir o commit (window.__FLUXY_BUILD__). Verificar
 *   build velho é o mesmo que não verificar.
 *
 * Saídas:
 * - docs/MATRIZ-COBERTURA.md (gerada — NUNCA editar à mão)
 * - scripts/qa-preview/saida/capturas/<tela>/{1920,1366,390}.png
 * - scripts/qa-preview/saida/relatorio.md + relatorio.json
 *
 * Uso:  node scripts/qa-preview/verificar.mjs [--esperar-head|--esperar-sha X]
 *       [--telas id1,id2] [--sem-capturas] [--base https://...]
 */
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TELAS, ITENS_DOD } from './telas.mjs';
import { checksEstaticos, checkFaixaRolada, checksMobile, checkStickyEAcessibilidade } from './checks.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = path.resolve(AQUI, '..', '..');
const RAIZ_REPO = path.resolve(RAIZ_FRONT, '..');
const SAIDA = path.join(AQUI, 'saida');
const CAPTURAS = path.join(SAIDA, 'capturas');

/* ---------------------------------------------------------------- CLI/env */
const args = process.argv.slice(2);
const flag = (nome) => args.includes(nome);
const valorDe = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : null;
};

const BASE = valorDe('--base') || 'https://refactor-dev.jrfluxy.com.br';
const USUARIO = process.env.QA_PREVIEW_USER;
const SENHA = process.env.QA_PREVIEW_PASS;

if (!USUARIO || !SENHA) {
  console.error(
    '[qa-preview] ABORTADO: defina QA_PREVIEW_USER e QA_PREVIEW_PASS no '
    + 'ambiente. As credenciais de QA vivem SOMENTE em variáveis de ambiente '
    + '— nunca em arquivo do repositório.'
  );
  process.exit(2);
}

const filtroTelas = valorDe('--telas')?.split(',').map((s) => s.trim()).filter(Boolean);
const capturar = !flag('--sem-capturas');

let shaEsperado = valorDe('--esperar-sha');
if (flag('--esperar-head')) {
  shaEsperado = execSync('git rev-parse HEAD', { cwd: RAIZ_REPO, encoding: 'utf8' }).trim();
}

/* -------------------------------------------------------------- utilidades */
const agora = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

function fundir(alvo, parcial) {
  Object.entries(parcial || {}).forEach(([k, v]) => { alvo[k] = v; });
}

async function esperarCarregar(page) {
  await page.waitForLoadState('domcontentloaded');
  // Espera o conteúdo real: some o "Carregando" e exista a página padrão.
  await page.waitForFunction(() => {
    const carregando = /carregando/i.test(document.body.innerText.slice(0, 4000));
    const pronta = document.querySelector('.app-pagina, .app-page-header, .page');
    return pronta && !carregando;
  }, null, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1200); // medições de largura pós-mount
}

/* --------------------------------------------------------------- TOTP ----
   Se a política do ambiente exigir MFA para o usuário de QA, o segredo TOTP
   pode ser fornecido em QA_PREVIEW_TOTP (base32) — também SÓ por variável
   de ambiente, nunca em arquivo. */
function codigoTotp(segredoBase32) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const limpo = segredoBase32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of limpo) bits += alfabeto.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = crypto.createHmac('sha1', bytes).update(contador).digest();
  const off = hmac[hmac.length - 1] & 0xf;
  const cod = ((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3];
  return String(cod % 1000000).padStart(6, '0');
}

/* ------------------------------------------------------------------ login */
async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[autocomplete="email"], input[type="email"]').first();
  await email.waitFor({ timeout: 30000 });
  await email.fill(USUARIO);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(SENHA);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45000 }).catch(() => {}),
    page.getByRole('button', { name: /entrar/i }).last().click()
  ]);
  // Desafio de MFA no caminho? Usa o TOTP de QA_PREVIEW_TOTP; sem ele,
  // bloqueio — o harness não tem o segundo fator.
  const mfa = await page.locator('input[autocomplete="one-time-code"]').count();
  if (mfa > 0) {
    if (!process.env.QA_PREVIEW_TOTP) {
      throw new Error('BLOQUEIO: o login do usuário de QA pediu código MFA e QA_PREVIEW_TOTP não está definido. Isente o usuário de QA da política de MFA ou forneça o segredo TOTP na variável.');
    }
    await page.locator('input[autocomplete="one-time-code"]').fill(codigoTotp(process.env.QA_PREVIEW_TOTP));
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {}),
      page.getByRole('button', { name: /confirmar|validar|entrar/i }).last().click()
    ]);
  }
  if (page.url().includes('/login')) {
    const texto = (await page.locator('body').innerText()).slice(0, 400).replace(/\n+/g, ' ');
    throw new Error(`BLOQUEIO: login não avançou (ainda em /login). Tela diz: "${texto}"`);
  }
  // Política de MFA pendente tranca TODAS as rotas em /perfil (PrivateRoute).
  await page.waitForTimeout(1500);
  if (new URL(page.url()).pathname === '/perfil') {
    const pendente = await page.evaluate(() => /autenticação em dois fatores|configurar mfa|segundo fator/i.test(document.body.innerText));
    if (pendente) {
      throw new Error('BLOQUEIO: a política do ambiente exige MFA e o usuário de QA está com a configuração PENDENTE — toda rota redireciona para /perfil. Isente o usuário qa.visual@fluxy.local da política de MFA (ou configure o TOTP e forneça o segredo em QA_PREVIEW_TOTP).');
    }
  }
  console.log('[qa-preview] login ok como', USUARIO);
}

/* ----------------------------------------------- espera do deploy (Vercel) */
async function esperarDeploy(page) {
  if (!shaEsperado) return;
  const limite = Date.now() + 15 * 60 * 1000;
  process.stdout.write(`[qa-preview] aguardando deploy do commit ${shaEsperado.slice(0, 8)} `);
  for (;;) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1500);
    const sha = await page.evaluate(() => window.__FLUXY_BUILD__ || '').catch(() => '');
    if (sha && (sha.startsWith(shaEsperado) || shaEsperado.startsWith(sha))) {
      console.log(`\n[qa-preview] deploy confirmado: build ${sha.slice(0, 8)}`);
      return;
    }
    if (Date.now() > limite) {
      throw new Error(`BLOQUEIO: 15min e o preview não serviu o commit ${shaEsperado.slice(0, 8)} (marca atual: "${sha || 'sem marca — build antigo'}"). Verifique o deploy da Vercel.`);
    }
    process.stdout.write('.');
    await page.waitForTimeout(20000);
  }
}

/* --------------------------------------- resolvedores de rota de registro */
const RESOLVEDORES = {
  /** Abre o título financeiro de MAIOR valor real (pior caso — T6/T7). */
  async tituloDetalhe(page) {
    await page.goto(`${BASE}/financeiro/titulos`, { waitUntil: 'domcontentloaded' });
    await esperarCarregar(page);
    // A consulta de títulos só carrega ao CONSULTAR (deliberado na tela).
    const consultar = page.getByRole('button', { name: /consultar/i }).first();
    if (await consultar.count()) {
      await consultar.click();
      await page.waitForTimeout(2500);
    }
    await page.locator('a[href^="/financeiro/titulos/"]:not([href*="novo"])').first().waitFor({ timeout: 30000 });
    const rota = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href^="/financeiro/titulos/"]'))
        .filter((a) => /^\/financeiro\/titulos\/\d+$/.test(a.getAttribute('href')));
      let melhor = links[0]; let maior = -1;
      links.forEach((a) => {
        const linha = a.closest('tr') || a;
        const m = String(linha.textContent).match(/R\$\s?([\d.]+,\d{2})/);
        const v = m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : 0;
        if (v > maior) { maior = v; melhor = a; }
      });
      return melhor ? melhor.getAttribute('href') : null;
    });
    if (!rota) throw new Error('nenhum título encontrado na listagem para abrir o detalhe');
    await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
    return rota;
  },
  /** Abre a obra de MAIOR VGV real (pior caso de valor monetário — T7). */
  async obraGestao(page) {
    await page.goto(`${BASE}/obras`, { waitUntil: 'domcontentloaded' });
    await esperarCarregar(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
    const indice = await page.evaluate(() => {
      const linhas = Array.from(document.querySelectorAll('tbody tr'));
      let melhor = 0; let maior = -1;
      linhas.forEach((tr, i) => {
        const m = tr.innerText.match(/R\$\s?([\d.]+,\d{2})/);
        if (!m) return;
        const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        if (v > maior) { maior = v; melhor = i; }
      });
      return melhor;
    });
    await page.locator('tbody tr').nth(indice).click();
    await page.waitForURL(/\/obras\/\d+/, { timeout: 30000 });
    return new URL(page.url()).pathname;
  }
};

/* --------------------------------------------------- validador estático M2 */
function rodarValidadorEstatico() {
  try {
    const saida = execSync('node scripts/validarLayout.mjs', {
      cwd: RAIZ_FRONT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, saida };
  } catch (erro) {
    return { ok: false, saida: `${erro.stdout || ''}${erro.stderr || ''}` };
  }
}

/**
 * R3 — nenhum `alert()`/`confirm()` do navegador (DoD, 02/09).
 *
 * Duas medidas somadas, porque nenhuma sozinha basta:
 *  - RUNTIME: o spy de `dialog` da página. Pega o que dispara de verdade no
 *    preview durante carga e navegação — inclusive o `catch { alert(...) }`
 *    de erro de carregamento, que aparece sem o usuário pedir nada.
 *  - ESTÁTICO: a R19 do validador sobre o arquivo da tela. É exaustiva
 *    (pega o alert do salvar e do excluir, que o harness não exercita
 *    porque é só navegação e leitura no ambiente compartilhado).
 */
const TRINCO_DIALOGOS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(RAIZ_FRONT, 'scripts', 'trinco-dialogos.json'), 'utf8')).arquivos || {};
  } catch {
    return {};
  }
})();

function r3Para(arquivo, validador, caixas) {
  if (caixas.length) {
    const lista = caixas.map((c) => `${c.tipo}: "${String(c.mensagem).slice(0, 80)}"`).join('; ');
    return { estado: 'FALHOU', motivo: `caixa do navegador disparou na tela — ${lista}` };
  }
  // A saída do validador é texto; a linha da R19 traz o arquivo e o motivo.
  // FALHA (arquivo novo/contagem que subiu) e AVISO (passivo herdado que
  // ainda existe, só congelado no trinco) reprovam igual AQUI: o trinco
  // segura o build do sistema inteiro, não absolve a tela da leva.
  const linhas = String(validador?.saida || '')
    .split('\n')
    .filter((l) => l.includes('[R19]') && l.includes(arquivo));
  if (linhas.length) {
    return { estado: 'FALHOU', motivo: `R19 estático: ${linhas[0].trim().slice(0, 200)}` };
  }
  // Sem linha da R19 pode ser "zerou" OU "está congelado e igual ao trinco"
  // — o trinco não emite nada quando a contagem bate. Então lê o próprio
  // trinco: arquivo listado lá ainda tem caixa do navegador.
  if (TRINCO_DIALOGOS[arquivo] !== undefined) {
    return {
      estado: 'FALHOU',
      motivo: `arquivo ainda no trinco herdado da R19 com ${TRINCO_DIALOGOS[arquivo]} chamada(s) de alert()/confirm()`
    };
  }
  return {
    estado: 'PASSOU',
    motivo: 'sem caixa do navegador na carga (runtime) e sem alert()/confirm() no arquivo (R19 estático)'
  };
}


function m2Para(arquivo, validador) {
  if (validador.ok) return { estado: 'PASSOU' };
  const linhas = validador.saida.split('\n').filter((l) => l.includes(arquivo));
  return linhas.length
    ? { estado: 'FALHOU', motivo: `validador estático: ${linhas[0].trim().slice(0, 160)}` }
    : { estado: 'PASSOU' };
}

/* -------------------------------------------------- checks interativos ---- */
async function checarFaixa(page, resultado) {
  // Estado normal (topo): existe faixa?
  const existeFaixa = await page.locator('.layout-main .app-page-header').count();
  if (!existeFaixa) {
    resultado.C1 = { estado: 'FALHOU', motivo: 'faixa .app-page-header ausente' };
    return;
  }
  const alturaPagina = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
  if (alturaPagina < 120) {
    // Sem rolagem suficiente para grudar: mede geometria parada mesmo assim.
    resultado.C1 = { estado: 'PASSOU', motivo: 'página sem rolagem — faixa presente, sem estado grudado a medir' };
    return;
  }
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(450);
  const geo = await page.evaluate(checkFaixaRolada);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  const problemas = [];
  if (!geo.ok) problemas.push(geo.motivo);
  else {
    if (!geo.visivel) problemas.push('faixa sumiu na rolagem');
    if (geo.vao > 1) problemas.push(`vão de ${geo.vao}px entre a topbar e a faixa${geo.conteudoNoVao ? ` com conteúdo visível (${geo.conteudoNoVao})` : ''}`);
    if (geo.vao < -4) problemas.push(`faixa sobrepõe a topbar em ${-geo.vao}px`);
    if (!geo.opaca) problemas.push('faixa com fundo não opaco');
    if (geo.padrao) {
      if (!geo.compacto) problemas.push('faixa não compactou na rolagem');
      if (geo.alturaFaixa > 72) problemas.push(`faixa compacta com ${geo.alturaFaixa}px de altura (muito vazio para uma linha)`);
    }
  }
  resultado.C1 = problemas.length
    ? { estado: 'FALHOU', motivo: problemas.join('; ') }
    : { estado: 'PASSOU' };
}

async function checarAffordanceAlinhamento(page, resultado) {
  if (resultado.T2?.estado !== 'PASSOU') return; // estático já reprovou/N-A
  const th = page.locator('.resizable-th:has(.app-th-alinhavel)').first();
  if (!(await th.count())) return;
  await th.hover().catch(() => {});
  await page.waitForTimeout(250);
  const opacidade = await th.locator('.app-th-alinhar').first()
    .evaluate((el) => parseFloat(getComputedStyle(el).opacity)).catch(() => 0);
  if (opacidade < 0.5) {
    resultado.T2 = { estado: 'FALHOU', motivo: `affordance do alinhamento não aparece no hover (opacidade ${opacidade}) — R15` };
  }
  await page.mouse.move(4, 4);
}

async function checarRedimensionamento(page, tela, resultado) {
  if (resultado.T3?.estado === 'N/A') return;
  const medir = () => page.evaluate(() => {
    const tab = document.querySelector('.resizable-table');
    if (!tab) return null;
    return Array.from(tab.querySelectorAll('thead th')).map((th) => Math.round(th.getBoundingClientRect().width));
  });
  const antes = await medir();
  if (!antes || antes.length < 2) {
    resultado.T3 = { estado: 'N/A', motivo: 'tabela com menos de 2 colunas' };
    return;
  }
  const idx = 0; // arrasta a PRIMEIRA coluna: as demais não podem mudar
  const alca = page.locator('.resizable-table thead th').nth(idx).locator('.resizable-th-handle');
  if (!(await alca.count())) {
    resultado.T3 = { estado: 'FALHOU', motivo: 'coluna sem alça de redimensionamento' };
    return;
  }
  const caixa = await alca.boundingBox();
  if (!caixa) {
    resultado.T3 = { estado: 'FALHOU', motivo: 'alça de redimensionamento invisível' };
    return;
  }
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
  await page.mouse.move(caixa.x + caixa.width / 2 + 64, caixa.y + caixa.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const depois = await medir();
  const problemas = [];
  const delta = depois[idx] - antes[idx];
  if (Math.abs(delta - 64) > 12) problemas.push(`coluna arrastada mudou ${delta}px (esperado ~64px)`);
  for (let i = 1; i < antes.length; i += 1) {
    if (Math.abs(depois[i] - antes[i]) > 2) {
      problemas.push(`coluna ${i + 1} mudou junto (${antes[i]}→${depois[i]}px) — arrasto deve mudar SÓ a arrastada`);
      break;
    }
  }
  // Persistência: recarrega e mede de novo. Blocos recolhidos voltam
  // fechados no reload — reabre para a tabela deles seguir mensurável.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await esperarCarregar(page);
  await page.evaluate(() => {
    document.querySelectorAll('.app-bloco-recolher[aria-expanded="false"]').forEach((b) => b.click());
  });
  await page.waitForTimeout(500);
  const recarregado = await medir();
  if (!recarregado || Math.abs(recarregado[idx] - depois[idx]) > 4) {
    problemas.push(`largura não persistiu ao recarregar (${depois?.[idx]}→${recarregado?.[idx]}px)`);
  }
  resultado.T3 = problemas.length
    ? { estado: 'FALHOU', motivo: problemas.join('; ') }
    : { estado: 'PASSOU' };
}

async function checarEtiquetasFiltro(page, resultado) {
  const filtro = page.locator('.app-filtros .la-filtro-btn, .la-filtros-linha .la-filtro-btn').first();
  if (!(await filtro.count())) {
    resultado.F3 = { estado: 'N/A', motivo: 'tela sem filtros marcáveis' };
    return;
  }
  await filtro.click();
  await page.waitForTimeout(300);
  /*
    Marcação é `checkbox` OU `radio`: a dimensão que declara `unico` (o
    serviço aceita um valor por recorte) renderiza marca REDONDA, porque a
    forma do controle tem de dizer o que ele aceita. O check só olhava
    checkbox e reprovava as telas que fizeram a coisa certa — defeito do
    verificador introduzido na mesma leva que criou o `unico`.
  */
  const opcoes = page.locator('.la-rapido-pop input[type="checkbox"], .la-rapido-pop input[type="radio"]');
  if (!(await opcoes.count())) {
    resultado.F3 = { estado: 'FALHOU', motivo: 'filtro abriu sem opções de MARCAÇÃO (checkbox/radio)' };
    await page.mouse.click(4, 4);
    return;
  }
  /*
    Marca uma opção AINDA NÃO MARCADA. Clicar na primeira às cegas
    DESMARCAVA o filtro padrão da tela (o Relatório Operacional já nasce com
    "Mês atual" marcado) e o check então reclamava que não havia etiqueta —
    ele mesmo tinha acabado de tirar.
  */
  const total = await opcoes.count();
  let opcao = null;
  for (let i = 0; i < total; i += 1) {
    const candidata = opcoes.nth(i);
    if (!(await candidata.isChecked())) { opcao = candidata; break; }
  }
  if (!opcao) {
    resultado.F3 = { estado: 'N/A', motivo: 'todas as opções do primeiro filtro já vinham marcadas — sem opção livre para exercitar' };
    await page.mouse.click(4, 4);
    return;
  }
  await opcao.click();
  await page.mouse.click(4, 4); // fecha o menu (clique fora)
  await page.waitForTimeout(700);
  const etiqueta = page.locator('.la-etiqueta');
  const problemas = [];
  if (!(await etiqueta.count())) {
    problemas.push('filtro marcado não gerou etiqueta visível');
  } else {
    const remover = etiqueta.first().locator('button');
    if (!(await remover.count())) {
      problemas.push('etiqueta sem botão de remover');
    } else {
      await remover.click();
      await page.waitForTimeout(500);
      if (await page.locator('.la-etiqueta').count()) problemas.push('etiqueta não sumiu ao remover');
    }
  }
  resultado.F3 = problemas.length
    ? { estado: 'FALHOU', motivo: problemas.join('; ') }
    : { estado: 'PASSOU' };
}

async function checarModalCadastro(page, tela, resultado) {
  // R1: cadastro raro abre em MODAL. Abre pela ação principal "Novo/Nova…",
  // mede, e fecha por Escape — NUNCA submete (ambiente compartilhado).
  const botao = page.locator('.app-page-header .btn-primary').first();
  if (!(await botao.count())) {
    resultado.R1 = { estado: 'N/A', motivo: 'tela sem ação principal de cadastro' };
    return;
  }
  const rotulo = (await botao.innerText()).trim();
  if (!/^nov[oa]\b/i.test(rotulo)) {
    resultado.R1 = { estado: 'N/A', motivo: `ação principal não é cadastro ("${rotulo}")` };
    return;
  }
  const rotaAntes = new URL(page.url()).pathname;
  await botao.click();
  await page.waitForTimeout(1000);
  if (new URL(page.url()).pathname !== rotaAntes) {
    // Foi para outra rota (página própria de cadastro) — decisão registrada?
    resultado.R1 = { estado: 'N/A', motivo: 'cadastro em página própria (rota dedicada)' };
    await page.goBack().catch(() => {});
    await esperarCarregar(page);
    return;
  }
  const modal = page.locator('[role="dialog"]');
  if (await modal.count()) {
    // R2 dentro do modal: campos da mesma linha alinhados.
    const r2 = await page.evaluate(checksEstaticos, { tipo: 'form' });
    if (r2.R2 && r2.R2.estado !== 'N/A') resultado.R2 = r2.R2;
    resultado.R1 = { estado: 'PASSOU' };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (await page.locator('[role="dialog"]').count()) {
      await page.locator('[role="dialog"] button:has-text("Fechar"), [role="dialog"] [aria-label*="echar"]').first().click().catch(() => {});
    }
  } else {
    resultado.R1 = { estado: 'FALHOU', motivo: `"${rotulo}" abriu formulário INLINE, não em modal (R9)` };
  }
}

/* ------------------------------------------------------------------ mobile */
async function checarMobile(page, contexto, tela, url, resultado, opcoes = {}) {
  const pagina = await contexto.newPage();
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto(url, { waitUntil: 'domcontentloaded' });
  await esperarCarregar(pagina);
  const parcial = await pagina.evaluate(checksMobile);
  fundir(resultado, parcial);

  // X2: faixa fixa funciona no 390.
  const existeFaixa = await pagina.locator('.layout-main .app-page-header').count();
  if (!existeFaixa) {
    resultado.X2 = { estado: 'FALHOU', motivo: 'faixa ausente no mobile' };
  } else {
    const rolavel = await pagina.evaluate(() => document.scrollingElement.scrollHeight - innerHeight > 120);
    if (!rolavel) {
      resultado.X2 = { estado: 'PASSOU', motivo: 'sem rolagem no mobile' };
    } else {
      await pagina.evaluate(() => window.scrollTo(0, 600));
      await pagina.waitForTimeout(450);
      const geo = await pagina.evaluate(checkFaixaRolada);
      const problemas = [];
      if (!geo.ok) problemas.push(geo.motivo);
      else {
        if (!geo.visivel) problemas.push('faixa sumiu na rolagem');
        if (geo.vao > 1) problemas.push(`vão de ${geo.vao}px topbar→faixa`);
        if (!geo.opaca) problemas.push('faixa não opaca');
      }
      resultado.X2 = problemas.length ? { estado: 'FALHOU', motivo: problemas.join('; ') } : { estado: 'PASSOU' };
      await pagina.evaluate(() => window.scrollTo(0, 0));
      await pagina.waitForTimeout(250);
    }
  }

  // `capturarEm` permite que a VARIANTE (aba) guarde a captura na pasta
  // dela em vez de sobrescrever a da rota base.
  const pasta = opcoes.capturarEm || (capturar ? tela.id : null);
  if (pasta) {
    fs.mkdirSync(path.join(CAPTURAS, pasta), { recursive: true });
    await pagina.screenshot({ path: path.join(CAPTURAS, pasta, '390.png'), fullPage: true }).catch(() => {});
  }
  await pagina.close();
}

/* ------------------------------------------------------------- relatórios */
function escreverSaidas(resultados, meta) {
  fs.mkdirSync(SAIDA, { recursive: true });

  /* Matriz (docs/MATRIZ-COBERTURA.md) */
  const linhas = [];
  linhas.push('# MATRIZ DE COBERTURA — TELA × ITEM DA DoD');
  linhas.push('');
  linhas.push('> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`');
  linhas.push('> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real');
  linhas.push('> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · — N/A (motivo registrado).');
  linhas.push('');
  linhas.push(`- Verificação: **${meta.quando}** · preview: ${meta.base} · build servido: \`${meta.build || 'sem marca'}\``);
  linhas.push(`- Telas verificadas: ${resultados.length} · Itens: ${ITENS_DOD.join(', ')}`);
  const totalFalhas = resultados.reduce((s, r) => s + Object.values(r.itens).filter((i) => i.estado === 'FALHOU').length, 0);
  linhas.push(`- **Células FALHOU: ${totalFalhas}**${totalFalhas === 0 ? ' — matriz 100% PASSOU' : ' (justificativas abaixo)'}`);
  linhas.push('');
  linhas.push(`| Tela | ${ITENS_DOD.join(' | ')} |`);
  linhas.push(`|---|${ITENS_DOD.map(() => '---').join('|')}|`);
  resultados.forEach((r) => {
    const celulas = ITENS_DOD.map((item) => {
      const c = r.itens[item];
      if (!c) return '·';
      if (c.estado === 'PASSOU') return '✅';
      if (c.estado === 'FALHOU') return '❌';
      return '—';
    });
    linhas.push(`| ${r.tela} | ${celulas.join(' | ')} |`);
  });

  linhas.push('');
  linhas.push('## FALHOU — cada célula, justificada');
  linhas.push('');
  let houveFalha = false;
  resultados.forEach((r) => {
    Object.entries(r.itens).forEach(([item, c]) => {
      if (c.estado === 'FALHOU') {
        houveFalha = true;
        linhas.push(`- **${r.tela} · ${item}**: ${c.motivo || 'sem motivo registrado'}${c.seletor ? ` _(seletor: \`${c.seletor}\`)_` : ''}`);
      }
    });
  });
  if (!houveFalha) linhas.push('_Nenhuma célula FALHOU nesta verificação._');

  linhas.push('');
  linhas.push('## N/A — motivos');
  linhas.push('');
  resultados.forEach((r) => {
    const nas = Object.entries(r.itens).filter(([, c]) => c.estado === 'N/A');
    if (nas.length) {
      linhas.push(`- **${r.tela}**: ${nas.map(([item, c]) => `${item} (${c.motivo || 's/ motivo'})`).join('; ')}`);
    }
  });

  fs.writeFileSync(path.join(RAIZ_REPO, 'docs', 'MATRIZ-COBERTURA.md'), `${linhas.join('\n')}\n`);

  /* Relatório de falhas + JSON bruto */
  const rel = ['# Relatório do harness — falhas por tela', '', `Verificação: ${meta.quando} · build: ${meta.build || 'sem marca'}`, ''];
  resultados.forEach((r) => {
    const falhas = Object.entries(r.itens).filter(([, c]) => c.estado === 'FALHOU');
    rel.push(`## ${r.tela} (${r.url})`);
    if (r.erro) rel.push(`- **ERRO DE EXECUÇÃO**: ${r.erro}`);
    if (!falhas.length && !r.erro) rel.push('- sem falhas');
    falhas.forEach(([item, c]) => rel.push(`- **${item}**: ${c.motivo}${c.seletor ? ` — \`${c.seletor}\`` : ''}`));
    rel.push('');
  });
  fs.writeFileSync(path.join(SAIDA, 'relatorio.md'), rel.join('\n'));
  fs.writeFileSync(path.join(SAIDA, 'relatorio.json'), JSON.stringify({ meta, resultados }, null, 2));
}

/* ------------------------------------------------------------------- main */
async function main() {
  // Ambiente com proxy de saída (ex.: sessão remota): o Chromium precisa
  // ser apontado para ele explicitamente; a interceptação TLS do proxy usa
  // uma CA local que o navegador não conhece, então o contexto do harness
  // aceita o certificado do proxy NESSE caso (só leitura de QA).
  const proxyEnv = process.env.HTTPS_PROXY || process.env.https_proxy || '';
  const navegador = await chromium.launch({
    executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
    proxy: proxyEnv ? { server: proxyEnv } : undefined,
    // O relay do proxy de saída derruba o ClientHello TLS 1.3 do Chromium
    // (reset em todo host); limitar a TLS 1.2 destrava — só no modo proxy.
    args: proxyEnv ? ['--ssl-version-max=tls1.2'] : []
  });
  const contexto = await navegador.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ignoreHTTPSErrors: Boolean(proxyEnv)
  });
  const page = await contexto.newPage();

  /*
    R3 (DoD) / R19 — PROVA DE RUNTIME de que a tela não abre caixa do
    navegador. O check estático mede o arquivo; este mede o que acontece de
    verdade no preview: qualquer alert/confirm/prompt disparado enquanto o
    harness carrega e navega a tela cai aqui, com a mensagem, e reprova a
    tela em que ocorreu.

    Escopo honesto do que esta prova cobre: o harness é SÓ NAVEGAÇÃO E
    LEITURA (não cria, não altera, não apaga no ambiente compartilhado),
    então ela pega as caixas do caminho de CARGA e de erro de carga — que
    são justamente as que aparecem sem o usuário pedir. As de salvar e
    excluir ficam com o check estático R19, que é exaustivo por arquivo.
    Registrado assim na matriz para ninguém ler PASSOU como "não existe
    mais nenhuma".
  */
  const caixasDoNavegador = [];
  page.on('dialog', async (dialog) => {
    caixasDoNavegador.push({ tipo: dialog.type(), mensagem: dialog.message() });
    await dialog.dismiss().catch(() => {});
  });

  try {
    await esperarDeploy(page);
    await login(page);
    const build = await page.evaluate(() => window.__FLUXY_BUILD__ || '').catch(() => '');

    const validador = rodarValidadorEstatico();
    const telas = filtroTelas ? TELAS.filter((t) => filtroTelas.includes(t.id)) : TELAS;
    const resultados = [];

    for (const tela of telas) {
      const resultado = { tela: tela.id, arquivo: tela.arquivo, itens: {}, url: '' };
      resultados.push(resultado);
      console.log(`[qa-preview] ▶ ${tela.id}`);
      try {
        let rota = tela.rota;
        if (tela.resolver) rota = await RESOLVEDORES[tela.resolver](page);
        resultado.url = rota;
        if (page.url() !== `${BASE}${rota}`) {
          await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
        }
        await esperarCarregar(page);

        // Checagem de acesso: redirecionada ou tela de erro/permissão?
        const rotaAtual = new URL(page.url()).pathname;
        if (rotaAtual !== rota) {
          throw new Error(`redirecionada de ${rota} para ${rotaAtual} — acesso/política bloqueando o usuário de QA`);
        }
        const bloqueada = await page.evaluate(() => /acesso negado|sem permiss|não autorizado|nao autorizado/i.test(document.body.innerText.slice(0, 3000)));
        if (bloqueada) throw new Error('tela bloqueada por permissão para o usuário de QA');

        // Zera antes da tela: o que for capturado daqui em diante é DESTA
        // tela, não sobra da anterior.
        caixasDoNavegador.length = 0;

        fundir(resultado.itens, await page.evaluate(checksEstaticos, { tipo: tela.tipo }));
        fundir(resultado.itens, await page.evaluate(checkStickyEAcessibilidade));
        await checarFaixa(page, resultado.itens);
        await checarAffordanceAlinhamento(page, resultado.itens);
        await checarEtiquetasFiltro(page, resultado.itens);
        await checarRedimensionamento(page, tela, resultado.itens);
        await checarModalCadastro(page, tela, resultado.itens);
        // Variantes da mesma tela (abas com tabela) e blocos RECOLHIDOS:
        // conteúdo que existe mas não está à vista também é da tela — sem
        // isso, tabela em aba/bloco ficaria "N/A" e viraria capacidade sem
        // cobertura. FALHOU de variante vence; PASSOU cobre N/A.
        /*
          Que itens a variante pode influenciar.

          A lista era de 10 (só os de tabela), e isso abriu um BURACO DE
          EVIDÊNCIA que o revisor achou em 02/09: com a D1, Jornada e
          Apuração deixaram de ter rota própria e viraram ABAS do Pessoal.
          Como as abas só entram na matriz por aqui, 24 dos 34 itens —
          C1–C6, F1–F4, B1–B4, M2, R1, R2, R3, X1–X3, R18, A1 — NUNCA eram
          medidos nelas. Duas das nove telas reescritas na leva tinham
          evidência parcial, e foi por isso que um formulário deslocado
          ~450px na Apuração passou batido: o R2 do Pessoal estava
          registrado como N/A "tela sem formulário visível", medido na aba
          de Solicitações.

          Agora a variante influencia TUDO que ela pode influenciar. Ficam
          de fora só os itens que pertencem à PÁGINA, não ao conteúdo da
          aba: a faixa fixa e seu conteúdo (C1–C6) e a M2, que vem do
          validador estático sobre o arquivo da rota. Medir C1 numa aba
          reprovaria o Pessoal por um cabeçalho que é, corretamente, um só
          para as quatro.
        */
        const ITENS_DE_PAGINA = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'M2'];
        const ITENS_DE_VARIANTE = ITENS_DOD.filter((item) => !ITENS_DE_PAGINA.includes(item));
        const fundirVariante = (extra, rotulo) => {
          ITENS_DE_VARIANTE.forEach((item) => {
            const atual = resultado.itens[item];
            const novo = extra[item];
            if (!novo) return;
            if (novo.estado === 'FALHOU' && atual?.estado !== 'FALHOU') {
              resultado.itens[item] = { ...novo, motivo: `[${rotulo}] ${novo.motivo || ''}` };
            } else if ((!atual || atual.estado === 'N/A') && novo.estado === 'PASSOU') {
              resultado.itens[item] = { estado: 'PASSOU' };
            }
          });
        };

        // Blocos recolhidos da própria tela: expande e mede as tabelas.
        const expandiu = await page.evaluate(() => {
          const botoes = Array.from(document.querySelectorAll('.app-bloco-recolher[aria-expanded="false"]'));
          botoes.forEach((b) => b.click());
          return botoes.length;
        });
        if (expandiu > 0) {
          await page.waitForTimeout(600);
          fundirVariante(await page.evaluate(checksEstaticos, { tipo: tela.tipo }), 'blocos expandidos');
          if (resultado.itens.T3?.estado === 'N/A' && await page.locator('.resizable-table').count()) {
            await checarAffordanceAlinhamento(page, resultado.itens);
            await checarRedimensionamento(page, tela, resultado.itens);
          }
        }

        for (const sufixo of tela.variantes || []) {
          await page.goto(`${BASE}${rota}${sufixo}`, { waitUntil: 'domcontentloaded' });
          await esperarCarregar(page);

          /*
            A variante roda os MESMOS checks interativos da rota base — não
            só o `checksEstaticos`. Antes só o estático rodava aqui, e por
            isso os itens de acessibilidade (A1), sticky (R18), filtro (F3)
            e formulário (R1/R2) da aba nunca eram exercitados.
          */
          const itensDaVariante = {};
          fundir(itensDaVariante, await page.evaluate(checksEstaticos, { tipo: tela.tipo }));
          fundir(itensDaVariante, await page.evaluate(checkStickyEAcessibilidade));
          await checarEtiquetasFiltro(page, itensDaVariante);
          await checarModalCadastro(page, tela, itensDaVariante);
          fundirVariante(itensDaVariante, sufixo);

          if ((!resultado.itens.T3 || resultado.itens.T3.estado === 'N/A') && await page.locator('.resizable-table').count()) {
            resultado.itens.T3 = undefined;
            await checarAffordanceAlinhamento(page, resultado.itens);
            await checarRedimensionamento(page, tela, resultado.itens);
            if (resultado.itens.T3) resultado.itens.T3.motivo = `[${sufixo}] ${resultado.itens.T3.motivo || ''}`.trim() || undefined;
          }

          /*
            E a variante é FOTOGRAFADA, nas mesmas três larguras. Sem isto,
            duas das nove telas da leva do RH/DP (Jornada e Apuração, que a
            D1 transformou em abas) não tinham captura nenhuma — e a
            evidência que a Parte 7 exige é captura por tela, não por rota.
          */
          if (capturar) {
            const nomeVariante = sufixo.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'variante';
            const pastaVariante = path.join(CAPTURAS, `${tela.id}--${nomeVariante}`);
            fs.mkdirSync(pastaVariante, { recursive: true });
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(250);
            await page.screenshot({ path: path.join(pastaVariante, '1920.png'), fullPage: true }).catch(() => {});
            await page.setViewportSize({ width: 1366, height: 900 });
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(pastaVariante, '1366.png'), fullPage: true }).catch(() => {});
            await page.setViewportSize({ width: 1920, height: 1080 });
            await page.waitForTimeout(300);
          }

          // Mobile da variante: X1/X2/X3 da aba, que também nunca eram medidos.
          await checarMobile(page, contexto, tela, `${BASE}${rota}${sufixo}`, itensDaVariante, {
            capturarEm: capturar ? `${tela.id}--${sufixo.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}` : null
          });
          fundirVariante(itensDaVariante, sufixo);
        }
        if (tela.variantes?.length || expandiu > 0) {
          await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
          await esperarCarregar(page);
        }

        resultado.itens.M2 = m2Para(tela.arquivo, validador);

        // R3 — nenhuma caixa do navegador. Runtime (o que o spy de dialog
        // capturou nesta tela) somado ao estático (R19 sobre o arquivo):
        // um FALHA sozinho reprova. O motivo do PASSOU diz o que foi
        // medido, para ninguém ler como "não existe mais nenhuma".
        resultado.itens.R3 = r3Para(tela.arquivo, validador, caixasDoNavegador);

        /*
          T4 (redimensionamento) — a tabela tem de REAGIR ao contêiner
          encolhendo, SEM recarregar.

          O harness reduzia a janela e fotografava, e a captura saía certa;
          por isso ele não via que a `TabelaPadrao` media a largura uma vez e
          nunca aplicava a nova (defeito achado por revisão em 03/09: janela
          reduzida de 1920 para 1366 deixava quatro colunas fora da borda do
          cartão, para sempre). A prova tem de ser esta: encolher e MEDIR,
          não encolher e fotografar.
        */
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.waitForTimeout(800);
        const aposEncolher = await page.evaluate(() => {
          const tabela = document.querySelector('.layout-main .resizable-table');
          if (!tabela) return null;
          const rolagem = tabela.closest('.resizable-table-scroll');
          if (!rolagem) return null;
          return {
            tabela: Math.round(tabela.getBoundingClientRect().width),
            contêiner: Math.round(rolagem.clientWidth)
          };
        });
        if (aposEncolher) {
          const excesso = aposEncolher.tabela - aposEncolher.contêiner;
          if (excesso > 24) {
            resultado.itens.T4 = {
              estado: 'FALHOU',
              motivo: `ao reduzir a janela de 1920 para 1366 SEM recarregar, a tabela manteve ${aposEncolher.tabela}px num contêiner de ${aposEncolher.contêiner}px (${excesso}px fora) — a largura não é remedida`
            };
          }
        }
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(400);

        if (capturar) {
          fs.mkdirSync(path.join(CAPTURAS, tela.id), { recursive: true });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(CAPTURAS, tela.id, '1920.png'), fullPage: true }).catch(() => {});
          await page.setViewportSize({ width: 1366, height: 900 });
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(CAPTURAS, tela.id, '1366.png'), fullPage: true }).catch(() => {});
          await page.setViewportSize({ width: 1920, height: 1080 });
          await page.waitForTimeout(300);
        }

        await checarMobile(page, contexto, tela, `${BASE}${rota}`, resultado.itens);

        // N/A declarados no manifesto SEMPRE vencem o check automático —
        // são decisões registradas (o motivo vai para a matriz).
        Object.entries(tela.naoAplica || {}).forEach(([item, motivo]) => {
          resultado.itens[item] = { estado: 'N/A', motivo };
        });
      } catch (erro) {
        resultado.erro = String(erro.message || erro);
        ITENS_DOD.forEach((item) => {
          if (!resultado.itens[item]) resultado.itens[item] = { estado: 'FALHOU', motivo: `tela não verificada: ${resultado.erro}` };
        });
        console.error(`[qa-preview]   ✖ ${tela.id}: ${resultado.erro}`);
      }
      const falhas = Object.values(resultado.itens).filter((c) => c.estado === 'FALHOU').length;
      console.log(`[qa-preview]   ${falhas === 0 ? '✓ sem falhas' : `✖ ${falhas} item(ns) FALHOU`}`);
    }

    escreverSaidas(resultados, { quando: agora(), base: BASE, build });
    const totalFalhas = resultados.reduce((s, r) => s + Object.values(r.itens).filter((i) => i.estado === 'FALHOU').length, 0);
    console.log(`\n[qa-preview] matriz gravada em docs/MATRIZ-COBERTURA.md — ${totalFalhas} célula(s) FALHOU`);
    process.exit(totalFalhas === 0 ? 0 : 1);
  } finally {
    await navegador.close();
  }
}

main().catch((erro) => {
  console.error(`[qa-preview] ${erro.message || erro}`);
  process.exit(3);
});
