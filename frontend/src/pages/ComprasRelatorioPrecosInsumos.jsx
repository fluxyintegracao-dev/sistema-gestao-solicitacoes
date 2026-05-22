import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioPrecosInsumosFornecedores } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const ITEM_COLUMNS = [
  { key: 'item', width: 300, minWidth: 190 },
  { key: 'categoria', width: 220, minWidth: 150 },
  { key: 'fornecedores', width: 120, minWidth: 90 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'quantidade', width: 120, minWidth: 90 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'preco_medio', width: 150, minWidth: 120 },
  { key: 'melhor', width: 220, minWidth: 150 }
];

const COMPARATIVO_COLUMNS = [
  { key: 'item', width: 280, minWidth: 180 },
  { key: 'fornecedor', width: 240, minWidth: 160 },
  { key: 'pedidos', width: 100, minWidth: 80 },
  { key: 'quantidade', width: 120, minWidth: 90 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'preco', width: 140, minWidth: 110 },
  { key: 'menor', width: 140, minWidth: 110 },
  { key: 'diferenca', width: 150, minWidth: 120 },
  { key: 'ultimo', width: 120, minWidth: 100 }
];

const CATEGORIA_COLUMNS = [
  { key: 'categoria', width: 260, minWidth: 170 },
  { key: 'itens', width: 100, minWidth: 80 },
  { key: 'fornecedores', width: 130, minWidth: 100 },
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
    return message || 'Erro ao carregar relatorio de precos por insumo';
  }
}

