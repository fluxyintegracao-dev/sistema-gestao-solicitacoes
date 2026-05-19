'use strict';

const {
  FiscalCertificate,
  FiscalCompany,
  FiscalDfeSyncState,
  FiscalSyncLog
} = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const { executarSyncDfeControlado } = require('./fiscalDfeSyncJobService');
const {
  getFiscalObjectSignedUrl,
  isFiscalS3Configured,
  saveRawSefazRequest,
  saveRawSefazResponse
} = require('./fiscalS3Service');
const { isFiscalCryptoConfigured } = require('./fiscalCryptoService');
const { processarXmlRetornoDistribuicaoDfe } = require('./fiscalDfeProcessorService');
const { getSefazRuntimeConfig } = require('./sefaz/sefazDfeDistributionService');
const { buildDistNsuRequest } = require('./sefaz/sefazDfeSoapBuilderService');
const fixtureDistribuicaoDfe = require('./sefaz/fixtures/nfeDistribuicaoNormalizada.fixture');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getDateOnlyEndOfDay(value) {
  if (!value) return null;
  const datePart = String(value instanceof Date ? value.toISOString() : value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  return new Date(`${datePart}T23:59:59.999Z`);
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

async function gerarUrlRawLogFiscal(req, id, type = 'response') {
  const normalizedType = type === 'request' ? 'request' : 'response';
  const log = await FiscalSyncLog.findByPk(id);
  if (!log) throw createHttpError('Log fiscal nao encontrado.', 404);

  const key = normalizedType === 'request'
    ? log.raw_request_storage_key
    : log.raw_response_storage_key;

  if (!key) {
    throw createHttpError(
      normalizedType === 'request'
        ? 'Este log fiscal nao possui request bruto armazenado.'
        : 'Este log fiscal nao possui response bruto armazenado.',
      404
    );
  }

  const url = await getFiscalObjectSignedUrl(key);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_SYNC_RAW_URL_GENERATED',
    recursoTipo: 'FISCAL_SYNC_LOG',
    recursoId: log.id,
    status: 'SUCCESS',
    descricao: 'URL assinada de payload bruto fiscal gerada',
    metadata: {
      type: normalizedType,
      key,
      fiscal_company_id: log.fiscal_company_id,
      document_type: log.document_type
    }
  });

  return {
    url,
    expires_in_seconds: Number(process.env.FISCAL_S3_PRESIGNED_EXPIRES_SECONDS || 300),
    type: normalizedType,
    key
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
  const hasSuccess = results.some((result) => result.status === 'success');
  const hasSkipped = results.some((result) => result.status === 'skipped');

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
    status: hasBlocked ? 'blocked' : hasSuccess ? 'success' : 'skipped',
    message: hasBlocked
      ? 'Tentativa registrada com bloqueio controlado. Revise os logs fiscais antes de nova execucao.'
      : hasSuccess
        ? 'Sincronizacao fiscal executada e registrada com sucesso.'
        : hasSkipped
          ? 'Tentativa registrada. SEFAZ esta desabilitada por configuracao neste ambiente.'
          : 'Tentativa registrada sem empresas processadas.',
    logs: results.map((result) => result.log)
  };
}

