import { useEffect, useRef, useState } from 'react';
import { ResizableTable, ResizableTh } from '../ResizableTable';
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
const TIPOS_COLUNA = {
  texto:  { largura: 180, flexPadrao: true },        // conteúdo: recebe a sobra
  codigo: { largura: 130 },                          // OB-2024-0117
  // R$ 9.999.999.999,99 no corpo de 14px tabular ≈ 184px com o respiro (R6/R7).
  valor:  { largura: 190, alinhar: 'right', valor: true },
  numero: { largura: 120, alinhar: 'right', valor: true },
  data:   { largura: 110 },                          // 22/08/2026
  status: { largura: 96 },
  badge:  { largura: 120 }
};

function normalizarColuna(coluna) {
  const base = TIPOS_COLUNA[coluna.tipo];
  if (!base) return coluna;
  return {
    ...coluna,
    largura: coluna.largura ?? base.largura,
    alinhar: coluna.alinhar ?? base.alinhar,
    flex: coluna.flex ?? (base.flexPadrao || undefined),
    __valor: base.valor || undefined
  };
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

  // R1 (docs/REGRAS-LAYOUT.md): ação no máximo 320px; a sobra do card vai
  // SEMPRE para a coluna de conteúdo (flex) — medida uma vez no mount.
  const larguraAcoesEfetiva = Math.min(larguraAcoes, 320);

  useEffect(() => {
    if (!shellRef.current) return undefined;
    const medir = () => {
      const largura = shellRef.current?.getBoundingClientRect().width;
      if (largura) setLarguraDisponivel((atual) => atual ?? Math.floor(largura));
    };
    medir();
    const raf = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(raf);
  }, [carregando, ehMovel, itens.length]);

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
    return { ...coluna, largura: Math.max(piso, larguraDisponivel - fixas - 4) };
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
              <div className="app-celula-dupla-principal">{colunaTitulo.render(item)}</div>
              <dl style={{ margin: 0, display: 'contents' }}>
                {demais.map((coluna) => (
                  <div className="app-tabela-card-par" key={coluna.id}>
                    <dt>{coluna.titulo}</dt>
                    <dd>{coluna.render(item)}</dd>
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
        storageKey={storageKey}
        scrollLabel={rotuloRolagem}
      >
        <thead>
          <tr>
            {colunasTabela.map((coluna) => (
              <ResizableTh key={coluna.id} columnKey={coluna.id}>
                {coluna.titulo}
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
                    className={coluna.__valor ? 'celula-valor' : undefined}
                    style={coluna.alinhar ? { textAlign: coluna.alinhar } : undefined}
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
