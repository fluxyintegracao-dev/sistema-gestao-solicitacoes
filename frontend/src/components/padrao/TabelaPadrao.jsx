import { useEffect, useRef, useState } from 'react';
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
 *             noCard? ('titulo' destaca no card; false omite do card) }]
 * A LARGURA é decisão do componente, não da tela: cada `tipo` já carrega a
 * medida das regras (docs/REGRAS-LAYOUT.md R1/R6/R7) — a tela só declara o
 * que a coluna É. `largura`/`minWidth` seguem aceitos apenas para exceção
 * registrada no manifesto (validarLayout reprova sem registro).
 * urgencia(item): 'danger' | 'warning' | null → tarja lateral.
 */

// Medidas por papel da coluna — pior caso real de cada dado (R1/R6/R7).
// R14 (02/09): título e conteúdo da coluna compartilham o MESMO
// alinhamento, definido pelo tipo — e o usuário pode trocar (esquerda/
// centro/direita) clicando no cabeçalho; a escolha vale para os dois e é
// salva por usuário e por lista, como largura.
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
  status: { largura: 96, alinhar: 'center' },
  badge:  { largura: 120, alinhar: 'center' }
};

function normalizarColuna(coluna) {
  const base = TIPOS_COLUNA[coluna.tipo];
  if (!base) return coluna;
  return {
    ...coluna,
    largura: coluna.largura ?? base.largura,
    // T7: coluna de dinheiro/número não encolhe abaixo do pior caso — nem
    // por arrasto do usuário, nem por distribuição. Valor truncado com
    // reticências é defeito sempre; texto longo trunca, dinheiro não.
    minWidth: coluna.minWidth ?? (base.valor ? base.largura : undefined),
    alinhar: coluna.alinhar ?? base.alinhar,
    flex: coluna.flex ?? (base.flexPadrao || undefined),
    __valor: base.valor || undefined,
    __identidade: base.identidade || undefined
  };
}

function lerAlinhamentos(chave) {
  if (!chave || typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(chave) || '{}');
  } catch {
    return {};
  }
}

/* Menu do cabeçalho: o usuário escolhe o alinhamento da coluna (R14).
   R15 (02/09): capacidade sem sinal não existe — o cabeçalho carrega
   affordance VISÍVEL: cursor, ícone discreto no hover e tooltip nomeando
   as duas capacidades ("Alinhar / redimensionar"). */
