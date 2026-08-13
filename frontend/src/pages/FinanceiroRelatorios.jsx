import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { useAuth } from '../contexts/AuthContext';
import { useUiVisibility } from '../hooks/useUiVisibility';
import {
  getContasBancarias,
  estornarConciliacaoBancaria,
  getRelatorioConciliacaoContas,
  getRelatorioFluxoCaixa,
  getRelatorioMovimentacaoContas
} from '../services/financeiro';
import { getMinhasObras } from '../services/obras';
import { canViewFinanceiroRelatorio, hasPermissao } from '../utils/acessoProduto';

const FinanceiroExecutivoGrupo = lazy(() => import('./FinanceiroExecutivoGrupo'));
const FinanceiroFluxoConsolidado = lazy(() => import('./FinanceiroFluxoConsolidado'));
const FinanceiroDre = lazy(() => import('./FinanceiroDre'));
const FinanceiroDiagnosticoDre = lazy(() => import('./FinanceiroDiagnosticoDre'));
const FinanceiroIntercompany = lazy(() => import('./FinanceiroIntercompany'));
const FinanceiroEndividamento = lazy(() => import('./FinanceiroEndividamento'));
const FinanceiroRelatorioAnalitico = lazy(() => import('./FinanceiroRelatorioAnalitico'));
const FinanceiroObras = lazy(() => import('./FinanceiroObras'));
const FinanceiroResultadoObras = lazy(() => import('./FinanceiroResultadoObras'));
const FinanceiroResultadoCentrosCusto = lazy(() => import('./FinanceiroResultadoCentrosCusto'));

const DEFAULT_FILTERS = {
  periodo: '30_DIAS',
  obra_id: '',
  data_inicial: '',
  data_final: ''
};

const EMPTY_RELATORIO = {
  filtro: {
    periodo: '30_DIAS',
    descricao: '',
    data_inicial: '',
    data_final: '',
    agrupamento: 'DIA',
    obra_id: null
  },
  resumo: {
    entradas_previstas: 0,
    saidas_previstas: 0,
    saldo_previsto: 0,
    entradas_realizadas: 0,
    saidas_realizadas: 0,
    juros_realizados: 0,
    multa_realizada: 0,
    desconto_realizado: 0,
    saldo_realizado: 0,
    variacao_realizado_vs_previsto: 0,
    titulos_previstos: 0,
    movimentos_realizados: 0
  },
  serie: []
};

const DETALHAMENTO_COLUMNS = [
  { key: 'periodo', width: 150, minWidth: 120 },
  { key: 'entradas_previstas', width: 170, minWidth: 140 },
  { key: 'saidas_previstas', width: 160, minWidth: 140 },
  { key: 'saldo_previsto', width: 150, minWidth: 130 },
  { key: 'acumulado_previsto', width: 175, minWidth: 145 },
  { key: 'entradas_realizadas', width: 175, minWidth: 145 },
  { key: 'saidas_realizadas', width: 165, minWidth: 140 },
  { key: 'saldo_realizado', width: 155, minWidth: 130 },
  { key: 'acumulado_realizado', width: 180, minWidth: 145 }
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatCompactCurrency(value) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);

  if (abs >= 1000000) {
    return `${numeric < 0 ? '-' : ''}R$ ${(abs / 1000000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} mi`;
  }

  if (abs >= 1000) {
    return `${numeric < 0 ? '-' : ''}R$ ${(abs / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} mil`;
  }

  return formatCurrency(numeric);
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function getCurrencyTone(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return 'text-emerald-700';
  if (numeric < 0) return 'text-rose-700';
  return 'text-slate-700';
}

function normalizeRelatorio(data) {
  if (!data || typeof data !== 'object') {
    return EMPTY_RELATORIO;
  }

  return {
    filtro: {
      periodo: data.filtro?.periodo || '30_DIAS',
      descricao: data.filtro?.descricao || '',
      data_inicial: data.filtro?.data_inicial || '',
      data_final: data.filtro?.data_final || '',
      agrupamento: data.filtro?.agrupamento || 'DIA',
      obra_id: data.filtro?.obra_id ?? null
    },
    resumo: {
      entradas_previstas: Number(data.resumo?.entradas_previstas || 0),
      saidas_previstas: Number(data.resumo?.saidas_previstas || 0),
      saldo_previsto: Number(data.resumo?.saldo_previsto || 0),
      entradas_realizadas: Number(data.resumo?.entradas_realizadas || 0),
      saidas_realizadas: Number(data.resumo?.saidas_realizadas || 0),
      juros_realizados: Number(data.resumo?.juros_realizados || 0),
      multa_realizada: Number(data.resumo?.multa_realizada || 0),
      desconto_realizado: Number(data.resumo?.desconto_realizado || 0),
      saldo_realizado: Number(data.resumo?.saldo_realizado || 0),
      variacao_realizado_vs_previsto: Number(data.resumo?.variacao_realizado_vs_previsto || 0),
      titulos_previstos: Number(data.resumo?.titulos_previstos || 0),
      movimentos_realizados: Number(data.resumo?.movimentos_realizados || 0)
    },
    serie: Array.isArray(data.serie)
      ? data.serie.map((item) => ({
          referencia: item.referencia || '',
          label: item.label || '',
          entradas_previstas: Number(item.entradas_previstas || 0),
          saidas_previstas: Number(item.saidas_previstas || 0),
          saldo_previsto: Number(item.saldo_previsto || 0),
          saldo_previsto_acumulado: Number(item.saldo_previsto_acumulado || 0),
          entradas_realizadas: Number(item.entradas_realizadas || 0),
          saidas_realizadas: Number(item.saidas_realizadas || 0),
          juros_realizados: Number(item.juros_realizados || 0),
          multa_realizada: Number(item.multa_realizada || 0),
          desconto_realizado: Number(item.desconto_realizado || 0),
          saldo_realizado: Number(item.saldo_realizado || 0),
          saldo_realizado_acumulado: Number(item.saldo_realizado_acumulado || 0)
        }))
      : []
  };
}

function RelatorioMetric({ label, value, detail, positive = null }) {
  const color =
    positive == null
      ? 'var(--c-text)'
      : positive
        ? '#15803d'
        : '#b91c1c';

  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color }}>
        {value}
      </strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

