/**
 * FIXTURE VIVA PARA PROVAR OS ITENS DO RUNNER (verificar.mjs).
 *
 * Diferente da `paginaDoD.mjs` — que é HTML parado, porque os checks de
 * `checks.mjs` medem um DOM parado —, os sete itens do runner só existem na
 * INTERAÇÃO: arrasto de coluna, rolagem, clique em filtro, abertura de
 * modal, recarga da página. Nenhum deles pode ser provado contra HTML
 * estático: a T3 arrasta uma coluna, RECARREGA e lê o `localStorage`.
 *
 * Então esta fixture monta os COMPONENTES REAIS do sistema num ponto de
 * entrada React próprio, servido por um servidor local:
 *
 *   Pagina + PageHeader   → C1 e X2 (faixa fixa, compactação, opacidade)
 *   TabelaPadrao          → T3 (arrasto, posse da largura, persistência)
 *   BarraFiltros          → F3 (marcação → etiqueta → remoção)
 *   OverlayModal          → R1 (cadastro em modal)
 *
 * O defeito plantado vem da query (`?d=nome`). Ele NUNCA é plantado
 * editando um componente: ou é uma propriedade que a TELA controla (opções
 * vazias, handler que não guarda o valor, ação que troca de rota), ou é uma
 * folha de estilo por cima (a faixa deixa de ser opaca, o contêiner da
 * tabela deixa de rolar), ou é o `localStorage` do navegador embrulhado
 * para reproduzir a regressão exata que já aconteceu (gravar o mapa
 * inteiro; não gravar nada). É assim que se planta um defeito sem mentir
 * sobre o componente.
 *
 * Os casos em que o defeito só existe no MARKUP que um componente do
 * sistema gera (etiqueta de filtro sem botão de remover, faixa que não
 * compacta) são montados como "tela crua" — uma tela que fez à mão o que o
 * componente faz. Isso prova o CHECK, não o componente, e está declarado
 * como contorno no relatório da prova.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link } from 'react-router-dom';
import Pagina from '../../../src/components/padrao/Pagina';
import PageHeader from '../../../src/components/padrao/PageHeader';
import BlocoConteudo from '../../../src/components/padrao/BlocoConteudo';
import BarraFiltros, { alternarValorFiltro } from '../../../src/components/padrao/BarraFiltros';
import TabelaPadrao from '../../../src/components/padrao/TabelaPadrao';
import OverlayModal from '../../../src/components/ui/OverlayModal';
import { useFecharAoSair } from '../../../src/hooks/useFecharAoSair';

const D = new URLSearchParams(window.location.search).get('d') || '';
const CHAVE = 'tabela:prova-runner';

/* ------------------------------------------------------------------------
   DEFEITOS DE PERSISTÊNCIA — embrulham o `localStorage` ANTES de a árvore
   montar. Reproduzem, sem tocar no componente, as duas regressões que já
   aconteceram de verdade no ResizableTable (registradas no cabeçalho dele):
   gravar o MAPA INTEIRO (um arrasto congela todas as colunas) e não gravar
   nada que sobreviva à recarga.
   ------------------------------------------------------------------------ */
const LARGURAS_DE_TODAS = { usuario: 300, obra: 420, status: 132, valor: 190 };
if (D === 't3GravaTodas' || D === 't3NaoPersiste') {
  const original = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (chave, valor) => {
    if (!/:v3$/.test(chave)) return original(chave, valor);
    if (D === 't3NaoPersiste') return undefined;
    let doUsuario = {};
    try { doUsuario = JSON.parse(valor) || {}; } catch { doUsuario = {}; }
    return original(chave, JSON.stringify({ ...LARGURAS_DE_TODAS, ...doUsuario }));
  };
}

/* ------------------------------------------------------------------- CSS --
   Folha por cima, só para os defeitos que SÃO de estilo. Cada uma é a forma
   real do defeito: a faixa que perde a opacidade, o vão que reaparece entre
   as barras fixas, o contêiner da tabela que deixa de rolar. */
