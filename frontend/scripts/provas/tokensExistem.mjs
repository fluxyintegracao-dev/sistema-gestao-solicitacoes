#!/usr/bin/env node
/**
 * PROVA — TOKEN E CLASSE QUE A TELA USA TÊM DE EXISTIR.
 *
 * Achado de 04/09, na fatia 1 do Financeiro, e é a lição do rótulo
 * aparecendo de novo: **a R25 verifica a FORMA, não a EXISTÊNCIA.**
 * `var(--c-surface-muted)` passa por ela — tem cara de token — e esse
 * token NÃO É DECLARADO EM LUGAR NENHUM: nem em CSS, nem pelo
 * ThemeContext. O CSS não resolve, a declaração é descartada, e são 33
 * estados de hover que simplesmente não acontecem, em 10 arquivos.
 *
 * O mesmo vale para classe: `.form-field` é usada em 8 telas e não tem
 * UMA regra CSS em todo o `src/`. Os campos dentro dela são `<input>` cru
 * do navegador — sem altura do sistema, sem token, sem foco.
 *
 * Classe fantasma e token fantasma são piores que valor errado: parecem
 * intenção. Quem lê o código acredita que há estilo ali.
 *
 * Esta prova cruza o que o JSX USA com o que o sistema DECLARA.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(RAIZ, 'src');

const arquivos = (dir, filtro) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return arquivos(p, filtro);
  return filtro.test(e.name) ? [p] : [];
});

/* --- O que o sistema DECLARA --- */
const css = arquivos(SRC, /\.css$/).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const js = arquivos(SRC, /\.jsx?$/).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const tokensDeclarados = new Set();
for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) tokensDeclarados.add(m[1]);
// O ThemeContext escreve tokens em runtime: contam como declarados.
for (const m of js.matchAll(/setCssVar\(\s*[^,]+,\s*'(--[a-zA-Z0-9_-]+)'/g)) tokensDeclarados.add(m[1]);
for (const m of js.matchAll(/setProperty\(\s*'(--[a-zA-Z0-9_-]+)'/g)) tokensDeclarados.add(m[1]);

const classesDeclaradas = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) classesDeclaradas.add(m[1]);

/* --- O que as TELAS usam --- */
const telas = arquivos(SRC, /\.jsx$/);
const faltando = [];

for (const arquivo of telas) {
  const codigo = fs.readFileSync(arquivo, 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (t) => t.replace(/[^\n]/g, ' '));
  const rel = path.relative(RAIZ, arquivo).replace(/\\/g, '/');

  for (const m of codigo.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
    // Token montado em runtime (`var(--module-${chave})`) não dá para
    // resolver estaticamente: o prefixo aparece truncado. Fora da conta.
    const dinamico = codigo.slice(m.index, m.index + m[0].length + 2).includes('${');
    if (!dinamico && !tokensDeclarados.has(m[1])) {
      const linha = codigo.slice(0, m.index).split('\n').length;
      faltando.push({ rel, linha, tipo: 'token', nome: m[1] });
    }
  }
}

/* Classes: só as do vocabulário do sistema (prefixos conhecidos), para não
   varrer utilitária do Tailwind, que não vive no CSS do projeto. */
/*
  A LISTA DE PREFIXOS É O LIMITE REAL DA COBERTURA (04/09).

  É a lição do rótulo, aplicada a prefixo: o check cobre o vocabulário que
  conhece. `.link` e `.link-primary` — fantasmas de verdade, uma delas numa
  tela JÁ NO MANIFESTO com matriz fechada — escapavam porque `link-` não
  estava aqui. Alarguei, mas o limite continua existindo: prefixo novo que
  ninguém acrescentar continua invisível.
*/
const PREFIXOS = /^(app-|sol-|fx-|form-|btn-|badge-|input-|modal-|page-|layout-|la-|cr-|premium-|hub-|login-|link|alert-|card-|dash-|tarja-|stat-|nav-|tabela-|celula-|bloco-)/;
for (const arquivo of telas) {
  const codigo = fs.readFileSync(arquivo, 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (t) => t.replace(/[^\n]/g, ' '));
  const rel = path.relative(RAIZ, arquivo).replace(/\\/g, '/');
  /*
    Classe montada em VARIÁVEL escapava por construção — foi assim que
    `badge badge-soft` sobreviveu numa tela inteira: ela morava numa
    string devolvida por função, não num `className=`. Agora qualquer
    literal de string com cara de lista de classes do sistema é varrido.
  */
  const literais = [
    ...codigo.matchAll(/className=(?:"([^"]*)"|'([^']*)')/g),
    ...codigo.matchAll(/(?:return|=)\s*(?:"([^"\n]{0,120})"|'([^'\n]{0,120})')\s*[;,)]/g)
  ];
  for (const m of literais) {
    for (const classe of (m[1] || m[2] || '').split(/\s+/).filter(Boolean)) {
      if (!PREFIXOS.test(classe) || classesDeclaradas.has(classe)) continue;
      const linha = codigo.slice(0, m.index).split('\n').length;
      faltando.push({ rel, linha, tipo: 'classe', nome: `.${classe}` });
    }
  }
}

const porNome = new Map();
for (const f of faltando) {
  if (!porNome.has(f.nome)) porNome.set(f.nome, { tipo: f.tipo, ocorrencias: [] });
  porNome.get(f.nome).ocorrencias.push(`${f.rel}:${f.linha}`);
}

if (!porNome.size) {
  console.log('  ok    todo token e classe do sistema usados nas telas existem');
} else {
  for (const [nome, { tipo, ocorrencias }] of [...porNome].sort((a, b) => b[1].ocorrencias.length - a[1].ocorrencias.length)) {
    console.log(`  FALHA ${tipo} FANTASMA ${nome} — usado em ${ocorrencias.length} ponto(s) e NUNCA declarado. Ex.: ${ocorrencias.slice(0, 2).join(', ')}`);
  }
}
console.log(`\n[provas] tokens e classes existem: ${porNome.size === 0 ? 'ok' : `${porNome.size} fantasma(s)`}`);
/*
  TRINCO, e o motivo de não ser bloqueante direto: são 39 fantasmas
  herdados, espalhados por telas que nenhuma leva tocou ainda. Reprovar
  tudo hoje travaria quem está empurrando em paralelo — o mesmo argumento
  do trinco da R19 e do de navegação.

  O número SÓ DESCE: fantasma novo, ou contagem que sobe, reprova. Cada
  leva zera os seus.

  E a lição de por que este arquivo existe ligado ao `provas`: eu o escrevi
  em 04/09 e NÃO O LIGUEI A NENHUM `npm run`. Ele ficou dias sendo rodado à
  mão por quem lembrava. É a R20 na minha própria mão — check que ninguém
  executa não é check, é arquivo.
*/
const TRINCO = path.join(RAIZ, 'scripts', 'trinco-fantasmas.json');
const congelado = fs.existsSync(TRINCO)
  ? JSON.parse(fs.readFileSync(TRINCO, 'utf8')).nomes || {}
  : {};

if (process.argv.includes('--gravar-trinco')) {
  const nomes = Object.fromEntries(
    [...porNome].map(([nome, { ocorrencias }]) => [nome, ocorrencias.length]).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.writeFileSync(TRINCO, `${JSON.stringify({
    regra: 'TOKEN E CLASSE FANTASMA',
    criado_em: '2026-09-04',
    porque: 'Token e classe que a tela usa e que NUNCA foram declarados. O CSS nao resolve, a declaracao e descartada, e o estilo nunca chega a tela. Classe fantasma e pior que valor errado: parece intencao. O numero SO DESCE.',
    nomes
  }, null, 2)}\n`);
  console.log(`[fantasmas] trinco gravado: ${Object.keys(nomes).length} nome(s).`);
}

let regrediu = 0;
for (const [nome, { ocorrencias }] of porNome) {
  const antes = congelado[nome];
  if (antes === undefined) {
    console.log(`  REPROVA ${nome} é fantasma NOVO — declare a classe/token, ou use o nome que existe.`);
    regrediu += 1;
  } else if (ocorrencias.length > antes) {
    console.log(`  REPROVA ${nome} subiu de ${antes} para ${ocorrencias.length} ocorrência(s). O trinco só desce.`);
    regrediu += 1;
  }
}
for (const nome of Object.keys(congelado)) {
  if (!porNome.has(nome)) console.log(`  AVISO ${nome} zerou — remova a linha de scripts/trinco-fantasmas.json.`);
}
if (regrediu) process.exitCode = 1;
