'use strict';

const { Op } = require('sequelize');
const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDocumentLink,
  FiscalDivergence
} = require('../../../models');

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
    const error = new Error('Documento fiscal nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return document;
}

module.exports = {
  listarDocumentosFiscais,
  obterDocumentoFiscal
};
