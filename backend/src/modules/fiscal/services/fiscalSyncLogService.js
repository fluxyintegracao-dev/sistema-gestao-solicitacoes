'use strict';

const {
  FiscalCompany,
  FiscalSyncLog
} = require('../../../models');

async function listarLogsSincronizacao(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;
  const where = {};

  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.status) where.status = query.status;
  if (query.document_type) where.document_type = query.document_type;

  const result = await FiscalSyncLog.findAndCountAll({
    where,
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
    ],
    order: [['started_at', 'DESC'], ['id', 'DESC']],
    limit,
    offset
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

module.exports = {
  listarLogsSincronizacao
};
