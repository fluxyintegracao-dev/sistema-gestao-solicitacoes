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

/*
  TELAS EXTRA POR LINHA DE COMANDO (04/09).

  O manifesto é estado COMPARTILHADO e não tem trava. Enquanto três agentes
  migravam a fatia 1, os três o editaram para medir os próprios arquivos —
  e duas medições saíram erradas por corrida: uma delas imprimiu
  `[layout] ok` DEPOIS de outro processo já ter removido as telas do
  agente. Verde porque o check não estava olhando o que se pensava.

  Agora quem quer medir um arquivo que ainda não entrou no manifesto passa
  `--extra <caminho>` (repetível) e NÃO escreve no arquivo compartilhado.
  A promoção ao manifesto continua sendo do orquestrador, quando a tela
  fecha.
*/
/*
  UMA fonte de verdade para a lista de telas (04/09).

  O `--extra` nasceu ontem e cobria SÓ a `validarLayout()`. As outras duas
  varreduras — a R25 (cor fora de token) e a R18 em JSX — reliam o
  manifesto DO DISCO por conta própria, então a tela passada por `--extra`
  não existia para elas.

  Consequência medida: o caminho que eu mandei os agentes usarem para não
  mexer no manifesto compartilhado era exatamente o que NÃO MEDIA COR.
  Plantei `text-slate-500` numa tela passada por `--extra`: zero achados,
  exit 0. Na mesma tela dentro do manifesto, reprova nomeando a classe.

  Foi um agente que achou, migrando 152 classes cruas que o check nunca
  teria cobrado dele. Corrigir uma cegueira e criar outra no mesmo dia é o
  argumento inteiro da prova de mordida: instrumento novo é tão suspeito
  quanto instrumento velho.
*/
function lerTelasDoManifesto() {
  const manifesto = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, 'scripts', 'telas-reformadas.json'), 'utf8')
  );
  for (const extra of telasExtraDaLinhaDeComando()) {
    if (!manifesto.telas.includes(extra)) manifesto.telas.push(extra);
  }
  return manifesto;
}

export function telasExtraDaLinhaDeComando(argv = process.argv) {
  const extras = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--extra' && argv[i + 1]) extras.push(argv[i + 1].replace(/\\/g, '/'));
  }
  return extras;
}

import { TELAS as TELAS_DO_HARNESS } from './qa-preview/telas.mjs';

/*
  AS DUAS LISTAS TÊM DE BATER (04/09) — a lição mais cara do fechamento
  do Financeiro.

  Existem DUAS listas de telas neste repositório, e elas respondem a
  perguntas diferentes:

    scripts/telas-reformadas.json  -> o que o validador ESTÁTICO mede
    scripts/qa-preview/telas.mjs   -> o que o harness mede NO PREVIEW

  Nada as comparava. Ao fechar a leva do Financeiro o manifesto estático
  tinha 68 telas e o harness tinha 36: as 29 telas do Financeiro migradas
  nas quatro fatias (menos a FinanceiroTituloDetalhe, que já era antiga)
  NUNCA foram acrescentadas à lista do preview — e três do RH/DP também
  não. O harness rodou, imprimiu matriz e disse "6 células FALHOU": um
  resultado de aparência completa sobre um TERÇO do que faltava medir.

  É o defeito de sempre neste projeto, na forma mais cara: o instrumento
  relata o que conhece, e o silêncio sobre o que ele não conhece se lê
  como cobertura. "PRONTO" é verificado no preview; tela que só passou
  pelo validador estático não está verificada.

  Por isso este check é BLOQUEANTE e sem trinco: entrar no manifesto
  estático e não entrar na lista do harness é uma promessa de verificação
  que não existe.
*/
function inventariarRotasDoApp() {
  /*
    So conta o que o usuario consegue ABRIR: rota com elemento de tela.
    `<Navigate>` e redirecionamento, nao tela — contar redirecionamento
    inflaria o passivo com coisa que nao tem o que medir.
  */
  const app = fs.readFileSync(path.join(frontendRoot, 'src', 'App.jsx'), 'utf8');
  const imports = new Map();
  for (const m of app.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'/g)) {
    imports.set(m[1], m[2]);
  }
  for (const m of app.matchAll(/^import\s+(\w+)\s+from\s+'(\.[^']+)'/gm)) imports.set(m[1], m[2]);
  const encontradas = new Set();
  for (const m of app.matchAll(/path="([^"]+)"[^\n]*/g)) {
    const linha = m[0];
    if (/<Navigate/.test(linha)) continue;
    for (const c of linha.matchAll(/<(\w+)/g)) {
      if (!imports.has(c[1])) continue;
      let f = imports.get(c[1]).replace('./', 'src/');
      if (!f.endsWith('.jsx')) f += '.jsx';
      encontradas.add(f);
      break;
    }
  }
  return [...encontradas].sort();
}

