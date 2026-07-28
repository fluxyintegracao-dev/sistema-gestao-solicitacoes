const crypto = require('crypto');
const {
  CrmConfig,
  CrmConversation,
  CrmIntegrationGoogleEvent,
  CrmLead,
  CrmMessage
} = require('../models');
const { criarLead } = require('./crmService');
const { sincronizarGoogleNoInbox } = require('./crmInboxSyncService');

async function getConfigValue(chave) {
  const cfg = await CrmConfig.findOne({ where: { chave } });
  return cfg?.valor || null;
}

function validarAssinaturaGoogleSync(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function validarAssinaturaGoogle(rawBody, signature) {
  const secret = await getConfigValue('CRM_GOOGLE_WEBHOOK_SECRET');
  if (!secret) {
    throw Object.assign(
      new Error('CRM_GOOGLE_WEBHOOK_SECRET nao configurado para validar webhook Google.'),
      { status: 503 }
    );
  }
  return validarAssinaturaGoogleSync(rawBody, signature, secret);
}

async function receberEventoGoogle(payload, signature, rawBody) {
  const valido = await validarAssinaturaGoogle(rawBody, signature);
  if (!valido) throw Object.assign(new Error('Assinatura invalida'), { status: 401 });

  const extId = String(payload?.call_id || payload?.event_id || payload?.id || '');
  if (extId) {
    const existing = await CrmIntegrationGoogleEvent.findOne({ where: { external_event_id: extId } });
    if (existing) {
      return { status: 'DUPLICATE', event_id: existing.id };
    }
  }

  const event = await CrmIntegrationGoogleEvent.create({
    external_event_id: extId || null,
    event_type: payload?.event_type || payload?.type || 'unknown',
    campaign_name: payload?.campaign_name || payload?.campaign || null,
    ad_group_name: payload?.ad_group_name || payload?.ad_group || null,
    asset_name: payload?.asset_name || null,
    tracking_phone: payload?.caller_id || payload?.tracking_number || null,
    destination_phone: payload?.destination_number || payload?.forward_number || null,
    payload_json: payload,
    processing_status: 'PENDING',
    received_at: new Date()
  });

  setImmediate(() => processarEventoGoogle(event.id));
  return { status: 'RECEIVED', event_id: event.id };
}

async function processarEventoGoogle(eventId) {
  const event = await CrmIntegrationGoogleEvent.findByPk(eventId);
  if (!event || event.processing_status !== 'PENDING') return;

  try {
    const payload = event.payload_json || {};
    const extId = event.external_event_id;
    let finalStatus = 'PROCESSED';
    let processedLead = null;
    let processedConversation = null;
    let processedMessage = null;

    if (extId) {
      const dup = await CrmLead.findOne({ where: { external_source_id: extId, archived_at: null } });
      if (dup) {
        processedLead = dup;
        finalStatus = 'DUPLICATE';
      }
    }

    if (!processedLead) {
      const telefone =
        payload?.caller_phone ||
        payload?.caller_number ||
        payload?.phone_number ||
        payload?.caller_id ||
        null;

      try {
        processedLead = await criarLead({
          source_type: 'GOOGLE_ADS',
          external_source_id: extId || null,
          campaign_name: event.campaign_name || null,
          source_name: event.asset_name || null,
          source_detail: event.ad_group_name || null,
          telefone,
          nome: payload?.name || payload?.nome || `Lead Google ${extId || new Date().getTime()}`,
          lifecycle_status: 'NOVO'
        }, null, null);
      } catch (error) {
        if (error?.status === 409 && error?.duplicateId) {
          processedLead = await CrmLead.findByPk(error.duplicateId);
          finalStatus = 'DUPLICATE';
        } else {
          throw error;
        }
      }
    }

    if (processedLead) {
      const synced = await sincronizarGoogleNoInbox(event, processedLead);
      processedConversation = synced.conversation;
      processedMessage = synced.message;
    }

    await event.update({
      processing_status: finalStatus,
      processed_lead_id: processedLead?.id || null,
      processed_conversation_id: processedConversation?.id || null,
      processed_message_id: processedMessage?.id || null,
      processed_at: new Date(),
      error_message: finalStatus === 'DUPLICATE' && processedLead
        ? `Lead duplicado id=${processedLead.id}`
        : null
    });
  } catch (err) {
    await event.update({
      processing_status: 'ERROR',
      error_message: err.message,
      processed_at: new Date()
    }).catch(() => {});
  }
}

async function listarEventosGoogle(query = {}) {
  const { status, page = 1, limit = 50 } = query;
  const where = {};
  if (status) where.processing_status = String(status).toUpperCase();
  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await CrmIntegrationGoogleEvent.findAndCountAll({
    where,
    include: [
      { model: CrmLead, as: 'processedLead', attributes: ['id', 'nome', 'telefone'] },
      { model: CrmConversation, as: 'processedConversation', attributes: ['id', 'channel_type', 'status'] },
      { model: CrmMessage, as: 'processedMessage', attributes: ['id', 'direction', 'message_type', 'createdAt'] }
    ],
    order: [['received_at', 'DESC']],
    limit: Number(limit),
    offset
  });
  return { total: count, page: Number(page), events: rows };
}

async function reprocessarEventoGoogle(id) {
  const event = await CrmIntegrationGoogleEvent.findByPk(id);
  if (!event) throw Object.assign(new Error('Evento nao encontrado'), { status: 404 });
  await event.update({
    processing_status: 'PENDING',
    error_message: null,
    processed_at: null,
    processed_lead_id: null,
    processed_conversation_id: null,
    processed_message_id: null
  });
  setImmediate(() => processarEventoGoogle(event.id));
  return event;
}

module.exports = {
  receberEventoGoogle,
  listarEventosGoogle,
  reprocessarEventoGoogle
};
