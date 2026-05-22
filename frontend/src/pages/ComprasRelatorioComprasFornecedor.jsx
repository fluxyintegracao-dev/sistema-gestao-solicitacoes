import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioComprasPorFornecedor } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const FORNECEDOR_COLUMNS = [
  { key: 'fornecedor', width: 280, minWidth: 180 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'itens', width: 90, minWidth: 70 },
  { key: 'obras', width: 180, minWidth: 130 },
  { key: 'valor', width: 160, minWidth: 120 },
  { key: 'ticket', width: 150, minWidth: 120 },
  { key: 'minimo', width: 130, minWidth: 100 },
  { key: 'ultimo', width: 120, minWidth: 100 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 260, minWidth: 180 },
  { key: 'fornecedores', width: 130, minWidth: 100 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'itens', width: 90, minWidth: 70 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'ticket', width: 140, minWidth: 110 }
];

const PEDIDO_COLUMNS = [
  { key: 'pedido', width: 110, minWidth: 90 },
  { key: 'fornecedor', width: 240, minWidth: 160 },
  { key: 'status', width: 140, minWidth: 110 },
  { key: 'obra', width: 220, minWidth: 150 },
  { key: 'solicitacao', width: 190, minWidth: 140 },
  { key: 'itens', width: 80, minWidth: 70 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'criado', width: 120, minWidth: 100 }
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

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('pt-BR');
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de compras por fornecedor';
  }
}

export default function ComprasRelatorioComprasFornecedor() {
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
        const data = await obterRelatorioComprasPorFornecedor(filtrosAtivos);
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
  const fornecedores = useMemo(() => (
    Array.isArray(relatorio?.fornecedores) ? relatorio.fornecedores : []
  ), [relatorio]);
  const obrasResumo = useMemo(() => (
    Array.isArray(relatorio?.obras) ? relatorio.obras : []
  ), [relatorio]);
  const pedidos = useMemo(() => (
    Array.isArray(relatorio?.pedidos) ? relatorio.pedidos : []
  ), [relatorio]);

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
            <h1 className="page-title">Compras por Fornecedor</h1>
            <p className="page-subtitle">
              Valor efetivamente pedido por fornecedor com base nos pedidos de compra emitidos.
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
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong>{formatNumber(resumo.fornecedores)}</strong>
          <small>Com pedido no periodo</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor pedido</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Baseado em pedidos reais</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio_pedido)}</strong>
          <small>Valor por pedido</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Concentracao top 5</span>
          <strong>{formatPercent(resumo.concentracao_top5)}</strong>
          <small>Valor nos maiores fornecedores</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Minimo nao atingido</span>
          <strong>{formatNumber(resumo.pedidos_minimo_nao_atingido)}</strong>
          <small>Pedidos abaixo do minimo cadastrado</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Fornecedores por valor pedido</h2>
        <p className="page-subtitle mb-3">Ranking de fornecedores usando somente pedidos de compra emitidos.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={FORNECEDOR_COLUMNS} storageKey="fluxy.compras.comprasFornecedor.fornecedores.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                <ResizableTh columnKey="obras">Obras/centros</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor pedido</ResizableTh>
                <ResizableTh columnKey="ticket" className="text-right">Ticket medio</ResizableTh>
                <ResizableTh columnKey="minimo" className="text-right">Minimo nao atingido</ResizableTh>
                <ResizableTh columnKey="ultimo">Ultimo pedido</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Carregando...</td></tr>
              ) : fornecedores.length === 0 ? (
                <tr><td colSpan={8}>Sem pedidos emitidos nos filtros.</td></tr>
              ) : (
                fornecedores.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <div className="font-semibold text-slate-900">{item.fornecedor_nome}</div>
                      <div className="text-xs text-slate-500">{item.cnpj || 'Sem CNPJ'} {item.estado ? `- ${item.estado}` : ''}</div>
                    </td>
                    <td className="text-right">{formatNumber(item.pedidos)}</td>
                    <td className="text-right">{formatNumber(item.itens)}</td>
                    <td>
                      <div className="font-semibold text-slate-900">{formatNumber(item.obras)}</div>
                      <div className="text-xs text-slate-500">{(item.obras_nomes || []).join(', ') || '-'}</div>
                    </td>
                    <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                    <td className="text-right">{formatMoney(item.ticket_medio)}</td>
                    <td className="text-right">{formatNumber(item.pedidos_minimo_nao_atingido)}</td>
                    <td>{formatDate(item.ultimo_pedido_em)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Compras por obra/centro</h2>
          <p className="page-subtitle mb-3">Onde o valor comprado por fornecedor esta concentrado.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.comprasFornecedor.obras.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="fornecedores" className="text-right">Fornecedores</ResizableTh>
                  <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                  <ResizableTh columnKey="ticket" className="text-right">Ticket</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Carregando...</td></tr>
                ) : obrasResumo.length === 0 ? (
                  <tr><td colSpan={6}>Sem pedidos por obra/centro nos filtros.</td></tr>
                ) : (
                  obrasResumo.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.obra_nome}</td>
                      <td className="text-right">{formatNumber(item.fornecedores)}</td>
                      <td className="text-right">{formatNumber(item.pedidos)}</td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                      <td className="text-right">{formatMoney(item.ticket_medio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos recentes</h2>
          <p className="page-subtitle mb-3">Ultimos 100 pedidos usados no relatorio.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={PEDIDO_COLUMNS} storageKey="fluxy.compras.comprasFornecedor.pedidos.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="pedido">Pedido</ResizableTh>
                  <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="solicitacao">Solicitacao</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                  <ResizableTh columnKey="criado">Criado em</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}>Carregando...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr><td colSpan={8}>Sem pedidos nos filtros.</td></tr>
                ) : (
                  pedidos.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="font-semibold text-blue-700 hover:underline" to={`/pedidos-compra/${item.id}`}>
                          PC #{item.id}
                        </Link>
                      </td>
                      <td className="font-semibold text-slate-900">{item.fornecedor?.nome || 'Sem fornecedor'}</td>
                      <td>{item.status_label}</td>
                      <td>{item.obra?.nome || '-'}</td>
                      <td>
                        {item.solicitacao?.id ? (
                          <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.solicitacao.id}`}>
                            SC #{item.solicitacao.id}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                      <td>{formatDate(item.criado_em)}</td>
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
