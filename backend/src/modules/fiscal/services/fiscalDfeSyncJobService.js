'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const {
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const { consultarDistNsu } = require('./sefaz/sefazDfeDistributionService');

const DEFAULT_LOCK_TTL_SECONDS = 15 * 60;

function getLockTtlMs() {
  const seconds = Number(process.env.FISCAL_SEFAZ_LOCK_TTL_SECONDS || DEFAULT_LOCK_TTL_SECONDS);
  return Math.max(60, Math.min(seconds, 60 * 60)) * 1000;
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

async function registrarTentativaIgnorada(company, syncState, documentType, startedAt, { code, message }) {
  const log = await FiscalSyncLog.create({
    fiscal_company_id: company.id,
    document_type: documentType,
    ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
    started_at: startedAt,
    finished_at: new Date(),
    status: 'skipped',
    request_type: 'distNSU',
    request_nsu_start: syncState.ult_nsu || '0',
    response_ult_nsu: syncState.ult_nsu || '0',
    response_max_nsu: syncState.max_nsu || '0',
    response_code: code,
    response_message: message,
    documents_found: 0,
    documents_processed: 0
  });

  await syncState.update({
    last_attempt_at: startedAt,
    last_error_code: code,
    last_error_message: message
  });

  return { log, status: 'skipped', message };
}

async function tentarAdquirirSyncLock(syncState, startedAt) {
  const lockToken = randomUUID();
  const lockedUntil = new Date(startedAt.getTime() + getLockTtlMs());

  const [updated] = await FiscalDfeSyncState.update(
    {
      status: 'syncing',
      lock_token: lockToken,
      locked_until: lockedUntil,
      last_attempt_at: startedAt
    },
    {
      where: {
        id: syncState.id,
        [Op.or]: [
          { locked_until: null },
          { locked_until: { [Op.lt]: startedAt } },
          { status: { [Op.ne]: 'syncing' } }
        ]
      }
    }
  );

  if (!updated) return null;
  await syncState.reload();
  return { lockToken, lockedUntil };
}

async function liberarSyncLock(syncState, lockToken, updates = {}) {
  await FiscalDfeSyncState.update(
    {
      ...updates,
      lock_token: null,
      locked_until: null
    },
    {
      where: {
        id: syncState.id,
        lock_token: lockToken
      }
    }
  );
  await syncState.reload();
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
  if (syncState.next_allowed_sync_at && new Date(syncState.next_allowed_sync_at).getTime() > startedAt.getTime()) {
    return registrarTentativaIgnorada(company, syncState, documentType, startedAt, {
      code: 'FISCAL_SYNC_THROTTLED',
      message: 'Sincronizacao fiscal aguardando proxima janela permitida.'
    });
  }

  const lock = await tentarAdquirirSyncLock(syncState, startedAt);
  if (!lock) {
    return registrarTentativaIgnorada(company, syncState, documentType, startedAt, {
      code: 'FISCAL_SYNC_LOCKED',
      message: 'Ja existe uma sincronizacao fiscal em andamento para esta empresa e tipo documental.'
    });
  }

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

    await liberarSyncLock(syncState, lock.lockToken, {
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

  await liberarSyncLock(syncState, lock.lockToken, {
    status: 'blocked',
    last_error_code: 'FISCAL_SEFAZ_STUB',
    last_error_message: responseMessage
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
  executarSyncDfeControlado,
  liberarSyncLock,
  tentarAdquirirSyncLock
};
