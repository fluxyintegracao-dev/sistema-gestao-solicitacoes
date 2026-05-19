'use strict';

const {
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const { consultarDistNsu } = require('./sefaz/sefazDfeDistributionService');

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

async function registrarTentativaSemSefaz(company, syncState, documentType, startedAt) {
  const responseMessage = 'Sincronizacao SEFAZ desabilitada por FISCAL_SEFAZ_ENABLED=false.';
  const log = await FiscalSyncLog.create({
    fiscal_company_id: company.id,
    document_type: documentType,
    ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
    started_at: startedAt,
    finished_at: new Date(),
    status: 'skipped',
    request_type: 'manual_probe',
    request_nsu_start: syncState.ult_nsu || '0',
    response_ult_nsu: syncState.ult_nsu || '0',
    response_max_nsu: syncState.max_nsu || '0',
    response_code: 'FISCAL_SEFAZ_DISABLED',
    response_message: responseMessage,
    documents_found: 0,
    documents_processed: 0
  });

  await syncState.update({
    last_attempt_at: startedAt,
    status: 'idle',
    last_error_code: null,
    last_error_message: null
  });

  return { log, status: 'skipped', message: responseMessage };
}

async function registrarTentativaStub(company, syncState, documentType, startedAt) {
  const log = await FiscalSyncLog.create({
    fiscal_company_id: company.id,
    document_type: documentType,
    ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
    started_at: startedAt,
    status: 'blocked',
    request_type: 'distNSU',
    request_nsu_start: syncState.ult_nsu || '0',
    response_ult_nsu: syncState.ult_nsu || '0',
    response_max_nsu: syncState.max_nsu || '0',
    documents_found: 0,
    documents_processed: 0
  });

  try {
    await consultarDistNsu({
      company,
      documentType,
      ultNsu: syncState.ult_nsu || '0'
    });
  } catch (error) {
    const responseCode = error.statusCode === 501 ? 'FISCAL_SEFAZ_STUB' : 'FISCAL_SEFAZ_ERROR';
    const responseMessage = error.message || 'Falha controlada ao preparar consulta SEFAZ.';

    await log.update({
      finished_at: new Date(),
      status: 'blocked',
      response_code: responseCode,
      response_message: responseMessage,
      error_message: responseMessage
    });

    await syncState.update({
      last_attempt_at: startedAt,
      status: 'blocked',
      last_error_code: responseCode,
      last_error_message: responseMessage,
      consecutive_errors: Number(syncState.consecutive_errors || 0) + 1
    });

    return { log, status: 'blocked', message: responseMessage };
  }

  const responseMessage = 'Cliente SEFAZ retornou sem processamento nesta fase.';
  await log.update({
    finished_at: new Date(),
    status: 'blocked',
    response_code: 'FISCAL_SEFAZ_STUB',
    response_message: responseMessage
  });

  return { log, status: 'blocked', message: responseMessage };
}

async function executarSyncDfeControlado({ company, documentType = 'nfe' } = {}) {
  const startedAt = new Date();
  const syncState = await ensureSyncState(company, documentType);
  const sefazEnabled = process.env.FISCAL_SEFAZ_ENABLED === 'true';

  if (!sefazEnabled) {
    return registrarTentativaSemSefaz(company, syncState, documentType, startedAt);
  }

  return registrarTentativaStub(company, syncState, documentType, startedAt);
}

module.exports = {
  ensureSyncState,
  executarSyncDfeControlado
};
