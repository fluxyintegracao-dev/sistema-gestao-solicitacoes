import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  obterDashboardDistribuicaoCrm,
  obterDashboardGerencialCrm,
  obterDashboardSlaCrm
} from '../services/crm';

function Metric({ label, value, detail, tone = 'default' }) {
  const color = {
    danger: '#b91c1c',
    warning: '#b45309',
    success: '#15803d',
    info: '#2563eb',
    default: 'var(--c-text)'
  }[tone] || 'var(--c-text)';

  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color }}>{value}</strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

function DistributionList({ title, subtitle, rows, labelGetter, valueGetter }) {
  const values = (rows || []).map((row) => Number(valueGetter(row) || 0));
  const max = Math.max(...values, 0);

  return (
    <section className="card sol-surface-card p-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--c-text)]">{title}</h2>
        {subtitle ? <p className="text-sm text-[var(--c-muted)]">{subtitle}</p> : null}
      </div>
      <div className="mt-4 space-y-3">
        {rows?.length ? rows.slice(0, 8).map((row, index) => {
          const value = Number(valueGetter(row) || 0);
          const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
          return (
            <div key={`${title}-${labelGetter(row)}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--c-text)]">{labelGetter(row)}</span>
                <span className="font-semibold text-[var(--c-text)]">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--c-bg-subtle)]">
                <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        }) : (
          <p className="text-sm text-[var(--c-muted)]">Sem dados para o recorte.</p>
        )}
      </div>
    </section>
  );
}

export default function CrmRelatorioExecutivo() {
  const [dias, setDias] = useState(30);
  const [gerencial, setGerencial] = useState(null);
  const [sla, setSla] = useState(null);
  const [distribuicao, setDistribuicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.allSettled([
      obterDashboardGerencialCrm({ dias }),
      obterDashboardSlaCrm({ recent_days: dias, first_contact_minutes: 60, no_activity_hours: 24 }),
      obterDashboardDistribuicaoCrm({ dias, no_activity_hours: 24 })
    ]).then(([gerencialResult, slaResult, distribuicaoResult]) => {
      if (!active) return;
      setGerencial(gerencialResult.status === 'fulfilled' ? gerencialResult.value : null);
      setSla(slaResult.status === 'fulfilled' ? slaResult.value : null);
      setDistribuicao(distribuicaoResult.status === 'fulfilled' ? distribuicaoResult.value : null);
      const failed = [gerencialResult, slaResult, distribuicaoResult].find((item) => item.status === 'rejected');
      setError(failed?.reason?.message || '');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [dias]);

  const leitura = useMemo(() => {
    const leadsAtivos = Number(gerencial?.kpis?.leadsAtivos || 0);
    const semResponsavel = Number(distribuicao?.kpis?.leadsSemResponsavel || 0);
    const semAtividade = Number(distribuicao?.kpis?.leadsSemAtividade || 0);
    const tarefasVencidas = Number(sla?.kpis?.tarefasVencidas || 0);
    const conversasFila = Number(sla?.kpis?.conversasAbertas || 0) + Number(sla?.kpis?.conversasPendentes || 0);

    const alertas = [];
    if (semResponsavel > 0) alertas.push(`${semResponsavel} lead(s) sem responsavel`);
    if (semAtividade > 0) alertas.push(`${semAtividade} lead(s) sem atividade`);
    if (tarefasVencidas > 0) alertas.push(`${tarefasVencidas} tarefa(s) vencida(s)`);
    if (conversasFila > 0) alertas.push(`${conversasFila} conversa(s) em fila`);

    return {
      leadsAtivos,
      alertas,
      saudeOperacional: alertas.length === 0 ? 'Fila sem alerta critico' : alertas.join(' | ')
    };
  }, [gerencial, sla, distribuicao]);

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Relatorio Executivo CRM</h1>
            <p className="page-subtitle">
              Leitura consolidada de conversao, carteira, SLA e distribuicao comercial.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/crm/dashboard-gerencial" className="btn btn-outline">Gerencial</Link>
            <Link to="/crm/dashboard-sla" className="btn btn-outline">SLA</Link>
            <Link to="/crm/dashboard-distribuicao" className="btn btn-outline">Distribuicao</Link>
          </div>
        </div>
      </div>

      <div className="card sol-surface-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Recorte executivo</h2>
            <p className="text-sm text-[var(--c-muted)]">A janela altera os indicadores de entrada, conversao e redistribuicao.</p>
          </div>
          <select className="input input-sm max-w-[220px]" value={dias} onChange={(event) => setDias(Number(event.target.value))}>
            <option value={7}>Ultimos 7 dias</option>
            <option value={15}>Ultimos 15 dias</option>
            <option value={30}>Ultimos 30 dias</option>
            <option value={60}>Ultimos 60 dias</option>
            <option value={90}>Ultimos 90 dias</option>
          </select>
        </div>
      </div>

      {error ? <div className="app-alert app-alert--warning">Parte dos dados nao foi carregada: {error}</div> : null}

      {loading ? (
        <div className="app-empty-card">Carregando relatorio executivo CRM...</div>
      ) : (
        <>
          <div className="app-summary-grid">
            <Metric label="Leads ativos" value={gerencial?.kpis?.leadsAtivos || 0} detail="Carteira comercial atual" tone="info" />
            <Metric label="Entradas no periodo" value={gerencial?.kpis?.leadsPeriodo || 0} detail={`${dias} dia(s)`} />
            <Metric label="Taxa de conversao" value={`${gerencial?.kpis?.taxaConversaoPeriodo || 0}%`} detail={`${gerencial?.kpis?.convertidosPeriodo || 0} convertido(s)`} tone="success" />
            <Metric label="Leads sem responsavel" value={distribuicao?.kpis?.leadsSemResponsavel || 0} detail="Exige saneamento operacional" tone={distribuicao?.kpis?.leadsSemResponsavel > 0 ? 'danger' : 'success'} />
            <Metric label="Backlog SLA" value={sla?.kpis?.leadsSemAtividade || 0} detail={`${sla?.kpis?.tarefasVencidas || 0} tarefa(s) vencida(s)`} tone={sla?.kpis?.tarefasVencidas > 0 ? 'danger' : 'warning'} />
            <Metric label="Conversas em fila" value={(sla?.kpis?.conversasAbertas || 0) + (sla?.kpis?.conversasPendentes || 0)} detail={`${sla?.kpis?.mensagensNaoLidas || 0} nao lida(s)`} />
          </div>

          <section className="card sol-surface-card p-4">
            <h2 className="text-base font-semibold text-[var(--c-text)]">Leitura executiva</h2>
            <p className="mt-2 text-sm text-[var(--c-muted)]">
              {leitura.saudeOperacional}
            </p>
            <p className="mt-2 text-xs text-[var(--c-muted)]">
              Os numeros vem dos dashboards operacionais do CRM. Esta tela apenas consolida a leitura para diretoria.
            </p>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <DistributionList
              title="Origens de leads"
              subtitle="Canais que geraram entrada no recorte."
              rows={gerencial?.leadsPorOrigem || []}
              labelGetter={(row) => row.chave || '-'}
              valueGetter={(row) => row.total}
            />
            <DistributionList
              title="Carteira por responsavel"
              subtitle="Backlog ativo por usuario."
              rows={gerencial?.leadsPorResponsavel || []}
              labelGetter={(row) => row.usuario?.nome || row.chave || '-'}
              valueGetter={(row) => row.total}
            />
            <DistributionList
              title="Redistribuicoes por ator"
              subtitle="Movimentacoes executadas no periodo."
              rows={distribuicao?.redistribuicoesPorAtor || []}
              labelGetter={(row) => row.usuario?.nome || '-'}
              valueGetter={(row) => row.total}
            />
          </div>
        </>
      )}
    </div>
  );
}
