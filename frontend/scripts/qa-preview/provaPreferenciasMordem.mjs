#!/usr/bin/env node
/**
 * PROVA — OS QUATRO ITENS DA LEVA DE PREFERÊNCIAS TÊM DE MORDER.
 * ============================================================================
 *
 * POR QUE ELA EXISTE, e por que não é opcional.
 *
 * A auditoria de 03/09 testou 35 instrumentos deste harness no sentido de
 * REPROVAR e achou SETE que não mordiam — nenhum por defeito em tela, todos
 * por defeito no INSTRUMENTO. Dois não mediam nada: a X3 abria com uma
 * condição impossível, e a T4 media folga pelo `scrollWidth` de um filho
 * inline, que é sempre zero. Os sete estavam verdes havia semanas.
 *
 * O caso mais caro veio depois: o T2 passou verde em 189 telas medindo a
 * EXISTÊNCIA de um ícone em vez do EFEITO do clique. Não era um check que
 * não mordia — era um check que mordia a coisa errada, e por isso ninguém
 * desconfiou dele.
 *
 * Item novo sem prova de reprovação entra no repositório com a mesma cara
 * dos sete. Então cada um dos quatro é exercitado aqui contra defeitos
 * PLANTADOS, um por vez, e contra a página que OBEDECE — porque check que
 * morde demais é tão inútil quanto o que não morde.
 *
 * O QUE ESTA PROVA COBRE E O QUE NÃO COBRE está escrito por extenso no topo
 * de `fixturePreferencias.mjs`: ela prova os CHECKS contra o contrato de DOM
 * e de rede, não os componentes reais — que estão sendo escritos agora, por
 * quatro agentes em paralelo, e cuja prova é o harness contra o preview.
 *
 * O `ramo` de cada caso não é enfeite: sem ele um defeito pode "passar"
 * acionando OUTRO braço do check, e o braço que se queria provar continua
 * sem prova. Foi assim que a prova irmã pegou a T6 e a T7.
 *
 * Rode com: node scripts/qa-preview/provaPreferenciasMordem.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { criarServidorDaFixture } from './fixturePreferencias.mjs';
import { esperarCarregar, mirarAlvo } from './verificar.mjs';
import {
  criarEspiaDePreferencias,
  checarColunasEscolhiveis,
  checarEsconderFiltro,
  checarRecolhimentoPersiste,
  checarCamadaFlutuante
} from './preferencias.mjs';

/* ------------------------------------------------------------------ casos
   `item`  — o item que TEM de reprovar (ou o estado que TEM de sair);
   `caso`  — qual capacidade a fixture desenha;
   `d`     — o defeito plantado;
   `planta`— o que foi plantado, em português, para o relatório;
   `ramo`  — trecho do motivo que identifica QUAL braço disparou;
   `estados` — quando presente, os estados aceitos (controles negativos e os
             casos de N/A e SEM DADO, que não são reprovação).
*/
const CASOS = [
  /* ---------------------------------------------------------------- P1 -- */
  {
    item: 'P1', caso: 'colunas', d: 'p1SemPainel',
    planta: 'tabela com 5 colunas de conteúdo e NENHUM painel "Colunas" — a capacidade da leva não chegou nesta tela',
    ramo: 'NÃO oferece o painel'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1PainelRecortado',
    planta: 'painel que ABRE (caixa de layout intacta) e é RECORTADO — nada dele é pintado. É a família do defeito de 05/09 que o T2 antigo deixava passar',
    ramo: 'RECORTADO ou COBERTO'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1NaoEsconde',
    planta: 'painel que recebe a marcação e não esconde nada — marca e não faz',
    ramo: 'CONTINUA no cabeçalho'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1SoCabecalho',
    planta: 'coluna que sai do CABEÇALHO e continua nas CÉLULAS — a linha inteira desalinha',
    ramo: 'as CÉLULAS não acompanharam'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1NaoPersiste',
    planta: 'escolha que é gravada e não é lida — a coluna volta no F5',
    ramo: 'VOLTOU na recarga'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1SoLocalStorage',
    planta: 'a coluna some, sobrevive à recarga… e a preferência ficou SÓ NO NAVEGADOR (nenhum PUT, nenhuma carga do servidor). É o defeito que a leva existe para acabar, e o único passo que o separa de uma entrega correta',
    ramo: 'NÃO FOI PARA O BANCO'
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1RestauraNao',
    planta: '"Restaurar padrão" que promete restaurar e não restaura — a preferência do usuário de QA fica suja para a próxima corrida',
    ramo: 'NÃO devolveu a coluna'
  },
  /* ---------------------------------------------------------------- P2 -- */
  {
    item: 'P2', caso: 'filtros', d: 'p2NaoLimpa',
    planta: 'filtro que some da faixa e CONTINUA recortando a lista — o achado N53 inteiro, sem sintoma visual nenhum',
    ramo: 'a consulta NÃO foi refeita'
  },
  {
    item: 'P2', caso: 'filtros', d: 'p2CampoResidual',
    planta: 'esconder limpa a consulta mas deixa o campo no DOM com o valor dentro — recortando escondido',
    ramo: 'CONTINUA no DOM com o valor'
  },
  {
    item: 'P2', caso: 'filtros', d: 'p2CaixaDesabilitada',
    planta: 'a caixa do filtro PREENCHIDO vem desabilitada — bloquear é a saída que o N53 recusou',
    ramo: 'está desabilitada no seletor'
  },
  {
    item: 'P2', caso: 'filtros', d: 'p2SumiuDaLista',
    planta: 'o filtro preenchido some da lista do seletor — quem preencheu perde o caminho de escondê-lo',
    ramo: 'sumiu da lista do seletor'
  },
  /* ---------------------------------------------------------------- P3 -- */
  {
    item: 'P3', caso: 'blocos', d: 'p3NaoRecolhe',
    planta: 'botão de recolher que está lá e não recolhe',
    ramo: 'NÃO recolheu'
  },
  {
    item: 'P3', caso: 'blocos', d: 'p3NaoLe',
    planta: 'recolhimento que é GRAVADO e não é LIDO — no F5 volta tudo aberto',
    ramo: 'voltou ABERTO'
  },
  {
    item: 'P3', caso: 'blocos', d: 'p3NaoGrava', declara: true,
    planta: 'recolhimento que não grava NADA, numa tela cujo arquivo DECLARA chavePreferencia — o silêncio que, sem este braço, sairia como N/A cinza',
    ramo: 'NENHUMA gravação de preferência'
  },
  /* ---------------------------------------------------------------- P4 -- */
  {
    item: 'P4', caso: 'colunas', d: 'p4NaoFechaFora',
    planta: 'camada que não fecha ao clicar fora',
    ramo: 'CONTINUA aberta'
  },
  {
    item: 'P4', caso: 'colunas', d: 'p4NaoFechaEsc',
    planta: 'camada que fecha no clique fora e ignora o Esc',
    ramo: 'apertei Esc'
  },
  {
    item: 'P4', caso: 'colunas', d: 'p4NaoReabre',
    planta: 'camada que fecha e NÃO REABRE — troca um defeito por outro',
    ramo: 'NÃO REABRIU'
  },
  {
    item: 'P4', caso: 'colunas', d: 'p4MataSelecao',
    planta: 'fechamento no mousedown: a camada fecha no clique da própria opção e a seleção morre. É a terceira parte do item, a que ninguém lembra — e o atalho mais barato para deixar as duas primeiras verdes',
    ramo: 'SAIU DO DOM'
  },
  {
    item: 'P4', caso: 'colunas', d: 'p4SelecaoMorta',
    planta: 'camada que fecha certo e cuja opção não muda de estado ao ser clicada',
    ramo: 'a marcação NÃO mudou'
  }
];

