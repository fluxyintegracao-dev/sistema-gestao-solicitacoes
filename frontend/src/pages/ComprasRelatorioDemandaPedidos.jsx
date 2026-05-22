import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioDemandaPedidosCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const STATUS_COLUMNS = [
  { key: 'status', width: 220, minWidth: 140 },
  { key: 'total', width: 110, minWidth: 90 },
  { key: 'valor', width: 150, minWidth: 120 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 260, minWidth: 180 },
  { key: 'total', width: 110, minWidth: 90 },
  { key: 'valor', width: 150, minWidth: 120 }
];

const SOLICITACAO_COLUMNS = [
  { key: 'codigo', width: 110, minWidth: 90 },
  { key: 'titulo', width: 260, minWidth: 180 },
  { key: 'status', width: 140, minWidth: 110 },
  { key: 'obra', width: 220, minWidth: 150 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'criado', width: 120, minWidth: 100 }
];

const PEDIDO_COLUMNS = [
  { key: 'codigo', width: 110, minWidth: 90 },
  { key: 'status', width: 140, minWidth: 110 },
  { key: 'solicitacao', width: 210, minWidth: 150 },
  { key: 'obra', width: 220, minWidth: 150 },
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
    return message || 'Erro ao carregar relatorio de demanda e pedidos';
  }
}

function StatusTable({ title, subtitle, rows, storageKey, loading }) {
  return (
    <div className="card sol-surface-card overflow-hidden">
      <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">{title}</h2>
      <p className="page-subtitle mb-3">{subtitle}</p>
      <div className="sol-table-wrapper">
        <ResizableTable className="sol-table" columns={STATUS_COLUMNS} storageKey={storageKey}>
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
            ) : rows.length === 0 ? (
              <tr><td colSpan={3}>Sem registros no periodo.</td></tr>
            ) : (
              rows.map((item) => (
                <tr key={item.key}>
                  <td className="font-semibold text-slate-900">{item.label}</td>
                  <td className="text-right">{formatNumber(item.total)}</td>
                  <td className="text-right">{formatMoney(item.valor_total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </ResizableTable>
      </div>
    </div>
  );
}

export default function ComprasRelatorioDemandaPedidos() {
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
        const data = await obterRelatorioDemandaPedidosCompras(filtrosAtivos);
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
  const solicitacoesPorStatus = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_status) ? relatorio.solicitacoes_por_status : []
  ), [relatorio]);
  const pedidosPorStatus = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_status) ? relatorio.pedidos_por_status : []
  ), [relatorio]);
  const solicitacoesPorObra = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_obra) ? relatorio.solicitacoes_por_obra : []
  ), [relatorio]);
  const pedidosPorObra = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_obra) ? relatorio.pedidos_por_obra : []
  ), [relatorio]);
  const solicitacoes = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes) ? relatorio.solicitacoes : []
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
            <h1 className="page-title">Demanda e Pedidos</h1>
            <p className="page-subtitle">
              Visao sintetica e analitica das solicitacoes de compra e dos pedidos gerados.
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
              <span className="app-filter-label">Criacao inicial</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Criacao final</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={limparFiltros}>
              Limpar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar relatorio'}
            </button>
          </div>
        </form>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <span>Solicitacoes</span>
          <strong>{formatNumber(resumo.solicitacoes)}</strong>
          <small>Criadas no periodo</small>
        </div>
        <div className="metric-card">
          <span>Liberadas</span>
          <strong>{formatNumber(resumo.solicitacoes_liberadas)}</strong>
          <small>Com liberacao para compra</small>
        </div>
        <div className="metric-card">
          <span>Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Gerados no periodo</small>
        </div>
        <div className="metric-card">
          <span>Valor pedidos</span>
          <strong>{formatMoney(resumo.valor_pedidos)}</strong>
          <small>Somente pedidos reais</small>
        </div>
        <div className="metric-card">
          <span>Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio_pedido)}</strong>
          <small>Valor medio por pedido</small>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <StatusTable
          title="Solicitacoes por status"
          subtitle="Volume de demandas de compra pela situacao atual."
          rows={solicitacoesPorStatus}
          storageKey="fluxy.compras.demanda.statusSolicitacoes.columns"
          loading={loading}
        />
        <StatusTable
          title="Pedidos por status"
          subtitle="Pedidos emitidos agrupados pela situacao atual."
          rows={pedidosPorStatus}
          storageKey="fluxy.compras.demanda.statusPedidos.columns"
          loading={loading}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Solicitacoes por obra/centro</h2>
          <p className="page-subtitle mb-3">Origem das demandas no periodo filtrado.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.demanda.obrasSolicitacoes.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Total</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor pedidos</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3}>Carregando...</td></tr>
                ) : solicitacoesPorObra.length === 0 ? (
                  <tr><td colSpan={3}>Sem solicitacoes no periodo.</td></tr>
                ) : (
                  solicitacoesPorObra.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.label}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatMoney(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos por obra/centro</h2>
          <p className="page-subtitle mb-3">Valor efetivamente pedido por origem operacional.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.demanda.obrasPedidos.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3}>Carregando...</td></tr>
                ) : pedidosPorObra.length === 0 ? (
                  <tr><td colSpan={3}>Sem pedidos no periodo.</td></tr>
                ) : (
                  pedidosPorObra.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.label}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatMoney(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Analitico de solicitacoes</h2>
        <p className="page-subtitle mb-3">Ultimas 100 solicitacoes conforme os filtros aplicados.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={SOLICITACAO_COLUMNS} storageKey="fluxy.compras.demanda.solicitacoes.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="codigo">Codigo</ResizableTh>
                <ResizableTh columnKey="titulo">Titulo</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor pedidos</ResizableTh>
                <ResizableTh columnKey="criado">Criada em</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Carregando...</td></tr>
              ) : solicitacoes.length === 0 ? (
                <tr><td colSpan={7}>Sem solicitacoes no periodo.</td></tr>
              ) : (
                solicitacoes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                        SC #{item.id}
                      </Link>
                    </td>
                    <td className="font-semibold text-slate-900">{item.titulo || '-'}</td>
                    <td>{item.status_label}</td>
                    <td>{item.obra?.nome || '-'}</td>
                    <td className="text-right">{formatNumber(item.pedidos)}</td>
                    <td className="text-right">{formatMoney(item.valor_pedidos)}</td>
                    <td>{formatDate(item.criado_em)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Analitico de pedidos</h2>
        <p className="page-subtitle mb-3">Ultimos 100 pedidos conforme os filtros aplicados.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={PEDIDO_COLUMNS} storageKey="fluxy.compras.demanda.pedidos.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="codigo">Pedido</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="solicitacao">Solicitacao</ResizableTh>
                <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                <ResizableTh columnKey="criado">Criado em</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Carregando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={6}>Sem pedidos no periodo.</td></tr>
              ) : (
                pedidos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/pedidos-compra/${item.id}`}>
                        PC #{item.id}
                      </Link>
                    </td>
                    <td>{item.status_label}</td>
                    <td>{item.solicitacao ? `SC #${item.solicitacao.id}` : '-'}</td>
                    <td>{item.obra?.nome || '-'}</td>
                    <td className="text-right">{formatMoney(item.valor_total)}</td>
                    <td>{formatDate(item.criado_em)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>
    </div>
  );
}