function buildLinePath(points) {
  if (!points.length) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildComparativoGeometry(serie, previstoKey, realizadoKey) {
  if (!serie.length) {
    return null;
  }

  const width = 920;
  const height = 180;
  const padding = { top: 16, right: 20, bottom: 36, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = serie.flatMap((item) => [
    Number(item[previstoKey] || 0),
    Number(item[realizadoKey] || 0),
    0
  ]);

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const delta = Math.max(Math.abs(min) * 0.2, 1);
    min -= delta;
    max += delta;
  }

  const getX = (index) => padding.left + (plotWidth * index) / Math.max(serie.length - 1, 1);
  const getY = (value) => padding.top + ((max - Number(value || 0)) / Math.max(max - min, 1)) * plotHeight;

  const previstoPoints = serie.map((item, index) => ({
    x: getX(index),
    y: getY(item[previstoKey]),
    raw: Number(item[previstoKey] || 0),
    label: item.label,
    referencia: item.referencia
  }));

  const realizadoPoints = serie.map((item, index) => ({
    x: getX(index),
    y: getY(item[realizadoKey]),
    raw: Number(item[realizadoKey] || 0),
    label: item.label,
    referencia: item.referencia
  }));

  const gridValues = Array.from({ length: 5 }, (_, index) => max - ((max - min) / 4) * index);
  const labelStep = Math.max(1, Math.ceil(serie.length / 7));
  const footerLabels = serie
    .map((item, index) => ({
      key: `${item.referencia}-${index}`,
      label: item.label,
      show: index === 0 || index === serie.length - 1 || index % labelStep === 0
    }))
    .filter((item) => item.show);

  return {
    width,
    height,
    padding,
    previstoPoints,
    realizadoPoints,
    previstoPath: buildLinePath(previstoPoints),
    realizadoPath: buildLinePath(realizadoPoints),
    gridValues,
    footerLabels,
    max,
    min
  };
}

function FluxoComparativoCard({ serie }) {
  const [mode, setMode] = useState('ACUMULADO');

  const modeConfig =
    mode === 'SALDO'
      ? {
          title: 'Fluxo previsto x realizado',
          subtitle: 'Comparacao do saldo de cada periodo entre o que foi projetado e o que de fato aconteceu.',
          previstoKey: 'saldo_previsto',
          realizadoKey: 'saldo_realizado'
        }
      : {
          title: 'Fluxo previsto x realizado',
          subtitle: 'Comparacao acumulada do caixa projetado contra o caixa efetivamente baixado no periodo.',
          previstoKey: 'saldo_previsto_acumulado',
          realizadoKey: 'saldo_realizado_acumulado'
        };

  const geometry = buildComparativoGeometry(serie, modeConfig.previstoKey, modeConfig.realizadoKey);
  const fechamentoPrevisto = Number(serie[serie.length - 1]?.[modeConfig.previstoKey] || 0);
  const fechamentoRealizado = Number(serie[serie.length - 1]?.[modeConfig.realizadoKey] || 0);
  const diferenca = fechamentoRealizado - fechamentoPrevisto;
  const pico = serie.reduce(
    (acc, item) => Math.max(acc, Number(item[modeConfig.previstoKey] || 0), Number(item[modeConfig.realizadoKey] || 0)),
    Number.NEGATIVE_INFINITY
  );
  const piso = serie.reduce(
    (acc, item) => Math.min(acc, Number(item[modeConfig.previstoKey] || 0), Number(item[modeConfig.realizadoKey] || 0)),
    Number.POSITIVE_INFINITY
  );

  return (
    <section className="finance-chart-card finance-chart-card--comparison">
      <div className="finance-chart-card__backdrop" />

      <div className="finance-chart-card__head">
        <div>
          <h2 className="finance-chart-card__title">{modeConfig.title}</h2>
          <p className="finance-chart-card__subtitle">{modeConfig.subtitle}</p>
        </div>

        <div className="finance-chart-card__controls">
          <div className="finance-chart-toggle-group">
            <button
              type="button"
              className={`finance-chart-toggle ${mode === 'ACUMULADO' ? 'finance-chart-toggle--active' : ''}`}
              onClick={() => setMode('ACUMULADO')}
            >
              Acumulado
            </button>
            <button
              type="button"
              className={`finance-chart-toggle ${mode === 'SALDO' ? 'finance-chart-toggle--active' : ''}`}
              onClick={() => setMode('SALDO')}
            >
              Saldo do periodo
            </button>
          </div>

          <div className="finance-chart-legend">
            <span className="finance-chart-legend-item">
              <span className="finance-chart-legend-dot finance-chart-legend-dot--previsto" />
              Previsto
            </span>
            <span className="finance-chart-legend-item">
              <span className="finance-chart-legend-dot finance-chart-legend-dot--realizado" />
              Realizado
            </span>
          </div>
        </div>
      </div>

      {!serie.length ? (
        <div className="finance-chart-empty">Nenhum movimento encontrado no periodo selecionado.</div>
      ) : (
        <>
          <div className="finance-chart-stats">
            <div className="finance-chart-stat">
              <span>Previsto</span>
              <strong>{formatCompactCurrency(fechamentoPrevisto)}</strong>
            </div>
            <div className="finance-chart-stat">
              <span>Realizado</span>
              <strong>{formatCompactCurrency(fechamentoRealizado)}</strong>
            </div>
            <div className="finance-chart-stat">
              <span>Variacao</span>
              <strong>{formatCompactCurrency(diferenca)}</strong>
            </div>
            <div className="finance-chart-stat">
              <span>Pico</span>
              <strong>{formatCompactCurrency(pico)}</strong>
            </div>
            <div className="finance-chart-stat">
              <span>Piso</span>
              <strong>{formatCompactCurrency(piso)}</strong>
            </div>
          </div>

          <div className="finance-chart-shell">
            <svg
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              className="finance-chart-svg"
              role="img"
              aria-label={`${modeConfig.title} em formato de grafico`}
            >
              <defs>
                <filter id="finance-chart-previsto-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="finance-chart-realizado-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {geometry.gridValues.map((value, index) => {
                const y =
                  geometry.padding.top +
                  ((geometry.max - value) / Math.max(geometry.max - geometry.min, 1)) *
                    (geometry.height - geometry.padding.top - geometry.padding.bottom);

                return (
                  <line
                    key={`grid-${index}`}
                    x1={geometry.padding.left}
                    y1={y}
                    x2={geometry.width - geometry.padding.right}
                    y2={y}
                    className={`finance-chart-grid ${Math.abs(value) < 0.0001 ? 'finance-chart-zero' : ''}`}
                  />
                );
              })}

              <path
                d={geometry.previstoPath}
                fill="none"
                stroke="var(--finance-chart-previsto)"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#finance-chart-previsto-glow)"
              />
              <path
                d={geometry.realizadoPath}
                fill="none"
                stroke="var(--finance-chart-realizado)"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#finance-chart-realizado-glow)"
              />

              {geometry.previstoPoints.map((point, index) => (
                <g key={`pair-${point.referencia}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.2"
                    fill="var(--finance-chart-previsto)"
                    className="finance-chart-point"
                  >
                    <title>{`${point.label} - Previsto ${formatCurrency(point.raw)}`}</title>
                  </circle>
                  <circle
                    cx={geometry.realizadoPoints[index].x}
                    cy={geometry.realizadoPoints[index].y}
                    r="4.2"
                    fill="var(--finance-chart-realizado)"
                    className="finance-chart-point finance-chart-point--secondary"
                  >
                    <title>{`${point.label} - Realizado ${formatCurrency(geometry.realizadoPoints[index].raw)}`}</title>
                  </circle>
                </g>
              ))}
            </svg>
          </div>

          <div className="finance-chart-axis">
            {geometry.footerLabels.map((item) => (
              <span key={item.key}>{item.label}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FluxoCaixaRelatorioConteudo({ isVisible }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(EMPTY_RELATORIO);
  const [loading, setLoading] = useState(true);
  const [loadingObras, setLoadingObras] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getMinhasObras({ modo: 'FINANCEIRO' })
      .then((data) => {
        if (!active) return;
        setObras(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setObras([]);
      })
      .finally(() => {
        if (active) setLoadingObras(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getRelatorioFluxoCaixa(appliedFilters)
      .then((data) => {
        if (!active) return;
        setRelatorio(normalizeRelatorio(data));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar relatorio financeiro');
        setRelatorio(EMPTY_RELATORIO);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const metaPeriodo = useMemo(() => {
    if (!relatorio.filtro?.data_inicial || !relatorio.filtro?.data_final) {
      return '';
    }

    return `${formatDate(relatorio.filtro.data_inicial)} ate ${formatDate(relatorio.filtro.data_final)}`;
  }, [relatorio.filtro]);

  const saldoProjetadoPositivo = relatorio.resumo.saldo_previsto >= 0;
  const saldoRealizadoPositivo = relatorio.resumo.saldo_realizado >= 0;
  const variacaoPositiva = relatorio.resumo.variacao_realizado_vs_previsto >= 0;

  function handlePeriodoChange(periodo) {
    setFilters((current) => ({
      ...current,
      periodo,
      data_inicial: periodo === 'PERSONALIZADO' ? current.data_inicial : '',
      data_final: periodo === 'PERSONALIZADO' ? current.data_final : ''
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters({
      ...filters
    });
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Fluxo de caixa</h1>
            <p className="page-subtitle">
              Fluxo de caixa previsto e realizado com filtro por periodo e obra.
            </p>
          </div>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="app-filter-field min-w-[150px]">
            <span className="app-filter-label">Período</span>
            <select className="input w-full input-sm" value={filters.periodo}
              onChange={(e) => handlePeriodoChange(e.target.value)}>
              <option value="HOJE">Hoje</option>
              <option value="7_DIAS">Próximos 7 dias</option>
              <option value="30_DIAS">Próximos 30 dias</option>
              <option value="90_DIAS">Próximos 90 dias</option>
              <option value="MES_ATUAL">Mês atual</option>
              <option value="PROXIMO_MES">Próximo mês</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </label>
          <label className="app-filter-field min-w-[130px]">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial}
              disabled={filters.periodo !== 'PERSONALIZADO'}
              onChange={(e) => setFilters((c) => ({ ...c, data_inicial: e.target.value }))} />
          </label>
          <label className="app-filter-field min-w-[130px]">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final}
              disabled={filters.periodo !== 'PERSONALIZADO'}
              onChange={(e) => setFilters((c) => ({ ...c, data_final: e.target.value }))} />
          </label>
          <label className="app-filter-field flex-1 min-w-[160px]">
            <span className="app-filter-label">Obra</span>
            <select className="input w-full input-sm" value={filters.obra_id}
              onChange={(e) => setFilters((c) => ({ ...c, obra_id: e.target.value }))}
              disabled={loadingObras}>
              <option value="">Todas as obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2 shrink-0">
            {metaPeriodo && (
              <span className="text-[11px] text-[var(--c-muted)] hidden md:block">
                {metaPeriodo}{relatorio.filtro?.agrupamento ? ` · por ${relatorio.filtro.agrupamento === 'MES' ? 'mês' : 'dia'}` : ''}
              </span>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar relatório</button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      ) : null}

      {isVisible('financeiro.fluxo_caixa.metricas') ? (
      <div className="app-summary-grid">
        <RelatorioMetric
          label="Entradas previstas"
          value={formatCurrency(relatorio.resumo.entradas_previstas)}
          detail={`${relatorio.resumo.titulos_previstos} titulo(s) no periodo`}
        />
        <RelatorioMetric
          label="Saidas previstas"
          value={formatCurrency(relatorio.resumo.saidas_previstas)}
          detail="Baseado no saldo atual dos titulos"
        />
        <RelatorioMetric
          label="Saldo projetado"
          value={formatCurrency(relatorio.resumo.saldo_previsto)}
          detail="Receber menos pagar"
          positive={saldoProjetadoPositivo}
        />
        <RelatorioMetric
          label="Saldo realizado"
          value={formatCurrency(relatorio.resumo.saldo_realizado)}
          detail={`${relatorio.resumo.movimentos_realizados} movimento(s) ativo(s)`}
          positive={saldoRealizadoPositivo}
        />
        <RelatorioMetric
          label="Entradas realizadas"
          value={formatCurrency(relatorio.resumo.entradas_realizadas)}
          detail="Recebimentos baixados"
        />
        <RelatorioMetric
          label="Saidas realizadas"
          value={formatCurrency(relatorio.resumo.saidas_realizadas)}
          detail="Pagamentos baixados"
        />
        <RelatorioMetric
          label="Juros realizados"
          value={formatCurrency(relatorio.resumo.juros_realizados)}
          detail="Juros informados nas baixas"
        />
        <RelatorioMetric
          label="Multa realizada"
          value={formatCurrency(relatorio.resumo.multa_realizada)}
          detail="Multas informadas nas baixas"
        />
        <RelatorioMetric
          label="Desconto realizado"
          value={formatCurrency(relatorio.resumo.desconto_realizado)}
          detail="Descontos aplicados nas baixas"
        />
        <RelatorioMetric
          label="Variacao"
          value={formatCurrency(relatorio.resumo.variacao_realizado_vs_previsto)}
          detail="Delta entre saldos liquidos"
          positive={variacaoPositiva}
        />
        <RelatorioMetric
          label="Movimentos ativos"
          value={String(relatorio.resumo.movimentos_realizados)}
          detail={`${relatorio.serie.length} ponto(s) na visualizacao`}
        />
      </div>
      ) : null}

      {loading ? (
        <div className="app-empty-card">
          Carregando relatorio de fluxo de caixa...
        </div>
      ) : (
        <>
          {isVisible('financeiro.fluxo_caixa.grafico') ? (
            <FluxoComparativoCard serie={relatorio.serie} />
          ) : null}

          {isVisible('financeiro.fluxo_caixa.detalhamento') ? (
          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Detalhamento por periodo</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Serie consolidada para acompanhar entradas, saidas e saldo acumulado.
              </p>
            </div>

            <div className="table-wrapper">
              <ResizableTable
                columns={DETALHAMENTO_COLUMNS}
                storageKey="fluxy.financeiro.relatorios.detalhamento.columnWidths"
                className="table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="periodo">Periodo</ResizableTh>
                    <ResizableTh columnKey="entradas_previstas" className="text-right">Entradas previstas</ResizableTh>
                    <ResizableTh columnKey="saidas_previstas" className="text-right">Saidas previstas</ResizableTh>
                    <ResizableTh columnKey="saldo_previsto" className="text-right">Saldo previsto</ResizableTh>
                    <ResizableTh columnKey="acumulado_previsto" className="text-right">Acumulado previsto</ResizableTh>
                    <ResizableTh columnKey="entradas_realizadas" className="text-right">Entradas realizadas</ResizableTh>
                    <ResizableTh columnKey="saidas_realizadas" className="text-right">Saidas realizadas</ResizableTh>
                    <ResizableTh columnKey="saldo_realizado" className="text-right">Saldo realizado</ResizableTh>
                    <ResizableTh columnKey="acumulado_realizado" className="text-right">Acumulado realizado</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.serie.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-[var(--c-muted)]">
                        Nenhum dado encontrado para o periodo selecionado.
                      </td>
                    </tr>
                  ) : (
                    relatorio.serie.map((item) => (
                      <tr key={item.referencia}>
                        <td className="font-medium text-[var(--c-text)]">{item.label}</td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.entradas_previstas)}</td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.saidas_previstas)}</td>
                        <td className="text-right font-medium" style={{ color: item.saldo_previsto >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(item.saldo_previsto)}
                        </td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.saldo_previsto_acumulado)}</td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.entradas_realizadas)}</td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.saidas_realizadas)}</td>
                        <td className="text-right font-medium" style={{ color: item.saldo_realizado >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(item.saldo_realizado)}
                        </td>
                        <td className="text-right text-[var(--c-text)]">{formatCurrency(item.saldo_realizado_acumulado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>
          ) : null}
        </>
      )}
    </div>
  );
}

const CONTAS_REPORT_DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  data_inicial: '',
  data_final: '',
  conta_bancaria_id: '',
  status: 'TODOS',
  tipo_conciliacao: 'TODOS',
  natureza: 'TODAS',
  busca: ''
};

function buildContaReportParams(filters, type) {
  const params = { periodo: filters.periodo, conta_bancaria_id: filters.conta_bancaria_id };
  if (filters.periodo === 'PERSONALIZADO') {
    params.data_inicial = filters.data_inicial;
    params.data_final = filters.data_final;
  }
  if (type === 'conciliacao') {
    params.status = filters.status;
    params.tipo_conciliacao = filters.tipo_conciliacao;
    params.natureza = filters.natureza;
    params.busca = filters.busca;
  }
  return params;
}

function ContaReportFilters({ filters, setFilters, contas, loading, onSubmit, type }) {
  return (
    <form className="card sol-surface-card p-4 financeiro-conta-report-filters" onSubmit={onSubmit}>
      <div className="financeiro-conta-report-filter-grid">
        <label className="field">
          <span>Periodo</span>
          <select
            value={filters.periodo}
            onChange={(event) => setFilters((current) => ({ ...current, periodo: event.target.value }))}
          >
            <option value="MES_ATUAL">Mes atual</option>
            <option value="HOJE">Hoje</option>
            <option value="30_DIAS">Proximos 30 dias</option>
            <option value="90_DIAS">Proximos 90 dias</option>
            <option value="PERSONALIZADO">Personalizado</option>
          </select>
        </label>
        {type === 'conciliacao' ? (
          <>
            <label className="field">
              <span>Status</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="TODOS">Todos os status</option>
                <option value="CONCILIADO">Conciliados</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="IGNORADO">Ignorados</option>
                <option value="REMOVIDO">Removidos</option>
              </select>
            </label>
            <label className="field">
              <span>Tipo de vinculo</span>
              <select value={filters.tipo_conciliacao} onChange={(event) => setFilters((current) => ({ ...current, tipo_conciliacao: event.target.value }))}>
                <option value="TODOS">Todos os tipos</option>
                <option value="TRANSFERENCIA">Transferencias</option>
                <option value="TITULO">Titulos</option>
                <option value="FATURA_CARTAO">Faturas de cartao</option>
                <option value="TARIFA">Tarifas bancarias</option>
                <option value="CREDITO_ROTATIVO">Credito rotativo</option>
                <option value="MOVIMENTO">Outros movimentos</option>
                <option value="SEM_VINCULO">Sem vinculo</option>
              </select>
            </label>
            <label className="field">
              <span>Natureza</span>
              <select value={filters.natureza} onChange={(event) => setFilters((current) => ({ ...current, natureza: event.target.value }))}>
                <option value="TODAS">Entradas e saidas</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA">Saidas</option>
              </select>
            </label>
            <label className="field md:col-span-2">
              <span>Buscar no extrato</span>
              <input
                type="search"
                value={filters.busca}
                placeholder="Descricao, documento ou identificador OFX"
                onChange={(event) => setFilters((current) => ({ ...current, busca: event.target.value }))}
              />
            </label>
          </>
        ) : null}
        <label className="field">
          <span>Data inicial</span>
          <input
            type="date"
            value={filters.data_inicial}
            disabled={filters.periodo !== 'PERSONALIZADO'}
            onChange={(event) => setFilters((current) => ({ ...current, data_inicial: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Data final</span>
          <input
            type="date"
            value={filters.data_final}
            disabled={filters.periodo !== 'PERSONALIZADO'}
            onChange={(event) => setFilters((current) => ({ ...current, data_final: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Conta bancaria</span>
          <select
            value={filters.conta_bancaria_id}
            onChange={(event) => setFilters((current) => ({ ...current, conta_bancaria_id: event.target.value }))}
          >
            <option value="">Todas as contas</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.nome || `${conta.banco || ''} ${conta.conta || ''}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="financeiro-conta-report-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar relatorio'}
        </button>
      </div>
    </form>
  );
}

function ContaReportShell({ title, subtitle, type }) {
  const { user } = useAuth();
  const canEstornarConciliacao = type === 'conciliacao' && hasPermissao(user, 'financeiro.conciliacao.estornar');
  const [filters, setFilters] = useState({ ...CONTAS_REPORT_DEFAULT_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...CONTAS_REPORT_DEFAULT_FILTERS });
  const [contas, setContas] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [estornoModal, setEstornoModal] = useState({ open: false, item: null, motivo: '', processing: false, error: '' });

  useEffect(() => {
    let active = true;
    getContasBancarias()
      .then((data) => {
        if (active) setContas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setContas([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const loader = type === 'conciliacao' ? getRelatorioConciliacaoContas : getRelatorioMovimentacaoContas;
    loader(buildContaReportParams(appliedFilters, type))
      .then((data) => {
        if (active) setRelatorio(data);
      })
      .catch((err) => {
        if (!active) return;
        setRelatorio(null);
        setError(err?.message || 'Erro ao gerar relatorio');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, type]);

  function handleSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  async function handleEstornarConciliacao(event) {
    event.preventDefault();
    const motivo = String(estornoModal.motivo || '').trim();
    if (!estornoModal.item?.id || !motivo || estornoModal.processing) return;
    try {
      setEstornoModal((current) => ({ ...current, processing: true, error: '' }));
      await estornarConciliacaoBancaria(estornoModal.item.id, { motivo });
      setEstornoModal({ open: false, item: null, motivo: '', processing: false, error: '' });
      const data = await getRelatorioConciliacaoContas(buildContaReportParams(appliedFilters, type));
      setRelatorio(data);
    } catch (err) {
      setEstornoModal((current) => ({ ...current, processing: false, error: err?.message || 'Erro ao estornar conciliacao' }));
    }
  }

  const resumo = relatorio?.resumo || {};
  const sintetico = Array.isArray(relatorio?.sintetico) ? relatorio.sintetico : [];
  const analitico = Array.isArray(relatorio?.analitico) ? relatorio.analitico : [];

  return (
    <div className="financeiro-conta-report-shell space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <ContaReportFilters
        filters={filters}
        setFilters={setFilters}
        contas={contas}
        loading={loading}
        onSubmit={handleSubmit}
        type={type}
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {relatorio ? (
        <>
          <div className="app-summary-grid app-summary-grid--compact financeiro-report-summary-grid">
            <RelatorioMetric label="Contas" value={resumo.contas || 0} />
            <RelatorioMetric label="Movimentos" value={resumo.movimentos || 0} />
            {type === 'conciliacao' ? (
              <>
                <RelatorioMetric label="Conciliados" value={resumo.conciliados || 0} positive />
                <RelatorioMetric label="Pendentes" value={resumo.pendentes || 0} positive={Number(resumo.pendentes || 0) === 0} />
                <RelatorioMetric label="Ignorados/removidos" value={`${resumo.ignorados || 0}/${resumo.removidos || 0}`} />
                <RelatorioMetric label="Transferencias" value={resumo.transferencias || 0} />
              </>
            ) : (
              <>
                <RelatorioMetric label="Entradas" value={formatCurrency(resumo.entradas)} positive />
                <RelatorioMetric label="Saidas" value={formatCurrency(resumo.saidas)} positive={false} />
                <RelatorioMetric label="Saldo liquido" value={formatCurrency(resumo.saldo_liquido)} positive={Number(resumo.saldo_liquido || 0) >= 0} />
                <RelatorioMetric label="Permutas" value={formatCurrency(resumo.permutas)} detail="Separadas do caixa bancario" />
              </>
            )}
          </div>

          <section className="card sol-surface-card p-4 financeiro-report-card">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-950">Sintetico por conta</h3>
              <p className="text-xs text-slate-500">{relatorio.filtro?.descricao || 'Periodo selecionado'}</p>
            </div>
            <div className="table-responsive">
              <ResizableTable
                storageKey={`financeiro-relatorio-${type}-sintetico`}
                columns={[
                  { key: 'conta', width: 320, minWidth: 220 },
                  { key: 'movimentos', width: 120, minWidth: 100 },
                  { key: 'entradas', width: 150, minWidth: 120 },
                  { key: 'saidas', width: 150, minWidth: 120 },
                  { key: 'saldo', width: 150, minWidth: 120 },
                  { key: 'status', width: 220, minWidth: 160 }
                ]}
                className="table financeiro-report-table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="conta">Conta</ResizableTh>
                    <ResizableTh columnKey="movimentos" className="text-right">Movimentos</ResizableTh>
                    <ResizableTh columnKey="entradas" className="text-right">{type === 'conciliacao' ? 'Conciliados' : 'Entradas'}</ResizableTh>
                    <ResizableTh columnKey="saidas" className="text-right">{type === 'conciliacao' ? 'Pendentes' : 'Saidas'}</ResizableTh>
                    <ResizableTh columnKey="saldo" className="text-right">{type === 'conciliacao' ? 'Ignor./remov.' : 'Saldo'}</ResizableTh>
                    <ResizableTh columnKey="status">Observacao</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {sintetico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    sintetico.map((item) => (
                      <tr key={item.conta_bancaria_id || item.conta}>
                        <td className="font-medium text-slate-950">{item.conta}</td>
                        <td className="text-right">{item.movimentos}</td>
                        <td className="text-right">{type === 'conciliacao' ? item.conciliados : formatCurrency(item.entradas)}</td>
                        <td className="text-right">{type === 'conciliacao' ? item.pendentes : formatCurrency(item.saidas)}</td>
                        <td className="text-right">
                          {type === 'conciliacao'
                            ? `${item.ignorados || 0}/${item.removidos || 0}`
                            : formatCurrency(item.saldo_liquido)}
                        </td>
                        <td className="text-slate-500">
                          {type === 'conciliacao'
                            ? `${item.conciliados || 0} conciliado(s), ${item.pendentes || 0} pendente(s)`
                            : Number(item.permutas || 0) > 0
                              ? `${formatCurrency(item.permutas)} em permutas`
                              : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>

          <section className="card sol-surface-card p-4 financeiro-report-card">
            <h3 className="mb-3 text-base font-semibold text-slate-950">Analitico</h3>
            <div className="table-responsive">
              <ResizableTable
                storageKey={`financeiro-relatorio-${type}-analitico`}
                columns={[
                  { key: 'data', width: 120, minWidth: 105 },
                  { key: 'conta', width: 240, minWidth: 170 },
                  { key: 'status', width: 130, minWidth: 110 },
                  ...(type === 'conciliacao' ? [{ key: 'natureza', width: 120, minWidth: 105 }] : []),
                  { key: 'titulo', width: 150, minWidth: 120 },
                  { key: 'parceiro', width: 200, minWidth: 150 },
                  { key: 'obra', width: 170, minWidth: 130 },
                  { key: 'documento', width: 190, minWidth: 145 },
                  { key: 'valor', width: 140, minWidth: 120 },
                  ...(type === 'movimentacao' ? [{ key: 'saldo', width: 140, minWidth: 120 }] : []),
                  { key: 'descricao', width: 280, minWidth: 210 },
                  ...(type === 'conciliacao' && canEstornarConciliacao ? [{ key: 'acoes', width: 130, minWidth: 120 }] : [])
                ]}
                className="table financeiro-report-table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="data">Data</ResizableTh>
                    <ResizableTh columnKey="conta">Conta</ResizableTh>
                    <ResizableTh columnKey="status">{type === 'conciliacao' ? 'Status' : 'Classe'}</ResizableTh>
                    {type === 'conciliacao' ? <ResizableTh columnKey="natureza">Natureza</ResizableTh> : null}
                    <ResizableTh columnKey="titulo">{type === 'conciliacao' ? 'Vinculo' : 'Titulo'}</ResizableTh>
                    <ResizableTh columnKey="parceiro">Cliente/Fornecedor</ResizableTh>
                    <ResizableTh columnKey="obra">Obra</ResizableTh>
                    <ResizableTh columnKey="documento">Documento</ResizableTh>
                    <ResizableTh columnKey="valor" className="text-right">
                      {type === 'movimentacao' ? 'Movimento' : 'Valor'}
                    </ResizableTh>
                    {type === 'movimentacao' ? (
                      <ResizableTh columnKey="saldo" className="text-right">Saldo</ResizableTh>
                    ) : null}
                    <ResizableTh columnKey="descricao">Descricao</ResizableTh>
                    {type === 'conciliacao' && canEstornarConciliacao ? <ResizableTh columnKey="acoes">Acoes</ResizableTh> : null}
                  </tr>
                </thead>
                <tbody>
                  {analitico.length === 0 ? (
                    <tr>
                      <td colSpan={10 + (type === 'conciliacao' && canEstornarConciliacao ? 1 : 0)} className="text-center text-slate-500">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    analitico.map((item) => {
                      const valorMovimento = type === 'movimentacao'
                        ? Number(item.valor_movimento ?? item.valor_quitacao ?? item.valor)
                        : Number(item.valor_quitacao ?? item.valor);
                      return (
                        <tr key={item.id}>
                          <td>{formatDate(item.data_movimento)}</td>
                          <td>{item.conta}</td>
                          <td>
                            <span className="badge badge-soft">{type === 'conciliacao' ? item.status : item.classe}</span>
                          </td>
                          {type === 'conciliacao' ? (
                            <td>
                              <span className={`badge ${item.natureza === 'SAIDA' ? 'badge-danger' : 'badge-success'}`}>
                                {item.natureza === 'SAIDA' ? 'Saída' : 'Entrada'}
                              </span>
                            </td>
                          ) : null}
                          <td>
                            {item.tipo_conciliacao === 'TRANSFERENCIA'
                              ? `Transferencia #${item.transferencia_financeira_id}`
                              : item.tipo_conciliacao === 'FATURA_CARTAO'
                                ? `Fatura #${item.fatura_cartao_id}`
                                : item.tipo_conciliacao === 'TARIFA'
                                  ? `Tarifa · mov. #${item.movimento_financeiro_id}`
                                  : item.tipo_conciliacao === 'CREDITO_ROTATIVO'
                                    ? `${item.natureza === 'SAIDA' ? 'Amortizacao' : 'Liberacao'} · mov. #${item.movimento_financeiro_id}`
                                  : item.titulo_codigo || (item.movimento_financeiro_id ? `Mov. #${item.movimento_financeiro_id}` : '-')}
                          </td>
                          <td>{item.parceiro || '-'}</td>
                          <td>{item.obra || '-'}</td>
                          <td>{item.documento || item.ofx_uid || '-'}</td>
                          <td className={`text-right font-semibold ${getCurrencyTone(valorMovimento)}`}>
                            {formatCurrency(valorMovimento)}
                          </td>
                          {type === 'movimentacao' ? (
                            <td className={`text-right font-semibold ${getCurrencyTone(item.saldo_movimento)}`}>
                              {formatCurrency(item.saldo_movimento)}
                            </td>
                          ) : null}
                          <td>
                            {item.tipo_conciliacao === 'TRANSFERENCIA'
                              ? `${item.conta_origem || 'Origem'} → ${item.conta_destino || 'Destino'}${item.transferencia_descricao ? ` · ${item.transferencia_descricao}` : ''}`
                              : item.descricao_banco || item.categoria || item.observacoes || '-'}
                          </td>
                          {type === 'conciliacao' && canEstornarConciliacao ? (
                            <td>
                              {item.status === 'CONCILIADO'
                                && (item.tipo_conciliacao !== 'TRANSFERENCIA' || item.transferencia_status === 'ATIVA') ? (
                                <button type="button" className="btn btn-outline btn-sm text-rose-600" onClick={() => setEstornoModal({ open: true, item, motivo: '', processing: false, error: '' })}>
                                  Estornar
                                </button>
                              ) : '-'}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>
        </>
      ) : null}

      {estornoModal.open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <form className="w-full max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-2xl" onSubmit={handleEstornarConciliacao}>
            <h3 className="text-lg font-semibold text-[var(--c-text)]">Estornar conciliacao bancaria</h3>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              {estornoModal.item?.tipo_conciliacao === 'TRANSFERENCIA'
                ? 'A transferencia sera cancelada e os lancamentos OFX vinculados voltarao para pendente.'
                : estornoModal.item?.tipo_conciliacao === 'TARIFA'
                  ? 'A tarifa criada pela conciliacao sera estornada e o lancamento OFX voltara para pendente.'
                  : estornoModal.item?.tipo_conciliacao === 'CREDITO_ROTATIVO'
                    ? 'O movimento de credito rotativo sera estornado e o lancamento OFX voltara para pendente.'
                  : 'O vinculo sera desfeito sem apagar o registro financeiro original, e o lancamento OFX voltara para pendente.'}
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium">Motivo do estorno *</span>
              <textarea className="input min-h-24 w-full resize-y" maxLength={255} value={estornoModal.motivo} onChange={(event) => setEstornoModal((current) => ({ ...current, motivo: event.target.value, error: '' }))} />
            </label>
            {estornoModal.error ? <div className="mt-3 alert alert-danger">{estornoModal.error}</div> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-outline" disabled={estornoModal.processing} onClick={() => setEstornoModal({ open: false, item: null, motivo: '', processing: false, error: '' })}>Cancelar</button>
              <button type="submit" className="btn btn-danger" disabled={estornoModal.processing || !String(estornoModal.motivo || '').trim()}>{estornoModal.processing ? 'Estornando...' : 'Confirmar estorno'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MovimentacaoContasRelatorioConteudo() {
  return (
    <ContaReportShell
      type="movimentacao"
      title="Movimentacao de contas"
      subtitle="Relatorio sintetico e analitico das movimentacoes por conta bancaria, separando permutas do caixa."
    />
  );
}

function ConciliacaoContasRelatorioConteudo() {
  return (
    <ContaReportShell
      type="conciliacao"
      title="Conciliacao bancaria"
      subtitle="Relatorio sintetico e analitico dos movimentos importados, conciliados, pendentes, ignorados e removidos."
    />
  );
}

const REPORT_CATALOG = [
  {
    id: 'fluxo-caixa',
    title: 'Fluxo de caixa',
    group: 'Caixa',
    description: 'Previsto e realizado por periodo e obra.',
    route: '/financeiro/relatorios',
    permissionKey: 'financeiro.relatorios.visualizar',
    embedded: true,
    component: FluxoCaixaRelatorioConteudo
  },
  {
    id: 'grupo-consolidado',
    title: 'Grupo Consolidado',
    group: 'Executivo',
    description: 'Visao consolidada do grupo e indicadores executivos.',
    route: '/financeiro/relatorios/grupo-consolidado',
    permissionKey: 'financeiro.relatorios.grupo_consolidado',
    visibilityKey: 'relatorios.financeiro.grupo_consolidado',
    component: FinanceiroExecutivoGrupo
  },
  {
    id: 'fluxo-consolidado',
    title: 'Fluxo Consolidado',
    group: 'Caixa',
    description: 'Fluxo consolidado entre empresas do grupo.',
    route: '/financeiro/relatorios/fluxo-consolidado',
    permissionKey: 'financeiro.relatorios.fluxo_consolidado',
    visibilityKey: 'relatorios.financeiro.fluxo_consolidado',
    component: FinanceiroFluxoConsolidado
  },
  {
    id: 'dre',
    title: 'DRE',
    group: 'Resultado',
    description: 'Resultado gerencial por categorias financeiras.',
    route: '/financeiro/relatorios/dre',
    permissionKey: 'financeiro.relatorios.dre',
    visibilityKey: 'relatorios.financeiro.dre',
    component: FinanceiroDre
  },
  {
    id: 'diagnostico-dre',
    title: 'Diagnostico DRE',
    group: 'Resultado',
    description: 'Consistencias e pendencias que impactam a DRE.',
    route: '/financeiro/relatorios/dre/diagnostico',
    permissionKey: 'financeiro.relatorios.diagnostico_dre',
    visibilityKey: 'relatorios.financeiro.diagnostico_dre',
    component: FinanceiroDiagnosticoDre
  },
  {
    id: 'entre-empresas',
    title: 'Entre Empresas',
    group: 'Governanca',
    description: 'Movimentos entre empresas e eliminacoes no consolidado.',
    route: '/financeiro/relatorios/intercompany',
    permissionKey: 'financeiro.relatorios.intercompany',
    visibilityKey: 'relatorios.financeiro.intercompany',
    component: FinanceiroIntercompany
  },
  {
    id: 'endividamento',
    title: 'Endividamento',
    group: 'Bancos',
    description: 'Acompanhamento de dividas e compromissos bancarios.',
    route: '/financeiro/relatorios/endividamento',
    permissionKey: 'financeiro.relatorios.endividamento',
    visibilityKey: 'relatorios.financeiro.endividamento',
    component: FinanceiroEndividamento
  },
  {
    id: 'movimentacao-contas',
    title: 'Movimentacao de Contas',
    group: 'Bancos',
    description: 'Sintetico e analitico de entradas, saidas e permutas por conta.',
    route: '/financeiro/relatorios?relatorio=movimentacao-contas',
    permissionKey: 'financeiro.relatorios.movimentacao_contas',
    visibilityKey: 'relatorios.financeiro.movimentacao_contas',
    embedded: true,
    component: MovimentacaoContasRelatorioConteudo
  },
  {
    id: 'conciliacao-contas',
    title: 'Conciliacao Bancaria',
    group: 'Bancos',
    description: 'Sintetico e analitico dos OFX conciliados, pendentes e ignorados.',
    route: '/financeiro/relatorios?relatorio=conciliacao-contas',
    permissionKey: 'financeiro.relatorios.conciliacao_contas',
    visibilityKey: 'relatorios.financeiro.conciliacao_contas',
    embedded: true,
    component: ConciliacaoContasRelatorioConteudo
  },
  {
    id: 'analitico',
    title: 'Analitico',
    group: 'Titulos',
    description: 'Extrato analitico dos titulos financeiros.',
    route: '/financeiro/relatorios/analitico',
    permissionKey: 'financeiro.relatorios.analitico',
    visibilityKey: 'relatorios.financeiro.analitico',
    component: FinanceiroRelatorioAnalitico
  },
  {
    id: 'financeiro-obras',
    title: 'Financeiro de Obras',
    group: 'Obras',
    description: 'Realizado, comprometido e a realizar por obra.',
    route: '/financeiro/relatorios/financeiro-obras',
    permissionKey: 'financeiro.relatorios.financeiro_obras',
    visibilityKey: 'relatorios.financeiro.financeiro_obras',
    component: FinanceiroObras
  },
  {
    id: 'resultado-obras',
    title: 'Resultado de Obras',
    group: 'Obras',
    description: 'Resultado financeiro agregado por obra.',
    route: '/financeiro/relatorios/resultado-obras',
    permissionKey: 'financeiro.relatorios.resultado_obras',
    visibilityKey: 'relatorios.financeiro.resultado_obras',
    component: FinanceiroResultadoObras
  },
  {
    id: 'centros-custo',
    title: 'Centros de Custo',
    group: 'Obras',
    description: 'Resultado agrupado por centro de custo.',
    route: '/financeiro/relatorios/centros-custo',
    permissionKey: 'financeiro.relatorios.centros_custo',
    visibilityKey: 'relatorios.financeiro.centros_custo',
    component: FinanceiroResultadoCentrosCusto
  }
];

function ReportListItem({ report, active, onClick }) {
  return (
    <button
      type="button"
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
      }`}
      onClick={onClick}
    >
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {report.group}
      </span>
      <span className="block text-sm font-semibold text-slate-950">{report.title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{report.description}</span>
    </button>
  );
}

function getReportFullScreenRoute(report) {
  if (!report.embedded) {
    return report.route;
  }

  const params = new URLSearchParams({
    relatorio: report.id,
    tela: 'inteira'
  });

  return `/financeiro/relatorios?${params.toString()}`;
}

export default function FinanceiroRelatorios() {
  const { user } = useAuth();
  const { isVisible } = useUiVisibility();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const isFullScreenMode = searchParams.get('tela') === 'inteira';

  const availableReports = useMemo(
    () => REPORT_CATALOG.filter((report) => (
      canViewFinanceiroRelatorio(user, report.permissionKey) &&
      (!report.visibilityKey || isVisible(report.visibilityKey))
    )),
    [isVisible, user]
  );

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return availableReports;

    return availableReports.filter((report) =>
      [report.title, report.group, report.description].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [availableReports, search]);

  const selectedId = searchParams.get('relatorio') || availableReports[0]?.id || 'fluxo-caixa';
  const selectedReport =
    availableReports.find((report) => report.id === selectedId) || availableReports[0] || null;

  if (!selectedReport) {
    return (
      <div className="page solicitacoes-page financeiro-relatorios-page">
        <div className="empty-state">
          <strong>Nenhum relatorio financeiro liberado.</strong>
          <span>Solicite ao administrador a permissao granular para acessar relatorios financeiros.</span>
        </div>
      </div>
    );
  }

  const SelectedReportComponent = selectedReport.component;

  function selectReport(report) {
    setSearchParams(report.id === 'fluxo-caixa' ? {} : { relatorio: report.id });
  }

  if (isFullScreenMode && selectedReport.embedded) {
    return (
      <div className="page solicitacoes-page financeiro-relatorios-page financeiro-relatorios-page--full">
        <div className="app-page-header">
          <div className="app-page-header-row">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {selectedReport.group}
              </span>
              <h1 className="text-xl font-semibold md:text-2xl">{selectedReport.title}</h1>
              <p className="page-subtitle">{selectedReport.description}</p>
            </div>
            <div className="app-page-actions">
              <Link to="/financeiro/relatorios" className="btn btn-outline">
                Voltar para relatorios
              </Link>
            </div>
          </div>
        </div>

        <div className="financeiro-relatorios-content">
          <Suspense fallback={<div className="app-empty-card">Carregando relatorio...</div>}>
            <SelectedReportComponent isVisible={isVisible} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page financeiro-relatorios-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Financeiro
            </span>
            <h1 className="text-xl font-semibold md:text-2xl">Relatorios Financeiros</h1>
            <p className="page-subtitle">
              Escolha um relatorio na coluna lateral e trabalhe no painel principal sem perder contexto.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/contas-a-receber" className="btn btn-outline">
              Contas a Receber
            </Link>
            <Link to="/financeiro/contas-a-pagar" className="btn btn-outline">
              Contas a Pagar
            </Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline">
              Cadastros
            </Link>
          </div>
        </div>
      </div>

      <div className="financeiro-relatorios-layout grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="card sol-surface-card financeiro-relatorios-sidebar h-fit xl:sticky xl:top-4">
          <div className="border-b border-[var(--c-border)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Relatorios</h2>
                <p className="text-xs text-slate-500">{availableReports.length} disponivel(is)</p>
              </div>
            </div>
            <input
              type="search"
              className="input mt-3 w-full input-sm"
              placeholder="Buscar relatorio..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="max-h-[calc(100vh-270px)] space-y-2 overflow-y-auto p-3">
            {filteredReports.length ? (
              filteredReports.map((report) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  active={selectedReport.id === report.id}
                  onClick={() => selectReport(report)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Nenhum relatorio encontrado para essa busca.
              </div>
            )}
          </div>
        </aside>

        <section className="financeiro-relatorios-content min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {selectedReport.group}
              </span>
              <h2 className="text-lg font-semibold text-slate-950">{selectedReport.title}</h2>
            </div>
            <Link to={getReportFullScreenRoute(selectedReport)} className="btn btn-outline btn-sm">
              Abrir tela inteira
            </Link>
          </div>

          <Suspense fallback={<div className="app-empty-card">Carregando relatorio...</div>}>
            <SelectedReportComponent isVisible={isVisible} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
