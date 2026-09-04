#!/usr/bin/env node
/**
 * PROVA — OS SETE ITENS QUE MORAM NO RUNNER TÊM DE MORDER.
 *
 * A `itensDaDoDMordem.mjs` provou os 27 itens que `checks.mjs` mede num DOM
 * parado e declarou, por escrito, a lacuna que sobrava: "ficam DE FORA, e
 * continuam sem prova de reprovação, os itens que só existem na interação e
 * moram no runner (`verificar.mjs`): C1, T3, F3, M2, R1, R3 e X2". Esta
 * prova fecha essa lacuna.
 *
 * Por que ela importa mais do que a média: a auditoria de 03/09 testou 35
 * instrumentos no sentido de REPROVAR e achou 7 que não mordiam — nenhum
 * deles por defeito em tela, todos por defeito no INSTRUMENTO. Dois não
 * mediam nada (a X3 abria com uma condição impossível; a T4 media folga
 * pelo `scrollWidth` de um filho inline, sempre zero). Estes sete nunca
 * tinham sido testados assim.
 *
 * A T3 é o caso mais grave e vem primeiro: foi REESCRITA em 03/09 e nunca
 * provada. A versão anterior exigia o OPOSTO da regra de posse de largura
 * ("nenhuma outra coluna pode mudar") e ficava verde porque a tabela não
 * redistribuía nada — que era justamente o defeito que a T4 apontava. Um
 * check verde provando que o outro estava certo.
 *
 * COMO SE PROVA: importando e executando as FUNÇÕES REAIS de
 * `scripts/qa-preview/verificar.mjs` contra uma fixture que monta os
 * COMPONENTES REAIS do sistema (Pagina, PageHeader, BarraFiltros,
 * TabelaPadrao, OverlayModal) num servidor local. Provar uma cópia não
 * prova nada — nem do check, nem do componente.
 *
 * Rode com `npm run provas` ou `node scripts/provas/itensDoRunnerMordem.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { criarServidorDaFixture } from './fixtures/paginaRunner.mjs';
import {
  checarFaixa,
  checarRedimensionamento,
  checarEtiquetasFiltro,
  checarModalCadastro,
  checarMobile,
  r3Para,
  m2Para,
  esperarCarregar
} from '../qa-preview/verificar.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_FRONT = path.resolve(AQUI, '..', '..');

/* ---------------------------------------------------------------- casos --
   `item`  — o item da DoD que TEM de reprovar;
   `d`     — o defeito plantado na fixture (query `?d=`);
   `planta`— o que a fixture põe na página, em português, para o relatório;
   `ramo`  — trecho do motivo que identifica QUAL braço do check disparou.
             Sem ele, um defeito pode "passar" acionando outro braço e o
             braço que se queria provar continua sem prova (foi assim que a
             prova irmã pegou a T6 e a T7).
*/
const CASOS_T3 = [
  {
    item: 'T3',
    d: 't3GravaTodas',
    planta: 'o arrasto grava o MAPA INTEIRO no localStorage (todas as colunas viram "do usuário")',
    ramo: 'gravou mais de uma coluna'
  },
  {
    item: 'T3',
    d: 't3NaoPersiste',
    planta: 'o arrasto não é gravado — a largura some na recarga',
    ramo: 'não persistiu ao recarregar'
  },
  {
    item: 'T3',
    d: 't3AlcaMorta',
    planta: 'alça que não recebe o ponteiro — arrastar não muda a largura',
    ramo: 'coluna arrastada mudou'
  },
  {
    item: 'T3',
    d: 't3Clipada',
    planta: 'contêiner com overflow-x: clip — a tabela sai da borda e o resto fica inalcançável',
    ramo: 'SEM rolagem própria'
  },
  {
    item: 'T3',
    d: 't3TransbordaVisivel',
    planta: 'contêiner com overflow: visible — a tabela derrama para fora do bloco sem rolar',
    ramo: 'SEM rolagem própria'
  }
];

