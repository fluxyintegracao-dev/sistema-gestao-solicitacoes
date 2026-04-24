import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listarPipelines,
  obterKanban,
  alterarEtapaLead,
  criarEtapaPipelineCrm,
  atualizarEtapaPipelineCrm
} from '../../../services/crm';

const TEMP_MAP = {
  FRIO: { label: 'Frio', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  MORNO: { label: 'Morno', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  QUENTE: { label: 'Quente', cls: 'bg-red-50 text-red-700 border-red-100' }
};

const EMPTY_STAGE_FORM = {
  nome: '',
  cor: '#1d4ed8',
  sla_minutes: '',
  requires_followup: false,
  requires_loss_reason: false
};

function formatDate(val) {
  if (!val) return null;
  return new Date(val).toLocaleDateString('pt-BR');
}

function LeadCard({ lead, onOpenActions, onDragStart }) {
  const temp = TEMP_MAP[lead.temperatura] || TEMP_MAP.FRIO;

  return (
    <div
      className="bg-card border border-base rounded-lg p-3 text-sm hover:border-subtle transition-colors cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(event) => onDragStart(event, lead)}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/crm/leads/${lead.id}`} className="font-medium text-main hover:text-indigo-600 dark:hover:text-indigo-400 leading-tight">
          {lead.nome}
        </Link>
        <button
          type="button"
          className="text-xs text-muted hover:text-main rounded-md border border-base px-2 py-1"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenActions(lead);
          }}
        >
          Acoes
        </button>
      </div>

      {lead.empreendimento_interesse && (
        <p className="text-xs text-muted mt-2 truncate">{lead.empreendimento_interesse}</p>
      )}

      {lead.telefone && (
        <p className="text-xs text-sub mt-1">{lead.telefone}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted truncate">{lead.responsavel?.nome || 'Sem responsavel'}</span>
        <span className={`text-[11px] border rounded-full px-2 py-0.5 ${temp.cls}`}>{temp.label}</span>
      </div>

      {lead.proximo_followup_at && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          Follow-up: {formatDate(lead.proximo_followup_at)}
        </p>
      )}
    </div>
  );
}

function StageModal({ mode, form, saving, onChange, onClose, onSubmit }) {
  const title = mode === 'create' ? 'Nova etapa do Kanban' : 'Editar etapa do Kanban';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="border border-base rounded-2xl shadow-xl w-full max-w-md p-5"
        style={{ background: 'var(--c-card, var(--c-surface, #ffffff))', color: 'var(--c-text, #0f172a)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-main">{title}</h2>
            <p className="text-sm text-muted mt-1">Organize as etapas exibidas no funil comercial.</p>
          </div>
          <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>Fechar</button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm text-main">Nome da etapa</span>
            <input
              className="input mt-1 bg-card"
              value={form.nome}
              onChange={(event) => onChange({ ...form, nome: event.target.value })}
              placeholder="Ex: Em negociacao"
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-main">Cor</span>
              <input
                className="input mt-1 h-10 bg-card"
                type="color"
                value={form.cor}
                onChange={(event) => onChange({ ...form, cor: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm text-main">SLA em minutos</span>
              <input
                className="input mt-1 bg-card"
                type="number"
                min="0"
                value={form.sla_minutes}
                onChange={(event) => onChange({ ...form, sla_minutes: event.target.value })}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-base p-3" style={{ background: 'var(--c-elevated, rgba(148, 163, 184, 0.08))' }}>
            <input
              type="checkbox"
              className="mt-1"
              checked={form.requires_followup}
              onChange={(event) => onChange({ ...form, requires_followup: event.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium text-main">Exigir follow-up</span>
              <span className="block text-xs text-muted">Use quando esta etapa precisar de proximo contato agendado.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-base p-3" style={{ background: 'var(--c-elevated, rgba(148, 163, 184, 0.08))' }}>
            <input
              type="checkbox"
              className="mt-1"
              checked={form.requires_loss_reason}
              onChange={(event) => onChange({ ...form, requires_loss_reason: event.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium text-main">Exigir motivo de perda</span>
              <span className="block text-xs text-muted">Use para etapas que exigem justificativa comercial.</span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadActionsModal({ lead, stages, moving, onClose, onView, onMove }) {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-card border border-base rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-main">{lead.nome}</h2>
            <p className="text-sm text-muted mt-1">Acoes rapidas do lead no Kanban.</p>
          </div>
          <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>Fechar</button>
        </div>

        <div className="mt-5 space-y-2">
          <button type="button" className="btn btn-primary w-full justify-center" onClick={onView}>
            Abrir detalhes do lead
          </button>

          <div className="rounded-xl border border-base p-3">
            <p className="text-sm font-medium text-main mb-2">Mover para etapa</p>
            <div className="space-y-2">
              {stages.map((stage) => {
                const isCurrent = Number(stage.id) === Number(lead.pipeline_stage_id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isCurrent
                        ? 'border-base bg-elevated text-muted cursor-default'
                        : 'border-base hover:border-subtle text-main'
                    }`}
                    disabled={isCurrent || moving}
                    onClick={() => onMove(stage.id)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.cor }} />
                      {stage.nome}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CrmKanban() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [movingLead, setMovingLead] = useState(false);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dropStageId, setDropStageId] = useState(null);
  const [stageModal, setStageModal] = useState(null);
  const [stageForm, setStageForm] = useState(EMPTY_STAGE_FORM);
  const [leadActions, setLeadActions] = useState(null);

  useEffect(() => {
    carregarPipelines();
  }, []);

  useEffect(() => {
    if (!pipelineId) return;
    carregarKanban();
  }, [pipelineId]);

  async function carregarPipelines() {
    try {
      const data = await listarPipelines();
      const list = Array.isArray(data) ? data : [];
      setPipelines(list);
      const selectedStillExists = list.some((pipeline) => Number(pipeline.id) === Number(pipelineId));
      if (!pipelineId || !selectedStillExists) {
        const def = list.find((p) => p.is_default) || list[0];
        if (def) setPipelineId(def.id);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao listar pipelines');
    }
  }

  async function carregarKanban() {
    try {
      setLoading(true);
      const data = await obterKanban(pipelineId);
      setKanban(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao carregar kanban');
    } finally {
      setLoading(false);
    }
  }

  function abrirNovaEtapa() {
    setStageForm(EMPTY_STAGE_FORM);
    setStageModal({ mode: 'create' });
  }

  function abrirEdicaoEtapa(etapa) {
    setStageForm({
      nome: etapa.nome || '',
      cor: etapa.cor || '#1d4ed8',
      sla_minutes: etapa.sla_minutes ?? '',
      requires_followup: Boolean(etapa.requires_followup),
      requires_loss_reason: Boolean(etapa.requires_loss_reason)
    });
    setStageModal({ mode: 'edit', etapa });
  }

  async function salvarEtapa(event) {
    event.preventDefault();
    try {
      setSavingStage(true);
      const payload = {
        ...stageForm,
        sla_minutes: stageForm.sla_minutes === '' ? null : Number(stageForm.sla_minutes)
      };

      if (stageModal?.mode === 'edit') {
        await atualizarEtapaPipelineCrm(stageModal.etapa.id, payload);
      } else {
        await criarEtapaPipelineCrm(pipelineId, payload);
      }

      setStageModal(null);
      await carregarPipelines();
      await carregarKanban();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao salvar etapa');
    } finally {
      setSavingStage(false);
    }
  }

  function onDragStart(event, lead) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(lead.id));
    setDraggedLead(lead);
  }

  async function moverLeadParaEtapa(leadId, stageId) {
    try {
      setMovingLead(true);
      await alterarEtapaLead(leadId, stageId);
      setLeadActions(null);
      await carregarKanban();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao mover lead');
    } finally {
      setMovingLead(false);
      setDraggedLead(null);
      setDropStageId(null);
    }
  }

  async function onDropLead(event, stageId) {
    event.preventDefault();
    const leadId = Number(event.dataTransfer.getData('text/plain') || draggedLead?.id);
    if (!leadId || !draggedLead) return;
    if (Number(draggedLead.pipeline_stage_id) === Number(stageId)) {
      setDraggedLead(null);
      setDropStageId(null);
      return;
    }
    await moverLeadParaEtapa(leadId, stageId);
  }

  const colunas = kanban?.colunas || [];
  const etapas = colunas.map((coluna) => coluna.etapa);
  const totalLeads = colunas.reduce((s, c) => s + (c.leads?.length || 0), 0);

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <div className="card sol-surface-card app-toolbar-card mb-4">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Kanban CRM</h1>
            <p className="page-subtitle">
              {totalLeads} lead{totalLeads !== 1 ? 's' : ''} no funil{kanban?.pipeline ? ` - ${kanban.pipeline.nome}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {pipelines.length > 1 && (
              <select className="input text-sm" value={pipelineId || ''} onChange={(e) => setPipelineId(Number(e.target.value))}>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            )}
            <button type="button" className="btn btn-secondary text-sm" onClick={abrirNovaEtapa} disabled={!pipelineId}>
              Nova etapa
            </button>
            <Link to="/crm/leads" className="btn btn-secondary text-sm">Lista</Link>
            <Link to="/crm/leads/novo" className="btn btn-primary text-sm">+ Novo Lead</Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted text-sm">Carregando...</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ alignItems: 'flex-start' }}>
          {colunas.map(({ etapa, leads }) => {
            const isDropTarget = Number(dropStageId) === Number(etapa.id);
            return (
              <div
                key={etapa.id}
                className={`shrink-0 w-72 bg-card border rounded-xl flex flex-col transition-colors ${
                  isDropTarget ? 'border-blue-400 ring-2 ring-blue-100' : 'border-base'
                }`}
                style={{ minHeight: 220 }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropStageId(etapa.id);
                }}
                onDragLeave={() => setDropStageId(null)}
                onDrop={(event) => onDropLead(event, etapa.id)}
              >
                <div className="px-3 py-3 border-b border-base">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: etapa.cor }} />
                      <span className="text-sm font-semibold text-main truncate">{etapa.nome}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted bg-elevated rounded-full px-2 py-0.5">{leads.length}</span>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-base text-muted hover:text-main hover:border-subtle transition-colors"
                        onClick={() => abrirEdicaoEtapa(etapa)}
                        title="Editar etapa"
                        aria-label={`Editar etapa ${etapa.nome}`}
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
                          <path d="M4.5 14.9 5.1 12l7.7-7.7a1.5 1.5 0 0 1 2.1 0l.8.8a1.5 1.5 0 0 1 0 2.1L8 14.9l-2.9.6a.5.5 0 0 1-.6-.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m11.8 5.3 2.9 2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-2 flex-1">
                  {leads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onDragStart={onDragStart}
                      onOpenActions={setLeadActions}
                    />
                  ))}
                  {leads.length === 0 && (
                    <p className="text-xs text-muted text-center py-4 border border-dashed border-base rounded-lg">
                      Arraste um lead para este quadro.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {colunas.length === 0 && !loading && (
            <div className="p-8 text-center text-muted text-sm w-full">Nenhuma etapa configurada.</div>
          )}
        </div>
      )}

      {stageModal && (
        <StageModal
          mode={stageModal.mode}
          form={stageForm}
          saving={savingStage}
          onChange={setStageForm}
          onClose={() => setStageModal(null)}
          onSubmit={salvarEtapa}
        />
      )}

      <LeadActionsModal
        lead={leadActions}
        stages={etapas}
        moving={movingLead}
        onClose={() => setLeadActions(null)}
        onView={() => {
          const id = leadActions?.id;
          setLeadActions(null);
          if (id) navigate(`/crm/leads/${id}`);
        }}
        onMove={(stageId) => leadActions && moverLeadParaEtapa(leadActions.id, stageId)}
      />
    </div>
  );
}
