'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const {
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const {
  processarRetornoDistribuicaoDfe
} = require('./fiscalDfeProcessorService');
const {
  saveRawSefazRequest,
  saveRawSefazResponse
} = require('./fiscalS3Service');
const { consultarDistNsu } = require('./sefaz/sefazDfeDistributionService');

const DEFAULT_LOCK_TTL_SECONDS = 15 * 60;
const SEFAZ_EMPTY_RESULT_CODE = '137';
const SEFAZ_DOCUMENTS_FOUND_CODE = '138';
const SEFAZ_CONSUMO_INDEVIDO_CODE = '656';

function getLockTtlMs() {
  const seconds = Number(process.env.FISCAL_SEFAZ_LOCK_TTL_SECONDS || DEFAULT_LOCK_TTL_SECONDS);
  return Math.max(60, Math.min(seconds, 60 * 60)) * 1000;
}

function minutesFromEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(5, Math.min(value, 24 * 60));
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getSefazPostResponsePolicy(response, startedAt) {
  const responseCode = String(response?.response_code || '').trim();
  if (responseCode === SEFAZ_EMPTY_RESULT_CODE) {
    const minutes = minutesFromEnv('FISCAL_SEFAZ_EMPTY_RESULT_WAIT_MINUTES', 60);
    return {
      status: 'idle',
      next_allowed_sync_at: addMinutes(startedAt, minutes),
      response_code: responseCode,
      response_message: response.response_message || 'Nenhum documento localizado pela SEFAZ.',
      severity: 'success'
    };
  }

  if (responseCode === SEFAZ_CONSUMO_INDEVIDO_CODE) {
    const minutes = minutesFromEnv('FISCAL_SEFAZ_CONSUMO_INDEVIDO_WAIT_MINUTES', 60);
    return {
      status: 'blocked',
      next_allowed_sync_at: addMinutes(startedAt, minutes),
      response_code: responseCode,
      response_message: response.response_message || 'SEFAZ retornou consumo indevido. Sincronizacao bloqueada temporariamente.',
      severity: 'blocked'
    };
  }

  if (responseCode && ![SEFAZ_DOCUMENTS_FOUND_CODE].includes(responseCode)) {
    return {
      status: 'idle',
      next_allowed_sync_at: null,
      response_code: responseCode,
      response_message: response.response_message || 'Retorno SEFAZ processado com codigo nao classificado.',
      severity: 'warn'
    };
  }

  return {
    status: 'idle',
    next_allowed_sync_at: null,
    response_code: responseCode || null,
    response_message: response?.response_message || null,
    severity: 'success'
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

async function registrarTentativaSefaz(company, syncState, documentType, startedAt) {
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
    const response = await consultarDistNsu({
      company,
      documentType,
      ultNsu: syncState.ult_nsu || '0'
    });
    const responsePolicy = getSefazPostResponsePolicy(response, startedAt);

    const rawRequest = response.raw_request_xml
      ? await saveRawSefazRequest({
        cnpj: company.cnpj,
        syncLogId: log.id,
        requestType: response.request_type || 'distNSU',
        payload: response.raw_request_xml,
        metadata: {
          fiscal_company_id: company.id,
          document_type: documentType
        }
      })
      : null;

    const rawResponse = response.raw_response_xml
      ? await saveRawSefazResponse({
        cnpj: company.cnpj,
        syncLogId: log.id,
        requestType: response.request_type || 'distNSU',
        payload: response.raw_response_xml,
        metadata: {
          fiscal_company_id: company.id,
          document_type: documentType,
          response_code: response.response_code || ''
        }
      })
      : null;

    if (responsePolicy.status === 'blocked') {
      await log.update({
        finished_at: new Date(),
        status: 'blocked',
        response_ult_nsu: response.ult_nsu != null ? String(response.ult_nsu) : log.response_ult_nsu,
        response_max_nsu: response.max_nsu != null ? String(response.max_nsu) : log.response_max_nsu,
        response_code: responsePolicy.response_code,
        response_message: responsePolicy.response_message,
        error_message: responsePolicy.response_message,
        raw_request_storage_key: rawRequest?.key || null,
        raw_response_storage_key: rawResponse?.key || null
      });

      await liberarSyncLock(syncState, lock.lockToken, {
        status: 'blocked',
        next_allowed_sync_at: responsePolicy.next_allowed_sync_at,
        last_error_code: responsePolicy.response_code,
        last_error_message: responsePolicy.response_message,
        consecutive_errors: Number(syncState.consecutive_errors || 0) + 1
      });

      return {
        log,
        status: 'blocked',
        message: responsePolicy.response_message
      };
    }

    const processed = await processarRetornoDistribuicaoDfe({
      company,
      syncStateId: syncState.id,
      syncLogId: log.id,
      documentType,
      response,
      rawRequestStorageKey: rawRequest?.key || null,
      rawResponseStorageKey: rawResponse?.key || null
    });

    if (responsePolicy.next_allowed_sync_at || responsePolicy.status === 'blocked') {
      await syncState.update({
        status: responsePolicy.status,
        next_allowed_sync_at: responsePolicy.next_allowed_sync_at,
        last_error_code: responsePolicy.status === 'blocked' ? responsePolicy.response_code : null,
        last_error_message: responsePolicy.status === 'blocked' ? responsePolicy.response_message : null,
        consecutive_errors: responsePolicy.status === 'blocked'
          ? Number(syncState.consecutive_errors || 0) + 1
          : 0
      });
    }

    return {
      log,
      status: 'success',
      message: `Sincronizacao fiscal processada: ${processed.documents_processed} documento(s).`,
      processed
    };
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
}

async function executarSyncDfeControlado({ company, documentType = 'nfe' } = {}) {
  const startedAt = new Date();
  const syncState = await ensureSyncState(company, documentType);
  const sefazEnabled = process.env.FISCAL_SEFAZ_ENABLED === 'true';

  if (!sefazEnabled) {
    return registrarTentativaSemSefaz(company, syncState, documentType, startedAt);
  }

  return registrarTentativaSefaz(company, syncState, documentType, startedAt);
}

module.exports = {
  ensureSyncState,
  executarSyncDfeControlado,
  getSefazPostResponsePolicy,
  liberarSyncLock,
  tentarAdquirirSyncLock
};
