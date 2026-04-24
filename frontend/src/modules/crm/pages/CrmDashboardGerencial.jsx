import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obterDashboardGerencialCrm } from '../../../services/crm';

function KpiCard({ label, value, helper, tone = 'default' }) {
  const toneClass = {
    default: 'text-main',
    success: 'text-emerald-600',
    danger: 'text-red-500',
    info: 'text-blue-600',
    warning: 'text-amber-500'
  }[tone] || 'text-main';

  return (
    <div className="card sol-surface-card p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-muted">{helper}</p>}
    </div>
  );
}

function RankingList({ title, subtitle, rows }) {
  return (
    <div className="card sol-surface-card p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-main">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {rows?.length ? (
        <div className="space-y-2">
          {rows.map((item, index) => (
            <div key={`${title}-${item.chave || item.usuario?.id || index}`} className="flex items-center justify-between gap-3 rounded-xl border border-base bg-elevated/30 px-3 py-2">
              <span className="min-w-0 truncate text-sm text-main">{item.usuario?.nome || item.chave || '-'}</span>
              <span className="text-sm font-semibold text-main">{item.total}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhum dado disponivel neste recorte.</p>
      )}
    </div>
  );
}

export default function CrmDashboardGerencial() {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(currentDias = dias) {
    setLoading(true);
    setError('');
    obterDashboardGerencialCrm({ dias: currentDias })
      .then(setData)
      .catch((err) => setError(err.message || 'Erro ao carregar dashboard gerencial'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(dias); }, [dias]);

  const cards = useMemo(() => {
    if (!data?.kpis) return [];
    return [
      { label: 'Leads ativos', value: data.kpis.leadsAtivos, helper: 'Base comercial atual', tone: 'default' },
      { label: `Entradas (${dias} dias)`, value: data.kpis.leadsPeriodo, helper: 'Capacidade de aquisicao', tone: 'info' },
      { label: 'Convertidos no periodo', value: data.kpis.convertidosPeriodo, helper: `${data.kpis.taxaConversaoPeriodo}% de conversao`, tone: 'success' },
      { label: 'Perdidos no periodo', value: data.kpis.perdidosPeriodo, helper: 'Monitorar qualidade do funil', tone: 'danger' },
      { label: 'Conversas abertas', value: data.kpis.conversasAbertas, helper: `${data.kpis.mensagensNaoLidas} mensagem(ns) nao lida(s)`, tone: 'warning' },
      { label: 'Automacoes ativas', value: data.kpis.automacoesAtivas, helper: `${data.kpis.tarefasVencidas} tarefa(s) vencida(s)`, tone: 'default' }
    ];
  }, [data, dias]);

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Dashboard Gerencial CRM</h1>
            <p className="page-subtitle">Leitura executiva de origem, conversao, atendimento e disciplina comercial.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/crm/dashboard" className="btn btn-secondary text-sm">Operacional</Link>
            <Link to="/crm/dashboard-sla" className="btn btn-secondary text-sm">SLA</Link>
            <Link to="/crm/dashboard-distribuicao" className="btn btn-secondary text-sm">Distribuicao</Link>
            <Link to="/crm/inbox" className="btn btn-secondary text-sm">Inbox</Link>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card sol-surface-card mt-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-main">Recorte gerencial</h2>
            <p className="text-xs text-muted">Mantenha a comparacao por janelas curtas e medias para leitura de tendencia.</p>
          </div>
          <div className="flex gap-2">
            <select className="input max-w-[220px]" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
              <option value={7}>Ultimos 7 dias</option>
              <option value={15}>Ultimos 15 dias</option>
              <option value={30}>Ultimos 30 dias</option>
              <option value={60}>Ultimos 60 dias</option>
              <option value={90}>Ultimos 90 dias</option>
            </select>
            <button type="button" className="btn btn-secondary text-sm" onClick={() => load(dias)}>Atualizar</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-base bg-card p-10 text-center text-sm text-muted">Carregando dashboard gerencial...</div>
      ) : !data ? null : (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map((card) => <KpiCard key={card.label} {...card} />)}
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RankingList
              title="Origens de leads"
              subtitle="Entradas captadas no recorte atual."
              rows={data.leadsPorOrigem}
            />
            <RankingList
              title="Carteira por responsavel"
              subtitle="Top usuarios com backlog ativo."
              rows={data.leadsPorResponsavel}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RankingList
              title="Conversas por canal"
              subtitle="Distribuicao da operacao de atendimento."
              rows={data.conversasPorCanal}
            />
            <RankingList
              title="Conversas por status"
              subtitle="Acompanhamento de backlog e resolucao."
              rows={data.conversasPorStatus}
            />
          </div>

          <div className="mt-4">
            <RankingList
              title="Automacoes por gatilho"
              subtitle="Base cadastral configurada para a proxima etapa de execucao automatica."
              rows={data.automacoesPorGatilho}
            />
          </div>
        </>
      )}
    </div>
  );
}
