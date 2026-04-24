import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obterDashboardSlaCrm } from '../../../services/crm';

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

function BucketCard({ title, subtitle, rows }) {
  return (
    <div className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {rows?.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={`${title}-${row.faixa}`} className="flex items-center justify-between gap-3 rounded-xl border border-base bg-elevated/30 px-3 py-2">
              <span className="text-sm text-main">{row.faixa}</span>
              <span className="text-sm font-semibold text-main">{row.total}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Sem dados para o recorte atual.</p>
      )}
    </div>
  );
}

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function fmtMinutes(value) {
  if (!Number.isFinite(Number(value))) return '-';
  const total = Number(value);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function fmtHours(value) {
  if (!Number.isFinite(Number(value))) return '-';
  const total = Number(value);
  if (total < 24) return `${total}h`;
  const days = Math.floor(total / 24);
  const hours = total % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function BacklogTable({ rows }) {
  return (
    <div className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">Backlog por responsavel</h2>
        <p className="text-xs text-muted">Fila combinada de leads sem contato, tarefas vencidas e conversas pendentes.</p>
      </div>

      {!rows?.length ? (
        <div className="rounded-2xl border border-dashed border-base p-8 text-center text-sm text-muted">Nenhum backlog por responsavel neste recorte.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="app-table w-full">
            <thead>
              <tr>
                <th className="app-th">Responsavel</th>
                <th className="app-th">Sem contato</th>
                <th className="app-th">Tarefas vencidas</th>
                <th className="app-th">Conversas</th>
                <th className="app-th">Nao lidas</th>
                <th className="app-th">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.usuario?.id || row.usuario?.nome} className="app-tr">
                  <td className="app-td font-medium text-main">{row.usuario?.nome || '-'}</td>
                  <td className="app-td">{row.leadsSemPrimeiroContato}</td>
                  <td className="app-td">{row.tarefasVencidas}</td>
                  <td className="app-td">{row.conversasPendentes}</td>
                  <td className="app-td">{row.mensagensNaoLidas}</td>
                  <td className="app-td font-semibold text-main">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ListPanel({ title, subtitle, rows, columns, emptyMessage }) {
  return (
    <div className="card sol-surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-main">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {!rows?.length ? (
        <div className="rounded-2xl border border-dashed border-base p-8 text-center text-sm text-muted">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="app-table w-full">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="app-th">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || `${title}-${index}`} className="app-tr">
                  {columns.map((column) => (
                    <td key={column.key} className="app-td">{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CrmDashboardSla() {
  const [filters, setFilters] = useState({
    first_contact_minutes: 60,
    no_activity_hours: 24,
    recent_days: 7
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(currentFilters = filters) {
    setLoading(true);
    setError('');
    obterDashboardSlaCrm(currentFilters)
      .then(setData)
      .catch((err) => setError(err.message || 'Erro ao carregar dashboard de SLA'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(filters);
  }, [filters.first_contact_minutes, filters.no_activity_hours, filters.recent_days]);

  const cards = useMemo(() => {
    if (!data?.kpis) return [];
    return [
      {
        label: 'Leads sem primeiro contato',
        value: data.kpis.leadsSemPrimeiroContato,
        helper: `Regra atual: ${data.thresholds?.firstContactMinutes || filters.first_contact_minutes} min`,
        tone: 'danger'
      },
      {
        label: 'Leads sem atividade',
        value: data.kpis.leadsSemAtividade,
        helper: `Regra atual: ${data.thresholds?.noActivityHours || filters.no_activity_hours} h`,
        tone: 'warning'
      },
      {
        label: 'Tarefas vencidas',
        value: data.kpis.tarefasVencidas,
        helper: `${data.kpis.tarefasCriticas} critica(s)`,
        tone: data.kpis.tarefasCriticas > 0 ? 'danger' : 'warning'
      },
      {
        label: 'Conversas em fila',
        value: data.kpis.conversasAbertas + data.kpis.conversasPendentes,
        helper: `${data.kpis.mensagensNaoLidas} mensagem(ns) nao lida(s)`,
        tone: 'info'
      },
      {
        label: 'Regras SLA ativas',
        value: data.kpis.regrasSlaAtivas,
        helper: 'Automacoes NO_FIRST_CONTACT e NO_ACTIVITY',
        tone: 'default'
      },
      {
        label: 'Execucoes recentes com erro',
        value: data.kpis.execucoesRecentesErro,
        helper: `${data.kpis.execucoesRecentes} execucao(oes) nos ultimos ${data.thresholds?.recentDays || filters.recent_days} dias`,
        tone: data.kpis.execucoesRecentesErro > 0 ? 'danger' : 'success'
      }
    ];
  }, [data, filters]);

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Dashboard SLA CRM</h1>
            <p className="page-subtitle">Leitura de atrasos operacionais, backlog por responsavel e saude do runtime do CRM.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/crm/dashboard-gerencial" className="btn btn-secondary text-sm">Gerencial</Link>
            <Link to="/crm/dashboard-distribuicao" className="btn btn-secondary text-sm">Distribuicao</Link>
            <Link to="/crm/automacoes" className="btn btn-secondary text-sm">Automacoes</Link>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card sol-surface-card mt-4 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-main">Parametros de leitura</h2>
            <p className="text-xs text-muted">Ajuste as janelas para simular o SLA comercial e o atraso aceitavel por instalacao.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="grid gap-1 text-sm text-main">
              Primeiro contato (min)
              <input
                className="input"
                type="number"
                min="15"
                max="1440"
                value={filters.first_contact_minutes}
                onChange={(e) => setFilters((current) => ({ ...current, first_contact_minutes: Number(e.target.value || 60) }))}
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
                onChange={(e) => setFilters((current) => ({ ...current, no_activity_hours: Number(e.target.value || 24) }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-main">
              Janela automacoes (dias)
              <input
                className="input"
                type="number"
                min="1"
                max="90"
                value={filters.recent_days}
                onChange={(e) => setFilters((current) => ({ ...current, recent_days: Number(e.target.value || 7) }))}
              />
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-base bg-card p-10 text-center text-sm text-muted">Carregando dashboard de SLA...</div>
      ) : !data ? null : (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map((card) => <MetricCard key={card.label} {...card} />)}
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <BucketCard
              title="Faixas sem primeiro contato"
              subtitle="Leads novos ou em contato que ja estouraram o SLA inicial."
              rows={data.buckets?.primeiroContato}
            />
            <BucketCard
              title="Faixas sem atividade"
              subtitle="Leads sem interacao recente conforme a regra configurada."
              rows={data.buckets?.semAtividade}
            />
            <BucketCard
              title="Runtime de automacoes"
              subtitle={`Execucoes nos ultimos ${data.thresholds?.recentDays || filters.recent_days} dias.`}
              rows={data.automacoes?.execucoesPorStatus?.map((item) => ({ faixa: item.chave, total: item.total }))}
            />
          </div>

          <div className="mt-4">
            <BacklogTable rows={data.backlogResponsaveis} />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ListPanel
              title="Leads sem primeiro contato"
              subtitle="Mais antigos e com maior urgencia de abordagem."
              rows={data.leadsPrimeiroContato}
              emptyMessage="Nenhum lead com atraso de primeiro contato."
              columns={[
                {
                  key: 'lead',
                  label: 'Lead',
                  render: (row) => (
                    <div>
                      <Link to={`/crm/leads/${row.id}`} className="font-medium text-indigo-600 hover:underline">{row.nome}</Link>
                      <p className="text-xs text-muted">{row.telefone || '-'}</p>
                    </div>
                  )
                },
                {
                  key: 'responsavel',
                  label: 'Responsavel',
                  render: (row) => row.responsavel?.nome || '-'
                },
                {
                  key: 'etapa',
                  label: 'Etapa',
                  render: (row) => row.etapa?.nome || '-'
                },
                {
                  key: 'atraso',
                  label: 'Atraso',
                  render: (row) => fmtMinutes(row.atrasoMinutos)
                },
                {
                  key: 'createdAt',
                  label: 'Entrada',
                  render: (row) => fmtDate(row.createdAt)
                }
              ]}
            />

            <ListPanel
              title="Leads sem atividade"
              subtitle="Carteira que exige retomada, redistribuicao ou encerramento."
              rows={data.leadsSemAtividade}
              emptyMessage="Nenhum lead sem atividade acima do limite configurado."
              columns={[
                {
                  key: 'lead',
                  label: 'Lead',
                  render: (row) => (
                    <div>
                      <Link to={`/crm/leads/${row.id}`} className="font-medium text-indigo-600 hover:underline">{row.nome}</Link>
                      <p className="text-xs text-muted">{row.telefone || '-'}</p>
                    </div>
                  )
                },
                {
                  key: 'responsavel',
                  label: 'Responsavel',
                  render: (row) => row.responsavel?.nome || '-'
                },
                {
                  key: 'etapa',
                  label: 'Etapa',
                  render: (row) => row.etapa?.nome || '-'
                },
                {
                  key: 'atraso',
                  label: 'Atraso',
                  render: (row) => fmtHours(row.atrasoHoras)
                },
                {
                  key: 'ultima',
                  label: 'Ultima interacao',
                  render: (row) => fmtDate(row.ultimaInteracaoAt)
                }
              ]}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ListPanel
              title="Tarefas vencidas"
              subtitle="Fila operacional que ja passou do prazo."
              rows={data.tarefas}
              emptyMessage="Nenhuma tarefa vencida no momento."
              columns={[
                {
                  key: 'titulo',
                  label: 'Tarefa',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-main">{row.title}</p>
                      <p className="text-xs text-muted">{row.lead?.nome || '-'}</p>
                    </div>
                  )
                },
                {
                  key: 'responsavel',
                  label: 'Responsavel',
                  render: (row) => row.responsavel?.nome || '-'
                },
                {
                  key: 'priority',
                  label: 'Prioridade',
                  render: (row) => row.priority
                },
                {
                  key: 'atraso',
                  label: 'Atraso',
                  render: (row) => fmtHours(row.atrasoHoras)
                },
                {
                  key: 'dueAt',
                  label: 'Vencimento',
                  render: (row) => fmtDate(row.dueAt)
                }
              ]}
            />

            <ListPanel
              title="Conversas pendentes"
              subtitle="Inbox que ainda exige resposta ou tratamento comercial."
              rows={data.conversas}
              emptyMessage="Nenhuma conversa aberta ou pendente no inbox."
              columns={[
                {
                  key: 'lead',
                  label: 'Lead',
                  render: (row) => (
                    <div>
                      {row.lead?.id ? (
                        <Link to={`/crm/leads/${row.lead.id}`} className="font-medium text-indigo-600 hover:underline">{row.lead?.nome || `Lead #${row.lead?.id}`}</Link>
                      ) : (
                        <span className="font-medium text-main">{row.lead?.nome || '-'}</span>
                      )}
                      <p className="text-xs text-muted">Conversa #{row.id}</p>
                    </div>
                  )
                },
                {
                  key: 'responsavel',
                  label: 'Responsavel',
                  render: (row) => row.responsavel?.nome || '-'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => `${row.status} / ${row.priority}`
                },
                {
                  key: 'unreadCount',
                  label: 'Nao lidas',
                  render: (row) => row.unreadCount
                },
                {
                  key: 'lastMessageAt',
                  label: 'Ultima mensagem',
                  render: (row) => fmtDate(row.lastMessageAt)
                }
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
