import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizableTable, ResizableTh } from '../ResizableTable';
import { useFecharAoSair } from '../../hooks/useFecharAoSair';
import EmptyState from '../ui/EmptyState';

function useEhMovel() {
  const [ehMovel, setEhMovel] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const aoMudar = (event) => setEhMovel(event.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);
  return ehMovel;
}

/** Célula composta: dois dados relacionados numa coluna só (obra + descrição). */
export function CelulaDupla({ principal, sub, title }) {
  return (
    <div className="app-celula-dupla" title={title || `${principal ?? ''}${sub ? ` — ${sub}` : ''}`}>
      <span className="app-celula-dupla-principal">{principal}</span>
      {sub ? <span className="app-celula-dupla-sub">{sub}</span> : null}
    </div>
  );
}

/**
 * TABELA PADRÃO — para listas que não precisam do peso da ListaAvancada
 * (a listagem PRINCIPAL de um módulo usa ListaAvancada; tabelas de apoio,
 * detalhe e telas mistas usam esta). Um markup só: no celular as MESMAS
 * colunas viram cards — nunca dois códigos para o mesmo dado.
 *
 * colunas: [{ id, titulo, render(item), tipo?, alinhar?,
 *             noCard? ('titulo' destaca no card; false omite do card),
 *             ordenavel?, valorOrdenacao?(item), fixa?, opcional? }]
 * A LARGURA é decisão do componente, não da tela: cada `tipo` já carrega a
 * medida das regras (docs/REGRAS-LAYOUT.md R1/R6/R7) — a tela só declara o
 * que a coluna É. `largura`/`minWidth` seguem aceitos apenas para exceção
 * registrada no manifesto (validarLayout reprova sem registro).
 * urgencia(item): 'danger' | 'warning' | null → tarja lateral.
 *
 * CAPACIDADES OPCIONAIS (leva do componente, 02/09 — decisão do cliente
 * de estender o padrão em vez de manter 20 exceções permanentes). Todas
 * são opt-in: tabela que não as declara se comporta exatamente como antes.
 *   1. ORDENAÇÃO      — coluna com `ordenavel`: clique no título ordena
 *                       (asc → desc → sem ordem). O menu de alinhamento sai
 *                       do título e vira ícone próprio (ver R14/R15 abaixo).
 *                       Em lista PAGINADA NO SERVIDOR, passe `aoOrdenar`: a
 *                       tela reconsulta e o componente não ordena local —
 *                       ordenar só a página mente sobre o conjunto.
 *   2. COLUNAS DO USUÁRIO — `colunasConfiguraveis`: painel para mostrar,
 *                       esconder e reordenar; escolha salva por lista.
 *   3. SELEÇÃO EM LOTE — `selecao`: coluna de marcação com "todos" no
 *                       cabeçalho.
 *   4. LINHA EXPANSÍVEL / AGRUPADORA — `linhaExpansivel(item)` e
 *                       `agruparPor`.
 *   5. COLUNA FIXA    — coluna com `fixa`: gruda à esquerda na rolagem
 *                       horizontal (tabela larga não perde a referência).
 */

// Medidas por papel da coluna — pior caso real de cada dado (R1/R6/R7).
// R14 (02/09): título e conteúdo da coluna compartilham o MESMO
// alinhamento, definido pelo tipo — e o usuário pode trocar (esquerda/
// centro/direita); a escolha vale para os dois e é salva por usuário e por
// lista, como largura.
const ALINHAMENTO_POR_TIPO = {
  texto: 'left',
  identidade: 'left',
  codigo: 'left',
  data: 'left',
  valor: 'right',
  numero: 'right',
  status: 'center',
  badge: 'center'
};

const OPCOES_ALINHAMENTO = [
  ['left', 'Esquerda'],
  ['center', 'Centro'],
  ['right', 'Direita']
];

const TIPOS_COLUNA = {
  texto:  { largura: 180, flexPadrao: true },        // conteúdo: recebe a sobra
  // Identificação (nome, razão social, obra, empresa, parceiro): como texto,
  // mas exibida SEMPRE em maiúsculas — só exibição, o dado não muda.
  identidade: { largura: 180, flexPadrao: true, identidade: true },
  codigo: { largura: 130 },                          // OB-2024-0117
  // R$ 9.999.999.999,99 no corpo de 14px tabular ≈ 184px com o respiro (R6/R7).
  valor:  { largura: 190, alinhar: 'right', valor: true },
  numero: { largura: 120, alinhar: 'right', valor: true },
  data:   { largura: 110 },                          // 22/08/2026
  /*
    132px, não 96 (medido no preview em 02/09): com 96 a coluna deixava
    ~72px úteis, e "ESTORNADO"/"CONFIRMADA" em 12px semibold não cabiam —
    o badge era cortado no meio da palavra. Largura é decisão do
    componente, então o conserto é aqui e vale para toda tela.
  */
  status: { largura: 132, alinhar: 'center' },
  badge:  { largura: 120, alinhar: 'center' }
};

