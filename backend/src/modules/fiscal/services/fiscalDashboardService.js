'use strict';

const {
  FiscalCertificate,
  FiscalCompany,
  FiscalDfeDocument,
  FiscalDfeSyncState,
  FiscalDivergence,
  FiscalDocumentLink,
  FiscalSyncLog,
  sequelize
} = require('../../../models');
const { Op } = require('sequelize');
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

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sem_data';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function incrementBucket(map, key, amount = 1) {
  const normalizedKey = key || 'sem_informacao';
  map.set(normalizedKey, toNumber(map.get(normalizedKey)) + toNumber(amount));
}

function buildFiscalReportWhere(query = {}) {
  const where = {};
  if (query.company_id) where.fiscal_company_id = query.company_id;
  if (query.status) where.document_status = query.status;
  if (query.source) where.source = query.source;

  if (query.data_inicio || query.data_fim) {
    where.emission_date = {};
    if (query.data_inicio) where.emission_date[Op.gte] = `${query.data_inicio} 00:00:00`;
    if (query.data_fim) where.emission_date[Op.lte] = `${query.data_fim} 23:59:59`;
  }

  return where;
}

function mapBuckets(map, labelKey = 'label') {
  return Array.from(map.entries())
    .map(([label, total]) => ({ [labelKey]: label, total: toNumber(total) }))
    .sort((a, b) => b.total - a.total);
}

