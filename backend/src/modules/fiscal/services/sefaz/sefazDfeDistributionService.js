'use strict';

const DEFAULT_GRAPH = null;
const {
  buildConsChNFeRequest,
  buildConsNsuRequest,
  buildDistNsuRequest
} = require('./sefazDfeSoapBuilderService');
const {
  postSoapRequest
} = require('./sefazDfeHttpClientService');
const {
  parseDistribuicaoDfeResponse
} = require('./sefazDfeResponseParserService');
const {
  obterCertificadoAtivoComSegredos
} = require('../fiscalCertificateService');

const NFE_DFE_DISTRIBUTION_ENDPOINTS = {
  homologacao: 'https://hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
  producao: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
};

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeAmbienteName(value) {
  const normalized = String(value || 'homologacao').trim().toLowerCase();
  if (['producao', 'produção', 'prod'].includes(normalized)) return 'producao';
  return 'homologacao';
}

function getSuggestedDistributionUrl(ambiente) {
  return NFE_DFE_DISTRIBUTION_ENDPOINTS[normalizeAmbienteName(ambiente)];
}

function getSefazRuntimeConfig() {
  const ambiente = normalizeAmbienteName(process.env.FISCAL_SEFAZ_AMBIENTE || 'homologacao');
  const distributionUrl = process.env.FISCAL_SEFAZ_DFE_DISTRIBUTION_URL || null;
  return {
    enabled: process.env.FISCAL_SEFAZ_ENABLED === 'true',
    ambiente,
    uf: process.env.FISCAL_SEFAZ_UF || null,
    distributionUrl,
    distributionUrlSource: distributionUrl ? 'env' : 'missing',
    suggestedDistributionUrl: getSuggestedDistributionUrl(ambiente),
    requestTimeoutMs: Number(process.env.FISCAL_SEFAZ_REQUEST_TIMEOUT_MS || 30000),
    maxDocsPerRun: Number(process.env.FISCAL_SEFAZ_MAX_DOCS_PER_RUN || 50),
    emptyResultWaitMinutes: Number(process.env.FISCAL_SEFAZ_EMPTY_RESULT_WAIT_MINUTES || 60),
    consumoIndevidoWaitMinutes: Number(process.env.FISCAL_SEFAZ_CONSUMO_INDEVIDO_WAIT_MINUTES || 60),
    blockOnConsumoIndevido: process.env.FISCAL_SEFAZ_BLOCK_ON_CONSUMO_INDEVIDO !== 'false'
  };
}

function assertSefazRealEnabled() {
  const config = getSefazRuntimeConfig();
  if (!config.enabled) {
    throw createHttpError('Integracao SEFAZ desabilitada por FISCAL_SEFAZ_ENABLED=false.', 400);
  }
  if (!config.distributionUrl) {
    throw createHttpError('Endpoint NFeDistribuicaoDFe nao configurado. Informe FISCAL_SEFAZ_DFE_DISTRIBUTION_URL.', 400);
  }
  return config;
}

function normalizeCompanyContext(company) {
  if (!company?.cnpj) {
    throw createHttpError('Empresa fiscal sem CNPJ para consulta SEFAZ.', 400);
  }

  return {
    id: company.id,
    cnpj: String(company.cnpj).replace(/\D/g, ''),
    uf: company.uf || process.env.FISCAL_SEFAZ_UF || null,
    ambiente: company.ambiente_sefaz || process.env.FISCAL_SEFAZ_AMBIENTE || 'homologacao'
  };
}

function getDateOnlyEndOfDay(value) {
  if (!value) return null;
  const datePart = String(value instanceof Date ? value.toISOString() : value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  return new Date(`${datePart}T23:59:59.999Z`);
}

function assertCertificateReadyForSefaz(certificate) {
  if (!certificate) {
    throw createHttpError('Certificado fiscal ativo nao encontrado para chamada SEFAZ.', 400);
  }

  if (certificate.storage_type !== 'local_secure_path') {
    throw createHttpError('Nesta fase, chamadas SEFAZ reais aceitam apenas certificado em caminho local seguro.', 400);
  }

  if (certificate.validation_status !== 'pfx_valid') {
    throw createHttpError('Valide administrativamente o certificado A1 antes de executar chamada real SEFAZ.', 400);
  }

  const expiresAt = getDateOnlyEndOfDay(certificate.valid_until);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw createHttpError('Certificado fiscal informado esta vencido.', 400);
  }

  if (!certificate.certificate_path) {
    throw createHttpError('Caminho local do certificado fiscal nao esta configurado.', 400);
  }

  return certificate;
}

