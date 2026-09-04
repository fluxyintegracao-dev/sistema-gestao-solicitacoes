#!/usr/bin/env node
/**
 * VARREDURA DE ALCANCE — quem consegue chegar em cada tela com rota.
 *
 * DETECTOR QUE CONHECE UMA FORMA MEDE UMA FORMA, NAO O SISTEMA (04/09).
 *
 * Esta varredura nasceu errada tres vezes seguidas no mesmo dia, sempre pelo
 * mesmo motivo: procurava UMA sintaxe de link e o sistema usa TRES.
 *
 *   38 sem porta  -> procurava so `to="/rota"` (JSX)
 *   15 sem porta  -> achou `to: '/rota'` (objeto), que a ModuloRelatorios usa
 *   13 sem porta  -> achou `navigate('/rota')` (codigo), que os fluxos usam
 *   14 sem porta  -> achou `navigate(cond ? '/rota' : ...)` (condicional)
 *    2 sem porta  -> achou `route: '/rota'` em catalogo de painel
 *
 * A SEXTA FORMA E ALCANCE, NAO PORTA AUSENTE. Os dez relatorios do
 * Financeiro nao tem link escrito em lugar nenhum: a FinanceiroRelatorios
 * guarda um catalogo de objetos com `route:`, monta a lista lateral a
 * partir dele e monta o link de tela inteira com uma FUNCAO
 * (`getReportFullScreenRoute`). Quem clica na lista chegou no relatorio,
 * mesmo sem existir um `to="/financeiro/relatorios/dre"` escrito. Selecao
 * por estado dentro de um painel conta como caminho.
 *
 * Em cada rodada eu ia abrir portas que ja existiam. Na primeira, teria
 * DUPLICADO 23 entradas na fonte unica de navegacao — o arquivo onde
 * duplicata custa mais caro.
 *
 * REGRA PERMANENTE, para qualquer varredura futura — e ela e maior que
 * "detector cego". Num sistema com anos de codigo, A MESMA COISA E FEITA
 * DE VARIAS FORMAS, porque foi escrita por gente diferente em epocas
 * diferentes. Qualquer varredura que assume uma forma mede uma fracao e
 * devolve um numero com cara de completo.
 *
 * Entao, antes de qualquer numero novo, a pergunta e "DE QUANTOS JEITOS
 * ISSO E FEITO AQUI?" — nao "quantos casos existem?". A segunda pergunta
 * so vale depois que a primeira tem resposta.
 *
 * O detector declara aqui embaixo o que conhece; forma nova que apareca no
 * codigo e cegueira nova, e a lista precisa crescer junto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(raiz, 'src');

/** AS FORMAS QUE UM LINK ASSUME NESTE SISTEMA. Crescer aqui quando surgir outra. */
/*
  Terminador unico: a rota pode terminar a string OU ser seguida de query
  (`?tipo=pagar`) ou ancora. Foi a SETIMA cegueira: a forma de objeto exigia
  fim exato, entao "Contas a Pagar" (to: '/financeiro/titulos?tipo=pagar')
  nao contava como porta da /financeiro/titulos — e eu quase abri no hub uma
  porta que ja era o primeiro item do menu do modulo.

  `/` NAO entra no terminador de proposito. Aceitar `/` faria um link para
  /financeiro/relatorios provar porta para /financeiro: falso positivo, que
  neste projeto e o defeito mais caro — check que aparece verde sem medir.
*/
const FIM = '(["\'`?#])';
const FORMAS = [
  { nome: 'JSX  to="/rota"',        re: (r) => new RegExp(`to=["'\`]${r}${FIM}`) },
  { nome: 'JSX  href="/rota"',      re: (r) => new RegExp(`href=["'\`]${r}${FIM}`) },
  { nome: 'objeto  to: "/rota"',    re: (r) => new RegExp(`to:\\s*["'\`]${r}${FIM}`) },
  { nome: 'codigo  navigate("/rota")', re: (r) => new RegExp(`navigate\\(\\s*["'\`]${r}${FIM}`) },
  { nome: 'codigo  navigate(cond ? "/rota" ...)', re: (r) => new RegExp(`navigate\\([^)]*["'\`]${r}${FIM}`) },
  { nome: 'catalogo  route: "/rota" (selecao por estado no painel)', re: (r) => new RegExp(`route:\\s*["'\`]${r}${FIM}`) }
];

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return arquivos(p);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [p] : [];
  });
}

