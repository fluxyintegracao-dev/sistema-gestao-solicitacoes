#!/usr/bin/env node
/**
 * PROVA — contraste dos pares semânticos, nos DOIS temas.
 *
 * Por que existe: o cabeçalho do `design-tokens.css` AFIRMAVA que todos os
 * pares tinham sido validados em AA nos dois temas. Medido em 03/09, três
 * não estavam — `danger` 4,42:1, `success` 4,46:1 e `info` 4,49:1 sobre os
 * respectivos fundos no tema escuro, o último reprovando por 0,01.
 *
 * A afirmação estava no comentário; a verificação não estava em lugar
 * nenhum. É o quarto caso da família "existia e ninguém sabia": passo que
 * vive no hábito de alguém não existe. Esta prova põe a afirmação sob
 * check — se um token voltar a raspar o limite, o test:responsive reprova.
 *
 * O par medido é TEXTO sobre o FUNDO DA PRÓPRIA FAMÍLIA (`--sem-x` sobre
 * `--sem-x-bg`), que é onde o texto de fato aparece — não sobre a
 * superfície da página, que era o que o comentário antigo dizia.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARQUIVO = path.join(RAIZ, 'src', 'styles', 'design-tokens.css');
const MINIMO = 4.5;
const FAMILIAS = ['danger', 'warning', 'success', 'info', 'neutral'];

const luminancia = (hex) => {
  const canais = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
};
const contraste = (a, b) => {
  const x = luminancia(a);
  const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const css = fs.readFileSync(ARQUIVO, 'utf8');
// O bloco `.dark` começa na primeira ocorrência de `.dark {`; o que vem
// antes é o tema claro.
const corte = css.indexOf('.dark');
const blocos = {
  claro: css.slice(0, corte === -1 ? css.length : corte),
  escuro: corte === -1 ? '' : css.slice(corte)
};

const valor = (bloco, nome) => {
  const m = bloco.match(new RegExp(`--${nome}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  return m ? m[1] : null;
};

let falhas = 0;
for (const [tema, bloco] of Object.entries(blocos)) {
  if (!bloco.trim()) continue;
  for (const familia of FAMILIAS) {
    const texto = valor(bloco, `sem-${familia}`);
    const fundo = valor(bloco, `sem-${familia}-bg`);
    if (!texto || !fundo) {
      console.error(`  ERRO  ${tema}/${familia}: par não encontrado no arquivo (texto=${texto}, fundo=${fundo})`);
      falhas += 1;
      continue;
    }
    const razao = contraste(texto, fundo);
    const ok = razao >= MINIMO;
    if (!ok) falhas += 1;
    console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${tema.padEnd(6)} ${familia.padEnd(8)} ${texto} sobre ${fundo} = ${razao.toFixed(2)}:1${ok ? '' : `  — mínimo AA é ${MINIMO}:1`}`);
  }
}

console.log(`\n[provas] contraste dos tokens: ${falhas === 0 ? 'ok' : `${falhas} par(es) abaixo de AA`}`);
if (falhas) process.exitCode = 1;
