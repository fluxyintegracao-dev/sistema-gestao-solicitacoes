import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obterDashboardDistribuicaoCrm } from '../../../services/crm';
import { TabelaPadrao } from '../../../components/padrao';

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function fmtDay(value) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClass = {
    default: 'text-main',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    success: 'text-emerald-600',
    info: 'text-blue-600'
  }[tone] || 'text-main';

  return (
    <div className="card sol-surface-card p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-muted">{helper}</p>}
    </div>
  );
}

function ProgressBar({ value, max, tone = 'blue' }) {
  const width = max > 0 ? Math.min(100, Math.round((Number(value || 0) / max) * 100)) : 0;
  const colorClass = {
    blue: 'bg-blue-600',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    emerald: 'bg-emerald-600'
  }[tone] || 'bg-blue-600';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-base p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function ResponsaveisTable({ rows }) {
  const maxCarteira = Math.max(...(rows || []).map((row) => Number(row.totalCarteira || 0)), 0);

  return (
    <section className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">Carteira por responsavel</h2>
        <p className="text-xs text-muted">Base para identificar sobrecarga, carteira parada e desequilibrio operacional.</p>
      </div>

      <TabelaPadrao
        colunas={[
          {
            id: 'responsavel',
            titulo: 'Responsavel',
            tipo: 'identidade',
            noCard: 'titulo',
            render: (row) => (
              <>
                <p className="font-medium text-main">{row.usuario?.nome || '-'}</p>
                <p className="text-xs text-muted">{row.usuario?.perfil || '-'}</p>
              </>
            )
          },
          {
            id: 'carteira',
            titulo: 'Carteira',
            tipo: 'numero',
            render: (row) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-main">{row.totalCarteira}</span>
                  <span className="text-xs text-muted">ativos</span>
                </div>
                <ProgressBar value={row.totalCarteira} max={maxCarteira} />
              </div>
            )
          },
          {
            id: 'novos',
            titulo: 'Novos periodo',
            tipo: 'numero',
            render: (row) => row.novosPeriodo
          },
          {
            id: 'sem_atividade',
            titulo: 'Sem atividade',
            tipo: 'numero',
            render: (row) => (
              <span className={row.semAtividade > 0 ? 'font-semibold text-amber-600' : ''}>{row.semAtividade}</span>
            )
          },
          {
            id: 'convertidos',
            titulo: 'Convertidos',
            tipo: 'numero',
            render: (row) => row.convertidosPeriodo
          },
          {
            id: 'taxa',
            titulo: 'Taxa periodo',
            tipo: 'numero',
            render: (row) => `${row.taxaConversaoPeriodo}%`
          },
          {
            id: 'pressao',
            titulo: 'Pressao',
            tipo: 'numero',
            render: (row) => <span className="font-semibold text-main">{row.pressaoCarteira}</span>
          }
        ]}
        itens={rows || []}
        getId={(row) => row.usuario?.id || row.usuario?.nome}
        vazio="Nenhum responsavel com carteira ativa no periodo."
        storageKey="tabela:crm-dashboard-distribuicao:responsaveis"
        rotuloRolagem="Carteira por responsavel"
      />
    </section>
  );
}

