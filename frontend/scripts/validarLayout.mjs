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

    // R10 (escala): exceção registrada rebaixa a violação de medida à mão
    // para AVISO — com a justificativa gravada no manifesto.
    const excecaoMedidas = manifesto.excecoes_medidas?.[tela];
    const aponta = (i, regra, mensagem) => falhas.push(`${tela}:${i + 1} [${regra}] ${mensagem}`);
    const apontaMedida = (i, mensagem) => {
      if (excecaoMedidas) {
        avisos.push(`${tela}:${i + 1} [R10] medida à mão tolerada por exceção registrada (${excecaoMedidas}): ${mensagem}`);
      } else {
        aponta(i, 'R10', mensagem);
      }
    };

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

      // ---- R10 — tela NÃO escreve medida: só escala (styles/escala.css) ----
      // e componentes. Exceção precisa estar registrada no manifesto
      // (excecoes_medidas) com justificativa.

      // Coluna de TabelaPadrao medida na tela — a medida é do tipo.
      if (/\blargura\s*:\s*\d/.test(linha)) {
        apontaMedida(i, `largura de coluna escrita na tela ("${linha.trim().slice(0, 60)}") — declare o papel (tipo: texto|codigo|valor|numero|data|status|badge); a medida é do componente.`);
      }

      // Pixel em style inline (width/height/padding/margin/gap/fontSize…).
      const estiloPx = linha.match(/\b(minWidth|maxWidth|width|minHeight|maxHeight|height|padding(?:Top|Bottom|Left|Right)?|margin(?:Top|Bottom|Left|Right)?|gap|fontSize)\s*:\s*['"]?(\d+)(?:px)?['"]?\s*[,}]/);
      if (estiloPx && !/largura\s*:\s*\d/.test(linha)) {
        apontaMedida(i, `${estiloPx[1]}: ${estiloPx[2]} em style inline — use um degrau da escala via classe/componente (styles/escala.css).`);
      }
      if (/\b(padding|margin)\s*:\s*['"][^'"]*\d/.test(linha) && !estiloPx) {
        apontaMedida(i, 'padding/margin composto em style inline — use degraus da escala via classe.');
      }

      // Valor arbitrário Tailwind em px (w-[64px], text-[13px], p-[6px]…).
      if (/-\[\d+(?:\.\d+)?px\]/.test(linha)) {
        apontaMedida(i, `valor arbitrário em px ("${linha.match(/\S*-\[\d+(?:\.\d+)?px\]\S*/)?.[0]}") — não existe medida fora da escala.`);
      }

      // Espaçamento Tailwind fora dos degraus 0/1/2/3/4/6/8/12 (=0–48px).
      const DEGRAUS = new Set(['0', '1', '2', '3', '4', '6', '8', '12']);
      for (const util of linha.matchAll(/\b((?:[mp][trblxy]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?))\b/g)) {
        if (!DEGRAUS.has(util[2])) {
          apontaMedida(i, `espaçamento fora da escala ("${util[1]}") — degraus permitidos: 0/1/2/3/4/6/8/12 (4–48px).`);
        }
      }

      // Largura/altura fixa fora dos degraus (w-28, h-10, h-2.5) — medida à
      // mão. Nos degraus (h-4 = 16px p/ ícone) passa; w-0/h-0 é o idioma de
      // truncagem, não medida.
      for (const fixa of linha.matchAll(/(?<!max-)(?<!min-)\b([wh]-(\d+(?:\.\d+)?))\b/g)) {
        if (!DEGRAUS.has(fixa[2])) {
          apontaMedida(i, `dimensão fixa fora da escala ("${fixa[1]}") — a largura de campo/controle vem do componente (.app-busca, .input-moeda, CampoForm tipo…); dimensões avulsas só nos degraus.`);
        }
      }

      // Tamanho de fonte fora dos papéis 12/14/18 (page-title = 22 é do Pagina).
      const fonteFora = linha.match(/\btext-(base|xl|2xl|3xl|4xl|5xl)\b/);
      if (fonteFora) {
        apontaMedida(i, `tamanho de fonte fora da escala ("text-${fonteFora[1]}") — papéis: text-xs (detalhe 12), text-sm (corpo 14), text-lg (título de bloco 18), título de página no Pagina/PageHeader (22).`);
      }
    });

    const linhaDe = (indice) => codigo.slice(0, indice).split('\n').length;

    // R5 (02/09, revisto) — o apoio mora na FAIXA FIXA do topo, nas props
    // contagem/descricao do PageHeader (uma linha, escala de título). A
    // prop antiga `subtitulo` não existe mais — usá-la some com o texto.
    for (const bloco of codigo.matchAll(/<PageHeader\b[\s\S]*?>/g)) {
      if (/\bsubtitulo=/.test(bloco[0])) {
        aponta(linhaDe(bloco.index) - 1, 'R5', 'prop subtitulo não existe mais no PageHeader — use descricao (e contagem), que rendem na faixa fixa do topo.');
      }
    }

    // R11 (02/09) — o menu "⋯" contém APENAS ações sobre o conteúdo da
    // tela. Navegação (voltar, ir para) pertence ao breadcrumb/menu/Ctrl+K.
    for (const bloco of codigo.matchAll(/\b(?:mais|itens)=\{\[[\s\S]*?\]\}/g)) {
      if (/navigate\(|\bto:\s|window\.location|<Link\b/.test(bloco[0])) {
        aponta(linhaDe(bloco.index) - 1, 'R11', 'item de menu de ações que NAVEGA (navigate/to/Link) — navegação não é ação: apague o item; breadcrumb, menu e Ctrl+K resolvem.');
      }
    }

    // R12 (02/09) — filtro de lista nunca é select de escolha única: use a
    // BarraFiltros (botão + marcação, múltipla seleção, etiquetas visíveis).
    // Select de FORMULÁRIO (entrada de dado) e seletor de CONTEXTO (qual
    // registro editar) continuam legítimos — a heurística mira selects
    // cujo estado/aria fala em filtro/situação.
    for (const sel of codigo.matchAll(/<select[\s\S]{0,260}?>/g)) {
      if (/filtr|situacao|situação/i.test(sel[0])) {
        aponta(linhaDe(sel.index) - 1, 'R12', 'select usado como FILTRO — filtros são marcáveis (BarraFiltros: busca larga em cima, botões de marcação, etiquetas removíveis), nunca lista suspensa de escolha única.');
      }
    }
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