const CASOS_NAVEGADOR = [
  /* ---- C1: faixa fixa na rolagem ---- */
  { item: 'C1', d: 'c1SemFaixa', planta: 'tela sem .app-page-header', ramo: 'faixa .app-page-header ausente' },
  { item: 'C1', d: 'c1Vao', planta: 'faixa grudando 40px abaixo da topbar (vão transparente)', ramo: 'vão de' },
  { item: 'C1', d: 'c1NaoOpaca', planta: 'faixa com fundo translúcido (conteúdo rola por trás)', ramo: 'fundo não opaco' },
  { item: 'C1', d: 'c1FaixaSome', planta: 'faixa com position: static — sobe junto com a página', ramo: 'faixa sumiu na rolagem' },
  { item: 'C1', d: 'c1NaoCompacta', planta: 'faixa copiada à mão, sem compactar na rolagem', ramo: 'não compactou' },
  { item: 'C1', d: 'c1CompactaAlta', planta: 'faixa compacta com 140px de altura', ramo: 'faixa compacta com' },

  /* ---- F3: filtro marcado vira etiqueta removível ---- */
  { item: 'F3', d: 'f3SemOpcoes', planta: 'filtro que abre sem nenhuma opção de marcação', ramo: 'sem opções de MARCAÇÃO' },
  { item: 'F3', d: 'f3SemEtiqueta', planta: 'tela que recebe a marcação e não guarda — nenhuma etiqueta nasce', ramo: 'não gerou etiqueta' },
  { item: 'F3', d: 'f3EtiquetaSemRemover', planta: 'etiqueta de filtro sem botão de remover', ramo: 'sem botão de remover' },
  { item: 'F3', d: 'f3EtiquetaFica', planta: 'botão de remover que não remove a etiqueta', ramo: 'não sumiu ao remover' },

  /* ---- R1: cadastro raro abre em modal ---- */
  { item: 'R1', d: 'r1Inline', planta: '"Novo usuário" abrindo formulário INLINE na própria página', ramo: 'INLINE' },

  /* ---- X2: faixa fixa também no 390 ---- */
  { item: 'X2', d: 'c1SemFaixa', planta: 'mobile sem .app-page-header', ramo: 'faixa ausente no mobile', mobile: true },
  { item: 'X2', d: 'x2Vao', planta: 'mobile com vão de 40px entre topbar e faixa', ramo: 'vão de', mobile: true },
  { item: 'X2', d: 'x2NaoOpaca', planta: 'mobile com faixa translúcida', ramo: 'não opaca', mobile: true },
  { item: 'X2', d: 'c1FaixaSome', planta: 'mobile com faixa não fixa', ramo: 'faixa sumiu na rolagem', mobile: true }
];

/* CONTROLES NEGATIVOS — a fixture OBEDIENTE, e as formas que PARECEM
   defeito e não são. Check que morde demais é tão inútil quanto o que não
   morde. */
const NEGATIVOS = [
  {
    item: 'T3',
    d: '',
    planta: 'tabela que obedece: só a arrastada é gravada e a VIZINHA muda de largura para devolver a sobra',
    estados: ['PASSOU']
  },
  {
    item: 'C1',
    d: '',
    planta: 'faixa fixa, opaca, encostada na topbar e compactando na rolagem',
    estados: ['PASSOU']
  },
  {
    item: 'F3',
    d: '',
    planta: 'filtro que marca, gera etiqueta e a etiqueta some ao remover',
    estados: ['PASSOU']
  },
  {
    item: 'R1',
    d: '',
    planta: '"Novo usuário" abrindo em modal',
    estados: ['PASSOU']
  },
  {
    item: 'R1',
    d: 'r1RotaPropria',
    planta: '"Novo usuário" levando a uma ROTA PRÓPRIA de cadastro (decisão registrada, não defeito)',
    estados: ['N/A']
  },
  {
    item: 'R1',
    d: 'r1SemAcao',
    planta: 'tela sem ação principal de cadastro',
    estados: ['N/A']
  },
  {
    item: 'X2',
    d: '',
    planta: 'mobile com faixa fixa e opaca',
    estados: ['PASSOU'],
    mobile: true
  }
];

/* Itens sem prova possível — preenchido pela análise, não por conveniência.
   Cada entrada diz POR QUE e O QUE FALTARIA. */
const NAO_PROVAVEIS = [];

/* ------------------------------------------------------------- relatório */
let falhas = 0;
const registrar = (ok, texto) => {
  if (!ok) falhas += 1;
  console.log(`${ok ? '  ok   ' : '  FALHA'} ${texto}`);
};

/* ------------------------------------------------- 1) M2 e R3: FUNÇÕES PURAS
   Não precisam de navegador: `m2Para` e `r3Para` recebem o resultado do
   validador estático e a lista de caixas de diálogo espionadas, e devolvem
   o veredito. São provadas com entradas montadas à mão — inclusive uma
   REAL: um arquivo que está mesmo no trinco da R19. */