export default function ComprasRelatorioPrecosInsumos() {
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
        const data = await obterRelatorioPrecosInsumosFornecedores(filtrosAtivos);
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
  const itens = useMemo(() => (Array.isArray(relatorio?.itens) ? relatorio.itens : []), [relatorio]);
  const comparativo = useMemo(() => (
    Array.isArray(relatorio?.comparativo) ? relatorio.comparativo : []
  ), [relatorio]);
  const categorias = useMemo(() => (
    Array.isArray(relatorio?.categorias) ? relatorio.categorias : []
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
            <h1 className="page-title">Precos por Insumo</h1>
            <p className="page-subtitle">
              Preco medio de compra por insumo e fornecedor, calculado pelos itens reais dos pedidos.
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
          <span className="dashboard-metric-label">Itens lancados</span>
          <strong>{formatNumber(resumo.itens_lancados)}</strong>
          <small>Itens reais de pedidos</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Itens distintos</span>
          <strong>{formatNumber(resumo.itens_distintos)}</strong>
          <small>Insumos ou manuais agrupados</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong>{formatNumber(resumo.fornecedores)}</strong>
          <small>Com itens no periodo</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Pedidos usados no calculo</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor analisado</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Soma dos itens</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Mais de um fornecedor</span>
          <strong>{formatNumber(resumo.itens_com_mais_de_um_fornecedor)}</strong>
          <small>Itens comparaveis</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Insumos por preco medio</h2>
        <p className="page-subtitle mb-3">Resumo por item comprado, com menor preco medio observado entre fornecedores.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={ITEM_COLUMNS} storageKey="fluxy.compras.precosInsumos.itens.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="item">Item</ResizableTh>
                <ResizableTh columnKey="categoria">Categoria</ResizableTh>
                <ResizableTh columnKey="fornecedores" className="text-right">Fornecedores</ResizableTh>
                <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                <ResizableTh columnKey="quantidade" className="text-right">Quantidade</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                <ResizableTh columnKey="preco_medio" className="text-right">Preco medio</ResizableTh>
                <ResizableTh columnKey="melhor">Melhor fornecedor medio</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Carregando...</td></tr>
              ) : itens.length === 0 ? (
                <tr><td colSpan={8}>Sem itens de pedido nos filtros.</td></tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <div className="font-semibold text-slate-900">{item.descricao}</div>
                      <div className="text-xs text-slate-500">{item.unidade || '-'} - {item.origem === 'INSUMO' ? 'Insumo cadastrado' : 'Item manual'}</div>
                    </td>
                    <td>{item.categoria_nome || '-'}</td>
                    <td className="text-right">{formatNumber(item.fornecedores)}</td>
                    <td className="text-right">{formatNumber(item.pedidos)}</td>
                    <td className="text-right">{formatNumber(item.quantidade_total, 3)}</td>
                    <td className="text-right font-semibold">{formatMoney(item.valor_total)}</td>
                    <td className="text-right">{formatMoney(item.preco_medio_geral)}</td>
                    <td>
                      <div className="font-semibold text-slate-900">{item.melhor_fornecedor?.nome || '-'}</div>
                      <div className="text-xs text-slate-500">{formatMoney(item.menor_preco_medio)}</div>
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
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Comparativo por fornecedor</h2>
          <p className="page-subtitle mb-3">Cada linha compara o preco medio do fornecedor contra o menor preco medio do mesmo item.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={COMPARATIVO_COLUMNS} storageKey="fluxy.compras.precosInsumos.comparativo.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="item">Item</ResizableTh>
                  <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                  <ResizableTh columnKey="pedidos" className="text-right">Pedidos</ResizableTh>
                  <ResizableTh columnKey="quantidade" className="text-right">Quantidade</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                  <ResizableTh columnKey="preco" className="text-right">Preco medio</ResizableTh>
                  <ResizableTh columnKey="menor" className="text-right">Menor medio</ResizableTh>
                  <ResizableTh columnKey="diferenca" className="text-right">Diferenca</ResizableTh>
                  <ResizableTh columnKey="ultimo">Ultimo pedido</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}>Carregando...</td></tr>
                ) : comparativo.length === 0 ? (
                  <tr><td colSpan={9}>Sem comparativo nos filtros.</td></tr>
                ) : (
                  comparativo.map((item, index) => (
                    <tr key={`${item.item_key}-${item.fornecedor_id || 'sem'}-${index}`}>
                      <td>
                        <div className="font-semibold text-slate-900">{item.descricao}</div>
                        <div className="text-xs text-slate-500">{item.unidade || '-'}</div>
                      </td>
                      <td className="font-semibold text-slate-900">{item.fornecedor_nome}</td>
                      <td className="text-right">{formatNumber(item.pedidos)}</td>
                      <td className="text-right">{formatNumber(item.quantidade_total, 3)}</td>
                      <td className="text-right">{formatMoney(item.valor_total)}</td>
                      <td className="text-right font-semibold">{formatMoney(item.preco_medio)}</td>
                      <td className="text-right">{formatMoney(item.menor_preco_medio_item)}</td>
                      <td className="text-right">
                        <div className={Number(item.diferenca_menor_preco_medio || 0) > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {formatMoney(item.diferenca_menor_preco_medio)}
                        </div>
                        <div className="text-xs text-slate-500">{formatPercent(item.diferenca_percentual)}</div>
                      </td>
                      <td>{formatDate(item.ultimo_pedido_em)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Categorias</h2>
          <p className="page-subtitle mb-3">Valor analisado por categoria dos insumos.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={CATEGORIA_COLUMNS} storageKey="fluxy.compras.precosInsumos.categorias.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="categoria">Categoria</ResizableTh>
                  <ResizableTh columnKey="itens" className="text-right">Itens</ResizableTh>
                  <ResizableTh columnKey="fornecedores" className="text-right">Fornecedores</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}>Carregando...</td></tr>
                ) : categorias.length === 0 ? (
                  <tr><td colSpan={4}>Sem categorias nos filtros.</td></tr>
                ) : (
                  categorias.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.categoria_nome}</td>
                      <td className="text-right">{formatNumber(item.itens)}</td>
                      <td className="text-right">{formatNumber(item.fornecedores)}</td>
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