/*
  Piso de largura pelo PRÓPRIO CABEÇALHO (02/09).

  A largura vem do tipo — do pior caso do DADO. Mas o cabeçalho também
  ocupa lugar, e nele cabe menos do que parece: o `th` gasta ~54px entre
  padding, indicador de ordem, ícone de alinhamento e alça de
  redimensionamento. Numa coluna `numero` (120px) sobram ~66px, e
  "COLABORADORES" precisa de ~118px — o título era cortado sem que nenhum
  `tipo` correto resolvesse, e a tela não pode fixar largura à mão (R1/R10).

  Então a largura passa a ser `max(largura do tipo, largura do título)`.
  Não é caso isolado do RH/DP: qualquer título com mais de ~10 caracteres
  em coluna `numero`, `data` ou `badge` truncava.

  A medida do texto é uma estimativa deliberada, não uma medição no DOM:
  o cabeçalho é 12px semibold em maiúsculas, e ~7.3px por caractere erra
  para mais em telas estreitas — o que é o lado seguro (sobra, não corta).
  Medir no canvas custaria um reflow por coluna a cada render.
*/
const LARGURA_CONTROLES_TH = 54;
const LARGURA_CARACTERE_TH = 7.3;

function larguraMinimaDoTitulo(titulo) {
  const texto = String(titulo ?? '').trim();
  if (!texto) return 0;
  return Math.ceil(texto.length * LARGURA_CARACTERE_TH) + LARGURA_CONTROLES_TH;
}

function normalizarColuna(coluna) {
  const base = TIPOS_COLUNA[coluna.tipo];
  if (!base) return coluna;
  const larguraDoTipo = coluna.largura ?? base.largura;
  // Largura declarada à mão pela tela manda: quem escreveu sabia por quê.
  const largura = coluna.largura ?? Math.max(larguraDoTipo, larguraMinimaDoTitulo(coluna.titulo));
  return {
    ...coluna,
    largura,
    // T7: coluna de dinheiro/número não encolhe abaixo do pior caso — nem
    // por arrasto do usuário, nem por distribuição. Valor truncado com
    // reticências é defeito sempre; texto longo trunca, dinheiro não.
    minWidth: coluna.minWidth ?? (base.valor ? Math.max(base.largura, larguraMinimaDoTitulo(coluna.titulo)) : undefined),
    alinhar: coluna.alinhar ?? base.alinhar,
    flex: coluna.flex ?? (base.flexPadrao || undefined),
    __valor: base.valor || undefined,
    __identidade: base.identidade || undefined
  };
}

