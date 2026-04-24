import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { arquivarLead, exportarLeadsCrm, listarLeads } from '../../../services/crm';
import { canExportCrmLeads } from '../../../utils/acessoProduto';

const LIFECYCLE_MAP = {
  NOVO:        { label: 'Novo',        cls: 'app-status-pill bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  CONTATO:     { label: 'Contato',     cls: 'app-status-pill bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  QUALIFICADO: { label: 'Qualificado', cls: 'app-status-pill bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' },
  OPORTUNIDADE:{ label: 'Oportunidade',cls: 'app-status-pill bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  CONVERTIDO:  { label: 'Convertido',  cls: 'app-status-pill bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  PERDIDO:     { label: 'Perdido',     cls: 'app-status-pill bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  ARQUIVADO:   { label: 'Arquivado',   cls: 'app-status-pill bg-elevated text-muted' }
};

const TEMP_MAP = {
  FRIO:   { label: 'Frio',   emoji: '🧊', cls: 'text-blue-500' },
  MORNO:  { label: 'Morno',  emoji: '🟡', cls: 'text-amber-500' },
  QUENTE: { label: 'Quente', emoji: '🔥', cls: 'text-red-500' }
};

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR');
}

export default function CrmLeads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dados, setDados] = useState({ total: 0, leads: [] });
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({ q: '', status: '', temperatura: '', source_type: '' });
  const podeExportar = canExportCrmLeads(user);

  async function carregar(pg = page) {
    try {
      setLoading(true);
      const result = await listarLeads({
        q: filtros.q || undefined,
        status: filtros.status || undefined,
        temperatura: filtros.temperatura || undefined,
        source_type: filtros.source_type || undefined,
        page: pg,
        limit: 50
      });
      setDados(result);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(1); setPage(1); }, [filtros]);

  async function handleArquivar(id, nome) {
    if (!confirm(`Arquivar lead "${nome}"?`)) return;
    try {
      await arquivarLead(id);
      carregar(page);
    } catch (err) {
      alert(err.message || 'Erro ao arquivar lead');
    }
  }

  async function handleExportar() {
    try {
      setExportando(true);
      const { blob, filename } = await exportarLeadsCrm({
        q: filtros.q || undefined,
        status: filtros.status || undefined,
        temperatura: filtros.temperatura || undefined,
        source_type: filtros.source_type || undefined
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Erro ao exportar leads');
    } finally {
      setExportando(false);
    }
  }

  const leads = dados.leads || [];
  const totalConvertidos = leads.filter((l) => l.lifecycle_status === 'CONVERTIDO').length;
  const totalQuentes = leads.filter((l) => l.temperatura === 'QUENTE').length;

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Leads</h1>
            <p className="page-subtitle">Gestao de leads e oportunidades comerciais do CRM.</p>
          </div>
          <div className="flex items-center gap-2">
            {podeExportar && (
              <button
                type="button"
                onClick={handleExportar}
                className="btn btn-secondary text-sm"
                disabled={exportando}
              >
                {exportando ? 'Exportando...' : 'Exportar CSV'}
              </button>
            )}
            <Link to="/crm/kanban" className="btn btn-secondary text-sm">Kanban</Link>
            <Link to="/crm/leads/novo" className="btn btn-primary text-sm">+ Novo Lead</Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total de leads', value: dados.total },
          { label: 'Convertidos', value: totalConvertidos },
          { label: 'Quentes', value: totalQuentes }
        ].map((card) => (
          <div key={card.label} className="card sol-surface-card px-4 py-3 flex items-center gap-3">
            <div>
              <p className="text-xs text-muted">{card.label}</p>
              <p className="text-xl font-bold text-main">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <div className="app-filters-grid">
          <label className="app-filter-field">
            <span className="app-filter-label">Busca</span>
            <input
              className="input"
              placeholder="Nome, telefone, e-mail, empreendimento"
              value={filtros.q}
              onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
            />
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select className="input" value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(LIFECYCLE_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Temperatura</span>
            <select className="input" value={filtros.temperatura} onChange={(e) => setFiltros((f) => ({ ...f, temperatura: e.target.value }))}>
              <option value="">Todas</option>
              <option value="QUENTE">Quente</option>
              <option value="MORNO">Morno</option>
              <option value="FRIO">Frio</option>
            </select>
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Origem</span>
            <select className="input" value={filtros.source_type} onChange={(e) => setFiltros((f) => ({ ...f, source_type: e.target.value }))}>
              <option value="">Todas</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="MANUAL">Manual</option>
              <option value="SITE">Site</option>
              <option value="INDICACAO">Indicacao</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Carregando...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Nenhum lead encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table w-full">
              <thead>
                <tr>
                  <th className="app-th">#</th>
                  <th className="app-th">Nome</th>
                  <th className="app-th">Telefone</th>
                  <th className="app-th">Status</th>
                  <th className="app-th">Temp.</th>
                  <th className="app-th">Etapa</th>
                  <th className="app-th">Responsavel</th>
                  <th className="app-th">Origem</th>
                  <th className="app-th">Cadastrado em</th>
                  <th className="app-th">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const lifecycle = LIFECYCLE_MAP[lead.lifecycle_status] || { label: lead.lifecycle_status, cls: 'app-status-pill bg-elevated text-muted' };
                  const temp = TEMP_MAP[lead.temperatura] || {};
                  return (
                    <tr key={lead.id} className="app-tr">
                      <td className="app-td text-muted text-xs">{lead.id}</td>
                      <td className="app-td">
                        <Link to={`/crm/leads/${lead.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                          {lead.nome}
                        </Link>
                        {lead.empreendimento_interesse && (
                          <p className="text-xs text-muted">{lead.empreendimento_interesse}</p>
                        )}
                      </td>
                      <td className="app-td text-sm">{lead.telefone || '—'}</td>
                      <td className="app-td"><span className={lifecycle.cls}>{lifecycle.label}</span></td>
                      <td className="app-td text-center">
                        <span className={`text-sm ${temp.cls || ''}`} title={temp.label}>{temp.emoji || '—'}</span>
                      </td>
                      <td className="app-td text-sm">
                        {lead.etapa ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: lead.etapa.cor }} />
                            {lead.etapa.nome}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="app-td text-sm">{lead.responsavel?.nome || '—'}</td>
                      <td className="app-td text-xs text-muted">{lead.source_type?.replace('_', ' ')}</td>
                      <td className="app-td text-xs text-muted">{formatDate(lead.createdAt)}</td>
                      <td className="app-td">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/crm/leads/${lead.id}`)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Abrir
                          </button>
                          {lead.lifecycle_status !== 'ARQUIVADO' && (
                            <button
                              onClick={() => handleArquivar(lead.id, lead.nome)}
                              className="text-xs text-muted hover:text-red-500 ml-2"
                            >
                              Arquivar
                            </button>
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
    </div>
  );
}
