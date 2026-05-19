'use strict';

const { Op } = require('sequelize');
const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDivergence
} = require('../../../models');

function buildDivergenceWhere(query = {}) {
  const where = {};

  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.divergence_type) where.divergence_type = query.divergence_type;

  if (query.q) {
    const digits = String(query.q).replace(/\D/g, '');
    where[Op.or] = [
      { description: { [Op.like]: `%${query.q}%` } },
      { expected_value: { [Op.like]: `%${query.q}%` } },
      { actual_value: { [Op.like]: `%${query.q}%` } },
      { '$document.access_key$': { [Op.like]: `%${query.q}%` } },
      { '$document.issuer_name$': { [Op.like]: `%${query.q}%` } },
      { '$document.document_number$': { [Op.like]: `%${query.q}%` } }
    ];

    if (digits) {
      where[Op.or].push({ '$document.issuer_cnpj$': { [Op.like]: `%${digits}%` } });
    }
  }

  return where;
}

async function listarDivergenciasFiscais(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;

  const result = await FiscalDivergence.findAndCountAll({
    where: buildDivergenceWhere(query),
    include: [
      {
        model: FiscalDfeDocument,
        as: 'document',
        required: true,
        where: query.company_id ? { fiscal_company_id: query.company_id } : undefined,
        attributes: [
          'id',
          'fiscal_company_id',
          'access_key',
          'issuer_cnpj',
          'issuer_name',
          'emission_date',
          'total_value',
          'document_number',
          'series',
          'document_status'
        ],
        include: [
          {
            model: FiscalCompany,
            as: 'company',
            attributes: ['id', 'razao_social', 'cnpj', 'uf'],
            required: false
          }
        ]
      }
    ],
    order: [['status', 'ASC'], ['severity', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true,
    subQuery: false
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
  listarDivergenciasFiscais
};
