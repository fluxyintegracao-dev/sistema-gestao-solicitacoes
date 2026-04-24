const { Op } = require('sequelize');
const {
  CrmConversation,
  CrmMessage,
  CrmMessageTemplate,
  CrmConversationParticipant,
  CrmLead,
  CrmChannel,
  CrmPhoneAsset,
  User
} = require('../models');
const { registrarAuditCrm } = require('./crmService');
const { dispararEventoAutomacaoCrm } = require('./crmAutomationRuntimeService');

function onlyDefined(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function previewContent(content = '') {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 255 ? `${text.slice(0, 252)}...` : text;
}

function parsePositiveInt(value, fallback, max = null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  if (max && parsed > max) return max;
  return parsed;
}

function parseJsonField(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw Object.assign(new Error('JSON invalido informado.'), { status: 400 });
  }
}

async function listarConversas(query = {}) {
  const {
    q,
    status,
    channel_type,
    assigned_user_id,
    lead_id,
    unread_only,
    page = 1,
    limit = 50
  } = query;

  const where = {};
  if (status) where.status = String(status).toUpperCase();
  if (channel_type) where.channel_type = String(channel_type).toUpperCase();
  if (assigned_user_id) where.assigned_user_id = Number(assigned_user_id);
  if (lead_id) where.lead_id = Number(lead_id);
  if (unread_only === 'true' || unread_only === true) where.unread_count = { [Op.gt]: 0 };

  if (q) {
    where[Op.or] = [
      { contact_name: { [Op.like]: `%${q}%` } },
      { contact_phone: { [Op.like]: `%${q}%` } },
      { contact_email: { [Op.like]: `%${q}%` } },
      { subject: { [Op.like]: `%${q}%` } },
      { last_message_preview: { [Op.like]: `%${q}%` } }
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await CrmConversation.findAndCountAll({
    where,
    include: [
      { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'email', 'lifecycle_status'] },
      { model: User, as: 'responsavel', attributes: ['id', 'nome'] },
      { model: CrmChannel, as: 'channel', attributes: ['id', 'nome', 'type', 'provider'] },
      { model: CrmPhoneAsset, as: 'phoneAsset', attributes: ['id', 'label', 'phone_number', 'role_type'] }
    ],
    order: [
      ['last_message_at', 'DESC'],
      ['updatedAt', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: Number(limit),
    offset
  });

  return { total: count, page: Number(page), conversations: rows };
}

async function listarMensagensConversa(conversationId, query = {}) {
  const limit = parsePositiveInt(query.messages_limit || query.limit, 40, 100);
  const beforeMessageId = Number(query.before_message_id || 0);
  const where = { conversation_id: conversationId };

  if (Number.isInteger(beforeMessageId) && beforeMessageId > 0) {
    where.id = { [Op.lt]: beforeMessageId };
  }

  const rows = await CrmMessage.findAll({
    where,
    include: [{ model: User, as: 'usuario', attributes: ['id', 'nome'] }],
    order: [['id', 'DESC']],
    limit: limit + 1
  });

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const messages = trimmed.reverse();
  const oldestMessageId = messages.length ? Number(messages[0].id) : null;
  const newestMessageId = messages.length ? Number(messages[messages.length - 1].id) : null;

  return {
    messages,
    meta: {
      limit,
      has_more: hasMore,
      oldest_message_id: oldestMessageId,
      newest_message_id: newestMessageId
    }
  };
}

async function obterConversa(id, userId, query = {}) {
  const conversation = await CrmConversation.findByPk(id, {
    include: [
      { model: CrmLead, as: 'lead', attributes: ['id', 'nome', 'telefone', 'email', 'lifecycle_status', 'temperatura'] },
      { model: User, as: 'responsavel', attributes: ['id', 'nome'] },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome'] },
      { model: CrmChannel, as: 'channel' },
      { model: CrmPhoneAsset, as: 'phoneAsset' },
      {
        model: CrmConversationParticipant,
        as: 'participants',
        include: [{ model: User, as: 'usuario', attributes: ['id', 'nome', 'perfil'] }]
      }
    ]
  });

  if (!conversation) throw Object.assign(new Error('Conversa CRM nao encontrada'), { status: 404 });

  if (userId) {
    await CrmConversationParticipant.findOrCreate({
      where: { conversation_id: conversation.id, user_id: userId },
      defaults: { role: conversation.assigned_user_id === userId ? 'OWNER' : 'WATCHER' }
    });
  }

  const messagePayload = await listarMensagensConversa(conversation.id, query);
  const payload = conversation.toJSON();
  payload.messages = messagePayload.messages;
  payload.messages_meta = messagePayload.meta;
  return payload;
}

async function criarConversa(dados = {}, userId, req) {
  const {
    lead_id,
    channel_id,
    phone_asset_id,
    assigned_user_id,
    external_conversation_id,
    channel_type = 'WHATSAPP',
    status = 'OPEN',
    priority = 'MEDIUM',
    contact_name,
    contact_phone,
    contact_email,
    subject,
    initial_message
  } = dados;

  if (!lead_id && !contact_name?.trim() && !contact_phone?.trim() && !contact_email?.trim()) {
    throw Object.assign(new Error('Informe um lead ou dados minimos do contato.'), { status: 400 });
  }

  let lead = null;
  if (lead_id) {
    lead = await CrmLead.findByPk(lead_id);
    if (!lead) throw Object.assign(new Error('Lead nao encontrado'), { status: 404 });
  }

  const assignedUserId = assigned_user_id || userId || null;
  const conversation = await CrmConversation.create({
    lead_id: lead_id || null,
    channel_id: channel_id || null,
    phone_asset_id: phone_asset_id || null,
    assigned_user_id: assignedUserId,
    external_conversation_id: external_conversation_id || null,
    channel_type,
    status,
    priority,
    contact_name: contact_name?.trim() || lead?.nome || null,
    contact_phone: contact_phone?.trim() || lead?.telefone || null,
    contact_email: contact_email?.trim() || lead?.email || null,
    subject: subject?.trim() || null,
    created_by_user_id: userId || null
  });

  if (assignedUserId) {
    await CrmConversationParticipant.findOrCreate({
      where: { conversation_id: conversation.id, user_id: assignedUserId },
      defaults: { role: 'OWNER' }
    });
  }

  if (initial_message?.trim()) {
    await registrarMensagem(conversation.id, {
      content: initial_message,
      direction: 'OUTBOUND',
      message_type: 'TEXT'
    }, userId, req);
  }

  await registrarAuditCrm({
    leadId: lead_id || null,
    userId,
    eventType: 'CONVERSATION_CREATED',
    metadata: { conversation_id: conversation.id, channel_type },
    req
  });

  return obterConversa(conversation.id, userId, {});
}

async function atualizarConversa(id, dados = {}, userId, req) {
  const conversation = await CrmConversation.findByPk(id);
  if (!conversation) throw Object.assign(new Error('Conversa CRM nao encontrada'), { status: 404 });

  const updates = onlyDefined({
    assigned_user_id: dados.assigned_user_id,
    channel_id: dados.channel_id,
    phone_asset_id: dados.phone_asset_id,
    channel_type: dados.channel_type,
    status: dados.status,
    priority: dados.priority,
    contact_name: dados.contact_name,
    contact_phone: dados.contact_phone,
    contact_email: dados.contact_email,
    subject: dados.subject
  });

  if (updates.status === 'RESOLVED') {
    updates.closed_at = new Date();
  } else if (updates.status && updates.status !== 'RESOLVED') {
    updates.closed_at = null;
  }

  await conversation.update(updates);

  if (updates.assigned_user_id) {
    await CrmConversationParticipant.findOrCreate({
      where: { conversation_id: conversation.id, user_id: updates.assigned_user_id },
      defaults: { role: 'OWNER' }
    });
  }

  await registrarAuditCrm({
    leadId: conversation.lead_id,
    userId,
    eventType: 'CONVERSATION_UPDATED',
    metadata: { conversation_id: conversation.id, campos: Object.keys(updates) },
    req
  });

  return obterConversa(id, userId, {});
}

async function registrarMensagem(conversationId, dados = {}, userId, req) {
  const conversation = await CrmConversation.findByPk(conversationId);
  if (!conversation) throw Object.assign(new Error('Conversa CRM nao encontrada'), { status: 404 });

  const content = String(dados.content || '').trim();
  if (!content) throw Object.assign(new Error('Mensagem e obrigatoria.'), { status: 400 });

  const direction = String(dados.direction || 'OUTBOUND').toUpperCase();
  const senderType =
    direction === 'INBOUND'
      ? 'CONTACT'
      : direction === 'INTERNAL'
        ? 'INTERNAL'
        : 'USER';

  const message = await CrmMessage.create({
    conversation_id: conversation.id,
    lead_id: conversation.lead_id,
    user_id: senderType === 'CONTACT' ? null : (userId || null),
    external_message_id: dados.external_message_id || null,
    sender_type: dados.sender_type || senderType,
    direction,
    message_type: dados.message_type || (direction === 'INTERNAL' ? 'NOTE' : 'TEXT'),
    content,
    metadata_json: parseJsonField(dados.metadata_json, null),
    read_at: direction === 'INBOUND' ? null : new Date()
  });

  const updates = {
    last_message_preview: previewContent(content),
    last_message_at: message.createdAt || new Date()
  };

  if (direction === 'INBOUND') {
    updates.unread_count = Number(conversation.unread_count || 0) + 1;
  }

  if (conversation.status === 'RESOLVED' && direction !== 'INTERNAL') {
    updates.status = 'OPEN';
    updates.closed_at = null;
  }

  await conversation.update(updates);

  if (conversation.lead_id && direction !== 'INTERNAL') {
    const lead = await CrmLead.findByPk(conversation.lead_id);
    if (lead) {
      const leadUpdates = { ultima_interacao_at: new Date(), atualizado_por: userId || null };
      if (!lead.primeiro_contato_at && direction === 'OUTBOUND') {
        leadUpdates.primeiro_contato_at = new Date();
      }
      await lead.update(leadUpdates);
    }
  }

  await registrarAuditCrm({
    leadId: conversation.lead_id,
    userId,
    eventType: direction === 'INTERNAL' ? 'CONVERSATION_NOTE_CREATED' : 'CONVERSATION_MESSAGE_CREATED',
    metadata: { conversation_id: conversation.id, message_id: message.id, direction },
    req
  });

  if (direction === 'INBOUND') {
    await dispararEventoAutomacaoCrm('MESSAGE_RECEIVED', {
      leadId: conversation.lead_id || null,
      conversationId: conversation.id,
      messageId: message.id,
      channelType: conversation.channel_type,
      actorUserId: userId || null,
      req,
      metadata: { direction, message_type: message.message_type }
    });
  }

  return message;
}

async function marcarConversaComoLida(id, userId, req) {
  const conversation = await CrmConversation.findByPk(id);
  if (!conversation) throw Object.assign(new Error('Conversa CRM nao encontrada'), { status: 404 });

  await conversation.update({ unread_count: 0 });
  if (userId) {
    const [participant] = await CrmConversationParticipant.findOrCreate({
      where: { conversation_id: id, user_id: userId },
      defaults: { role: conversation.assigned_user_id === userId ? 'OWNER' : 'WATCHER' }
    });
    await participant.update({ unread_count: 0, last_read_at: new Date() });
  }

  await registrarAuditCrm({
    leadId: conversation.lead_id,
    userId,
    eventType: 'CONVERSATION_READ',
    metadata: { conversation_id: id },
    req
  });

  return obterConversa(id, userId, {});
}

async function listarTemplates(query = {}) {
  const { ativo, channel_type } = query;
  const where = {};
  if (ativo !== undefined && ativo !== '') where.ativo = ativo === 'true' || ativo === true || ativo === 1 || ativo === '1';
  if (channel_type) where.channel_type = String(channel_type).toUpperCase();
  return CrmMessageTemplate.findAll({ where, order: [['ativo', 'DESC'], ['nome', 'ASC']] });
}

async function criarTemplate(dados = {}, userId) {
  if (!dados.nome?.trim()) throw Object.assign(new Error('Nome do template e obrigatorio.'), { status: 400 });
  if (!dados.content?.trim()) throw Object.assign(new Error('Conteudo do template e obrigatorio.'), { status: 400 });

  return CrmMessageTemplate.create({
    nome: dados.nome.trim(),
    channel_type: dados.channel_type || 'WHATSAPP',
    categoria: dados.categoria?.trim() || null,
    content: dados.content.trim(),
    ativo: dados.ativo !== false,
    created_by_user_id: userId || null
  });
}

async function atualizarTemplate(id, dados = {}) {
  const template = await CrmMessageTemplate.findByPk(id);
  if (!template) throw Object.assign(new Error('Template CRM nao encontrado'), { status: 404 });

  await template.update(onlyDefined({
    nome: dados.nome,
    channel_type: dados.channel_type,
    categoria: dados.categoria,
    content: dados.content,
    ativo: dados.ativo
  }));

  return template;
}

module.exports = {
  listarConversas,
  obterConversa,
  listarMensagensConversa,
  criarConversa,
  atualizarConversa,
  registrarMensagem,
  marcarConversaComoLida,
  listarTemplates,
  criarTemplate,
  atualizarTemplate
};
