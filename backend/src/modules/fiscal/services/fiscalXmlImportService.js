'use strict';

const {
  FiscalCompany,
  FiscalDfeDocument
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { saveFiscalXml } = require('./fiscalS3Service');
const { parseNfeXml } = require('./fiscalXmlParserService');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeCompanyId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError('Empresa fiscal e obrigatoria para importar XML.');
  }
  return id;
}

async function importarXmlFiscalManual(req, { file, body = {} } = {}) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw createHttpError('Informe um arquivo XML fiscal valido.');
  }

  const fiscalCompanyId = normalizeCompanyId(body.fiscal_company_id || body.company_id);
  const company = await FiscalCompany.findByPk(fiscalCompanyId);
  if (!company || !company.ativo) {
    throw createHttpError('Empresa fiscal ativa nao encontrada.', 404);
  }

  const xml = file.buffer.toString('utf8');
  const parsed = parseNfeXml(xml);
  const storage = await saveFiscalXml({
    cnpj: company.cnpj,
    documentType: 'nfe',
    accessKey: parsed.access_key,
    xml,
    date: parsed.emission_date || new Date(),
    metadata: {
      fiscal_company_id: company.id,
      source: 'manual_upload',
      original_name: file.originalname || 'nfe.xml'
    }
  });

  const existing = await FiscalDfeDocument.findOne({
    where: { access_key: parsed.access_key }
  });

  const payload = {
    fiscal_company_id: company.id,
    document_type: 'nfe',
    access_key: parsed.access_key,
    schema_version: parsed.schema_version,
    issuer_cnpj: parsed.issuer_cnpj,
    issuer_name: parsed.issuer_name,
    recipient_cnpj: parsed.recipient_cnpj,
    recipient_name: parsed.recipient_name,
    emission_date: parsed.emission_date,
    received_at: new Date(),
    total_value: parsed.total_value,
    currency: 'BRL',
    document_number: parsed.document_number,
    series: parsed.series,
    operation_nature: parsed.operation_nature,
    sefaz_status_code: parsed.sefaz_status_code,
    sefaz_status_description: parsed.sefaz_status_description,
    document_status: 'xml_downloaded',
    manifestation_status: 'pending',
    xml_storage_key: storage.key,
    raw_summary_json: {
      source: 'manual_upload',
      original_name: file.originalname || null,
      size: file.size || file.buffer.length
    },
    parsed_xml_json: parsed.parsed_xml_json,
    source: 'manual_upload',
    hash_xml: storage.hash,
    is_duplicate: Boolean(existing)
  };

  const document = existing
    ? await existing.update(payload)
    : await FiscalDfeDocument.create(payload);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: existing ? 'FISCAL_XML_REIMPORTED' : 'FISCAL_XML_IMPORTED',
    recursoTipo: 'FISCAL_DFE_DOCUMENT',
    recursoId: document.id,
    status: 'SUCCESS',
    descricao: existing ? 'XML fiscal manual reimportado com idempotencia' : 'XML fiscal manual importado',
    metadata: {
      fiscal_company_id: company.id,
      access_key: parsed.access_key,
      document_id: document.id,
      storage_key: storage.key,
      duplicate: Boolean(existing)
    }
  });

  return {
    document,
    created: !existing,
    duplicate: Boolean(existing),
    storage: {
      key: storage.key,
      hash: storage.hash
    }
  };
}

module.exports = {
  importarXmlFiscalManual
};
