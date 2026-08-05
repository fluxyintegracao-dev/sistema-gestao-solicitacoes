import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineScale,
  HiOutlineWallet
} from 'react-icons/hi2';
import { obterCustosRecebiveisDashboard } from '../services/custosRecebiveis';
import CrMonthlySummaryCard from './CrMonthlySummaryCard';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC'
});

function formatMonth(value) {
  if (!value) return '—';
  const date = new Date(`${value}-01T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : monthFormatter.format(date).replace('.', '');
}

function formatPercent(value) {
  return value == null
    ? 'Sem base'
    : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function Metric({ label, value, tone = 'neutral', helper = null }) {
  return (
    <div className="cr-ops-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

function TrendPanel({
  title,
  icon: Icon,
  rows,
  primaryKey,
  primaryLabel,
  secondaryKey,
  secondaryLabel
}) {
  const maxValue = useMemo(() => Math.max(
    1,
    ...rows.flatMap((row) => [
      Number(row[primaryKey]) || 0,
      Number(row[secondaryKey]) || 0
    ])
  ), [primaryKey, rows, secondaryKey]);

  return (
    <section className="cr-section cr-trend-panel">
      <div className="cr-trend-heading">
        <div>
          <Icon className="h-5 w-5" />
          <strong>{title}</strong>
        </div>
        <div className="cr-trend-legend" aria-label="Legenda">
          <span data-series="primary">{primaryLabel}</span>
          <span data-series="secondary">{secondaryLabel}</span>
        </div>
      </div>
      <div className="cr-trend-list">
        {rows.map((row) => {
          const primary = Number(row[primaryKey]) || 0;
          const secondary = Number(row[secondaryKey]) || 0;
          return (
            <div className="cr-trend-row" key={`${title}-${row.competencia}`}>
              <span>{formatMonth(row.competencia)}</span>
              <div className="cr-trend-bars">
                <i
                  data-series="primary"
                  style={{ width: `${Math.max(0, (primary / maxValue) * 100)}%` }}
                  title={`${primaryLabel}: ${currency.format(primary)}`}
                />
                <i
                  data-series="secondary"
                  style={{ width: `${Math.max(0, (secondary / maxValue) * 100)}%` }}
                  title={`${secondaryLabel}: ${currency.format(secondary)}`}
                />
              </div>
              <strong>{currency.format(secondary)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function CrDashboardView({
  competencia,
  canOpenPlanning = false,
  onOpenArea
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setData(await obterCustosRecebiveisDashboard(competencia));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar visão geral.');
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => {
    void load();
  }, [load]);

  const isWorkContext = data?.escopo?.tipo === 'OBRA';
  const classification = String(data?.escopo?.obra?.classificacao || '').toUpperCase();
  const cards = data?.cards || {};
  const history = Array.isArray(data?.historico) ? data.historico : [];
  const alerts = Array.isArray(data?.alertas) ? data.alertas : [];
  const macros = Array.isArray(data?.macros) ? data.macros : [];
  const workSummaries = Array.isArray(data?.obras_resumo) ? data.obras_resumo : [];
  const costDeviation = Number(cards.desvio_custo) || 0;

  if (loading && !data) {
    return <section className="cr-section cr-empty-state">Carregando visão geral...</section>;
  }
  if (error) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineExclamationTriangle className="h-6 w-6" />
        <strong>Não foi possível carregar o dashboard</strong>
        <span>{error}</span>
        <button type="button" className="btn btn-outline" onClick={load}>Tentar novamente</button>
      </section>
    );
  }

  return (
    <div className="cr-ops-dashboard">
      <section className="cr-section cr-ops-overview">
        <div className="cr-section-heading">
          <div>
            <span className="cr-scope-kicker">
              {isWorkContext ? 'Obra em contexto' : 'Carteira consolidada'}
            </span>
            <h2>
              {isWorkContext
                ? `${data?.escopo?.obra?.codigo || data?.escopo?.obra?.id} · ${data?.escopo?.obra?.nome}`
                : `${data?.escopo?.total_obras || 0} obra(s) no seu escopo`}
            </h2>
            <p>
              Competência {formatMonth(competencia)} · valores realizados consideram baixas financeiras ativas.
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
            <HiOutlineArrowPath className="h-4 w-4" />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="cr-ops-ledger">
          <div className="cr-ops-ledger__group">
            <div className="cr-ops-ledger__title">
              <HiOutlineWallet />
              <span>Custos</span>
            </div>
            <div className="cr-ops-metrics">
              <Metric label="Planejado" value={currency.format(cards.custo_planejado || 0)} />
              <Metric
                label="Realizado"
                value={currency.format(cards.custo_realizado || 0)}
                tone="actual"
              />
              <Metric
                label="Desvio"
                value={currency.format(costDeviation)}
                tone={costDeviation > 0 ? 'negative' : 'positive'}
              />
              <Metric
                label="Execução"
                value={formatPercent(cards.percentual_custo)}
                tone={Number(cards.percentual_custo) > 100 ? 'negative' : 'neutral'}
              />
            </div>
          </div>

          <div className="cr-ops-ledger__group">
            <div className="cr-ops-ledger__title">
              <HiOutlineBanknotes />
              <span>Recebíveis</span>
            </div>
            <div className="cr-ops-metrics">
              <Metric
                label={classification === 'PUBLICA' ? 'Medição prevista' : 'Previsto'}
                value={currency.format(cards.recebivel_previsto || 0)}
              />
              {classification !== 'PRIVADA' ? (
                <Metric
                  label={classification === 'PUBLICA' ? 'Medição aprovada' : 'Reconhecido'}
                  value={
                    classification === 'PUBLICA' && !cards.tem_medicao_aprovada
                      ? 'Aguardando'
                      : currency.format(cards.recebivel_reconhecido || 0)
                  }
                />
              ) : null}
              {classification !== 'PRIVADA' ? (
                <Metric
                  label="Glosa"
                  value={currency.format(cards.glosa || 0)}
                  tone={Number(cards.glosa) > 0 ? 'negative' : 'neutral'}
                />
              ) : null}
              <Metric
                label="Recebido"
                value={currency.format(cards.receita_recebida || 0)}
                tone="actual"
              />
              <Metric
                label="Saldo a receber"
                value={currency.format(cards.saldo_receber || 0)}
                tone={Number(cards.saldo_receber) > 0 ? 'warning' : 'positive'}
              />
              {classification === 'PRIVADA' ? (
                <Metric
                  label="Títulos vencidos"
                  value={String(cards.recebiveis_vencidos || 0)}
                  tone={Number(cards.recebiveis_vencidos) > 0 ? 'negative' : 'neutral'}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="cr-section cr-portfolio-planning">
        <div className="cr-section-heading">
          <div>
            <span className="cr-scope-kicker">Decisão por obra</span>
            <h2>Planejamento mensal por obra</h2>
            <p>
              Competência {formatMonth(competencia)} · compare previsão, realização e recebimento
              sem perder o consolidado da carteira.
            </p>
          </div>
          <HiOutlineBuildingOffice2 className="h-5 w-5 cr-heading-icon" />
        </div>

        {workSummaries.length ? (
          <div className="cr-portfolio-planning__grid">
            {workSummaries.map((item) => (
              <CrMonthlySummaryCard
                key={`${item.obra.id}-${item.competencia}`}
                title={item.obra.nome}
                eyebrow={`${item.obra.codigo || item.obra.id} · ${formatMonth(item.competencia)}`}
                classification={item.obra.classificacao}
                status={item.estado_competencia}
                custoPlanejado={item.custo_planejado}
                custoRealizado={item.custo_realizado}
                recebivelPrevisto={item.recebivel_previsto}
                recebivelReconhecido={item.recebivel_reconhecido}
                receitaRecebida={item.receita_recebida}
                medicaoAprovadaInformada={item.medicao_aprovada != null}
                glosa={item.glosa}
                actionLabel="Abrir planejamento"
                onOpen={canOpenPlanning
                  ? () => onOpenArea?.({
                    destino: 'planejamento',
                    obra_id: item.obra.id,
                    competencia: item.competencia
                  })
                  : null}
              />
            ))}
          </div>
        ) : (
          <div className="cr-empty-state">
            Nenhuma obra disponível no seu escopo para esta competência.
          </div>
        )}
      </section>

      <div className="cr-dashboard-trends">
        <TrendPanel
          title="Evolução de custos"
          icon={HiOutlineScale}
          rows={history}
          primaryKey="custo_planejado"
          primaryLabel="Planejado"
          secondaryKey="custo_realizado"
          secondaryLabel="Realizado"
        />
        <TrendPanel
          title="Evolução de recebíveis"
          icon={HiOutlineBanknotes}
          rows={history}
          primaryKey="recebivel_reconhecido"
          primaryLabel="Reconhecido"
          secondaryKey="receita_recebida"
          secondaryLabel="Recebido"
        />
      </div>

      <section className="cr-section cr-attention-panel">
        <div className="cr-section-heading">
          <div>
            <h2>Pontos de atenção</h2>
            <p>Somente situações que exigem conferência ou ação operacional.</p>
          </div>
          <span className="cr-attention-count" data-empty={!alerts.length}>
            {alerts.length} {alerts.length === 1 ? 'ocorrência' : 'ocorrências'}
          </span>
        </div>
        {alerts.length ? (
          <div className="cr-attention-list">
            {alerts.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cr-attention-row"
                data-tone={item.tom}
                onClick={() => onOpenArea?.(item)}
              >
                <span className="cr-attention-row__marker" aria-hidden="true" />
                <div>
                  <strong>{item.titulo}</strong>
                  <span>{item.descricao}</span>
                </div>
                <small>{formatMonth(item.competencia)}</small>
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : (
          <div className="cr-empty-state cr-empty-state--positive">
            <HiOutlineCheckCircle className="h-5 w-5" />
            Nenhuma exceção operacional identificada nesta competência.
          </div>
        )}
      </section>

      {isWorkContext ? (
        <section className="cr-section cr-macro-detail">
          <div className="cr-section-heading">
            <div>
              <h2>Custos por macro</h2>
              <p>Somente macros com planejamento ou realização na obra selecionada.</p>
            </div>
            <HiOutlineBuildingOffice2 className="h-5 w-5 cr-heading-icon" />
          </div>
          {macros.length ? (
            <div className="cr-macro-ops-list">
              {macros.map((item) => {
                const progress = item.previsto > 0
                  ? Math.min(100, (item.realizado / item.previsto) * 100)
                  : (item.realizado > 0 ? 100 : 0);
                return (
                  <div key={item.codigo} className="cr-macro-ops-row" data-state={item.estado}>
                    <div className="cr-macro-ops-row__name">
                      <strong>{item.nome || 'Macro sem descrição'}</strong>
                      <span>{item.codigo} · {item.itens} item(ns) com movimento</span>
                    </div>
                    <div className="cr-macro-ops-row__numbers">
                      <span>Planejado <strong>{currency.format(item.previsto || 0)}</strong></span>
                      <span>Realizado <strong>{currency.format(item.realizado || 0)}</strong></span>
                      <span>
                        Desvio
                        <strong data-negative={item.delta > 0}>{currency.format(item.delta || 0)}</strong>
                      </span>
                    </div>
                    <div className="cr-macro-ops-row__progress">
                      <div className="cr-progress-track">
                        <span data-state={item.estado} style={{ width: `${progress}%` }} />
                      </div>
                      <b>{formatPercent(item.percentual_execucao)}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cr-empty-state">
              Nenhuma macro com valor planejado ou realizado nesta competência.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