const ESTILOS = {
  c1Vao: '.layout-main .app-page-header { top: calc(var(--pos-cabecalho-fixo, 96px) + 40px); }',
  c1NaoOpaca: '.layout-main .app-page-header { background: rgba(255,255,255,0.55); }',
  c1FaixaSome: '.layout-main .app-page-header { position: static; }',
  c1CompactaAlta: '.layout-main .app-page-header--compacto { min-height: 140px; }',
  x2Vao: '.layout-main .app-page-header { top: calc(var(--pos-cabecalho-fixo, 96px) + 40px); }',
  x2NaoOpaca: '.layout-main .app-page-header { background: rgba(255,255,255,0.55); }',
  /* A alça continua no DOM e continua tendo caixa — só não recebe mais o
     ponteiro. É o defeito "arrastar não faz nada". */
  t3AlcaMorta: '.resizable-th-handle { pointer-events: none; }',
  /* `clip` recorta o transbordo E trava o scrollWidth no clientWidth: a
     tabela sai do contêiner e não há como alcançar o resto. É a mesma
     propriedade que matou a X3 (achado de 03/09). */
  t3Clipada: '.resizable-table-scroll { overflow-x: clip; }',
  /* Transbordo à mostra: a tabela derrama para fora do bloco. O
     `scrollWidth` continua contando o transbordo, então o contêiner PARECE
     rolável para quem só compara scrollWidth com clientWidth. */
  t3TransbordaVisivel: '.resizable-table-scroll { overflow: visible; }'
};
if (ESTILOS[D]) {
  const tag = document.createElement('style');
  tag.textContent = ESTILOS[D];
  document.head.appendChild(tag);
}

/* --------------------------------------------------------------- dados --- */
const ITENS = [
  { id: 1, usuario: 'Adailton Farias', obra: 'BR-101 KM 42 — Serra', status: 'Ativo', valor: 'R$ 1.234,56' },
  { id: 2, usuario: 'Maria Souza', obra: 'BR-262 KM 8 — Cariacica', status: 'Ativo', valor: 'R$ 987,00' },
  { id: 3, usuario: 'João Pereira', obra: 'Rodovia do Sol — Vila Velha', status: 'Inativo', valor: 'R$ 4.500,10' }
];

/*
  A coluna de conteúdo (a que recebe a sobra) é a SEGUNDA no caso limpo: a
  prova precisa que o arrasto da PRIMEIRA — que é o que o check faz — force
  uma VIZINHA a mudar de largura. É o comportamento correto, e a T3 não pode
  reprovar por causa dele.

  Nos defeitos de transbordo a sobra volta para a primeira coluna: aí a
  arrastada é a própria coluna de conteúdo, ninguém tem o que devolver, e a
  tabela cresce para fora do contêiner.
*/
const SOBRA_NA_PRIMEIRA = D === 't3Clipada' || D === 't3TransbordaVisivel';
const COLUNAS = [
  { id: 'usuario', titulo: 'Usuário', tipo: 'identidade', flex: SOBRA_NA_PRIMEIRA ? 3 : undefined, render: (i) => i.usuario },
  { id: 'obra', titulo: 'Obra', tipo: 'texto', flex: SOBRA_NA_PRIMEIRA ? undefined : 3, render: (i) => i.obra },
  { id: 'status', titulo: 'Status', tipo: 'status', render: (i) => i.status },
  { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (i) => i.valor }
];

const DIMENSOES = [
  {
    id: 'situacao',
    rotulo: 'Situação',
    opcoes: D === 'f3SemOpcoes' ? [] : [
      { valor: 'ativo', rotulo: 'Ativos' },
      { valor: 'inativo', rotulo: 'Inativos' }
    ]
  }
];

/* ------------------------------------------------- barra de filtros CRUA --
   Uma tela que fez À MÃO o que a BarraFiltros faz — é o único jeito de
   plantar defeito no markup da ETIQUETA (que a BarraFiltros gera) sem
   editar o componente. Prova o CHECK; não prova a BarraFiltros. */
