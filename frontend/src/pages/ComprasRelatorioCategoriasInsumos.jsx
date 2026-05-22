import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioCategoriasInsumosCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const CATEGORIA_COLUMNS = [
  { key: 'categoria', width: 260, minWidth: 170 },
  { key: 'itens', width: 100, minWidth: 80 },
  { key: 'pedidos', width: 110, minWidth: 90 },
  { key: 'quantidade', width: 130, minWidth: 105 },
  { key: 'valor', width: 150, minWidth: 120 }
];

const INSUMO_COLUMNS = [
  { key: 'descricao', width: 280, minWidth: 190 },
  { key: 'categoria', width: 210, minWidth: 150 },
  { key: 'unidade', width: 100, minWidth: 80 },
  { key: 'itens', width: 90, minWidth: 76 },
  { key: 'pedidos', width: 100, minWidth: 84 },
  { key: 'quantidade', width: 130, minWidth: 105 },
  { key: 'valor', width: 150, minWidth: 120 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 260, minWidth: 170 },
  { key: 'itens', width: 100, minWidth: 80 },
  { key: 'pedidos', width: 110, minWidth: 90 },
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

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar compras por categoria e insumo';
  }
}

export default function ComprasRelatorioCategoriasInsumos() {
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
        const data = await obterRelatorioCategoriasInsumosCompras(filtrosAtivos);
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
  const categorias = useMemo(() => (Array.isArray(relatorio?.categorias) ? relatorio.categorias : []), [relatorio]);
  const insumos = useMemo(() => (Array.isArray(relatorio?.insumos) ? relatorio.insumos : []), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);
  const topCategorias = useMemo(() => categorias.slice(0, 10), [categorias]);
  const maiorValorCategoria = useMemo(
    () => Math.max(...topCategorias.map((item) => Number(item.valor_total || 0)), 0),
    [topCategorias]
  );

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
            <h1 className="page-title">Categorias e Insumos</h1>
            <p className="page-subtitle">
              Valor pedido por categoria, insumo e obra/centro com base nos itens reais dos pedidos de compra.
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
          <span>Itens</span>
          <strong>{formatNumber(resumo.itens)}</strong>
          <small>Itens de pedidos</small>
        </div>
        <div className="metric-card">
          <span>Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Pedidos com itens</small>
        </div>
        <div className="metric-card">
          <span>Categorias</span>
          <strong>{formatNumber(resumo.categorias)}</strong>
          <small>Com movimentacao</small>
        </div>
        <div className="metric-card">
          <span>Valor total</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Valor dos itens</small>
        </div>
        <div className="metric-card">
          <span>Ticket medio item</span>
          <strong>{formatMoney(resumo.ticket_medio_item)}</strong>
          <small>Valor medio por item</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="app-page-header-row">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Compras por categoria</h2>
            <p className="page-subtitle">
              Top 10 categorias por valor efetivamente pedido no periodo filtrado.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-[var(--c-muted)] py-4">Carregando categorias...</div>
        ) : topCategorias.length === 0 ? (
          <div className="app-empty-card mt-3">Sem itens de pedido para montar o grafico.</div>
        ) : (
          <div className="grid gap-3 mt-3">
            {topCategorias.map((item, index) => {
              const valor = Number(item.valor_total || 0);
              const percentual = maiorValorCategoria > 0 ? Math.max(4, (valor / maiorValorCategoria) * 100) : 0;
              return (
                <div key={`categoria-grafico-${item.key}`} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--c-muted)]">#{index + 1}</span>
                      <strong className="ml-2 text-sm text-[var(--c-text)]">{item.categoria_nome}</strong>
                      <span className="ml-2 text-xs text-[var(--c-muted)]">
                        {formatNumber(item.itens)} item(ns)
                      </span>
                    </div>
                    <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatMoney(valor)}</strong>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--c-primary)]"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Por categoria</h2>
          <p className="page-subtitle mb-3">Categorias do cadastro de insumos e itens manuais sem categoria.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={CATEGORIA_COLUMNS} storageKey="fluxy.compras.categoriasInsumos.categorias.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="categoria">Categoria</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="quantidade" className="text-right">Quantidade</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}>Carregando...</td></tr>
                ) : categorias.length === 0 ? (
                  <tr><td colSpan={5}>Sem itens de pedido no periodo.</td></tr>
                ) : (
                  categorias.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.categoria_nome}</td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right">{formatNumber(item.pedidos)}</td>
                      <td className="text-right">{formatNumber(item.quantidade_total, 3)}</td>
                      <td className="text-right">{formatMoney(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Por obra/centro</h2>
          <p className="page-subtitle mb-3">Concentracao de valor pedido por origem operacional.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.categoriasInsumos.obras.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}>Carregando...</td></tr>
                ) : obrasResumo.length === 0 ? (
                  <tr><td colSpan={4}>Sem itens de pedido no periodo.</td></tr>
                ) : (
                  obrasResumo.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.obra_nome}</td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right">{formatNumber(item.pedidos)}</td>
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
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Por insumo/item</h2>
        <p className="page-subtitle mb-3">Top 100 itens por valor total pedido.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={INSUMO_COLUMNS} storageKey="fluxy.compras.categoriasInsumos.insumos.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="descricao">Insumo/Item</ResizableTh>
                <ResizableTh columnKey="categoria">Categoria</ResizableTh>
                <ResizableTh columnKey="unidade">Unidade</ResizableTh>
                <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                <ResizableTh columnKey="quantidade" className="text-right">Quantidade</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Carregando...</td></tr>
              ) : insumos.length === 0 ? (
                <tr><td colSpan={7}>Sem itens de pedido no periodo.</td></tr>
              ) : (
                insumos.map((item) => (
                  <tr key={item.key}>
                    <td className="font-semibold text-slate-900">{item.descricao}</td>
                    <td>{item.categoria_nome}</td>
                    <td>{item.unidade || '-'}</td>
                    <td className="text-right">{formatNumber(item.itens)}</td>
                    <td className="text-right">{formatNumber(item.pedidos)}</td>
                    <td className="text-right">{formatNumber(item.quantidade_total, 3)}</td>
                    <td className="text-right">{formatMoney(item.valor_total)}</td>
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
