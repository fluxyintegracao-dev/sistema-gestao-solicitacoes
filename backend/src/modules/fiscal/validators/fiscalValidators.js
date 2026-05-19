'use strict';

const {
  ensureAllowedKeys,
  sanitizeString,
  ValidationError
} = require('../../../middlewares/validation');
const {
  FISCAL_AMBIENTES_SEFAZ,
  FISCAL_DOCUMENT_STATUSES,
  FISCAL_DOCUMENT_TYPES,
  FISCAL_SYNC_STATUSES
} = require('../constants/fiscalPermissions');

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseOptionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  return normalized;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'não', 'n'].includes(normalized)) return false;
  throw new ValidationError('Valor booleano invalido.');
}

function parseEnum(value, fieldName, allowed, { required = false, fallback = null } = {}) {
  const normalized = sanitizeString(value, fieldName, { required, max: 60 }).toLowerCase();
  if (!normalized) return fallback;
  if (!allowed.includes(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  return normalized;
}

function parseUf(value, { required = false } = {}) {
  const uf = sanitizeString(value, 'UF', {
    required,
    max: 2,
    pattern: /^[A-Za-z]{2}$/
  }).toUpperCase();
  return uf || null;
}

function parseCnpj(value, { required = false } = {}) {
  const normalized = digitsOnly(value);
  if (!normalized) {
    if (required) throw new ValidationError('CNPJ e obrigatorio.');
    return null;
  }
  if (!/^\d{14}$/.test(normalized)) {
    throw new ValidationError('CNPJ deve conter 14 digitos.');
  }
  return normalized;
}

function validateFiscalCompanyCreateBody(body = {}) {
  ensureAllowedKeys(body, [
    'empresa_id',
    'razao_social',
    'nome_fantasia',
    'cnpj',
    'uf',
    'inscricao_estadual',
    'ambiente_sefaz',
    'ativo',
    'modulo_fiscal_habilitado',
    'observacoes'
  ], 'Empresa fiscal');

  return {
    empresa_id: parseOptionalInteger(body.empresa_id, 'Empresa do grupo'),
    razao_social: sanitizeString(body.razao_social, 'Razao social', { required: true, max: 180 }),
    nome_fantasia: sanitizeString(body.nome_fantasia, 'Nome fantasia', { max: 180 }) || null,
    cnpj: parseCnpj(body.cnpj, { required: true }),
    uf: parseUf(body.uf, { required: true }),
    inscricao_estadual: sanitizeString(body.inscricao_estadual, 'Inscricao estadual', { max: 40 }) || null,
    ambiente_sefaz: parseEnum(body.ambiente_sefaz, 'Ambiente SEFAZ', FISCAL_AMBIENTES_SEFAZ, { fallback: 'homologacao' }),
    ativo: parseOptionalBoolean(body.ativo),
    modulo_fiscal_habilitado: parseOptionalBoolean(body.modulo_fiscal_habilitado),
    observacoes: sanitizeString(body.observacoes, 'Observacoes', { max: 2000 }) || null
  };
}

function validateFiscalCompanyUpdateBody(body = {}) {
  const parsed = validateFiscalCompanyCreateBody({
    ...body,
    razao_social: body.razao_social ?? 'placeholder',
    cnpj: body.cnpj ?? '00000000000000',
    uf: body.uf ?? 'ES'
  });

  const allowed = Object.keys(body);
  const result = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      result[key] = parsed[key];
    }
  });

  if (Object.keys(result).length === 0) {
    throw new ValidationError('Informe ao menos um campo para atualizar.');
  }

  return result;
}

function validateFiscalCompanyQuery(query = {}) {
  ensureAllowedKeys(query, ['q', 'ativo', 'limit', 'page'], 'Filtro de empresas fiscais');
  return {
    q: sanitizeString(query.q, 'Busca', { max: 120 }) || null,
    ativo: parseOptionalBoolean(query.ativo),
    limit: Math.min(parseOptionalInteger(query.limit || 50, 'Limite') || 50, 200),
    page: parseOptionalInteger(query.page || 1, 'Pagina') || 1
  };
}

function validateFiscalDocumentQuery(query = {}) {
  ensureAllowedKeys(query, ['company_id', 'status', 'document_type', 'q', 'limit', 'page'], 'Filtro de documentos fiscais');
  return {
    company_id: parseOptionalInteger(query.company_id, 'Empresa fiscal'),
    status: parseEnum(query.status, 'Status do documento', FISCAL_DOCUMENT_STATUSES, { fallback: null }),
    document_type: parseEnum(query.document_type, 'Tipo documental', FISCAL_DOCUMENT_TYPES, { fallback: null }),
    q: sanitizeString(query.q, 'Busca', { max: 120 }) || null,
    limit: Math.min(parseOptionalInteger(query.limit || 50, 'Limite') || 50, 200),
    page: parseOptionalInteger(query.page || 1, 'Pagina') || 1
  };
}

function validateFiscalSyncLogQuery(query = {}) {
  ensureAllowedKeys(query, ['company_id', 'status', 'document_type', 'limit', 'page'], 'Filtro de logs fiscais');
  return {
    company_id: parseOptionalInteger(query.company_id, 'Empresa fiscal'),
    status: parseEnum(query.status, 'Status do log', ['success', 'error', 'blocked', 'skipped'], { fallback: null }),
    document_type: parseEnum(query.document_type, 'Tipo documental', FISCAL_DOCUMENT_TYPES, { fallback: null }),
    limit: Math.min(parseOptionalInteger(query.limit || 50, 'Limite') || 50, 200),
    page: parseOptionalInteger(query.page || 1, 'Pagina') || 1
  };
}

function validateFiscalSyncStateStatus(status) {
  return parseEnum(status, 'Status de sincronizacao', FISCAL_SYNC_STATUSES, { fallback: 'idle' });
}

module.exports = {
  digitsOnly,
  validateFiscalCompanyCreateBody,
  validateFiscalCompanyQuery,
  validateFiscalCompanyUpdateBody,
  validateFiscalDocumentQuery,
  validateFiscalSyncLogQuery,
  validateFiscalSyncStateStatus
};
