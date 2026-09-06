#!/usr/bin/env node
/**
 * PROVA — TODA CAMADA FLUTUANTE CABE NA JANELA, NAS TRÊS LARGURAS.
 * ============================================================================
 *
 * O PEDIDO DO CLIENTE, com as palavras dele: "Todo painel, menu e lista
 * suspensa do sistema deve se reposicionar para caber na janela — se não
 * couber para um lado, abre para o outro; se não couber em nenhum, alinha à
 * borda com rolagem interna."
 *
 * O ACHADO QUE O GEROU: o painel "Filtros visíveis" abria PARA FORA da borda
 * esquerda da janela e ficava cortado pela metade — o aviso "preenchido:
 * esconder limpa e refaz a consulta", que é o que explica a consequência do
 * clique, ficava do lado de fora. E o item P4 do harness passava VERDE nessa
 * tela: ele media abrir, fechar no clique fora, fechar no Esc e selecionar —
 * quatro coisas certas sobre uma camada que ninguém consegue ler.
 *
 * ----------------------------------------------------------------------------
 * O QUE ESTA PROVA MEDE, e por que ela é diferente da `provaPreferenciasMordem`.
 *
 * Aquela prova o INSTRUMENTO (o passo 1b do P4 reprova uma camada que vaza).
 * Esta prova os COMPONENTES REAIS: monta `PainelFiltrosVisiveis`, `MenuMais` e
 * `FiltroRapido` com o CSS real do sistema e mede a caixa deles com
 * `getBoundingClientRect()` contra `innerWidth`/`innerHeight`.
 *
 * As duas são necessárias e nenhuma substitui a outra: instrumento que não
 * morde aprova tela quebrada, e instrumento afiado sem medição de componente
 * não prova que o componente foi consertado.
 *
 * ----------------------------------------------------------------------------
 * NAS TRÊS LARGURAS DO HARNESS — 1920, 1366 e 390. É em 390 que uma camada de
 * 260px de largura mínima não cabe do lado errado do botão, e foi lá que o
 * cliente fotografou. E com o botão nas DUAS BORDAS: camada ancorada pela
 * direita só vaza com o botão à esquerda; a ancorada pela esquerda, o
 * contrário. Um lado só é como o defeito passou.
 *
 * A MORDIDA: o caso `semPosicao` devolve o painel ao arranjo ANTERIOR
 * (`absolute; right: 0`) e a prova exige que ele REPROVE. Sem isso, esta
 * medição poderia estar lendo zero e ninguém saberia.
 *
 * Rode com `npm run provas` ou `node scripts/qa-preview/provaCamadasCabem.mjs`.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { criarServidorDeCamadas } from './servidorCamadas.mjs';

const LARGURAS = [
  { rotulo: '1920', width: 1920, height: 1080 },
  { rotulo: '1366', width: 1366, height: 900 },
  { rotulo: '390', width: 390, height: 844 }
];

/* As camadas montadas, com o abridor e o nó que cada uma pinta. O `data-camada`
   e o `data-lado` da fixture é que amarram um ao outro — sem eles a medição
   pegaria a camada da âncora vizinha e diria que está tudo certo. */
const CAMADAS = [
  {
    nome: 'painel "Filtros visíveis"',
    marca: 'filtros-visiveis',
    camada: '.app-mais-menu.app-colunas-menu',
    /* A caixa de marcação é o alvo da conferência de seleção: reversível e
       sem efeito de verdade nesta fixture. */
    opcao: 'input[type="checkbox"]:not([disabled])'
  },
  {
    nome: 'menu de ações "⋯"',
    marca: 'menu-mais',
    camada: '.app-mais-menu',
    opcao: null
  },
  {
    nome: 'menu de marcação de filtro',
    marca: 'filtro-rapido',
    camada: '.la-rapido-pop',
    opcao: 'input[type="checkbox"]:not([disabled])'
  },
  {
    /*
      O QUARTO É O QUE MAIS ENSINA. Ele impõe a largura da ÂNCORA (a lista
      tem a largura do campo, e é isso que diz de quem são aquelas opções) e
      vai em PORTAL para o `body` — então ela NÃO é filha da âncora e a
      medição precisa procurá-la no documento. Também é o que herdou o
      SEGUNDO cálculo de posição do sistema, o `medir()` escrito à mão que
      media e não prendia nada; se a unificação tivesse laço, é aqui que
      apareceria primeiro.

      O seletor é pelas classes do próprio painel, que é o que existe: o
      componente não tem `role` nem marca de teste, e acrescentar uma só
      para o instrumento seria mudar o componente para agradar a medição.
    */
    nome: 'lista do autocomplete de apropriação',
    marca: 'apropriacao',
    camada: 'div.max-h-60.overflow-y-auto',
    global: true,
    abridor: 'input[role="combobox"]',
    opcao: null
  }
];

