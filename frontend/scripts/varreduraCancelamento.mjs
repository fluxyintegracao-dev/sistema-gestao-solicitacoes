#!/usr/bin/env node
/**
 * VARREDURA — "onde o cancelamento não cancela".
 *
 * Pedido do cliente em 03/09, depois de o idioma `if (!confirm(...)) return;`
 * aparecer pela TERCEIRA vez. Ela NÃO migra nada: só lista, em TODO o
 * frontend (não apenas nas telas do manifesto), os pontos em que clicar
 * "Cancelar" NÃO cancela a ação.
 *
 * Duas famílias, e é importante não confundi-las:
 *
 *  A) `confirmar()` do `useConfirmacao` LIDO COMO BOOLEANO. Ele devolve
 *     `{ ok, texto }`, e objeto é SEMPRE truthy — então `if (!await
 *     confirmar(...)) return;` nunca retorna e a ação SEGUE no "Cancelar".
 *     É a R21, e já causou estorno indevido de título financeiro.
 *
 *  B) `confirm()` nativo com o retorno IGNORADO: `await confirm(...)` sem
 *     usar o valor, ou a chamada solta como expressão. A caixa aparece, o
 *     usuário clica em "Cancelar", e a ação acontece do mesmo jeito.
 *
 * O que NÃO é defeito e por isso não entra na lista: `if (!confirm(...))
 * return;` com o `confirm` NATIVO. Ali o retorno é booleano de verdade e o
 * idioma está correto — feio, porque é caixa do navegador (R19), mas o
 * cancelamento cancela. Misturar os dois casos numa lista só faria o
 * defeito real se perder no meio de setecentas linhas corretas.
 *
 * Uso: node scripts/varreduraCancelamento.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(RAIZ, 'src');
const comoJson = process.argv.includes('--json');

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return arquivos(p);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [p] : [];
  });
}

/** O identificador chamado é o `confirmar` do useConfirmacao? */
function ehConfirmarDoSistema(no) {
  return no.callee?.type === 'Identifier' && no.callee.name === 'confirmar';
}

/** É o `confirm()` nativo (inclui `window.confirm`)? */
function ehConfirmNativo(no) {
  if (no.callee?.type === 'Identifier' && no.callee.name === 'confirm') return true;
  return no.callee?.type === 'MemberExpression'
    && no.callee.object?.name === 'window'
    && no.callee.property?.name === 'confirm';
}

const achados = [];

