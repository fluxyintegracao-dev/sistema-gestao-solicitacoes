'use strict';

const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDfeSyncState,
  FiscalDivergence,
  FiscalSyncLog
} = require('../../../models');
const { isFiscalS3Configured, getFiscalS3Config } = require('./fiscalS3Service');

async function getDashboardFiscal() {
  const [
    empresasAtivas,
    documentosTotal,
    documentosPendentes,
    divergenciasAbertas,
    syncStates,
    ultimoLog
  ] = await Promise.all([
    FiscalCompany.count({ where: { ativo: true } }),
    FiscalDfeDocument.count(),
    FiscalDfeDocument.count({ where: { document_status: ['discovered', 'summary_received', 'pending_link'] } }),
    FiscalDivergence.count({ where: { status: 'open' } }),
    FiscalDfeSyncState.findAll({
      attributes: ['id', 'fiscal_company_id', 'document_type', 'ambiente_sefaz', 'status', 'ult_nsu', 'max_nsu', 'last_success_at', 'last_attempt_at'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    }),
    FiscalSyncLog.findOne({ order: [['started_at', 'DESC'], ['id', 'DESC']] })
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
      divergencias_abertas: divergenciasAbertas
    },
    sincronizacao: {
      estados: syncStates,
      ultimo_log: ultimoLog
    }
  };
}

module.exports = {
  getDashboardFiscal
};