function lerTrincoRotas() {
  const alvo = path.join(frontendRoot, 'scripts', 'trinco-rotas-sem-medicao.json');
  if (!fs.existsSync(alvo)) return { telas: [] };
  return JSON.parse(fs.readFileSync(alvo, 'utf8'));
}

export function validarLayout() {
  const manifesto = lerTelasDoManifesto();
  for (const extra of telasExtraDaLinhaDeComando()) {
    if (!manifesto.telas.includes(extra)) manifesto.telas.push(extra);
  }
  const falhas = [];
  const avisos = [];

  for (const tela of manifesto.telas) {
    const caminho = path.join(frontendRoot, tela);
    if (!fs.existsSync(caminho)) {
      falhas.push(`${tela}: listada no manifesto mas não existe.`);
      continue;
    }
    const codigo = fs.readFileSync(caminho, 'utf8');
    /*
      COMENTÁRIO NÃO É CÓDIGO — também para a R1 e a R10 (04/09).

      A R25, a R19 e a R21 já cortavam. A R1 e a R10 não, e o resultado é
      que o arquivo reprovava pela PRÓPRIA DOCUMENTAÇÃO da regra: um
      comentário explicando "antes havia uma <table> crua aqui" fazia a R1
      acusar tabela crua, e um comentário citando `text-xl` para explicar a
      remoção fazia a R10 acusar medida fora da escala.

      Três agentes tropeçaram nisso e tiveram de reescrever a explicação em
      prosa — que é exatamente o incentivo errado: a regra empurrando o
      código a documentar-se pior.

      Os comentários viram espaço, preservando as quebras, para o número da
      linha continuar batendo com o arquivo real.
    */
    const linhas = codigo
      .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (trecho) => ' '.repeat(trecho.length))
      .split('\n');

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
  // A R18 também no JSX: o CSS era só metade do problema.
  falhas.push(...validarOverflowEmJsx().falhas);

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

  // R21 — `confirmar()` devolve OBJETO; ler como booleano nunca cancela.
  const r21 = validarUsoDaConfirmacao();
  falhas.push(...r21.falhas);

  // R22 — hook do React usado sem import: o build PASSA e a tela quebra.
  const r22 = validarImportesDeHooks();
  falhas.push(...r22.falhas);

  // R25 — cor fora do sistema de tokens (decisão do cliente, 03/09).
  const r25 = validarCoresForaDoToken();
  falhas.push(...r25.falhas);

  /*
    EXCEÇÃO QUE NÃO COBRE NADA É LICENÇA EM BRANCO (04/09).

    Descoberto no fechamento do Financeiro: a `FinanceiroDre.jsx` tinha
    exceção de R10 registrada ("geometria de gráfico de barras") e o
    validador não emitia UM aviso sequer para ela — a medida à mão já
    tinha saído do arquivo numa fatia anterior, e ninguém apagou a
    exceção. Uma exceção nessas condições não é inofensiva: no dia em
    que alguém puser uma medida à mão nessa tela, a violação nasce
    REBAIXADA A AVISO e o gate passa verde.

    Por isso a exceção registrada agora precisa PROVAR que cobre algo.
    Se não cobre, o validador reprova pedindo a remoção da linha — o
    mesmo princípio dos trincos: o número só desce.
  */
  const excecoesUsadas = new Set(
    avisos.map((aviso) => `${aviso.split(':')[0]}|${(aviso.match(/\[(R\d+)\]/) || [])[1]}`)
  );
  for (const [tela, motivo] of Object.entries(manifesto.excecoes_medidas || {})) {
    if (!manifesto.telas.includes(tela)) continue;
    if (!excecoesUsadas.has(`${tela}|R10`)) {
      falhas.push(`${tela}:0 [EXCECAO] exceção de R10 registrada ("${motivo}") não cobre nenhuma violação — remova a linha de excecoes_medidas; exceção em branco rebaixa a violação futura para aviso.`);
    }
  }
  for (const [tela, motivo] of Object.entries(manifesto.excecoes_tabela_crua || {})) {
    if (!manifesto.telas.includes(tela)) continue;
    if (!excecoesUsadas.has(`${tela}|R1`)) {
      falhas.push(`${tela}:0 [EXCECAO] exceção de R1 registrada ("${motivo}") não cobre nenhuma tabela crua — remova a linha de excecoes_tabela_crua.`);
    }
  }

  /*
    `tambemCobre` existe porque a primeira versão deste check reportou 32
    telas descobertas e o número estava errado: três do RH/DP
    (RhDpPessoalSolicitacoes, RhDpJornada, RhDpApuracao) não têm rota
    própria — vivem nas abas da RhDpPessoal, e o harness JÁ as media pelas
    `variantes` dela. Cobertura real, invisível para uma comparação arquivo
    a arquivo.

    A saída não é o check adivinhar: é a entrada DECLARAR o que mede por
    dentro. Cobertura inferida seria o mesmo defeito que este check existe
    para pegar, só que do lado do falso negativo.
  */
  const noHarness = new Set(
    TELAS_DO_HARNESS.flatMap((t) => [t.arquivo, ...(t.tambemCobre || [])])
  );
  /*
    O que NÃO entra na conta de cobertura, e por quê:

    - `--extra`: tela em migração, apontada na linha de comando para medir
      ANTES de entrar no manifesto. Exigir dela lugar na lista do preview
      inverteria a ordem do trabalho.
    - fixture de prova (`__Prova…`): arquivo que o `regrasMordem` planta e
      apaga para provar que cada regra reprova. Não é tela; exigi-la no
      harness quebrou a própria prova de que "tela limpa passa" — foi assim
      que este descarte apareceu.
  */
  const transitorias = new Set([
    ...telasExtraDaLinhaDeComando(),
    ...manifesto.telas.filter((t) => /(^|\/)__Prova[^/]*$/.test(t))
  ]);
  /*
    A TERCEIRA PERGUNTA, que faltava (04/09).

    Este check comparava as duas listas ENTRE SI — manifesto estático contra
    lista do harness — e passava verde quando as duas concordavam. Nunca
    perguntou o que importa antes das duas: **existe rota que não está em
    nenhuma delas?**

    A medição do dia: 181 telas com rota no App.jsx, 61 no manifesto, 120
    NUNCA MEDIDAS no navegador. Dois tercos do sistema.

    E o mecanismo escondeu trabalho tres vezes seguidas — as 29 do
    Financeiro, as quatro do porte de Solicitacoes reformadas em 02/09 e
    jamais abertas pelo harness, e agora estas 120. Duas listas que
    concordam entre si nao provam cobertura; provam concordancia.

    Por isso o inventario tem TRINCO e nao lista fixa: o passivo herdado
    esta congelado num numero datado, e esse numero SO PODE DESCER. Rota
    nova que nasca fora das duas listas reprova na hora — nao existe
    "adiciono depois".
  */
  const rotasDeclaradas = inventariarRotasDoApp();
  const cobertas = new Set([...manifesto.telas, ...noHarness]);
  const semMedicao = rotasDeclaradas.filter((t) => !cobertas.has(t));
  const trincoRotas = lerTrincoRotas();
  const novasSemMedicao = semMedicao.filter((t) => !trincoRotas.telas.includes(t));
  if (novasSemMedicao.length > 0) {
    falhas.push(
      `${novasSemMedicao[0]}:0 [COBERTURA] ${novasSemMedicao.length} tela(s) COM ROTA no App.jsx e fora das DUAS listas — nunca serao medidas por ninguem. Rota nova entra no manifesto e na lista do harness na mesma leva. Telas: ${novasSemMedicao.join(', ')}`
    );
  }
  if (semMedicao.length < trincoRotas.telas.length) {
    avisos.push(`[COBERTURA] o passivo de rotas sem medicao caiu de ${trincoRotas.telas.length} para ${semMedicao.length} — atualize scripts/trinco-rotas-sem-medicao.json`);
  }

  const foraDoPreview = manifesto.telas.filter((t) => !noHarness.has(t) && !transitorias.has(t));
  if (foraDoPreview.length > 0) {
    falhas.push(
      `${foraDoPreview[0]}:0 [COBERTURA] ${foraDoPreview.length} tela(s) do manifesto estático NÃO estão em scripts/qa-preview/telas.mjs — o harness nunca as abre no preview, e "PRONTO" é verificado no preview. Telas: ${foraDoPreview.join(', ')}`
    );
  }
  const foraDoManifesto = [...noHarness].filter((t) => !manifesto.telas.includes(t));
  if (foraDoManifesto.length > 0) {
    falhas.push(
      `${foraDoManifesto[0]}:0 [COBERTURA] ${foraDoManifesto.length} tela(s) na lista do harness e FORA do manifesto estático — o preview mede o que as regras mecânicas não medem. Telas: ${foraDoManifesto.join(', ')}`
    );
  }

  return {
    falhas,
    avisos,
    telas: manifesto.telas.length,
    arquivosTabela: r17.arquivos,
    dialogosDoNavegador: r19.total,
    dialogosNoTrinco: r19.noTrinco
  };
}

