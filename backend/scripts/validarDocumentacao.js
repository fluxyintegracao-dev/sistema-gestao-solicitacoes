const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(root, 'docs');

const requiredModuleDocs = [
  'biblioteca-modelos',
  'boletos',
  'comercial',
  'compras',
  'comunicacao-interna',
  'configuracoes-painel',
  'contratos',
  'cotacoes-pedidos',
  'crm',
  'financeiro',
  'fiscal',
  'governanca',
  'obras',
  'provisionamento',
  'rh-dp',
  'solicitacoes',
  'sst',
  'treinamento'
];

const forbiddenPatterns = [
  /FLUXY[ _-]?Ops/i,
  /fluxy_ops/i,
  /SIENGE/i,
  /produto comercial/i,
  /comercializa[cç][aã]o/i,
  /expans[aã]o comercial/i,
  /posicionamento comercial/i,
  /modelo comercial futuro/i,
  /SaaS multi-tenant/i
];

function listMarkdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  });
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function validateForbiddenTerms(filePath, content, errors) {
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      errors.push(`${relative(filePath)} contem termo obsoleto: ${pattern}`);
    }
  });
}

function validateLinks(filePath, content, errors) {
  const markdownLink = /\[[^\]]*\]\(([^)\r\n]+)\)/g;
  let match;

  while ((match = markdownLink.exec(content))) {
    let target = match[1].trim();
    if (!target || /^(https?:\/\/|mailto:|#)/i.test(target)) continue;

    target = target.replace(/^<|>$/g, '').split('#')[0];
    if (!target) continue;

    const resolved = path.isAbsolute(target)
      ? target
      : path.resolve(path.dirname(filePath), target);

    if (!fs.existsSync(resolved)) {
      errors.push(`${relative(filePath)} referencia caminho inexistente: ${match[1]}`);
    }
  }
}

function main() {
  const errors = [];
  const markdownFiles = [path.join(root, 'README.md'), path.join(root, 'AGENTS.md'), ...listMarkdownFiles(docsRoot)];
  const textFiles = [...markdownFiles, path.join(root, 'backend', '.env.example')];

  textFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    validateForbiddenTerms(filePath, content, errors);
    if (filePath.toLowerCase().endsWith('.md')) validateLinks(filePath, content, errors);
  });

  requiredModuleDocs.forEach((moduleName) => {
    const moduleDoc = path.join(docsRoot, 'modulos', moduleName, 'README.md');
    if (!fs.existsSync(moduleDoc)) {
      errors.push(`documentacao canonica ausente: docs/modulos/${moduleName}/README.md`);
    }
  });

  const duplicateContext = path.join(docsRoot, 'contexto', 'visao-geral.md');
  if (fs.existsSync(duplicateContext)) {
    errors.push('documento duplicado encontrado: docs/contexto/visao-geral.md');
  }

  if (errors.length) {
    console.error('Falha na validacao documental:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Documentacao valida: ${markdownFiles.length} arquivos Markdown e ${requiredModuleDocs.length} documentos canonicos.`);
}

main();