/* CONTROLES NEGATIVOS — a página que OBEDECE, e as formas que PARECEM
   defeito e não são. Sem eles, um check que reprovasse tudo passaria por
   rigoroso. */
const NEGATIVOS = [
  {
    item: 'P1', caso: 'colunas', d: '',
    planta: 'tabela que obedece: esconde a coluna do cabeçalho e das células, persiste, grava no banco e restaura',
    estados: ['PASSOU']
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1DuasColunas',
    planta: 'tabela com 2 colunas — abaixo do limiar do painel, e por isso sem painel (decisão do componente, não defeito)',
    estados: ['N/A']
  },
  {
    item: 'P1', caso: 'colunas', d: 'p1SemLinha',
    planta: 'tabela com painel e SEM linha na base — o efeito nas células não pode ser medido',
    estados: ['SEM DADO']
  },
  {
    item: 'P2', caso: 'filtros', d: '',
    planta: 'faixa que obedece: esconder limpa o valor e refaz a consulta',
    estados: ['PASSOU']
  },
  {
    item: 'P2', caso: 'filtros', d: 'p2SemSeletor',
    planta: 'tela com filtros e SEM o seletor — a capacidade não foi ligada aqui; N/A declarado, nunca falha',
    estados: ['N/A']
  },
  {
    item: 'P3', caso: 'blocos', d: '',
    planta: 'bloco que obedece: recolhe, grava e continua recolhido depois da recarga',
    estados: ['PASSOU']
  },
  {
    item: 'P3', caso: 'blocos', d: 'p3NaoGrava', declara: false,
    planta: 'bloco recolhível que não grava, numa tela que NÃO declara chavePreferencia — recolhimento de sessão por decisão da tela',
    estados: ['N/A']
  },
  {
    item: 'P3', caso: 'blocos', d: 'p3SemBloco',
    planta: 'tela sem bloco recolhível',
    estados: ['N/A']
  },
  {
    item: 'P4', caso: 'colunas', d: '',
    planta: 'camada que obedece: fecha ao clicar fora, fecha com Esc, e a opção clicada muda de estado',
    estados: ['PASSOU']
  },
  {
    item: 'P4', caso: 'camada', d: '',
    planta: 'menu de AÇÕES que fecha certo e não tem opção de marcação — clicar "Excluir" para provar seleção criaria estrago de verdade',
    estados: ['SEM DADO']
  }
];

