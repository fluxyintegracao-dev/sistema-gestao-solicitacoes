const crypto = require('crypto');
const { env } = require('../config/env');
const {
  CrmConfig,
  CrmConversation,
  CrmIntegrationMetaEvent,
  CrmLead,
  CrmMessage
} = require('../models');
const { criarLead } = require('./crmService');
const { sincronizarMetaNoInbox } = require('./crmInboxSyncService');

const DEFAULT_GRAPH_API_VERSION = 'v20.0';
const META_LEAD_FIELDS = [
  'id',
  'created_time',
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
  'form_id',
  'field_data',
  'platform'
].join(',');

async function getConfigValue(chave) {
  const cfg = await CrmConfig.findOne({ where: { chave } });
  return cfg?.valor || null;
}

function createHttpError(message, status = 400, metadata = null) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  if (metadata) error.metadata = metadata;
  return error;
}

function normalizeGraphVersion(value) {
  const raw = String(value || '').trim() || DEFAULT_GRAPH_API_VERSION;
  return raw.startsWith('v') ? raw : `v${raw}`;
}

function safeString(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function firstValue(values) {
  if (Array.isArray(values)) {
    const found = values.find((item) => String(item ?? '').trim());
    return safeString(found);
  }
  return safeString(values);
}

function normalizeFieldName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function pickMappedValue(fieldMap, names = []) {
  for (const name of names) {
    const normalized = normalizeFieldName(name);
    if (fieldMap[normalized]) return fieldMap[normalized];
  }
  return null;
}

function formatEstado(value) {
  const text = safeString(value);
  if (!text) return null;
  const upper = text.toUpperCase();
  return upper.length <= 2 ? upper : upper.slice(0, 2);
}

// Valida assinatura HMAC-SHA256 do Meta.
function validarAssinaturaMetaSync(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (error) {
    console.error('[META ERROR]', error);
    return false;
  }
}

async function validarAssinaturaMeta(rawBody, signature) {
  const secret = await getConfigValue('CRM_META_WEBHOOK_SECRET');
  console.log('[META SIGNATURE] HEADER', signature ? 'PRESENTE' : 'AUSENTE');
  console.log('[META SIGNATURE] SECRET CONFIGURADO', !!secret);
  if (!secret) {
    if (env.nodeEnv === 'production') {
      throw createHttpError('CRM_META_WEBHOOK_SECRET nao configurado para validar webhook Meta', 500);
    }
    console.warn('[crm-meta] CRM_META_WEBHOOK_SECRET ausente; assinatura Meta nao sera validada neste ambiente.');
    return true;
  }
  return validarAssinaturaMetaSync(rawBody, signature, secret);
}

async function verificarTokenMeta(verifyToken) {
  const configured = await getConfigValue('CRM_META_VERIFY_TOKEN');
  if (!configured) return false;
  return verifyToken === configured;
}

async function obterConfigGraphMeta() {
  const [tokenConfig, versionConfig, pageIdConfig] = await Promise.all([
    getConfigValue('CRM_META_PAGE_ACCESS_TOKEN'),
    getConfigValue('CRM_META_GRAPH_API_VERSION'),
    getConfigValue('CRM_META_PAGE_ID')
  ]);

  return {
    token: safeString(tokenConfig) || safeString(process.env.META_PAGE_ACCESS_TOKEN),
    version: normalizeGraphVersion(versionConfig || process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_API_VERSION),
    pageId: safeString(pageIdConfig) || safeString(process.env.META_PAGE_ID)
  };
}

async function buscarLeadMeta(leadgenId) {
  const id = safeString(leadgenId);
  if (!id) {
    throw createHttpError('leadgen_id ausente no evento Meta Lead Ads', 400);
  }

  const { token, version } = await obterConfigGraphMeta();
  if (!token) {
    throw createHttpError('CRM_META_PAGE_ACCESS_TOKEN ausente para consultar leadgen na Graph API da Meta', 500);
  }

  const url = new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(id)}`);
  url.searchParams.set('fields', META_LEAD_FIELDS);
  url.searchParams.set('access_token', token);

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error('[META ERROR]', error);
    throw createHttpError(`Falha de rede ao consultar lead Meta: ${error.message}`, 502);
  }

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    console.error('[META ERROR]', error);
    body = null;
  }

  if (!response.ok) {
    const metaMessage = safeString(body?.error?.message) || 'Erro desconhecido da Graph API';
    const metaCode = body?.error?.code ? ` codigo=${body.error.code}` : '';
    throw createHttpError(`Erro ao consultar Graph API da Meta:${metaCode} ${metaMessage}`, response.status || 502);
  }

  return body;
}

function mapearFieldDataMeta(fieldData = []) {
  const respostas = {};
  const rawFields = Array.isArray(fieldData) ? fieldData : [];

  for (const field of rawFields) {
    const originalName = safeString(field?.name);
    const normalizedName = normalizeFieldName(originalName);
    if (!normalizedName) continue;
    respostas[normalizedName] = {
      name: originalName,
      values: Array.isArray(field?.values) ? field.values : []
    };
  }

  const simpleMap = Object.entries(respostas).reduce((acc, [key, item]) => {
    acc[key] = firstValue(item.values);
    return acc;
  }, {});

  const nome = pickMappedValue(simpleMap, ['full_name', 'name', 'nome', 'nome_completo']);
  const telefone = pickMappedValue(simpleMap, ['phone_number', 'phone', 'telefone', 'celular', 'whatsapp']);
  const email = pickMappedValue(simpleMap, ['email', 'e-mail']);
  const cidade = pickMappedValue(simpleMap, ['city', 'cidade']);
  const estado = pickMappedValue(simpleMap, ['state', 'estado', 'uf']);
  const documento = pickMappedValue(simpleMap, ['cpf', 'document', 'documento']);

  const consumidos = new Set([
    'full_name',
    'name',
    'nome',
    'nome_completo',
    'phone_number',
    'phone',
    'telefone',
    'celular',
    'whatsapp',
    'email',
    'e_mail',
    'city',
    'cidade',
    'state',
    'estado',
    'uf',
    'cpf',
    'document',
    'documento'
  ].map(normalizeFieldName));

  const extras = Object.entries(simpleMap).reduce((acc, [key, value]) => {
    if (!consumidos.has(key)) acc[key] = value;
    return acc;
  }, {});

  return {
    nome,
    telefone,
    email,
    cidade,
    estado: formatEstado(estado),
    documento,
    respostas,
    extras
  };
}

function extrairDadosLead(entry, change = null) {
  const value = change?.value || entry?.changes?.[0]?.value || {};
  return {
    external_event_id: safeString(value.leadgen_id || entry.id),
    page_id: safeString(value.page_id || entry.id),
    form_id: safeString(value.form_id),
    ad_id: safeString(value.ad_id),
    adset_id: safeString(value.adset_id),
    campaign_id: safeString(value.campaign_id),
    campaign_name: safeString(value.campaign_name),
    adset_name: safeString(value.adset_name),
    ad_name: safeString(value.ad_name),
    form_name: safeString(value.form_name)
  };
}

async function marcarEventoComoDuplicado(event, lead) {
  await event.update({
    processing_status: 'DUPLICATE',
    processed_lead_id: lead?.id || null,
    processed_at: new Date(),
    error_message: lead ? `Lead duplicado id=${lead.id}` : 'Evento Meta duplicado'
  });
}

async function processarEventoMeta(eventId) {
  console.log('[META PROCESS] PROCESSANDO EVENTO', eventId);
  const event = await CrmIntegrationMetaEvent.findByPk(eventId);
  if (!event) return;
  if (event.processing_status !== 'PENDING') return;

  await event.update({ processing_status: 'PROCESSING', error_message: null });

  try {
    const payload = event.payload_json || {};
    const entries = payload.entry || [];
    let processedLead = null;
    let processedConversation = null;
    let processedMessage = null;
    const leadgenId = safeString(event.external_event_id);

    if (!leadgenId) {
      await event.update({
        processing_status: 'IGNORED',
        processed_at: new Date(),
        error_message: 'Evento Meta sem leadgen_id'
      });
      return;
    }

    const leadExistente = await CrmLead.findOne({
      where: {
        source_type: 'META_ADS',
        external_source_id: leadgenId,
        archived_at: null
      }
    });
    if (leadExistente) {
      await marcarEventoComoDuplicado(event, leadExistente);
      return;
    }

    const metaLead = await buscarLeadMeta(leadgenId);
    const mapped = mapearFieldDataMeta(metaLead?.field_data || []);
    const firstEntry = entries[0] || {};
    const primeiraMudanca = Array.isArray(firstEntry.changes)
      ? firstEntry.changes.find((item) => item?.field === 'leadgen') || firstEntry.changes[0]
      : null;
    const webhookData = extrairDadosLead(firstEntry, primeiraMudanca);
    const updateEventData = {
      meta_response_json: metaLead,
      campaign_name: safeString(metaLead?.campaign_name) || webhookData.campaign_name || event.campaign_name || null,
      adset_name: safeString(metaLead?.adset_name) || webhookData.adset_name || event.adset_name || null,
      ad_name: safeString(metaLead?.ad_name) || webhookData.ad_name || event.ad_name || null,
      form_name: safeString(metaLead?.form_name) || webhookData.form_name || event.form_name || null,
      form_id: safeString(metaLead?.form_id) || webhookData.form_id || event.form_id || null,
      ad_id: safeString(metaLead?.ad_id) || webhookData.ad_id || event.ad_id || null,
      adset_id: safeString(metaLead?.adset_id) || webhookData.adset_id || event.adset_id || null,
      campaign_id: safeString(metaLead?.campaign_id) || webhookData.campaign_id || event.campaign_id || null,
      page_id: webhookData.page_id || event.page_id || null
    };
    await event.update(updateEventData);

    const sourceDetail = {
      provider: 'META_LEAD_ADS',
      leadgen_id: leadgenId,
      page_id: updateEventData.page_id,
      form_id: updateEventData.form_id,
      ad_id: updateEventData.ad_id,
      adset_id: updateEventData.adset_id,
      campaign_id: updateEventData.campaign_id,
      created_time: metaLead?.created_time || null,
      platform: metaLead?.platform || null,
      field_data: mapped.respostas,
      campos_extras: mapped.extras
    };

    try {
      processedLead = await criarLead({
        source_type: 'META_ADS',
        source_name: 'Meta Lead Ads',
        source_detail: JSON.stringify(sourceDetail),
        external_source_id: leadgenId,
        campaign_name: updateEventData.campaign_name,
        adset_name: updateEventData.adset_name,
        ad_name: updateEventData.ad_name,
        form_name: updateEventData.form_name || updateEventData.form_id,
        nome: mapped.nome || `Lead Meta ${leadgenId}`,
        telefone: mapped.telefone,
        email: mapped.email,
        documento: mapped.documento,
        cidade: mapped.cidade,
        estado: mapped.estado,
        observacoes: Object.keys(mapped.extras || {}).length
          ? `Campos adicionais Meta: ${JSON.stringify(mapped.extras)}`
          : null,
        lifecycle_status: 'NOVO'
      }, null, null);
    } catch (error) {
      if (error?.status === 409 && error?.duplicateId) {
        processedLead = await CrmLead.findByPk(error.duplicateId);
        await marcarEventoComoDuplicado(event, processedLead);
        return;
      }
      console.error('[META ERROR]', error);
      throw error;
    }

    if (processedLead) {
      const synced = await sincronizarMetaNoInbox(event, processedLead);
      processedConversation = synced.conversation;
      processedMessage = synced.message;
    }

    await event.update({
      processing_status: 'PROCESSED',
      processed_lead_id: processedLead?.id || null,
      processed_conversation_id: processedConversation?.id || null,
      processed_message_id: processedMessage?.id || null,
      processed_at: new Date(),
      error_message: null
    });
  } catch (err) {
    console.error('[META ERROR]', err);
    await event.update({
      processing_status: 'ERROR',
      error_message: err.message,
      processed_at: new Date()
    }).catch((error) => {
      console.error('[META ERROR]', error);
    });
  }
}

async function receberEventoMeta(payload, signature, rawBody) {
  console.log('[META EVENT] PAYLOAD RECEBIDO');
  const valido = await validarAssinaturaMeta(rawBody, signature);
  if (!valido) throw createHttpError('Assinatura invalida', 401);

  const entries = payload?.entry || [];
  const results = [];

  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const dados = extrairDadosLead(entry, change);
      const extId = dados.external_event_id;
      const isLeadgen = change?.field === 'leadgen';

      if (!isLeadgen) {
        await CrmIntegrationMetaEvent.create({
          external_event_id: null,
          event_type: change?.field || 'unknown',
          page_id: dados.page_id,
          payload_json: payload,
          processing_status: 'IGNORED',
          error_message: `Evento Meta ignorado: field=${change?.field || 'unknown'}`,
          received_at: new Date(),
          processed_at: new Date()
        });
        results.push({ external_event_id: extId || null, status: 'IGNORED', field: change?.field || null });
        continue;
      }

      if (!extId) {
        const event = await CrmIntegrationMetaEvent.create({
          external_event_id: null,
          event_type: 'leadgen',
          page_id: dados.page_id,
          form_id: dados.form_id,
          ad_id: dados.ad_id,
          payload_json: payload,
          processing_status: 'IGNORED',
          error_message: 'Evento leadgen sem leadgen_id',
          received_at: new Date(),
          processed_at: new Date()
        });
        results.push({ external_event_id: null, status: 'IGNORED', event_id: event.id });
        continue;
      }

      const existing = await CrmIntegrationMetaEvent.findOne({ where: { external_event_id: extId } });
      if (existing) {
        results.push({ external_event_id: extId, status: 'DUPLICATE', event_id: existing.id });
        continue;
      }

      const event = await CrmIntegrationMetaEvent.create({
        external_event_id: extId,
        event_type: 'leadgen',
        campaign_name: dados.campaign_name,
        adset_name: dados.adset_name,
        ad_name: dados.ad_name,
        form_name: dados.form_name,
        page_id: dados.page_id,
        form_id: dados.form_id,
        ad_id: dados.ad_id,
        adset_id: dados.adset_id,
        campaign_id: dados.campaign_id,
        payload_json: payload,
        processing_status: 'PENDING',
        received_at: new Date()
      });

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
  if (!event) throw createHttpError('Evento nao encontrado', 404);
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
  buscarLeadMeta,
  mapearFieldDataMeta,
  receberEventoMeta,
  verificarTokenMeta,
  listarEventosMeta,
  reprocessarEventoMeta
};
