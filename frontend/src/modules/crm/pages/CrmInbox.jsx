import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  atualizarConversaCrm,
  criarConversaCrm,
  criarTemplateMensagemCrm,
  listarConversasCrm,
  listarTemplatesMensagemCrm,
  marcarConversaLidaCrm,
  obterConversaCrm,
  registrarMensagemCrm
} from '../../../services/crm';

const STATUS_LABEL = {
  OPEN: 'Aberta',
  PENDING: 'Pendente',
  RESOLVED: 'Resolvida',
  ARCHIVED: 'Arquivada'
};

const CHANNEL_LABEL = {
  WHATSAPP: 'WhatsApp',
  PHONE: 'Telefone',
  EMAIL: 'E-mail',
  FORM: 'Formulario',
  CHAT: 'Chat',
  OTHER: 'Outro'
};

const PRIORITY_LABEL = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta'
};

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function initials(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || '?') + (parts[1]?.[0] || '');
}

function statusClass(status) {
  if (status === 'OPEN') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (status === 'RESOLVED') return 'bg-blue-100 text-blue-700 border border-blue-200';
  return 'bg-elevated text-muted border border-base';
}

const emptyNewConversation = {
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  subject: '',
  channel_type: 'WHATSAPP',
  priority: 'MEDIUM',
  initial_message: ''
};

const emptyTemplate = {
  nome: '',
  channel_type: 'WHATSAPP',
  categoria: '',
  content: ''
};

