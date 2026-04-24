import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listarLeads } from '../../../services/crm';
import { useAuth } from '../../../contexts/AuthContext';

const LIFECYCLE_MAP = {
  NOVO:        { label: 'Novo',         cls: 'app-status-pill bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  CONTATO:     { label: 'Contato',      cls: 'app-status-pill bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  QUALIFICADO: { label: 'Qualificado',  cls: 'app-status-pill bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' },
  OPORTUNIDADE:{ label: 'Oportunidade', cls: 'app-status-pill bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  CONVERTIDO:  { label: 'Convertido',   cls: 'app-status-pill bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  PERDIDO:     { label: 'Perdido',      cls: 'app-status-pill bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  ARQUIVADO:   { label: 'Arquivado',    cls: 'app-status-pill bg-elevated text-muted' }
};

const TEMP_MAP = {
  FRIO:   { label: 'Frio',   emoji: '🧊' },
  MORNO:  { label: 'Morno',  emoji: '🟡' },
  QUENTE: { label: 'Quente', emoji: '🔥' }
};

function fmt(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR');
}

export default function CrmCarteira() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', temperatura: '', q: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 50, assigned_user_id: user?.id, ...filters };
    listarLeads(params)
      .then(({ leads: l, total: t }) => {
        setLeads(l || []);
        setTotal(t || 0);
      })
      .catch((err) => alert(err.message || 'Erro ao carregar carteira'))
      .finally(() => setLoading(false));
  }, [page, filters, user?.id]);

  useEffect(() => { load(); }, [load]);

  function setFilter(k) {
    return (e) => {
      setPage(1);
      setFilters((f) => ({ ...f, [k]: e.target.value }));
    };
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Minha Carteira</h1>
            <p className="page-subtitle">{total} lead{total !== 1 ? 's' : ''} atribuido{total !== 1 ? 's' : ''} a voce.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/crm/leads" className="btn btn-secondary text-sm">Todos os Leads</Link>
            <Link to="/crm/tarefas" className="btn btn-secondary text-sm">Minhas Tarefas</Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card sol-surface-card p-4 mt-3">
        <div className="flex flex-wrap gap-3">
          <label className="app-filter-field flex-1 min-w-[160px]">
            <span className="app-filter-label">Buscar</span>
            <input className="input" placeholder="Nome, telefone, email..." value={filters.q} onChange={setFilter('q')} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select className="input" value={filters.status} onChange={setFilter('status')}>
              <option value="">Todos</option>
              {Object.entries(LIFECYCLE_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Temperatura</span>
            <select className="input" value={filters.temperatura} onChange={setFilter('temperatura')}>
              <option value="">Todas</option>
              <option value="QUENTE">Quente</option>
              <option value="MORNO">Morno</option>
              <option value="FRIO">Frio</option>
            </select>
          </label>
          {(filters.status || filters.temperatura || filters.q) && (
            <button
              className="btn btn-secondary text-sm self-end"
              onClick={() => { setFilters({ status: '', temperatura: '', q: '' }); setPage(1); }}
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
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Nenhum lead encontrado na sua carteira.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table w-full">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Temp.</th>
                  <th>Etapa</th>
                  <th>Follow-up</th>
                  <th>Cadastrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const lifecycle = LIFECYCLE_MAP[lead.lifecycle_status] || { label: lead.lifecycle_status, cls: 'app-status-pill bg-elevated text-muted' };
                  const temp = TEMP_MAP[lead.temperatura] || {};
                  return (
                    <tr key={lead.id}>
                      <td className="font-medium text-main">{lead.nome}</td>
                      <td className="text-sm text-sub">{lead.telefone || '—'}</td>
                      <td><span className={lifecycle.cls}>{lifecycle.label}</span></td>
                      <td className="text-base" title={temp.label}>{temp.emoji || '—'}</td>
                      <td>
                        {lead.etapa ? (
                          <span className="inline-flex items-center gap-1 text-xs text-sub">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lead.etapa.cor }} />
                            {lead.etapa.nome}
                          </span>
                        ) : '—'}
                      </td>
                      <td className={`text-sm ${lead.proximo_followup_at && new Date(lead.proximo_followup_at) < new Date() ? 'text-red-500 font-medium' : 'text-sub'}`}>
                        {fmt(lead.proximo_followup_at)}
                      </td>
                      <td className="text-sm text-sub">{fmt(lead.createdAt)}</td>
                      <td>
                        <Link to={`/crm/leads/${lead.id}`} className="btn btn-secondary text-xs">Ver</Link>
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
