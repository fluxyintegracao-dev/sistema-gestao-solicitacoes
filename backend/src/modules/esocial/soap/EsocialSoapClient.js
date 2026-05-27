'use strict';

const { EsocialSoapLog } = require('../../../models');
const { getEnvironmentConfig, assertRestritaTransmissionAllowed } = require('../environments/EsocialEnvironmentService');
const { sha256 } = require('../utils/xmlUtils');

async function logSoap({ lote, operacao, status, erro = null, duracao_ms = null, request = null, response = null, endpoint = null, user = null }) {
  try {
    return await EsocialSoapLog.create({
      lote_id: lote?.id || null,
      empresa_id: lote?.empresa_id || null,
      ambiente: lote?.ambiente || getEnvironmentConfig().ambiente,
      endpoint_hash: endpoint ? sha256(endpoint) : null,
      operacao,
      status,
      erro,
      duracao_ms,
      request_hash: request ? sha256(request) : null,
      response_hash: response ? sha256(response) : null,
      metadados_json: JSON.stringify({ endpoint_configurado: Boolean(endpoint) }),
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  } catch (error) {
    console.warn('[esocial-soap-log] falha ao persistir log:', error.message);
    return null;
  }
}

async function enviarLoteRestrita(lote, user = null) {
  const startedAt = Date.now();
  const config = getEnvironmentConfig();
  assertRestritaTransmissionAllowed(config);

  if (!config.envioUrl) {
    await logSoap({
      lote,
      operacao: 'ENVIAR_LOTE_RESTRITA',
      status: 'BLOQUEADO_ENDPOINT_AUSENTE',
      erro: 'URL de envio restrita nao configurada.',
      duracao_ms: Date.now() - startedAt,
      user
    });
    return {
      sent: false,
      status: 'BLOQUEADO_ENDPOINT_AUSENTE',
      errors: ['Configure ESOCIAL_RESTRITA_ENVIO_URL para envio SOAP restrito.']
    };
  }

  const payload = lote.xml_lote_assinado || lote.xml_lote;
  const response = await fetch(config.envioUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: payload,
    signal: AbortSignal.timeout(Number(process.env.ESOCIAL_SOAP_TIMEOUT_MS || 30000))
  });
  const text = await response.text();
  await logSoap({
    lote,
    operacao: 'ENVIAR_LOTE_RESTRITA',
    status: response.ok ? 'ENVIADO_RESTRITA' : 'ERRO_HTTP',
    erro: response.ok ? null : `HTTP ${response.status}`,
    duracao_ms: Date.now() - startedAt,
    request: payload,
    response: text,
    endpoint: config.envioUrl,
    user
  });
  return { sent: response.ok, status: response.ok ? 'ENVIADO_RESTRITA' : 'ERRO_HTTP', response: text };
}

async function consultarLoteRestrita(lote, user = null) {
  const startedAt = Date.now();
  const config = getEnvironmentConfig();
  assertRestritaTransmissionAllowed(config);
  if (!config.consultaUrl) {
    await logSoap({
      lote,
      operacao: 'CONSULTAR_LOTE_RESTRITA',
      status: 'BLOQUEADO_ENDPOINT_AUSENTE',
      erro: 'URL de consulta restrita nao configurada.',
      duracao_ms: Date.now() - startedAt,
      user
    });
    return {
      consulted: false,
      status: 'BLOQUEADO_ENDPOINT_AUSENTE',
      errors: ['Configure ESOCIAL_RESTRITA_CONSULTA_URL para consulta SOAP restrita.']
    };
  }
  return { consulted: false, status: 'CONSULTA_PREPARADA', errors: ['Consulta SOAP restrita preparada; envelope final depende da documentacao operacional do ambiente restrito.'] };
}

module.exports = {
  consultarLoteRestrita,
  enviarLoteRestrita
};
