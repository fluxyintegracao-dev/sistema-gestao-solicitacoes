#!/usr/bin/env node
/**
 * PROVA — TODA REGRA TEM DE MORDER.
 *
 * Pedido do cliente em 03/09, depois de a M3 aparecer verde sem medir nada:
 * "regra antiga sem prova de que reprova é regra não verificada".
 *
 * Um check só está verificado quando se sabe que ele reprova o que deve
 * reprovar. Verde não é evidência: pode significar "o código está certo" ou
 * "o check não olha". As duas leituras são indistinguíveis de fora, e a
 * história desta reforma tem sete pontos cegos que ficaram verdes por anos.
 *
 * Esta prova planta uma violação MÍNIMA de cada regra estática numa tela
 * temporária do manifesto e exige que o validador a reprove. Se alguma
 * regra deixar de morder — porque foi reescrita, porque um seletor mudou,
 * porque um nome de variável saiu do escopo — esta prova reprova ANTES de
 * a regra ser usada como garantia.
 *
 * Escopo honesto: cobre as regras ESTÁTICAS (validarLayout.mjs). Os itens
 * da DoD medidos no navegador (C*, T*, F*, B*, M*, X*, A1) rodam contra o
 * preview publicado e precisam de uma tela-fixture própria para serem
 * provados do mesmo jeito. Está registrado como lacuna declarada, não como
 * cobertura.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFESTO = path.join(RAIZ, 'scripts', 'telas-reformadas.json');
/*
  NOME ÚNICO POR PROCESSO (04/09).

  Esta prova planta uma tela temporária e a acrescenta ao manifesto. O nome
  era fixo, e o manifesto é compartilhado — então DUAS corridas simultâneas
  de `test:responsive` (inevitável com agentes em paralelo) se atropelavam:
  uma apagava a fixture da outra, e o resultado era "listada no manifesto
  mas não existe", que reprova TODO MUNDO.

  Três agentes tropeçaram nisso em 04/09 e tiveram de rodar de novo; um
  deles chegou a ver "8 regras sem prova de reprovação" e precisou
  descobrir que não era defeito das regras. Prova que atrapalha quem está
  medindo é pior que prova nenhuma: gera vermelho falso, e vermelho falso
  ensina a ignorar vermelho.

  O sufixo é o PID: cada corrida tem o seu arquivo e a sua entrada, e a
  limpeza do `finally` remove só a própria.
*/
const SUFIXO = `${process.pid}`;
const ALVO = path.join(RAIZ, 'src', 'pages', `__ProvaDeRegra${SUFIXO}.jsx`);
const ALVO_REL = `src/pages/__ProvaDeRegra${SUFIXO}.jsx`;

const CABECA = `import { Pagina, PageHeader, TabelaPadrao } from '../components/padrao';\n\nexport default function ProvaDeRegra() {\n  return (\n    <Pagina>\n      <PageHeader titulo="Prova" contagem="1 item" />\n`;
const RABO = `    </Pagina>\n  );\n}\n`;

/* Cada caso: a regra, e o trecho que TEM de reprovar. */
const CASOS = [
  {
    regra: 'R1',
    porque: 'tabela crua fora do componente padrão',
    corpo: '      <table><tbody><tr><td>x</td></tr></tbody></table>\n'
  },
  {
    regra: 'R10',
    porque: 'medida fora dos degraus da escala',
    corpo: '      <div className="mt-5 text-[11px]" style={{ padding: 7 }} />\n'
  },
  {
    regra: 'R17',
    porque: 'TabelaPadrao sem coluna de identidade declarada',
    corpo: '      <TabelaPadrao colunas={[{ id: \'a\', titulo: \'A\', tipo: \'texto\', render: (x) => x.a }]} itens={[]} getId={(x) => x.id} />\n'
  },
  {
    regra: 'R19',
    porque: 'caixa do navegador',
    corpo: '      <button type="button" onClick={() => { window.alert(\'oi\'); }}>Ir</button>\n'
  },
  {
    regra: 'R25',
    porque: 'cor fora do sistema de tokens',
    corpo: '      <span className="text-slate-500" style={{ color: \'#ff0000\' }} />\n'
  }
];

