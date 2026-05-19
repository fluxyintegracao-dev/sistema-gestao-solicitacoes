'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  EmpresaGrupo,
  FiscalCompany,
  FiscalDfeSyncState
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');

function buildCompanyWhere(query = {}) {
  const where = {};
  if (query.ativo !== undefined) where.ativo = query.ativo;
  if (query.q) {
    where[Op.or] = [
      { razao_social: { [Op.like]: `%${query.q}%` } },
      { nome_fantasia: { [Op.like]: `%${query.q}%` } },
      { cnpj: { [Op.like]: `%${String(query.q).replace(/\D/g, '') || query.q}%` } }
    ];
  }
  return where;
}

async function ensureDefaultSyncState(company, transaction) {
  const existing = await FiscalDfeSyncState.findOne({
    where: {
      fiscal_company_id: company.id,
      document_type: 'nfe',
      ambiente_sefaz: company.ambiente_sefaz || 'homologacao'
    },
    transaction
  });

  if (existing) return existing;

  return FiscalDfeSyncState.create({
    fiscal_company_id: company.id,
    document_type: 'nfe',
    ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
    ult_nsu: '0',
    max_nsu: '0',
    status: 'idle'
  }, { transaction });
}

async function listarFiscalCompanies(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;

  const result = await FiscalCompany.findAndCountAll({
    where: buildCompanyWhere(query),
    include: [
      {
        model: EmpresaGrupo,
        as: 'empresa',
        attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'],
        required: false
      },
      {
        model: FiscalDfeSyncState,
        as: 'syncStates',
        attributes: ['id', 'document_type', 'ambiente_sefaz', 'ult_nsu', 'max_nsu', 'status', 'last_success_at', 'last_attempt_at'],
        required: false
      }
    ],
    order: [['razao_social', 'ASC']],
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

async function criarFiscalCompany(req, payload) {
  return sequelize.transaction(async (transaction) => {
    const exists = await FiscalCompany.findOne({
      where: { cnpj: payload.cnpj },
      transaction
    });

    if (exists) {
      const error = new Error('Ja existe empresa fiscal cadastrada para este CNPJ.');
      error.statusCode = 409;
      throw error;
    }

    const company = await FiscalCompany.create({
      ...payload,
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      modulo_fiscal_habilitado: payload.modulo_fiscal_habilitado !== undefined
        ? payload.modulo_fiscal_habilitado
        : false,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null
    }, { transaction });

    await ensureDefaultSyncState(company, transaction);

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FISCAL_COMPANY_CREATED',
      recursoTipo: 'FISCAL_COMPANY',
      recursoId: company.id,
      status: 'SUCCESS',
      descricao: 'Empresa fiscal cadastrada',
      metadata: {
        fiscal_company_id: company.id,
        cnpj: company.cnpj
      }
    });

    return FiscalCompany.findByPk(company.id, {
      include: [
        { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'], required: false },
        { model: FiscalDfeSyncState, as: 'syncStates', required: false }
      ],
      transaction
    });
  });
}

async function atualizarFiscalCompany(req, id, payload) {
  return sequelize.transaction(async (transaction) => {
    const company = await FiscalCompany.findByPk(id, { transaction });
    if (!company) {
      const error = new Error('Empresa fiscal nao encontrada.');
      error.statusCode = 404;
      throw error;
    }

    if (payload.cnpj && payload.cnpj !== company.cnpj) {
      const exists = await FiscalCompany.findOne({
        where: {
          cnpj: payload.cnpj,
          id: { [Op.ne]: company.id }
        },
        transaction
      });
      if (exists) {
        const error = new Error('Ja existe empresa fiscal cadastrada para este CNPJ.');
        error.statusCode = 409;
        throw error;
      }
    }

    await company.update({
      ...payload,
      updated_by: req.user?.id || null
    }, { transaction });

    await ensureDefaultSyncState(company, transaction);

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FISCAL_COMPANY_UPDATED',
      recursoTipo: 'FISCAL_COMPANY',
      recursoId: company.id,
      status: 'SUCCESS',
      descricao: 'Empresa fiscal atualizada',
      metadata: {
        fiscal_company_id: company.id,
        campos: Object.keys(payload)
      }
    });

    return FiscalCompany.findByPk(company.id, {
      include: [
        { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'], required: false },
        { model: FiscalDfeSyncState, as: 'syncStates', required: false }
      ],
      transaction
    });
  });
}

module.exports = {
  atualizarFiscalCompany,
  criarFiscalCompany,
  listarFiscalCompanies
};
