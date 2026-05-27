'use strict';

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_err) {
      return null;
    }
  }
}

function buildDocumentPrompt({ documentType, text, metadata = {}, schema = [] } = {}) {
  return [
    'Voce e um parser documental SST do FLUXY.',
    'Extraia apenas dados presentes no texto. Nao invente campos.',
    'Retorne somente JSON valido no formato:',
    '{"tipo_documento":"","confianca":0.0,"dados":{},"observacoes":[]}',
    `Tipo esperado: ${documentType || 'OUTRO'}.`,
    `Campos esperados: ${schema.join(', ') || 'livre'}.`,
    `Metadados internos: ${JSON.stringify(metadata || {})}.`,
    'Texto do documento:',
    String(text || '').slice(0, 12000)
  ].join('\n');
}

function blockedMissingText(providerName) {
  return {
    executed: false,
    provider: providerName,
    status: 'PENDENTE_TEXTO_DOCUMENTO',
    confidence: null,
    extracted: {},
    raw: null,
    errors: ['Documento sem texto extraido para analise. Pipeline OCR/binario deve fornecer texto antes do provider IA.']
  };
}

function blockedCredential(providerName, keyName) {
  return {
    executed: false,
    provider: providerName,
    status: 'BLOQUEADO_CREDENCIAL',
    confidence: null,
    extracted: {},
    raw: null,
    errors: [`${keyName} nao configurada.`]
  };
}

function normalizeProviderJsonResult(providerName, payloadOrText) {
  const parsed = typeof payloadOrText === 'string' ? safeJsonParse(payloadOrText) : payloadOrText;
  if (!parsed) {
    return {
      executed: true,
      provider: providerName,
      status: 'ERRO_PARSE_JSON',
      confidence: null,
      extracted: {},
      raw: payloadOrText,
      errors: ['Provider retornou resposta sem JSON estruturado valido.']
    };
  }

  return {
    executed: true,
    provider: providerName,
    status: 'PROCESSADO',
    confidence: parsed.confianca ?? parsed.confidence ?? null,
    extracted: parsed.dados || parsed,
    raw: parsed,
    errors: []
  };
}

module.exports = {
  blockedCredential,
  blockedMissingText,
  buildDocumentPrompt,
  normalizeProviderJsonResult,
  safeJsonParse
};