/* R18, R21 e R22 precisam de forma própria — não cabem no molde acima. */
const CASOS_ARQUIVO_INTEIRO = [
  {
    regra: 'R18',
    porque: 'overflow hidden em ancestral de tabela',
    arquivo: `import { Pagina, TabelaPadrao } from '../components/padrao';\n\nexport default function ProvaDeRegra() {\n  return (\n    <Pagina>\n      <div style={{ overflow: 'hidden' }}>\n        <TabelaPadrao colunas={[{ id: 'a', titulo: 'A', tipo: 'identidade', render: (x) => x.a }]} itens={[]} getId={(x) => x.id} />\n      </div>\n    </Pagina>\n  );\n}\n`
  },
  {
    regra: 'R21',
    porque: 'retorno de confirmar() lido como booleano',
    arquivo: `import { Pagina, useConfirmacao } from '../components/padrao';\n\nexport default function ProvaDeRegra() {\n  const { confirmar } = useConfirmacao();\n  async function agir() {\n    if (!await confirmar({ titulo: 'x' })) return;\n  }\n  return <Pagina><button type="button" onClick={agir}>Ir</button></Pagina>;\n}\n`
  },
  {
    regra: 'R22',
    porque: 'hook usado sem import',
    arquivo: `import { Pagina } from '../components/padrao';\n\nexport default function ProvaDeRegra() {\n  const [n] = useState(0);\n  return <Pagina>{n}</Pagina>;\n}\n`
  }
];

const manifestoOriginal = fs.readFileSync(MANIFESTO, 'utf8');
let falhas = 0;

function rodarValidador() {
  try {
    execFileSync('node', [path.join(RAIZ, 'scripts', 'validarLayout.mjs')], { cwd: RAIZ, encoding: 'utf8' });
    return '';
  } catch (erro) {
    return `${erro.stdout || ''}${erro.stderr || ''}`;
  }
}

function provar(regra, porque, conteudo) {
  fs.writeFileSync(ALVO, conteudo);
  const saida = rodarValidador();
  const mordeu = saida.includes(`[${regra}]`) && saida.includes(ALVO_REL);
  if (mordeu) {
    console.log(`  ok    ${regra} reprova ${porque}`);
  } else {
    falhas += 1;
    console.log(`  FALHA ${regra} NÃO reprovou ${porque} — a regra existe e não morde`);
  }
}

try {
  const manifesto = JSON.parse(manifestoOriginal);
  if (!manifesto.telas.includes(ALVO_REL)) manifesto.telas.push(ALVO_REL);
  fs.writeFileSync(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`);

  for (const caso of CASOS) provar(caso.regra, caso.porque, CABECA + caso.corpo + RABO);
  for (const caso of CASOS_ARQUIVO_INTEIRO) provar(caso.regra, caso.porque, caso.arquivo);

  // E o sentido inverso: tela limpa NÃO pode reprovar.
  fs.writeFileSync(ALVO, CABECA + RABO);
  const saidaLimpa = rodarValidador();
  if (saidaLimpa.includes(ALVO_REL)) {
    falhas += 1;
    console.log('  FALHA tela LIMPA foi reprovada — o validador acusa o que está certo');
  } else {
    console.log('  ok    tela limpa passa (o validador não acusa o que está certo)');
  }
} finally {
  /*
    Restauração CIRÚRGICA, não byte a byte: escrever o manifesto original
    de volta apagaria as entradas que OUTRA corrida acrescentou enquanto
    esta rodava. Remove-se apenas a própria.
  */
  try {
    const atual = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
    atual.telas = atual.telas.filter((t) => t !== ALVO_REL);
    fs.writeFileSync(MANIFESTO, `${JSON.stringify(atual, null, 2)}\n`);
  } catch {
    fs.writeFileSync(MANIFESTO, manifestoOriginal);
  }
  if (fs.existsSync(ALVO)) fs.unlinkSync(ALVO);
}

console.log(`\n[provas] regras mordem: ${falhas === 0 ? 'ok' : `${falhas} regra(s) sem prova de reprovação`}`);
if (falhas) process.exitCode = 1;
