import { useEffect, useState } from 'react';
import { getSstHeatmap } from '../services/sst';

function toneClass(criticidade) {
  if (criticidade === 'CRITICA') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (criticidade === 'ALTA') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (criticidade === 'MEDIA') return 'border-sky-200 bg-sky-50 text-sky-900';
  return 'border-emerald-200 bg-emerald-50 text-emerald-900';
}

export default function SstHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSstHeatmap()
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar heatmap SST'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST Heatmap</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Mapa de risco operacional</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
          Concentra pendencias, bloqueios, acidentes e riscos por obra para priorizar acao operacional.
        </p>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando heatmap...</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        {Object.entries(data?.totais || {}).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">{key.replace(/_/g, ' ')}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--c-text)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.heatmap || []).map((item) => (
            <div key={`${item.obra_id || 'sem'}-${item.obra}`} className={`rounded-lg border p-4 shadow-sm ${toneClass(item.criticidade)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{item.obra}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{item.criticidade}</p>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">Indice {item.indice_risco}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span>Pendencias: {item.pendencias}</span>
                <span>Bloqueios: {item.bloqueios}</span>
                <span>Acidentes: {item.acidentes}</span>
                <span>Riscos: {item.riscos}</span>
              </div>
            </div>
          ))}
          {!data?.heatmap?.length ? <p className="text-sm text-[var(--c-muted)]">Nenhum ponto critico detectado.</p> : null}
        </div>
      </section>
    </div>
  );
}