for (const arquivo of arquivos(SRC)) {
  const codigo = fs.readFileSync(arquivo, 'utf8');
  if (!/confirm/.test(codigo)) continue;
  let ast;
  try {
    ast = parse(codigo, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator']
    });
  } catch (erro) {
    achados.push({
      arquivo: path.relative(RAIZ, arquivo), linha: 0, familia: 'ERRO',
      trecho: `não foi possível analisar: ${erro.message}`
    });
    continue;
  }

  traverse(ast, {
    CallExpression(caminho) {
      const no = caminho.node;
      const doSistema = ehConfirmarDoSistema(no);
      const nativo = ehConfirmNativo(no);
      if (!doSistema && !nativo) return;

      // Onde o valor desta chamada é consumido: sobe pelo `await` e por
      // parênteses, que não mudam o valor.
      let pai = caminho.parentPath;
      while (pai && (pai.node.type === 'AwaitExpression' || pai.node.type === 'ParenthesizedExpression')) {
        pai = pai.parentPath;
      }
      const tipoPai = pai?.node.type;
      const linha = no.loc?.start.line || 0;
      const trecho = codigo.split('\n')[linha - 1]?.trim().slice(0, 130) || '';
      const rel = path.relative(RAIZ, arquivo);

      if (doSistema) {
        const reprovar = (motivo) => achados.push({
          arquivo: rel, linha, familia: 'A',
          problema: `${motivo} — o objeto { ok, texto } é sempre truthy, então "Cancelar" SEGUE COM A AÇÃO`,
          trecho
        });

        if (tipoPai === 'MemberExpression') return; // (await confirmar()).ok

        /*
          O CASO QUE ESCAPOU NA PRIMEIRA VERSÃO, e é justamente o que causou
          o estorno indevido em 03/09:

              const ok = await confirmar({ ... });
              if (!ok) return;

          Olhar só o PAI imediato via `const ok = ...` — um
          `VariableDeclarator` com identificador simples — e seguia em
          frente. O defeito não está na atribuição: está no USO da variável
          duas linhas abaixo. Um scanner que só olha o pai imediato pega as
          formas espalhafatosas (`if (!await confirmar(...))`) e deixa
          passar a discreta, que é a que aparece no código de verdade.

          Então: atribuição a identificador simples faz o scanner SEGUIR A
          LIGAÇÃO e olhar cada referência dessa variável.
        */
        if (tipoPai === 'VariableDeclarator') {
          const id = pai.node.id;
          if (id?.type === 'ObjectPattern') return; // desestruturado = correto
          if (id?.type !== 'Identifier') return;
          const ligacao = pai.scope.getBinding(id.name);
          if (!ligacao) {
            reprovar(`retorno de confirmar() guardado em "${id.name}" e o scanner não conseguiu seguir o uso`);
            return;
          }
          const usoBooleano = ligacao.referencePaths.find((ref) => {
            const p2 = ref.parentPath;
            if (!p2) return false;
            if (p2.node.type === 'MemberExpression') return false; // ok.ok / ok.texto
            return (p2.node.type === 'UnaryExpression' && p2.node.operator === '!')
              || (p2.node.type === 'IfStatement' && p2.node.test === ref.node)
              || p2.node.type === 'LogicalExpression'
              || (p2.node.type === 'ConditionalExpression' && p2.node.test === ref.node);
          });
          if (usoBooleano) {
            const linhaUso = usoBooleano.node.loc?.start.line || linha;
            achados.push({
              arquivo: rel,
              linha: linhaUso,
              familia: 'A',
              problema: `"${id.name}" recebe o retorno de confirmar() (linha ${linha}) e é lido como BOOLEANO aqui — o objeto { ok, texto } é sempre truthy, então "Cancelar" SEGUE COM A AÇÃO`,
              trecho: codigo.split('\n')[linhaUso - 1]?.trim().slice(0, 130) || trecho
            });
          }
          return;
        }

        if (
          (tipoPai === 'UnaryExpression' && pai.node.operator === '!')
          || tipoPai === 'IfStatement'
          || tipoPai === 'LogicalExpression'
          || tipoPai === 'ConditionalExpression'
        ) {
          reprovar('retorno de confirmar() lido como BOOLEANO');
        }
        return;
      }

      // Nativo: só é defeito quando o retorno NÃO é consumido.
      const consumido = tipoPai && ![
        'ExpressionStatement', 'SequenceExpression', 'BlockStatement'
      ].includes(tipoPai);
      if (!consumido) {
        achados.push({
          arquivo: rel, linha, familia: 'B',
          problema: 'confirm() nativo com o retorno IGNORADO — a caixa aparece, o usuário clica em "Cancelar" e a ação acontece assim mesmo',
          trecho
        });
      }
    }
  });
}

achados.sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha);

if (comoJson) {
  console.log(JSON.stringify(achados, null, 2));
} else if (!achados.length) {
  console.log('[cancelamento] nenhum ponto em que o "Cancelar" deixa de cancelar.');
} else {
  const porFamilia = { A: [], B: [], ERRO: [] };
  achados.forEach((a) => porFamilia[a.familia].push(a));
  const rotulo = {
    A: 'A — confirmar() do sistema lido como booleano (R21)',
    B: 'B — confirm() nativo com retorno ignorado',
    ERRO: 'ERRO — arquivo não analisado'
  };
  for (const familia of ['A', 'B', 'ERRO']) {
    const lista = porFamilia[familia];
    if (!lista.length) continue;
    console.log(`\n## ${rotulo[familia]} — ${lista.length} ocorrência(s)\n`);
    lista.forEach((a) => {
      console.log(`- ${a.arquivo}:${a.linha}`);
      console.log(`    ${a.problema || a.trecho}`);
      if (a.problema) console.log(`    ${a.trecho}`);
    });
  }
  console.log(`\n[cancelamento] ${achados.length} ponto(s) em que o "Cancelar" NÃO cancela.`);
}