/* ------------------------------------------------------------- relatório */
let falhas = 0;
const registrar = (ok, texto) => {
  if (!ok) falhas += 1;
  console.log(`${ok ? '  ok   ' : '  FALHA'} ${texto}`);
};

async function medir(navegador, servidor, caso) {
  servidor.zerar();
  /*
    UM CONTEXTO NOVO POR CASO. O `localStorage` é do contexto, e o defeito
    `p1SoLocalStorage` grava lá de propósito: sem o contexto novo, o caso
    seguinte abriria com a coluna já escondida pelo anterior e mediria outra
    coisa. A prova irmã já foi mordida exatamente por isso.
  */
  const contexto = await navegador.newContext({ viewport: { width: 1600, height: 900 } });
  const pagina = await contexto.newPage();
  const espia = criarEspiaDePreferencias(pagina);
  const ctx = {
    esperarCarregar,
    mirarAlvo,
    espia,
    declaraChaveDeBloco: Boolean(caso.declara)
  };
  const resultado = {};
  try {
    await pagina.goto(servidor.rota(caso.caso, caso.d), { waitUntil: 'domcontentloaded' });
    await esperarCarregar(pagina);
    if (caso.item === 'P1') await checarColunasEscolhiveis(pagina, { id: 'prova' }, resultado, ctx);
    else if (caso.item === 'P2') await checarEsconderFiltro(pagina, { id: 'prova' }, resultado, ctx);
    else if (caso.item === 'P3') await checarRecolhimentoPersiste(pagina, { id: 'prova', arquivo: 'src/pages/Prova.jsx' }, resultado, ctx);
    else if (caso.item === 'P4') await checarCamadaFlutuante(pagina, { id: 'prova' }, resultado, ctx);
  } finally {
    await pagina.close();
    await contexto.close();
  }
  return resultado;
}

async function main() {
  const servidor = await criarServidorDaFixture();
  /* SEM PROXY, de propósito: esta prova só fala com 127.0.0.1, e o Chromium
     herda `http_proxy` do ambiente se ninguém disser o contrário — a prova
     irmã já foi mordida por isso (relay devolvendo 405 e fixture vazia). */
  const navegador = await chromium.launch({
    executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
    args: ['--no-proxy-server']
  });

  try {
    for (const item of ['P1', 'P2', 'P3', 'P4']) {
      const doItem = CASOS.filter((c) => c.item === item);
      if (!doItem.length) continue;
      console.log(`\n— ${item}: defeitos plantados —`);
      for (const caso of doItem) {
        const resultado = await medir(navegador, servidor, caso);
        const obtido = resultado[caso.item] || { estado: 'AUSENTE' };
        const ramoCerto = !caso.ramo || String(obtido.motivo || '').includes(caso.ramo);
        const mordeu = obtido.estado === 'FALHOU' && ramoCerto;
        registrar(mordeu, `${caso.item} ← ${caso.planta} :: ${obtido.estado}`
          + (obtido.motivo ? ` — ${String(obtido.motivo).slice(0, 240)}` : '')
          + (!ramoCerto && obtido.estado === 'FALHOU' ? ` (ramo esperado: "${caso.ramo}")` : ''));
      }
    }

    console.log('\n— sentido inverso: o que obedece NÃO pode ser acusado —');
    for (const caso of NEGATIVOS) {
      const resultado = await medir(navegador, servidor, caso);
      const obtido = resultado[caso.item] || { estado: 'AUSENTE' };
      registrar(caso.estados.includes(obtido.estado),
        `${caso.item} = ${caso.estados.join('/')} ← ${caso.planta} :: ${obtido.estado}`
        + (obtido.motivo ? ` — ${String(obtido.motivo).slice(0, 240)}` : ''));
    }
  } finally {
    await navegador.close();
    servidor.fechar();
  }

  /* Cobertura: nenhum dos quatro pode ficar sem prova de reprovação E sem
     controle negativo. Item com só metade da prova é item pela metade. */
  const ITENS = ['P1', 'P2', 'P3', 'P4'];
  const semDefeito = ITENS.filter((i) => !CASOS.some((c) => c.item === i));
  const semNegativo = ITENS.filter((i) => !NEGATIVOS.some((c) => c.item === i && c.estados.includes('PASSOU')));
  registrar(semDefeito.length === 0,
    `todos os ${ITENS.length} itens têm defeito plantado${semDefeito.length ? ` — faltam ${semDefeito.join(', ')}` : ''}`);
  registrar(semNegativo.length === 0,
    `todos os ${ITENS.length} itens têm controle negativo que PASSA${semNegativo.length ? ` — faltam ${semNegativo.join(', ')}` : ''}`);

  console.log(`\n  ${ITENS.length} itens · ${CASOS.length} defeitos plantados · ${NEGATIVOS.length} controle(s) negativo(s)`);
  console.log(`\n[provas] itens da leva de preferências mordem: ${falhas === 0 ? 'ok' : `${falhas} check(s) sem prova`}`);
  /* `exitCode`, nunca `exit()`: a saída desta prova vai para pipe como a do
     harness, e `exit()` trunca com bytes na fila. */
  if (falhas) process.exitCode = 1;
}

await main();
