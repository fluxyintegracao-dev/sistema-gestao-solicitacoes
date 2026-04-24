import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listarTarefas, concluirTarefa, cancelarTarefa } from '../../../services/crm';

const STATUS_MAP = {
  PENDING:   { label: 'Pendente',  cls: 'app-status-pill bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  DONE:      { label: 'Concluida', cls: 'app-status-pill bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  OVERDUE:   { label: 'Vencida',   cls: 'app-status-pill bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  CANCELLED: { label: 'Cancelada', cls: 'app-status-pill bg-elevated text-muted' }
};

const PRIORITY_MAP = {
  HIGH:   { label: 'Alta',   cls: 'text-red-500' },
  MEDIUM: { label: 'Media',  cls: 'text-amber-500' },
  LOW:    { label: 'Baixa',  cls: 'text-blue-400' }
};

const TYPE_MAP = {
  CALL:     'Ligacao',
  VISIT:    'Visita',
  WHATSAPP: 'WhatsApp',
  EMAIL:    'E-mail',
  PROPOSAL: 'Proposta',
  OTHER:    'Outro'
};

function fmt(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString('pt-BR');
}

function isOverdue(task) {
  return task.status === 'PENDING' && task.due_at && new Date(task.due_at) < new Date();
}

export default function CrmTarefas() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', task_type: '', vencidas: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 50, ...filters };
    listarTarefas(params)
      .then(({ tasks: t, total: tot }) => {
        setTasks(t || []);
        setTotal(tot || 0);
      })
      .catch((err) => alert(err.message || 'Erro ao carregar tarefas'))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(k) {
    return (e) => {
      setPage(1);
      setFilters((f) => ({ ...f, [k]: e.target.value }));
    };
  }

  async function handleComplete(id) {
    try {
      await concluirTarefa(id);
      load();
    } catch (err) {
      alert(err.message || 'Erro ao concluir tarefa');
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancelar esta tarefa?')) return;
    try {
      await cancelarTarefa(id);
      load();
    } catch (err) {
      alert(err.message || 'Erro ao cancelar tarefa');
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Tarefas CRM</h1>
            <p className="page-subtitle">{total} tarefa{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}.</p>
          </div>
          <Link to="/crm/dashboard" className="btn btn-secondary text-sm">Dashboard</Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card sol-surface-card p-4 mt-3">
        <div className="flex flex-wrap gap-3">
          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select className="input" value={filters.status} onChange={setFilter('status')}>
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="DONE">Concluida</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Tipo</span>
            <select className="input" value={filters.task_type} onChange={setFilter('task_type')}>
              <option value="">Todos</option>
              {Object.entries(TYPE_MAP).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Vencidas</span>
            <select className="input" value={filters.vencidas} onChange={setFilter('vencidas')}>
              <option value="">Todas</option>
              <option value="true">Apenas vencidas</option>
            </select>
          </label>
          {(filters.status || filters.task_type || filters.vencidas) && (
            <button
              className="btn btn-secondary text-sm self-end"
              onClick={() => { setFilters({ status: '', task_type: '', vencidas: '' }); setPage(1); }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="card sol-surface-card mt-3 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Carregando...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Nenhuma tarefa encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table w-full">
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th>Lead</th>
                  <th>Tipo</th>
                  <th>Prioridade</th>
                  <th>Responsavel</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  const statusKey = overdue ? 'OVERDUE' : task.status;
                  const statusInfo = STATUS_MAP[statusKey] || STATUS_MAP.PENDING;
                  const priorityInfo = PRIORITY_MAP[task.priority] || PRIORITY_MAP.MEDIUM;
                  return (
                    <tr key={task.id} className={overdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}>
                      <td className="font-medium text-main">{task.title}</td>
                      <td>
                        {task.lead ? (
                          <Link to={`/crm/leads/${task.lead.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            {task.lead.nome}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="text-sm text-sub">{TYPE_MAP[task.task_type] || task.task_type}</td>
                      <td>
                        <span className={`text-sm font-medium ${priorityInfo.cls}`}>{priorityInfo.label}</span>
                      </td>
                      <td className="text-sm text-sub">{task.responsavel?.nome || '—'}</td>
                      <td className={`text-sm whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : 'text-sub'}`}>
                        {fmt(task.due_at)}
                      </td>
                      <td><span className={statusInfo.cls}>{statusInfo.label}</span></td>
                      <td>
                        <div className="flex gap-1">
                          {task.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleComplete(task.id)}
                                className="btn btn-secondary text-xs text-emerald-700 dark:text-emerald-400"
                              >
                                Concluir
                              </button>
                              <button
                                onClick={() => handleCancel(task.id)}
                                className="btn btn-secondary text-xs text-red-600 dark:text-red-400"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginacao */}
      {total > 50 && (
        <div className="flex justify-center gap-2 mt-4">
          <button className="btn btn-secondary text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span className="text-sm text-muted self-center">Pagina {page}</span>
          <button className="btn btn-secondary text-sm" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Proxima</button>
        </div>
      )}
    </div>
  );
}
