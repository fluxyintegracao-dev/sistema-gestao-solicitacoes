const crypto = require('crypto');
const {
  CrmConfig,
  CrmConversation,
  CrmIntegrationMetaEvent,
  CrmLead,
  CrmMessage
} = require('../models');
const { criarLead } = require('./crmService');
const { sincronizarMetaNoInbox } = require('./crmInboxSyncService');

async function getConfigValue(chave) {
  const cfg = await CrmConfig.findOne({ where: { chave } });
  return cfg?.valor || null;
}

// Valida assinatura HMAC-SHA256 do Meta
function validarAssinaturaMetaSync(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function validarAssinaturaMeta(rawBody, signature) {
  const secret = await getConfigValue('CRM_META_WEBHOOK_SECRET');
  if (!secret) return true; // sem segredo configurado, aceita (a ser configurado pelo admin)
  return validarAssinaturaMetaSync(rawBody, signature, secret);
}

async function verificarTokenMeta(verifyToken) {
  const configured = await getConfigValue('CRM_META_VERIFY_TOKEN');
  if (!configured) return false;
  return verifyToken === configured;
}

// Extrai campos relevantes do payload Meta Lead Ads
function extrairDadosLead(entry) {
  const change = entry?.changes?.[0]?.value || {};
  return {
    external_event_id: String(change.leadgen_id || entry.id || ''),
    page_id: String(change.page_id || ''),
    form_id: String(change.form_id || ''),
    ad_id: String(change.ad_id || ''),
    adset_id: String(change.adset_id || ''),
    campaign_id: String(change.campaign_id || '')
  };
}

async function processarEventoMeta(eventId) {
  const event = await CrmIntegrationMetaEvent.findByPk(eventId);
  if (!event) return;
  if (event.processing_status !== 'PENDING') return;

  try {
    const payload = event.payload_json || {};
    const entries = payload.entry || [];
    let finalStatus = 'PROCESSED';
    let processedLead = null;
    let processedConversation = null;
    let processedMessage = null;

    for (const entry of entries) {
      const dados = extrairDadosLead(entry);
      const extId = dados.external_event_id;

      if (extId) {
        const dup = await CrmLead.findOne({ where: { external_source_id: extId, archived_at: null } });
        if (dup) {
          processedLead = dup;
          finalStatus = 'DUPLICATE';
          break;
        }
      }

      try {
        processedLead = await criarLead({
          source_type: 'META_ADS',
          external_source_id: extId || null,
          campaign_name: event.campaign_name || null,
          adset_name: event.adset_name || null,
          ad_name: event.ad_name || null,
          form_name: event.form_name || null,
          nome: `Lead Meta ${extId || new Date().getTime()}`,
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

      break;
    }

    if (processedLead) {
      const synced = await sincronizarMetaNoInbox(event, processedLead);
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

async function receberEventoMeta(payload, signature, rawBody) {
  const valido = await validarAssinaturaMeta(rawBody, signature);
  if (!valido) throw Object.assign(new Error('Assinatura invalida'), { status: 401 });

  const entries = payload?.entry || [];
  const results = [];

  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const val = change?.value || {};
      const extId = String(val.leadgen_id || '');

      // Idempotencia: verifica se evento ja existe
      if (extId) {
        const existing = await CrmIntegrationMetaEvent.findOne({ where: { external_event_id: extId } });
        if (existing) {
          results.push({ external_event_id: extId, status: 'DUPLICATE', event_id: existing.id });
          continue;
        }
      }

      const event = await CrmIntegrationMetaEvent.create({
        external_event_id: extId || null,
        event_type: change.field || 'leadgen',
        campaign_name: val.campaign_name || null,
        adset_name: val.adset_name || null,
        ad_name: val.ad_name || null,
        form_name: val.form_name || null,
        page_id: String(val.page_id || entry.id || ''),
        form_id: String(val.form_id || ''),
        payload_json: payload,
        processing_status: 'PENDING',
        received_at: new Date()
      });

      // Processa assincronamente
      setImmediate(() => processarEventoMeta(event.id));
      results.push({ external_event_id: extId, status: 'RECEIVED', event_id: event.id });
    }
  }

  return results;
}

async function listarEventosMeta(query = {}) {
  const { status, page = 1, limit = 50 } = query;
  const where = {};
  if (status) where.processing_status = String(status).toUpperCase();
  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await CrmIntegrationMetaEvent.findAndCountAll({
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

async function reprocessarEventoMeta(id) {
  const event = await CrmIntegrationMetaEvent.findByPk(id);
  if (!event) throw Object.assign(new Error('Evento nao encontrado'), { status: 404 });
  await event.update({
    processing_status: 'PENDING',
    error_message: null,
    processed_at: null,
    processed_lead_id: null,
    processed_conversation_id: null,
    processed_message_id: null
  });
  setImmediate(() => processarEventoMeta(event.id));
  return event;
}

module.exports = {
  receberEventoMeta,
  verificarTokenMeta,
  listarEventosMeta,
  reprocessarEventoMeta
};