export default function CrmInbox() {
  const [filters, setFilters] = useState({ q: '', status: '', channel_type: '', unread_only: '' });
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [compose, setCompose] = useState({ content: '', direction: 'OUTBOUND' });
  const [newConversation, setNewConversation] = useState(emptyNewConversation);
  const [showNew, setShowNew] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [error, setError] = useState('');

  const loadList = useCallback(() => {
    setLoadingList(true);
    setError('');
    return listarConversasCrm({ page: 1, limit: 50, ...filters })
      .then((data) => {
        setConversations(data.conversations || []);
        setTotal(data.total || 0);
        if (!selectedId && data.conversations?.[0]?.id) {
          setSelectedId(data.conversations[0].id);
        }
      })
      .catch((err) => setError(err.message || 'Erro ao carregar conversas'))
      .finally(() => setLoadingList(false));
  }, [filters, selectedId]);

  const loadTemplates = useCallback(() => {
    listarTemplatesMensagemCrm({ ativo: true })
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));
  }, []);

  const loadDetail = useCallback((id, params = {}, options = {}) => {
    if (!id) {
      setConversation(null);
      return Promise.resolve();
    }
    if (options.appendOlder !== true) {
      setLoadingDetail(true);
    } else {
      setLoadingMoreMessages(true);
    }
    setError('');
    return obterConversaCrm(id, { messages_limit: 40, ...params })
      .then((data) => {
        if (options.appendOlder) {
          setConversation((current) => {
            if (!current || current.id !== data.id) return data;
            const currentMessages = Array.isArray(current.messages) ? current.messages : [];
            const olderMessages = Array.isArray(data.messages) ? data.messages : [];
            const merged = [...olderMessages, ...currentMessages];
            const seen = new Set();
            const deduped = merged.filter((item) => {
              const key = Number(item.id);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return {
              ...current,
              ...data,
              messages: deduped,
              messages_meta: data.messages_meta || current.messages_meta
            };
          });
          return;
        }
        setConversation(data);
      })
      .catch((err) => setError(err.message || 'Erro ao carregar conversa'))
      .finally(() => {
        if (options.appendOlder !== true) {
          setLoadingDetail(false);
        } else {
          setLoadingMoreMessages(false);
        }
      });
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadDetail(selectedId); }, [loadDetail, selectedId]);

  const orderedMessages = useMemo(() => {
    return [...(conversation?.messages || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [conversation]);

  function updateFilter(field) {
    return (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleCreateConversation(event) {
    event.preventDefault();
    try {
      const created = await criarConversaCrm(newConversation);
      setNewConversation(emptyNewConversation);
      setShowNew(false);
      setSelectedId(created.id);
      loadList();
    } catch (err) {
      setError(err.message || 'Erro ao criar conversa');
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!conversation?.id || !compose.content.trim()) return;
    try {
      await registrarMensagemCrm(conversation.id, compose);
      setCompose({ content: '', direction: 'OUTBOUND' });
      await loadDetail(conversation.id);
      loadList();
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
    }
  }

  async function handleStatusChange(event) {
    if (!conversation?.id) return;
    try {
      const updated = await atualizarConversaCrm(conversation.id, { status: event.target.value });
      setConversation(updated);
      loadList();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status');
    }
  }

  async function handleMarkRead() {
    if (!conversation?.id) return;
    try {
      const updated = await marcarConversaLidaCrm(conversation.id);
      setConversation(updated);
      loadList();
    } catch (err) {
      setError(err.message || 'Erro ao marcar como lida');
    }
  }

  async function handleCreateTemplate(event) {
    event.preventDefault();
    try {
      await criarTemplateMensagemCrm(templateForm);
      setTemplateForm(emptyTemplate);
      loadTemplates();
    } catch (err) {
      setError(err.message || 'Erro ao criar template');
    }
  }

  function applyTemplate(event) {
    const template = templates.find((item) => String(item.id) === event.target.value);
    if (template) {
      setCompose((current) => ({ ...current, content: template.content || '' }));
    }
  }

  function handleLoadOlderMessages() {
    const beforeMessageId = conversation?.messages_meta?.oldest_message_id;
    if (!conversation?.id || !beforeMessageId || loadingMoreMessages) return;
    loadDetail(
      conversation.id,
      { before_message_id: beforeMessageId, messages_limit: 40 },
      { appendOlder: true }
    );
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Inbox CRM</h1>
            <p className="page-subtitle">Conversas comerciais unificadas por canal, lead e responsavel.</p>
          </div>
          <button type="button" className="btn btn-primary text-sm" onClick={() => setShowNew((value) => !value)}>
            Nova conversa
          </button>
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showNew && (
        <form onSubmit={handleCreateConversation} className="card sol-surface-card mt-3 p-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-main">Nova conversa manual</h2>
            <p className="text-xs text-muted">Use para conversas iniciadas fora dos webhooks ou para atendimento ativo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="input" placeholder="Nome do contato" value={newConversation.contact_name} onChange={(e) => setNewConversation((c) => ({ ...c, contact_name: e.target.value }))} />
            <input className="input" placeholder="Telefone" value={newConversation.contact_phone} onChange={(e) => setNewConversation((c) => ({ ...c, contact_phone: e.target.value }))} />
            <input className="input" placeholder="E-mail" value={newConversation.contact_email} onChange={(e) => setNewConversation((c) => ({ ...c, contact_email: e.target.value }))} />
            <input className="input md:col-span-2" placeholder="Assunto" value={newConversation.subject} onChange={(e) => setNewConversation((c) => ({ ...c, subject: e.target.value }))} />
            <select className="input" value={newConversation.channel_type} onChange={(e) => setNewConversation((c) => ({ ...c, channel_type: e.target.value }))}>
              {Object.entries(CHANNEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="input" value={newConversation.priority} onChange={(e) => setNewConversation((c) => ({ ...c, priority: e.target.value }))}>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <textarea className="input md:col-span-2 min-h-[92px]" placeholder="Mensagem inicial opcional" value={newConversation.initial_message} onChange={(e) => setNewConversation((c) => ({ ...c, initial_message: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowNew(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary text-sm">Criar conversa</button>
          </div>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <aside className="space-y-3">
          <div className="card sol-surface-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-main">Conversas</h2>
                <p className="text-xs text-muted">{total} registro{total !== 1 ? 's' : ''} listado{total !== 1 ? 's' : ''}</p>
              </div>
              <button type="button" className="btn btn-secondary text-xs" onClick={loadList}>Atualizar</button>
            </div>
            <div className="mt-3 grid gap-2">
              <input className="input" placeholder="Buscar nome, telefone, assunto..." value={filters.q} onChange={updateFilter('q')} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={filters.status} onChange={updateFilter('status')}>
                  <option value="">Todos status</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="input" value={filters.channel_type} onChange={updateFilter('channel_type')}>
                  <option value="">Todos canais</option>
                  {Object.entries(CHANNEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <select className="input" value={filters.unread_only} onChange={updateFilter('unread_only')}>
                <option value="">Todas as conversas</option>
                <option value="true">Somente nao lidas</option>
              </select>
            </div>
          </div>

          <div className="card sol-surface-card p-2 max-h-[680px] overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-sm text-muted">Carregando conversas...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted">Nenhuma conversa encontrada.</p>
            ) : conversations.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl p-3 text-left transition border ${selectedId === item.id ? 'border-blue-300 bg-blue-50/70 dark:bg-blue-950/20' : 'border-transparent hover:border-base hover:bg-elevated/70'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-main text-white text-xs font-bold">
                    {initials(item.contact_name || item.lead?.nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-main">{item.contact_name || item.lead?.nome || 'Contato sem nome'}</span>
                      {item.unread_count > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{item.unread_count}</span>}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted">{item.last_message_preview || item.subject || 'Sem mensagens registradas'}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(item.status)}`}>{STATUS_LABEL[item.status] || item.status}</span>
                      <span className="rounded-full border border-base bg-card px-2 py-0.5 text-[11px] text-muted">{CHANNEL_LABEL[item.channel_type] || item.channel_type}</span>
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-3">
          <section className="card sol-surface-card p-5 min-h-[520px]">
            {loadingDetail ? (
              <p className="text-sm text-muted">Carregando conversa...</p>
            ) : !conversation ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-muted">Selecione uma conversa para visualizar o historico.</div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-base pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-main">{conversation.contact_name || conversation.lead?.nome || 'Contato sem nome'}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(conversation.status)}`}>{STATUS_LABEL[conversation.status] || conversation.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{conversation.subject || 'Sem assunto'} | {CHANNEL_LABEL[conversation.channel_type] || conversation.channel_type}</p>
                    <p className="text-xs text-muted">Responsavel: {conversation.responsavel?.nome || '-'} | Lead: {conversation.lead?.nome || '-'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select className="input max-w-[180px]" value={conversation.status || 'OPEN'} onChange={handleStatusChange}>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" className="btn btn-secondary text-sm" onClick={handleMarkRead}>Marcar lida</button>
                  </div>
                </div>

                <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-2">
                  {conversation?.messages_meta?.has_more && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={handleLoadOlderMessages}
                        disabled={loadingMoreMessages}
                      >
                        {loadingMoreMessages ? 'Carregando...' : 'Carregar mensagens anteriores'}
                      </button>
                    </div>
                  )}
                  {orderedMessages.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-base p-6 text-center text-sm text-muted">Nenhuma mensagem registrada.</p>
                  ) : orderedMessages.map((message) => {
                    const isOutbound = message.direction === 'OUTBOUND';
                    const isInternal = message.direction === 'INTERNAL';
                    return (
                      <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl border px-4 py-3 shadow-sm ${isInternal ? 'border-amber-200 bg-amber-50 text-amber-900' : isOutbound ? 'border-blue-200 bg-blue-50 text-blue-950' : 'border-base bg-card text-main'}`}>
                          <div className="mb-1 flex items-center justify-between gap-4 text-[11px] text-muted">
                            <span>{isInternal ? 'Nota interna' : isOutbound ? (message.usuario?.nome || 'Usuario') : 'Contato'}</span>
                            <span>{fmtDate(message.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 rounded-2xl border border-base bg-elevated/40 p-3">
                  <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[170px_1fr]">
                    <select className="input" value={compose.direction} onChange={(e) => setCompose((c) => ({ ...c, direction: e.target.value }))}>
                      <option value="OUTBOUND">Mensagem</option>
                      <option value="INTERNAL">Nota interna</option>
                    </select>
                    <select className="input" defaultValue="" onChange={applyTemplate}>
                      <option value="">Inserir template...</option>
                      {templates.map((template) => <option key={template.id} value={template.id}>{template.nome}</option>)}
                    </select>
                  </div>
                  <textarea className="input min-h-[110px]" placeholder="Digite a mensagem ou nota..." value={compose.content} onChange={(e) => setCompose((c) => ({ ...c, content: e.target.value }))} />
                  <div className="mt-2 flex justify-end">
                    <button type="submit" className="btn btn-primary text-sm">Registrar</button>
                  </div>
                </form>
              </>
            )}
          </section>

          <section className="card sol-surface-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-main">Templates rapidos</h2>
              <p className="text-xs text-muted">Modelos salvos ficam disponiveis no campo de resposta da conversa.</p>
            </div>
            <form onSubmit={handleCreateTemplate} className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_150px_180px_auto]">
              <input className="input" placeholder="Nome do template" value={templateForm.nome} onChange={(e) => setTemplateForm((c) => ({ ...c, nome: e.target.value }))} />
              <select className="input" value={templateForm.channel_type} onChange={(e) => setTemplateForm((c) => ({ ...c, channel_type: e.target.value }))}>
                {Object.entries(CHANNEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className="input" placeholder="Categoria" value={templateForm.categoria} onChange={(e) => setTemplateForm((c) => ({ ...c, categoria: e.target.value }))} />
              <button type="submit" className="btn btn-secondary text-sm">Salvar</button>
              <textarea className="input lg:col-span-4 min-h-[80px]" placeholder="Conteudo do template" value={templateForm.content} onChange={(e) => setTemplateForm((c) => ({ ...c, content: e.target.value }))} />
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
