import { useEffect, useState } from 'react';
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
 * colunas: [{ id, titulo, render(item), largura?, minWidth?, alinhar?,
 *             noCard? ('titulo' destaca no card; false omite do card) }]
 * urgencia(item): 'danger' | 'warning' | null → tarja lateral.
 */
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
    const colunaTitulo = colunas.find((c) => c.noCard === 'titulo') || colunas[0];
    const demais = colunas.filter((c) => c !== colunaTitulo && c.noCard !== false);
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
    ? [...colunas, { id: '__acoes', titulo: 'Ações', largura: larguraAcoes, minWidth: 120 }]
    : colunas;

  return (
    <div className="app-table-shell app-tabela">
      <ResizableTable
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
                {colunas.map((coluna) => (
                  <td key={coluna.id} style={coluna.alinhar ? { textAlign: coluna.alinhar } : undefined}>
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
