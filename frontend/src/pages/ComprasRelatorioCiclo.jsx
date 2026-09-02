import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
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
  const etapasCiclo = useMemo(() => ([
    {
      key: 'criacao_liberacao',
      label: 'Criacao ate liberacao',
      value: resumo.tempo_medio_criacao_liberacao_horas,
      detail: 'Pedido revisado e liberado para compras'
    },
    {
      key: 'liberacao_envio',
      label: 'Liberacao ate envio',
      value: resumo.tempo_medio_liberacao_envio_horas,
      detail: 'Tempo ate primeiro fornecedor receber cotacao'
    },
    {
      key: 'envio_resposta',
      label: 'Envio ate primeira resposta',
      value: resumo.tempo_medio_envio_primeira_resposta_horas,
      detail: 'Resposta inicial dos fornecedores'
    },
    {
      key: 'criacao_encerramento',
      label: 'Criacao ate encerramento',
      value: resumo.tempo_medio_criacao_encerramento_horas,
      detail: 'Tempo medio ate fechar a cotacao'
    },
    {
      key: 'ciclo_pedido',
      label: 'Ciclo ate pedido',
      value: resumo.tempo_medio_ciclo_total_ate_pedido_horas,
      detail: 'Tempo medio ate existir pedido de compra'
    }
  ]).filter((etapa) => etapa.value !== null && etapa.value !== undefined), [resumo]);
  const maiorTempoEtapa = useMemo(
    () => Math.max(...etapasCiclo.map((etapa) => Number(etapa.value || 0)), 0),
    [etapasCiclo]
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
        <div className="app-page-header-row">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Ciclo medio por etapa</h2>
            <p className="page-subtitle">
              Gargalos do processo calculados pelas datas reais registradas na solicitacao, cotacao e pedido.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-[var(--c-muted)] py-4">Carregando etapas do ciclo...</div>
        ) : etapasCiclo.length === 0 ? (
          <div className="app-empty-card mt-3">Sem datas suficientes para montar o grafico do ciclo.</div>
        ) : (
          <div className="grid gap-3 mt-3">
            {etapasCiclo.map((etapa) => {
              const valor = Number(etapa.value || 0);
              const percentual = maiorTempoEtapa > 0 ? Math.max(4, (valor / maiorTempoEtapa) * 100) : 0;
              return (
                <div key={`ciclo-etapa-${etapa.key}`} className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="text-sm text-[var(--c-text)]">{etapa.label}</strong>
                      <span className="ml-2 text-xs text-[var(--c-muted)]">{etapa.detail}</span>
                    </div>
                    <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatHours(valor)}</strong>
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
        <TabelaPadrao
          colunas={[
            {
              id: 'solicitacao',
              titulo: 'Solicitacao',
              // R17: a solicitacao NOMEIA o registro desta linha.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (linha) => (
                <div>
                  <strong>SC #{linha.solicitacao.id}</strong>
                  <div className="text-xs text-[var(--c-muted)]">{linha.solicitacao.titulo || 'Sem titulo'}</div>
                </div>
              )
            },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (linha) => linha.solicitacao.status },
            {
              id: 'datas',
              titulo: 'Datas',
              tipo: 'texto',
              render: (linha) => (
                <div>
                  <div>Criada: {formatDate(linha.solicitacao.criado_em)}</div>
                  <div className="text-xs text-[var(--c-muted)]">Encerrada: {formatDate(linha.solicitacao.encerrado_em)}</div>
                </div>
              )
            },
            {
              id: 'fornecedores',
              titulo: 'Fornecedores',
              tipo: 'numero',
              render: (linha) => (
                <>
                  {Number(linha.contadores.fornecedores_respondidos || 0).toLocaleString('pt-BR')} de{' '}
                  {Number(linha.contadores.fornecedores_enviados || 0).toLocaleString('pt-BR')}
                </>
              )
            },
            { id: 'criacao_encerramento', titulo: 'Criacao → encerramento', tipo: 'numero', render: (linha) => formatHours(linha.tempos.criacao_para_encerramento_horas) },
            { id: 'encerramento_pedido', titulo: 'Encerramento → pedido', tipo: 'numero', render: (linha) => formatHours(linha.tempos.encerramento_para_pedido_horas) },
            { id: 'ciclo_total', titulo: 'Ciclo total', tipo: 'numero', render: (linha) => formatHours(linha.tempos.ciclo_total_ate_pedido_horas) }
          ]}
          itens={solicitacoes}
          getId={(linha) => linha.solicitacao.id}
          carregando={loading}
          storageKey="tabela:compras-ciclo:solicitacoes"
          rotuloRolagem="Ciclo por solicitacao"
          vazio="Nenhuma solicitacao encontrada para os filtros selecionados."
        />
      </div>
    </div>
  );
}
