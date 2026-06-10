import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarCotacoes } from '../../../services/compras';
import { getObras } from '../../../services/obras';

const STATUS_COTACAO = {
  ENVIADO:    { label: 'Enviado',    cls: 'app-status-pill bg-blue-100 text-blue-700' },
  VISUALIZADO:{ label: 'Visualizado',cls: 'app-status-pill bg-yellow-100 text-yellow-700' },
  RESPONDIDO: { label: 'Respondido', cls: 'app-status-pill bg-emerald-100 text-emerald-700' },
  CANCELADO:  { label: 'Cancelado',  cls: 'app-status-pill bg-slate-100 text-slate-600' },
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatusBadge({ status }) {
  const s = STATUS_COTACAO[String(status || '').toUpperCase()] || {
    label: status || '-',
    cls: 'app-status-pill bg-slate-100 text-slate-600',
  };
  return <span className={s.cls}>{s.label}</span>;
}

export default function ListaCotacoes() {
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ q: '', status: '', obra_id: '' });

  async function carregar() {
    try {
      setLoading(true);
      const [dataCotacoes, dataObras] = await Promise.all([
        listarCotacoes({
          q: filtros.q || undefined,
          status: filtros.status || undefined,
          obra_id: filtros.obra_id || undefined,
        }),
        getObras(),
      ]);
      setCotacoes(Array.isArray(dataCotacoes) ? dataCotacoes : []);
      setObras(Array.isArray(dataObras) ? dataObras : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar cotacoes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const respondidas = cotacoes.filter(
    (c) => String(c.status || '').toUpperCase() === 'RESPONDIDO'
  ).length;
  const pendentes = cotacoes.filter(
    (c) => ['ENVIADO', 'VISUALIZADO'].includes(String(c.status || '').toUpperCase())
  ).length;

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Cotacoes</h1>
            <p className="page-subtitle">
              Acompanhe todas as cotacoes enviadas a fornecedores, seus status de resposta e dados registrados.
            </p>
          </div>
          <div className="app-page-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/cotacoes/nova')}
            >
              + Nova cotacao avulsa
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <div className="sol-filtros-head">
          <div>
            <h2 className="font-semibold text-[var(--c-text)]">Filtros</h2>
            <p className="text-sm text-[var(--c-muted)]">Filtre por fornecedor, obra ou status da cotacao.</p>
          </div>
        </div>

        <div className="app-filters-grid">
          <label className="app-filter-field">
            <span className="app-filter-label">Busca</span>
            <input
              className="input"
              placeholder="Fornecedor ou titulo da solicitacao"
              value={filtros.q}
              onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && carregar()}
            />
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select
              className="input"
              value={filtros.status}
              onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="VISUALIZADO">Visualizado</option>
              <option value="RESPONDIDO">Respondido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Obra</span>
            <select
              className="input"
              value={filtros.obra_id}
              onChange={(e) => setFiltros((prev) => ({ ...prev, obra_id: e.target.value }))}
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="app-page-actions justify-end">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFiltros({ q: '', status: '', obra_id: '' })}
          >
            Limpar
          </button>
          <button type="button" className="btn btn-primary" onClick={carregar} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      <div className="mt-4 app-summary-grid">
        <div className="app-summary-card">
          <div className="app-summary-label">Total listado</div>
          <div className="app-summary-value">{cotacoes.length}</div>
        </div>
        <div className="app-summary-card">
          <div className="app-summary-label">Respondidas</div>
          <div className="app-summary-value">{respondidas}</div>
        </div>
        <div className="app-summary-card">
          <div className="app-summary-label">Aguardando resposta</div>
          <div className="app-summary-value">{pendentes}</div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Lista de cotacoes</h2>
          <span className="text-sm text-[var(--c-muted)]">{cotacoes.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="app-empty-card">Carregando...</div>
        ) : cotacoes.length === 0 ? (
          <div className="app-empty-card">
            Nenhuma cotacao encontrada. Crie uma nova cotacao avulsa ou envie uma solicitacao de compra para fornecedores.
          </div>
        ) : (
          <div className="app-table-shell overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>Obra</th>
                  <th>Solicitacao</th>
                  <th>Status</th>
                  <th>Enviado em</th>
                  <th>Respondido em</th>
                  <th>Prazo resposta</th>
                  <th>Val. min. pedido</th>
                  <th>Cond. pagamento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((cotacao) => (
                  <tr key={cotacao.id}>
                    <td className="text-[var(--c-muted)] tabular-nums">
                      {String(cotacao.id).padStart(5, '0')}
                    </td>
                    <td className="font-medium">{cotacao.fornecedor?.nome || '-'}</td>
                    <td>{cotacao.solicitacao?.obra?.nome || '-'}</td>
                    <td className="text-[var(--c-muted)]">
                      {cotacao.solicitacao
                        ? `SC-${String(cotacao.solicitacao.id).padStart(5, '0')}${cotacao.solicitacao.titulo ? ` - ${cotacao.solicitacao.titulo}` : ''}`
                        : '-'}
                    </td>
                    <td>
                      <StatusBadge status={cotacao.status} />
                    </td>
                    <td className="tabular-nums">{formatDate(cotacao.enviado_em)}</td>
                    <td className="tabular-nums">{formatDate(cotacao.respondido_em)}</td>
                    <td className="tabular-nums">{formatDate(cotacao.prazo_resposta)}</td>
                    <td className="tabular-nums">{formatMoney(cotacao.valor_minimo_pedido)}</td>
                    <td>{cotacao.condicao_pagamento || '-'}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        {cotacao.solicitacao?.id && (
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            onClick={() => navigate(`/solicitacoes-compra/${cotacao.solicitacao.id}/cotacao`)}
                          >
                            Editar cotacao
                          </button>
                        )}
                        <a
                          href={`/cotacao/${cotacao.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-xs btn-outline"
                        >
                          Portal fornecedor
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