function buildCheck(code, status, message) {
  return { code, status, message };
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function assertFixturePermitida() {
  const fiscalEnv = String(process.env.FISCAL_ENV || 'dev').toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
  if (nodeEnv === 'production' || fiscalEnv === 'prod' || fiscalEnv === 'production') {
    throw createHttpError('Fixture fiscal local bloqueada em ambiente de producao.', 403);
  }
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
    ),
    buildCheck(
      'FISCAL_SEFAZ_DFE_DISTRIBUTION_URL',
      sefazConfig.distributionUrl
        ? (isHttpsUrl(sefazConfig.distributionUrl) ? 'OK' : 'ERROR')
        : (sefazConfig.enabled ? 'ERROR' : 'WARN'),
      sefazConfig.distributionUrl
        ? (isHttpsUrl(sefazConfig.distributionUrl)
          ? 'Endpoint NFeDistribuicaoDFe configurado com HTTPS.'
          : 'Endpoint NFeDistribuicaoDFe deve usar HTTPS.')
        : 'Endpoint NFeDistribuicaoDFe ainda nao configurado.'
    ),
    buildCheck(
      'FISCAL_SEFAZ_REQUEST_TIMEOUT_MS',
      Number.isFinite(sefazConfig.requestTimeoutMs) && sefazConfig.requestTimeoutMs >= 5000 ? 'OK' : 'WARN',
      `Timeout atual de chamada SEFAZ: ${sefazConfig.requestTimeoutMs || 30000}ms.`
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
      const expiresAt = getDateOnlyEndOfDay(certificate.valid_until);
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
        ['metadata_validated', 'local_path_accessible', 'pfx_valid'].includes(certificate.validation_status) ? 'OK' : 'WARN',
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

    try {
      const previewRequest = buildDistNsuRequest({
        company,
        ultNsu: syncState?.ult_nsu || '0'
      });
      checks.push(buildCheck(
        'SOAP_DIST_NSU',
        'OK',
        `SOAP distNSU preparado localmente para ambiente ${previewRequest.tp_amb} e UF ${previewRequest.cuf_autor}.`
      ));
    } catch (error) {
      checks.push(buildCheck(
        'SOAP_DIST_NSU',
        'ERROR',
        error.message || 'Nao foi possivel montar o SOAP distNSU para esta empresa.'
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

async function executarFixtureDistribuicaoFiscal(req, payload = {}) {
  assertFixturePermitida();

  const documentType = payload.document_type || 'nfe';
  const companyWhere = {
    ativo: true,
    modulo_fiscal_habilitado: true
  };
  if (payload.company_id) companyWhere.id = payload.company_id;

  const company = await FiscalCompany.findOne({
    where: companyWhere,
    order: [['razao_social', 'ASC']]
  });

  if (!company) {
    throw createHttpError(
      payload.company_id
        ? 'Empresa fiscal ativa e habilitada nao encontrada para fixture.'
        : 'Nenhuma empresa fiscal ativa e habilitada para executar fixture.',
      payload.company_id ? 404 : 400
    );
  }

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

  const startedAt = new Date();
  const log = await FiscalSyncLog.create({
    fiscal_company_id: company.id,
    document_type: documentType,
    ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
    started_at: startedAt,
    status: 'blocked',
    request_type: 'fixture_distNSU',
    request_nsu_start: syncState.ult_nsu || '0',
    response_ult_nsu: syncState.ult_nsu || '0',
    response_max_nsu: syncState.max_nsu || '0',
    documents_found: 0,
    documents_processed: 0
  });

  try {
    const soapRequest = buildDistNsuRequest({
      company,
      ultNsu: syncState.ult_nsu || '0'
    });

    const [rawRequest, rawResponse] = await Promise.all([
      saveRawSefazRequest({
        cnpj: company.cnpj,
        syncLogId: log.id,
        requestType: 'fixture_distNSU',
        payload: soapRequest.body,
        metadata: {
          fiscal_company_id: company.id,
          document_type: documentType,
          fixture: 'true'
        }
      }),
      saveRawSefazResponse({
        cnpj: company.cnpj,
        syncLogId: log.id,
        requestType: 'fixture_distNSU',
        payload: fixtureDistribuicaoDfe.rawSefazResponseXml,
        metadata: {
          fiscal_company_id: company.id,
          document_type: documentType,
          fixture: 'true',
          response_code: '138'
        }
      })
    ]);

    const processed = await processarXmlRetornoDistribuicaoDfe({
      company,
      syncStateId: syncState.id,
      syncLogId: log.id,
      documentType,
      responseXml: fixtureDistribuicaoDfe.rawSefazResponseXml,
      rawRequestStorageKey: rawRequest.key,
      rawResponseStorageKey: rawResponse.key
    });

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FISCAL_SYNC_FIXTURE_RUN',
      recursoTipo: 'FISCAL_SYNC',
      recursoId: log.id,
      status: 'SUCCESS',
      descricao: 'Fixture local de distribuicao DFe processada em ambiente nao produtivo',
      metadata: {
        fiscal_company_id: company.id,
        document_type: documentType,
        documents_processed: processed.documents_processed
      }
    });

    return {
      status: 'success',
      message: `Fixture fiscal processada: ${processed.documents_processed} documento(s).`,
      log_id: log.id,
      company_id: company.id,
      processed
    };
  } catch (error) {
    const message = error.message || 'Falha ao processar fixture fiscal.';
    await log.update({
      finished_at: new Date(),
      status: 'error',
      response_code: 'FISCAL_FIXTURE_ERROR',
      response_message: message.slice(0, 255),
      error_message: message
    });
    throw error;
  }
}

module.exports = {
  executarFixtureDistribuicaoFiscal,
  executarSincronizacaoManual,
  executarPreflightSincronizacaoFiscal,
  gerarUrlRawLogFiscal,
  listarEstadosSincronizacao,
  listarLogsSincronizacao
};
