import { useEffect, useMemo, useState } from 'react';
import { getRhColaboradores } from '../../../services/rhDp';
import { avaliarBloqueiosSst, getSstTimeline, revisarConformidadeSst } from '../services/sst';

function optionLabel(item) {
  return [item.nome, item.matricula ? `Matricula ${item.matricula}` : null, item.cargo].filter(Boolean).join(' - ');
}

export default function SstTimeline() {
  const [colaboradores, setColaboradores] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getRhColaboradores({ status: 'ATIVO', limit: 500 })
      .then((rows) => setColaboradores(Array.isArray(rows) ? rows : []))
      .catch(() => setColaboradores([]));
  }, []);

  function load(colaboradorId = selected) {
    if (!colaboradorId) return;
    setLoading(true);
    getSstTimeline(colaboradorId)
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar timeline SST'))
      .finally(() => setLoading(false));
  }

  async function revisar() {
    if (!selected) return;
    setMessage('');
    try {
      await revisarConformidadeSst(selected, { motivo: 'REVISAO_MANUAL_TIMELINE' });
      await avaliarBloqueiosSst(selected);
      setMessage('Revisao de conformidade e bloqueios executada.');
      load(selected);
    } catch (err) {
      setError(err.message || 'Erro ao revisar conformidade SST');
    }
  }

  const timeline = useMemo(() => data?.timeline || [], [data]);

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST Timeline</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Timeline operacional do colaborador</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
          Historico unico de ASO, exames, treinamentos, EPI, acidentes, exposicoes, pendencias, bloqueios e score.
        </p>
      </section>

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Colaborador</span>
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setData(null);
              }}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none"
            >
              <option value="">Selecione</option>
              {colaboradores.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => load()} className="btn btn-primary" disabled={!selected}>Carregar</button>
          <button type="button" onClick={revisar} className="btn btn-outline" disabled={!selected}>Revisar conformidade</button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando timeline...</p> : null}

      {data ? (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">Eventos</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--c-text)]">{data.resumo?.eventos_total || 0}</p>
          </div>
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">Pendencias abertas</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--c-text)]">{data.resumo?.pendencias_abertas || 0}</p>
          </div>
          <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">Bloqueios abertos</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--c-text)]">{data.resumo?.bloqueios_abertos || 0}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="space-y-3">
          {timeline.map((item, index) => (
            <div key={`${item.tipo}-${item.origem_id}-${index}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">{item.tipo}</p>
                  <p className="mt-1 font-semibold text-[var(--c-text)]">{item.titulo}</p>
                  {item.descricao ? <p className="mt-1 text-sm text-[var(--c-muted)]">{item.descricao}</p> : null}
                </div>
                <span className="text-sm font-semibold text-[var(--c-text)]">{item.data || '-'}</span>
              </div>
            </div>
          ))}
          {!timeline.length ? <p className="text-sm text-[var(--c-muted)]">Selecione um colaborador para visualizar a timeline.</p> : null}
        </div>
      </section>
    </div>
  );
}
