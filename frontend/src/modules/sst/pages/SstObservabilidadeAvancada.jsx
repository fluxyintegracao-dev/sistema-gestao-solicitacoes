import { useEffect, useMemo, useState } from 'react';
import {
  enfileirarJobSst,
  executarQualityCheckSst,
  getSstObservabilidadeAvancada,
  limparCacheExpiradoSst,
  processarWorkerSst
} from '../services/sst';
import { TabelaPadrao } from '../../../components/padrao';

const DEFAULT_JOBS = [
  'SstScoreRecalculationJob',
  'SstNotificationJob',
  'SstWorkflowJob',
  'SstAnalyticsRefreshJob',
  'SstHeatmapRefreshJob',
  'SstIaDocumentAnalysisJob'
];

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function statusTone(value) {
  const status = String(value || '').toUpperCase();
  if (['CONTROLADO', 'SUCESSO', 'ATIVO', 'REGISTRADO'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['ATENCAO', 'PENDENTE', 'PROCESSANDO', 'ERRO'].includes(status)) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (['CRITICO', 'CRITICA', 'DEAD_LETTER', 'BLOQUEADO'].includes(status)) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text)]';
}

function Pill({ value }) {
  const label = String(value || 'SEM_STATUS').replaceAll('_', ' ');
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(value)}`}>{label}</span>;
}

function Card({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--c-text)]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--c-muted)]">{detail}</p> : null}
    </div>
  );
}

function StatusList({ title, items }) {
  const rows = Object.entries(items || {});
  return (
    <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <h2 className="text-lg font-semibold text-[var(--c-text)]">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">{key.replaceAll('_', ' ')}</span>
            <span className="text-sm font-semibold text-[var(--c-text)]">{fmt(value)}</span>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-[var(--c-muted)]">Sem dados para exibir.</p> : null}
      </div>
    </section>
  );
}

function PerformanceList({ items }) {
  return (
    <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <h2 className="text-lg font-semibold text-[var(--c-text)]">Performance recente</h2>
      <div className="mt-4 max-h-80 overflow-y-auto">
        <TabelaPadrao
          colunas={[
            {
              id: 'metrica',
              titulo: 'Metrica',
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => <span className="font-semibold">{item.metric_name}</span>
            },
            {
              id: 'grupo',
              titulo: 'Grupo',
              tipo: 'texto',
              render: (item) => item.metric_group || item.scope_type || 'SISTEMA'
            },
            {
              id: 'valor',
              titulo: 'Valor',
              tipo: 'numero',
              render: (item) => `${fmt(item.value)} ${item.unit || ''}`.trim()
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => <Pill value={item.status || 'REGISTRADO'} />
            }
          ]}
          itens={items || []}
          vazio="Nenhuma metrica recente registrada."
          storageKey="tabela:sst-observabilidade-avancada:performance"
          rotuloRolagem="Performance recente"
        />
      </div>
    </section>
  );
}

export default function SstObservabilidadeAvancada() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getSstObservabilidadeAvancada()
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar observabilidade avancada SST'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function runAction(name, action, successMessage) {
    setBusy(name);
    setMessage('');
    setError('');
    try {
      const result = await action();
      setMessage(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao executar acao SST');
    } finally {
      setBusy('');
    }
  }

  async function enqueueDefaultJobs() {
    const results = [];
    for (const job_type of DEFAULT_JOBS) {
      results.push(await enfileirarJobSst({ job_type, payload: { origem: 'observabilidade_avancada' } }));
    }
    return results;
  }

  const filas = data?.filas || {};
  const snapshot = filas.snapshot || {};
  const cache = data?.cache?.cards || {};
  const readiness = data?.readiness_enterprise || {};
  const qualidade = data?.qualidade || {};
  const governanca = data?.governanca || {};
  const producao = data?.producao || {};
  const cards = useMemo(() => ({
    pendentes: snapshot.pending_count,
    processando: snapshot.processing_count,
    falhas: snapshot.error_count,
    deadLetter: snapshot.dead_letter_count,
    cacheAtivo: cache.ativas,
    jobsAtrasados: data?.performance?.jobs_atrasados
  }), [snapshot, cache, data]);

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST enterprise</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Observabilidade avancada</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Painel corporativo para filas, jobs, cache, qualidade, governanca, performance e readiness de escala.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill value={readiness.nivel} />
            <button
              type="button"
              className="btn btn-outline"
              disabled={Boolean(busy)}
              onClick={() => runAction('enqueue', enqueueDefaultJobs, (items) => `${fmt(items.filter((item) => item.enfileirado).length)} job(s) enfileirado(s).`)}
            >
              {busy === 'enqueue' ? 'Enfileirando...' : 'Enfileirar jobs'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(busy)}
              onClick={() => runAction('worker', () => processarWorkerSst({ limit: 10 }), (result) => `${fmt(result.processados)} job(s) processado(s).`)}
            >
              {busy === 'worker' ? 'Processando...' : 'Processar worker'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando observabilidade avancada...</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card label="Pendentes" value={fmt(cards.pendentes)} detail={filas.queue_name || 'sst-default'} />
        <Card label="Processando" value={fmt(cards.processando)} detail={filas.workers?.mode || 'database-backed'} />
        <Card label="Falhas" value={fmt(cards.falhas)} detail={`${fmt(cards.deadLetter)} dead letter`} />
        <Card label="Cache ativo" value={fmt(cards.cacheAtivo)} detail={`${fmt(cache.expiradas)} expiradas`} />
        <Card label="Jobs atrasados" value={fmt(cards.jobsAtrasados)} detail={readiness.observacao} />
        <Card label="Readiness" value={readiness.nivel || 'SEM_DADOS'} detail={producao?.readiness?.nivel} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Operacao controlada</h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">Acoes administrativas para manter a camada enterprise saudavel.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline"
                disabled={Boolean(busy)}
                onClick={() => runAction('quality', executarQualityCheckSst, (result) => `${fmt(result.issues_criadas)} issue(s) de qualidade criada(s).`)}
              >
                {busy === 'quality' ? 'Verificando...' : 'Rodar quality check'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={Boolean(busy)}
                onClick={() => runAction('cache', limparCacheExpiradoSst, (result) => `${fmt(result.removidos)} entrada(s) removida(s).`)}
              >
                {busy === 'cache' ? 'Limpando...' : 'Limpar cache expirado'}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Worker</p>
              <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{filas.workers?.worker_id || 'sem worker'}</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">BullMQ ready: {filas.workers?.bullmq_ready ? 'sim' : 'nao'}</p>
            </div>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Fila</p>
              <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{filas.queue_name || 'sst-default'}</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">Media {fmt(snapshot.avg_duration_ms)} ms</p>
            </div>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">eSocial</p>
              <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">Transmissao bloqueada</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">Apenas dominio operacional SST.</p>
            </div>
          </div>
        </section>

        <StatusList title="Status dos jobs" items={filas.status} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatusList title="Qualidade operacional" items={qualidade.ABERTA || qualidade} />
        <StatusList title="Governanca por acao" items={governanca.acoes} />
        <StatusList title="Governanca por criticidade" items={governanca.criticidades} />
      </section>

      <PerformanceList items={data?.performance?.recentes} />
    </div>
  );
}
