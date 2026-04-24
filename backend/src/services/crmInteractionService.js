const { CrmInteraction, CrmLead, User } = require('../models');
const { registrarAuditCrm } = require('./crmService');

async function listarInteracoes(leadId, query = {}) {
  const { page = 1, limit = 100 } = query;
  const offset = (Number(page) - 1) * Number(limit);

  const lead = await CrmLead.findByPk(leadId, { attributes: ['id'] });
  if (!lead) throw Object.assign(new Error('Lead nao encontrado'), { status: 404 });

  const { count, rows } = await CrmInteraction.findAndCountAll({
    where: { lead_id: leadId },
    include: [{ model: User, as: 'usuario', attributes: ['id', 'nome'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset
  });

  return { total: count, page: Number(page), interactions: rows };
}

async function registrarInteracao(leadId, dados, userId, req) {
  const { interaction_type = 'NOTE', title, content, metadata_json } = dados;

  const lead = await CrmLead.findByPk(leadId);
  if (!lead) throw Object.assign(new Error('Lead nao encontrado'), { status: 404 });

  if (!content?.trim() && !title?.trim()) {
    throw Object.assign(new Error('Conteudo ou titulo e obrigatorio'), { status: 400 });
  }

  const interaction = await CrmInteraction.create({
    lead_id: leadId,
    user_id: userId || null,
    interaction_type,
    title: title?.trim() || null,
    content: content?.trim() || null,
    metadata_json: metadata_json || null
  });

  const updates = { ultima_interacao_at: new Date(), atualizado_por: userId || null };
  if (['CALL', 'WHATSAPP', 'EMAIL', 'MEETING'].includes(interaction_type) && !lead.primeiro_contato_at) {
    updates.primeiro_contato_at = new Date();
  }
  await lead.update(updates);

  await registrarAuditCrm({
    leadId,
    userId,
    eventType: 'INTERACTION_CREATED',
    metadata: { interaction_type, interaction_id: interaction.id },
    req
  });

  return interaction;
}

module.exports = { listarInteracoes, registrarInteracao };
