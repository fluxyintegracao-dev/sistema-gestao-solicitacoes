import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioEconomiaCotacoes } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const TABLE_COLUMNS = [
  { key: 'cotacao', width: 150, minWidth: 118 },
  { key: 'item', width: 210, minWidth: 150 },
  { key: 'quantidade', width: 90, minWidth: 72 },
  { key: 'menor_preco', width: 158, minWidth: 124 },
  { key: 'vencedor', width: 158, minWidth: 124 },
  { key: 'economia', width: 122, minWidth: 104 },
  { key: 'sobrepreco', width: 124, minWidth: 104 },
  { key: 'sinal', width: 132, minWidth: 112 }
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
    return message || 'Erro ao carregar relatorio de economia em cotacoes';
  }
}

function metricColor(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return 'var(--c-success)';
  if (numeric < 0) return 'var(--c-danger)';
  return 'var(--c-text)';
}

export default function ComprasRelatorioEconomiaCotacoes() {
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
        const data = await obterRelatorioEconomiaCotacoes(filtrosAtivos);
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
  const itens = useMemo(
    () => (Array.isArray(relatorio?.itens) ? relatorio.itens : []),
    [relatorio]
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
            <h1 className="page-title">Economia em Cotacoes</h1>
            <p className="page-subtitle">
              Comparacao entre menor preco disponivel e fornecedor vencedor em cotacoes encerradas.
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
              <span className="app-filter-label">Encerramento inicial</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Encerramento final</span>
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

      {erro ? (
        <div className="mt-4 alert alert-danger">{erro}</div>
      ) : null}

      <div className="mt-4 metric-grid">
        <div className="dashboard-metric-card dashboard-metric-card--blue">
          <span className="dashboard-metric-label">Cotacoes encerradas</span>
          <strong className="dashboard-metric-value">{Number(resumo.cotacoes_encerradas || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">No periodo filtrado</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">No menor preco</span>
          <strong className="dashboard-metric-value">{formatPercent(resumo.percentual_menor_preco)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.itens_menor_preco || 0).toLocaleString('pt-BR')} item(ns)</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Economia total</span>
          <strong className="dashboard-metric-value" style={{ color: metricColor(resumo.economia_total) }}>
            {formatMoney(resumo.economia_total)}
          </strong>
          <small className="dashboard-metric-detail">Economia efetiva, sem sobrepreco</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--red">
          <span className="dashboard-metric-label">Sobrepreco</span>
          <strong className="dashboard-metric-value">{formatMoney(resumo.sobrepreco_total)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.itens_acima_menor_preco || 0).toLocaleString('pt-BR')} item(ns) acima</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="sol-table-wrapper">
          <ResizableTable
            className="sol-table"
            columns={TABLE_COLUMNS}
            storageKey="fluxy.compras.relatorioEconomiaCotacoes.columnWidths"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="cotacao">Cotacao</ResizableTh>
                <ResizableTh columnKey="item">Item</ResizableTh>
                <ResizableTh columnKey="quantidade" className="text-right">Qtd.</ResizableTh>
                <ResizableTh columnKey="menor_preco" className="text-right">Menor preco</ResizableTh>
                <ResizableTh columnKey="vencedor" className="text-right">Vencedor</ResizableTh>
                <ResizableTh columnKey="economia" className="text-right">Economia</ResizableTh>
                <ResizableTh columnKey="sobrepreco" className="text-right">Sobrepreco</ResizableTh>
                <ResizableTh columnKey="sinal">Sinal</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-[var(--c-muted)] py-6">
                    Carregando economia das cotacoes...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-[var(--c-muted)] py-6">
                    Nenhum item com vencedor encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itens.map((linha) => (
                  <tr key={`${linha.solicitacao.id}-${linha.item.item_tipo}-${linha.item.item_referencia_id}`}>
                    <td>
                      <strong>SC #{linha.solicitacao.id}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        Encerrada em {formatDate(linha.solicitacao.encerrado_em)}
                      </div>
                    </td>
                    <td>
                      <strong>{linha.item.descricao}</strong>
                      <div className="text-xs text-[var(--c-muted)]">{linha.item.unidade}</div>
                    </td>
                    <td className="text-right">{Number(linha.item.quantidade || 0).toLocaleString('pt-BR')}</td>
                    <td className="text-right">
                      <strong>{formatMoney(linha.menor_preco.valor_total)}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        {linha.menor_preco.fornecedor_nome} · {formatMoney(linha.menor_preco.preco_unitario)}
                      </div>
                    </td>
                    <td className="text-right">
                      <strong>{formatMoney(linha.vencedor.valor_total)}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        {linha.vencedor.fornecedor_nome} · {formatMoney(linha.vencedor.preco_unitario)}
                      </div>
                    </td>
                    <td className="text-right" style={{ color: metricColor(linha.economia), fontWeight: 700 }}>
                      {formatMoney(linha.economia)}
                    </td>
                    <td className="text-right" style={{ color: Number(linha.sobrepreco || 0) > 0 ? 'var(--c-danger)' : 'var(--c-muted)', fontWeight: 700 }}>
                      {formatMoney(linha.sobrepreco)}
                    </td>
                    <td>
                      {linha.selecionou_menor_preco ? (
                        <span className="badge badge-success">Menor preco</span>
                      ) : (
                        <span className="badge badge-warning">Acima do menor</span>
                      )}
                    </td>
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
