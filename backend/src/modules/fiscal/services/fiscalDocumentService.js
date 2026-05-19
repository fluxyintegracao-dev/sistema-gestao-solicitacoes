'use strict';

const { Op } = require('sequelize');
const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDocumentLink,
  FiscalDivergence
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { getFiscalObjectSignedUrl } = require('./fiscalS3Service');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildDocumentWhere(query = {}) {
  const where = {};
  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.status) where.document_status = query.status;
  if (query.document_type) where.document_type = query.document_type;
  if (query.q) {
    where[Op.or] = [
      { access_key: { [Op.like]: `%${query.q}%` } },
      { issuer_name: { [Op.like]: `%${query.q}%` } },
      { issuer_cnpj: { [Op.like]: `%${String(query.q).replace(/\D/g, '') || query.q}%` } },
      { document_number: { [Op.like]: `%${query.q}%` } }
    ];
  }
  return where;
}

async function listarDocumentosFiscais(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;

  const result = await FiscalDfeDocument.findAndCountAll({
    where: buildDocumentWhere(query),
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
    ],
    order: [['emission_date', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  return {
    data: result.rows,
    pagination: {
      total: result.count,
      page,
      limit,
      pages: Math.ceil(result.count / limit)
    }
  };
}

async function obterDocumentoFiscal(id) {
  const document = await FiscalDfeDocument.findByPk(id, {
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false },
      { model: FiscalDocumentLink, as: 'links', required: false },
      { model: FiscalDivergence, as: 'divergences', required: false }
    ]
  });

  if (!document) {
    throw createHttpError('Documento fiscal nao encontrado.', 404);
  }

  return document;
}

async function gerarUrlArquivoFiscal(req, id, tipoArquivo) {
  const document = await FiscalDfeDocument.findByPk(id, {
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
    ]
  });

  if (!document) {
    throw createHttpError('Documento fiscal nao encontrado.', 404);
  }

  const tipo = String(tipoArquivo || '').toLowerCase();
  const keyMap = {
    xml: document.xml_storage_key,
    pdf: document.pdf_storage_key || document.danfe_storage_key,
    danfe: document.danfe_storage_key || document.pdf_storage_key
  };
  const storageKey = keyMap[tipo];

  if (!storageKey) {
    throw createHttpError(`Arquivo ${tipo.toUpperCase()} nao disponivel para este documento fiscal.`, 404);
  }

  const url = await getFiscalObjectSignedUrl(storageKey);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_DOCUMENT_SIGNED_URL',
    recursoTipo: 'FISCAL_DFE_DOCUMENT',
    recursoId: document.id,
    status: 'SUCCESS',
    descricao: 'URL assinada de arquivo fiscal gerada',
    metadata: {
      fiscal_company_id: document.fiscal_company_id,
      document_type: document.document_type,
      file_type: tipo,
      access_key: document.access_key,
      storage_key: storageKey
    }
  });

  return {
    url,
    expires_in_seconds: Number(process.env.FISCAL_S3_PRESIGNED_EXPIRES_SECONDS || 300),
    file_type: tipo,
    document_id: document.id
  };
}

module.exports = {
  gerarUrlArquivoFiscal,
  listarDocumentosFiscais,
  obterDocumentoFiscal
};
