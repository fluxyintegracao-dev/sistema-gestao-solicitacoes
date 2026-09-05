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

let falhas = 0;

/*
  `--extra` EM VEZ DE ESCREVER NO MANIFESTO (05/09) — a prova era instável e
  a instabilidade era dela, não das regras.

  Esta prova plantava o defeito acrescentando o arquivo-fixture ao
  `telas-reformadas.json`, que é ESTADO COMPARTILHADO. Enquanto um agente
  rodava as provas dele em paralelo, as duas corridas faziam
  ler-modificar-escrever no mesmo arquivo e a restauração "cirúrgica" de uma
  apagava a entrada da outra. Medido em 05/09: três corridas seguidas
  acusaram regras DIFERENTES (R1, depois R17+R19, depois R19+R18) sem
  nenhuma mudança de código no meio. Prova que oscila é pior que prova
  vermelha: ela ensina a ignorar o resultado.

  E a saída já existia no repositório, escrita com este propósito exato: o
  `--extra` do validador mede um arquivo FORA do manifesto, sem tocar no
  compartilhado. Eu tinha até consertado a bandeira hoje (ela lia só um
  caminho) e continuei usando o caminho que causa corrida.
*/
function rodarValidador() {
  try {
    execFileSync('node', [path.join(RAIZ, 'scripts', 'validarLayout.mjs'), '--extra', ALVO_REL], { cwd: RAIZ, encoding: 'utf8' });
    return '';
  } catch (erro) {
    return `${erro.stdout || ''}${erro.stderr || ''}`;
  }
}

/*
  QUANDO ESTA PROVA FALHA, ELA TEM DE DIZER POR QUÊ (05/09).

  Em 05/09 ela começou a oscilar: três corridas seguidas acusaram regras
  DIFERENTES, sem nenhuma mudança de código no meio, enquanto um agente
  rodava provas em paralelo. A mensagem era sempre a mesma — "a regra
  existe e não morde" — e ela é uma AFIRMAÇÃO sobre a regra, quando o que
  havia era o verificador não tendo o que ler.

  Prova que oscila ensina a ignorar o resultado, e mensagem que atribui a
  causa errada é pior que mensagem nenhuma. Agora, quando não morde, ela
  separa os casos e mostra o que mediu: fixture no disco? validador
  respondeu? a saída cita o arquivo? cita a regra?
*/
function provar(regra, porque, conteudo) {
  fs.writeFileSync(ALVO, conteudo);
  const noDisco = fs.existsSync(ALVO) ? fs.readFileSync(ALVO, 'utf8').length : -1;
  const saida = rodarValidador();
  const citaArquivo = saida.includes(ALVO_REL);
  const citaRegra = saida.includes(`[${regra}]`);
  if (citaRegra && citaArquivo) {
    console.log(`  ok    ${regra} reprova ${porque}`);
    return;
  }
  falhas += 1;
  const diagnostico = noDisco <= 0
    ? `a FIXTURE não estava no disco na hora da medição (${noDisco} bytes) — defeito desta prova, não da regra`
    : (!saida
      ? 'o validador saiu com 0 e não devolveu saída nenhuma — ele não chegou a medir a fixture'
      : (!citaArquivo
        ? `o validador respondeu (${saida.length} bytes) e NÃO citou ${ALVO_REL} — a fixture não entrou na medição`
        : `o validador citou o arquivo mas não a regra [${regra}] — aí sim a regra não mordeu`));
  console.log(`  FALHA ${regra} NÃO reprovou ${porque} — ${diagnostico}`);
}

try {
  // O manifesto NÃO é mais tocado: a fixture entra pela bandeira `--extra`.
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
    Nada a restaurar no manifesto — ele deixou de ser tocado. Sobra a
    fixture, que é do PID desta corrida e some com ela.

    A "restauração cirúrgica" que existia aqui era uma tentativa honesta de
    conviver com corridas paralelas, e não bastava: ler-modificar-escrever
    não é atômico, então duas corridas ainda se derrubavam. A lição é que o
    conserto de corrida não é restaurar melhor — é não compartilhar.
  */
  if (fs.existsSync(ALVO)) fs.unlinkSync(ALVO);
}

console.log(`\n[provas] regras mordem: ${falhas === 0 ? 'ok' : `${falhas} regra(s) sem prova de reprovação`}`);
if (falhas) process.exitCode = 1;
