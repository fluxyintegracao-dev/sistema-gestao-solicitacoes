import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRelatorioFluxoCaixa } from '../services/financeiro';
import { getMinhasObras } from '../services/obras';

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

export default function FinanceiroRelatorios() {
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
            <h1 className="text-xl font-semibold md:text-2xl">Relatorios Financeiros</h1>
            <p className="page-subtitle">
              Fluxo de caixa previsto e realizado com filtro por periodo e obra.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios/dre" className="btn btn-outline">
              DRE
            </Link>
            <Link to="/financeiro/relatorios/dre/diagnostico" className="btn btn-outline">
              Diagnostico DRE
            </Link>
            <Link to="/financeiro/relatorios/analitico" className="btn btn-outline">
              Analitico
            </Link>
            <Link to="/financeiro/baixas" className="btn btn-outline">
              Baixas
            </Link>
            <Link to="/financeiro/relatorios/resultado-obras" className="btn btn-outline">
              Resultado de Obras
            </Link>
            <Link to="/financeiro/relatorios/centros-custo" className="btn btn-outline">
              Centros de Custo
            </Link>
            <Link to="/financeiro/titulos" className="btn btn-outline">
              Titulos
            </Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline">
              Cadastros
            </Link>
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
          detail="Realizado menos projetado"
          positive={variacaoPositiva}
        />
        <RelatorioMetric
          label="Movimentos ativos"
          value={String(relatorio.resumo.movimentos_realizados)}
          detail={`${relatorio.serie.length} ponto(s) na visualizacao`}
        />
      </div>

      {loading ? (
        <div className="app-empty-card">
          Carregando relatorio de fluxo de caixa...
        </div>
      ) : (
        <>
          <FluxoComparativoCard serie={relatorio.serie} />

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Detalhamento por periodo</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Serie consolidada para acompanhar entradas, saidas e saldo acumulado.
              </p>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Entradas previstas</th>
                    <th>Saidas previstas</th>
                    <th>Saldo previsto</th>
                    <th>Acumulado previsto</th>
                    <th>Entradas realizadas</th>
                    <th>Saidas realizadas</th>
                    <th>Saldo realizado</th>
                    <th>Acumulado realizado</th>
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
                        <td className="text-[var(--c-text)]">{formatCurrency(item.entradas_previstas)}</td>
                        <td className="text-[var(--c-text)]">{formatCurrency(item.saidas_previstas)}</td>
                        <td className="font-medium" style={{ color: item.saldo_previsto >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(item.saldo_previsto)}
                        </td>
                        <td className="text-[var(--c-text)]">{formatCurrency(item.saldo_previsto_acumulado)}</td>
                        <td className="text-[var(--c-text)]">{formatCurrency(item.entradas_realizadas)}</td>
                        <td className="text-[var(--c-text)]">{formatCurrency(item.saidas_realizadas)}</td>
                        <td className="font-medium" style={{ color: item.saldo_realizado >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(item.saldo_realizado)}
                        </td>
                        <td className="text-[var(--c-text)]">{formatCurrency(item.saldo_realizado_acumulado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
