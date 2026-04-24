import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obterDashboardOperacional } from '../../../services/crm';

const LIFECYCLE_LABEL = {
  NOVO: 'Novo',
  CONTATO: 'Contato',
  QUALIFICADO: 'Qualificado',
  OPORTUNIDADE: 'Oportunidade',
  CONVERTIDO: 'Convertido',
  PERDIDO: 'Perdido',
  ARQUIVADO: 'Arquivado'
};

function KpiCard({ label, value, sub, colorClass = 'text-main' }) {
  return (
    <div className="card sol-surface-card p-5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function CrmDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterDashboardOperacional()
      .then(setData)
      .catch((err) => alert(err.message || 'Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted text-sm">Carregando...</div>;
  if (!data) return null;

  const { leads, sla, tarefas, distribuicaoLifecycle, backlogPorResponsavel } = data;

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Dashboard CRM</h1>
            <p className="page-subtitle">Visao operacional em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/crm/leads" className="btn btn-secondary text-sm">Leads</Link>
            <Link to="/crm/tarefas" className="btn btn-secondary text-sm">Tarefas</Link>
          </div>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Leads ativos" value={leads.ativos} />
        <KpiCard label="Recebidos hoje" value={leads.hoje} colorClass="text-indigo-600 dark:text-indigo-400" />
        <KpiCard label="Recebidos esta semana" value={leads.semana} colorClass="text-blue-600 dark:text-blue-400" />
        <KpiCard label="Convertidos (total)" value={leads.convertidos} colorClass="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="Conversoes (7 dias)" value={leads.conversoesUltimos7Dias} colorClass="text-emerald-500 dark:text-emerald-300" />
        <KpiCard label="Perdidos (total)" value={leads.perdidos} colorClass="text-red-500 dark:text-red-400" />
      </div>

      {/* Alertas */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Sem primeiro contato (SLA)"
          value={sla.semPrimeiroContato}
          sub="Leads novos sem contato há mais de 60 min"
          colorClass={sla.semPrimeiroContato > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-main'}
        />
        <KpiCard
          label="Tarefas pendentes"
          value={tarefas.pendentes}
          colorClass="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          label="Tarefas vencidas"
          value={tarefas.vencidas}
          sub="Prazo expirado, ainda pendentes"
          colorClass={tarefas.vencidas > 0 ? 'text-red-500 dark:text-red-400' : 'text-main'}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuicao por lifecycle */}
        <div className="card sol-surface-card p-5">
          <h2 className="font-semibold text-main mb-4">Distribuicao por Status</h2>
          {distribuicaoLifecycle?.length > 0 ? (
            <div className="space-y-2">
              {distribuicaoLifecycle.map((item) => (
                <div key={item.lifecycle_status} className="flex items-center justify-between text-sm">
                  <span className="text-sub">{LIFECYCLE_LABEL[item.lifecycle_status] || item.lifecycle_status}</span>
                  <span className="font-semibold text-main">{item.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum dado disponivel.</p>
          )}
        </div>

        {/* Backlog por responsavel */}
        <div className="card sol-surface-card p-5">
          <h2 className="font-semibold text-main mb-4">Backlog por Responsavel</h2>
          {backlogPorResponsavel?.length > 0 ? (
            <div className="space-y-2">
              {backlogPorResponsavel.map((item) => (
                <div key={item.usuario?.id} className="flex items-center justify-between text-sm">
                  <span className="text-sub">{item.usuario?.nome || '—'}</span>
                  <span className="font-semibold text-main">{item.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum responsavel atribuido.</p>
          )}
        </div>
      </div>
    </div>
  );
}