function lerJson(chave, padrao) {
  if (!chave || typeof window === 'undefined') return padrao;
  try {
    const cru = window.localStorage.getItem(chave);
    return cru ? JSON.parse(cru) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJson(chave, valor) {
  if (!chave || typeof window === 'undefined') return;
  try { window.localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
}

/* ---------------------------------------------------------------- ícones */

/* R15: capacidade sem sinal não existe — o cabeçalho carrega affordance
   VISÍVEL: cursor, ícone discreto no hover e tooltip nomeando a
   capacidade. */
function IconeAlinhar() {
  return (
    <svg className="app-th-affordance" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 3h11M1.5 7h7M1.5 11h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeOrdem({ direcao }) {
  return (
    <svg className={`app-th-ordem${direcao ? ' app-th-ordem--ativa' : ''}`} viewBox="0 0 10 14" fill="none" aria-hidden="true">
      <path d="M5 1.5L8 5H2L5 1.5Z" fill="currentColor" opacity={direcao === 'desc' ? 0.25 : 1} />
      <path d="M5 12.5L2 9h6l-3 3.5Z" fill="currentColor" opacity={direcao === 'asc' ? 0.25 : 1} />
    </svg>
  );
}

function IconeSeta({ aberta }) {
  return (
    <svg
      className={`app-tabela-expandir-seta${aberta ? ' app-tabela-expandir-seta--aberta' : ''}`}
      viewBox="0 0 16 16" fill="none" aria-hidden="true"
    >
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * CABEÇALHO DE COLUNA.
 *
 * Desenho da coexistência ordenação × alinhamento (decisão do cliente,
 * 02/09): o CLIQUE NO TÍTULO ORDENA, e o menu de alinhamento vira um ícone
 * próprio, ancorado à direita e revelado no hover/foco (a affordance da
 * R15). Os dois não cabem lado a lado: numa coluna estreita (a de status
 * tinha 96px, 72px úteis, quando esta decisão foi tomada; hoje tem 132 para
 * o badge caber) o título com o indicador de ordem já ocupa ~54px e o alvo mínimo
 * de clique do ícone é 32px (R2). Por isso o ícone é ancorado sobre a borda
 * direita, com fundo próprio, e o título trunca atrás dele — o mesmo
 * arranjo de Excel e Planilhas. Coluna sem `ordenavel` mantém o título como
 * texto (nada de affordance que não faz nada).
 */
function CabecalhoColuna({ coluna, alinhamento, aoAlinhar, ordem, aoOrdenar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useFecharAoSair(ref, aberto, () => setAberto(false));
  const direcao = ordem?.coluna === coluna.id ? ordem.direcao : null;

  return (
    <span
      className={`app-th-alinhavel${aberto ? ' app-th-alinhavel--aberto' : ''}`}
      ref={ref}
      style={{ textAlign: alinhamento }}
    >
      {coluna.ordenavel ? (
        <button
          type="button"
          className="app-th-botao app-th-botao--ordenavel"
          title={`Ordenar por ${coluna.titulo}`}
          onClick={() => aoOrdenar(coluna.id)}
        >
          {coluna.titulo}
          <IconeOrdem direcao={direcao} />
        </button>
      ) : (
        <span className="app-th-botao app-th-botao--estatico">{coluna.titulo}</span>
      )}

      <button
        type="button"
        className="app-th-alinhar"
        title="Alinhar / redimensionar"
        aria-label={`Alinhar coluna ${coluna.titulo}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(evento) => { evento.stopPropagation(); setAberto((atual) => !atual); }}
      >
        <IconeAlinhar />
      </button>

      {aberto && (
        <span className="app-mais-menu app-th-menu" role="menu">
          {OPCOES_ALINHAMENTO.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="menuitem"
              className="app-mais-item"
              aria-pressed={alinhamento === valor}
              onClick={() => {
                setAberto(false);
                aoAlinhar(coluna.id, valor);
              }}
            >
              {alinhamento === valor ? '✓ ' : ''}{rotulo}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Painel "Colunas": mostrar/esconder e reordenar, salvo por lista. */
function PainelColunas({ colunas, visiveis, ordem, aoAlternar, aoMover, aoRestaurar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useFecharAoSair(ref, aberto, () => setAberto(false));
  const ordenadas = ordem.map((id) => colunas.find((c) => c.id === id)).filter(Boolean);

  return (
    <span className="app-mais-wrap app-colunas-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        Colunas
      </button>
      {aberto && (
        <span className="app-mais-menu app-colunas-menu" role="menu">
          {ordenadas.map((coluna, indice) => {
            const travada = coluna.sempreVisivel || coluna.__identidade;
            return (
              <span className="app-colunas-item" key={coluna.id}>
                <label className="app-colunas-rotulo">
                  <input
                    type="checkbox"
                    checked={visiveis.includes(coluna.id)}
                    disabled={travada}
                    onChange={() => aoAlternar(coluna.id)}
                  />
                  <span>{coluna.titulo}</span>
                </label>
                <span className="app-colunas-mover">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    title="Mover para cima"
                    aria-label={`Mover ${coluna.titulo} para cima`}
                    disabled={indice === 0}
                    onClick={() => aoMover(coluna.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    title="Mover para baixo"
                    aria-label={`Mover ${coluna.titulo} para baixo`}
                    disabled={indice === ordenadas.length - 1}
                    onClick={() => aoMover(coluna.id, 1)}
                  >
                    ↓
                  </button>
                </span>
              </span>
            );
          })}
          <button type="button" className="app-mais-item" onClick={aoRestaurar}>
            Restaurar padrão
          </button>
        </span>
      )}
    </span>
  );
}

function classeCelula(coluna) {
  const classes = [
    coluna.__valor && 'celula-valor',
    coluna.__identidade && 'celula-identidade',
    coluna.fixa && 'celula-fixa'
  ].filter(Boolean).join(' ');
  return classes || undefined;
}

/* Comparação para ordenação: número e data comparam como número; o resto
   como texto pt-BR. Vazio vai SEMPRE para o fim, nas duas direções — o que
   não tem valor não disputa o topo da lista. */
function compararValores(a, b) {
  const vazioA = a === null || a === undefined || a === '';
  const vazioB = b === null || b === undefined || b === '';
  if (vazioA && vazioB) return 0;
  if (vazioA) return 1;
  if (vazioB) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export default function TabelaPadrao({
  colunas = [],
  itens = [],
  getId = (item) => item.id,
  urgencia,
  aoClicarLinha,
  acoesLinha,
  storageKey,
  carregando = false,
  vazio = 'Nenhum registro encontrado',
  rotuloRolagem,
  larguraAcoes = 240,
  // R17: declaração EXPLÍCITA de que esta tabela não tem coluna de
  // identidade (raro — ex.: série temporal). Sem uma coluna
  // `tipo: 'identidade'` e sem esta marca, o validador estático reprova.
  // eslint-disable-next-line no-unused-vars
  semIdentidade = false,
  // --- capacidades opcionais (ver cabeçalho do arquivo) ---
  selecao,              // { selecionados:Set|Array, aoAlternar(id,item), aoAlternarTodos(marcar,ids), elegivel?(item), unica?, semTodos? }
  linhaExpansivel,      // (item) => ReactNode | null
  rotuloDetalhe,        // (item) => string — nomeia o detalhe para leitor de tela
  agruparPor,           // { chave(item), titulo(chave, itens) }
  colunasConfiguraveis = false,
  aoMudarColunas,       // (idsVisiveis[]) => void — a tela precisa saber (ex.: exportar CSV só do que está à vista)
  aoOrdenar,            // (coluna, direcao|null) => void — LISTA PAGINADA NO SERVIDOR: a tela reconsulta; o componente NÃO ordena local
  linhaSelecionada,     // (item) => boolean — realce e aria-selected da linha
  classeLinha,          // (item) => string|null — ênfase da tela (subtotal, total…) sem mentir com aria-selected
  acoesTabela           // ReactNode extra na barra acima da tabela
}) {
  const ehMovel = useEhMovel();
  const shellRef = useRef(null);
  const [larguraDisponivel, setLarguraDisponivel] = useState(null);
  const [expandidas, setExpandidas] = useState(() => new Set());

  // A tela declara o papel (`tipo`); a medida vem da tabela de tipos.
  const colunasDeclaradas = colunas.map(normalizarColuna);

  /* ---- Colunas escolhidas pelo usuário (visibilidade + ordem) --------- */
  const chaveColunas = storageKey ? `${storageKey}:colunas` : null;
  const idsPadrao = colunasDeclaradas.map((c) => c.id);
  const [prefColunas, setPrefColunas] = useState(
    () => lerJson(chaveColunas, null)
  );

  // Colunas novas/removidas pela tela não podem sumir nem sobrar por causa
  // de preferência antiga: a ordem salva é reconciliada com a declarada.
  const ordemColunas = useMemo(() => {
    const salva = (prefColunas?.ordem || []).filter((id) => idsPadrao.includes(id));
    const faltando = idsPadrao.filter((id) => !salva.includes(id));
    return [...salva, ...faltando];
  }, [prefColunas, idsPadrao.join('|')]);

  const visiveisColunas = useMemo(() => {
    if (!prefColunas?.visiveis) return idsPadrao;
    const salvas = prefColunas.visiveis.filter((id) => idsPadrao.includes(id));
    const novas = idsPadrao.filter((id) => !(prefColunas.visiveis || []).includes(id)
      && !(prefColunas.ocultas || []).includes(id));
    return [...salvas, ...novas];
  }, [prefColunas, idsPadrao.join('|')]);

  const salvarPrefColunas = (proxima) => {
    setPrefColunas(proxima);
    gravarJson(chaveColunas, proxima);
    // A tela precisa da escolha para agir sobre ela (exportar CSV só das
    // colunas à vista, por exemplo). Sem isso ela teria que ler o
    // localStorage do componente — acoplamento que já apareceu na prática.
    if (aoMudarColunas) {
      const visiveis = proxima?.visiveis || idsPadrao;
      aoMudarColunas((proxima?.ordem || idsPadrao).filter((id) => visiveis.includes(id)));
    }
  };

  const alternarColuna = (id) => {
    const visiveis = visiveisColunas.includes(id)
      ? visiveisColunas.filter((x) => x !== id)
      : [...visiveisColunas, id];
    salvarPrefColunas({
      ordem: ordemColunas,
      visiveis,
      ocultas: idsPadrao.filter((x) => !visiveis.includes(x))
    });
  };

  const moverColuna = (id, passo) => {
    const atual = [...ordemColunas];
    const de = atual.indexOf(id);
    const para = de + passo;
    if (de < 0 || para < 0 || para >= atual.length) return;
    [atual[de], atual[para]] = [atual[para], atual[de]];
    salvarPrefColunas({ ordem: atual, visiveis: visiveisColunas, ocultas: prefColunas?.ocultas || [] });
  };

  const restaurarColunas = () => {
    setPrefColunas(null);
    if (chaveColunas && typeof window !== 'undefined') {
      try { window.localStorage.removeItem(chaveColunas); } catch { /* sem storage */ }
    }
    if (aoMudarColunas) aoMudarColunas(idsPadrao);
  };

  const colunasBase = useMemo(() => {
    if (!colunasConfiguraveis) return colunasDeclaradas;
    return ordemColunas
      .map((id) => colunasDeclaradas.find((c) => c.id === id))
      .filter((c) => c && visiveisColunas.includes(c.id));
  }, [colunasConfiguraveis, ordemColunas, visiveisColunas, colunas]);

  // Escolha inicial (vinda do storage) também precisa chegar à tela: sem
  // isto, depois de um F5 a tela agiria sobre as colunas padrão enquanto a
  // tabela mostra outras.
  const avisouInicial = useRef(false);
  useEffect(() => {
    if (!colunasConfiguraveis || !aoMudarColunas || avisouInicial.current) return;
    avisouInicial.current = true;
    aoMudarColunas(ordemColunas.filter((id) => visiveisColunas.includes(id)));
  }, [colunasConfiguraveis, aoMudarColunas, ordemColunas, visiveisColunas]);

  /* ---- R14 — alinhamento escolhido pelo usuário, salvo por lista ------ */
  const chaveAlinhar = storageKey ? `${storageKey}:alinhar` : null;
  const [alinhamentos, setAlinhamentos] = useState(() => lerJson(chaveAlinhar, {}));
  const definirAlinhamento = (colunaId, valor) => {
    setAlinhamentos((atuais) => {
      const proximos = { ...atuais, [colunaId]: valor };
      gravarJson(chaveAlinhar, proximos);
      return proximos;
    });
  };
  const alinhamentoDe = (coluna) => alinhamentos[coluna.id]
    || coluna.alinhar
    || ALINHAMENTO_POR_TIPO[coluna.tipo]
    || 'left';

  /* ---- Ordenação (clique no título) ----------------------------------- */
  const [ordem, setOrdem] = useState(null); // { coluna, direcao } | null
  /* Lista PAGINADA NO SERVIDOR não pode ser ordenada localmente: ordenar
     só a página à vista faz o usuário ler "os maiores do conjunto" quando
     são apenas os maiores DAQUELES 25 — mentira pior que a ausência da
     ordenação. Com `aoOrdenar`, a tela reconsulta o servidor e o
     componente só exibe o indicador. */
  const ordenaNoServidor = typeof aoOrdenar === 'function';
  const alternarOrdem = (colunaId) => {
    // `ordemInicial: 'desc'` na coluna: dinheiro e quantidade costumam
    // interessar do MAIOR para o menor no primeiro clique.
    const inicial = colunasBase.find((c) => c.id === colunaId)?.ordemInicial === 'desc'
      ? 'desc' : 'asc';
    const oposta = inicial === 'asc' ? 'desc' : 'asc';
    setOrdem((atual) => {
      if (!atual || atual.coluna !== colunaId) return { coluna: colunaId, direcao: inicial };
      if (atual.direcao === inicial) return { coluna: colunaId, direcao: oposta };
      return null; // terceiro clique volta à ordem original da tela
    });
  };

  // Avisa a tela DEPOIS que o estado mudou (a tela reconsulta com a ordem).
  const ordemAnterior = useRef(null);
  useEffect(() => {
    if (!ordenaNoServidor) return;
    const chave = ordem ? `${ordem.coluna}:${ordem.direcao}` : '';
    if (ordemAnterior.current === chave) return;
    ordemAnterior.current = chave;
    aoOrdenar(ordem?.coluna ?? null, ordem?.direcao ?? null);
  }, [ordem, ordenaNoServidor, aoOrdenar]);

  const itensOrdenados = useMemo(() => {
    // Ordenação no servidor: os itens já chegam ordenados; reordenar aqui
    // embaralharia a página.
    if (ordenaNoServidor) return itens;
    if (!ordem) return itens;
    const coluna = colunasBase.find((c) => c.id === ordem.coluna);
    if (!coluna) return itens;
    const valorDe = coluna.valorOrdenacao || ((item) => item?.[coluna.id]);
    const fator = ordem.direcao === 'desc' ? -1 : 1;
    // Cópia: ordenar não pode mutar o array da tela.
    return [...itens].sort((a, b) => fator * compararValores(valorDe(a), valorDe(b)));
  }, [itens, ordem, colunasBase, ordenaNoServidor]);

  /* ---- Seleção em lote ------------------------------------------------ */
  const selecionados = useMemo(() => {
    if (!selecao) return new Set();
    return selecao.selecionados instanceof Set
      ? selecao.selecionados
      : new Set(selecao.selecionados || []);
  }, [selecao]);

  const idsElegiveis = useMemo(() => {
    if (!selecao) return [];
    return itensOrdenados
      .filter((item) => (selecao.elegivel ? selecao.elegivel(item) : true))
      .map((item) => getId(item));
  }, [selecao, itensOrdenados]);

  const todosMarcados = idsElegiveis.length > 0
    && idsElegiveis.every((id) => selecionados.has(id));

  /* ---- R1: ação no máximo 320px; a sobra vai para a coluna de conteúdo */
  const larguraAcoesEfetiva = Math.min(larguraAcoes, 320);
  const LARGURA_SELECAO = 44;
  const LARGURA_EXPANDIR = 44;

  /*
    A largura tem de ser REMEDIDA quando o contêiner muda de tamanho.

    A primeira versão media uma vez e guardava (`atual ?? Math.floor(...)`),
    com dependências que não incluíam largura nenhuma. Consequência medida no
    preview em 02/09: as capturas de 1920 e 1366 da mesma tela têm as colunas
    nas MESMAS posições x — a tabela ficou com a medida de 1920 e deixou
    ~340px vazios em 1366. Valia para TODA tela com TabelaPadrao, não só a
    que o revisor olhou: qualquer janela redimensionada, menu lateral
    recolhido ou bloco que abre ao lado desalinha a distribuição em silêncio.

    `ResizeObserver` no contêiner de rolagem, então, e o `atual ??` sai. O
    estado só é escrito quando o número muda de verdade, para não entrar em
    laço de render (o observer dispara na própria mudança de layout).
  */
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return undefined;

    const medir = () => {
      const alvo = shellRef.current;
      if (!alvo) return;
      // A largura que vale é a do CONTAINER DE ROLAGEM da tabela (a caixa
      // externa do shell tem padding e distribuía sobra a mais, cortando a
      // coluna de ações).
      const rolagem = alvo.querySelector('.resizable-table-scroll');
      const largura = Math.floor(rolagem ? rolagem.clientWidth : alvo.clientWidth);
      if (largura > 0) {
        setLarguraDisponivel((atual) => (atual === largura ? atual : largura));
      }
    };

    medir();
    const raf = requestAnimationFrame(medir);

    let observador = null;
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(medir);
      // Observa o SHELL, que é o nó com ref e nunca é recriado. Observar o
      // `.resizable-table-scroll` (filho) deixava o observador órfão assim
      // que a tabela remontava por qualquer motivo — defeito de 03/09.
      observador.observe(el);
    } else {
      window.addEventListener('resize', medir);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observador) observador.disconnect();
      else window.removeEventListener('resize', medir);
    };
  }, [carregando, ehMovel, itens.length]);

  // T6: célula que trunca ganha tooltip com o texto COMPLETO — cortar com
  // reticências sem caminho para ler o resto é reprovado pela DoD.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    el.querySelectorAll('td').forEach((td) => {
      if (td.closest('[title]')) return;
      const cortado = td.scrollWidth > td.clientWidth + 2
        || Array.from(td.querySelectorAll('span, div')).some(
          (filho) => filho.scrollWidth > filho.clientWidth + 2
        );
      if (cortado) td.title = td.innerText.replace(/\s+/g, ' ').trim();

      /*
        T6 — CÉLULA DE TOKEN ÚNICO TRUNCA, NÃO QUEBRA (03/09).

        Tirar o `overflow-wrap: anywhere` resolveu "ADMINISTRATIVO", mas não
        "QAENG-MTJLBFMT4DL0": o hífen é uma oportunidade de quebra legítima
        para o navegador, e o código virava dois códigos em duas linhas.
        Não existe propriedade CSS que proíba a quebra no hífen sem proibir
        também a quebra entre palavras — que a gente QUER, para nome de
        pessoa e descrição caberem em duas linhas.

        Então a decisão é por conteúdo: célula cujo texto não tem espaço
        nenhum é um token (código, matrícula, chave), e token se lê inteiro
        ou não se lê. Ela passa a `nowrap` e trunca com reticências, com o
        valor completo no `title` — que é exatamente o que a T6 chama de
        aceitável. Célula com espaço continua quebrando entre palavras.
      */
      const texto = td.innerText.trim();
      td.classList.toggle('app-celula-token', texto.length > 0 && !/\s/.test(texto));
    });
  });

  const indiceFlex = (() => {
    /*
      `flex` era lido como SIM/NÃO, e a primeira coluna marcada levava a
      sobra. Só que `tipo: 'texto'` e `tipo: 'identidade'` já nascem com
      `flexPadrao`, então numa tabela com vários textos a sobra ia para o
      primeiro deles — não para o mais comprido. Foi o que segurou a coluna
      "Detalhes" da auditoria em 156px com 364px de conteúdo, mesmo depois
      de a tela pedir `flex: 3`.

      Agora um número explícito maior que 1 vence: a tela consegue dizer
      QUAL coluna é a de conteúdo. Sem número, o comportamento antigo.
    */
    const comPeso = colunasBase
      .map((c, i) => ({ i, peso: Number(c.flex) }))
      .filter(({ peso }) => Number.isFinite(peso) && peso > 1);
    if (comPeso.length) {
      return comPeso.reduce((a, b) => (b.peso > a.peso ? b : a)).i;
    }
    const marcada = colunasBase.findIndex((c) => c.flex);
    if (marcada >= 0) return marcada;
    const titulo = colunasBase.findIndex((c) => c.noCard === 'titulo');
    return titulo >= 0 ? titulo : 0;
  })();

  /*
    As larguras que o USUÁRIO escolheu, reportadas pela ResizableTable. A
    distribuição da sobra precisa delas: somar a proposta de uma coluna que
    o usuário já redimensionou fazia a conta errar exatamente pelo tamanho
    do arrasto, e a tabela transbordava o contêiner para sempre.
  */
  const [largurasDoUsuario, setLargurasDoUsuario] = useState({});
  const receberLarguras = useCallback((mapa) => {
    setLargurasDoUsuario((atual) => {
      const mudou = Object.keys(mapa).length !== Object.keys(atual).length
        || Object.entries(mapa).some(([k, v]) => atual[k] !== v);
      return mudou ? mapa : atual;
    });
  }, []);
  const larguraReal = useCallback(
    (coluna) => largurasDoUsuario[coluna.id] ?? coluna.largura,
    [largurasDoUsuario]
  );

  const colunasComFlex = colunasBase.map((coluna, i) => {
    if (i !== indiceFlex || !larguraDisponivel) return coluna;
    /*
      A soma usa a largura REAL de cada coluna — a arrastada pelo usuário
      quando existe, a proposta quando não. Somar sempre a proposta fazia a
      tabela transbordar 78px de forma permanente depois de qualquer
      arrasto (medido em 03/09), porque a conta ignorava exatamente o que o
      usuário tinha acabado de mudar.
    */
    const fixas = colunasBase.reduce(
      (soma, c, j) => (j === indiceFlex ? soma : soma + Number(larguraReal(c) || 140)),
      (acoesLinha ? larguraAcoesEfetiva : 0)
        + (selecao ? LARGURA_SELECAO : 0)
        + (linhaExpansivel ? LARGURA_EXPANDIR : 0)
    );
    const piso = Math.max(Number(coluna.minWidth || 160), 160);
    // Folga de 12px: bordas e arredondamentos nunca podem cortar a última
    // coluna (ações) — sobrar 1 degrau é invisível, cortar não é.
    return { ...coluna, largura: Math.max(piso, larguraDisponivel - fixas - 12) };
  });

  if (carregando) {
    return (
      <div className="empty-state" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <p className="empty-state__description">Carregando…</p>
      </div>
    );
  }

  if (!itens.length) {
    return <EmptyState title={typeof vazio === 'string' ? vazio : vazio?.title} message={vazio?.message} />;
  }

  if (ehMovel) {
    const colunaTitulo = colunasBase.find((c) => c.noCard === 'titulo') || colunasBase[0];
    const demais = colunasBase.filter((c) => c !== colunaTitulo && c.noCard !== false);
    return (
      <div className="app-tabela-cards">
        {itensOrdenados.map((item) => {
          const tom = urgencia?.(item);
          const id = getId(item);
          const detalhe = linhaExpansivel?.(item);
          const aberta = expandidas.has(id);
          return (
            <div
              key={id}
              className={`app-tabela-card${tom ? ` tarja tarja--${tom}` : ''}`}
              onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
            >
              {selecao ? (
                <label className="app-tabela-card-selecao" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selecionados.has(id)}
                    disabled={selecao.elegivel ? !selecao.elegivel(item) : false}
                    onChange={() => selecao.aoAlternar(id, item)}
                  />
                  <span>Selecionar</span>
                </label>
              ) : null}
              <div className={`app-celula-dupla-principal${colunaTitulo.__identidade ? ' celula-identidade' : ''}`}>
                {colunaTitulo.render(item)}
              </div>
              <dl style={{ margin: 0, display: 'contents' }}>
                {demais.map((coluna) => (
                  <div className="app-tabela-card-par" key={coluna.id}>
                    <dt>{coluna.titulo}</dt>
                    <dd className={coluna.__identidade ? 'celula-identidade' : undefined}>{coluna.render(item)}</dd>
                  </div>
                ))}
              </dl>
              {detalhe ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    aria-expanded={aberta}
                    onClick={() => setExpandidas((atual) => {
                      const proximo = new Set(atual);
                      if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
                      return proximo;
                    })}
                  >
                    {aberta ? 'Ocultar detalhe' : 'Ver detalhe'}
                  </button>
                  {aberta ? <div className="app-tabela-card-detalhe">{detalhe}</div> : null}
                </div>
              ) : null}
              {acoesLinha ? (
                <div className="app-tabela-card-acoes" onClick={(e) => e.stopPropagation()}>
                  {acoesLinha(item)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---- Colunas efetivas da tabela (marcação, expansão, conteúdo, ações) */
  const colunasTabela = [
    ...(selecao ? [{ id: '__selecao', titulo: 'Sel.', largura: LARGURA_SELECAO, minWidth: LARGURA_SELECAO }] : []),
    ...(linhaExpansivel ? [{ id: '__expandir', titulo: '', largura: LARGURA_EXPANDIR, minWidth: LARGURA_EXPANDIR }] : []),
    ...colunasComFlex,
    ...(acoesLinha ? [{ id: '__acoes', titulo: 'Ações', largura: larguraAcoesEfetiva, minWidth: 120 }] : [])
  ];

  const totalColunas = colunasTabela.length;

  /* ---- Agrupamento: linhas de grupo intercaladas ---------------------- */
  const blocos = agruparPor
    ? Array.from(
      itensOrdenados.reduce((mapa, item) => {
        const chave = agruparPor.chave(item);
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push(item);
        return mapa;
      }, new Map())
    ).map(([chave, lista]) => ({ chave, itens: lista }))
    : [{ chave: null, itens: itensOrdenados }];

  const renderLinha = (item) => {
    const tom = urgencia?.(item);
    const id = getId(item);
    const detalhe = linhaExpansivel?.(item);
    const aberta = expandidas.has(id);
    const marcada = linhaSelecionada ? linhaSelecionada(item) : selecionados.has(id);
    const classes = [
      'app-tabela-linha',
      aoClicarLinha && 'app-tabela-linha--clicavel',
      (linhaSelecionada || selecao) && marcada && 'app-tabela-linha--selecionada',
      tom && `app-tabela-linha--${tom}`,
      classeLinha?.(item)
    ].filter(Boolean).join(' ');
    return [
      <tr
        key={id}
        className={classes}
        // Linha clicável precisa de caminho de TECLADO: sem isto, quem não
        // usa mouse perde a ação inteira (regressão real pega na migração).
        tabIndex={aoClicarLinha ? 0 : undefined}
        role={aoClicarLinha ? 'button' : undefined}
        aria-selected={(linhaSelecionada || selecao) ? marcada : undefined}
        onKeyDown={aoClicarLinha ? (evento) => {
          if (evento.target !== evento.currentTarget) return;
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            aoClicarLinha(item);
          }
        } : undefined}
        onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
      >
        {selecao ? (
          <td className="celula-selecao" onClick={(e) => e.stopPropagation()}>
            <input
              type={selecao.unica ? 'radio' : 'checkbox'}
              name={selecao.unica ? `selecao:${storageKey || 'tabela'}` : undefined}
              checked={selecionados.has(id)}
              disabled={selecao.elegivel ? !selecao.elegivel(item) : false}
              aria-label={`Selecionar linha ${id}`}
              onChange={() => selecao.aoAlternar(id, item)}
            />
          </td>
        ) : null}
        {linhaExpansivel ? (
          <td className="celula-expandir" onClick={(e) => e.stopPropagation()}>
            {detalhe ? (
              <button
                type="button"
                className="app-tabela-expandir"
                aria-expanded={aberta}
                aria-controls={`detalhe:${id}`}
                aria-label={`${aberta ? 'Ocultar' : 'Ver'} detalhe${rotuloDetalhe ? ` de ${rotuloDetalhe(item)}` : ''}`}
                title={aberta ? 'Ocultar detalhe' : 'Ver detalhe'}
                onClick={() => setExpandidas((atual) => {
                  const proximo = new Set(atual);
                  if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
                  return proximo;
                })}
              >
                <IconeSeta aberta={aberta} />
              </button>
            ) : null}
          </td>
        ) : null}
        {colunasBase.map((coluna) => (
          <td
            key={coluna.id}
            className={classeCelula(coluna)}
            style={{ textAlign: alinhamentoDe(coluna) }}
          >
            {coluna.render(item)}
          </td>
        ))}
        {acoesLinha ? (
          <td onClick={(e) => e.stopPropagation()}>
            <div className="app-actionbar">{acoesLinha(item)}</div>
          </td>
        ) : null}
      </tr>,
      detalhe && aberta ? (
        <tr key={`${id}:detalhe`} className="app-tabela-detalhe">
          <td colSpan={totalColunas} id={`detalhe:${id}`}>{detalhe}</td>
        </tr>
      ) : null
    ];
  };

  return (
    <div className="app-table-shell app-tabela" ref={shellRef}>
      {(colunasConfiguraveis || acoesTabela) ? (
        <div className="app-tabela-barra">
          {acoesTabela}
          {colunasConfiguraveis ? (
            <PainelColunas
              colunas={colunasDeclaradas}
              visiveis={visiveisColunas}
              ordem={ordemColunas}
              aoAlternar={alternarColuna}
              aoMover={moverColuna}
              aoRestaurar={restaurarColunas}
            />
          ) : null}
        </div>
      ) : null}

      {/*
        SEM `key` de remontagem (03/09). Havia um
        `key={`medida:${larguraDisponivel}:...`}` que remontava a
        ResizableTable a cada medição nova. Ele existia para forçar a adoção
        da largura recalculada — e cobrava caro por isso:
         - destruía o `.resizable-table-scroll` que o ResizeObserver estava
           observando, deixando o observador preso a um nó morto. A largura
           passava a nunca mais ser remedida (13 telas reprovando no T4);
         - re-semeava as larguras do localStorage a cada medição.
        A adoção agora acontece pelo caminho certo: a ResizableTable aceita a
        largura proposta para toda coluna que não seja do usuário. Sem
        remontagem, o nó observado é estável.
      */}
      <ResizableTable
        key={colunasTabela.map((c) => c.id).join(',')}
        columns={colunasTabela.map((c) => ({
          id: c.id,
          width: c.largura,
          minWidth: c.minWidth || 90
        }))}
        /*
          ":v3" — a chave TEM de virar quando a REGRA DE LEITURA do que está
          guardado muda, não só quando o valor muda.

          O ":v2" guardava o MAPA INTEIRO de larguras. A regra nova lê
          "chave presente = largura escolhida pelo usuário". Lendo um mapa
          v2 com a regra v3, TODAS as colunas viram "do usuário" e a tabela
          congela para sempre — medido em 03/09: 1805px num contêiner de
          1239px, 566px fora, sem nunca remedir. E isso não aconteceria em
          nenhum harness: ele nasce com localStorage limpo. Só quem usou o
          build anterior é atingido, que é justamente quem não pode ser.
        */
        storageKey={storageKey ? `${storageKey}:v3` : undefined}
        aoMudarLarguras={receberLarguras}
        scrollLabel={rotuloRolagem}
      >
        <thead>
          <tr>
            {selecao && !selecao.unica && !selecao.semTodos ? (
              <th className="resizable-th celula-selecao">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = !todosMarcados
                        && idsElegiveis.some((id) => selecionados.has(id));
                    }
                  }}
                  aria-label={todosMarcados ? 'Desmarcar todos' : 'Selecionar todos'}
                  title={todosMarcados ? 'Desmarcar todos' : 'Selecionar todos'}
                  onChange={() => selecao.aoAlternarTodos(!todosMarcados, idsElegiveis)}
                />
              </th>
            ) : selecao ? (
              // Sem "todos": ou a seleção é ÚNICA, ou marcar tudo violaria
              // um invariante da tela (ex.: a soma não pode passar do valor
              // do lançamento, na conciliação). Nesses casos o cabeçalho só
              // rotula — melhor que oferecer um "todos" que mente.
              <th className="resizable-th celula-selecao" aria-label={selecao.unica ? 'Selecionada' : 'Marcar'} />
            ) : null}
            {linhaExpansivel ? <th className="resizable-th celula-expandir" aria-label="Detalhe" /> : null}
            {colunasComFlex.map((coluna) => (
              <ResizableTh
                key={coluna.id}
                columnKey={coluna.id}
                className={coluna.fixa ? 'celula-fixa' : undefined}
                /* Cabeçalho que corta ganha o texto inteiro no tooltip —
                   mesma regra que já valia para a CÉLULA (T6) e que faltava
                   aqui: "COMPETÊNCIA" era cortado sem caminho para ler o
                   resto. O piso de largura pelo título já evita o corte na
                   maioria dos casos; o tooltip é a rede para quando o
                   usuário estreita a coluna à mão. */
                title={typeof coluna.titulo === 'string' ? coluna.titulo : undefined}
                aria-sort={ordem?.coluna === coluna.id
                  ? (ordem.direcao === 'asc' ? 'ascending' : 'descending')
                  : undefined}
              >
                <CabecalhoColuna
                  coluna={coluna}
                  alinhamento={alinhamentoDe(coluna)}
                  aoAlinhar={definirAlinhamento}
                  ordem={ordem}
                  aoOrdenar={alternarOrdem}
                />
              </ResizableTh>
            ))}
            {acoesLinha ? (
              <ResizableTh columnKey="__acoes">Ações</ResizableTh>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {blocos.map((bloco) => (
            <Fragmento key={bloco.chave ?? '__unico'}>
              {agruparPor && bloco.chave !== null ? (
                <tr className="app-tabela-grupo">
                  <td colSpan={totalColunas}>
                    {agruparPor.titulo ? agruparPor.titulo(bloco.chave, bloco.itens) : bloco.chave}
                  </td>
                </tr>
              ) : null}
              {bloco.itens.map((item) => renderLinha(item))}
            </Fragmento>
          ))}
        </tbody>
      </ResizableTable>
    </div>
  );
}

/* Fragmento nomeado: `key` num React.Fragment exige a forma longa. */
function Fragmento({ children }) {
  return <>{children}</>;
}