function provarPuras() {
  const ARQUIVO = 'src/pages/UsuarioExemplo.jsx';

  /* --- M2 --- */
  const m2Falha = m2Para(ARQUIVO, {
    ok: false,
    saida: `FALHA ${ARQUIVO}:42 [R10] medida à mão em style inline — use um degrau da escala\n`
  });
  registrar(m2Falha.estado === 'FALHOU' && /R10/.test(m2Falha.motivo || ''),
    `M2 ← validador estático reprovando a tela :: ${m2Falha.estado} — ${(m2Falha.motivo || '').slice(0, 90)}`);

  const m2Verde = m2Para(ARQUIVO, { ok: true, saida: '[layout] ok' });
  registrar(m2Verde.estado === 'PASSOU',
    `M2 NÃO acusa validador limpo :: ${m2Verde.estado}`);

  const m2DeOutraTela = m2Para(ARQUIVO, {
    ok: false,
    saida: 'FALHA src/pages/OutraTela.jsx:9 [R10] medida à mão em style inline\n'
  });
  registrar(m2DeOutraTela.estado === 'PASSOU',
    `M2 NÃO acusa a tela pela falha de OUTRO arquivo :: ${m2DeOutraTela.estado}`);

  /* --- R3 --- */
  const r3Runtime = r3Para(ARQUIVO, { ok: true, saida: '' }, [{ tipo: 'confirm', mensagem: 'Excluir registro?' }]);
  registrar(r3Runtime.estado === 'FALHOU' && /caixa do navegador/.test(r3Runtime.motivo || ''),
    `R3 ← confirm() do navegador disparado na carga :: ${r3Runtime.estado} — ${(r3Runtime.motivo || '').slice(0, 90)}`);

  const r3Estatico = r3Para(ARQUIVO, {
    ok: false,
    saida: `FALHA ${ARQUIVO} [R19] 3 chamada(s) de alert()/confirm()/prompt() do navegador em arquivo NOVO para a regra\n`
  }, []);
  registrar(r3Estatico.estado === 'FALHOU' && /R19 estático/.test(r3Estatico.motivo || ''),
    `R3 ← R19 estática acusando o arquivo :: ${r3Estatico.estado} — ${(r3Estatico.motivo || '').slice(0, 90)}`);

  /* O trinco: arquivo congelado com passivo herdado não emite linha nenhuma
     do validador (a contagem bate), e mesmo assim TEM caixa do navegador.
     Usa um arquivo REAL do trinco — inventar um não provaria o ramo. */
  const trinco = JSON.parse(
    fs.readFileSync(path.join(RAIZ_FRONT, 'scripts', 'trinco-dialogos.json'), 'utf8')
  ).arquivos || {};
  const doTrinco = Object.keys(trinco)[0];
  const r3Trinco = r3Para(doTrinco, { ok: true, saida: '[layout] ok' }, []);
  registrar(r3Trinco.estado === 'FALHOU' && /trinco/.test(r3Trinco.motivo || ''),
    `R3 ← arquivo silenciosamente congelado no trinco da R19 (${doTrinco}) :: ${r3Trinco.estado}`);

  const r3Limpo = r3Para(ARQUIVO, { ok: true, saida: '[layout] ok' }, []);
  registrar(r3Limpo.estado === 'PASSOU',
    `R3 NÃO acusa arquivo sem caixa, fora do trinco e com validador limpo :: ${r3Limpo.estado}`);
}

/* ----------------------------------------------------- 2) itens do navegador */
async function medir(navegador, servidor, caso) {
  const resultado = {};
  const url = servidor.rota(caso.d);
  /*
    UM CONTEXTO NOVO POR CASO. O localStorage é do CONTEXTO, e a T3 grava
    largura lá de propósito — o caso seguinte abria com a coluna já
    arrastada pelo anterior, o que muda a distribuição da tabela inteira e
    inventa resultado (dois defeitos de transbordo passaram verdes assim,
    porque a tabela nascia estreita em vez de larga).
  */
  const contexto = await navegador.newContext({ viewport: { width: 1600, height: 900 } });
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(url, { waitUntil: 'domcontentloaded' });
    await esperarCarregar(pagina);
    if (caso.item === 'T3') {
      await checarRedimensionamento(pagina, { id: 'prova' }, resultado);
    } else if (caso.item === 'C1') {
      await checarFaixa(pagina, resultado);
    } else if (caso.item === 'F3') {
      await checarEtiquetasFiltro(pagina, resultado);
    } else if (caso.item === 'R1') {
      await checarModalCadastro(pagina, { id: 'prova' }, resultado);
    } else if (caso.item === 'X2') {
      // `checarMobile` abre a PRÓPRIA aba em 390 e navega para a url —
      // `tela.id` nulo evita que ele grave captura na pasta do harness.
      await checarMobile(pagina, contexto, { id: null }, url, resultado);
    }
  } finally {
    await pagina.close();
    await contexto.close();
  }
  return resultado;
}