async function enviarConsultaDistribuicao({ company, documentType, soapRequest } = {}) {
  const companyContext = normalizeCompanyContext(company);
  const config = assertSefazRealEnabled();
  const certificate = assertCertificateReadyForSefaz(await obterCertificadoAtivoComSegredos(company.id));
  let response;
  try {
    response = await postSoapRequest({
      endpointUrl: config.distributionUrl,
      soapRequest,
      certificate,
      timeoutMs: config.requestTimeoutMs
    });
  } catch (error) {
    error.raw_request_xml = soapRequest.body;
    error.raw_response_xml = error.details?.body || null;
    error.http_status = error.details?.http_status || error.statusCode || null;
    error.elapsed_ms = error.details?.elapsed_ms || null;
    throw error;
  }
  const parsed = parseDistribuicaoDfeResponse(response.body);

  return {
    ...parsed,
    request_type: soapRequest.request_type,
    document_type: documentType,
    company: companyContext,
    http_status: response.http_status,
    elapsed_ms: response.elapsed_ms,
    raw_request_xml: soapRequest.body,
    raw_response_xml: response.body
  };
}

async function consultarDistNsu({ company, documentType = 'nfe', ultNsu = '0' } = {}) {
  const companyContext = normalizeCompanyContext(company);
  const soapRequest = buildDistNsuRequest({ company, ultNsu });
  if (process.env.FISCAL_SEFAZ_ENABLED === 'true') {
    return enviarConsultaDistribuicao({ company, documentType, soapRequest });
  }
  assertSefazRealEnabled();

  return {
    request_type: 'distNSU',
    document_type: documentType,
    company: companyContext,
    ult_nsu: ultNsu,
    max_nsu: ultNsu,
    documents: [],
    raw: DEFAULT_GRAPH
  };
}

async function consultarPorNsu({ company, documentType = 'nfe', nsu } = {}) {
  const companyContext = normalizeCompanyContext(company);
  if (!nsu) throw createHttpError('NSU e obrigatorio para consulta consNSU.', 400);
  const soapRequest = buildConsNsuRequest({ company, nsu });
  if (process.env.FISCAL_SEFAZ_ENABLED === 'true') {
    return enviarConsultaDistribuicao({ company, documentType, soapRequest });
  }
  assertSefazRealEnabled();

  return {
    request_type: 'consNSU',
    document_type: documentType,
    company: companyContext,
    nsu,
    documents: [],
    raw: DEFAULT_GRAPH
  };
}

async function consultarPorChave({ company, documentType = 'nfe', accessKey } = {}) {
  const companyContext = normalizeCompanyContext(company);
  if (!accessKey) throw createHttpError('Chave de acesso e obrigatoria para consulta consChNFe.', 400);
  const soapRequest = buildConsChNFeRequest({ company, accessKey });
  if (process.env.FISCAL_SEFAZ_ENABLED === 'true') {
    return enviarConsultaDistribuicao({ company, documentType, soapRequest });
  }
  assertSefazRealEnabled();

  return {
    request_type: 'consChNFe',
    document_type: documentType,
    company: companyContext,
    access_key: accessKey,
    documents: [],
    raw: DEFAULT_GRAPH
  };
}

async function enviarManifestacao({ company, accessKey, manifestationType, justification } = {}) {
  const companyContext = normalizeCompanyContext(company);
  if (!accessKey) throw createHttpError('Chave de acesso e obrigatoria para manifestacao fiscal.', 400);
  if (!manifestationType) throw createHttpError('Tipo de manifestacao fiscal e obrigatorio.', 400);
  assertSefazRealEnabled();

  return {
    request_type: 'manifestation',
    company: companyContext,
    access_key: accessKey,
    manifestation_type: manifestationType,
    justification: justification || null,
    protocol: null,
    raw: DEFAULT_GRAPH
  };
}

module.exports = {
  buildConsChNFeRequest,
  buildConsNsuRequest,
  buildDistNsuRequest,
  consultarDistNsu,
  consultarPorChave,
  consultarPorNsu,
  enviarConsultaDistribuicao,
  enviarManifestacao,
  assertCertificateReadyForSefaz,
  getSefazRuntimeConfig,
  getSuggestedDistributionUrl,
  normalizeCompanyContext
};
