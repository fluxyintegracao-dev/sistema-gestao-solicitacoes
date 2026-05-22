import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { obterRelatorioFornecedoresCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

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

function formatHours(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  if (numeric < 24) {
    return `${numeric.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  }

  return `${(numeric / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia(s)`;
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de fornecedores';
  }
}

export default function ComprasRelatorioFornecedores() {
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
        const data = await obterRelatorioFornecedoresCompras(filtrosAtivos);
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
  const fornecedores = useMemo(
    () => (Array.isArray(relatorio?.fornecedores) ? relatorio.fornecedores : []),
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
            <h1 className="page-title">Fornecedores</h1>
            <p className="page-subtitle">
              Analise de participacao, resposta e vitorias por fornecedor no processo de cotacao.
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
              <span className="app-filter-label">Data inicial</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Data final</span>
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
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong className="dashboard-metric-value">{Number(resumo.fornecedores || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Com cotacoes no periodo</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--slate">
          <span className="dashboard-metric-label">Cotacoes enviadas</span>
          <strong className="dashboard-metric-value">{Number(resumo.cotacoes_enviadas || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Participacoes registradas</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">Taxa de resposta</span>
          <strong className="dashboard-metric-value">{formatPercent(resumo.taxa_resposta)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.cotacoes_respondidas || 0).toLocaleString('pt-BR')} respondida(s)</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Valor vencedor</span>
          <strong className="dashboard-metric-value">{formatMoney(resumo.valor_vencedor)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.itens_vencedores || 0).toLocaleString('pt-BR')} item(ns) vencedor(es)</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="sol-table-wrapper compras-fornecedores-table-shell">
          <table className="sol-table compras-fornecedores-table">
            <colgroup>
              <col className="compras-fornecedores-col--fornecedor" />
              <col className="compras-fornecedores-col--curta" />
              <col className="compras-fornecedores-col--resposta" />
              <col className="compras-fornecedores-col--prazo" />
              <col className="compras-fornecedores-col--itens" />
              <col className="compras-fornecedores-col--itens" />
              <col className="compras-fornecedores-col--valor" />
              <col className="compras-fornecedores-col--valor" />
              <col className="compras-fornecedores-col--data" />
            </colgroup>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th className="text-right">Cotacoes</th>
                <th className="text-right">Resposta</th>
                <th className="text-right">Prazo medio</th>
                <th className="text-right">Itens respondidos</th>
                <th className="text-right">Itens vencedores</th>
                <th className="text-right">Valor cotado</th>
                <th className="text-right">Valor vencedor</th>
                <th className="text-right">Ultima cotacao</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-[var(--c-muted)] py-6">
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-[var(--c-muted)] py-6">
                    Nenhum fornecedor encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                fornecedores.map((item) => (
                  <tr key={item.fornecedor.id || item.fornecedor.nome}>
                    <td>
                      <strong>{item.fornecedor.nome}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                          .filter(Boolean)
                          .join(' · ') || 'Sem dados complementares'}
                      </div>
                    </td>
                    <td className="text-right">{Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}</td>
                    <td className="text-right">
                      <strong>{formatPercent(item.taxa_resposta)}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        {Number(item.cotacoes_respondidas || 0).toLocaleString('pt-BR')} de{' '}
                        {Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="text-right">{formatHours(item.prazo_medio_resposta_horas)}</td>
                    <td className="text-right">{Number(item.itens_respondidos || 0).toLocaleString('pt-BR')}</td>
                    <td className="text-right">{Number(item.itens_vencedores || 0).toLocaleString('pt-BR')}</td>
                    <td className="text-right tabular-nums">{formatMoney(item.valor_cotado)}</td>
                    <td className="text-right tabular-nums">{formatMoney(item.valor_vencedor)}</td>
                    <td className="text-right tabular-nums">{formatDate(item.ultima_cotacao)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
