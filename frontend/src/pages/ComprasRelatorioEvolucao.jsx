import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioEvolucaoCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const MES_COLUMNS = [
  { key: 'mes', width: 120, minWidth: 90 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'fornecedores', width: 130, minWidth: 100 },
  { key: 'obras', width: 110, minWidth: 90 },
  { key: 'itens', width: 90, minWidth: 70 },
  { key: 'valor', width: 160, minWidth: 120 },
  { key: 'ticket', width: 150, minWidth: 120 },
  { key: 'status', width: 240, minWidth: 160 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 260, minWidth: 170 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'fornecedores', width: 130, minWidth: 100 },
  { key: 'itens', width: 90, minWidth: 70 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'ticket', width: 140, minWidth: 110 },
  { key: 'meses', width: 220, minWidth: 150 }
];

const STATUS_COLUMNS = [
  { key: 'status', width: 220, minWidth: 140 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 150, minWidth: 120 }
];

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  return params;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de evolucao mensal de compras';
  }
}

function MiniBar({ value, max }) {
  const percent = max > 0 ? Math.max(4, Math.round((Number(value || 0) / max) * 100)) : 0;
  return (
    <div className="mt-1 h-2 rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-blue-600"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function ComprasRelatorioEvolucao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    getMinhasObras()
      .then((data) => {
        if (ativo) {
          setObras(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => console.error(error));

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const filtrosAtivos = readFilters(searchParams);
    setFiltros(filtrosAtivos);

    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        setErro('');
        const data = await obterRelatorioEvolucaoCompras(filtrosAtivos);
        if (ativo) {
          setRelatorio(data);
        }
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRelatorio(null);
          setErro(extractErrorMessage(error));
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [searchParams]);

  const resumo = relatorio?.resumo || {};
  const meses = useMemo(() => (Array.isArray(relatorio?.meses) ? relatorio.meses : []), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);
  const statusResumo = useMemo(() => (Array.isArray(relatorio?.status) ? relatorio.status : []), [relatorio]);
  const maxMesValor = useMemo(() => (
    meses.reduce((max, item) => Math.max(max, Number(item.valor_total || 0)), 0)
  ), [meses]);

  function aplicarFiltros(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <p className="eyebrow">Compras / Relatorios</p>
            <h1 className="page-title">Evolucao Mensal de Compras</h1>
            <p className="page-subtitle">
              Curva mensal de pedidos de compra emitidos, valor total, ticket medio e concentracao por obra/centro.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/compras/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Obra / Centro de custo</span>
              <select
                className="input"
                value={filtros.obra_id}
                onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
              >
                <option value="">Todos</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Pedido criado de</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Pedido criado ate</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-filter-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Atualizar relatorio
            </button>
            <button type="button" className="btn btn-outline" onClick={limparFiltros} disabled={loading}>
              Limpar
            </button>
          </div>
        </form>
      </div>

      {erro ? (
        <div className="mt-4 alert alert-error">{erro}</div>
      ) : null}

      <div className="dashboard-metric-grid mt-4">
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Pedidos emitidos</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Meses</span>
          <strong>{formatNumber(resumo.meses)}</strong>
          <small>Com movimentacao</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor total</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Soma dos pedidos</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio)}</strong>
          <small>Valor por pedido</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Maior mes</span>
          <strong>{resumo.maior_mes?.label || '-'}</strong>
          <small>{resumo.maior_mes ? formatMoney(resumo.maior_mes.valor_total) : 'Sem dados'}</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong>{formatNumber(resumo.fornecedores)}</strong>
          <small>Com pedido no periodo</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Curva mensal</h2>
        <p className="page-subtitle mb-3">Pedidos agrupados pelo mes real de criacao do pedido de compra.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={MES_COLUMNS} storageKey="fluxy.compras.evolucao.meses.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="mes">Mes</ResizableTh>
                <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                <ResizableTh columnKey="fornecedores" className="text-right">Fornecedores</ResizableTh>
                <ResizableTh columnKey="obras" className="text-right">Obras</ResizableTh>
                <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                <ResizableTh columnKey="ticket" className="text-right">Ticket</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Carregando...</td></tr>
              ) : meses.length === 0 ? (
                <tr><td colSpan={8}>Sem pedidos nos filtros.</td></tr>
              ) : (
                meses.map((item) => (
                  <tr key={item.key}>
                    <td className="font-semibold text-slate-900">{item.label}</td>
                    <td className="text-right">{formatNumber(item.pedidos)}</td>
                    <td className="text-right">{formatNumber(item.fornecedores)}</td>
                    <td className="text-right">{formatNumber(item.obras)}</td>
                    <td className="text-right">{formatNumber(item.itens)}</td>
                    <td className="text-right font-semibold">
                      {formatMoney(item.valor_total)}
                      <MiniBar value={item.valor_total} max={maxMesValor} />
                    </td>
                    <td className="text-right">{formatMoney(item.ticket_medio)}</td>
                    <td>
                      {(item.status || []).slice(0, 3).map((status) => (
                        <span key={status.key} className="badge badge-soft mr-1">
                          {status.label}: {status.total}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] mt-4">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Compras por obra/centro</h2>
          <p className="page-subtitle mb-3">Ranking de valor comprado por obra ou centro de custo no periodo.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.evolucao.obras.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="fornecedores" className="text-right">Fornecedores</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                  <ResizableTh columnKey="ticket" className="text-right">Ticket</ResizableTh>
                  <ResizableTh columnKey="meses">Meses</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Carregando...</td></tr>
                ) : obrasResumo.length === 0 ? (
                  <tr><td colSpan={7}>Sem dados por obra/centro.</td></tr>
                ) : (
                  obrasResumo.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.obra_nome}</td>
                      <td className="text-right">{formatNumber(item.pedidos)}</td>
                      <td className="text-right">{formatNumber(item.fornecedores)}</td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                      <td className="text-right">{formatMoney(item.ticket_medio)}</td>
                      <td className="text-xs text-slate-600">
                        {(item.meses || []).slice(-3).map((mes) => `${mes.label}: ${formatMoney(mes.valor_total)}`).join(' | ') || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos por status</h2>
          <p className="page-subtitle mb-3">Distribuicao dos pedidos usados na evolucao.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={STATUS_COLUMNS} storageKey="fluxy.compras.evolucao.status.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Total</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3}>Carregando...</td></tr>
                ) : statusResumo.length === 0 ? (
                  <tr><td colSpan={3}>Sem status nos filtros.</td></tr>
                ) : (
                  statusResumo.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.label}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>
    </div>
  );
}
