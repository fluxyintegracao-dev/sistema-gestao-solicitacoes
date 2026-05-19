'use strict';

const DEFAULT_GRAPH = null;

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getSefazRuntimeConfig() {
  return {
    enabled: process.env.FISCAL_SEFAZ_ENABLED === 'true',
    ambiente: process.env.FISCAL_SEFAZ_AMBIENTE || 'homologacao',
    uf: process.env.FISCAL_SEFAZ_UF || null,
    maxDocsPerRun: Number(process.env.FISCAL_SEFAZ_MAX_DOCS_PER_RUN || 50),
    blockOnConsumoIndevido: process.env.FISCAL_SEFAZ_BLOCK_ON_CONSUMO_INDEVIDO !== 'false'
  };
}

function assertSefazRealEnabled() {
  const config = getSefazRuntimeConfig();
  if (!config.enabled) {
    throw createHttpError('Integracao SEFAZ desabilitada por FISCAL_SEFAZ_ENABLED=false.', 400);
  }
  throw createHttpError('Cliente SEFAZ real ainda nao implementado nesta fase.', 501);
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

async function consultarDistNsu({ company, documentType = 'nfe', ultNsu = '0' } = {}) {
  const companyContext = normalizeCompanyContext(company);
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
  consultarDistNsu,
  consultarPorChave,
  consultarPorNsu,
  enviarManifestacao,
  getSefazRuntimeConfig,
  normalizeCompanyContext
};
