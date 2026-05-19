'use strict';

const {
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDfeSyncState,
  FiscalDivergence,
  FiscalSyncLog,
  sequelize
} = require('../../../models');
const { isFiscalS3Configured, getFiscalS3Config } = require('./fiscalS3Service');

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

module.exports = {
  getDashboardFiscal
};
