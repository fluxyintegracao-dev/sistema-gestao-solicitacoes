import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import {
  getObrasVisiveisSolicitacoes,
  obterRelatorioSolicitacoesOperacional
} from '../services/solicitacoes';

const DEFAULT_FILTERS = {
  periodo: '30_DIAS',
  data_inicio: '',
  data_fim: '',
  obra_id: ''
};

const STATUS_COLUMNS = [
  { key: 'status', width: 180, minWidth: 130 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const SETOR_COLUMNS = [
  { key: 'setor', width: 190, minWidth: 130 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 240, minWidth: 160 },
  { key: 'tipo', width: 132, minWidth: 100 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const TIPO_COLUMNS = [
  { key: 'tipo', width: 230, minWidth: 150 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const USUARIO_COLUMNS = [
  { key: 'usuario', width: 230, minWidth: 150 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const ACERTIVIDADE_COLUMNS = [
  { key: 'usuario', width: 240, minWidth: 160 },
  { key: 'criadas', width: 96, minWidth: 80 },
  { key: 'ajustes', width: 145, minWidth: 115 },
  { key: 'ocorrencias', width: 150, minWidth: 120 },
  { key: 'acertividade', width: 135, minWidth: 110 },
  { key: 'setores', width: 340, minWidth: 240 }
];

const PENDENCIAS_FINANCEIRAS_COLUMNS = [
  { key: 'usuario', width: 240, minWidth: 160 },
  { key: 'marcadas', width: 125, minWidth: 100 },
  { key: 'abertas', width: 115, minWidth: 92 },
  { key: 'regularizadas', width: 140, minWidth: 112 },
  { key: 'media', width: 145, minWidth: 115 },
  { key: 'maior', width: 145, minWidth: 115 },
  { key: 'tipos', width: 340, minWidth: 240 }
];

const TEMPO_COLUMNS = [
  { key: 'etapa', width: 260, minWidth: 180 },
  { key: 'amostras', width: 110, minWidth: 90 },
  { key: 'media', width: 120, minWidth: 100 },
  { key: 'maior', width: 120, minWidth: 100 }
];

const AGING_SETOR_COLUMNS = [
  { key: 'setor', width: 210, minWidth: 140 },
  { key: 'abertas', width: 100, minWidth: 80 },
  { key: 'media', width: 130, minWidth: 100 },
  { key: 'maior', width: 130, minWidth: 100 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const GARGALO_COLUMNS = [
  { key: 'codigo', width: 130, minWidth: 100 },
  { key: 'setor', width: 150, minWidth: 110 },
  { key: 'status', width: 150, minWidth: 110 },
  { key: 'responsavel', width: 170, minWidth: 120 },
  { key: 'obra', width: 210, minWidth: 140 },
  { key: 'tipo', width: 180, minWidth: 120 },
  { key: 'dias', width: 112, minWidth: 92 },
  { key: 'valor', width: 130, minWidth: 100 }
];

function readFilters(searchParams) {
  return {
    periodo: searchParams.get('periodo') || DEFAULT_FILTERS.periodo,
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || '',
    obra_id: searchParams.get('obra_id') || ''
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

function formatCurrency(value) {
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
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function formatDays(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '-';
  return `${formatNumber(numeric, 1)} dia(s)`;
}

function formatLabel(value) {
  return String(value || 'Nao informado')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function extractErrorMessage(error) {
  return error?.data?.error || error?.message || 'Erro ao carregar relatorio de solicitacoes';
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-[var(--c-muted)] py-6">
        {children}
      </td>
    </tr>
  );
}

function SortableResizableTh({
  columnKey,
  sortKey = columnKey,
  sortState,
  onSort,
  className = '',
  children,
  align = 'left',
  title
}) {
  const active = sortState?.key === sortKey;
  const direction = active ? sortState.direction : null;
  const justifyClass = align === 'right' ? 'justify-end text-right' : 'justify-start text-left';

  return (
    <ResizableTh columnKey={columnKey} className={className} title={title}>
      <button
        type="button"
        className={`inline-flex w-full items-center gap-1.5 rounded-md text-xs font-bold uppercase tracking-[0.08em] text-[var(--c-text)] transition hover:text-[var(--c-primary)] ${justifyClass}`}
        onClick={() => onSort(sortKey)}
        title={title || 'Ordenar coluna'}
      >
        <span>{children}</span>
        <span className={`text-[10px] ${active ? 'text-[var(--c-primary)]' : 'text-[var(--c-muted)]'}`}>
          {direction === 'asc' ? 'ASC' : direction === 'desc' ? 'DESC' : '--'}
        </span>
      </button>
    </ResizableTh>
  );
}

function getAcertividadeSortValue(item, key) {
  switch (key) {
    case 'usuario':
      return String(item.usuario_nome || 'Sem criador').toLowerCase();
    case 'criadas':
      return Number(item.total_criadas || 0);
    case 'ajustes':
      return Number(item.solicitacoes_com_ajuste || 0);
    case 'ocorrencias':
      return Number(item.ocorrencias_setor_ajuste || 0);
    case 'acertividade':
      return Number(item.taxa_acertividade || 0);
    default:
      return 0;
  }
}

export default function SolicitacoesRelatorioOperacional() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [acertividadeSort, setAcertividadeSort] = useState({ key: 'ajustes', direction: 'desc' });

  useEffect(() => {
    let ativo = true;
    getObrasVisiveisSolicitacoes()
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
        const data = await obterRelatorioSolicitacoesOperacional(filtrosAtivos);
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
  const porStatus = useMemo(() => (Array.isArray(relatorio?.por_status) ? relatorio.por_status : []), [relatorio]);
  const porSetor = useMemo(() => (Array.isArray(relatorio?.por_setor) ? relatorio.por_setor : []), [relatorio]);
  const porObra = useMemo(() => (Array.isArray(relatorio?.por_obra) ? relatorio.por_obra : []), [relatorio]);
  const porTipo = useMemo(() => (Array.isArray(relatorio?.por_tipo) ? relatorio.por_tipo : []), [relatorio]);
  const porCriador = useMemo(() => (Array.isArray(relatorio?.por_criador) ? relatorio.por_criador : []), [relatorio]);
  const acertividadeCriacao = useMemo(
    () => (Array.isArray(relatorio?.acertividade_criacao) ? relatorio.acertividade_criacao : []),
    [relatorio]
  );
  const pendenciasFinanceirasCriador = useMemo(
    () => (Array.isArray(relatorio?.pendencias_financeiras_criador) ? relatorio.pendencias_financeiras_criador : []),
    [relatorio]
  );
  const acertividadeCriacaoOrdenada = useMemo(() => {
    return [...acertividadeCriacao].sort((a, b) => {
      const aValue = getAcertividadeSortValue(a, acertividadeSort.key);
      const bValue = getAcertividadeSortValue(b, acertividadeSort.key);
      let comparison = 0;

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { sensitivity: 'base' });
      } else {
        comparison = Number(aValue || 0) - Number(bValue || 0);
      }

      return acertividadeSort.direction === 'asc' ? comparison : comparison * -1;
    });
  }, [acertividadeCriacao, acertividadeSort]);
  const porResponsavel = useMemo(() => (Array.isArray(relatorio?.por_responsavel) ? relatorio.por_responsavel : []), [relatorio]);
  const temposEtapas = useMemo(() => (Array.isArray(relatorio?.tempos_etapas) ? relatorio.tempos_etapas : []), [relatorio]);
  const evolucaoMensal = useMemo(() => (Array.isArray(relatorio?.evolucao_mensal) ? relatorio.evolucao_mensal : []), [relatorio]);
  const setorStatus = useMemo(() => (Array.isArray(relatorio?.setor_status) ? relatorio.setor_status : []), [relatorio]);
  const agingSetor = useMemo(() => (Array.isArray(relatorio?.aging_setor) ? relatorio.aging_setor : []), [relatorio]);
  const agingStatus = useMemo(() => (Array.isArray(relatorio?.aging_status) ? relatorio.aging_status : []), [relatorio]);
  const slaSetor = useMemo(() => (Array.isArray(relatorio?.sla_setor) ? relatorio.sla_setor : []), [relatorio]);
  const setoresSemSla = useMemo(() => (Array.isArray(relatorio?.setores_sem_sla) ? relatorio.setores_sem_sla : []), [relatorio]);
  const gargalos = useMemo(() => (Array.isArray(relatorio?.gargalos) ? relatorio.gargalos : []), [relatorio]);
  const topSetores = useMemo(() => porSetor.slice(0, 8), [porSetor]);
  const topStatus = useMemo(() => porStatus.slice(0, 8), [porStatus]);
  const topObras = useMemo(() => porObra.slice(0, 8), [porObra]);
  const topAgingStatus = useMemo(() => agingStatus.slice(0, 8), [agingStatus]);
  const topSlaSetor = useMemo(() => slaSetor.slice(0, 8), [slaSetor]);
  const topSetoresSemSla = useMemo(() => setoresSemSla.slice(0, 6), [setoresSemSla]);
  const topSetoresHeatmap = useMemo(() => {
    const mapa = new Map();
    setorStatus.forEach((item) => {
      const key = item.setor || 'NAO_INFORMADO';
      const atual = mapa.get(key) || { key, setor: item.setor, total: 0 };
      atual.total += Number(item.total || 0);
      mapa.set(key, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [setorStatus]);
  const topStatusHeatmap = useMemo(() => {
    const mapa = new Map();
    setorStatus.forEach((item) => {
      const key = item.status || 'NAO_INFORMADO';
      const atual = mapa.get(key) || { key, status: item.status, total: 0 };
      atual.total += Number(item.total || 0);
      mapa.set(key, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [setorStatus]);
  const heatmapLookup = useMemo(() => {
    const mapa = new Map();
    setorStatus.forEach((item) => {
      mapa.set(`${item.setor || 'NAO_INFORMADO'}|${item.status || 'NAO_INFORMADO'}`, item);
    });
    return mapa;
  }, [setorStatus]);
  const maiorTotalSetor = useMemo(
    () => Math.max(...topSetores.map((item) => Number(item.total || 0)), 0),
    [topSetores]
  );
  const maiorTotalStatus = useMemo(
    () => Math.max(...topStatus.map((item) => Number(item.total || 0)), 0),
    [topStatus]
  );
  const maiorTotalObra = useMemo(
    () => Math.max(...topObras.map((item) => Number(item.total || 0)), 0),
    [topObras]
  );
  const maiorTotalEvolucao = useMemo(
    () => Math.max(...evolucaoMensal.map((item) => Number(item.total || 0)), 0),
    [evolucaoMensal]
  );
  const maiorAgingStatus = useMemo(
    () => Math.max(...topAgingStatus.map((item) => Number(item.media_dias_parada || 0)), 0),
    [topAgingStatus]
  );
  const maiorSlaVencidas = useMemo(
    () => Math.max(...topSlaSetor.map((item) => Number(item.vencidas || 0)), 0),
    [topSlaSetor]
  );
  const maiorHeatmap = useMemo(
    () => Math.max(...setorStatus.map((item) => Number(item.total || 0)), 0),
    [setorStatus]
  );

  function ordenarAcertividade(key) {
    setAcertividadeSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'usuario' ? 'asc' : 'desc' };
    });
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(buildSearchParams(DEFAULT_FILTERS));
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <p className="eyebrow">Solicitacoes / Relatorios</p>
            <h1 className="page-title">Painel operacional</h1>
            <p className="page-subtitle">
              Volume, funil, gargalos e distribuicao por setor, obra e tipo usando dados reais do fluxo de solicitacoes.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/solicitacoes/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Periodo</span>
              <select
                className="input"
                value={filtros.periodo}
                onChange={(event) => setFiltros((current) => ({ ...current, periodo: event.target.value }))}
              >
                <option value="HOJE">Hoje</option>
                <option value="30_DIAS">Ultimos 30 dias</option>
                <option value="90_DIAS">Ultimos 90 dias</option>
                <option value="MES_ATUAL">Mes atual</option>
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
          <strong className="dashboard-metric-value">{formatNumber(resumo.total_solicitacoes)}</strong>
          <small className="dashboard-metric-detail">Criadas no periodo filtrado</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">Concluidas</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.concluidas)}</strong>
          <small className="dashboard-metric-detail">{formatNumber(resumo.abertas)} ainda abertas</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Media abertas</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.media_dias_abertas, 1)} dia(s)</strong>
          <small className="dashboard-metric-detail">Tempo medio desde a criacao</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--red">
          <span className="dashboard-metric-label">Maior parada</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.maior_tempo_parado_dias, 1)} dia(s)</strong>
          <small className="dashboard-metric-detail">Sem nova movimentacao registrada</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--slate">
          <span className="dashboard-metric-label">Valor aberto</span>
          <strong className="dashboard-metric-value">{formatCurrency(resumo.valor_aberto)}</strong>
          <small className="dashboard-metric-detail">{formatCurrency(resumo.valor_total)} no periodo</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.criadas)}</strong>
            <span>criadas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.assumidas)}</strong>
            <span>assumidas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.enviadas)}</strong>
            <span>enviadas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.aprovadas_diretoria)}</strong>
            <span>aprovadas diretoria</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.concluidas)}</strong>
            <span>concluidas</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Ranking por setor atual</h2>
          <p className="page-subtitle mb-3">Setores com maior volume de solicitacoes no periodo filtrado.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando setores...</div>
          ) : topSetores.length === 0 ? (
            <div className="app-empty-card">Sem dados por setor no periodo.</div>
          ) : (
            <div className="grid gap-3">
              {topSetores.map((item, index) => {
                const total = Number(item.total || 0);
                const width = maiorTotalSetor > 0 ? Math.max(4, (total / maiorTotalSetor) * 100) : 0;
                return (
                  <div key={`setor-grafico-${item.key}`} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--c-muted)]">#{index + 1}</span>
                        <strong className="ml-2 text-sm text-[var(--c-text)]">{formatLabel(item.setor || item.key)}</strong>
                      </div>
                      <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatNumber(total)}</strong>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Distribuicao por status</h2>
          <p className="page-subtitle mb-3">Participacao de cada status no volume filtrado.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando status...</div>
          ) : topStatus.length === 0 ? (
            <div className="app-empty-card">Sem dados por status no periodo.</div>
          ) : (
            <div className="grid gap-3">
              {topStatus.map((item) => {
                const total = Number(item.total || 0);
                const width = maiorTotalStatus > 0 ? Math.max(4, (total / maiorTotalStatus) * 100) : 0;
                const percent = Number(resumo.total_solicitacoes || 0) > 0
                  ? (total / Number(resumo.total_solicitacoes || 0)) * 100
                  : 0;
                return (
                  <div key={`status-grafico-${item.key}`} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-[var(--c-text)]">{formatLabel(item.status || item.key)}</strong>
                      <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">
                        {formatNumber(total)} | {formatPercent(percent)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--c-success)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Volume por obra/centro</h2>
          <p className="page-subtitle mb-3">Origens operacionais que mais abriram solicitacoes.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando obras...</div>
          ) : topObras.length === 0 ? (
            <div className="app-empty-card">Sem dados por obra/centro no periodo.</div>
          ) : (
            <div className="grid gap-3">
              {topObras.map((item, index) => {
                const total = Number(item.total || 0);
                const width = maiorTotalObra > 0 ? Math.max(4, (total / maiorTotalObra) * 100) : 0;
                return (
                  <div key={`obra-grafico-${item.key}`} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--c-muted)]">#{index + 1}</span>
                        <strong className="ml-2 text-sm text-[var(--c-text)]">{item.obra_nome || 'Sem obra/centro'}</strong>
                      </div>
                      <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatNumber(total)}</strong>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--c-warning)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Evolucao mensal</h2>
          <p className="page-subtitle mb-3">Solicitacoes criadas por mes dentro do periodo filtrado.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando evolucao...</div>
          ) : evolucaoMensal.length === 0 ? (
            <div className="app-empty-card">Sem dados mensais para o filtro selecionado.</div>
          ) : (
            <div className="grid gap-3">
              {evolucaoMensal.map((item) => {
                const total = Number(item.total || 0);
                const width = maiorTotalEvolucao > 0 ? Math.max(4, (total / maiorTotalEvolucao) * 100) : 0;
                return (
                  <div key={`evolucao-${item.mes}`} className="grid gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm text-[var(--c-text)]">{item.mes_label || item.mes}</strong>
                      <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">
                        {formatNumber(total)} criada(s)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-xs text-[var(--c-muted)]">
                      {formatNumber(item.concluidas)} concluida(s) | {formatNumber(item.abertas)} aberta(s)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Aging por status</h2>
          <p className="page-subtitle mb-3">Tempo medio parado das solicitacoes abertas em cada status atual.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando aging por status...</div>
          ) : topAgingStatus.length === 0 ? (
            <div className="app-empty-card">Sem solicitacoes abertas para calcular aging por status.</div>
          ) : (
            <div className="grid gap-3">
              {topAgingStatus.map((item) => {
                const media = Number(item.media_dias_parada || 0);
                const width = maiorAgingStatus > 0 ? Math.max(4, (media / maiorAgingStatus) * 100) : 0;
                return (
                  <div key={`aging-status-${item.key}`} className="grid gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm text-[var(--c-text)]">{formatLabel(item.status || item.key)}</strong>
                      <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">
                        {formatDays(media)} | {formatNumber(item.total)} aberta(s)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--c-danger)]" style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-xs text-[var(--c-muted)]">
                      Maior parada: {formatDays(item.maior_dias_parada)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Mapa setor x status</h2>
        <p className="page-subtitle mb-3">Cruzamento dos setores e status com maior volume no periodo filtrado.</p>
        {loading ? (
          <div className="text-sm text-[var(--c-muted)] py-4">Carregando matriz...</div>
        ) : topSetoresHeatmap.length === 0 || topStatusHeatmap.length === 0 ? (
          <div className="app-empty-card">Sem dados suficientes para montar o mapa setor x status.</div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[720px] gap-2"
              style={{ gridTemplateColumns: `minmax(150px, 1.2fr) repeat(${topStatusHeatmap.length}, minmax(96px, 1fr))` }}
            >
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--c-muted)]">Setor</div>
              {topStatusHeatmap.map((statusItem) => (
                <div key={`heatmap-head-${statusItem.key}`} className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--c-muted)] text-center">
                  {formatLabel(statusItem.status || statusItem.key)}
                </div>
              ))}
              {topSetoresHeatmap.map((setorItem) => (
                <Fragment key={`heatmap-row-${setorItem.key}`}>
                  <div className="text-sm font-bold text-[var(--c-text)] py-2">
                    {formatLabel(setorItem.setor || setorItem.key)}
                  </div>
                  {topStatusHeatmap.map((statusItem) => {
                    const item = heatmapLookup.get(`${setorItem.setor || 'NAO_INFORMADO'}|${statusItem.status || 'NAO_INFORMADO'}`);
                    const total = Number(item?.total || 0);
                    const opacity = maiorHeatmap > 0 ? Math.min(0.95, Math.max(0.08, total / maiorHeatmap)) : 0.08;
                    return (
                      <div
                        key={`heatmap-cell-${setorItem.key}-${statusItem.key}`}
                        className="rounded-lg px-3 py-2 text-center text-sm font-bold"
                        style={{
                          backgroundColor: `rgba(37, 99, 235, ${opacity})`,
                          color: opacity > 0.45 ? '#fff' : 'var(--c-text)'
                        }}
                      >
                        {formatNumber(total)}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">SLA por setor</h2>
              <p className="page-subtitle">Solicitacoes abertas vencidas conforme SLA cadastrado por setor.</p>
            </div>
            <Link to="/solicitacoes-sla-setor" className="btn btn-outline text-sm">
              Configurar SLA
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando SLA...</div>
          ) : !relatorio?.sla_configurado ? (
            <div className="app-empty-card">
              Nenhum SLA por setor configurado. Cadastre os prazos para ativar a leitura de vencimentos.
            </div>
          ) : topSlaSetor.length === 0 ? (
            <div className="app-empty-card">Nenhuma solicitacao aberta em setor com SLA configurado.</div>
          ) : (
            <div className="grid gap-3">
              {topSlaSetor.map((item) => {
                const vencidas = Number(item.vencidas || 0);
                const width = maiorSlaVencidas > 0 ? Math.max(4, (vencidas / maiorSlaVencidas) * 100) : 4;
                const tone = vencidas > 0 ? 'bg-[var(--c-danger)]' : 'bg-emerald-500';
                return (
                  <div key={`sla-setor-${item.key}`} className="grid gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm text-[var(--c-text)]">{formatLabel(item.setor_nome || item.setor || item.key)}</strong>
                      <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">
                        {formatNumber(vencidas)} vencida(s) de {formatNumber(item.total)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-xs text-[var(--c-muted)]">
                      SLA: {formatNumber(item.sla_dias, 1)} dia(s) | No prazo: {formatNumber(item.no_prazo)} | Maior parada: {formatDays(item.maior_dias_parada)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Setores sem SLA configurado</h2>
          <p className="page-subtitle mb-3">Solicitacoes abertas que ainda nao podem ser tratadas como vencidas por falta de regra real.</p>
          {loading ? (
            <div className="text-sm text-[var(--c-muted)] py-4">Carregando setores sem SLA...</div>
          ) : topSetoresSemSla.length === 0 ? (
            <div className="app-empty-card">Todas as solicitacoes abertas do filtro estao em setores com SLA ou nao ha abertas.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topSetoresSemSla.map((item) => (
                <div key={`sem-sla-${item.key}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <strong className="block text-sm text-[var(--c-text)]">{formatLabel(item.setor_nome || item.setor || item.key)}</strong>
                    <span className="text-xs text-[var(--c-muted)]">{formatCurrency(item.valor_aberto)} em aberto</span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {formatNumber(item.total)} aberta(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Tempos por etapa</h2>
          <p className="page-subtitle mb-3">Medias calculadas apenas quando a etapa possui data real registrada.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={TEMPO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.tempos.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="etapa">Etapa</ResizableTh>
                  <ResizableTh columnKey="amostras" className="text-right">Amostras</ResizableTh>
                  <ResizableTh columnKey="media" className="text-right">Media</ResizableTh>
                  <ResizableTh columnKey="maior" className="text-right">Maior</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={4}>Carregando tempos...</EmptyRow>
                ) : temposEtapas.length === 0 ? (
                  <EmptyRow colSpan={4}>Sem etapas com datas suficientes no periodo.</EmptyRow>
                ) : (
                  temposEtapas.map((item) => (
                    <tr key={item.key}>
                      <td>{item.label}</td>
                      <td className="text-right">{formatNumber(item.amostras)}</td>
                      <td className="text-right">{formatDays(item.media_dias)}</td>
                      <td className="text-right">{formatDays(item.maior_dias)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Aging por setor atual</h2>
          <p className="page-subtitle mb-3">Solicitacoes abertas agrupadas pelo setor em que estao paradas agora.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={AGING_SETOR_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.agingSetor.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="setor">Setor</ResizableTh>
                  <ResizableTh columnKey="abertas" className="text-right">Abertas</ResizableTh>
                  <ResizableTh columnKey="media" className="text-right">Media parada</ResizableTh>
                  <ResizableTh columnKey="maior" className="text-right">Maior parada</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor aberto</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={5}>Carregando aging...</EmptyRow>
                ) : agingSetor.length === 0 ? (
                  <EmptyRow colSpan={5}>Sem solicitacoes abertas nos filtros selecionados.</EmptyRow>
                ) : (
                  agingSetor.map((item) => (
                    <tr key={item.key}>
                      <td>{formatLabel(item.setor || item.key)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatDays(item.media_dias_parada)}</td>
                      <td className="text-right">{formatDays(item.maior_dias_parada)}</td>
                      <td className="text-right">{formatCurrency(item.valor_aberto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="app-page-header-row mb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Pendencias financeiras por usuario</h2>
            <p className="page-subtitle">
              Mede solicitacoes marcadas por GEO ou Financeiro como fora do prazo, sem nota ou sem boleto ate o vencimento.
            </p>
          </div>
        </div>
        <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Leitura:</strong> a pendencia fica aberta ate ser regularizada no detalhe da solicitacao. O tempo medio mede o prazo entre a marcacao e a regularizacao.
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable
            className="sol-table"
            columns={PENDENCIAS_FINANCEIRAS_COLUMNS}
            storageKey="fluxy.solicitacoes.relatorio.pendenciasFinanceiras.columns"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="usuario">Usuario criador</ResizableTh>
                <ResizableTh columnKey="marcadas" className="text-right">Marcadas</ResizableTh>
                <ResizableTh columnKey="abertas" className="text-right">Abertas</ResizableTh>
                <ResizableTh columnKey="regularizadas" className="text-right">Regularizadas</ResizableTh>
                <ResizableTh columnKey="media" className="text-right">Prazo medio</ResizableTh>
                <ResizableTh columnKey="maior" className="text-right">Maior prazo</ResizableTh>
                <ResizableTh columnKey="tipos">Tipos de pendencia</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={7}>Carregando pendencias...</EmptyRow>
              ) : pendenciasFinanceirasCriador.length === 0 ? (
                <EmptyRow colSpan={7}>Sem pendencias financeiras marcadas no periodo.</EmptyRow>
              ) : (
                pendenciasFinanceirasCriador.map((item) => (
                  <tr key={item.key}>
                    <td>{item.usuario_nome || 'Sem criador'}</td>
                    <td className="text-right font-bold">{formatNumber(item.total_marcadas)}</td>
                    <td className="text-right">
                      <span className={Number(item.abertas || 0) > 0 ? 'text-amber-700 font-bold' : 'text-[var(--c-muted)]'}>
                        {formatNumber(item.abertas)}
                      </span>
                    </td>
                    <td className="text-right text-emerald-700 font-bold">{formatNumber(item.regularizadas)}</td>
                    <td className="text-right">{formatDays(item.media_dias_regularizacao)}</td>
                    <td className="text-right">{formatDays(item.maior_dias_regularizacao)}</td>
                    <td>
                      {Array.isArray(item.tipos) && item.tipos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.tipos.map((tipo) => (
                            <span
                              key={`${item.key}-${tipo.tipo}`}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                            >
                              {formatLabel(tipo.tipo)}: {formatNumber(tipo.total)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--c-muted)]">Sem tipo informado</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por status</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={STATUS_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.status.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porStatus.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porStatus.map((item) => (
                    <tr key={item.key}>
                      <td>{formatLabel(item.status || item.key)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por setor atual</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={SETOR_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.setor.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="setor">Setor</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porSetor.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porSetor.map((item) => (
                    <tr key={item.key}>
                      <td>{formatLabel(item.setor || item.key)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por obra/centro</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.obra.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra / Centro</ResizableTh>
                  <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={4}>Carregando...</EmptyRow>
                ) : porObra.length === 0 ? (
                  <EmptyRow colSpan={4}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porObra.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <strong>{item.obra_nome || 'Sem obra/centro'}</strong>
                        {item.obra_codigo ? <div className="text-xs text-[var(--c-muted)]">{item.obra_codigo}</div> : null}
                      </td>
                      <td>{formatLabel(item.tipo_centro_custo)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="app-page-header-row mb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Acertividade na criacao por usuario</h2>
            <p className="page-subtitle">
              Mede solicitacoes criadas, quantas voltaram para ajuste e quais setores registraram essas ocorrencias.
            </p>
          </div>
        </div>
        <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Leitura:</strong> "Com ajuste" conta cada solicitacao uma unica vez. "Ocorrencias por setor" pode ser maior quando a mesma solicitacao recebeu ajuste de mais de um setor.
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable
            className="sol-table"
            columns={ACERTIVIDADE_COLUMNS}
            storageKey="fluxy.solicitacoes.relatorio.acertividadeCriacao.columns"
          >
            <thead>
              <tr>
                <SortableResizableTh
                  columnKey="usuario"
                  sortState={acertividadeSort}
                  onSort={ordenarAcertividade}
                  title="Ordenar usuario de A-Z ou Z-A"
                >
                  Usuario criador
                </SortableResizableTh>
                <SortableResizableTh
                  columnKey="criadas"
                  sortState={acertividadeSort}
                  onSort={ordenarAcertividade}
                  align="right"
                  className="text-right"
                  title="Ordenar pela quantidade de solicitacoes criadas"
                >
                  Criadas
                </SortableResizableTh>
                <SortableResizableTh
                  columnKey="ajustes"
                  sortState={acertividadeSort}
                  onSort={ordenarAcertividade}
                  align="right"
                  className="text-right"
                  title="Ordenar pela quantidade de solicitacoes com ajuste"
                >
                  Com ajuste
                </SortableResizableTh>
                <SortableResizableTh
                  columnKey="ocorrencias"
                  sortState={acertividadeSort}
                  onSort={ordenarAcertividade}
                  align="right"
                  className="text-right"
                  title="Ordenar pelo total de ocorrencias por setor"
                >
                  Ocorr. setor
                </SortableResizableTh>
                <SortableResizableTh
                  columnKey="acertividade"
                  sortState={acertividadeSort}
                  onSort={ordenarAcertividade}
                  align="right"
                  className="text-right"
                  title="Ordenar pela taxa de acertividade"
                >
                  Acertividade
                </SortableResizableTh>
                <ResizableTh columnKey="setores">Setores que pediram ajuste</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={6}>Carregando acertividade...</EmptyRow>
              ) : acertividadeCriacao.length === 0 ? (
                <EmptyRow colSpan={6}>Sem solicitacoes criadas no periodo.</EmptyRow>
              ) : (
                acertividadeCriacaoOrdenada.map((item) => (
                  <tr key={item.key}>
                    <td>{item.usuario_nome || 'Sem criador'}</td>
                    <td className="text-right">{formatNumber(item.total_criadas)}</td>
                    <td className="text-right">
                      <strong>{formatNumber(item.solicitacoes_com_ajuste)}</strong>
                      <div className="text-xs text-[var(--c-muted)]">
                        {formatPercent(item.taxa_ajuste)} das criadas
                      </div>
                    </td>
                    <td className="text-right">
                      <strong>{formatNumber(item.ocorrencias_setor_ajuste)}</strong>
                      {Number(item.solicitacoes_com_ajuste_multissetor || 0) > 0 ? (
                        <div className="text-xs text-amber-700">
                          {formatNumber(item.solicitacoes_com_ajuste_multissetor)} multi-setor
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--c-muted)]">sem multi-setor</div>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {formatPercent(item.taxa_acertividade)}
                      </span>
                    </td>
                    <td>
                      {Array.isArray(item.ajustes_por_setor) && item.ajustes_por_setor.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.ajustes_por_setor.map((setor) => (
                            <span
                              key={`${item.key}-${setor.setor}`}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                            >
                              {formatLabel(setor.setor)}: {formatNumber(setor.total)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--c-muted)]">Sem ajustes</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por tipo</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={TIPO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.tipo.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porTipo.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porTipo.map((item) => (
                    <tr key={item.key}>
                      <td>{item.tipo_nome || 'Sem tipo'}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por responsavel atual</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={USUARIO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.responsavel.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="usuario">Responsavel</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porResponsavel.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porResponsavel.map((item) => (
                    <tr key={item.key}>
                      <td>{item.usuario_nome || 'Sem responsavel'}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por criador</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={USUARIO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.criador.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="usuario">Criador</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porCriador.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porCriador.map((item) => (
                    <tr key={item.key}>
                      <td>{item.usuario_nome || 'Sem criador'}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="app-page-header-row mb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Gargalos operacionais</h2>
            <p className="page-subtitle">Solicitacoes abertas ha pelo menos 3 dias sem nova movimentacao registrada.</p>
          </div>
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={GARGALO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.gargalos.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="codigo">Solicitacao</ResizableTh>
                <ResizableTh columnKey="setor">Setor</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="responsavel">Responsavel</ResizableTh>
                <ResizableTh columnKey="obra">Obra / Centro</ResizableTh>
                <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                <ResizableTh columnKey="dias" className="text-right">Parada</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={8}>Carregando gargalos...</EmptyRow>
              ) : gargalos.length === 0 ? (
                <EmptyRow colSpan={8}>Nenhum gargalo encontrado nos filtros selecionados.</EmptyRow>
              ) : (
                gargalos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/solicitacoes/${item.id}`} className="font-bold text-[var(--c-primary)] hover:underline">
                        {item.codigo || `#${item.id}`}
                      </Link>
                      <div className="text-xs text-[var(--c-muted)]">Criada em {formatDate(item.criada_em)}</div>
                    </td>
                    <td>{formatLabel(item.setor)}</td>
                    <td>{formatLabel(item.status)}</td>
                    <td>{item.responsavel_nome || '-'}</td>
                    <td>{item.obra_nome || '-'}</td>
                    <td>{item.tipo_nome || '-'}</td>
                    <td className="text-right">
                      <strong>{formatNumber(item.dias_parada, 1)} dia(s)</strong>
                      <div className="text-xs text-[var(--c-muted)]">Ultima: {formatDate(item.ultima_movimentacao_em)}</div>
                    </td>
                    <td className="text-right">{formatCurrency(item.valor)}</td>
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