async function main() {
  console.log('— funções puras (M2, R3): sem navegador —');
  provarPuras();

  const servidor = await criarServidorDaFixture();
  /* SEM PROXY, de propósito: esta prova só fala com 127.0.0.1, e o Chromium
     herda `http_proxy` do ambiente se ninguém disser o contrário — a prova
     irmã já foi mordida por isso (relay devolvendo 405 e fixture vazia). */
  const navegador = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-proxy-server']
  });
  try {
    console.log('\n— T3 (arrasto de coluna): reescrita em 03/09, nunca provada —');
    for (const caso of [...CASOS_T3]) {
      const resultado = await medir(navegador, servidor, caso);
      const obtido = resultado[caso.item] || { estado: 'AUSENTE' };
      const ramoCerto = !caso.ramo || String(obtido.motivo || '').includes(caso.ramo);
      const mordeu = obtido.estado === 'FALHOU' && ramoCerto;
      registrar(mordeu, `${caso.item} ← ${caso.planta} :: ${obtido.estado}`
        + (obtido.motivo ? ` — ${String(obtido.motivo).slice(0, 190)}` : '')
        + (!ramoCerto && obtido.estado === 'FALHOU' ? ` (ramo esperado: "${caso.ramo}")` : ''));
    }

    console.log('\n— C1, F3, R1, X2 —');
    for (const caso of CASOS_NAVEGADOR) {
      const resultado = await medir(navegador, servidor, caso);
      const obtido = resultado[caso.item] || { estado: 'AUSENTE' };
      const ramoCerto = !caso.ramo || String(obtido.motivo || '').includes(caso.ramo);
      const mordeu = obtido.estado === 'FALHOU' && ramoCerto;
      registrar(mordeu, `${caso.item} ← ${caso.planta} :: ${obtido.estado}`
        + (obtido.motivo ? ` — ${String(obtido.motivo).slice(0, 190)}` : '')
        + (!ramoCerto && obtido.estado === 'FALHOU' ? ` (ramo esperado: "${caso.ramo}")` : ''));
    }

    console.log('\n— sentido inverso: o que obedece NÃO pode ser acusado —');
    for (const caso of NEGATIVOS) {
      const resultado = await medir(navegador, servidor, caso);
      const obtido = resultado[caso.item] || { estado: 'AUSENTE' };
      registrar(caso.estados.includes(obtido.estado),
        `${caso.item} = ${caso.estados.join('/')} ← ${caso.planta} :: ${obtido.estado}`
        + (obtido.motivo ? ` — ${String(obtido.motivo).slice(0, 190)}` : ''));
    }
  } finally {
    await navegador.close();
    servidor.fechar();
  }

  /* 3) Cobertura: cada um dos sete tem prova ou declaração explícita. */
  const ITENS = ['T3', 'C1', 'F3', 'M2', 'R1', 'R3', 'X2'];
  const comProva = new Set([
    ...CASOS_T3.map((c) => c.item),
    ...CASOS_NAVEGADOR.map((c) => c.item),
    'M2', 'R3'
  ]);
  const semProva = ITENS.filter((i) => !comProva.has(i) && !NAO_PROVAVEIS.some((n) => n.item === i));
  registrar(semProva.length === 0,
    `todos os 7 itens do runner têm prova ou declaração${semProva.length ? ` — faltam ${semProva.join(', ')}` : ''}`);

  console.log('');
  NAO_PROVAVEIS.forEach((n) => console.log(`  n/p    ${n.item} declarado NÃO-PROVÁVEL: ${n.motivo}`));
  console.log(
    `  ${ITENS.length} itens · ${CASOS_T3.length + CASOS_NAVEGADOR.length} defeitos plantados · `
    + `${NEGATIVOS.length} controle(s) negativo(s) · ${NAO_PROVAVEIS.length} não-provável(is)`
  );
  console.log(`\n[provas] itens do runner mordem: ${falhas === 0 ? 'ok' : `${falhas} check(s) sem prova de reprovação`}`);
  if (falhas) process.exitCode = 1;
}

await main();
