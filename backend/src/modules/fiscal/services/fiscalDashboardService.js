'use strict';

const {
  FiscalCertificate,
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDfeSyncState,
  FiscalDivergence,
  FiscalSyncLog,
  sequelize
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const {
  getFiscalS3Config,
  isFiscalS3Configured,
  uploadFiscalObject
} = require('./fiscalS3Service');
const { isFiscalCryptoConfigured } = require('./fiscalCryptoService');
const { getSefazRuntimeConfig } = require('./sefaz/sefazDfeDistributionService');

function maskConfiguredValue(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length <= 8) return 'configurado';
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

async function getDashboardFiscal() {
  const [
    empresasAtivas,
    documentosTotal,
    documentosPendentes,
    documentosValidados,
    documentosIgnorados,
    documentosComDivergencia,
    divergenciasAbertas,
    statusRows,
    sourceRows,
    recentes,
    syncStates,
    ultimoLog,
    logsRecentes
  ] = await Promise.all([
    FiscalCompany.count({ where: { ativo: true } }),
    FiscalDfeDocument.count(),
    FiscalDfeDocument.count({ where: { document_status: ['discovered', 'summary_received', 'pending_link'] } }),
    FiscalDfeDocument.count({ where: { document_status: 'validated' } }),
    FiscalDfeDocument.count({ where: { document_status: 'ignored' } }),
    FiscalDfeDocument.count({ where: { document_status: 'with_divergence' } }),
    FiscalDivergence.count({ where: { status: 'open' } }),
    FiscalDfeDocument.findAll({
      attributes: [
        'document_status',
        [sequelize.fn('COUNT', sequelize.col('FiscalDfeDocument.id')), 'total']
      ],
      group: ['document_status'],
      raw: true
    }),
    FiscalDfeDocument.findAll({
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('FiscalDfeDocument.id')), 'total']
      ],
      group: ['source'],
      raw: true
    }),
    FiscalDfeDocument.findAll({
      include: [
        { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
      ],
      attributes: ['id', 'document_type', 'access_key', 'issuer_name', 'issuer_cnpj', 'document_number', 'emission_date', 'total_value', 'document_status', 'source'],
      order: [['createdAt', 'DESC']],
      limit: 8
    }),
    FiscalDfeSyncState.findAll({
      attributes: ['id', 'fiscal_company_id', 'document_type', 'ambiente_sefaz', 'status', 'ult_nsu', 'max_nsu', 'last_success_at', 'last_attempt_at'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    }),
    FiscalSyncLog.findOne({ order: [['started_at', 'DESC'], ['id', 'DESC']] }),
    FiscalSyncLog.findAll({
      attributes: ['id', 'fiscal_company_id', 'document_type', 'ambiente_sefaz', 'started_at', 'finished_at', 'status', 'request_type', 'documents_found', 'documents_processed', 'response_message', 'error_message'],
      order: [['started_at', 'DESC'], ['id', 'DESC']],
      limit: 8
    })
  ]);

  const storageConfig = getFiscalS3Config();

  return {
    modulo: {
      enabled: process.env.FISCAL_MODULE_ENABLED === 'true',
      sefaz_enabled: process.env.FISCAL_SEFAZ_ENABLED === 'true',
      storage_configured: isFiscalS3Configured(),
      storage_bucket_configured: Boolean(storageConfig.bucket),
      storage_prefix: storageConfig.prefix
    },
    resumo: {
      empresas_ativas: empresasAtivas,
      documentos_total: documentosTotal,
      documentos_pendentes: documentosPendentes,
      documentos_validados: documentosValidados,
      documentos_ignorados: documentosIgnorados,
      documentos_com_divergencia: documentosComDivergencia,
      divergencias_abertas: divergenciasAbertas
    },
    documentos: {
      por_status: statusRows.map((row) => ({
        status: row.document_status || 'sem_status',
        total: Number(row.total || 0)
      })),
      por_origem: sourceRows.map((row) => ({
        source: row.source || 'sem_origem',
        total: Number(row.total || 0)
      })),
      recentes
    },
    sincronizacao: {
      estados: syncStates,
      ultimo_log: ultimoLog,
      logs_recentes: logsRecentes
    }
  };
}

