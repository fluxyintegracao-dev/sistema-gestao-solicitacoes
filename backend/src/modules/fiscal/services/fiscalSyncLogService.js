'use strict';

const {
  FiscalCompany,
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');

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

async function ensureSyncState(company, documentType) {
  const [syncState] = await FiscalDfeSyncState.findOrCreate({
    where: {
      fiscal_company_id: company.id,
      document_type: documentType,
      ambiente_sefaz: company.ambiente_sefaz || 'homologacao'
    },
    defaults: {
      ult_nsu: '0',
      max_nsu: '0',
      status: 'idle'
    }
  });
  return syncState;
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

  const sefazEnabled = process.env.FISCAL_SEFAZ_ENABLED === 'true';
  const logs = [];

  for (const company of companies) {
    const startedAt = new Date();
    const syncState = await ensureSyncState(company, documentType);
    const status = sefazEnabled ? 'blocked' : 'skipped';
    const responseCode = sefazEnabled ? 'FISCAL_SEFAZ_STUB' : 'FISCAL_SEFAZ_DISABLED';
    const responseMessage = sefazEnabled
      ? 'Sincronizacao SEFAZ real ainda nao esta implementada nesta fase.'
      : 'Sincronizacao SEFAZ desabilitada por FISCAL_SEFAZ_ENABLED=false.';

    const log = await FiscalSyncLog.create({
      fiscal_company_id: company.id,
      document_type: documentType,
      ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
      started_at: startedAt,
      finished_at: new Date(),
      status,
      request_type: 'manual_probe',
      request_nsu_start: syncState.ult_nsu || '0',
      response_ult_nsu: syncState.ult_nsu || '0',
      response_max_nsu: syncState.max_nsu || '0',
      response_code: responseCode,
      response_message: responseMessage,
      documents_found: 0,
      documents_processed: 0
    });

    await syncState.update({
      last_attempt_at: startedAt,
      status: sefazEnabled ? 'blocked' : 'idle',
      last_error_code: sefazEnabled ? responseCode : null,
      last_error_message: sefazEnabled ? responseMessage : null,
      consecutive_errors: sefazEnabled ? Number(syncState.consecutive_errors || 0) + 1 : syncState.consecutive_errors
    });

    logs.push(log);
  }

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
      sefaz_enabled: sefazEnabled
    }
  });

  return {
    status: sefazEnabled ? 'blocked' : 'skipped',
    message: sefazEnabled
      ? 'Tentativa registrada. A integracao real com SEFAZ sera implementada na proxima fase.'
      : 'Tentativa registrada. Ative FISCAL_SEFAZ_ENABLED apenas quando a integracao real estiver pronta.',
    logs
  };
}

module.exports = {
  executarSincronizacaoManual,
  listarLogsSincronizacao
};
