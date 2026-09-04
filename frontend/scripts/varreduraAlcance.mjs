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
 *
 * Em cada rodada eu ia abrir portas que ja existiam. Na primeira, teria
 * DUPLICADO 23 entradas na fonte unica de navegacao — o arquivo onde
 * duplicata custa mais caro.
 *
 * REGRA, para qualquer varredura futura: antes de confiar no numero,
 * confirme que o detector conhece TODAS as formas que a coisa procurada
 * assume no sistema. O detector declara aqui embaixo o que conhece; forma
 * nova que apareca no codigo e cegueira nova, e a lista precisa crescer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(raiz, 'src');

/** AS FORMAS QUE UM LINK ASSUME NESTE SISTEMA. Crescer aqui quando surgir outra. */
const FORMAS = [
  { nome: 'JSX  to="/rota"',        re: (r) => new RegExp(`to=["'\`]${r}(["'\`?#/])`) },
  { nome: 'JSX  href="/rota"',      re: (r) => new RegExp(`href=["'\`]${r}(["'\`?#/])`) },
  { nome: 'objeto  to: "/rota"',    re: (r) => new RegExp(`to:\\s*["'\`]${r}["'\`]`) },
  { nome: 'codigo  navigate("/rota")', re: (r) => new RegExp(`navigate\\(\\s*["'\`]${r}["'\`?#/]`) },
  { nome: 'codigo  navigate(cond ? "/rota" ...)', re: (r) => new RegExp(`navigate\\([^)]*["'\`]${r}["'\`]`) }
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

const semPorta = [];
for (const { rota, arquivo } of rotas) {
  if (/\/:/.test(rota)) continue;             // detalhe de registro: chega pela listagem
  const alvo = escapar(rota.replace(/\/$/, ''));
  let achou = null;
  for (const { nome, re } of FORMAS) {
    const padrao = re(alvo);
    for (const [f, s] of fontes) {
      if (f.endsWith(arquivo) || f.endsWith('App.jsx')) continue;
      if (padrao.test(s)) { achou = `${nome} em ${path.basename(f)}`; break; }
    }
    if (achou) break;
  }
  if (!achou) semPorta.push({ rota, arquivo });
}

console.log(`[alcance] ${rotas.length} rota(s) de tela · ${rotas.filter((r) => /\/:/.test(r.rota)).length} detalhe(s) de registro (chegam pela listagem)`);
console.log(`[alcance] formas de link que o detector conhece: ${FORMAS.length}`);
if (semPorta.length === 0) {
  console.log('[alcance] ok — toda rota estatica tem pelo menos um caminho no sistema.');
} else {
  console.log(`\n[alcance] ${semPorta.length} rota(s) SEM NENHUM CAMINHO — so pela URL digitada:\n`);
  for (const s of semPorta) console.log(`  ${s.rota.padEnd(46)} ${path.basename(s.arquivo, '.jsx')}`);
}