async function getDiagnosticoFiscal() {
  const storageConfig = getFiscalS3Config();
  const sefazConfig = getSefazRuntimeConfig();
  const [
    empresasTotal,
    empresasMonitoradas,
    certificadosTotal,
    certificadosAtivos,
    syncStatesTotal,
    syncStatesLocked,
    ultimoLog
  ] = await Promise.all([
    FiscalCompany.count(),
    FiscalCompany.count({ where: { ativo: true, modulo_fiscal_habilitado: true } }),
    FiscalCertificate.count(),
    FiscalCertificate.count({ where: { is_active: true } }),
    FiscalDfeSyncState.count(),
    FiscalDfeSyncState.count({ where: { status: 'syncing' } }),
    FiscalSyncLog.findOne({
      attributes: ['id', 'started_at', 'finished_at', 'status', 'request_type', 'response_code', 'response_message', 'error_message'],
      order: [['started_at', 'DESC'], ['id', 'DESC']]
    })
  ]);

  return {
    modulo: {
      enabled: process.env.FISCAL_MODULE_ENABLED === 'true',
      env: process.env.FISCAL_ENV || 'dev',
      node_env: process.env.NODE_ENV || 'development'
    },
    storage: {
      configured: isFiscalS3Configured(),
      bucket_configured: Boolean(storageConfig.bucket),
      bucket_masked: maskConfiguredValue(storageConfig.bucket),
      region_configured: Boolean(storageConfig.region),
      region: storageConfig.region || null,
      prefix: storageConfig.prefix,
      presigned_expires_seconds: storageConfig.presignedExpiresSeconds
    },
    crypto: {
      configured: isFiscalCryptoConfigured(),
      min_length_ok_for_production: process.env.NODE_ENV !== 'production'
        ? true
        : String(process.env.FISCAL_CRYPTO_KEY || '').trim().length >= 32
    },
    sefaz: {
      enabled: sefazConfig.enabled,
      ambiente: sefazConfig.ambiente,
      uf: sefazConfig.uf,
      distribution_url_configured: Boolean(sefazConfig.distributionUrl),
      distribution_url_masked: maskConfiguredValue(sefazConfig.distributionUrl),
      distribution_url_https: sefazConfig.distributionUrl ? isHttpsUrl(sefazConfig.distributionUrl) : false,
      distribution_url_source: sefazConfig.distributionUrlSource,
      suggested_distribution_url: sefazConfig.suggestedDistributionUrl,
      request_timeout_ms: sefazConfig.requestTimeoutMs,
      max_docs_per_run: sefazConfig.maxDocsPerRun,
      empty_result_wait_minutes: sefazConfig.emptyResultWaitMinutes,
      consumo_indevido_wait_minutes: sefazConfig.consumoIndevidoWaitMinutes,
      block_on_consumo_indevido: sefazConfig.blockOnConsumoIndevido,
      lock_ttl_seconds: Number(process.env.FISCAL_SEFAZ_LOCK_TTL_SECONDS || 900)
    },
    dados: {
      empresas_total: empresasTotal,
      empresas_monitoradas: empresasMonitoradas,
      certificados_total: certificadosTotal,
      certificados_ativos: certificadosAtivos,
      sync_states_total: syncStatesTotal,
      sync_states_locked: syncStatesLocked
    },
    ultimo_log: ultimoLog
  };
}

async function executarProbeStorageFiscal({ req = null } = {}) {
  const storageConfig = getFiscalS3Config();
  const userId = req?.user?.id || null;
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const key = [
    storageConfig.prefix,
    'diagnostics',
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    `storage-probe-${stamp}.txt`
  ].filter(Boolean).join('/');

  const result = await uploadFiscalObject({
    key,
    body: [
      'FLUXY fiscal storage probe',
      `created_at=${now.toISOString()}`,
      `fiscal_env=${process.env.FISCAL_ENV || 'dev'}`,
      `user_id=${userId || 'unknown'}`
    ].join('\n'),
    contentType: 'text/plain',
    metadata: {
      module: 'fiscal',
      purpose: 'diagnostic',
      fiscal_env: process.env.FISCAL_ENV || 'dev'
    }
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: userId,
    tipoEvento: 'FISCAL_STORAGE_PROBE',
    recursoTipo: 'FISCAL_STORAGE',
    status: 'SUCCESS',
    descricao: 'Probe manual de storage fiscal executado',
    metadata: {
      key: result.key,
      content_type: result.contentType,
      hash: result.hash,
      fiscal_env: process.env.FISCAL_ENV || 'dev'
    }
  });

  return {
    ok: true,
    key: result.key,
    hash: result.hash,
    content_type: result.contentType,
    bucket_masked: maskConfiguredValue(result.bucket),
    created_at: now
  };
}

module.exports = {
  executarProbeStorageFiscal,
  getDiagnosticoFiscal,
  getDashboardFiscal
};
