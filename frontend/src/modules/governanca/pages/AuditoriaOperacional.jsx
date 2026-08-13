import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineComputerDesktop,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlinePencilSquare,
  HiOutlineShieldCheck,
  HiOutlineSquares2X2,
  HiOutlineUserGroup
} from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import {
  canExportOperationalAudit,
  canViewOperationalAuditDetails,
  canViewOperationalAuditUsers
} from '../../../utils/acessoProduto';
import {
  downloadAuditoriaOperacional,
  getAuditoriaOperacionalEventos,
  getAuditoriaOperacionalOpcoes,
  getAuditoriaOperacionalResumo,
  getAuditoriaOperacionalUsuarios
} from '../services/governancaApi';
import './AuditoriaOperacional.css';

function isoDate(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function initialFilters() {
  const today = new Date();
  return { data_inicio: isoDate(today), data_fim: isoDate(today), usuario_id: '', setor_id: '', modulo: '', categoria: '', tipo_evento: '', resultado: '' };
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

const EVENT_LABELS = {
  PAGE_VIEW: 'Acesso', CREATE: 'Criacao', UPDATE: 'Alteracao', DELETE: 'Exclusao',
  STATUS_CHANGE: 'Mudanca de status', APPROVE: 'Aprovacao', REJECT: 'Recusa', REOPEN: 'Reabertura',
  CLOSE: 'Encerramento', ASSIGN: 'Delegacao', COMMENT: 'Interacao', IMPORT: 'Importacao', EXPORT: 'Exportacao',
  UPLOAD: 'Envio de arquivo', DOWNLOAD: 'Download', RECONCILE: 'Conciliacao', REVERSE: 'Estorno', ACTION: 'Acao'
};

function SummaryItem({ label, value, tone = 'default' }) {
  return <div className={`ao-summary-item tone-${tone}`}><span>{label}</span><strong>{Number(value || 0).toLocaleString('pt-BR')}</strong></div>;
}

function UserRow({ item, selected, onClick }) {
  return (
    <button type="button" className={`ao-user-row ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="ao-user-avatar">{String(item.usuario?.nome || '?').charAt(0).toUpperCase()}</div>
      <div className="ao-user-main">
        <strong>{item.usuario?.nome || 'Usuario removido'}</strong>
        <span>{item.usuario?.email || item.usuario?.perfil || '-'}</span>
      </div>
      <div className="ao-user-metrics">
        <strong>{item.operacoes}</strong><span>acoes</span>
        <strong>{item.navegacoes}</strong><span>acessos</span>
      </div>
      <small>{formatDateTime(item.ultima_atividade)}</small>
    </button>
  );
}

function EventItem({ event }) {
  const failed = event.resultado !== 'SUCCESS';
  const navigation = event.tipo_evento === 'PAGE_VIEW';
  const Icon = failed ? HiOutlineExclamationTriangle : navigation ? HiOutlineComputerDesktop : HiOutlinePencilSquare;
  return (
    <article className={`ao-event ${failed ? 'failed' : ''}`}>
      <div className="ao-event-icon"><Icon /></div>
      <div className="ao-event-body">
        <div className="ao-event-heading">
          <strong>{EVENT_LABELS[event.tipo_evento] || event.tipo_evento}</strong>
          <span className={`ao-result result-${String(event.resultado).toLowerCase()}`}>{event.resultado}</span>
        </div>
        <p>{event.resumo}</p>
        <div className="ao-event-meta">
          <span>{event.usuario?.nome || 'Usuario removido'}</span>
          <span>{event.modulo}</span>
          {event.setor?.nome && <span>{event.setor.nome}</span>}
          {event.recurso_id && <span>{event.recurso_tipo} #{event.recurso_id}</span>}
        </div>
      </div>
      <time>{formatDateTime(event.ocorrido_em)}</time>
    </article>
  );
}

export default function AuditoriaOperacional() {
  const { user } = useAuth();
  const canUsers = canViewOperationalAuditUsers(user);
  const canDetails = canViewOperationalAuditDetails(user);
  const canExport = canExportOperationalAudit(user);
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [summary, setSummary] = useState({});
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState({ rows: [], page: 1, pages: 1, total: 0 });
  const [options, setOptions] = useState({ usuarios: [], setores: [], modulos: [] });
  const [selectedUser, setSelectedUser] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => ({ ...applied, usuario_id: selectedUser || applied.usuario_id || '', page, limit: 30 }), [applied, page, selectedUser]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, optionsData, usersData, eventsData] = await Promise.all([
        getAuditoriaOperacionalResumo(query),
        getAuditoriaOperacionalOpcoes(query),
        canUsers ? getAuditoriaOperacionalUsuarios(query) : Promise.resolve([]),
        canDetails ? getAuditoriaOperacionalEventos(query) : Promise.resolve({ rows: [], page: 1, pages: 1, total: 0 })
      ]);
      setSummary(summaryData);
      setOptions(optionsData);
      setUsers(usersData);
      setEvents(eventsData);
    } catch (err) {
      setError(err.message || 'Nao foi possivel carregar a auditoria operacional.');
    } finally { setLoading(false); }
  }, [canDetails, canUsers, query]);

  useEffect(() => { load(); }, [load]);

  function applyFilters(event) {
    event.preventDefault();
    setSelectedUser('');
    setPage(1);
    setApplied({ ...filters });
  }

  function clearFilters() {
    const next = initialFilters();
    setFilters(next); setApplied(next); setSelectedUser(''); setPage(1);
  }

  return (
    <section className="auditoria-operacional-page">
      <div className="ao-heading">
        <div>
          <span className="ao-eyebrow">ADMINISTRACAO · RASTREABILIDADE</span>
          <h2>Auditoria Operacional</h2>
          <p>Atividade registrada no sistema por usuario, modulo e horario. Conteudos sensiveis de formularios e documentos nao fazem parte desta trilha.</p>
        </div>
        <div className="ao-heading-actions">
          {canExport && <button type="button" className="ao-btn" onClick={() => downloadAuditoriaOperacional(query).catch((err) => setError(err.message))}><HiOutlineArrowDownTray /> Exportar CSV</button>}
          <button type="button" className="ao-btn primary" onClick={load}><HiOutlineArrowPath /> Atualizar</button>
        </div>
      </div>

      <form className="ao-filters" onSubmit={applyFilters}>
        <label><span>De</span><input type="date" value={filters.data_inicio} onChange={(e) => setFilters((old) => ({ ...old, data_inicio: e.target.value }))} /></label>
        <label><span>Ate</span><input type="date" value={filters.data_fim} onChange={(e) => setFilters((old) => ({ ...old, data_fim: e.target.value }))} /></label>
        <label><span>Usuario</span><select value={filters.usuario_id} onChange={(e) => setFilters((old) => ({ ...old, usuario_id: e.target.value }))}><option value="">Todos</option>{options.usuarios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label><span>Setor</span><select value={filters.setor_id} onChange={(e) => setFilters((old) => ({ ...old, setor_id: e.target.value }))}><option value="">Todos</option>{options.setores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label><span>Modulo</span><select value={filters.modulo} onChange={(e) => setFilters((old) => ({ ...old, modulo: e.target.value }))}><option value="">Todos</option>{options.modulos.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Categoria</span><select value={filters.categoria} onChange={(e) => setFilters((old) => ({ ...old, categoria: e.target.value }))}><option value="">Todas</option><option value="NAVEGACAO">Navegacao</option><option value="OPERACAO">Operacao</option><option value="SEGURANCA">Falhas e bloqueios</option></select></label>
        <label><span>Evento</span><select value={filters.tipo_evento} onChange={(e) => setFilters((old) => ({ ...old, tipo_evento: e.target.value }))}><option value="">Todos</option>{Object.entries(EVENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Resultado</span><select value={filters.resultado} onChange={(e) => setFilters((old) => ({ ...old, resultado: e.target.value }))}><option value="">Todos</option><option value="SUCCESS">Sucesso</option><option value="FAILED">Falha</option><option value="DENIED">Bloqueado</option></select></label>
        <div className="ao-filter-actions"><button className="ao-btn primary" type="submit"><HiOutlineFunnel /> Aplicar</button><button className="ao-btn" type="button" onClick={clearFilters}>Limpar</button></div>
      </form>

      {error && <div className="ao-alert"><HiOutlineExclamationTriangle /> {error}</div>}

      <div className="ao-summary" aria-busy={loading}>
        <SummaryItem label="Usuarios ativos" value={summary.usuarios} />
        <SummaryItem label="Acessos a paginas" value={summary.navegacoes} />
        <SummaryItem label="Acoes operacionais" value={summary.operacoes} tone="primary" />
        <SummaryItem label="Registros criados" value={summary.criacoes} />
        <SummaryItem label="Alteracoes" value={summary.alteracoes} />
        <SummaryItem label="Conclusoes" value={summary.conclusoes} tone="success" />
        <SummaryItem label="Falhas ou bloqueios" value={summary.falhas} tone={summary.falhas ? 'danger' : 'default'} />
      </div>

      <div className={`ao-workspace ${!canUsers ? 'summary-only' : ''}`}>
        {canUsers && (
          <aside className="ao-users-panel">
            <div className="ao-panel-title"><div><HiOutlineUserGroup /><strong>Atividade por usuario</strong></div><span>{users.length}</span></div>
            <button type="button" className={`ao-all-users ${!selectedUser ? 'selected' : ''}`} onClick={() => { setSelectedUser(''); setPage(1); }}>Todos os usuarios</button>
            <div className="ao-users-list">
              {users.map((item) => <UserRow key={item.usuario_id} item={item} selected={String(selectedUser) === String(item.usuario_id)} onClick={() => { setSelectedUser(String(item.usuario_id)); setPage(1); }} />)}
              {!loading && !users.length && <p className="ao-empty">Nenhuma atividade encontrada.</p>}
            </div>
          </aside>
        )}

        <div className="ao-events-panel">
          <div className="ao-panel-title">
            <div><HiOutlineClock /><strong>Linha do tempo</strong></div>
            <span>{events.total || 0} evento(s)</span>
          </div>
          {canDetails ? (
            <>
              <div className="ao-events-list">
                {events.rows.map((event) => <EventItem key={event.id} event={event} />)}
                {!loading && !events.rows.length && <div className="ao-empty large"><HiOutlineSquares2X2 />Nenhum evento detalhado no recorte selecionado.</div>}
              </div>
              {events.pages > 1 && <div className="ao-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((old) => old - 1)}><HiOutlineChevronLeft /></button><span>Pagina {events.page} de {events.pages}</span><button type="button" disabled={page >= events.pages} onClick={() => setPage((old) => old + 1)}><HiOutlineChevronRight /></button></div>}
            </>
          ) : (
            <div className="ao-permission-note"><HiOutlineShieldCheck /><div><strong>Detalhamento protegido</strong><p>Seu acesso permite consultar os indicadores agregados. Solicite a permissao de detalhes para abrir a linha do tempo.</p></div></div>
          )}
        </div>
      </div>

      <footer className="ao-retention-note"><HiOutlineShieldCheck /> A trilha e append-only e passa a existir a partir da implantacao desta funcionalidade. Nenhum historico anterior e inferido artificialmente.</footer>
    </section>
  );
}