function IconeAlinhar() {
  return (
    <svg className="app-th-affordance" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 3h11M1.5 7h7M1.5 11h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TituloComAlinhamento({ coluna, alinhamento, aoAlinhar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useFecharAoSair(ref, aberto, () => setAberto(false));
  return (
    <span
      className={`app-th-alinhavel${aberto ? ' app-th-alinhavel--aberto' : ''}`}
      ref={ref}
      style={{ textAlign: alinhamento }}
    >
      <button
        type="button"
        className="app-th-botao"
        title="Alinhar / redimensionar"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        {coluna.titulo}
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

function classeCelula(coluna) {
  const classes = [
    coluna.__valor && 'celula-valor',
    coluna.__identidade && 'celula-identidade'
  ].filter(Boolean).join(' ');
  return classes || undefined;
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
  larguraAcoes = 240
}) {
  const ehMovel = useEhMovel();
  const shellRef = useRef(null);
  const [larguraDisponivel, setLarguraDisponivel] = useState(null);

  // A tela declara o papel (`tipo`); a medida vem da tabela de tipos.
  const colunasBase = colunas.map(normalizarColuna);

  // R14 — alinhamento escolhido pelo usuário, salvo por lista (como largura).
  const chaveAlinhar = storageKey ? `${storageKey}:alinhar` : null;
  const [alinhamentos, setAlinhamentos] = useState(() => lerAlinhamentos(chaveAlinhar));
  const definirAlinhamento = (colunaId, valor) => {
    setAlinhamentos((atuais) => {
      const proximos = { ...atuais, [colunaId]: valor };
      if (chaveAlinhar) {
        try { window.localStorage.setItem(chaveAlinhar, JSON.stringify(proximos)); } catch { /* sem storage */ }
      }
      return proximos;
    });
  };
  const alinhamentoDe = (coluna) => alinhamentos[coluna.id]
    || coluna.alinhar
    || ALINHAMENTO_POR_TIPO[coluna.tipo]
    || 'left';

  // R1 (docs/REGRAS-LAYOUT.md): ação no máximo 320px; a sobra do card vai
  // SEMPRE para a coluna de conteúdo (flex) — medida uma vez no mount.
  const larguraAcoesEfetiva = Math.min(larguraAcoes, 320);

  useEffect(() => {
    if (!shellRef.current) return undefined;
    const medir = () => {
      const el = shellRef.current;
      if (!el) return;
      // A largura que vale é a do CONTAINER DE ROLAGEM da tabela (a caixa
      // externa do shell tem padding e distribuía sobra a mais, cortando a
      // coluna de ações).
      const rolagem = el.querySelector('.resizable-table-scroll');
      const largura = rolagem ? rolagem.clientWidth : el.clientWidth;
      if (largura > 0) setLarguraDisponivel((atual) => atual ?? Math.floor(largura));
    };
    medir();
    const raf = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(raf);
  }, [carregando, ehMovel, itens.length]);

  // T6: célula que trunca ganha tooltip com o texto COMPLETO — cortar com
  // reticências sem caminho para ler o resto é reprovado pela DoD. Roda
  // depois do layout, sobre o DOM real (mede o corte de fato).
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
    });
  });

  const indiceFlex = (() => {
    const marcada = colunasBase.findIndex((c) => c.flex);
    if (marcada >= 0) return marcada;
    const titulo = colunasBase.findIndex((c) => c.noCard === 'titulo');
    return titulo >= 0 ? titulo : 0;
  })();

  const colunasComFlex = colunasBase.map((coluna, i) => {
    if (i !== indiceFlex || !larguraDisponivel) return coluna;
    const fixas = colunasBase.reduce(
      (soma, c, j) => (j === indiceFlex ? soma : soma + Number(c.largura || 140)),
      acoesLinha ? larguraAcoesEfetiva : 0
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
        {itens.map((item) => {
          const tom = urgencia?.(item);
          return (
            <div
              key={getId(item)}
              className={`app-tabela-card${tom ? ` tarja tarja--${tom}` : ''}`}
              onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
            >
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

  const colunasTabela = acoesLinha
    ? [...colunasComFlex, { id: '__acoes', titulo: 'Ações', largura: larguraAcoesEfetiva, minWidth: 120 }]
    : colunasComFlex;

  return (
    <div className="app-table-shell app-tabela" ref={shellRef}>
      <ResizableTable
        key={`medida:${larguraDisponivel ?? 'auto'}`}
        columns={colunasTabela.map((c) => ({
          id: c.id,
          width: c.largura,
          minWidth: c.minWidth || 90
        }))}
        // ":v2" descarta as larguras que o defeito do persist-no-mount
        // gravou como se fossem escolha do usuário (02/09).
        storageKey={storageKey ? `${storageKey}:v2` : undefined}
        scrollLabel={rotuloRolagem}
      >
        <thead>
          <tr>
            {colunasTabela.map((coluna) => (
              <ResizableTh key={coluna.id} columnKey={coluna.id}>
                {coluna.id === '__acoes' ? (
                  coluna.titulo
                ) : (
                  <TituloComAlinhamento
                    coluna={coluna}
                    alinhamento={alinhamentoDe(coluna)}
                    aoAlinhar={definirAlinhamento}
                  />
                )}
              </ResizableTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const tom = urgencia?.(item);
            const classes = [
              'app-tabela-linha',
              aoClicarLinha && 'app-tabela-linha--clicavel',
              tom && `app-tabela-linha--${tom}`
            ].filter(Boolean).join(' ');
            return (
              <tr
                key={getId(item)}
                className={classes}
                onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
              >
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
              </tr>
            );
          })}
        </tbody>
      </ResizableTable>
    </div>
  );
}
