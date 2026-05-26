import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  gerarRecomendacoesSst,
  getSstCentroOperacional,
  getSstInteligenciaOperacional,
  processarAutomacoesSst,
  processarWorkflowsSst,
  recalcularScoreSst
} from '../services/sst';

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function RiskPill({ value }) {
  const tone = {
    EXCELENTE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CONTROLADO: 'bg-sky-100 text-sky-800 border-sky-200',
    ATENCAO: 'bg-amber-100 text-amber-800 border-amber-200',
    CRITICO: 'bg-rose-100 text-rose-800 border-rose-200',
    CRITICA: 'bg-rose-100 text-rose-800 border-rose-200',
    EMERGENCIAL: 'bg-red-100 text-red-900 border-red-200'
  }[value] || 'bg-[var(--c-surface)] text-[var(--c-text)] border-[var(--c-border)]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{value || 'SEM NIVEL'}</span>;
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

export default function SstCentroOperacional() {
  const [data, setData] = useState(null);
  const [inteligencia, setInteligencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    Promise.all([getSstCentroOperacional(), getSstInteligenciaOperacional()])
      .then(([centro, intel]) => {
        setData(centro);
        setInteligencia(intel);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar centro operacional SST'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(kind) {
    setBusy(kind);
    setMessage('');
    setError('');
    try {
      if (kind === 'score') await recalcularScoreSst();
      if (kind === 'recomendacoes') await gerarRecomendacoesSst();
      if (kind === 'workflows') await processarWorkflowsSst({ limit: 30 });
      if (kind === 'automacoes') await processarAutomacoesSst({ limit: 30 });
      setMessage('Processamento concluido.');
      load();
    } catch (err) {
      setError(err.message || 'Erro ao processar acao SST');
    } finally {
      setBusy('');
    }
  }

  const resumo = data?.resumo || {};
  const topHeatmap = useMemo(() => (data?.heatmap_corporativo || []).slice(0, 6), [data]);
  const sinais = inteligencia?.sinais || [];
  const recomendacoes = inteligencia?.recomendacoes || [];

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">Centro operacional SST</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--c-text)]">Risco, conformidade e automacoes em uma tela</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Visao corporativa multiempresa, com heatmap, score, sinais operacionais e recomendacoes geradas pelo backend.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => runAction('score')} disabled={!!busy}>{busy === 'score' ? 'Calculando...' : 'Recalcular score'}</button>
            <button type="button" className="btn btn-outline" onClick={() => runAction('recomendacoes')} disabled={!!busy}>{busy === 'recomendacoes' ? 'Gerando...' : 'Gerar recomendacoes'}</button>
            <button type="button" className="btn btn-outline" onClick={() => runAction('workflows')} disabled={!!busy}>{busy === 'workflows' ? 'Processando...' : 'Workflows'}</button>
            <button type="button" className="btn btn-primary" onClick={() => runAction('automacoes')} disabled={!!busy}>{busy === 'automacoes' ? 'Orquestrando...' : 'Automacoes'}</button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando centro operacional...</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Compliance" value={`${resumo.compliance_geral ?? 100}%`} detail={resumo.nivel || 'CONTROLADO'} />
        <Metric label="Empresas" value={fmt(resumo.empresas_mapeadas)} detail="Base do grupo" />
        <Metric label="Obras" value={fmt(resumo.obras_mapeadas)} detail="Obras e centros" />
        <Metric label="Pendencias" value={fmt(resumo.pendencias_abertas)} detail="Abertas" />
        <Metric label="Bloqueios" value={fmt(resumo.bloqueios_abertos)} detail="Ativos" />
        <Metric label="Riscos" value={fmt(resumo.riscos_criticos)} detail="Altos ou criticos" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Heatmap corporativo</h2>
            <Link to="/sst/relatorios/heatmap" className="text-sm font-semibold text-blue-600">Abrir mapa</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topHeatmap.map((item) => (
              <div key={`${item.obra_id || 'sem'}-${item.obra}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--c-text)]">{item.obra}</p>
                    <p className="mt-1 text-xs text-[var(--c-muted)]">Indice {item.indice_risco} com {item.pendencias} pendencia(s)</p>
                  </div>
                  <RiskPill value={item.criticidade} />
                </div>
              </div>
            ))}
            {!topHeatmap.length ? <p className="text-sm text-[var(--c-muted)]">Nenhum ponto critico no heatmap.</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Sinais operacionais</h2>
          <div className="mt-4 space-y-3">
            {sinais.map((item, index) => (
              <div key={`${item.tipo}-${index}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--c-text)]">{item.tipo}</p>
                  <RiskPill value={item.criticidade} />
                </div>
                <p className="mt-2 text-sm text-[var(--c-muted)]">{item.mensagem}</p>
              </div>
            ))}
            {!sinais.length ? <p className="text-sm text-[var(--c-muted)]">Nenhum sinal critico gerado pelo motor.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Recomendacoes operacionais</h2>
          <Link to="/sst/recomendacoes" className="text-sm font-semibold text-blue-600">Ver lista</Link>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {recomendacoes.slice(0, 6).map((item) => (
            <div key={item.id || `${item.tipo_recomendacao}-${item.titulo}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <RiskPill value={item.criticidade} />
              <p className="mt-3 font-semibold text-[var(--c-text)]">{item.titulo}</p>
              <p className="mt-2 text-sm text-[var(--c-muted)]">{item.acao_sugerida || item.descricao}</p>
            </div>
          ))}
          {!recomendacoes.length ? <p className="text-sm text-[var(--c-muted)]">Nenhuma recomendacao gerada.</p> : null}
        </div>
      </section>
    </div>
  );
}