function RedistribuicoesRecentes({ rows }) {
  return (
    <section className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">Redistribuicoes recentes</h2>
        <p className="text-xs text-muted">Historico auditado das movimentacoes de responsavel.</p>
      </div>

      {!rows?.length ? (
        <EmptyState>Nenhuma redistribuicao registrada no periodo.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-base bg-elevated/30 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  {row.lead?.id ? (
                    <Link to={`/crm/leads/${row.lead.id}`} className="font-semibold text-indigo-600 hover:underline">
                      {row.lead.nome || `Lead #${row.lead.id}`}
                    </Link>
                  ) : (
                    <p className="font-semibold text-main">Lead removido ou indisponivel</p>
                  )}
                  <p className="text-xs text-muted">
                    {row.oldAssignedUserName || 'Sem responsavel'} {'->'} {row.newAssignedUserName || 'Novo responsavel nao informado'}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs text-muted">{fmtDate(row.createdAt)}</p>
                  <p className="text-xs text-muted">por {row.usuario?.nome || 'sistema'}</p>
                </div>
              </div>
              {row.motivo && (
                <p className="mt-3 rounded-xl border border-base bg-card px-3 py-2 text-xs text-sub">{row.motivo}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChartPanel({ title, subtitle, rows, labelKey = 'dia' }) {
  const max = Math.max(...(rows || []).map((row) => Number(row.total || 0)), 0);

  return (
    <section className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {!rows?.length ? (
        <EmptyState>Sem dados para o recorte atual.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${title}-${row[labelKey] || row.usuario?.id || row.usuario?.nome}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-main">
                  {labelKey === 'dia' ? fmtDay(row.dia) : row.usuario?.nome || '-'}
                </span>
                <span className="font-semibold text-main">{row.total}</span>
              </div>
              <ProgressBar value={row.total} max={max} tone={labelKey === 'dia' ? 'blue' : 'amber'} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CrmDashboardDistribuicao() {
  const [filters, setFilters] = useState({ dias: 30, no_activity_hours: 24 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(currentFilters = filters) {
    setLoading(true);
    setError('');
    obterDashboardDistribuicaoCrm(currentFilters)
      .then(setData)
      .catch((err) => setError(err.message || 'Erro ao carregar dashboard de distribuicao'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(filters);
  }, [filters.dias, filters.no_activity_hours]);

  const cards = useMemo(() => {
    if (!data?.kpis) return [];
    return [
      {
        label: 'Leads ativos em carteira',
        value: data.kpis.totalAtivos,
        helper: `${data.kpis.percentualAtribuido}% com responsavel`,
        tone: 'info'
      },
      {
        label: 'Leads sem responsavel',
        value: data.kpis.leadsSemResponsavel,
        helper: 'Devem ser tratados antes de campanhas em escala',
        tone: data.kpis.leadsSemResponsavel > 0 ? 'danger' : 'success'
      },
      {
        label: 'Leads sem atividade',
        value: data.kpis.leadsSemAtividade,
        helper: `Sem interacao acima de ${data.periodo?.noActivityHours || filters.no_activity_hours}h`,
        tone: data.kpis.leadsSemAtividade > 0 ? 'warning' : 'success'
      },
      {
        label: 'Redistribuicoes no periodo',
        value: data.kpis.redistribuicoesPeriodo,
        helper: `${data.kpis.leadsComMaisDeUmaRedistribuicao} lead(s) redistribuido(s) mais de uma vez`,
        tone: data.kpis.leadsComMaisDeUmaRedistribuicao > 0 ? 'warning' : 'default'
      },
      {
        label: 'Responsaveis com carteira',
        value: data.kpis.responsaveisComCarteira,
        helper: 'Usuarios com leads ativos atribuidos',
        tone: 'default'
      },
      {
        label: 'Desequilibrio de carteira',
        value: data.kpis.desequilibrioCarteira,
        helper: 'Diferenca entre maior e menor carteira ativa',
        tone: data.kpis.desequilibrioCarteira > 10 ? 'warning' : 'default'
      }
    ];
  }, [data, filters.no_activity_hours]);

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Distribuicao CRM</h1>
            <p className="page-subtitle">Visao de carteira, redistribuicoes e equilibrio operacional antes da criacao de pools avancados.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/crm/dashboard-sla" className="btn btn-secondary text-sm">SLA</Link>
            <Link to="/crm/leads" className="btn btn-secondary text-sm">Leads</Link>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card sol-surface-card mt-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-main">Recorte de distribuicao</h2>
            <p className="text-xs text-muted">Use este painel para entender sobrecarga e redistribuicoes antes de automatizar regras comerciais.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm text-main">
              Periodo (dias)
              <input
                className="input"
                type="number"
                min="1"
                max="365"
                value={filters.dias}
                onChange={(event) => setFilters((current) => ({ ...current, dias: Number(event.target.value || 30) }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-main">
              Sem atividade (h)
              <input
                className="input"
                type="number"
                min="1"
                max="720"
                value={filters.no_activity_hours}
                onChange={(event) => setFilters((current) => ({ ...current, no_activity_hours: Number(event.target.value || 24) }))}
              />
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-base bg-card p-10 text-center text-sm text-muted">Carregando distribuicao CRM...</div>
      ) : !data ? null : (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map((card) => <MetricCard key={card.label} {...card} />)}
          </div>

          <div className="mt-4">
            <ResponsaveisTable rows={data.responsaveis} />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartPanel
              title="Redistribuicoes por dia"
              subtitle="Volume diario auditado no periodo selecionado."
              rows={data.redistribuicoesPorDia}
              labelKey="dia"
            />
            <ChartPanel
              title="Redistribuicoes por usuario"
              subtitle="Quem executou redistribuicoes no periodo."
              rows={data.redistribuicoesPorAtor}
              labelKey="usuario"
            />
          </div>

          <div className="mt-4">
            <RedistribuicoesRecentes rows={data.redistribuicoesRecentes} />
          </div>
        </>
      )}
    </div>
  );
}
