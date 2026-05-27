import { useEffect, useMemo, useState } from 'react';
import {
  gerarAlertasOperacionaisSst,
  getSstMonitoramentoProducao
} from '../services/sst';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function StatusPill({ value }) {
  const status = String(value || 'SEM_STATUS').toUpperCase();
  const tone = {
    PRONTO_OPERACAO_ASSISTIDA: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    PRONTO_PILOTO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CONTROLADO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ATIVO: 'border-sky-200 bg-sky-50 text-sky-700',
    ATIVA: 'border-sky-200 bg-sky-50 text-sky-700',
    ASSISTIDO_COM_PENDENCIAS: 'border-amber-200 bg-amber-50 text-amber-700',
    CONTROLADO_MANUAL: 'border-amber-200 bg-amber-50 text-amber-700',
    ATENCAO: 'border-amber-200 bg-amber-50 text-amber-700',
    PAUSADO: 'border-amber-200 bg-amber-50 text-amber-700',
    DESATIVADA: 'border-slate-200 bg-slate-50 text-slate-700',
    BLOQUEADO: 'border-rose-200 bg-rose-50 text-rose-700',
    ERRO: 'border-rose-200 bg-rose-50 text-rose-700'
  }[status] || 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text)]';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{status.replaceAll('_', ' ')}</span>;
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--c-text)]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--c-muted)]">{detail}</p> : null}
    </div>
  );
}

function FlagList({ flags }) {
  const entries = Object.entries(flags || {});
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <h2 className="text-lg font-semibold text-[var(--c-text)]">Flags de produção controlada</h2>
      <div className="mt-4 grid gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{key}</span>
            <StatusPill value={value ? 'ATIVA' : 'DESATIVADA'} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanList({ planos }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <h2 className="text-lg font-semibold text-[var(--c-text)]">Rollout assistido</h2>
      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {(planos || []).map((plano) => (
          <div key={plano.id} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">{plano.nome}</p>
                <p className="mt-1 text-xs text-[var(--c-muted)]">
                  {plano.escopo_tipo} · {fmt(plano.percentual_ativacao)}% ativado
                </p>
              </div>
              <StatusPill value={plano.status} />
            </div>
          </div>
        ))}
        {!(planos || []).length ? <p className="text-sm text-[var(--c-muted)]">Nenhum plano de rollout cadastrado.</p> : null}
      </div>
    </div>
  );
}

function StatusGrid({ title, items }) {
  const entries = Object.entries(items || {});
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <h2 className="text-lg font-semibold text-[var(--c-text)]">{title}</h2>
      <div className="mt-4 grid gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{key.replaceAll('_', ' ')}</span>
            <span className="text-sm font-semibold text-[var(--c-text)]">{fmt(value)}</span>
          </div>
        ))}
        {!entries.length ? <p className="text-sm text-[var(--c-muted)]">Sem dados para exibir.</p> : null}
      </div>
    </div>
  );
}

export default function SstProducaoMonitoramento() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    getSstMonitoramentoProducao()
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar monitoramento SST'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGerarAlertas() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const resultado = await gerarAlertasOperacionaisSst();
      setMessage(resultado.gerado
        ? `${fmt(resultado.criados)} alerta(s) criado(s), ${fmt(resultado.existentes)} já existiam.`
        : 'Geração ignorada porque a feature flag de alertas avançados está desativada.');
      load();
    } catch (err) {
      setError(err.message || 'Erro ao gerar alertas operacionais SST');
    } finally {
      setBusy(false);
    }
  }

  const readiness = data?.readiness || {};
  const rolloutCards = data?.rollout?.cards || {};
  const telemetriaCards = data?.telemetria?.cards || {};
  const observabilidadeCards = data?.observabilidade?.cards || {};
  const hardeningCards = data?.hardening?.cards || {};
  const pendencias = useMemo(() => readiness.pendencias || [], [readiness.pendencias]);

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Produção controlada SST</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Operação real assistida</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Painel de rollout, telemetria, hardening, alertas e prontidão para ampliar o uso real do módulo SST.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill value={readiness.nivel} />
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleGerarAlertas}>
              {busy ? 'Gerando...' : 'Gerar alertas'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando produção controlada...</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Planos ativos" value={fmt(rolloutCards.planos_ativos)} detail={`${fmt(rolloutCards.planos_pausados)} pausados`} />
        <Metric label="Alertas" value={fmt(telemetriaCards.alertas_abertos)} detail={`${fmt(telemetriaCards.alertas_criticos)} críticos`} />
        <Metric label="Falhas" value={fmt(telemetriaCards.falhas_total)} detail={data?.telemetria?.saude?.nivel} />
        <Metric label="Workflow médio" value={`${fmt(telemetriaCards.media_workflow_ms)} ms`} detail={`${fmt(telemetriaCards.workflows_lentos)} lentos`} />
        <Metric label="Hardening" value={fmt(hardeningCards.politicas_ativas)} detail={`${fmt(hardeningCards.workflows_lentos)} workflows lentos`} />
        <Metric label="Erros observados" value={fmt(observabilidadeCards.erros_operacionais)} detail={data?.observabilidade?.saude_operacional?.nivel} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Readiness de go-live assistido</h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">Critérios mínimos antes de ampliar operação real.</p>
            </div>
            <StatusPill value={readiness.pode_ir_para_producao_controlada ? 'CONTROLADO' : 'ATENCAO'} />
          </div>
          <div className="mt-4 space-y-2">
            {pendencias.map((item) => (
              <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                {item}
              </div>
            ))}
            {!pendencias.length ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                Sem pendências bloqueantes para operação assistida.
              </div>
            ) : null}
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-muted)]">
              eSocial real permanece bloqueado nesta fase. O painel controla apenas a operação SST interna.
            </div>
          </div>
        </div>
        <FlagList flags={data?.rollout?.flags} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <PlanList planos={data?.rollout?.planos} />
        <StatusGrid title="Telemetria por status" items={data?.telemetria?.status?.metricas_por_status} />
        <StatusGrid title="Falhas por camada" items={data?.telemetria?.status?.falhas} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <StatusGrid title="Logs de workflow" items={data?.observabilidade?.status?.workflow_logs} />
        <StatusGrid title="Hardening" items={hardeningCards} />
      </section>
    </div>
  );
}
