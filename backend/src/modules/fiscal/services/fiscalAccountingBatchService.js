'use strict';

const { Op } = require('sequelize');
const PizZip = require('pizzip');
const {
  FiscalAccountingBatch,
  FiscalAccountingBatchItem,
  FiscalCompany,
  FiscalDfeDocument,
  sequelize
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const {
  buildFiscalAccountingBatchObjectKey,
  getFiscalObjectBuffer,
  getFiscalObjectSignedUrl,
  uploadFiscalObject
} = require('./fiscalS3Service');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getPeriod(referenceYear, referenceMonth) {
  const year = Number(referenceYear);
  const month = Number(referenceMonth);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10)
  };
}

function normalizeBatch(batch) {
  if (!batch) return batch;
  const plain = typeof batch.toJSON === 'function' ? batch.toJSON() : batch;
  return {
    ...plain,
    total_value: Number(plain.total_value || 0)
  };
}

async function listarLotesContabeis(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;

  const where = {};
  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.status) where.status = query.status;
  if (query.reference_year) where.reference_year = query.reference_year;
  if (query.reference_month) where.reference_month = query.reference_month;

  const result = await FiscalAccountingBatch.findAndCountAll({
    where,
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
    ],
    order: [['reference_year', 'DESC'], ['reference_month', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  return {
    data: result.rows.map(normalizeBatch),
    pagination: {
      total: result.count,
      page,
      limit,
      pages: Math.ceil(result.count / limit)
    }
  };
}

async function obterLoteContabil(id) {
  const batch = await FiscalAccountingBatch.findByPk(id, {
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false },
      {
        model: FiscalAccountingBatchItem,
        as: 'items',
        required: false,
        include: [
          {
            model: FiscalDfeDocument,
            as: 'document',
            attributes: [
              'id',
              'access_key',
              'issuer_name',
              'issuer_cnpj',
              'document_number',
              'series',
              'emission_date',
              'total_value',
              'document_status',
              'xml_storage_key',
              'pdf_storage_key',
              'danfe_storage_key'
            ],
            required: false
          }
        ]
      }
    ],
    order: [[{ model: FiscalAccountingBatchItem, as: 'items' }, 'id', 'ASC']]
  });

  if (!batch) {
    throw createHttpError('Lote contabil fiscal nao encontrado.', 404);
  }

  return normalizeBatch(batch);
}

function sanitizeCsvValue(value) {
  const text = String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function buildResumoCsv(batch) {
  const header = [
    'empresa',
    'cnpj_empresa',
    'periodo',
    'fornecedor',
    'cnpj_fornecedor',
    'numero',
    'serie',
    'emissao',
    'valor',
    'chave_acesso',
    'status_documento',
    'xml_incluido',
    'pdf_incluido'
  ];

  const rows = (batch.items || []).map((item) => {
    const document = item.document || {};
    return [
      batch.company?.razao_social,
      batch.company?.cnpj,
      `${String(batch.reference_month).padStart(2, '0')}/${batch.reference_year}`,
      document.issuer_name,
      document.issuer_cnpj,
      document.document_number,
      document.series,
      document.emission_date,
      Number(document.total_value || 0).toFixed(2),
      document.access_key,
      document.document_status,
      item.included_xml ? 'sim' : 'nao',
      item.included_pdf ? 'sim' : 'nao'
    ].map(sanitizeCsvValue).join(';');
  });

  return [header.join(';'), ...rows].join('\n');
}

function getExtensionFromKey(key, fallback) {
  const match = String(key || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : fallback;
}

async function gerarArquivoLoteContabil(req, id) {
  const batch = await obterLoteContabil(id);

  if (['cancelled', 'sent'].includes(batch.status)) {
    throw createHttpError('Lote contabil fiscal cancelado ou enviado nao pode ser gerado novamente.', 400);
  }

  if (!batch.items?.length) {
    throw createHttpError('Lote contabil fiscal nao possui documentos para gerar arquivo.', 400);
  }

  const zip = new PizZip();
  const resumoCsv = buildResumoCsv(batch);
  zip.file('resumo.csv', resumoCsv);

  for (const item of batch.items) {
    const document = item.document || {};
    const accessKey = document.access_key || `documento-${document.id || item.id}`;

    if (document.xml_storage_key) {
      const xmlBuffer = await getFiscalObjectBuffer(document.xml_storage_key);
      zip.file(`xml/${accessKey}.xml`, xmlBuffer);
    }

    const pdfKey = document.pdf_storage_key || document.danfe_storage_key;
    if (pdfKey) {
      const fileBuffer = await getFiscalObjectBuffer(pdfKey);
      const extension = getExtensionFromKey(pdfKey, 'pdf');
      zip.file(`pdf-danfe/${accessKey}.${extension}`, fileBuffer);
    }
  }

  const zipBuffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });

  const storageKey = buildFiscalAccountingBatchObjectKey({
    cnpj: batch.company?.cnpj || 'sem-cnpj',
    referenceYear: batch.reference_year,
    referenceMonth: batch.reference_month,
    batchId: batch.id,
    filename: `lote-${batch.id}.zip`
  });

  const storage = await uploadFiscalObject({
    key: storageKey,
    body: zipBuffer,
    contentType: 'application/zip',
    metadata: {
      fiscal_accounting_batch_id: batch.id,
      fiscal_company_id: batch.fiscal_company_id,
      reference_month: batch.reference_month,
      reference_year: batch.reference_year
    }
  });

  const batchModel = await FiscalAccountingBatch.findByPk(batch.id);
  await batchModel.update({
    status: 'generated',
    zip_storage_key: storage.key,
    generated_at: new Date()
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_ACCOUNTING_BATCH_GENERATED',
    recursoTipo: 'FISCAL_ACCOUNTING_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'Arquivo ZIP do lote contabil fiscal gerado',
    metadata: {
      fiscal_company_id: batch.fiscal_company_id,
      reference_month: batch.reference_month,
      reference_year: batch.reference_year,
      total_documents: batch.total_documents,
      storage_key: storage.key
    }
  });

  return {
    batch: await obterLoteContabil(batch.id),
    storage
  };
}