/*
 * R25 — COR FORA DO SISTEMA DE TOKENS (03/09).
 *
 * Por que esta regra nasceu tarde, e o que isso custou: a M2 e a M3 existem
 * na DoD desde o começo, e o harness mede contraste no preview real. Mas
 * NENHUM check estático olhava a CLASSE de cor. Durante as levas eu conferia
 * `slate` por grep manual, agente por agente — e passo de verificação que
 * vive no hábito de alguém não é verificação.
 *
 * O resultado: a `FinanceiroTituloDetalhe` entrou no manifesto, fechou
 * matriz e ficou com 35 classes `slate` cruas, entre elas `text-slate-500`
 * (#64748b) — a MESMA cor que reprovou AA na `DefinirSenha`, 4,34:1 contra o
 * mínimo de 4,5:1.
 *
 * A regra fecha a família inteira, não só o `slate`: paleta crua do
 * Tailwind, hexadecimal, `rgb()`/`rgba()`/`hsl()` e cor arbitrária entre
 * colchetes. Cor de tela vem de token, ponto.
 *
 * O que continua permitido, e por quê:
 *  - `var(--...)` — é o token.
 *  - `currentColor`, `transparent`, `inherit` — herdam de quem já é token.
 *  - `text-white` / `bg-black` sobre superfície semântica declarada NÃO
 *    entram aqui: as classes sem número de paleta ficam de fora do padrão,
 *    porque `-white`/`-black` não são degraus de paleta e o uso legítimo
 *    delas é sobre fundo semântico.
 */
