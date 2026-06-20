const { Op, fn, col } = require('sequelize');
const { env } = require('../config/env');
const { isModuleEnabled } = require('./moduleConfigService');
const {
  CrmAuditLog,
  CrmAutomationExecution,
  CrmAutomationRule,
  CrmConversation,
  CrmInteraction,
  CrmLead,
  CrmPipelineStage,
  CrmTask,
  Notificacao,
  NotificacaoDestinatario,
  User
} = require('../models');
const {
  canReceiveCrmAutomationManagerNotification,
  canReceiveCrmLeadAssignment
} = require('./authorizationService');
const { notificacaoEventoAtivo } = require('./notificacaoConfigService');

const SCHEDULED_TRIGGER_TYPES = ['NO_FIRST_CONTACT', 'NO_ACTIVITY'];

let runtimeStarted = false;
let cycleInProgress = false;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function scheduleSafeInterval(handler, intervalMs) {
  const timer = setInterval(() => {
    Promise.resolve(handler()).catch((error) => {
      console.error('[crm-automation] erro no intervalo seguro', error);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

function scheduleSafeTimeout(handler, timeoutMs) {
  const timer = setTimeout(() => {
    Promise.resolve(handler()).catch((error) => {
      console.error('[crm-automation] erro no timeout seguro', error);
    });
  }, timeoutMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

function safeJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '');
  if (value == null || value === '') return [];
  return [value];
}

function normalizeEnumArray(value) {
  return toArray(value).map((item) => String(item).trim().toUpperCase()).filter(Boolean);
}

function normalizeNumberArray(value) {
  return toArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function safeString(value) {
  return String(value || '').trim();
}

function normalizeLeadTags(tags) {
  if (Array.isArray(tags)) return tags.map((item) => safeString(item)).filter(Boolean);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return normalizeLeadTags(parsed);
    } catch {
      return tags.split(',').map((item) => safeString(item)).filter(Boolean);
    }
  }
  return [];
}

function buildExecutionKey(rule, triggerType, context = {}) {
  const base = `rule:${rule.id}:trigger:${triggerType}`;

  if (triggerType === 'LEAD_CREATED') {
    return `${base}:lead:${context.leadId}`;
  }

  if (triggerType === 'STAGE_CHANGED') {
    return `${base}:lead:${context.leadId}:stage:${context.newStageId || 'none'}`;
  }

  if (triggerType === 'MESSAGE_RECEIVED') {
    return `${base}:conversation:${context.conversationId}:message:${context.messageId || 'none'}`;
  }

  if (triggerType === 'LEAD_REFUSED') {
    return `${base}:lead:${context.leadId}:loss:${context.lossReasonId || 'none'}:${context.eventMarker || 'once'}`;
  }

  if (triggerType === 'NO_FIRST_CONTACT') {
    return `${base}:lead:${context.leadId}:created:${context.anchorKey}`;
  }

  if (triggerType === 'NO_ACTIVITY') {
    return `${base}:lead:${context.leadId}:anchor:${context.anchorKey}`;
  }

  return `${base}:lead:${context.leadId || 'none'}:conversation:${context.conversationId || 'none'}`;
}

async function registrarAuditCrmInterno({
  leadId,
  userId,
  eventType,
  resourceType = 'LEAD',
  resourceId = null,
  metadata = null
}) {
  try {
    await CrmAuditLog.create({
      lead_id: leadId || null,
      user_id: userId || null,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId || leadId || null,
      metadata: metadata || null,
      ip_address: null
    });
  } catch (error) {
    console.error('[crm-automation] erro ao registrar auditoria', error);
  }
}

async function criarNotificacaoCrm({ tipo, mensagem, metadata, destinatarios, createdBy }) {
  const tipoNormalizado = String(tipo || '').trim().toUpperCase();
  if (!(await notificacaoEventoAtivo(tipoNormalizado))) {
    return null;
  }

  const usuarios = [...new Set(
    toArray(destinatarios)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];

  if (usuarios.length === 0) {
    return null;
  }

  const notificacao = await Notificacao.create({
    solicitacao_id: null,
    tipo: tipoNormalizado,
    mensagem,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_by: createdBy || null
  });

  await NotificacaoDestinatario.bulkCreate(
    usuarios.map((usuarioId) => ({
      notificacao_id: notificacao.id,
      usuario_id: usuarioId
    }))
  );

  return notificacao;
}

async function obterGestoresCrm() {
  const rows = await User.findAll({
    where: { ativo: true },
    attributes: ['id', 'perfil']
  });

  const ids = [];
  for (const usuario of rows) {
    if (await canReceiveCrmAutomationManagerNotification(usuario)) {
      ids.push(usuario.id);
    }
  }

  return ids;
}

async function resolverUsuariosElegiveis(action = {}) {
  const specificUserIds = normalizeNumberArray(action.user_ids || action.assigned_user_ids);
  if (specificUserIds.length > 0) {
    return User.findAll({
      where: { id: { [Op.in]: specificUserIds }, ativo: true },
      attributes: ['id', 'nome', 'perfil']
    });
  }

  const perfis = normalizeEnumArray(action.perfis || action.roles);

  if (perfis.length > 0) {
    return User.findAll({
      where: {
        ativo: true,
        perfil: { [Op.in]: perfis }
      },
      attributes: ['id', 'nome', 'perfil']
    });
  }

  const usuariosAtivos = await User.findAll({
    where: { ativo: true },
    attributes: ['id', 'nome', 'perfil']
  });
  const elegiveis = [];
  for (const usuario of usuariosAtivos) {
    if (await canReceiveCrmLeadAssignment(usuario)) {
      elegiveis.push(usuario);
    }
  }

  return elegiveis;
}

async function resolverUsuarioDestino(action = {}, lead) {
  if (action.assign_to === 'LEAD_OWNER' && lead?.assigned_user_id) {
    return User.findByPk(lead.assigned_user_id, { attributes: ['id', 'nome', 'perfil'] });
  }

  if (action.assign_to === 'SPECIFIC' && action.assigned_user_id) {
    return User.findByPk(action.assigned_user_id, { attributes: ['id', 'nome', 'perfil'] });
  }

  const candidates = await resolverUsuariosElegiveis(action);
  if (!candidates.length) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const counts = await CrmLead.findAll({
    where: {
      archived_at: null,
      assigned_user_id: { [Op.in]: candidates.map((item) => item.id) }
    },
    attributes: ['assigned_user_id', [fn('COUNT', col('id')), 'total']],
    group: ['assigned_user_id'],
    raw: true
  });

  const countsMap = new Map(
    counts.map((row) => [Number(row.assigned_user_id), Number(row.total || 0)])
  );

  return [...candidates].sort((a, b) => {
    const backlogA = countsMap.get(a.id) || 0;
    const backlogB = countsMap.get(b.id) || 0;
    if (backlogA !== backlogB) return backlogA - backlogB;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  })[0];
}

function buildTaskDueDate(action = {}) {
  const now = Date.now();
  const minutes = Number(action.due_in_minutes || 0);
  const hours = Number(action.due_in_hours || 0);
  const days = Number(action.due_in_days || 0);
  const totalMinutes = minutes + (hours * 60) + (days * 24 * 60);
  if (totalMinutes <= 0) return null;
  return new Date(now + totalMinutes * 60 * 1000);
}

async function aplicarMudancaEtapa(lead, action = {}, actorUserId = null) {
  const stageId = Number(action.stage_id);
  if (!Number.isInteger(stageId) || stageId <= 0) {
    return { ok: false, message: 'CHANGE_STAGE sem stage_id valido.' };
  }

  const stage = await CrmPipelineStage.findByPk(stageId);
  if (!stage) {
    return { ok: false, message: 'Etapa informada nao encontrada.' };
  }

  const updates = {
    pipeline_stage_id: stage.id,
    pipeline_id: stage.pipeline_id,
    atualizado_por: actorUserId || null,
    ultima_interacao_at: new Date()
  };

  if (stage.is_won) {
    updates.lifecycle_status = 'CONVERTIDO';
    updates.convertido_at = new Date();
  } else if (stage.is_lost) {
    updates.lifecycle_status = 'PERDIDO';
  }

  if (!lead.primeiro_contato_at && Number(stage.ordem || 0) > 1) {
    updates.primeiro_contato_at = new Date();
  }

  await lead.update(updates);
  return { ok: true, message: `Lead movido para a etapa ${stage.nome}.` };
}

async function aplicarAtribuicao(lead, action = {}, actorUserId = null, context = {}) {
  const usuario = await resolverUsuarioDestino(action, lead);
  if (!usuario) {
    return { ok: false, message: 'Nenhum usuario elegivel encontrado para atribuicao.' };
  }

  await lead.update({
    assigned_user_id: usuario.id,
    atualizado_por: actorUserId || null
  });

  if (context.conversationId) {
    await CrmConversation.update(
      { assigned_user_id: usuario.id },
      { where: { id: context.conversationId } }
    );
  }

  return { ok: true, message: `Lead atribuido para ${usuario.nome}.` };
}

async function aplicarTag(lead, action = {}, actorUserId = null) {
  const tagsAtuais = normalizeLeadTags(lead.tags);
  const novasTags = [
    ...normalizeLeadTags(action.tags),
    safeString(action.tag)
  ].filter(Boolean);

  if (novasTags.length === 0) {
    return { ok: false, message: 'ADD_TAG sem tags informadas.' };
  }

  const merged = [...new Set([...tagsAtuais, ...novasTags])];
  await lead.update({
    tags: merged,
    atualizado_por: actorUserId || null
  });

  return { ok: true, message: `${novasTags.length} tag(s) aplicadas.` };
}

async function aplicarArquivamento(lead, actorUserId = null) {
  await lead.update({
    archived_at: new Date(),
    lifecycle_status: 'ARQUIVADO',
    atualizado_por: actorUserId || null
  });

  return { ok: true, message: 'Lead arquivado pela automacao.' };
}

async function aplicarCriacaoTarefa(lead, action = {}, actorUserId = null) {
  const dueAt = buildTaskDueDate(action);
  const usuario = await resolverUsuarioDestino(action, lead);

  const task = await CrmTask.create({
    lead_id: lead.id,
    assigned_user_id: usuario?.id || lead.assigned_user_id || actorUserId || null,
    title: safeString(action.title) || `Acao automatica para ${lead.nome}`,
    description: safeString(action.description) || null,
    task_type: safeString(action.task_type || 'OTHER').toUpperCase(),
    due_at: dueAt,
    status: 'PENDING',
    priority: safeString(action.priority || 'MEDIUM').toUpperCase(),
    criado_por: actorUserId || null
  });

  if (dueAt && (!lead.proximo_followup_at || dueAt < new Date(lead.proximo_followup_at))) {
    await lead.update({ proximo_followup_at: dueAt });
  }

  return { ok: true, message: `Tarefa automatica criada (#${task.id}).` };
}

async function aplicarNotificacaoGestor(lead, action = {}, actorUserId = null, context = {}) {
  const destinatarios = await obterGestoresCrm();
  if (!destinatarios.length) {
    return { ok: false, message: 'Nenhum gestor CRM encontrado para notificacao.' };
  }

  const message = safeString(action.message) || `Lead ${lead.nome} entrou em uma regra automatica de CRM.`;
  await criarNotificacaoCrm({
    tipo: 'CRM_AUTOMACAO',
    mensagem: message,
    metadata: {
      lead_id: lead.id,
      conversation_id: context.conversationId || null,
      trigger_type: context.triggerType || null
    },
    destinatarios,
    createdBy: actorUserId || null
  });

  return { ok: true, message: `Gestores CRM notificados (${destinatarios.length}).` };
}

async function aplicarNotificacaoResponsavel(lead, action = {}, actorUserId = null, context = {}) {
  if (!lead.assigned_user_id) {
    return { ok: false, message: 'Lead sem responsavel para notificacao.' };
  }

  const message = safeString(action.message) || `Lead ${lead.nome} requer atencao no CRM.`;
  await criarNotificacaoCrm({
    tipo: 'CRM_AUTOMACAO',
    mensagem: message,
    metadata: {
      lead_id: lead.id,
      conversation_id: context.conversationId || null,
      trigger_type: context.triggerType || null
    },
    destinatarios: [lead.assigned_user_id],
    createdBy: actorUserId || null
  });

  return { ok: true, message: 'Responsavel do lead notificado.' };
}

async function aplicarNotaInterna(lead, action = {}, actorUserId = null, context = {}) {
  const title = safeString(action.title) || 'Nota automatica';
  const content = safeString(action.content || action.message);
  if (!content) {
    return { ok: false, message: 'CREATE_INTERNAL_NOTE sem content/message informado.' };
  }

  const interaction = await CrmInteraction.create({
    lead_id: lead.id,
    user_id: actorUserId || null,
    interaction_type: 'SYSTEM_EVENT',
    title,
    content,
    metadata_json: {
      automation: true,
      trigger_type: context.triggerType || null,
      conversation_id: context.conversationId || null
    }
  });

  return { ok: true, message: `Nota interna automatica criada (#${interaction.id}).` };
}

async function executarAcao(rule, lead, action = {}, context = {}) {
  const actionType = safeString(action.type).toUpperCase();
  const actorUserId = context.actorUserId || null;

  if (!actionType) {
    return { ok: false, message: 'Acao sem type informado.' };
  }

  if (['ASSIGN_USER', 'DISTRIBUTE_LEAD', 'REDISTRIBUTE_LEAD'].includes(actionType)) {
    return aplicarAtribuicao(lead, action, actorUserId, context);
  }

  if (actionType === 'CREATE_TASK') {
    return aplicarCriacaoTarefa(lead, action, actorUserId);
  }

  if (actionType === 'CHANGE_STAGE') {
    return aplicarMudancaEtapa(lead, action, actorUserId);
  }

  if (actionType === 'ADD_TAG') {
    return aplicarTag(lead, action, actorUserId);
  }

  if (actionType === 'ARCHIVE_LEAD') {
    return aplicarArquivamento(lead, actorUserId);
  }

  if (actionType === 'NOTIFY_MANAGER') {
    return aplicarNotificacaoGestor(lead, action, actorUserId, context);
  }

  if (actionType === 'NOTIFY_OWNER') {
    return aplicarNotificacaoResponsavel(lead, action, actorUserId, context);
  }

  if (actionType === 'CREATE_INTERNAL_NOTE') {
    return aplicarNotaInterna(lead, action, actorUserId, context);
  }

  return { ok: false, message: `Acao ${actionType} ainda nao suportada pelo motor.` };
}

function leadAtendeCondicoes(lead, conditions = {}, context = {}) {
  const stageIds = normalizeNumberArray(conditions.stage_ids);
  if (stageIds.length > 0 && !stageIds.includes(Number(lead.pipeline_stage_id))) {
    return false;
  }

  const excludeStageIds = normalizeNumberArray(conditions.exclude_stage_ids);
  if (excludeStageIds.length > 0 && excludeStageIds.includes(Number(lead.pipeline_stage_id))) {
    return false;
  }

  const assignedUserIds = normalizeNumberArray(conditions.assigned_user_ids);
  if (assignedUserIds.length > 0 && !assignedUserIds.includes(Number(lead.assigned_user_id))) {
    return false;
  }

  if (parseBoolean(conditions.requires_assigned_user, false) && !lead.assigned_user_id) {
    return false;
  }

  const sourceTypes = normalizeEnumArray(conditions.source_types);
  if (sourceTypes.length > 0 && !sourceTypes.includes(safeString(lead.source_type).toUpperCase())) {
    return false;
  }

  const temperatures = normalizeEnumArray(conditions.temperaturas);
  if (temperatures.length > 0 && !temperatures.includes(safeString(lead.temperatura).toUpperCase())) {
    return false;
  }

  const statuses = normalizeEnumArray(conditions.lifecycle_statuses);
  if (statuses.length > 0 && !statuses.includes(safeString(lead.lifecycle_status).toUpperCase())) {
    return false;
  }

  const excludedStatuses = normalizeEnumArray(conditions.exclude_lifecycle_statuses);
  if (excludedStatuses.length > 0 && excludedStatuses.includes(safeString(lead.lifecycle_status).toUpperCase())) {
    return false;
  }

  const tagsAny = normalizeLeadTags(conditions.tags_any);
  if (tagsAny.length > 0) {
    const currentTags = normalizeLeadTags(lead.tags);
    if (!tagsAny.some((tag) => currentTags.includes(tag))) {
      return false;
    }
  }

  if (Number.isFinite(Number(conditions.min_score)) && Number(lead.score || 0) < Number(conditions.min_score)) {
    return false;
  }

  if (Number.isFinite(Number(conditions.max_score)) && Number(lead.score || 0) > Number(conditions.max_score)) {
    return false;
  }

  const triggerStageIds = normalizeNumberArray(conditions.trigger_stage_ids);
  if (triggerStageIds.length > 0 && context.newStageId && !triggerStageIds.includes(Number(context.newStageId))) {
    return false;
  }

  const channelTypes = normalizeEnumArray(conditions.channel_types);
  if (channelTypes.length > 0 && context.channelType && !channelTypes.includes(safeString(context.channelType).toUpperCase())) {
    return false;
  }

  return true;
}

function getNoFirstContactThreshold(conditions = {}) {
  return Math.max(1, Number(conditions.minutes || conditions.threshold_minutes || 60));
}

function getNoActivityThresholdHours(conditions = {}) {
  return Math.max(1, Number(conditions.hours || conditions.threshold_hours || 24));
}

async function reservarExecucao(rule, triggerType, context = {}) {
  const executionKey = buildExecutionKey(rule, triggerType, context);

  try {
    return await CrmAutomationExecution.create({
      rule_id: rule.id,
      lead_id: context.leadId || null,
      conversation_id: context.conversationId || null,
      trigger_type: triggerType,
      execution_key: executionKey,
      status: 'PROCESSING',
      metadata_json: {
        trigger_context: context.metadata || null,
        source: context.source || 'runtime'
      },
      created_by_user_id: context.actorUserId || null
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    throw error;
  }
}

async function finalizarExecucao(execution, status, message, metadata = {}) {
  await execution.update({
    status,
    message: safeString(message).slice(0, 255) || null,
    metadata_json: {
      ...(execution.metadata_json || {}),
      ...metadata
    },
    processed_at: new Date()
  });
}

async function executarRegraParaLead(rule, lead, context = {}) {
  const execution = await reservarExecucao(rule, rule.trigger_type, {
    ...context,
    leadId: lead.id
  });

  if (!execution) {
    return { status: 'SKIPPED', message: 'Execucao ja registrada anteriormente para esta chave.' };
  }

  const actions = toArray(safeJson(rule.actions_json, []));
  if (actions.length === 0) {
    await finalizarExecucao(execution, 'SKIPPED', 'Regra sem acoes configuradas.');
    return { status: 'SKIPPED', message: 'Regra sem acoes configuradas.' };
  }

  const results = [];

  try {
    for (const action of actions) {
      const result = await executarAcao(rule, lead, action, {
        ...context,
        triggerType: rule.trigger_type
      });
      results.push({
        type: safeString(action.type).toUpperCase(),
        ok: Boolean(result.ok),
        message: result.message || null
      });
    }

    const okCount = results.filter((item) => item.ok).length;
    const finalStatus = okCount > 0 ? 'SUCCESS' : 'SKIPPED';
    const finalMessage = okCount > 0
      ? `${okCount} acao(oes) executada(s).`
      : (results[0]?.message || 'Nenhuma acao executada.');

    await finalizarExecucao(execution, finalStatus, finalMessage, { actions: results });
    await rule.update({ last_run_at: new Date() });

    await registrarAuditCrmInterno({
      leadId: lead.id,
      userId: context.actorUserId || null,
      eventType: 'AUTOMATION_RULE_EXECUTED',
      resourceType: 'AUTOMATION_RULE',
      resourceId: rule.id,
      metadata: {
        rule_id: rule.id,
        trigger_type: rule.trigger_type,
        execution_id: execution.id,
        actions: results
      }
    });

    return { status: finalStatus, message: finalMessage, executionId: execution.id };
  } catch (error) {
    await finalizarExecucao(execution, 'ERROR', error.message || 'Erro ao executar regra.', {
      error: error.message || 'Erro nao identificado'
    });

    await registrarAuditCrmInterno({
      leadId: lead.id,
      userId: context.actorUserId || null,
      eventType: 'AUTOMATION_RULE_FAILED',
      resourceType: 'AUTOMATION_RULE',
      resourceId: rule.id,
      metadata: {
        rule_id: rule.id,
        trigger_type: rule.trigger_type,
        execution_id: execution.id,
        error: error.message || 'Erro nao identificado'
      }
    });

    return { status: 'ERROR', message: error.message || 'Erro ao executar regra.', executionId: execution.id };
  }
}

async function obterLeadParaContexto(context = {}) {
  if (context.lead) {
    return context.lead;
  }
  if (context.leadId) {
    return CrmLead.findByPk(context.leadId);
  }
  if (context.conversationId) {
    const conversation = await CrmConversation.findByPk(context.conversationId);
    if (conversation?.lead_id) {
      return CrmLead.findByPk(conversation.lead_id);
    }
  }
  return null;
}

async function dispararEventoAutomacaoCrm(triggerType, context = {}) {
  try {
    if (!await isModuleEnabled('CRM')) {
      return { processed: 0, skipped: 0 };
    }

    const rules = await CrmAutomationRule.findAll({
      where: { ativo: true, trigger_type: safeString(triggerType).toUpperCase() },
      order: [['priority', 'ASC'], ['id', 'ASC']]
    });

    if (!rules.length) {
      return { processed: 0, skipped: 0 };
    }

    const lead = await obterLeadParaContexto(context);
    if (!lead) {
      return { processed: 0, skipped: rules.length };
    }

    let processed = 0;
    let skipped = 0;

    for (const rule of rules) {
      const conditions = safeJson(rule.conditions_json, {});
      if (!leadAtendeCondicoes(lead, conditions, context)) {
        skipped += 1;
        continue;
      }

      const executionContext = {
        ...context,
        leadId: lead.id,
        eventMarker: context.eventMarker || (context.messageId || context.newStageId || lead.updatedAt?.getTime?.() || lead.createdAt?.getTime?.()),
        anchorKey: String((lead.ultima_interacao_at || lead.createdAt || new Date()).getTime()),
        source: 'event',
        metadata: context
      };

      const result = await executarRegraParaLead(rule, lead, executionContext);
      if (result.status === 'SUCCESS') processed += 1;
      else skipped += 1;
    }

    return { processed, skipped };
  } catch (error) {
    console.error(`[crm-automation] erro ao disparar evento ${triggerType}`, error);
    return { processed: 0, skipped: 0, error: error.message || 'Erro na automacao' };
  }
}

async function listarLeadsSemPrimeiroContato(rule) {
  const conditions = safeJson(rule.conditions_json, {});
  const thresholdMinutes = getNoFirstContactThreshold(conditions);
  const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  const limit = Math.max(1, Number(env.crmAutomationBatchSize || 100));

  return CrmLead.findAll({
    where: {
      archived_at: null,
      primeiro_contato_at: null,
      lifecycle_status: { [Op.notIn]: ['PERDIDO', 'ARQUIVADO', 'CONVERTIDO'] },
      createdAt: { [Op.lte]: thresholdDate }
    },
    order: [['createdAt', 'ASC']],
    limit
  });
}

async function listarLeadsSemAtividade(rule) {
  const conditions = safeJson(rule.conditions_json, {});
  const thresholdHours = getNoActivityThresholdHours(conditions);
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const limit = Math.max(1, Number(env.crmAutomationBatchSize || 100));

  return CrmLead.findAll({
    where: {
      archived_at: null,
      lifecycle_status: { [Op.notIn]: ['PERDIDO', 'ARQUIVADO'] },
      [Op.or]: [
        { ultima_interacao_at: { [Op.lte]: thresholdDate } },
        {
          ultima_interacao_at: null,
          createdAt: { [Op.lte]: thresholdDate }
        }
      ]
    },
    order: [
      ['ultima_interacao_at', 'ASC'],
      ['createdAt', 'ASC']
    ],
    limit
  });
}

async function processarRegrasAgendadas(triggerType) {
  const rules = await CrmAutomationRule.findAll({
    where: {
      ativo: true,
      trigger_type: triggerType
    },
    order: [['priority', 'ASC'], ['id', 'ASC']]
  });

  const stats = { triggerType, processed: 0, skipped: 0, errors: 0, candidates: 0 };

  for (const rule of rules) {
    const conditions = safeJson(rule.conditions_json, {});
    const leads = triggerType === 'NO_FIRST_CONTACT'
      ? await listarLeadsSemPrimeiroContato(rule)
      : await listarLeadsSemAtividade(rule);

    stats.candidates += leads.length;

    for (const lead of leads) {
      if (!leadAtendeCondicoes(lead, conditions, {})) {
        stats.skipped += 1;
        continue;
      }

      const anchorDate = triggerType === 'NO_ACTIVITY'
        ? (lead.ultima_interacao_at || lead.createdAt || new Date())
        : (lead.createdAt || new Date());

      const result = await executarRegraParaLead(rule, lead, {
        leadId: lead.id,
        actorUserId: null,
        source: 'scheduled',
        anchorKey: String(new Date(anchorDate).getTime()),
        metadata: { trigger_type: triggerType }
      });

      if (result.status === 'SUCCESS') stats.processed += 1;
      else if (result.status === 'ERROR') stats.errors += 1;
      else stats.skipped += 1;
    }

    await rule.update({ last_run_at: new Date() });
  }

  return stats;
}

async function executarCicloAutomacoesCrm({ actorUserId = null, manual = false } = {}) {
  if (cycleInProgress) {
    return { ok: false, message: 'Ja existe um ciclo de automacoes em execucao.' };
  }

  if (!await isModuleEnabled('CRM')) {
    return { ok: false, message: 'Modulo CRM desabilitado para esta instalacao.' };
  }

  cycleInProgress = true;
  try {
    const results = [];
    for (const triggerType of SCHEDULED_TRIGGER_TYPES) {
      const result = await processarRegrasAgendadas(triggerType);
      results.push(result);
    }

    await registrarAuditCrmInterno({
      leadId: null,
      userId: actorUserId || null,
      eventType: manual ? 'AUTOMATION_CYCLE_MANUAL' : 'AUTOMATION_CYCLE_SCHEDULED',
      resourceType: 'AUTOMATION_RUNTIME',
      resourceId: null,
      metadata: { results }
    });

    return {
      ok: true,
      message: 'Ciclo de automacoes executado.',
      results
    };
  } catch (error) {
    console.error('[crm-automation] erro ao executar ciclo', error);
    return {
      ok: false,
      message: error.message || 'Erro ao executar ciclo de automacoes.'
    };
  } finally {
    cycleInProgress = false;
  }
}

async function listarExecucoesAutomacaoCrm(query = {}) {
  const where = {};
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);

  if (query.rule_id) where.rule_id = Number(query.rule_id);
  if (query.status) where.status = safeString(query.status).toUpperCase();
  if (query.trigger_type) where.trigger_type = safeString(query.trigger_type).toUpperCase();
  if (query.lead_id) where.lead_id = Number(query.lead_id);

  return CrmAutomationExecution.findAll({
    where,
    include: [
      { model: CrmAutomationRule, as: 'rule', attributes: ['id', 'nome', 'trigger_type'] },
      { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'lifecycle_status'] },
      { model: CrmConversation, as: 'conversation', attributes: ['id', 'status', 'channel_type'] },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome'] }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
}

function iniciarCrmAutomationRuntime() {
  if (runtimeStarted) return;

  if (!env.crmAutomationEnabled) {
    console.log('[crm-automation] runtime desativado (CRM_AUTOMATION_ENABLED != true)');
    return;
  }

  runtimeStarted = true;
  const intervalMs = Math.max(15, Number(env.crmAutomationIntervalSeconds || 60)) * 1000;
  const startupDelayMs = Math.max(5_000, Number(env.crmAutomationStartupDelayMs || 15_000));

  console.log(`[crm-automation] runtime iniciado com intervalo de ${Math.round(intervalMs / 1000)}s`);

  scheduleSafeTimeout(() => executarCicloAutomacoesCrm({ manual: false }), startupDelayMs);
  scheduleSafeInterval(() => executarCicloAutomacoesCrm({ manual: false }), intervalMs);
}

module.exports = {
  dispararEventoAutomacaoCrm,
  executarCicloAutomacoesCrm,
  iniciarCrmAutomationRuntime,
  listarExecucoesAutomacaoCrm
};
