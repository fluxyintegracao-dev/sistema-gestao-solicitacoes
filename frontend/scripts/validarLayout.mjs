import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const babelParser = require('@babel/parser');

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

  // R18 — overflow hidden mata sticky (decisão do cliente, 02/09).
  const r18 = validarOverflow();
  falhas.push(...r18.falhas);
  avisos.push(...r18.avisos);

  // R17 — declaração obrigatória de colunas (decisão do cliente, 02/09):
  // vale para TODO arquivo que usa TabelaPadrao, não só o manifesto — a
  // lacuna reprova ANTES de chegar ao preview.
  const r17 = validarDeclaracaoColunas();
  falhas.push(...r17.falhas);
  avisos.push(...r17.avisos);

  // R19 — nada de caixa do navegador. Vale para o SISTEMA INTEIRO desde já
  // (decisão do cliente, 02/09), com trinco: o passivo herdado está
  // congelado em lista datada e só pode diminuir.
  const r19 = validarDialogosDoNavegador();
  falhas.push(...r19.falhas);
  avisos.push(...r19.avisos);

  return {
    falhas,
    avisos,
    telas: manifesto.telas.length,
    arquivosTabela: r17.arquivos,
    dialogosDoNavegador: r19.total,
    dialogosNoTrinco: r19.noTrinco
  };
}

/**
 * R19 — `window.alert()`, `window.confirm()` e `window.prompt()` NUNCA
 * (decisão do cliente, 02/09). Aviso e confirmação usam o componente
 * próprio do sistema (`Avisos`/`useAvisos` e `useConfirmacao`, em
 * components/padrao).
 *
 * `prompt` entrou depois, no mesmo dia: a primeira versão da regra só
 * bania alert/confirm, e o estorno do RhDpFechamentos passava batido
 * pedindo a justificativa em `window.prompt` — a MESMA caixa do navegador,
 * pelos mesmos motivos. Regra com buraco declarado é regra que não pega o
 * caso vizinho; o `useConfirmacao` ganhou campo de texto (R16b) e a regra
 * fechou o buraco.
 *
 * A caixa do navegador ignora tema, tipografia e tokens; bloqueia a página;
 * o harness não consegue medi-la; e ela some sem deixar rastro no DOM.
 *
 * ## Por que TRINCO e não reprovação seca
 *
 * O levantamento do RH/DP achou 51 chamadas num módulo só. A varredura do
 * sistema achou **857 em 122 arquivos** — passivo de anos, que nenhuma leva
 * zera de uma vez. Reprovar tudo hoje pararia o build e a regra viraria
 * ruído (e regra que vira ruído deixa de ser lida — R18 já ensinou).
 *
 * Então a regra vale para o sistema inteiro DESDE JÁ, com o passivo
 * congelado em `scripts/trinco-dialogos.json`: a contagem de cada arquivo
 * na data em que a regra nasceu. A partir daqui:
 *   - arquivo NOVO com alert/confirm            → FALHA;
 *   - arquivo do trinco que AUMENTA a contagem  → FALHA;
 *   - arquivo do trinco que diminui             → passa, e o trinco aperta.
 * O número só anda para baixo. Cada leva zera os arquivos que tocar.
 */
