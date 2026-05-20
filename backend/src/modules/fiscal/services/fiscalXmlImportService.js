'use strict';

const path = require('path');
const PizZip = require('pizzip');
const {
  FiscalCompany,
  FiscalDfeDocument
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { saveFiscalXml } = require('./fiscalS3Service');
const { parseNfeXml } = require('./fiscalXmlParserService');

const MAX_XMLS_PER_IMPORT = Number(process.env.FISCAL_XML_IMPORT_MAX_FILES || 100);
const MAX_XML_SIZE_BYTES = Number(process.env.FISCAL_XML_IMPORT_MAX_XML_MB || 10) * 1024 * 1024;

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

function ensureSafeZipEntryName(name) {
  const normalized = String(name || '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) {
    throw createHttpError('ZIP fiscal contem caminho de arquivo invalido.');
  }
  return normalized;
}

function normalizeUploadedFiles({ file, files } = {}) {
  if (Array.isArray(files)) return files.filter(Boolean);
  if (file) return [file];
  if (files && typeof files === 'object') {
    return Object.values(files)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);
  }
  return [];
}

function extractXmlItemsFromZip(file) {
  let zip;
  try {
    zip = new PizZip(file.buffer);
  } catch (error) {
    throw createHttpError('ZIP fiscal invalido ou corrompido.');
  }

  return Object.values(zip.files || {})
    .filter((entry) => !entry.dir)
    .map((entry) => {
      const entryName = ensureSafeZipEntryName(entry.name);
      if (path.extname(entryName).toLowerCase() !== '.xml') return null;

      const buffer = entry.asNodeBuffer();
      if (buffer.length > MAX_XML_SIZE_BYTES) {
        throw createHttpError(`XML ${entryName} excede o tamanho maximo permitido.`);
      }
      const xml = buffer.toString('utf8');

      return {
        originalname: `${file.originalname || 'importacao.zip'}:${entryName}`,
        xml,
        buffer,
        size: buffer.length,
        source: 'batch_import'
      };
    })
    .filter(Boolean);
}

function extractXmlItems(files) {
  const items = [];

  for (const file of files) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) continue;
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (extension === '.zip') {
      items.push(...extractXmlItemsFromZip(file));
      continue;
    }

    if (extension === '.xml') {
      items.push({
        originalname: file.originalname || 'nfe.xml',
        xml: file.buffer.toString('utf8'),
        buffer: file.buffer,
        size: file.size || file.buffer.length,
        source: 'manual_upload'
      });
    }
  }

  if (!items.length) {
    throw createHttpError('Nenhum XML fiscal valido foi encontrado para importacao.');
  }

  if (items.length > MAX_XMLS_PER_IMPORT) {
    throw createHttpError(`Importacao limitada a ${MAX_XMLS_PER_IMPORT} XMLs por envio.`);
  }

  return items;
}

async function importarXmlItem(req, { company, item }) {
  const parsed = parseNfeXml(item.xml);
  const storage = await saveFiscalXml({
    cnpj: company.cnpj,
    documentType: 'nfe',
    accessKey: parsed.access_key,
    xml: item.buffer || item.xml,
    date: parsed.emission_date || new Date(),
    metadata: {
      fiscal_company_id: company.id,
      source: item.source
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
      source: item.source,
      original_name: item.originalname || null,
      size: item.size
    },
    parsed_xml_json: parsed.parsed_xml_json,
    source: item.source,
    hash_xml: storage.hash,
    is_duplicate: Boolean(existing)
  };

  const document = existing
    ? await existing.update(payload)
    : await FiscalDfeDocument.create(payload);

  return {
    document,
    created: !existing,
    duplicate: Boolean(existing),
    source: item.source,
    original_name: item.originalname,
    storage: {
      key: storage.key,
      hash: storage.hash
    }
  };
}

async function importarXmlFiscalManual(req, { file, files, body = {} } = {}) {
  const uploadedFiles = normalizeUploadedFiles({ file, files });
  if (!uploadedFiles.length) {
    throw createHttpError('Informe ao menos um XML fiscal ou ZIP com XMLs fiscais.');
  }

  const fiscalCompanyId = normalizeCompanyId(body.fiscal_company_id || body.company_id);
  const company = await FiscalCompany.findByPk(fiscalCompanyId);
  if (!company || !company.ativo) {
    throw createHttpError('Empresa fiscal ativa nao encontrada.', 404);
  }

  const items = extractXmlItems(uploadedFiles);
  const imported = [];
  const failed = [];

  for (const item of items) {
    try {
      imported.push(await importarXmlItem(req, { company, item }));
    } catch (error) {
      failed.push({
        original_name: item.originalname,
        error: error.message || 'Erro ao importar XML fiscal.'
      });
    }
  }

  if (!imported.length && failed.length) {
    throw createHttpError(`Nenhum XML foi importado. Primeiro erro: ${failed[0].error}`);
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_XML_IMPORT_BATCH',
    recursoTipo: 'FISCAL_DFE_DOCUMENT',
    recursoId: imported[0]?.document?.id || null,
    status: failed.length ? 'WARNING' : 'SUCCESS',
    descricao: 'Importacao manual de XML fiscal processada',
    metadata: {
      fiscal_company_id: company.id,
      total: items.length,
      imported: imported.length,
      failed: failed.length,
      document_ids: imported.map((item) => item.document.id),
      duplicate_count: imported.filter((item) => item.duplicate).length
    }
  });

  const createdCount = imported.filter((item) => item.created).length;
  const duplicateCount = imported.filter((item) => item.duplicate).length;

  return {
    created: createdCount > 0,
    duplicate: imported.length === 1 ? imported[0].duplicate : false,
    total: items.length,
    imported_count: imported.length,
    created_count: createdCount,
    duplicate_count: duplicateCount,
    failed_count: failed.length,
    failed,
    documents: imported.map((item) => ({
      id: item.document.id,
      access_key: item.document.access_key,
      issuer_name: item.document.issuer_name,
      document_number: item.document.document_number,
      total_value: item.document.total_value,
      created: item.created,
      duplicate: item.duplicate,
      source: item.source,
      original_name: item.original_name
    }))
  };
}

async function importarXmlFiscalManualLegacy(req, { file, body = {} } = {}) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw createHttpError('Informe um arquivo XML fiscal valido.');
  }

  const result = await importarXmlFiscalManual(req, { files: [file], body });
  return {
    ...result,
    document: result.documents?.[0] || null
  };
}

module.exports = {
  importarXmlFiscalManual,
  importarXmlFiscalManualLegacy
};