const PALETAS_CRUAS = [
  'slate', 'gray', 'grey', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
].join('|');
const PROPRIEDADES_DE_COR = ['text', 'bg', 'border', 'ring', 'divide', 'from', 'via', 'to', 'fill', 'stroke', 'shadow', 'outline', 'decoration', 'accent', 'caret', 'placeholder'].join('|');

function validarCoresForaDoToken() {
  const falhas = [];
  // Lê o manifesto aqui: `manifesto` é local da validarLayout(), e a raiz
  // se chama `frontendRoot`. A primeira versão desta função usava os dois
  // nomes errados e NUNCA RODOU — deu zero achado num arquivo com 35
  // classes cruas. Foi pega porque o resultado foi conferido contra dado
  // conhecido antes de ser aceito; sozinho, o zero parecia aprovação.
  const manifesto = lerTelasDoManifesto();
  const classeCrua = new RegExp(`\\b(?:${PROPRIEDADES_DE_COR})-(?:${PALETAS_CRUAS})-\\d{2,3}\\b`, 'g');
  const arbitraria = new RegExp(`\\b(?:${PROPRIEDADES_DE_COR})-\\[(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()`, 'g');
  const hexSolto = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;
  const funcaoDeCor = /\b(?:rgba?|hsla?)\s*\(/g;

  for (const tela of manifesto.telas) {
    const caminho = path.join(frontendRoot, tela);
    if (!fs.existsSync(caminho)) continue;
    const codigo = fs.readFileSync(caminho, 'utf8');
    /*
      COMENTÁRIO NÃO É CÓDIGO — e aqui o corte tem de ser no ARQUIVO
      INTEIRO, não linha a linha.

      A R19 e a R21 já tinham essa correção, mas linha a linha. Não basta:
      o comentário que explica a R25 é um bloco JSX de VÁRIAS LINHAS e cita
      as classes que a regra proíbe. Cortando só dentro da linha, o bloco
      sobrevive e o arquivo reprova por causa da própria explicação da
      regra. Aconteceu na ObraGestao em 03/09.

      (Este comentário não escreve o delimitador de fechamento de bloco
      como exemplo — escrevê-lo aqui fecharia ESTE comentário no meio e
      quebraria o arquivo. Foi o que aconteceu na primeira tentativa.)

      Os comentários viram espaço em branco preservando as quebras de
      linha, para o número da linha continuar batendo com o arquivo real.
    */
    const semComentarios = codigo
      .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (linha) => ' '.repeat(linha.length));
    const linhas = semComentarios.split('\n');
    linhas.forEach((semComentario, i) => {
      if (!semComentario.trim()) return;
      const registrar = (achado, tipo) => falhas.push(
        `${tela}:${i + 1} [R25] ${tipo}: "${achado}" — cor de tela vem de token (--c-*, --ui-*, --sem-*) ou de classe do sistema (text-muted, badge-*, btn-*). Paleta crua não acompanha o tema escuro e não passa pelo piso de contraste do ThemeContext.`
      );
      for (const m of semComentario.matchAll(classeCrua)) registrar(m[0], 'classe de paleta crua');
      for (const m of semComentario.matchAll(arbitraria)) registrar(m[0], 'cor arbitrária em classe');
      // Hex e rgb() fora de classe: só reprova quando não está dentro de
      // um `var(...)` de fallback, que é uso legítimo.
      if (!/var\(\s*--/.test(semComentario)) {
        for (const m of semComentario.matchAll(hexSolto)) registrar(m[0], 'cor em hexadecimal');
        for (const m of semComentario.matchAll(funcaoDeCor)) registrar(m[0].trim(), 'cor em função rgb/hsl');
      }
    });
  }
  return { falhas };
}

/**
 * R22 — hook do React usado SEM IMPORT. O `npm run build` passa: o bundler
 * não resolve identificadores globais, então `useRef` sem import vira um
 * `ReferenceError` só quando a tela renderiza — tela branca em produção.
 *
 * Aconteceu em 02/09 numa correção do próprio orquestrador, e o processo
 * inteiro usava "o build passou" como prova. Uma classe de defeito grave
 * que nenhum dos checks existentes via.
 *
 * Cobre também os hooks próprios do projeto (`useAvisos`, `useConfirmacao`),
 * que têm exatamente o mesmo comportamento.
 */
function validarImportesDeHooks() {
  const falhas = [];
  const HOOKS_REACT = [
    'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef',
    'useContext', 'useReducer', 'useLayoutEffect', 'useId', 'useTransition',
    'useDeferredValue', 'useSyncExternalStore', 'useImperativeHandle'
  ];
  const HOOKS_PADRAO = ['useAvisos', 'useConfirmacao'];

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
      const original = fs.readFileSync(caminho, 'utf8');
      const rel = path.relative(frontendRoot, caminho).split(path.sep).join('/');
      // Sem comentários: exemplo de uso em documentação não é chamada.
      const codigo = original.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (trecho) => trecho.replace(/[^\n]/g, ' '));

      // Tudo que o arquivo importa OU declara (um hook próprio definido no
      // mesmo arquivo não precisa de import).
      const importados = new Set();
      for (const bloco of original.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
        bloco[1].split(',').forEach((nome) => {
          const limpo = nome.split(' as ').pop().trim();
          if (limpo) importados.add(limpo);
        });
      }
      for (const decl of original.matchAll(/(?:export\s+)?(?:function|const|let|var)\s+(use[A-Z][A-Za-z0-9_$]*)/g)) {
        importados.add(decl[1]);
      }
      // `React.useState(...)` e `import * as React` também valem.
      const usaNamespace = /\bReact\s*\./.test(codigo) || /import\s+\*\s+as\s+React/.test(original);

      for (const hook of [...HOOKS_REACT, ...HOOKS_PADRAO]) {
        if (importados.has(hook)) continue;
        if (usaNamespace && HOOKS_REACT.includes(hook)) continue;
        // Chamada direta, não precedida de ponto (`algo.useState` é outra coisa).
        const chamada = new RegExp(`(^|[^.\\w])${hook}\\s*\\(`);
        if (!chamada.test(codigo)) continue;
        const linha = codigo.split('\n').findIndex((l) => chamada.test(l)) + 1;
        falhas.push(`${rel}:${linha} [R22] "${hook}" é usado e NÃO está importado — o build passa e a tela quebra em execução (ReferenceError).`);
      }
    }
  };
  varrer(path.join(frontendRoot, 'src'));
  return { falhas };
}