function validarDialogosDoNavegador() {
  const falhas = [];
  const avisos = [];
  const caminhoTrinco = path.join(frontendRoot, 'scripts', 'trinco-dialogos.json');
  const trinco = fs.existsSync(caminhoTrinco)
    ? JSON.parse(fs.readFileSync(caminhoTrinco, 'utf8'))
    : { arquivos: {} };
  const herdado = trinco.arquivos || {};

  // `alert(` precedido de ponto é método de objeto (`toast.alert`), não a
  // caixa do navegador; `confirmar(`/`confirmacao` não são `confirm(`.
  const padrao = /(^|[^.\w])(window\s*\.\s*)?(alert|confirm|prompt)\s*\(/g;
  const contagens = {};

  const varrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const caminho = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === 'dist') continue;
        varrer(caminho);
        continue;
      }
      if (!/\.(jsx?|tsx?)$/.test(item.name)) continue;
      const rel = path.relative(frontendRoot, caminho).split(path.sep).join('/');
      const codigo = fs.readFileSync(caminho, 'utf8');
      const total = [...codigo.matchAll(padrao)].length;
      if (total > 0) contagens[rel] = total;
    }
  };
  varrer(path.join(frontendRoot, 'src'));

  let total = 0;
  let noTrinco = 0;
  for (const [rel, quantidade] of Object.entries(contagens)) {
    total += quantidade;
    const limite = herdado[rel];
    if (limite === undefined) {
      falhas.push(`${rel} [R19] ${quantidade} chamada(s) de alert()/confirm()/prompt() do navegador em arquivo NOVO para a regra — use Avisos/useAvisos (aviso) e useConfirmacao (confirmação, com a prop campo quando precisar de texto) de components/padrao.`);
      continue;
    }
    if (quantidade > limite) {
      falhas.push(`${rel} [R19] alert()/confirm()/prompt() do navegador AUMENTOU de ${limite} para ${quantidade} — o trinco só aperta: troque por Avisos/useConfirmacao.`);
      continue;
    }
    noTrinco += quantidade;
    if (quantidade < limite) {
      avisos.push(`${rel} [R19] passivo herdado caiu de ${limite} para ${quantidade} chamada(s) — atualize scripts/trinco-dialogos.json para apertar o trinco.`);
    }
  }
  // Arquivo que zerou e saiu da lista de contagens: o trinco tem de perder
  // a linha, senão o passivo "some" sem ninguém ver que caiu.
  for (const rel of Object.keys(herdado)) {
    if (contagens[rel] === undefined) {
      avisos.push(`${rel} [R19] zerou o alert()/confirm()/prompt() — remova a linha de scripts/trinco-dialogos.json.`);
    }
  }

  return { falhas, avisos, total, noTrinco };
}

/**
 * R18 — `overflow: hidden` cria contexto de rolagem e MATA `position:
 * sticky` de tudo que estiver dentro: faixa fixa do cabeçalho, coluna fixa
 * de tabela, cabeçalho grudado. E mata em SILÊNCIO — sem erro de console,
 * sem falhar build, sem aparecer em teste de unidade.
 *
 * Já aconteceu duas vezes: `.rhdp-page` derrubou a faixa do topo e
 * `.ao-financial` derrubou a coluna fixa da auditoria. Quando é preciso
 * cortar o que transborda, o certo é `overflow: clip` — corta igual e NÃO
 * cria scrollport.
 *
 * Rede ESTÁTICA (o harness mede a cadeia real no DOM): reprova
 * `overflow*: hidden` no CSS dos componentes padrão e dos módulos que
 * hospedam tela reformada.
 */
function validarOverflow() {
  const falhas = [];
  const avisos = [];
  const alvos = [path.join('src', 'styles', 'componentes-padrao.css')];

  const varrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const caminho = path.join(dir, item.name);
      if (item.isDirectory()) varrer(caminho);
      else if (item.name.endsWith('.css') && /governanca/.test(caminho)) {
        alvos.push(path.relative(frontendRoot, caminho));
      }
    }
  };
  varrer(path.join(frontendRoot, 'src', 'modules'));

  alvos.forEach((rel) => {
    const caminho = path.join(frontendRoot, rel);
    if (!fs.existsSync(caminho)) return;
    const codigo = fs.readFileSync(caminho, 'utf8');

    // O check olha o BLOCO da regra, não a linha solta: `overflow: hidden`
    // junto de `text-overflow: ellipsis` (ou `white-space: nowrap`) é o
    // IDIOMA DE TRUNCAGEM de texto — recorta a própria caixa e não é
    // ancestral de sticky. Marcar isso seria ruído, e regra que vira ruído
    // deixa de ser lida.
    for (const bloco of codigo.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const seletor = bloco[1].trim();
      const corpo = bloco[2];
      if (!/(^|[;{\s])overflow(-x|-y)?\s*:\s*hidden/.test(corpo)) continue;
      const ehTruncagem = /text-overflow/.test(corpo) || /white-space\s*:\s*nowrap/.test(corpo);
      if (ehTruncagem) continue;
      const linha = codigo.slice(0, bloco.index).split('\n').length;
      falhas.push(`${rel}:${linha} [R18] overflow hidden em "${seletor.split('\n').pop().trim().slice(0, 60)}" — cria contexto de rolagem e mata o position:sticky de faixa fixa, coluna fixa e cabeçalho de tabela dentro dele. Use \`overflow: clip\` (corta igual, sem criar scrollport); se for recorte de texto, acompanhe de text-overflow/white-space.`);
    }
  });

  return { falhas, avisos };
}

