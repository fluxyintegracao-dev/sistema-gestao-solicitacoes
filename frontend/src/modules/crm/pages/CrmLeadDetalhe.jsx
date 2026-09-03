import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  obterLead,
  atualizarLead,
  alterarEtapaLead,
  registrarPerdaLead,
  registrarConversaoLead,
  arquivarLead,
  listarCandidatosRedistribuicaoCrm,
  redistribuirLeadCrm,
  listarPipelines,
  listarMotivosPerda,
  listarInteracoes,
  registrarInteracao,
  listarTarefas,
  criarTarefa,
  concluirTarefa,
  cancelarTarefa
} from '../../../services/crm';
import { Avisos, useAvisos } from '../../../components/padrao';
import { useAuth } from '../../../contexts/AuthContext';
import { canRedistributeCrmLeads } from '../../../utils/acessoProduto';
import { getCpfCnpjError, maskCpfCnpj, onlyDigits } from '../../../utils/formatters';

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
  return new Date(val).toLocaleString('pt-BR');
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR');
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="text-sm text-main font-medium">{value || '—'}</p>
    </div>
  );
}

export default function CrmLeadDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { avisos, avisar, fechar } = useAvisos();
  const [lead, setLead] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [motivosPerda, setMotivosPerda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // edit state
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});

  // modals
  const [showLoss, setShowLoss] = useState(false);
  const [lossMotivo, setLossMotivo] = useState('');
  const [lossObs, setLossObs] = useState('');
  const [showRedistribute, setShowRedistribute] = useState(false);
  const [redistributionCandidates, setRedistributionCandidates] = useState([]);
  const [redistributionForm, setRedistributionForm] = useState({ assigned_user_id: '', motivo: '' });
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [savingRedistribution, setSavingRedistribution] = useState(false);

  // interactions
  const [interactions, setInteractions] = useState([]);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ interaction_type: 'NOTE', title: '', content: '' });
  const [savingInteraction, setSavingInteraction] = useState(false);

  // tasks
  const [tasks, setTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', task_type: 'CALL', due_at: '', priority: 'MEDIUM' });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    Promise.all([
      obterLead(id),
      listarPipelines(),
      listarMotivosPerda(),
      listarInteracoes(id),
      listarTarefas({ lead_id: id, limit: 100 })
    ]).then(([l, p, m, interRes, taskRes]) => {
      setLead(l);
      setPipelines(Array.isArray(p) ? p : []);
      setMotivosPerda(Array.isArray(m) ? m : []);
      setInteractions(Array.isArray(interRes?.interactions) ? interRes.interactions : []);
      setTasks(Array.isArray(taskRes?.tasks) ? taskRes.tasks : []);
    }).catch((err) => {
      alert(err.message || 'Erro ao carregar lead');
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleAddInteraction(e) {
    e.preventDefault();
    if (!interactionForm.content.trim() && !interactionForm.title.trim()) return;
    try {
      setSavingInteraction(true);
      const newInt = await registrarInteracao(id, interactionForm);
      setInteractions((prev) => [newInt, ...prev]);
      setInteractionForm({ interaction_type: 'NOTE', title: '', content: '' });
      setShowAddInteraction(false);
    } catch (err) {
      alert(err.message || 'Erro ao registrar interacao');
    } finally {
      setSavingInteraction(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      setSavingTask(true);
      const newTask = await criarTarefa({ ...taskForm, lead_id: Number(id) });
      setTasks((prev) => [newTask, ...prev]);
      setTaskForm({ title: '', task_type: 'CALL', due_at: '', priority: 'MEDIUM' });
      setShowAddTask(false);
    } catch (err) {
      alert(err.message || 'Erro ao criar tarefa');
    } finally {
      setSavingTask(false);
    }
  }

  async function handleCompleteTask(taskId) {
    try {
      await concluirTarefa(taskId);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'DONE' } : t));
    } catch (err) {
      alert(err.message || 'Erro ao concluir tarefa');
    }
  }

  async function handleCancelTask(taskId) {
    if (!confirm('Cancelar esta tarefa?')) return;
    try {
      await cancelarTarefa(taskId);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'CANCELLED' } : t));
    } catch (err) {
      alert(err.message || 'Erro ao cancelar tarefa');
    }
  }

  function iniciarEdicao() {
    setForm({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      email: lead.email || '',
      documento: lead.documento || '',
      cidade: lead.cidade || '',
      estado: lead.estado || '',
      empreendimento_interesse: lead.empreendimento_interesse || '',
      produto_interesse: lead.produto_interesse || '',
      faixa_valor: lead.faixa_valor || '',
      observacoes: lead.observacoes || '',
      temperatura: lead.temperatura || 'FRIO',
      score: lead.score || 0,
      proximo_followup_at: lead.proximo_followup_at ? lead.proximo_followup_at.split('T')[0] : ''
    });
    setEditando(true);
  }

  async function salvarEdicao() {
    const documentoErro = getCpfCnpjError(form.documento);
    if (documentoErro) {
      avisar.alerta(documentoErro);
      return;
    }
    try {
      setSaving(true);
      const updated = await atualizarLead(id, { ...form, documento: onlyDigits(form.documento) });
      setLead(updated);
      setEditando(false);
    } catch (err) {
      alert(err.message || 'Erro ao salvar lead');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStage(stageId) {
    try {
      const updated = await alterarEtapaLead(id, Number(stageId));
      setLead((l) => ({ ...l, ...updated }));
    } catch (err) {
      alert(err.message || 'Erro ao alterar etapa');
    }
  }

  async function handleConversao() {
    if (!confirm('Registrar conversao deste lead?')) return;
    try {
      const updated = await registrarConversaoLead(id);
      setLead((l) => ({ ...l, ...updated }));
    } catch (err) {
      alert(err.message || 'Erro ao registrar conversao');
    }
  }

  async function handlePerda() {
    try {
      const updated = await registrarPerdaLead(id, lossMotivo || undefined, lossObs || undefined);
      setLead((l) => ({ ...l, ...updated }));
      setShowLoss(false);
      setLossMotivo('');
      setLossObs('');
    } catch (err) {
      alert(err.message || 'Erro ao registrar perda');
    }
  }

  async function handleArquivar() {
    if (!confirm('Arquivar este lead?')) return;
    try {
      await arquivarLead(id);
      navigate('/crm/leads');
    } catch (err) {
      alert(err.message || 'Erro ao arquivar lead');
    }
  }

  async function carregarCandidatosRedistribuicao() {
    try {
      setLoadingCandidates(true);
      const data = await listarCandidatosRedistribuicaoCrm();
      setRedistributionCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || 'Erro ao carregar candidatos de redistribuicao');
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function abrirRedistribuicao() {
    setRedistributionForm({ assigned_user_id: '', motivo: '' });
    setShowRedistribute(true);
    if (redistributionCandidates.length === 0) {
      await carregarCandidatosRedistribuicao();
    }
  }

  async function handleRedistribuirLead() {
    try {
      setSavingRedistribution(true);
      const updated = await redistribuirLeadCrm(id, {
        assigned_user_id: redistributionForm.assigned_user_id || undefined,
        motivo: redistributionForm.motivo || undefined
      });
      setLead(updated);
      setShowRedistribute(false);
      setRedistributionForm({ assigned_user_id: '', motivo: '' });

      const interRes = await listarInteracoes(id);
      setInteractions(Array.isArray(interRes?.interactions) ? interRes.interactions : []);
    } catch (err) {
      alert(err.message || 'Erro ao redistribuir lead');
    } finally {
      setSavingRedistribution(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted text-sm">Carregando...</div>;
  if (!lead) return <div className="p-8 text-center text-muted text-sm">Lead nao encontrado.</div>;

  const lifecycle = LIFECYCLE_MAP[lead.lifecycle_status] || { label: lead.lifecycle_status, cls: 'app-status-pill bg-elevated text-muted' };
  const temp = TEMP_MAP[lead.temperatura] || {};
  const podeRedistribuir = canRedistributeCrmLeads(user) && lead.lifecycle_status !== 'ARQUIVADO';

  const stagesFlat = pipelines.flatMap((p) => (p.etapas || []).map((e) => ({ ...e, pipelineNome: p.nome })));
  const candidatosDisponiveis = redistributionCandidates.filter((item) => Number(item.id) !== Number(lead.assigned_user_id));

  return (
    <div className="page solicitacoes-page">
      {/* Header */}
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div className="flex items-start gap-3">
            <Link to="/crm/leads" className="text-muted hover:text-main mt-0.5">←</Link>
            <div>
              <h1 className="page-title">{lead.nome}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={lifecycle.cls}>{lifecycle.label}</span>
                <span className="text-base" title={temp.label}>{temp.emoji}</span>
                {lead.etapa && (
                  <span className="inline-flex items-center gap-1 text-xs text-sub">
                    <span className="w-2 h-2 rounded-full" style={{ background: lead.etapa.cor }} />
                    {lead.etapa.nome}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {podeRedistribuir && (
              <button onClick={abrirRedistribuicao} className="btn btn-secondary text-xs">
                Redistribuir
              </button>
            )}
            {lead.lifecycle_status !== 'CONVERTIDO' && (
              <button onClick={handleConversao} className="btn btn-secondary text-xs text-emerald-700 dark:text-emerald-400">
                Marcar convertido
              </button>
            )}
            {!['PERDIDO', 'ARQUIVADO'].includes(lead.lifecycle_status) && (
              <button onClick={() => setShowLoss(true)} className="btn btn-secondary text-xs text-red-600 dark:text-red-400">
                Registrar perda
              </button>
            )}
            {lead.lifecycle_status !== 'ARQUIVADO' && (
              <button onClick={handleArquivar} className="btn btn-secondary text-xs text-muted">Arquivar</button>
            )}
            {!editando ? (
              <button onClick={iniciarEdicao} className="btn btn-primary text-sm">Editar</button>
            ) : (
              <>
                <button onClick={() => setEditando(false)} className="btn btn-secondary text-sm">Cancelar</button>
                <button onClick={salvarEdicao} className="btn btn-primary text-sm" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <Avisos avisos={avisos} aoFechar={fechar} />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dados do lead */}
          <div className="card sol-surface-card p-5">
            <h2 className="font-semibold text-main mb-4">Dados do Lead</h2>
            {editando ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'nome', label: 'Nome', required: true },
                  { key: 'telefone', label: 'Telefone' },
                  { key: 'email', label: 'E-mail', type: 'email' },
                  { key: 'documento', label: 'CPF / CNPJ' },
                  { key: 'cidade', label: 'Cidade' },
                  { key: 'estado', label: 'Estado', maxLength: 2 },
                  { key: 'empreendimento_interesse', label: 'Empreendimento de interesse' },
                  { key: 'produto_interesse', label: 'Produto de interesse' },
                  { key: 'faixa_valor', label: 'Faixa de valor' }
                ].map(({ key, label, type, required, maxLength }) => (
                  <label key={key} className="app-filter-field">
                    <span className="app-filter-label">{label}{required && <span className="text-red-500"> *</span>}</span>
                    <input
                      className="input"
                      type={type || 'text'}
                      value={form[key] || ''}
                      maxLength={maxLength}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        [key]: key === 'documento' ? maskCpfCnpj(e.target.value) : e.target.value
                      }))}
                    />
                  </label>
                ))}

                <label className="app-filter-field">
                  <span className="app-filter-label">Temperatura</span>
                  <select className="input" value={form.temperatura} onChange={(e) => setForm((f) => ({ ...f, temperatura: e.target.value }))}>
                    <option value="FRIO">Frio</option>
                    <option value="MORNO">Morno</option>
                    <option value="QUENTE">Quente</option>
                  </select>
                </label>

                <label className="app-filter-field">
                  <span className="app-filter-label">Score (0-100)</span>
                  <input className="input" type="number" min={0} max={100} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} />
                </label>

                <label className="app-filter-field">
                  <span className="app-filter-label">Proximo follow-up</span>
                  <input className="input" type="date" value={form.proximo_followup_at || ''} onChange={(e) => setForm((f) => ({ ...f, proximo_followup_at: e.target.value }))} />
                </label>

                <label className="app-filter-field sm:col-span-2">
                  <span className="app-filter-label">Observacoes</span>
                  <textarea className="input w-full" rows={3} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoRow label="Nome" value={lead.nome} />
                <InfoRow label="Telefone" value={lead.telefone} />
                <InfoRow label="E-mail" value={lead.email} />
                <InfoRow label="Documento" value={lead.documento} />
                <InfoRow label="Cidade / Estado" value={[lead.cidade, lead.estado].filter(Boolean).join(' / ')} />
                <InfoRow label="Empreendimento de interesse" value={lead.empreendimento_interesse} />
                <InfoRow label="Produto de interesse" value={lead.produto_interesse} />
                <InfoRow label="Faixa de valor" value={lead.faixa_valor} />
                <InfoRow label="Score" value={lead.score} />
                <InfoRow label="Observacoes" value={lead.observacoes} />
                <InfoRow label="Proximo follow-up" value={fmtDate(lead.proximo_followup_at)} />
              </div>
            )}
          </div>

          {/* Origem */}
          <div className="card sol-surface-card p-5">
            <h2 className="font-semibold text-main mb-4">Origem</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Tipo" value={lead.source_type?.replace('_', ' ')} />
              <InfoRow label="Campanha" value={lead.campaign_name || lead.source_name} />
              <InfoRow label="Adset" value={lead.adset_name} />
              <InfoRow label="UTM Source" value={lead.utm_source} />
              <InfoRow label="UTM Medium" value={lead.utm_medium} />
              <InfoRow label="UTM Campaign" value={lead.utm_campaign} />
            </div>
          </div>

          {/* Interacoes / Timeline */}
          <div className="card sol-surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-main">Interacoes</h2>
              <button
                className="btn btn-secondary text-xs"
                onClick={() => setShowAddInteraction((v) => !v)}
              >
                {showAddInteraction ? 'Cancelar' : '+ Registrar'}
              </button>
            </div>

            {showAddInteraction && (
              <form onSubmit={handleAddInteraction} className="mb-4 p-4 border border-base rounded-lg bg-elevated space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="app-filter-field">
                    <span className="app-filter-label">Tipo</span>
                    <select
                      className="input"
                      value={interactionForm.interaction_type}
                      onChange={(e) => setInteractionForm((f) => ({ ...f, interaction_type: e.target.value }))}
                    >
                      <option value="NOTE">Observacao</option>
                      <option value="CALL">Ligacao</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="MEETING">Reuniao</option>
                    </select>
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Titulo (opcional)</span>
                    <input
                      className="input"
                      placeholder="Resumo..."
                      value={interactionForm.title}
                      onChange={(e) => setInteractionForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="app-filter-field">
                  <span className="app-filter-label">Descricao</span>
                  <textarea
                    className="input w-full"
                    rows={3}
                    placeholder="Detalhes da interacao..."
                    value={interactionForm.content}
                    onChange={(e) => setInteractionForm((f) => ({ ...f, content: e.target.value }))}
                  />
                </label>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary text-sm" disabled={savingInteraction}>
                    {savingInteraction ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}

            {interactions.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma interacao registrada.</p>
            ) : (
              <div className="space-y-3">
                {interactions.map((it) => (
                  <div key={it.id} className="flex items-start gap-3 text-sm border-b border-base pb-3 last:border-0">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">
                        {it.interaction_type === 'CALL' ? '📞' :
                         it.interaction_type === 'WHATSAPP' ? '💬' :
                         it.interaction_type === 'EMAIL' ? '📧' :
                         it.interaction_type === 'MEETING' ? '📅' : '📝'}
                      </span>
                    </div>
                    <div className="flex-1">
                      {it.title && <p className="font-medium text-main">{it.title}</p>}
                      {it.content && <p className="text-sub mt-0.5">{it.content}</p>}
                      <div className="flex gap-2 mt-1 text-xs text-muted">
                        <span>{fmt(it.createdAt)}</span>
                        {it.usuario && <span>— {it.usuario.nome}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tarefas */}
          <div className="card sol-surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-main">Tarefas</h2>
              <button
                className="btn btn-secondary text-xs"
                onClick={() => setShowAddTask((v) => !v)}
              >
                {showAddTask ? 'Cancelar' : '+ Nova Tarefa'}
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={handleAddTask} className="mb-4 p-4 border border-base rounded-lg bg-elevated space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="app-filter-field sm:col-span-2">
                    <span className="app-filter-label">Titulo *</span>
                    <input
                      className="input"
                      required
                      placeholder="Ex: Ligar para o cliente"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Tipo</span>
                    <select
                      className="input"
                      value={taskForm.task_type}
                      onChange={(e) => setTaskForm((f) => ({ ...f, task_type: e.target.value }))}
                    >
                      <option value="CALL">Ligacao</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="VISIT">Visita</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PROPOSAL">Proposta</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Prioridade</span>
                    <select
                      className="input"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="HIGH">Alta</option>
                      <option value="MEDIUM">Media</option>
                      <option value="LOW">Baixa</option>
                    </select>
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Prazo</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={taskForm.due_at}
                      onChange={(e) => setTaskForm((f) => ({ ...f, due_at: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary text-sm" disabled={savingTask}>
                    {savingTask ? 'Criando...' : 'Criar Tarefa'}
                  </button>
                </div>
              </form>
            )}

            {tasks.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma tarefa criada.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const overdue = task.status === 'PENDING' && task.due_at && new Date(task.due_at) < new Date();
                  return (
                    <div key={task.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${overdue ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10' : 'border-base bg-elevated'}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-muted' : 'text-main'}`}>
                          {task.title}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-muted flex-wrap">
                          <span>{task.task_type}</span>
                          {task.due_at && <span className={overdue ? 'text-red-500' : ''}>Prazo: {fmt(task.due_at)}</span>}
                          <span className={`font-medium ${task.priority === 'HIGH' ? 'text-red-500' : task.priority === 'MEDIUM' ? 'text-amber-500' : 'text-blue-400'}`}>
                            {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baixa'}
                          </span>
                        </div>
                      </div>
                      {task.status === 'PENDING' && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="btn btn-secondary text-xs text-emerald-700 dark:text-emerald-400"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => handleCancelTask(task.id)}
                            className="btn btn-secondary text-xs text-muted"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {task.status !== 'PENDING' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'DONE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-elevated text-muted'}`}>
                          {task.status === 'DONE' ? 'Concluida' : 'Cancelada'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historico de auditoria */}
          {Array.isArray(lead.auditLogs) && lead.auditLogs.length > 0 && (
            <div className="card sol-surface-card p-5">
              <h2 className="font-semibold text-main mb-4">Historico do Sistema</h2>
              <div className="space-y-2">
                {lead.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm border-b border-base pb-2 last:border-0">
                    <span className="text-xs text-muted whitespace-nowrap mt-0.5">{fmt(log.createdAt)}</span>
                    <div>
                      <span className="font-medium text-sub">{log.event_type.replace(/_/g, ' ')}</span>
                      {log.field_changed && (
                        <span className="text-muted ml-1">— {log.field_changed}: {log.old_value || '—'} → {log.new_value || '—'}</span>
                      )}
                      {log.usuario && (
                        <span className="text-xs text-muted ml-1">por {log.usuario.nome}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Funil */}
          <div className="card sol-surface-card p-5">
            <h2 className="font-semibold text-main mb-3">Etapa do Funil</h2>
            <select
              className="input w-full"
              value={lead.pipeline_stage_id || ''}
              onChange={(e) => handleChangeStage(e.target.value)}
              disabled={['ARQUIVADO'].includes(lead.lifecycle_status)}
            >
              <option value="">— Sem etapa —</option>
              {stagesFlat.map((s) => (
                <option key={s.id} value={s.id}>
                  {pipelines.length > 1 ? `${s.pipelineNome} › ` : ''}{s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Info adicional */}
          <div className="card sol-surface-card p-5 space-y-3">
            <h2 className="font-semibold text-main mb-3">Informacoes</h2>
            <InfoRow label="Responsavel" value={lead.responsavel?.nome} />
            <InfoRow label="Criado por" value={lead.criadoPor?.nome} />
            <InfoRow label="Cadastrado em" value={fmt(lead.createdAt)} />
            <InfoRow label="Primeiro contato" value={fmt(lead.primeiro_contato_at)} />
            <InfoRow label="Ultima interacao" value={fmt(lead.ultima_interacao_at)} />
            {lead.lifecycle_status === 'CONVERTIDO' && (
              <InfoRow label="Convertido em" value={fmt(lead.convertido_at)} />
            )}
            {lead.lifecycle_status === 'PERDIDO' && (
              <>
                <InfoRow label="Motivo de perda" value={lead.motivoPerda?.nome} />
                <InfoRow label="Obs. perda" value={lead.motivo_perda_obs} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Registrar perda */}
      {showLoss && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-main mb-4">Registrar Perda</h3>
            <label className="app-filter-field mb-4">
              <span className="app-filter-label">Motivo</span>
              <select className="input w-full" value={lossMotivo} onChange={(e) => setLossMotivo(e.target.value)}>
                <option value="">Selecione o motivo</option>
                {motivosPerda.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </label>
            <label className="app-filter-field mb-4">
              <span className="app-filter-label">Observacoes</span>
              <textarea className="input w-full" rows={3} value={lossObs} onChange={(e) => setLossObs(e.target.value)} placeholder="Detalhes da perda..." />
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary text-sm" onClick={() => setShowLoss(false)}>Cancelar</button>
              <button className="btn btn-primary text-sm bg-red-600 hover:bg-red-700" onClick={handlePerda}>Confirmar Perda</button>
            </div>
          </div>
        </div>
      )}

      {showRedistribute && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-base rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="mb-4">
              <h3 className="font-semibold text-main">Redistribuir lead</h3>
              <p className="mt-1 text-xs text-muted">
                Escolha um responsavel ou deixe automatico para enviar ao usuario elegivel com menor backlog.
              </p>
            </div>

            <div className="space-y-4">
              <label className="app-filter-field">
                <span className="app-filter-label">Novo responsavel</span>
                <select
                  className="input w-full"
                  value={redistributionForm.assigned_user_id}
                  onChange={(e) => setRedistributionForm((f) => ({ ...f, assigned_user_id: e.target.value }))}
                  disabled={loadingCandidates}
                >
                  <option value="">
                    {loadingCandidates ? 'Carregando candidatos...' : 'Automatico pelo menor backlog'}
                  </option>
                  {candidatosDisponiveis.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome} - {usuario.perfil} - {usuario.backlog_aberto || 0} lead(s) aberto(s)
                    </option>
                  ))}
                </select>
              </label>

              <label className="app-filter-field">
                <span className="app-filter-label">Motivo da redistribuicao</span>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={redistributionForm.motivo}
                  onChange={(e) => setRedistributionForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder="Ex: SLA vencido, ausencia do responsavel, ajuste manual de carteira..."
                />
              </label>

              <div className="rounded-xl border border-base bg-elevated/40 px-3 py-2 text-xs text-muted">
                Responsavel atual: <span className="font-semibold text-main">{lead.responsavel?.nome || 'sem responsavel'}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => setShowRedistribute(false)}
                disabled={savingRedistribution}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={handleRedistribuirLead}
                disabled={savingRedistribution || loadingCandidates}
              >
                {savingRedistribution ? 'Redistribuindo...' : 'Confirmar redistribuicao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