const app = fs.readFileSync(path.join(src, 'App.jsx'), 'utf8');
const imports = new Map();
for (const m of app.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'/g)) imports.set(m[1], m[2]);
for (const m of app.matchAll(/^import\s+(\w+)\s+from\s+'(\.[^']+)'/gm)) imports.set(m[1], m[2]);

const rotas = [];
for (const m of app.matchAll(/path="([^"]+)"[^\n]*/g)) {
  if (/<Navigate/.test(m[0])) continue;
  for (const c of m[0].matchAll(/<(\w+)/g)) {
    if (!imports.has(c[1])) continue;
    let f = imports.get(c[1]).replace('./', 'src/');
    if (!f.endsWith('.jsx')) f += '.jsx';
    rotas.push({ rota: '/' + m[1].replace(/^\//, ''), arquivo: f });
    break;
  }
}

const fontes = arquivos(src).map((f) => [path.relative(raiz, f).replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')]);
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
  ALCANCE E TRANSITIVO, E "NAVEGACAO" TAMBEM E FEITA DE VARIAS FORMAS (04/09).

  Primeiro erro: eu media "existe link em algum lugar?". Uma rota alcancada
  por `navigate()` no meio de um fluxo tem link e nao tem porta — chega quem
  ja estava no lugar certo, e mais ninguem.

  Segundo erro, cometido na tentativa de consertar o primeiro: classifiquei
  como "porta" so o que estava no navigationConfig. Mas neste sistema HUB E
  PAGINA — Configuracoes.jsx, ModuloRelatorios.jsx e FinanceiroRelatorios.jsx
  sao hubs de verdade, com lista de destinos. Pela minha regra, as ~20 telas
  de configuracao apareceriam como "sem porta" quando a porta e o hub de
  Configuracoes, que esta no menu. A mesma cegueira do detector, agora no
  classificador: assumi UMA forma de fazer navegacao.

  O modelo certo e um GRAFO, e a pergunta e distancia:

    raiz     rotas declaradas no navigationConfig (que e tambem o indice do
             Ctrl+K — a CommandPalette usa getVisibleItems dele)
    aresta   pagina da rota A (e os componentes que ela importa) contem link
             para a rota B, em qualquer das 6 formas conhecidas
    nivel    quantos cliques a partir do menu

  nivel 1  destino do menu
  nivel 2  esta num hub que esta no menu — porta legitima
  nivel 3+ enterrada: precisa saber que existe para achar
  sem      nenhum caminho a partir do menu — so pela URL digitada
*/
const ARQ_NAV = 'src/navigation/navigationConfig.jsx';

// Grafo de imports locais: o link para outra tela mora tanto na pagina
// quanto num componente que ela importa (o /financeiro/titulos, por
// exemplo, so aparece dentro do FinanceiroCard).
const conteudo = new Map(fontes);
const importesDe = new Map();
for (const [f, texto] of fontes) {
  const alvos = [];
  for (const m of texto.matchAll(/from\s+'(\.[^']+)'|import\(\s*'(\.[^']+)'/g)) {
    const rel = m[1] || m[2];
    let destino = path.relative(raiz, path.resolve(path.dirname(path.join(raiz, f)), rel)).replace(/\\/g, '/');
    for (const cand of [destino, `${destino}.jsx`, `${destino}.js`, `${destino}/index.jsx`, `${destino}/index.js`]) {
      if (conteudo.has(cand)) { alvos.push(cand); break; }
    }
  }
  importesDe.set(f, alvos);
}

function fechoDeImports(arquivo) {
  const visto = new Set();
  const fila = [arquivo];
  while (fila.length) {
    const f = fila.shift();
    if (!f || visto.has(f) || !conteudo.has(f)) continue;
    visto.add(f);
    for (const a of importesDe.get(f) || []) fila.push(a);
  }
  return [...visto];
}

// Onde cada rota aparece, em qualquer das formas conhecidas.
const ocorrencias = new Map();  // rota -> Set(arquivo)
const estaticas = rotas.filter((r) => !/\/:/.test(r.rota));
for (const { rota } of estaticas) {
  const alvo = escapar(rota.replace(/\/$/, ''));
  const onde = new Set();
  for (const { re } of FORMAS) {
    const padrao = re(alvo);
    for (const [f, texto] of fontes) if (padrao.test(texto)) onde.add(f);
  }
  ocorrencias.set(rota, onde);
}

// Arestas: rota A -> rota B se algum arquivo do fecho de A cita B.
const arquivoDaRota = new Map(estaticas.map((r) => [r.rota, r.arquivo]));
const fechoCache = new Map();
function fechoDaRota(rota) {
  if (!fechoCache.has(rota)) fechoCache.set(rota, new Set(fechoDeImports(arquivoDaRota.get(rota))));
  return fechoCache.get(rota);
}

// BFS a partir do menu.
const nivel = new Map();
const veioDe = new Map();
const raizes = estaticas.filter((r) => (ocorrencias.get(r.rota) || new Set()).has(ARQ_NAV));
for (const r of raizes) { nivel.set(r.rota, 1); veioDe.set(r.rota, 'menu'); }
let fila = raizes.map((r) => r.rota);
while (fila.length) {
  const proxima = [];
  for (const origem of fila) {
    const fecho = fechoDaRota(origem);
    for (const { rota: destino } of estaticas) {
      if (nivel.has(destino) || destino === origem) continue;
      const onde = ocorrencias.get(destino) || new Set();
      let achou = null;
      for (const f of onde) {
        if (f === ARQ_NAV || f === 'src/App.jsx') continue;
        if (fecho.has(f)) { achou = f; break; }
      }
      if (achou) {
        nivel.set(destino, nivel.get(origem) + 1);
        veioDe.set(destino, `${origem} (${path.basename(achou)})`);
        proxima.push(destino);
      }
    }
  }
  fila = proxima;
}

/*
  DETALHE DE REGISTRO TAMBEM E CAMINHO.

  Eu tinha tirado as rotas `/:id` do grafo porque elas nao precisam de porta
  no hub — chegam pela listagem. Mas tirar do grafo tirou tambem as portas
  que elas ABREM: o /financeiro/titulos so tem link dentro do FinanceiroCard,
  que so existe na /solicitacoes/:id; o /relatorios/administrativos so tem
  link na /pedidos-compra/:id. As duas apareciam como "so pela URL" por
  causa de um recorte meu, nao por causa do sistema.

  Nao precisar de porta e nao ser porta sao coisas diferentes.
*/
const dinamicas = rotas.filter((r) => /\/:/.test(r.rota));
for (const d of dinamicas) {
  const prefixo = d.rota.replace(/\/:[^/]+.*$/, '');
  const pai = nivel.get(prefixo);
  if (!pai) continue;
  nivel.set(d.rota, pai + 1);
  veioDe.set(d.rota, `${prefixo} (listagem)`);
  arquivoDaRota.set(d.rota, d.arquivo);
}
for (const d of dinamicas) {
  if (!nivel.has(d.rota)) continue;
  const fecho = fechoDaRota(d.rota);
  for (const { rota: destino } of estaticas) {
    if (nivel.has(destino)) continue;
    const onde = ocorrencias.get(destino) || new Set();
    for (const f of onde) {
      if (f === ARQ_NAV || f === 'src/App.jsx' || !fecho.has(f)) continue;
      nivel.set(destino, nivel.get(d.rota) + 1);
      veioDe.set(destino, `${d.rota} (${path.basename(f)})`);
      break;
    }
  }
}

const semCaminho = estaticas.filter((r) => !nivel.has(r.rota));
const porNivel = (n) => estaticas.filter((r) => nivel.get(r.rota) === n);
const enterradas = estaticas.filter((r) => (nivel.get(r.rota) || 0) >= 3);

console.log(`[alcance] ${rotas.length} rota(s) de tela · ${rotas.length - estaticas.length} detalhe(s) de registro (chegam pela listagem)`);
console.log(`[alcance] formas de link que o detector conhece: ${FORMAS.length}`);
console.log(`[alcance] ${estaticas.length} rota(s) estatica(s) medidas a partir do menu:`);
console.log(`          nivel 1 (destino do menu) ......... ${porNivel(1).length}`);
console.log(`          nivel 2 (dentro de um hub) ........ ${porNivel(2).length}`);
console.log(`          nivel 3+ (enterradas) ............. ${enterradas.length}`);
console.log(`          sem caminho (so pela URL) ......... ${semCaminho.length}`);

if (semCaminho.length) {
  console.log(`\n[alcance] SO PELA URL — nenhum caminho a partir do menu:\n`);
  for (const s of semCaminho) console.log(`  ${s.rota.padEnd(48)} ${path.basename(s.arquivo, '.jsx')}`);
}
if (enterradas.length) {
  console.log(`\n[alcance] NIVEL 3+ — so acha quem ja sabe que existe:\n`);
  for (const s of enterradas.sort((a, b) => nivel.get(b.rota) - nivel.get(a.rota))) {
    console.log(`  n${nivel.get(s.rota)}  ${s.rota.padEnd(46)} <- ${veioDe.get(s.rota)}`);
  }
}