const LADOS = [
  { id: 'esq', nome: 'botão na borda ESQUERDA' },
  { id: 'dir', nome: 'botão na borda DIREITA' }
];

let falhas = 0;
const registrar = (ok, texto) => {
  if (!ok) falhas += 1;
  console.log(`${ok ? '  ok   ' : '  FALHA'} ${texto}`);
};

/*
  A MEDIDA, crua: os quatro cantos da caixa dentro da janela. A folga de 1px
  é do arredondamento de subpixel do navegador, não licença de vazamento.
*/
const medirCamada = ([marca, lado, seletorCamada, global]) => {
  const ancora = document.querySelector(`.prova-ancora--${lado} [data-camada="${marca}"]`);
  if (!ancora) return { erro: `âncora ${marca}/${lado} não existe na fixture` };
  /* Camada em PORTAL não é filha da âncora: ela mora no `body`. */
  const el = global ? document.querySelector(seletorCamada) : ancora.querySelector(seletorCamada);
  if (!el) return { erro: 'a camada não entrou no DOM depois do clique' };
  const c = el.getBoundingClientRect();
  const estilo = getComputedStyle(el);
  const T = 1;
  const vaza = [];
  if (c.left < -T) vaza.push(`${Math.round(-c.left)}px além da ESQUERDA`);
  if (c.top < -T) vaza.push(`${Math.round(-c.top)}px além do TOPO`);
  if (c.right > window.innerWidth + T) vaza.push(`${Math.round(c.right - window.innerWidth)}px além da DIREITA`);
  if (c.bottom > window.innerHeight + T) vaza.push(`${Math.round(c.bottom - window.innerHeight)}px além da BASE`);
  return {
    visivel: c.width > 0 && c.height > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none',
    caixa: `${Math.round(c.width)}×${Math.round(c.height)}px em x ${Math.round(c.left)}..${Math.round(c.right)},`
      + ` y ${Math.round(c.top)}..${Math.round(c.bottom)}`,
    janela: `${window.innerWidth}×${window.innerHeight}`,
    /* Conteúdo que não coube na caixa TEM de ter rolagem própria — cortar
       sem rolagem é a mesma inalcançabilidade, só que por dentro. */
    corta: el.scrollHeight > el.clientHeight + 2 && estilo.overflowY !== 'auto' && estilo.overflowY !== 'scroll',
    vaza
  };
};

async function abrirEMedir(pagina, camada, lado) {
  const base = `.prova-ancora--${lado} [data-camada="${camada.marca}"]`;
  /* O autocomplete abre no FOCO do campo, não no clique de um botão: o
     abridor de cada família é declarado, nunca adivinhado. */
  if (camada.abridor) await pagina.locator(`${base} button`).first().click({ timeout: 8000 });
  const abridor = pagina.locator(`${base} ${camada.abridor || 'button'}`).first();
  await abridor.click({ timeout: 8000 });
  await pagina.waitForTimeout(260);
  const medida = await pagina.evaluate(medirCamada, [camada.marca, lado, camada.camada, Boolean(camada.global)]);
  return { medida, abridor };
}

