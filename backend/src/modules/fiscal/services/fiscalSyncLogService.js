'use strict';

const {
  FiscalCompany,
  FiscalSyncLog
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { executarSyncDfeControlado } = require('./fiscalDfeSyncJobService');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

async function listarEstadosSincronizacao(query = {}) {
  const limit = query.limit || 50;
  const page = query.page || 1;
  const offset = (page - 1) * limit;
  const where = {};

  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.status) where.status = query.status;
  if (query.document_type) where.document_type = query.document_type;
  if (query.ambiente_sefaz) where.ambiente_sefaz = query.ambiente_sefaz;

  const result = await FiscalDfeSyncState.findAndCountAll({
    where,
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ambiente_sefaz'], required: false }
    ],
    order: [
      ['status', 'ASC'],
      ['last_attempt_at', 'DESC'],
      ['id', 'DESC']
    ],
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

async function executarSincronizacaoManual(req, payload = {}) {
  const documentType = payload.document_type || 'nfe';
  const companyWhere = {
    ativo: true,
    modulo_fiscal_habilitado: true
  };
  if (payload.company_id) companyWhere.id = payload.company_id;

  const companies = await FiscalCompany.findAll({
    where: companyWhere,
    order: [['razao_social', 'ASC']]
  });

  if (payload.company_id && companies.length === 0) {
    throw createHttpError('Empresa fiscal ativa e habilitada nao encontrada.', 404);
  }

  if (!companies.length) {
    throw createHttpError('Nenhuma empresa fiscal ativa e habilitada para sincronizacao.', 400);
  }

  const results = [];

  for (const company of companies) {
    results.push(await executarSyncDfeControlado({ company, documentType }));
  }

  const hasBlocked = results.some((result) => result.status === 'blocked');

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_SYNC_MANUAL_REQUESTED',
    recursoTipo: 'FISCAL_SYNC',
    recursoId: payload.company_id || null,
    status: 'INFO',
    descricao: 'Tentativa manual controlada de sincronizacao fiscal registrada',
    metadata: {
      document_type: documentType,
      companies: companies.map((company) => company.id),
      sefaz_enabled: process.env.FISCAL_SEFAZ_ENABLED === 'true'
    }
  });

  return {
    status: hasBlocked ? 'blocked' : 'skipped',
    message: hasBlocked
      ? 'Tentativa registrada. A integracao real com SEFAZ sera implementada na proxima fase.'
      : 'Tentativa registrada. Ative FISCAL_SEFAZ_ENABLED apenas quando a integracao real estiver pronta.',
    logs: results.map((result) => result.log)
  };
}

module.exports = {
  executarSincronizacaoManual,
  listarEstadosSincronizacao,
  listarLogsSincronizacao
};
