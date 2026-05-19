'use strict';

const UF_IBGE = {
  RO: '11',
  AC: '12',
  AM: '13',
  RR: '14',
  PA: '15',
  AP: '16',
  TO: '17',
  MA: '21',
  PI: '22',
  CE: '23',
  RN: '24',
  PB: '25',
  PE: '26',
  AL: '27',
  SE: '28',
  BA: '29',
  MG: '31',
  ES: '32',
  RJ: '33',
  SP: '35',
  PR: '41',
  SC: '42',
  RS: '43',
  MS: '50',
  MT: '51',
  GO: '52',
  DF: '53'
};

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const NFE_DISTRIBUICAO_WSDL_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe';
const SOAP_CONTENT_TYPE = 'application/soap+xml; charset=utf-8';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeAmbienteSefaz(value) {
  const ambiente = String(value || 'homologacao').trim().toLowerCase();
  if (ambiente === 'producao' || ambiente === 'produção') return '1';
  if (ambiente === 'homologacao' || ambiente === 'homologação') return '2';
  throw createHttpError('Ambiente SEFAZ invalido para montar a requisicao fiscal.', 400);
}

function normalizeUfCode(value) {
  const uf = String(value || '').trim().toUpperCase();
  const code = UF_IBGE[uf];
  if (!code) {
    throw createHttpError('UF SEFAZ invalida para montar a requisicao fiscal.', 400);
  }
  return code;
}

function normalizeCnpj(value) {
  const cnpj = onlyDigits(value);
  if (!/^\d{14}$/.test(cnpj)) {
    throw createHttpError('CNPJ invalido para montar a requisicao fiscal.', 400);
  }
  return cnpj;
}

function normalizeCompanyForRequest(company = {}) {
  return {
    cnpj: normalizeCnpj(company.cnpj),
    cUFAutor: normalizeUfCode(company.uf || process.env.FISCAL_SEFAZ_UF),
    tpAmb: normalizeAmbienteSefaz(company.ambiente_sefaz || process.env.FISCAL_SEFAZ_AMBIENTE)
  };
}

function formatNsu(value, label = 'NSU') {
  const digits = onlyDigits(value ?? '0');
  if (!digits || digits.length > 15) {
    throw createHttpError(`${label} invalido para montar a requisicao fiscal.`, 400);
  }
  return digits.padStart(15, '0');
}

function normalizeAccessKey(value) {
  const accessKey = onlyDigits(value);
  if (!/^\d{44}$/.test(accessKey)) {
    throw createHttpError('Chave de acesso invalida para montar a requisicao fiscal.', 400);
  }
  return accessKey;
}

function buildDistDfeIntXml({ company, queryXml }) {
  const context = normalizeCompanyForRequest(company);
  const distDfeXml = [
    `<distDFeInt xmlns="${NFE_NAMESPACE}" versao="1.01">`,
    `<tpAmb>${context.tpAmb}</tpAmb>`,
    `<cUFAutor>${context.cUFAutor}</cUFAutor>`,
    `<CNPJ>${context.cnpj}</CNPJ>`,
    queryXml,
    '</distDFeInt>'
  ].join('');

  return { context, distDfeXml };
}

function buildSoapEnvelope(distDfeXml) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">',
    '<soap12:Body>',
    `<nfeDistDFeInteresse xmlns="${NFE_DISTRIBUICAO_WSDL_NAMESPACE}">`,
    '<nfeDadosMsg>',
    distDfeXml,
    '</nfeDadosMsg>',
    '</nfeDistDFeInteresse>',
    '</soap12:Body>',
    '</soap12:Envelope>'
  ].join('');
}

function buildSefazRequest({ company, requestType, queryXml }) {
  const { context, distDfeXml } = buildDistDfeIntXml({ company, queryXml });

  return {
    request_type: requestType,
    content_type: SOAP_CONTENT_TYPE,
    soap_action: null,
    body: buildSoapEnvelope(distDfeXml),
    dist_dfe_xml: distDfeXml,
    tp_amb: context.tpAmb,
    cuf_autor: context.cUFAutor,
    cnpj: context.cnpj
  };
}

function buildDistNsuRequest({ company, ultNsu = '0' } = {}) {
  return buildSefazRequest({
    company,
    requestType: 'distNSU',
    queryXml: `<distNSU><ultNSU>${formatNsu(ultNsu, 'Ultimo NSU')}</ultNSU></distNSU>`
  });
}

function buildConsNsuRequest({ company, nsu } = {}) {
  return buildSefazRequest({
    company,
    requestType: 'consNSU',
    queryXml: `<consNSU><NSU>${formatNsu(nsu)}</NSU></consNSU>`
  });
}

function buildConsChNFeRequest({ company, accessKey } = {}) {
  return buildSefazRequest({
    company,
    requestType: 'consChNFe',
    queryXml: `<consChNFe><chNFe>${normalizeAccessKey(accessKey)}</chNFe></consChNFe>`
  });
}

module.exports = {
  buildConsChNFeRequest,
  buildConsNsuRequest,
  buildDistNsuRequest,
  buildSoapEnvelope,
  formatNsu,
  normalizeAccessKey,
  normalizeCompanyForRequest
};