async function main() {
  const servidor = await criarServidorDeCamadas();
  /* SEM PROXY: esta prova só fala com 127.0.0.1, e o Chromium herda
     `http_proxy` do ambiente se ninguém disser o contrário. */
  const navegador = await chromium.launch({
    executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
    args: ['--no-proxy-server']
  });

  try {
    for (const largura of LARGURAS) {
      console.log(`\n— ${largura.width}×${largura.height} —`);
      const contexto = await navegador.newContext({ viewport: { width: largura.width, height: largura.height } });
      const pagina = await contexto.newPage();
      await pagina.goto(servidor.rota(), { waitUntil: 'domcontentloaded' });
      await pagina.waitForSelector('.prova-pagina', { timeout: 10000 });

      for (const camada of CAMADAS) {
        for (const lado of LADOS) {
          const { medida, abridor } = await abrirEMedir(pagina, camada, lado.id);
          if (medida.erro) {
            registrar(false, `${camada.nome} · ${lado.nome} :: ${medida.erro}`);
            continue;
          }
          if (!medida.visivel) {
            registrar(false, `${camada.nome} · ${lado.nome} :: abriu com caixa vazia (${medida.caixa})`);
            continue;
          }
          const ok = medida.vaza.length === 0 && !medida.corta;
          registrar(ok, `${camada.nome} · ${lado.nome} :: ${medida.caixa}`
            + ` numa janela de ${medida.janela}`
            + (medida.vaza.length ? ` — VAZA ${medida.vaza.join(' e ')}` : '')
            + (medida.corta ? ' — CORTA o conteúdo por dentro SEM rolagem (o que sobrou é inalcançável)' : '')
            + (ok ? ' — cabe inteira' : ''));

          /* A SELEÇÃO CONTINUA VIVA. Reposicionar uma camada é mexer no
             elemento que carrega o `ref` do `useFecharAoSair`; se o clique na
             opção passar a morrer no `mousedown`, a camada "cabe" e não
             serve para nada. O levantamento avisou disso por escrito. */
          if (camada.opcao) {
            const opcao = pagina.locator(
              `.prova-ancora--${lado.id} [data-camada="${camada.marca}"] ${camada.camada} ${camada.opcao}`
            ).first();
            const antes = await opcao.isChecked().catch(() => null);
            await opcao.click({ timeout: 8000 }).catch(() => {});
            await pagina.waitForTimeout(180);
            const depois = await opcao.isChecked().catch(() => null);
            registrar(depois !== null && depois !== antes,
              `${camada.nome} · ${lado.nome} :: a seleção sobreviveu ao reposicionamento`
              + ` (marcação ${antes} → ${depois})`
              + (depois === null ? ' — a opção SAIU DO DOM no clique: a camada fechou no mousedown' : ''));
          }
          /* Fecha e tira o foco: a camada seguinte tem de abrir sozinha, e
             uma que ficou aberta seria medida no lugar da certa (mais ainda
             nas que vão para o `body`, onde o seletor é global). */
          await pagina.keyboard.press('Escape').catch(() => {});
          await pagina.locator('.prova-vazio').click({ timeout: 5000, position: { x: 5, y: 5 } }).catch(() => {});
          await pagina.waitForTimeout(140);
        }
      }
      await pagina.close();
      await contexto.close();
    }

    /* ------------------------------------------------------- a mordida -- */
    console.log('\n— mordida: o arranjo ANTERIOR do painel tem de REPROVAR —');
    let mordeu = 0;
    for (const largura of LARGURAS) {
      const contexto = await navegador.newContext({ viewport: { width: largura.width, height: largura.height } });
      const pagina = await contexto.newPage();
      await pagina.goto(servidor.rota('semPosicao'), { waitUntil: 'domcontentloaded' });
      await pagina.waitForSelector('.prova-pagina', { timeout: 10000 });
      const camada = CAMADAS[0];
      const { medida } = await abrirEMedir(pagina, camada, 'esq');
      const reprovou = !medida.erro && (medida.vaza.length > 0 || medida.corta);
      if (reprovou) mordeu += 1;
      registrar(reprovou, `@${largura.rotulo} o painel com \`absolute; right: 0\` (o de antes de 06/09) :: `
        + (medida.erro || `${medida.caixa} em ${medida.janela}`)
        + (medida.vaza?.length ? ` — VAZA ${medida.vaza.join(' e ')}` : '')
        + (medida.corta ? ' — CORTA sem rolagem' : '')
        + (reprovou ? '' : ' — NÃO reprovou, e devia: a medição não está medindo'));
      await pagina.close();
      await contexto.close();
    }
    registrar(mordeu > 0, `a medição morde o defeito conhecido em ${mordeu} de ${LARGURAS.length} largura(s)`);
  } finally {
    await navegador.close();
    servidor.fechar();
  }

  console.log(`\n[provas] camadas flutuantes cabem na janela: ${falhas === 0 ? 'ok' : `${falhas} medida(s) reprovada(s)`}`);
  /* `exitCode`, nunca `exit()`: a saída vai para pipe como a do harness, e
     `exit()` trunca com bytes na fila. */
  if (falhas) process.exitCode = 1;
}

await main();