async function getRelatorioFiscalOperacional(query = {}) {
  const where = buildFiscalReportWhere(query);

  const [documents, companies] = await Promise.all([
    FiscalDfeDocument.findAll({
      where,
      include: [
        { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
      ],
      attributes: [
        'id',
        'fiscal_company_id',
        'document_type',
        'access_key',
        'issuer_cnpj',
        'issuer_name',
        'recipient_name',
        'document_number',
        'emission_date',
        'received_at',
        'total_value',
        'document_status',
        'manifestation_status',
        'source',
        'xml_storage_key',
        'pdf_storage_key',
        'danfe_storage_key',
        'createdAt'
      ],
      order: [['emission_date', 'DESC'], ['id', 'DESC']]
    }),
    FiscalCompany.findAll({
      attributes: ['id', 'razao_social', 'cnpj', 'uf', 'ativo'],
      order: [['razao_social', 'ASC']]
    })
  ]);

  const documentIds = documents.map((item) => item.id);
  const [
    confirmedLinks,
    openDivergences
  ] = documentIds.length ? await Promise.all([
    FiscalDocumentLink.findAll({
      where: {
        fiscal_dfe_document_id: { [Op.in]: documentIds },
        link_status: { [Op.in]: ['confirmed', 'manually_linked'] }
      },
      attributes: ['id', 'fiscal_dfe_document_id', 'link_status'],
      raw: true
    }),
    FiscalDivergence.findAll({
      where: {
        fiscal_dfe_document_id: { [Op.in]: documentIds },
        status: 'open'
      },
      attributes: ['id', 'fiscal_dfe_document_id', 'divergence_type', 'severity', 'status'],
      raw: true
    })
  ]) : [[], []];

  const linkedDocumentIds = new Set(confirmedLinks.map((item) => Number(item.fiscal_dfe_document_id)));
  const openDivergenceDocumentIds = new Set(openDivergences.map((item) => Number(item.fiscal_dfe_document_id)));
  const divergencesByDocument = openDivergences.reduce((acc, item) => {
    const key = Number(item.fiscal_dfe_document_id);
    acc.set(key, toNumber(acc.get(key)) + 1);
    return acc;
  }, new Map());

  const byStatus = new Map();
  const byCompany = new Map();
  const byIssuer = new Map();
  const byMonth = new Map();
  const byType = new Map();
  const bySource = new Map();
  const divergenceByType = new Map();
  const divergenceBySeverity = new Map();

  let totalValue = 0;
  let validated = 0;
  let ignored = 0;
  let pending = 0;
  let withoutXml = 0;
  let withoutDanfe = 0;
  let withoutConfirmedLink = 0;
  let withOpenDivergence = 0;

  documents.forEach((document) => {
    const plain = document.get({ plain: true });
    const value = toNumber(plain.total_value);
    totalValue += value;

    if (plain.document_status === 'validated') validated += 1;
    if (plain.document_status === 'ignored') ignored += 1;
    if (!['validated', 'ignored', 'cancelled'].includes(plain.document_status)) pending += 1;
    if (!plain.xml_storage_key) withoutXml += 1;
    if (!plain.pdf_storage_key && !plain.danfe_storage_key) withoutDanfe += 1;
    if (!linkedDocumentIds.has(plain.id)) withoutConfirmedLink += 1;
    if (openDivergenceDocumentIds.has(plain.id)) withOpenDivergence += 1;

    incrementBucket(byStatus, plain.document_status);
    incrementBucket(byCompany, plain.company?.razao_social || plain.recipient_name || `Empresa fiscal #${plain.fiscal_company_id}`);
    incrementBucket(byIssuer, plain.issuer_name || plain.issuer_cnpj || 'Fornecedor sem identificacao');
    incrementBucket(byMonth, formatMonthKey(plain.emission_date || plain.createdAt));
    incrementBucket(byType, plain.document_type);
    incrementBucket(bySource, plain.source);
  });

  openDivergences.forEach((item) => {
    incrementBucket(divergenceByType, item.divergence_type);
    incrementBucket(divergenceBySeverity, item.severity);
  });

  const documentsWithRisk = documents
    .map((document) => {
      const plain = document.get({ plain: true });
      const missingXml = !plain.xml_storage_key;
      const missingDanfe = !plain.pdf_storage_key && !plain.danfe_storage_key;
      const missingLink = !linkedDocumentIds.has(plain.id);
      const divergenceCount = toNumber(divergencesByDocument.get(plain.id));
      return {
        id: plain.id,
        document_number: plain.document_number,
        issuer_name: plain.issuer_name,
        issuer_cnpj: plain.issuer_cnpj,
        emission_date: toDateOnly(plain.emission_date),
        total_value: toNumber(plain.total_value),
        document_status: plain.document_status,
        company_name: plain.company?.razao_social || null,
        without_confirmed_link: missingLink,
        open_divergences: divergenceCount,
        missing_xml: missingXml,
        missing_danfe: missingDanfe
      };
    })
    .filter((item) => item.without_confirmed_link || item.open_divergences > 0 || item.missing_xml || item.missing_danfe)
    .slice(0, 40);

  return {
    filtros: {
      company_id: query.company_id || null,
      data_inicio: query.data_inicio || null,
      data_fim: query.data_fim || null,
      status: query.status || null,
      source: query.source || null
    },
    empresas: companies,
    resumo: {
      documentos_total: documents.length,
      valor_total: totalValue,
      documentos_validados: validated,
      documentos_pendentes: pending,
      documentos_ignorados: ignored,
      documentos_sem_vinculo_confirmado: withoutConfirmedLink,
      documentos_com_divergencia_aberta: withOpenDivergence,
      documentos_sem_xml: withoutXml,
      documentos_sem_danfe: withoutDanfe,
      divergencias_abertas: openDivergences.length
    },
    agrupamentos: {
      por_status: mapBuckets(byStatus, 'status'),
      por_empresa: mapBuckets(byCompany, 'empresa'),
      por_fornecedor: mapBuckets(byIssuer, 'fornecedor').slice(0, 20),
      por_mes: Array.from(byMonth.entries())
        .map(([mes, total]) => ({ mes, total: toNumber(total) }))
        .sort((a, b) => a.mes.localeCompare(b.mes)),
      por_tipo_documento: mapBuckets(byType, 'tipo'),
      por_origem: mapBuckets(bySource, 'origem'),
      divergencias_por_tipo: mapBuckets(divergenceByType, 'tipo'),
      divergencias_por_severidade: mapBuckets(divergenceBySeverity, 'severidade')
    },
    documentos_criticos: documentsWithRisk
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
  getDashboardFiscal,
  getRelatorioFiscalOperacional
};
