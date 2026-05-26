import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSstExecutivo, sincronizarNotificacoesSst } from '../services/sst';

function Metric({ label, value, detail, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900'
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value ?? 0}</p>
      {detail ? <p className="mt-1 text-xs font-medium opacity-70">{detail}</p> : null}
    </div>
  );
}

export default function SstExecutivo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    getSstExecutivo()
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar painel executivo SST'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function syncNotifications() {
    setMessage('');
    try {
      const payload = await sincronizarNotificacoesSst();
      setMessage(`${payload.notificacoes_criadas || 0} notificacao(oes) criada(s).`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao sincronizar notificacoes SST');
    }
  }

  const cards = data?.cards || {};

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST Executivo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Inteligencia operacional SST</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Score, pendencias, bloqueios, obras criticas e prontidao preditiva sem transmissao real ao eSocial.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={syncNotifications} className="btn btn-outline">Sincronizar notificacoes</button>
            <Link to="/sst/relatorios/heatmap" className="btn btn-primary">Heatmap</Link>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando painel executivo...</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Compliance geral" value={`${data?.compliance_geral ?? 100}%`} detail={data?.nivel || 'CONTROLADO'} tone={(data?.compliance_geral ?? 100) < 50 ? 'danger' : 'ok'} />
        <Metric label="Colaboradores avaliados" value={cards.colaboradores_avaliados || 0} detail="Score SST" tone="info" />
        <Metric label="Pendencias" value={cards.pendencias_total || 0} detail="Abertas ou detectadas" tone={cards.pendencias_total ? 'warn' : 'ok'} />
        <Metric label="Pendencias criticas" value={cards.pendencias_criticas || 0} detail="Exigem acao" tone={cards.pendencias_criticas ? 'danger' : 'ok'} />
        <Metric label="Bloqueios abertos" value={cards.bloqueios_abertos || 0} detail="Motor operacional" tone={cards.bloqueios_abertos ? 'danger' : 'ok'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Obras criticas</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">{data?.heatmap?.length || 0} itens</span>
          </div>
          <div className="mt-4 space-y-3">
            {(data?.heatmap || []).map((item) => (
              <div key={`${item.obra_id || 'sem'}-${item.obra}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--c-text)]">{item.obra}</p>
                    <p className="text-xs text-[var(--c-muted)]">Indice {item.indice_risco} - {item.criticidade}</p>
                  </div>
                  <span className="rounded-full border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1 text-xs font-semibold text-[var(--c-text)]">
                    {item.pendencias} pend.
                  </span>
                </div>
              </div>
            ))}
            {!data?.heatmap?.length ? <p className="text-sm text-[var(--c-muted)]">Nenhuma obra critica detectada.</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Prontidao preditiva e IA documental</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <p className="text-sm font-semibold text-[var(--c-text)]">{data?.predicao?.status || 'PREPARADO_ARQUITETURALMENTE'}</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">Motor preditivo preparado, sem IA ativa nesta fase.</p>
            </div>
            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <p className="text-sm font-semibold text-[var(--c-text)]">{data?.ia_documental?.status || 'PIPELINE_DOCUMENTAL_PREPARADO'}</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">OCR e classificacao documental estruturados como contratos futuros.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
