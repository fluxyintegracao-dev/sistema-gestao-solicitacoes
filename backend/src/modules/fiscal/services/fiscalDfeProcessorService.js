'use strict';

const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDfeEvent,
  FiscalDfeSyncState,
  FiscalSyncLog,
  sequelize
} = require('../../../models');
const { saveFiscalXml } = require('./fiscalS3Service');
const { parseNfeXml } = require('./fiscalXmlParserService');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeAccessKey(input = {}) {
  const accessKey = onlyDigits(input.access_key || input.chave || input.chNFe || input.summary?.access_key);
  if (!/^\d{44}$/.test(accessKey)) return null;
  return accessKey;
}

function buildDocumentPayload({ company, item, parsedXml = null, storage = null }) {
  const summary = item.summary || item.raw_summary_json || {};
  const accessKey = parsedXml?.access_key || normalizeAccessKey(item);
  if (!accessKey) {
    throw createHttpError('Documento SEFAZ sem chave de acesso valida.', 400);
  }

  const hasXml = Boolean(parsedXml && storage?.key);
  const documentStatus = hasXml
    ? 'xml_downloaded'
    : (summary.document_status || item.document_status || 'summary_received');

  return {
    fiscal_company_id: company.id,
    document_type: item.document_type || 'nfe',
    access_key: accessKey,
    nsu: item.nsu ? String(item.nsu) : summary.nsu ? String(summary.nsu) : null,
    schema_version: parsedXml?.schema_version || item.schema_version || summary.schema_version || null,
    issuer_cnpj: parsedXml?.issuer_cnpj || onlyDigits(item.issuer_cnpj || summary.issuer_cnpj) || null,
    issuer_name: parsedXml?.issuer_name || item.issuer_name || summary.issuer_name || null,
    recipient_cnpj: parsedXml?.recipient_cnpj || onlyDigits(item.recipient_cnpj || summary.recipient_cnpj) || company.cnpj || null,
    recipient_name: parsedXml?.recipient_name || item.recipient_name || summary.recipient_name || company.razao_social || null,
    emission_date: parsedXml?.emission_date || normalizeDate(item.emission_date || summary.emission_date),
    received_at: normalizeDate(item.received_at || summary.received_at) || new Date(),
    total_value: parsedXml?.total_value ?? item.total_value ?? summary.total_value ?? null,
    currency: item.currency || summary.currency || 'BRL',
    document_number: parsedXml?.document_number || item.document_number || summary.document_number || null,
    series: parsedXml?.series || item.series || summary.series || null,
    operation_nature: parsedXml?.operation_nature || item.operation_nature || summary.operation_nature || null,
    sefaz_status_code: parsedXml?.sefaz_status_code || item.sefaz_status_code || summary.sefaz_status_code || null,
    sefaz_status_description: parsedXml?.sefaz_status_description || item.sefaz_status_description || summary.sefaz_status_description || null,
    document_status: documentStatus,
    manifestation_status: item.manifestation_status || summary.manifestation_status || 'pending',
    xml_storage_key: storage?.key || item.xml_storage_key || null,
    raw_summary_json: {
      source: 'sefaz_distribution',
      nsu: item.nsu || summary.nsu || null,
      schema: item.schema || item.schema_version || summary.schema_version || null,
      response_code: item.response_code || null,
      response_message: item.response_message || null,
      summary
    },
    parsed_xml_json: parsedXml?.parsed_xml_json || item.parsed_xml_json || null,
    source: 'sefaz_distribution',
    hash_xml: storage?.hash || item.hash_xml || null
  };
}

async function saveDocumentXml(company, item, parsedXml) {
  if (!item.xml) return null;
  return saveFiscalXml({
    cnpj: company.cnpj,
    documentType: item.document_type || 'nfe',
    accessKey: parsedXml.access_key,
    xml: item.xml,
    date: parsedXml.emission_date || new Date(),
    metadata: {
      fiscal_company_id: company.id,
      source: 'sefaz_distribution',
      nsu: item.nsu || ''
    }
  });
}

function buildFiscalEventPayload(document, eventPayload = {}) {
  if (!document?.id) {
    throw createHttpError('Documento fiscal e obrigatorio para processar evento fiscal.', 400);
  }

  return {
    fiscal_dfe_document_id: document.id,
    event_type: eventPayload.event_type || 'unknown',
    event_sequence: eventPayload.event_sequence || null,
    event_protocol: eventPayload.event_protocol || null,
    event_date: normalizeDate(eventPayload.event_date) || null,
    event_description: eventPayload.event_description || null,
    raw_event_xml_storage_key: eventPayload.raw_event_xml_storage_key || null,
    raw_event_json: eventPayload.raw_event_json || eventPayload
  };
}