/**
 * R21 — `confirmar()` do `useConfirmacao` devolve `{ ok, texto }`, e OBJETO
 * É SEMPRE TRUTHY. Ler o retorno como booleano —
 * `const ok = await confirmar({...}); if (!ok) return;` — faz o botão
 * "Cancelar" SEGUIR COM A AÇÃO, calado.
 *
 * Aconteceu de verdade em 02/09: o hook nasceu devolvendo booleano e ganhou
 * o `campo` (que precisa devolver o texto junto) no meio da leva. Quatro
 * telas já escritas ficaram lendo objeto como booleano — uma delas no
 * ESTORNO DE FECHAMENTO, que cancela títulos no financeiro. Compilava,
 * passava no build, passava em todos os outros checks.
 *
 * Lição que a regra carrega: mudar o CONTRATO DE RETORNO de um componente
 * padrão no meio de uma leva não é mudança compatível — quem já escreveu
 * continua compilando e passa a fazer outra coisa. Ou o check nasce junto
 * com a mudança, ou a mudança espera.
 */
function validarUsoDaConfirmacao() {
  const falhas = [];
  // `const ok = await confirmar(` / `let x = await confirmar(` — qualquer
  // atribuição a um identificador simples. A forma correta desestrutura.
  /*
    DUAS FORMAS, não uma (03/09, achado da prova `regrasMordem.mjs`).

    A primeira versão só pegava a atribuição a identificador simples
    (`const ok = await confirmar(`). A prova de mordida plantou a NEGAÇÃO
    DIRETA — `if (!await confirmar({...})) return;` — e a regra passou
    batido. As duas quebram igual: objeto é sempre truthy, o `return` nunca
    acontece e o "Cancelar" segue com a ação.

    A regra existia, aparecia verde e cobria metade do que prometia. Só
    apareceu quando o check foi testado no sentido de REPROVAR.
  */
  const padroes = [
    {
      re: /\b(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*await\s+confirmar\s*\(/g,
      motivo: 'retorno de confirmar() guardado numa variável e lido como booleano'
    },
    {
      re: /!\s*await\s+confirmar\s*\(/g,
      motivo: 'retorno de confirmar() negado direto (`!await confirmar(...)`)'
    },
    {
      re: /\bif\s*\(\s*await\s+confirmar\s*\(/g,
      motivo: 'retorno de confirmar() usado direto como condição de `if`'
    }
  ];

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
      const original = fs.readFileSync(caminho, 'utf8');
      // Comentário não é código: a própria documentação do componente
      // mostra a forma ERRADA para explicar por que ela é errada, e marcar
      // isso seria ruído — e regra que vira ruído deixa de ser lida (R18).
      // Troca por espaço preservando as quebras, para a linha não deslocar.
      const codigo = original.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (trecho) => trecho.replace(/[^\n]/g, ' '));
      const rel = path.relative(frontendRoot, caminho).split(path.sep).join('/');
      for (const { re, motivo } of padroes) {
        for (const achado of codigo.matchAll(re)) {
          const linha = codigo.slice(0, achado.index).split('\n').length;
          falhas.push(`${rel}:${linha} [R21] ${motivo} — objeto é sempre truthy, então "Cancelar" seguiria com a ação. Escreva: const { ok } = await confirmar({ ... }).`);
        }
      }
    }
  };
  varrer(path.join(frontendRoot, 'src'));
  return { falhas };
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
      const original = fs.readFileSync(caminho, 'utf8');
      // Comentário não é código — a mesma correção que a R21 já tinha e
      // esta não: a documentação do Avisos/Confirmacao CITA
      // `window.alert()` para explicar o que substitui, e o check contava
      // essas citações como dívida. Pior que ruído: um agente chegou a
      // congelar os dois componentes no trinco, que passou a afirmar que
      // eles carregam caixa do navegador — exatamente o contrário do que
      // são. Trinco que mente é pior que trinco nenhum.
      const codigo = original.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (trecho) => trecho.replace(/[^\n]/g, ' '));
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
/*
  R18 EM JSX — a metade que faltava (03/09, achado da prova de mordida).

  A R18 varria só ARQUIVOS CSS. `style={{ overflow: 'hidden' }}` escrito
  direto na tela era invisível para ela — e é justamente assim que o defeito
  aparece na prática: a raiz da ComunicacaoInterna tinha exatamente isso,
  ancestral direto de tudo, matando faixa fixa e coluna fixa na tela
  inteira. Foi achado por LEITURA, não pela regra que existia para pegá-lo.

  A regra estava verde e cobria metade do problema.

  Aqui vale a mesma distinção do lado CSS: `overflow: hidden` junto de
  `textOverflow` ou `whiteSpace` é o IDIOMA DE TRUNCAGEM, recorta a própria
  caixa e não sequestra sticky nenhum. Esse não reprova. O que reprova é o
  `hidden` solto — para clipar sem criar scrollport existe `clip`.
*/
function validarOverflowEmJsx() {
  const falhas = [];
  const manifesto = lerTelasDoManifesto();
  for (const tela of manifesto.telas) {
    const caminho = path.join(frontendRoot, tela);
    if (!fs.existsSync(caminho)) continue;
    const codigo = fs.readFileSync(caminho, 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (t) => t.replace(/[^\n]/g, ' '));
    // Procura o objeto de estilo inteiro, para ver o `hidden` NO CONTEXTO
    // dos vizinhos — é o que separa truncagem de scrollport.
    for (const achado of codigo.matchAll(/\{\s*[^{}]*\boverflow(?:X|Y)?\s*:\s*'hidden'[^{}]*\}/g)) {
      const bloco = achado[0];
      if (/textOverflow|whiteSpace|WebkitLineClamp|lineClamp/.test(bloco)) continue;
      /*
        EU ESCREVI AQUI que "overflowX/overflowY sozinho não cria scrollport
        nos dois eixos", e isso está ERRADO. Medido no Chromium em 04/09:

          <div style="overflow-x: hidden"> →  overflowY computado: "auto"

        A especificação do CSS Overflow diz que, quando um eixo não é
        `visible`, o outro computa para `auto`. Ou seja: `overflow-x: hidden`
        sozinho CRIA scrollport e mata o sticky de qualquer descendente,
        exatamente como o `overflow: hidden`.

        Era um falso negativo por construção, escrito por mim ontem, na
        regra que existe justamente por causa de nove telas com a faixa fixa
        quebrada. `.financeiro-relatorios-page { overflow-x: hidden }` caía
        nele — e é ancestral da faixa fixa do hub de relatórios.

        `clip` continua fora, e aí a exclusão é correta: `clip` recorta sem
        criar scrollport, e é por isso que ele é a saída recomendada.
      */
      const linha = codigo.slice(0, achado.index).split('\n').length;
      falhas.push(`${tela}:${linha} [R18] \`overflow: 'hidden'\` em estilo inline — cria scrollport e MATA \`position: sticky\` de qualquer descendente (faixa fixa, coluna fixa), em silêncio. Para clipar sem criar scrollport use \`clip\`; para truncar texto, pareie com \`textOverflow\`.`);
    }
  }
  return { falhas };
}

function validarOverflow() {
  const falhas = [];
  const avisos = [];
  const caminhoTrinco = path.join(frontendRoot, 'scripts', 'trinco-overflow-css.json');
  const trincoOverflow = new Set(
    fs.existsSync(caminhoTrinco)
      ? JSON.parse(fs.readFileSync(caminhoTrinco, 'utf8')).seletores || []
      : []
  );
  const vistosNoTrinco = new Set();
  /*
    O `index.css` ENTRA (04/09), e a ausência dele era a maior lacuna da R18.

    A regra varria só `componentes-padrao.css` e os CSS de módulo com
    "governanca" no caminho. Mas o `index.css` tem 11.800 linhas de CSS DE
    TELA — e é lá que o mecanismo mais mora: `.financeiro-report-card`,
    `.financeiro-relatorios-content`, `.app-dense-table-card` e
    `.financeiro-relatorios-page` todos com `overflow: hidden`, todos
    ancestrais de tabela ou de faixa fixa.

    A R18 nasceu de nove telas com a faixa fixa quebrada e não cobria o
    arquivo onde o defeito mais aparece. Com trinco, porque o passivo é
    grande e a leva não é de CSS.
  */
  const alvos = [
    path.join('src', 'styles', 'componentes-padrao.css'),
    path.join('src', 'index.css')
  ];

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
      /*
        `-webkit-line-clamp` é o terceiro idioma de truncagem, e faltava
        aqui: o lado JSX já o reconhecia, o lado CSS não. `.line-clamp-2` e
        `.line-clamp-3` apareceram como falha ao estender a R18 ao
        `index.css`, e as duas são recorte de texto de livro — não têm
        descendente com sticky e não são scrollport de ninguém.
      */
      const ehTruncagem = /text-overflow/.test(corpo)
        || /white-space\s*:\s*nowrap/.test(corpo)
        || /-webkit-line-clamp|line-clamp\s*:/.test(corpo);
      if (ehTruncagem) continue;
      const linha = codigo.slice(0, bloco.index).split('\n').length;
      /*
        TRINCO PARA O `index.css` (04/09).

        Estender a R18 a ele expôs passivo herdado em 11.800 linhas de CSS
        de tela — reprovar tudo de uma vez travaria a leva e quem empurra em
        paralelo, que é o argumento do trinco desde a R19.

        Os arquivos que a regra JÁ cobria continuam reprovando direto: eles
        são do sistema de design e nasceram sob a regra. O `index.css` entra
        congelado, e o número só desce.
      */
      const nomeSeletor = seletor.split('\n').pop().trim().slice(0, 60);
      const mensagem = `${rel}:${linha} [R18] overflow hidden em "${nomeSeletor}" — cria contexto de rolagem e mata o position:sticky de faixa fixa, coluna fixa e cabeçalho de tabela dentro dele. Use \`overflow: clip\` (corta igual, sem criar scrollport); se for recorte de texto, acompanhe de text-overflow/white-space.`;
      if (rel.endsWith('index.css')) {
        if (!trincoOverflow.has(nomeSeletor)) falhas.push(`${mensagem} [NOVO — o trinco do index.css só desce]`);
        else vistosNoTrinco.add(nomeSeletor);
        continue;
      }
      falhas.push(mensagem);
    }
  });

  for (const seletor of trincoOverflow) {
    if (!vistosNoTrinco.has(seletor)) {
      avisos.push(`AVISO [R18] "${seletor}" saiu do index.css — remova a linha de scripts/trinco-overflow-css.json.`);
    }
  }
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
