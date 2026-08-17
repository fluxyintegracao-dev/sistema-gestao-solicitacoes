import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(frontendRoot, 'src');

function read(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(`[responsividade] ${message}`);
}

function listFiles(directory, extensions, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      listFiles(absolutePath, extensions, result);
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      result.push(absolutePath);
    }
  }
  return result;
}

function resolveSourceImport(importPath) {
  const basePath = path.resolve(srcRoot, importPath);
  const candidates = [
    basePath,
    `${basePath}.jsx`,
    `${basePath}.js`,
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.js')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const app = read('src/App.jsx');
const layout = read('src/layout/Layout.jsx');
const main = read('src/main.jsx');
const indexCss = read('src/index.css');
const responsiveCss = read('src/styles/responsive-system.css');
const resizableTable = read('src/components/ResizableTable.jsx');
const modalPortal = read('src/components/ui/ModalPortal.jsx');
const gerenciarCotacao = read('src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx');
const html = read('index.html');

const routeCount = (app.match(/<Route\b/g) || []).length;
const lazyImports = [...app.matchAll(/lazy\(\(\)\s*=>\s*import\(['"](.+?)['"]\)\)/g)]
  .map((match) => match[1]);
const missingLazyImports = lazyImports.filter((importPath) => !resolveSourceImport(importPath));

if (routeCount === 0) fail('nenhuma rota foi encontrada em App.jsx.');
if (lazyImports.length === 0) fail('nenhuma pagina lazy foi encontrada em App.jsx.');
if (missingLazyImports.length > 0) {
  fail(`imports de rota inexistentes: ${missingLazyImports.join(', ')}`);
}

if (!/width=device-width/.test(html) || !/viewport-fit=cover/.test(html)) {
  fail('index.html precisa manter viewport responsivo com viewport-fit=cover.');
}

const indexImportPosition = main.indexOf("import './index.css'");
const responsiveImportPosition = main.indexOf("import './styles/responsive-system.css'");
if (responsiveImportPosition < 0 || responsiveImportPosition < indexImportPosition) {
  fail('responsive-system.css precisa ser carregado depois dos estilos historicos.');
}

if (!layout.includes("matchMedia('(max-width: 1023px)')")) {
  fail('o shell precisa tratar smartphone e tablet como viewport compacto.');
}
if (!layout.includes('fixed lg:sticky') || !layout.includes('lg:hidden')) {
  fail('o menu lateral precisa usar drawer ate o breakpoint desktop.');
}
if (/\.layout-shell\.fluxy-app-shell\s*>\s*\*\s*\{[^}]*position\s*:\s*relative/s.test(indexCss)) {
  fail('a regra generica do shell voltou a sobrescrever o posicionamento do drawer.');
}
if (!responsiveCss.includes('.layout-shell.fluxy-app-shell > .sidebar')
  || !responsiveCss.includes('@media (max-width: 1023px)')
  || !responsiveCss.includes('@media (max-width: 767px)')) {
  fail('faltam garantias responsivas do shell para tablet ou smartphone.');
}
if (!resizableTable.includes('className="resizable-table-scroll"')
  || !resizableTable.includes('data-table-scroll')) {
  fail('tabelas redimensionaveis precisam de rolagem local.');
}

if (/\.layout-shell\.fluxy-app-shell\s*>\s*\.layout-main\s*\{[^}]*z-index\s*:/s.test(indexCss)
  || /\.layout-shell\.fluxy-app-shell\s*>\s*\.layout-main\s*\{[^}]*z-index\s*:/s.test(responsiveCss)) {
  fail('o conteudo principal nao pode criar um contexto de empilhamento abaixo dos modais.');
}
if (!modalPortal.includes("createPortal(")
  || !modalPortal.includes("document.body")
  || !modalPortal.includes("document.body.style.overflow = 'hidden'")) {
  fail('ModalPortal precisa renderizar no body e bloquear a rolagem de fundo.');
}
if (!indexCss.includes('.app-modal-overlay')
  || !indexCss.includes('.app-modal-surface--form')
  || !indexCss.includes('.layout-main :where(.modal-overlay, .fixed.inset-0)')) {
  fail('faltam o contrato global de modal ou a protecao dos overlays legados.');
}
const modaisCompraNoPortal = (gerenciarCotacao.match(/<ModalPortal\b/g) || []).length;
if (modaisCompraNoPortal < 4) {
  fail('os quatro overlays criticos da gestao de cotacao precisam usar ModalPortal.');
}

const sourceFiles = listFiles(srcRoot, ['.jsx', '.js']);
const routeFiles = sourceFiles.filter((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('<table') || content.includes('<ResizableTable');
});
const namedScrollFiles = routeFiles.filter((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return /overflow-x-auto|table-wrapper|table-responsive|app-table-shell|sol-table-wrapper|data-table-scroll|ResizableTable/.test(content);
});

console.log(JSON.stringify({
  ok: true,
  rotas_verificadas: routeCount,
  paginas_lazy_verificadas: lazyImports.length,
  arquivos_com_tabela: routeFiles.length,
  arquivos_com_wrapper_nomeado: namedScrollFiles.length,
  modais_criticos_com_portal: modaisCompraNoPortal,
  protecao_global_de_overlays: true,
  garantia_para_tabelas_historicas: responsiveCss.includes(':has(> table:not(.solicitacoes-table--mobile))'),
  breakpoints: ['smartphone <= 767px', 'tablet <= 1023px', 'desktop >= 1024px']
}, null, 2));
