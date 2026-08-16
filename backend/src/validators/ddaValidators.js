const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

const STATUS_DDA = new Set([
  'NOVO',
  'MATCH_EXATO',
  'AMBIGUO',
  'DIVERGENTE',
  'SEM_TITULO',
  'VINCULADO',
  'IGNORADO'
]);

function optionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} invalido.`);
  }
  return parsed;
}

function optionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return '';
  const normalized = sanitizeString(value, fieldName, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ValidationError(`${fieldName} deve estar no formato AAAA-MM-DD.`);
  }
  return normalized;
}

function validateDdaListQuery(query = {}) {
  ensureAllowedKeys(query, [
    'empresa_id', 'status', 'data_inicio', 'data_fim', 'q', 'page', 'limit'
  ], 'Consulta DDA');

  const status = sanitizeString(query.status, 'Status', { max: 30 }).toUpperCase();
  if (status && !STATUS_DDA.has(status)) {
    throw new ValidationError('Status DDA invalido.');
  }

  const page = optionalPositiveInt(query.page, 'Pagina') || 1;
  const limit = Math.min(optionalPositiveInt(query.limit, 'Limite') || 25, 100);
  return {
    empresa_id: optionalPositiveInt(query.empresa_id, 'Empresa'),
    status,
    data_inicio: optionalDate(query.data_inicio, 'Data inicial'),
    data_fim: optionalDate(query.data_fim, 'Data final'),
    q: sanitizeString(query.q, 'Pesquisa', { max: 160 }),
    page,
    limit
  };
}

function validateDdaSyncBody(body = {}) {
  ensureAllowedKeys(body, ['empresa_id', 'payment_account_id', 'request_id'], 'Sincronizacao DDA');
  return {
    empresa_id: optionalPositiveInt(body.empresa_id, 'Empresa'),
    payment_account_id: optionalPositiveInt(body.payment_account_id, 'Conta de pagamento'),
    request_id: sanitizeString(body.request_id, 'Request ID', { max: 100 }) || null
  };
}

function validateDdaLinkBody(body = {}) {
  ensureAllowedKeys(body, ['titulo_id'], 'Vinculo DDA');
  return { titulo_id: optionalPositiveInt(body.titulo_id, 'Titulo') };
}

function validateDdaIgnoreBody(body = {}) {
  ensureAllowedKeys(body, ['motivo'], 'Ignorar boleto DDA');
  return {
    motivo: sanitizeString(body.motivo, 'Motivo', { required: true, max: 500 })
  };
}

module.exports = {
  validateDdaIgnoreBody,
  validateDdaLinkBody,
  validateDdaListQuery,
  validateDdaSyncBody
};