function FiltrosCrus({ defeito }) {
  const [aberto, setAberto] = useState(false);
  const [marcado, setMarcado] = useState(false);
  const wrapRef = useRef(null);
  // O menu fecha ao clicar fora, como o FiltroRapido real — sem isto o
  // popup ficava aberto por cima da etiqueta e o clique do check no botão
  // de remover expirava em 30s, virando ERRO de tela em vez de F3 FALHOU.
  useFecharAoSair(wrapRef, aberto, useCallback(() => setAberto(false), []));
  return (
    <div className="app-filtros">
      <div className="la-filtros-linha">
        <span className="la-filtros-rotulo">Filtrar:</span>
        <div className="la-rapido-wrap" ref={wrapRef}>
          <button type="button" className="la-filtro-btn" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
            Situação
          </button>
          {aberto && (
            <div className="la-rapido-pop" role="menu">
              <label>
                <input type="checkbox" checked={marcado} onChange={() => setMarcado((v) => !v)} />
                <span>Ativos</span>
              </label>
            </div>
          )}
        </div>
      </div>
      {marcado && (
        <div className="la-etiquetas" aria-label="Filtros ativos">
          <span className="la-filtros-rotulo">Filtrando:</span>
          <span className="la-etiqueta">
            <span className="la-etiqueta-dim">Situação:</span>
            Ativos
            {defeito === 'f3EtiquetaSemRemover' ? null : (
              <button
                type="button"
                aria-label="Remover filtro Situação Ativos"
                onClick={() => { if (defeito !== 'f3EtiquetaFica') setMarcado(false); }}
              >
                ×
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------- faixa fixa CRUA -----
   Cabeçalho montado à mão: sentinela + `.app-page-header`, sem a
   compactação que o PageHeader real faz na rolagem. É a tela que copiou a
   casca e esqueceu o comportamento. */
function FaixaCrua() {
  return (
    <>
      <span aria-hidden="true" />
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Usuários</h1>
            <p className="app-page-lead" title="12 usuários · ativos no sistema">
              <strong>12 usuários</strong> · ativos no sistema
            </p>
          </div>
          <div className="app-actionbar">
            <button type="button" className="btn btn-primary">Novo usuário</button>
          </div>
        </div>
      </header>
    </>
  );
}

function Tela() {
  const [ativos, setAtivos] = useState({});
  const [modalAberto, setModalAberto] = useState(false);
  const [inlineAberto, setInlineAberto] = useState(false);

  const alternar = useCallback((dimensao, valor, opcoes) => {
    // `f3SemEtiqueta`: a tela recebe a marcação e NÃO guarda. A marca fica
    // na caixa, o recorte não acontece e nenhuma etiqueta nasce — defeito de
    // tela, não do componente.
    if (D === 'f3SemEtiqueta') return;
    setAtivos((atual) => alternarValorFiltro(atual, dimensao, valor, opcoes));
  }, []);

  const acaoPrincipal = useMemo(() => {
    if (D === 'r1SemAcao') return null;
    if (D === 'r1RotaPropria') {
      return {
        rotulo: 'Novo usuário',
        onClick: () => window.history.pushState({}, '', '/usuarios/novo')
      };
    }
    if (D === 'r1Inline') {
      return { rotulo: 'Novo usuário', onClick: () => setInlineAberto(true) };
    }
    return { rotulo: 'Novo usuário', onClick: () => setModalAberto(true) };
  }, []);

  const faixa = D === 'c1SemFaixa'
    ? null
    : D === 'c1NaoCompacta'
      ? <FaixaCrua />
      : (
        <PageHeader
          titulo="Usuários"
          contagem="12 usuários"
          descricao="ativos no sistema"
          acaoPrincipal={acaoPrincipal}
        />
      );

  const filtrosCrus = D === 'f3EtiquetaSemRemover' || D === 'f3EtiquetaFica';

  return (
    <div className="layout-shell fluxy-app-shell">
      <div className="layout-shell-backdrop" aria-hidden="true" />
      <main className="layout-main">
        <div className="layout-content-shell">
          <header className="fx-topbar">
            <div className="fx-topbar-nav"><Link className="fx-brand" to="/usuarios">Fluxy</Link></div>
            <div className="fx-topbar-tray">
              <button type="button" className="theme-toggle" aria-label="Tema">◐</button>
            </div>
          </header>
          <Pagina>
            {faixa}
            {filtrosCrus ? (
              <FiltrosCrus defeito={D} />
            ) : (
              <BarraFiltros
                busca={{ valor: '', aoMudar: () => {} }}
                filtros={DIMENSOES}
                ativos={ativos}
                aoAlternar={alternar}
              />
            )}
            <BlocoConteudo titulo="Usuários" variante="primario">
              <TabelaPadrao
                colunas={COLUNAS}
                itens={ITENS}
                storageKey={CHAVE}
                rotuloRolagem="Tabela de usuários"
              />
            </BlocoConteudo>
            {inlineAberto ? (
              <BlocoConteudo titulo="Novo usuário">
                <div className="form-grid">
                  <label className="form-campo"><span>Nome</span><input type="text" /></label>
                  <label className="form-campo"><span>Setor</span><input type="text" /></label>
                </div>
              </BlocoConteudo>
            ) : null}
            {/* Altura suficiente para HAVER rolagem: sem ela a C1 e a X2
                devolvem "página sem rolagem" e não medem nada. */}
            <BlocoConteudo titulo="Histórico">
              <div style={{ height: '2200px' }} />
            </BlocoConteudo>
          </Pagina>
        </div>
      </main>
      {modalAberto ? (
        <OverlayModal rotulo="Novo usuário" onFechar={() => setModalAberto(false)}>
          <div className="app-bloco-corpo">
            <h2 className="app-bloco-titulo">Novo usuário</h2>
            <div className="form-grid">
              <label className="form-campo"><span>Nome</span><input type="text" /></label>
              <label className="form-campo"><span>Setor</span><input type="text" /></label>
            </div>
          </div>
        </OverlayModal>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Tela />
  </BrowserRouter>
);
