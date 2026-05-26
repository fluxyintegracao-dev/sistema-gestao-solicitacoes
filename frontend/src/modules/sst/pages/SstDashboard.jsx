import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineClipboardDocumentCheck, HiOutlineExclamationTriangle, HiOutlineShieldCheck, HiOutlineUserGroup } from 'react-icons/hi2';
import { useUiVisibility } from '../../../hooks/useUiVisibility';
import { useAuth } from '../../../contexts/AuthContext';
import { canViewSstArea } from '../../../utils/acessoProduto';
import { getSstDashboard } from '../services/sst';
import { SST_NAV } from '../constants/sstResources';

function MetricCard({ label, value, tone = 'slate', icon: Icon }) {
  const tones = {
    slate: 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-rose-200 bg-rose-50 text-rose-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900'
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
        {Icon ? <Icon className="h-5 w-5 opacity-70" /> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value ?? 0}</p>
    </div>
  );
}

export default function SstDashboard() {
  const { isVisible } = useUiVisibility();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSstDashboard()
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Erro ao carregar SST');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = data?.cards || {};
  const visibleNav = SST_NAV.filter(([key]) => canViewSstArea(user, key === 'eventos' ? 'analytics' : key));

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--c-text)]">Saude e Seguranca do Trabalho</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-muted)]">
              Controle operacional de riscos, ASO, exames, EPIs, treinamentos, acidentes e documentos por empresa e obra.
            </p>
            {data?.periodo_alerta_dias ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
                Alertas de validade considerando {data.periodo_alerta_dias} dia(s)
              </p>
            ) : null}
          </div>
          <Link
            to="/sst/relatorios"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Relatorios SST
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      ) : null}

      {isVisible('sst.dashboard.metricas_principais') ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Compliance score" value={`${cards.compliance_score ?? 100}%`} tone="green" icon={HiOutlineShieldCheck} />
          <MetricCard label="Riscos criticos" value={cards.riscos_criticos} tone={cards.riscos_criticos ? 'red' : 'blue'} icon={HiOutlineExclamationTriangle} />
          <MetricCard label="Colaboradores inaptos" value={cards.colaboradores_inaptos} tone={cards.colaboradores_inaptos ? 'red' : 'green'} icon={HiOutlineUserGroup} />
          <MetricCard label="Pendencias criticas" value={cards.pendencias_criticas} tone={cards.pendencias_criticas ? 'red' : 'slate'} icon={HiOutlineClipboardDocumentCheck} />
        </section>
      ) : null}

      {isVisible('sst.dashboard.vencimentos') ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Exames vencidos" value={cards.exames_vencidos} tone={cards.exames_vencidos ? 'red' : 'slate'} />
          <MetricCard label="ASO vencidos" value={cards.aso_vencidos} tone={cards.aso_vencidos ? 'red' : 'slate'} />
          <MetricCard label="EPI vencendo" value={cards.epi_vencendo} tone={cards.epi_vencendo ? 'amber' : 'slate'} />
          <MetricCard label="Treinamentos vencidos" value={cards.treinamentos_vencidos} tone={cards.treinamentos_vencidos ? 'red' : 'slate'} />
        </section>
      ) : null}

      {isVisible('sst.dashboard.operacao') ? (
        <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Operacao SST</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
              {loading ? 'Carregando' : `${visibleNav.length} areas`}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleNav.map(([key, label]) => (
              <Link
                key={key}
                to={`/sst/${key}`}
                className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--c-text)] transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
