const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

const SIENGE_STATUS_FILA = ['PENDENTE', 'PROCESSANDO', 'SUCESSO', 'ERRO'];
const SIENGE_ORIGENS_MODULO = ['FINANCEIRO', 'RH_DP', 'COMERCIAL', 'SOLICITACOES', 'COMPRAS', 'OUTROS'];

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function parseOptionalText(value, fieldName, max, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  return sanitizeString(value, fieldName, { required, max });
}

function parseInteger(value, fieldName, { required = false, min = 1, max = null } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  if (parsed < min) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  if (max != null && parsed > max) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  return parsed;
}

function parseBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'sim', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'nao', 'não', 'no'].includes(normalized)) return false;
  throw new ValidationError(`${fieldName} invalido.`);
}

function parseEnum(value, fieldName, allowedValues = [], { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = String(value || '').trim().toUpperCase();
  if (!allowedValues.includes(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return normalized;
}

function parsePlainObject(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value == null) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  return value;
}

function validateSiengeConfigBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'ativo',
      'base_url_override',
      'endpoint_titulos',
      'documento_padrao_id',
      'indexador_padrao_id',
      'auto_vincular_credor_busca_exata',
      'auto_cadastrar_credor_quando_ausente',
      'timeout_ms',
      'max_tentativas',
      'payload_defaults',
      'observacoes'
    ],
    'Configuracao da Integracao SIENGE'
  );

  const payload = {
    ativo: parseBoolean(body.ativo, 'Ativo'),
    base_url_override: parseOptionalText(body.base_url_override, 'Base URL override', 255),
    endpoint_titulos: parseOptionalText(body.endpoint_titulos, 'Endpoint de titulos', 255),
    documento_padrao_id: parseInteger(body.documento_padrao_id, 'Documento padrao', { min: 1 }),
    indexador_padrao_id: parseInteger(body.indexador_padrao_id, 'Indexador padrao', { min: 1 }),
    auto_vincular_credor_busca_exata: parseBoolean(
      body.auto_vincular_credor_busca_exata,
      'Auto vincular credor por busca exata'
    ),
    auto_cadastrar_credor_quando_ausente: parseBoolean(
      body.auto_cadastrar_credor_quando_ausente,
      'Auto cadastrar credor quando ausente'
    ),
    timeout_ms: parseInteger(body.timeout_ms, 'Timeout', { min: 1000, max: 120000 }),
    max_tentativas: parseInteger(body.max_tentativas, 'Maximo de tentativas', { min: 1, max: 20 }),
    payload_defaults_json: Object.prototype.hasOwnProperty.call(body, 'payload_defaults')
      ? parsePlainObject(body.payload_defaults, 'Payload defaults')
      : undefined,
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar a configuracao SIENGE.');
  }

  return normalized;
}

function validateSiengeFilaQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['status', 'titulo_financeiro_id', 'origem_modulo', 'limit'],
    'Consulta da fila SIENGE'
  );

  return {
    status: parseEnum(query.status, 'Status', SIENGE_STATUS_FILA),
    titulo_financeiro_id: parseInteger(query.titulo_financeiro_id, 'Titulo financeiro'),
    origem_modulo: parseEnum(query.origem_modulo, 'Origem do modulo', SIENGE_ORIGENS_MODULO),
    limit: parseInteger(query.limit, 'Limite', { min: 1, max: 200 })
  };
}

function validateSiengeFilaCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['titulo_financeiro_id', 'origem_modulo', 'forcar_recriar_payload', 'processar_agora'],
    'Fila da Integracao SIENGE'
  );

  return {
    titulo_financeiro_id: parseInteger(body.titulo_financeiro_id, 'Titulo financeiro', { required: true }),
    origem_modulo: parseEnum(body.origem_modulo, 'Origem do modulo', SIENGE_ORIGENS_MODULO),
    forcar_recriar_payload: parseBoolean(body.forcar_recriar_payload, 'Forcar recriar payload'),
    processar_agora: parseBoolean(body.processar_agora, 'Processar agora')
  };
}

function validateSiengeFilaRetryBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['forcar_recriar_payload'],
    'Reprocessamento da fila SIENGE'
  );

  return {
    forcar_recriar_payload: parseBoolean(body.forcar_recriar_payload, 'Forcar recriar payload')
  };
}

function validateSiengeLogQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['fila_id', 'limit'],
    'Consulta de logs da Integracao SIENGE'
  );

  return {
    fila_id: parseInteger(query.fila_id, 'Fila SIENGE'),
    limit: parseInteger(query.limit, 'Limite', { min: 1, max: 300 })
  };
}

function validateSiengeCredorMapeamentoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['external_creditor_id', 'ativo', 'metadata'],
    'Mapeamento de credor SIENGE'
  );

  const payload = {
    external_creditor_id: parseOptionalText(body.external_creditor_id, 'Credor externo', 120),
    ativo: parseBoolean(body.ativo, 'Ativo'),
    metadata_json: Object.prototype.hasOwnProperty.call(body, 'metadata')
      ? parsePlainObject(body.metadata, 'Metadata')
      : undefined
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar o mapeamento do credor SIENGE.');
  }

  if (normalized.ativo !== false && !normalized.external_creditor_id) {
    throw new ValidationError('Credor externo e obrigatorio para ativar ou atualizar o mapeamento SIENGE.');
  }

  return normalized;
}

function validateSiengeCredorBuscaBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['vincular_automaticamente', 'limit', 'max_paginas'],
    'Busca de credor SIENGE'
  );

  return {
    vincular_automaticamente: parseBoolean(body.vincular_automaticamente, 'Vincular automaticamente'),
    limit: parseInteger(body.limit, 'Limite', { min: 1, max: 200 }),
    max_paginas: parseInteger(body.max_paginas, 'Maximo de paginas', { min: 1, max: 20 })
  };
}

function validateSiengeCredorCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['buscar_antes_de_cadastrar', 'vincular_se_match_exato', 'payload_override'],
    'Cadastro de credor SIENGE'
  );

  return {
    buscar_antes_de_cadastrar: parseBoolean(body.buscar_antes_de_cadastrar, 'Buscar antes de cadastrar'),
    vincular_se_match_exato: parseBoolean(body.vincular_se_match_exato, 'Vincular se houver match exato'),
    payload_override: Object.prototype.hasOwnProperty.call(body, 'payload_override')
      ? parsePlainObject(body.payload_override, 'Payload override')
      : undefined
  };
}

module.exports = {
  validateSiengeConfigBody,
  validateSiengeCredorBuscaBody,
  validateSiengeCredorCreateBody,
  validateSiengeCredorMapeamentoBody,
  validateSiengeFilaCreateBody,
  validateSiengeFilaQuery,
  validateSiengeFilaRetryBody,
  validateSiengeLogQuery
};