async function gerarUrlLoteContabil(req, id) {
  const batch = await FiscalAccountingBatch.findByPk(id);

  if (!batch) {
    throw createHttpError('Lote contabil fiscal nao encontrado.', 404);
  }

  if (!batch.zip_storage_key) {
    throw createHttpError('Arquivo ZIP ainda nao foi gerado para este lote contabil fiscal.', 404);
  }

  const url = await getFiscalObjectSignedUrl(batch.zip_storage_key);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_ACCOUNTING_BATCH_SIGNED_URL',
    recursoTipo: 'FISCAL_ACCOUNTING_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'URL assinada de lote contabil fiscal gerada',
    metadata: {
      fiscal_company_id: batch.fiscal_company_id,
      reference_month: batch.reference_month,
      reference_year: batch.reference_year,
      storage_key: batch.zip_storage_key
    }
  });

  return {
    url,
    expires_in_seconds: Number(process.env.FISCAL_S3_PRESIGNED_EXPIRES_SECONDS || 300),
    batch_id: batch.id
  };
}

async function gerarLoteContabil(req, payload = {}) {
  const company = await FiscalCompany.findByPk(payload.fiscal_company_id);
  if (!company) {
    throw createHttpError('Empresa fiscal nao encontrada.', 404);
  }

  const { period_start, period_end } = getPeriod(payload.reference_year, payload.reference_month);

  const existing = await FiscalAccountingBatch.findOne({
    where: {
      fiscal_company_id: company.id,
      reference_year: payload.reference_year,
      reference_month: payload.reference_month,
      status: { [Op.ne]: 'cancelled' }
    }
  });

  if (existing) {
    return {
      created: false,
      batch: await obterLoteContabil(existing.id),
      message: 'Ja existe um lote contabil fiscal para esta empresa e periodo.'
    };
  }

  const documents = await FiscalDfeDocument.findAll({
    where: {
      fiscal_company_id: company.id,
      emission_date: { [Op.between]: [period_start, period_end] },
      document_status: 'validated'
    },
    order: [['emission_date', 'ASC'], ['id', 'ASC']]
  });

  if (!documents.length) {
    throw createHttpError('Nao existem documentos fiscais validados para gerar o lote neste periodo.', 400);
  }

  const totalValue = documents.reduce((sum, document) => sum + Number(document.total_value || 0), 0);

  const batch = await sequelize.transaction(async (transaction) => {
    const createdBatch = await FiscalAccountingBatch.create({
      fiscal_company_id: company.id,
      reference_month: payload.reference_month,
      reference_year: payload.reference_year,
      period_start,
      period_end,
      status: 'draft',
      total_documents: documents.length,
      total_value: totalValue,
      generated_by: req.user?.id || null,
      generated_at: new Date()
    }, { transaction });

    await FiscalAccountingBatchItem.bulkCreate(documents.map((document) => ({
      batch_id: createdBatch.id,
      fiscal_dfe_document_id: document.id,
      included_xml: Boolean(document.xml_storage_key),
      included_pdf: Boolean(document.pdf_storage_key || document.danfe_storage_key),
      status: 'included'
    })), { transaction });

    return createdBatch;
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_ACCOUNTING_BATCH_CREATED',
    recursoTipo: 'FISCAL_ACCOUNTING_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'Lote contabil fiscal criado em modo rascunho',
    metadata: {
      fiscal_company_id: company.id,
      reference_month: payload.reference_month,
      reference_year: payload.reference_year,
      total_documents: documents.length,
      total_value: totalValue
    }
  });

  return {
    created: true,
    batch: await obterLoteContabil(batch.id),
    message: 'Lote contabil fiscal criado em modo rascunho.'
  };
}

module.exports = {
  gerarArquivoLoteContabil,
  gerarLoteContabil,
  gerarUrlLoteContabil,
  listarLotesContabeis,
  obterLoteContabil
};
