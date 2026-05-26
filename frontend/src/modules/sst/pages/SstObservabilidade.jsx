import { useEffect, useMemo, useState } from 'react';
import {
  getSstChecklistHomologacao,
  getSstObservabilidade,
  homologarWorkflowsSst,
  simularHomologacaoSst
} from '../services/sst';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function StatusPill({ value }) {
  const status = String(value || 'SEM_STATUS').toUpperCase();
  const tone = {
    OK: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CONTROLADO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CONCLUIDO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ATIVA: 'border-sky-200 bg-sky-50 text-sky-700',
    ATIVO: 'border-sky-200 bg-sky-50 text-sky-700',
    ATENCAO: 'border-amber-200 bg-amber-50 text-amber-700',
    PENDENTE: 'border-amber-200 bg-amber-50 text-amber-700',
    DESATIVADA: 'border-slate-200 bg-slate-50 text-slate-700',
    ERRO: 'border-rose-200 bg-rose-50 text-rose-700',
    BLOQUEADO: 'border-rose-200 bg-rose-50 text-rose-700'
  }[status] || 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text)]';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
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

function StatusList({ title, data }) {
  const entries = Object.entries(data || {});
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{key}</span>
            <span className="text-sm font-semibold text-[var(--c-text)]">{fmt(value)}</span>
          </div>
        ))}
        {!entries.length ? <p className="text-sm text-[var(--c-muted)]">Sem registros.</p> : null}
      </div>
    </div>
  );
}

function LogList({ title, logs }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {(logs || []).map((log) => (
          <div key={`${title}-${log.id}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">{log.acao || log.automacao || log.integracao || log.tipo_bloqueio || 'Registro'}</p>
                <p className="mt-1 text-xs text-[var(--c-muted)]">{log.mensagem || log.erro || 'Sem mensagem.'}</p>
              </div>
              <StatusPill value={log.status} />
            </div>
          </div>
        ))}
        {!(logs || []).length ? <p className="text-sm text-[var(--c-muted)]">Nenhum log recente.</p> : null}
      </div>
    </div>
  );
}

export default function SstObservabilidade() {
  const [data, setData] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    Promise.all([getSstObservabilidade(), getSstChecklistHomologacao()])
      .then(([observabilidade, checklistData]) => {
        setData(observabilidade);
        setChecklist(checklistData);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar observabilidade SST'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function run(kind) {
    setBusy(kind);
    setError('');
    setMessage('');
    try {
      if (kind === 'workflows') await homologarWorkflowsSst({ dry_run: true });
      if (kind === 'simular') await simularHomologacaoSst();
      setMessage('Homologacao executada em modo analitico.');
      load();
    } catch (err) {
      setError(err.message || 'Erro ao executar homologacao SST');
    } finally {
      setBusy('');
    }
  }

  const cards = data?.cards || {};
  const flags = useMemo(() => Object.entries(data?.flags || {}), [data]);
  const checks = checklist?.checks || [];

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Observabilidade SST</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Homologacao, logs e saude operacional</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Monitoramento tecnico-operacional de workflows, automacoes, integracoes controladas, bloqueios e flags.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => run('workflows')}>
              {busy === 'workflows' ? 'Validando...' : 'Homologar workflows'}
            </button>
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('simular')}>
              {busy === 'simular' ? 'Simulando...' : 'Simular massa'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando observabilidade...</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <Metric label="Eventos abertos" value={fmt(cards.eventos_abertos)} />
        <Metric label="Notificacoes" value={fmt(cards.notificacoes_nao_lidas)} detail="Nao lidas" />
        <Metric label="Pendencias" value={fmt(cards.pendencias_abertas)} detail={`${fmt(cards.pendencias_criticas)} criticas`} />
        <Metric label="Bloqueios" value={fmt(cards.bloqueios_abertos)} />
        <Metric label="Scores" value={fmt(cards.scores_registrados)} />
        <Metric label="Erros" value={fmt(cards.erros_operacionais)} detail={data?.saude_operacional?.nivel} />
        <Metric label="Checks" value={checklist?.status_geral || '...'} detail={`${fmt(checklist?.pendencias)} pendencias`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Feature flags</h2>
          <div className="mt-4 grid gap-2">
            {flags.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{key}</span>
                <StatusPill value={value ? 'ATIVA' : 'DESATIVADA'} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Checklist de homologacao</h2>
            <StatusPill value={checklist?.status_geral} />
          </div>
          <div className="mt-4 grid gap-2">
            {checks.map((item) => (
              <div key={item.name} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-text)]">{item.name}</p>
                    {item.details ? <p className="mt-1 text-xs text-[var(--c-muted)]">{typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}</p> : null}
                  </div>
                  <StatusPill value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <StatusList title="Workflows" data={data?.status?.workflows} />
        <StatusList title="Logs de workflow" data={data?.status?.workflow_logs} />
        <StatusList title="Logs de automacao" data={data?.status?.automation_logs} />
        <StatusList title="Logs de integracao" data={data?.status?.integration_logs} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LogList title="Workflows recentes" logs={data?.ultimos_logs?.workflows} />
        <LogList title="Automacoes recentes" logs={data?.ultimos_logs?.automacoes} />
        <LogList title="Integracoes recentes" logs={data?.ultimos_logs?.integracoes} />
        <LogList title="Bloqueios recentes" logs={data?.ultimos_logs?.bloqueios} />
      </section>
    </div>
  );
}
