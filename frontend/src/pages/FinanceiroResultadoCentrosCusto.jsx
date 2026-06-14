import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getResultadoCentrosCusto } from '../services/financeiro';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatItem({ label, value, sub, color }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{label}</span>
      <span className="text-sm font-bold tabular-nums leading-tight" style={{ color: color || 'var(--c-text)' }}>
        {value}
      </span>
      {sub ? <span className="text-[10px] text-[var(--c-muted)]">{sub}</span> : null}
    </div>
  );
}

function CentroCustoCard({ centro }) {
  const saidas = centro.pagar?.total || 0;
  const pagas = centro.pagar?.pago || 0;
  const entradas = centro.receber?.total || 0;
  const recebidas = centro.receber?.recebido || 0;
  const saldoLiquido = recebidas - pagas;

  return (
    <article className="overflow-hidden rounded-xl border bg-[var(--ui-surface)] border-[var(--ui-border)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--c-muted)]">
            {centro.codigo || `#${centro.id}`}
          </div>
          <h3 className="mt-0.5 text-sm font-bold uppercase leading-tight text-[var(--c-text)]">{centro.nome}</h3>
          {centro.cidade ? <div className="mt-0.5 text-[10px] text-[var(--c-muted)]">{centro.cidade}</div> : null}
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Centro de custo
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[var(--ui-border)] px-4 py-3">
        <StatItem label="Solicitacoes" value={String(centro.solicitacoes?.quantidade || 0)} sub={formatCurrency(centro.solicitacoes?.total_valor)} />
        <StatItem label="Saldo liquido" value={formatCurrency(saldoLiquido)} color={saldoLiquido >= 0 ? '#10b981' : '#f59e0b'} />
        <StatItem label="A pagar" value={formatCurrency(saidas)} sub={`${centro.pagar?.quantidade || 0} titulo(s)`} color="var(--c-primary)" />
        <StatItem label="Pago" value={formatCurrency(pagas)} />
        <StatItem label="A receber" value={formatCurrency(entradas)} sub={`${centro.receber?.quantidade || 0} titulo(s)`} color="#10b981" />
        <StatItem label="Recebido" value={formatCurrency(recebidas)} />
      </div>
    </article>
  );
}

export default function FinanceiroResultadoCentrosCusto() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getResultadoCentrosCusto()
      .then((data) => {
        if (active) setDados(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Erro ao carregar centros de custo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const resumo = useMemo(() => dados.reduce((acc, centro) => {
    acc.centros += 1;
    acc.solicitacoes += centro.solicitacoes?.quantidade || 0;
    acc.aPagar += centro.pagar?.total || 0;
    acc.pago += centro.pagar?.pago || 0;
    acc.aReceber += centro.receber?.total || 0;
    acc.recebido += centro.receber?.recebido || 0;
    return acc;
  }, { centros: 0, solicitacoes: 0, aPagar: 0, pago: 0, aReceber: 0, recebido: 0 }), [dados]);

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Resultado por Centro de Custo</h1>
            <p className="page-subtitle">Visao financeira dos cadastros administrativos que nao sao obras.</p>
          </div>
          <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">
            Voltar para relatorios
          </Link>
        </div>
      </div>

      <div className="card sol-surface-card">
        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: 'Centros', value: String(resumo.centros) },
            { label: 'Solicitacoes', value: String(resumo.solicitacoes) },
            { label: 'A pagar', value: formatCurrency(resumo.aPagar) },
            { label: 'Pago', value: formatCurrency(resumo.pago) },
            { label: 'A receber', value: formatCurrency(resumo.aReceber) },
            { label: 'Recebido', value: formatCurrency(resumo.recebido) }
          ].map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{item.label}</span>
              <span className="text-sm font-bold tabular-nums leading-tight text-[var(--c-text)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      {loading ? (
        <div className="app-empty-card">Carregando...</div>
      ) : dados.length === 0 ? (
        <div className="app-empty-card">
          <p className="text-sm text-[var(--c-muted)]">Nenhum centro de custo encontrado.</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dados.map((centro) => (
            <CentroCustoCard key={centro.id} centro={centro} />
          ))}
        </section>
      )}
    </div>
  );
}