/**
 * R17 — TODA tabela declara o que cada coluna É:
 * 1. Toda coluna de TabelaPadrao tem `tipo` (a medida/alinhamento vêm dele).
 * 2. Coluna cujo render formata dinheiro (formatCurrency/currency/R$) é
 *    obrigatoriamente `tipo: 'valor'` — é o que garante o T7 (valor nunca
 *    trunca) em tela que ainda nem chegou ao preview.
 * 3. Toda tabela declara sua coluna de IDENTIDADE (`tipo: 'identidade'`).
 *    Tabela que genuinamente não tem identidade declara `semIdentidade` na
 *    própria `<TabelaPadrao>` — ausência silenciosa reprova.
 */
function validarDeclaracaoColunas() {
  const falhas = [];
  const avisos = [];
  const arquivos = [];

  const listarJsx = (dir) => {
    const saida = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.name === 'node_modules') continue;
      const caminho = path.join(dir, item.name);
      if (item.isDirectory()) saida.push(...listarJsx(caminho));
      else if (item.name.endsWith('.jsx')) saida.push(caminho);
    }
    return saida;
  };

  const raizSrc = path.join(frontendRoot, 'src');
  const componente = path.join('components', 'padrao', 'TabelaPadrao.jsx');

  for (const arquivo of listarJsx(raizSrc)) {
    if (arquivo.endsWith(componente)) continue; // o próprio componente
    const codigo = fs.readFileSync(arquivo, 'utf8');
    if (!/\bTabelaPadrao\b/.test(codigo)) continue;
    const rel = path.relative(frontendRoot, arquivo);
    arquivos.push(rel);

    let ast;
    try {
      ast = babelParser.parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
    } catch (erro) {
      falhas.push(`${rel}: [R17] arquivo usa TabelaPadrao mas não parseia (${String(erro.message).slice(0, 80)}).`);
      continue;
    }

    // Caminhada simples pela AST (sem dependência de traverse).
    const todos = [];
    (function anda(no) {
      if (!no || typeof no.type !== 'string') return;
      todos.push(no);
      for (const chave of Object.keys(no)) {
        const filho = no[chave];
        if (Array.isArray(filho)) filho.forEach(anda);
        else if (filho && typeof filho.type === 'string') anda(filho);
      }
    }(ast.program));

    const nomeProp = (p) => (p.key?.name || p.key?.value);
    const ehColuna = (no) => no.type === 'ObjectExpression'
      && no.properties.some((p) => nomeProp(p) === 'titulo')
      && no.properties.some((p) => nomeProp(p) === 'render');

    const declaracoes = new Map(); // nome da variável -> ArrayExpression
    todos.forEach((no) => {
      if (no.type === 'VariableDeclarator' && no.id?.type === 'Identifier'
        && no.init?.type === 'ArrayExpression') {
        declaracoes.set(no.id.name, no.init);
      }
    });

    // 1 e 2 — por coluna, onde quer que ela esteja declarada.
    // As colunas verificadas são SOMENTE as que chegam a uma <TabelaPadrao>.
    // O arquivo pode declarar colunas de OUTROS componentes com contrato
    // próprio — a ListaAvancada usa `larguraPadrao`/`ordenavel`/`principal`
    // e não tem `tipo`. Exigir `tipo` delas seria reprovar código correto
    // (falso positivo corrigido em 02/09).
    const resolverArray = (expr) => {
      if (!expr) return null;
      if (expr.type === 'ArrayExpression') return expr;
      if (expr.type === 'Identifier') return declaracoes.get(expr.name) || null;
      return null;
    };

    const usosTabelaPadrao = todos.filter(
      (no) => no.type === 'JSXOpeningElement' && no.name?.name === 'TabelaPadrao'
    );

    const colunasDaTabela = [];
    usosTabelaPadrao.forEach((no) => {
      const attr = no.attributes.find(
        (a) => a.type === 'JSXAttribute' && a.name?.name === 'colunas'
      );
      const arr = resolverArray(attr?.value?.expression);
      if (!arr) return;
      arr.elements.forEach((el) => {
        if (!el) return;
        const alvos = el.type === 'ObjectExpression' ? [el]
          : el.type === 'ConditionalExpression' ? [el.consequent, el.alternate]
          : el.type === 'SpreadElement' && el.argument?.type === 'ConditionalExpression'
            ? [el.argument.consequent, el.argument.alternate]
            : [];
        alvos.forEach((alvo) => {
          if (alvo?.type === 'ArrayExpression') {
            alvo.elements.forEach((sub) => { if (ehColuna(sub)) colunasDaTabela.push(sub); });
          } else if (ehColuna(alvo)) {
            colunasDaTabela.push(alvo);
          }
        });
      });
    });

    colunasDaTabela.forEach((col) => {
      const linha = col.loc.start.line;
      const tipoProp = col.properties.find((p) => nomeProp(p) === 'tipo');
      if (!tipoProp) {
        falhas.push(`${rel}:${linha} [R17] coluna de TabelaPadrao sem \`tipo\` — declare o papel (identidade|texto|codigo|valor|numero|data|status|badge); sem isso a coluna não tem medida nem alinhamento definidos.`);
        return;
      }
      const renderProp = col.properties.find((p) => nomeProp(p) === 'render');
      const fonteRender = renderProp ? codigo.slice(renderProp.start, renderProp.end) : '';
      const monetaria = /formatCurrency|formatarMoeda|currency|R\$/.test(fonteRender);
      const tipoValor = tipoProp.value?.type === 'StringLiteral' ? tipoProp.value.value : null;
      if (monetaria && tipoValor !== 'valor') {
        falhas.push(`${rel}:${linha} [R17] coluna monetária (render formata dinheiro) com tipo '${tipoValor ?? '?'}' — coluna de dinheiro é \`tipo: 'valor'\` (largura de pior caso, direita, tabular; T7).`);
      }
    });

    const temIdentidade = (arr) => arr.elements?.some((el) => {
      if (!el) return false;
      const alvo = el.type === 'ObjectExpression' ? el
        : (el.type === 'ConditionalExpression' ? el.consequent : null);
      return alvo?.type === 'ObjectExpression'
        && alvo.properties.some((p) => nomeProp(p) === 'tipo'
          && p.value?.type === 'StringLiteral' && p.value.value === 'identidade');
    });

    // 3 — por USO de <TabelaPadrao>: identidade declarada ou semIdentidade.
    todos.forEach((no) => {
      if (no.type !== 'JSXOpeningElement' || no.name?.name !== 'TabelaPadrao') return;
      const linha = no.loc.start.line;
      const attr = (nome) => no.attributes.find((a) => a.type === 'JSXAttribute' && a.name?.name === nome);
      if (attr('semIdentidade')) return;
      const colunasAttr = attr('colunas');
      const expr = colunasAttr?.value?.expression;
      let arr = null;
      if (expr?.type === 'ArrayExpression') arr = expr;
      else if (expr?.type === 'Identifier') arr = declaracoes.get(expr.name) || null;
      if (!arr) {
        avisos.push(`${rel}:${linha} [R17] colunas de TabelaPadrao montadas dinamicamente — o validador não consegue provar a coluna de identidade; garanta \`tipo: 'identidade'\` (ou declare \`semIdentidade\`).`);
        return;
      }
      if (!temIdentidade(arr)) {
        falhas.push(`${rel}:${linha} [R17] TabelaPadrao sem coluna de IDENTIDADE — declare \`tipo: 'identidade'\` na coluna que nomeia o registro, ou \`semIdentidade\` na tabela se ela genuinamente não tem (a ausência precisa ser declarada, nunca silenciosa).`);
      }
    });
  }

  return { falhas, avisos, arquivos };
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