async function upsertFiscalEvent(document, eventPayload, transaction) {
  const payload = buildFiscalEventPayload(document, eventPayload);
  const where = {
    fiscal_dfe_document_id: payload.fiscal_dfe_document_id,
    event_type: payload.event_type,
    event_sequence: payload.event_sequence,
    event_protocol: payload.event_protocol
  };

  const existing = await FiscalDfeEvent.findOne({ where, transaction });
  if (existing) return existing;

  return FiscalDfeEvent.create(payload, { transaction });
}

async function processarDocumentoNormalizado(company, item, transaction) {
  if (!item || typeof item !== 'object') {
    throw createHttpError('Item de retorno SEFAZ invalido.', 400);
  }

  const parsedXml = item.xml ? parseNfeXml(item.xml) : null;
  const storage = parsedXml ? await saveDocumentXml(company, item, parsedXml) : null;
  const payload = buildDocumentPayload({ company, item, parsedXml, storage });
  const existing = await FiscalDfeDocument.findOne({
    where: { access_key: payload.access_key },
    transaction
  });

  const document = existing
    ? await existing.update({ ...payload, is_duplicate: false }, { transaction })
    : await FiscalDfeDocument.create({ ...payload, is_duplicate: false }, { transaction });

  const events = Array.isArray(item.events) ? item.events : [];
  for (const event of events) {
    await upsertFiscalEvent(document, event, transaction);
  }

  return {
    document,
    created: !existing,
    updated: Boolean(existing),
    events_processed: events.length,
    xml_saved: Boolean(storage?.key)
  };
}

async function processarRetornoDistribuicaoDfe({
  fiscalCompanyId,
  company,
  syncStateId = null,
  syncLogId = null,
  documentType = 'nfe',
  response = {}
} = {}) {
  const fiscalCompany = company || await FiscalCompany.findByPk(fiscalCompanyId);
  if (!fiscalCompany) {
    throw createHttpError('Empresa fiscal nao encontrada para processar retorno SEFAZ.', 404);
  }

  const documents = Array.isArray(response.documents) ? response.documents : [];
  const startedAt = new Date();

  return sequelize.transaction(async (transaction) => {
    const processed = [];

    for (const item of documents) {
      processed.push(await processarDocumentoNormalizado(fiscalCompany, {
        ...item,
        document_type: item.document_type || documentType
      }, transaction));
    }

    const ultNsu = response.ult_nsu ?? response.response_ult_nsu ?? null;
    const maxNsu = response.max_nsu ?? response.response_max_nsu ?? null;

    if (syncStateId) {
      const syncState = await FiscalDfeSyncState.findByPk(syncStateId, { transaction });
      if (syncState) {
        await syncState.update({
          ult_nsu: ultNsu != null ? String(ultNsu) : syncState.ult_nsu,
          max_nsu: maxNsu != null ? String(maxNsu) : syncState.max_nsu,
          last_success_at: new Date(),
          last_attempt_at: startedAt,
          status: 'idle',
          last_error_code: null,
          last_error_message: null,
          consecutive_errors: 0,
          lock_token: null,
          locked_until: null
        }, { transaction });
      }
    }

    if (syncLogId) {
      const syncLog = await FiscalSyncLog.findByPk(syncLogId, { transaction });
      if (syncLog) {
        await syncLog.update({
          finished_at: new Date(),
          status: 'success',
          response_ult_nsu: ultNsu != null ? String(ultNsu) : syncLog.response_ult_nsu,
          response_max_nsu: maxNsu != null ? String(maxNsu) : syncLog.response_max_nsu,
          response_code: response.response_code || response.code || syncLog.response_code,
          response_message: response.response_message || response.message || syncLog.response_message,
          documents_found: documents.length,
          documents_processed: processed.length
        }, { transaction });
      }
    }

    return {
      fiscal_company_id: fiscalCompany.id,
      document_type: documentType,
      documents_found: documents.length,
      documents_processed: processed.length,
      created: processed.filter((item) => item.created).length,
      updated: processed.filter((item) => item.updated).length,
      events_processed: processed.reduce((sum, item) => sum + item.events_processed, 0),
      ult_nsu: ultNsu != null ? String(ultNsu) : null,
      max_nsu: maxNsu != null ? String(maxNsu) : null,
      items: processed.map((item) => ({
        document_id: item.document.id,
        access_key: item.document.access_key,
        created: item.created,
        updated: item.updated,
        xml_saved: item.xml_saved,
        events_processed: item.events_processed
      }))
    };
  });
}

module.exports = {
  buildDocumentPayload,
  buildFiscalEventPayload,
  processarDocumentoNormalizado,
  processarRetornoDistribuicaoDfe
};
