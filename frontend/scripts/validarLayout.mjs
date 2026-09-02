import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// VERIFICADOR DE LAYOUT (parte estática) — docs/REGRAS-LAYOUT.md.
// Roda dentro do test:responsive sobre as telas do manifesto
// (telas-reformadas.json) e REPROVA tela fora das regras mecânicas.
// A parte de medidas em pixel (alvo de clique, vão da topbar, campo de
// moeda) é a auditoria runtime embutida no roteiro de capturas.

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validarLayout() {
  const manifesto = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, 'scripts', 'telas-reformadas.json'), 'utf8')
  );
  const falhas = [];
  const avisos = [];

  for (const tela of manifesto.telas) {
    const caminho = path.join(frontendRoot, tela);
    if (!fs.existsSync(caminho)) {
      falhas.push(`${tela}: listada no manifesto mas não existe.`);
      continue;
    }
    const codigo = fs.readFileSync(caminho, 'utf8');
    const linhas = codigo.split('\n');

    const aponta = (i, regra, mensagem) => falhas.push(`${tela}:${i + 1} [${regra}] ${mensagem}`);

    linhas.forEach((linha, i) => {
      // R1 — tabela crua é proibida: toda tabela é redimensionável
      // (TabelaPadrao/ResizableTable/ListaAvancada).
      if (/<table\b/.test(linha)) {
        const excecao = manifesto.excecoes_tabela_crua?.[tela];
        if (excecao) {
          avisos.push(`${tela}:${i + 1} [R1] tabela crua tolerada por exceção registrada: ${excecao}`);
        } else {
          aponta(i, 'R1', 'tabela crua — use TabelaPadrao/ResizableTable/ListaAvancada (redimensionável, largura por usuário).');
        }
      }

      // R1 — coluna de ações no máximo 320px.
      const acoes = linha.match(/larguraAcoes=\{[^}]*?(\d{3,})/);
      if (acoes && Number(acoes[1]) > 320) {
        aponta(i, 'R1', `larguraAcoes=${acoes[1]} — máximo 320px; a sobra vai para as colunas de conteúdo.`);
      }

      // R2 — botão com classe de dimensão abaixo de 32px (h-1..h-7 / w-1..w-7).
      if (/<button[^>]*className="[^"]*\b[hw]-[1-7]\b/.test(linha)) {
        aponta(i, 'R2', 'botão dimensionado abaixo do alvo mínimo (32px desktop / 44px toque) — remova a classe h-*/w-* pequena; o .btn já impõe o mínimo.');
      }

      // R3 — input com largura fixa em pixel (busca estreita com vazio ao lado).
      if (/<input[^>]*className="[^"]*w-\[\d+px\]/.test(linha)
        || (/className="[^"]*\binput\b[^"]*w-\[\d+px\]/.test(linha))) {
        aponta(i, 'R3', 'input com largura fixa em px — busca/filtro usa .app-busca (220–480px, cresce); moeda usa .input-moeda.');
      }

      // R5 — texto de apoio fora do PageHeader.
      if (/className="[^"]*\bpage-subtitle\b/.test(linha)) {
        aponta(i, 'R5', 'texto de apoio solto (page-subtitle) — passe subtitulo/contagem ao PageHeader.');
      }

      // R5 — contagem embutida no texto em vez da prop contagem.
      if (/subtitulo=\{[^}]*\.length[^}]*[·:]/.test(linha) || /subtitulo=\{`\$\{/.test(linha)) {
        aponta(i, 'R5', 'contagem embutida no subtítulo — use a prop contagem do PageHeader (renderiza em strong, ancorada).');
      }
    });
  }

  return { falhas, avisos, telas: manifesto.telas.length };
}

// Execução direta: node scripts/validarLayout.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { falhas, avisos, telas } = validarLayout();
  avisos.forEach((aviso) => console.warn('AVISO', aviso));
  if (falhas.length > 0) {
    falhas.forEach((falha) => console.error('FALHA', falha));
    console.error(`\n[layout] ${falhas.length} violação(ões) em ${telas} tela(s) do manifesto.`);
    process.exit(1);
  }
  console.log(`[layout] ok — ${telas} tela(s) do manifesto dentro das regras (${avisos.length} exceção(ões) registrada(s)).`);
}
