import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { obterRelatorioCicloCompras } from '../services/compras';
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

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar ciclo de compras';
  }
}

export default function ComprasRelatorioCiclo() {
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
        const data = await obterRelatorioCicloCompras(filtrosAtivos);
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
  const solicitacoes = useMemo(
    () => (Array.isArray(relatorio?.solicitacoes) ? relatorio.solicitacoes : []),
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
            <h1 className="page-title">Ciclo de Compras</h1>
            <p className="page-subtitle">
              Tempo real do processo entre solicitacao, liberacao, cotacao, encerramento e pedido.
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

      {erro ? <div className="mt-4 alert alert-danger">{erro}</div> : null}

      <div className="mt-4 metric-grid">
        <div className="dashboard-metric-card dashboard-metric-card--blue">
          <span className="dashboard-metric-label">Solicitacoes</span>
          <strong className="dashboard-metric-value">{Number(resumo.solicitacoes || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Criadas no periodo</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">Resposta fornecedor</span>
          <strong className="dashboard-metric-value">{formatPercent(resumo.taxa_resposta_fornecedor)}</strong>
          <small className="dashboard-metric-detail">
            {Number(resumo.fornecedores_respondidos || 0).toLocaleString('pt-BR')} de {Number(resumo.fornecedores_enviados || 0).toLocaleString('pt-BR')}
          </small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Criacao ate encerramento</span>
          <strong className="dashboard-metric-value">{formatHours(resumo.tempo_medio_criacao_encerramento_horas)}</strong>
          <small className="dashboard-metric-detail">Tempo medio das cotacoes encerradas</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--slate">
          <span className="dashboard-metric-label">Ciclo ate pedido</span>
          <strong className="dashboard-metric-value">{formatHours(resumo.tempo_medio_ciclo_total_ate_pedido_horas)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.solicitacoes_com_pedido || 0).toLocaleString('pt-BR')} com pedido</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="app-empty-card">
            <strong>{formatHours(resumo.tempo_medio_criacao_liberacao_horas)}</strong>
            <span>criacao ate liberacao</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatHours(resumo.tempo_medio_liberacao_envio_horas)}</strong>
            <span>liberacao ate primeiro envio</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatHours(resumo.tempo_medio_envio_primeira_resposta_horas)}</strong>
            <span>envio ate primeira resposta</span>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="sol-table-wrapper">
          <table className="sol-table">
            <thead>
              <tr>
                <th>Solicitacao</th>
                <th>Status</th>
                <th>Datas</th>
                <th>Fornecedores</th>
                <th>Criacao → encerramento</th>
                <th>Encerramento → pedido</th>
                <th>Ciclo total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--c-muted)] py-6">
                    Carregando ciclo de compras...
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--c-muted)] py-6">
                    Nenhuma solicitacao encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                solicitacoes.map((linha) => (
                  <tr key={linha.solicitacao.id}>
                    <td>
                      <strong>SC #{linha.solicitacao.id}</strong>
                      <div className="text-xs text-[var(--c-muted)]">{linha.solicitacao.titulo || 'Sem titulo'}</div>
                    </td>
                    <td>{linha.solicitacao.status}</td>
                    <td>
                      <div>Criada: {formatDate(linha.solicitacao.criado_em)}</div>
                      <div className="text-xs text-[var(--c-muted)]">Encerrada: {formatDate(linha.solicitacao.encerrado_em)}</div>
                    </td>
                    <td>
                      {Number(linha.contadores.fornecedores_respondidos || 0).toLocaleString('pt-BR')} de{' '}
                      {Number(linha.contadores.fornecedores_enviados || 0).toLocaleString('pt-BR')}
                    </td>
                    <td>{formatHours(linha.tempos.criacao_para_encerramento_horas)}</td>
                    <td>{formatHours(linha.tempos.encerramento_para_pedido_horas)}</td>
                    <td>{formatHours(linha.tempos.ciclo_total_ate_pedido_horas)}</td>
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
