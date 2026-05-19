'use strict';

const {
  FiscalCertificate,
  FiscalCompany,
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { executarSyncDfeControlado } = require('./fiscalDfeSyncJobService');
const { isFiscalS3Configured } = require('./fiscalS3Service');
const { isFiscalCryptoConfigured } = require('./fiscalCryptoService');
const { getSefazRuntimeConfig } = require('./sefaz/sefazDfeDistributionService');

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

function buildCheck(code, status, message) {
  return { code, status, message };
}

async function executarPreflightSincronizacaoFiscal(req, payload = {}) {
  const documentType = payload.document_type || 'nfe';
  const sefazConfig = getSefazRuntimeConfig();
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
    throw createHttpError('Nenhuma empresa fiscal ativa e habilitada para validar.', 400);
  }

  const globalChecks = [
    buildCheck(
      'FISCAL_MODULE_ENABLED',
      process.env.FISCAL_MODULE_ENABLED === 'true' ? 'OK' : 'WARN',
      process.env.FISCAL_MODULE_ENABLED === 'true'
        ? 'Modulo fiscal habilitado no ambiente.'
        : 'Modulo fiscal ainda nao esta habilitado por FISCAL_MODULE_ENABLED=true.'
    ),
    buildCheck(
      'FISCAL_SEFAZ_ENABLED',
      sefazConfig.enabled ? 'OK' : 'WARN',
      sefazConfig.enabled
        ? 'SEFAZ habilitada para execucao real.'
        : 'SEFAZ ainda esta desabilitada. O preflight nao consulta a SEFAZ.'
    ),
    buildCheck(
      'FISCAL_S3',
      isFiscalS3Configured() ? 'OK' : 'ERROR',
      isFiscalS3Configured()
        ? 'Storage S3 fiscal configurado.'
        : 'Configure FISCAL_S3_BUCKET e FISCAL_S3_REGION antes da sincronizacao real.'
    ),
    buildCheck(
      'FISCAL_CRYPTO_KEY',
      isFiscalCryptoConfigured() ? 'OK' : 'ERROR',
      isFiscalCryptoConfigured()
        ? 'Criptografia fiscal configurada.'
        : 'Configure FISCAL_CRYPTO_KEY antes de validar certificado e segredos.'
    )
  ];

  const companiesResult = [];

  for (const company of companies) {
    const [certificate, syncState] = await Promise.all([
      FiscalCertificate.findOne({
        where: {
          fiscal_company_id: company.id,
          is_active: true
        },
        order: [['updatedAt', 'DESC']]
      }),
      FiscalDfeSyncState.findOne({
        where: {
          fiscal_company_id: company.id,
          document_type: documentType,
          ambiente_sefaz: company.ambiente_sefaz || 'homologacao'
        }
      })
    ]);

    const checks = [
      buildCheck('COMPANY_ACTIVE', 'OK', 'Empresa fiscal ativa e habilitada para monitoramento.'),
      buildCheck(
        'COMPANY_CNPJ',
        company.cnpj ? 'OK' : 'ERROR',
        company.cnpj ? 'CNPJ informado.' : 'CNPJ da empresa fiscal nao informado.'
      ),
      buildCheck(
        'COMPANY_UF',
        company.uf ? 'OK' : 'ERROR',
        company.uf ? `UF configurada: ${company.uf}.` : 'UF da empresa fiscal nao informada.'
      ),
      buildCheck(
        'CERTIFICATE_ACTIVE',
        certificate ? 'OK' : 'ERROR',
        certificate ? 'Certificado ativo encontrado.' : 'Nenhum certificado ativo cadastrado para a empresa.'
      )
    ];

    if (certificate) {
      const expiresAt = certificate.valid_until ? new Date(certificate.valid_until) : null;
      const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
      checks.push(buildCheck(
        'CERTIFICATE_EXPIRATION',
        expired ? 'ERROR' : (expiresAt ? 'OK' : 'WARN'),
        expired
          ? 'Certificado informado esta vencido.'
          : expiresAt
            ? `Certificado informado valido ate ${expiresAt.toISOString().slice(0, 10)}.`
            : 'Validade do certificado nao informada nos metadados.'
      ));
      checks.push(buildCheck(
        'CERTIFICATE_VALIDATION_STATUS',
        ['metadata_validated', 'local_path_accessible'].includes(certificate.validation_status) ? 'OK' : 'WARN',
        certificate.validation_status
          ? `Status atual do certificado: ${certificate.validation_status}.`
          : 'Certificado ainda nao validado administrativamente.'
      ));
    }

    if (syncState) {
      const locked = syncState.locked_until && new Date(syncState.locked_until).getTime() > Date.now();
      const throttled = syncState.next_allowed_sync_at && new Date(syncState.next_allowed_sync_at).getTime() > Date.now();
      checks.push(buildCheck(
        'SYNC_STATE',
        'OK',
        `Estado de NSU encontrado. Ultimo NSU: ${syncState.ult_nsu || '0'}.`
      ));
      checks.push(buildCheck(
        'SYNC_LOCK',
        locked ? 'ERROR' : 'OK',
        locked ? 'Existe lock de sincronizacao ativo para esta empresa.' : 'Nenhum lock ativo encontrado.'
      ));
      checks.push(buildCheck(
        'SYNC_WINDOW',
        throttled ? 'WARN' : 'OK',
        throttled ? 'Empresa ainda aguarda a proxima janela permitida de sincronizacao.' : 'Janela de sincronizacao liberada.'
      ));
    } else {
      checks.push(buildCheck(
        'SYNC_STATE',
        'WARN',
        'Estado de NSU ainda nao foi inicializado. A primeira tentativa controlada criara o registro.'
      ));
    }

    const companyReady = [...globalChecks, ...checks].every((check) => check.status !== 'ERROR');
    companiesResult.push({
      company: {
        id: company.id,
        razao_social: company.razao_social,
        cnpj: company.cnpj,
        uf: company.uf,
        ambiente_sefaz: company.ambiente_sefaz
      },
      ready: companyReady,
      checks,
      sync_state: syncState ? {
        id: syncState.id,
        status: syncState.status,
        ult_nsu: syncState.ult_nsu,
        max_nsu: syncState.max_nsu,
        next_allowed_sync_at: syncState.next_allowed_sync_at,
        locked_until: syncState.locked_until
      } : null
    });
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_SYNC_PREFLIGHT',
    recursoTipo: 'FISCAL_SYNC',
    recursoId: payload.company_id || null,
    status: companiesResult.every((item) => item.ready) ? 'SUCCESS' : 'INFO',
    descricao: 'Preflight administrativo de sincronizacao fiscal executado',
    metadata: {
      document_type: documentType,
      companies: companiesResult.map((item) => item.company.id),
      ready_companies: companiesResult.filter((item) => item.ready).map((item) => item.company.id)
    }
  });

  return {
    ready: globalChecks.every((check) => check.status !== 'ERROR') && companiesResult.every((item) => item.ready),
    document_type: documentType,
    sefaz_enabled: sefazConfig.enabled,
    global_checks: globalChecks,
    companies: companiesResult
  };
}

module.exports = {
  executarSincronizacaoManual,
  executarPreflightSincronizacaoFiscal,
  listarEstadosSincronizacao,
  listarLogsSincronizacao
};
