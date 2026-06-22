class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

function sanitizeString(value, fieldName, { required = false, max = null, pattern = null } = {}) {
  const normalized = value == null ? '' : String(value).trim();

  if (!normalized) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return '';
  }

  if (max && normalized.length > max) {
    throw new ValidationError(`${fieldName} excede o tamanho permitido.`);
  }

  if (pattern && !pattern.test(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return normalized;
}

function ensureAllowedKeys(payload, allowedKeys = [], label = 'Requisicao') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError(`${label} invalida.`);
  }

  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new ValidationError(`${label} contem campos nao permitidos: ${unknownKeys.join(', ')}.`);
  }
}

function validateRequest({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (typeof body === 'function') {
        req.body = body(req.body || {}, req);
      }

      if (typeof params === 'function') {
        req.params = params(req.params || {}, req);
      }

      if (typeof query === 'function') {
        req.query = query(req.query || {}, req);
      }

      return next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode || 400).json({ error: error.message });
      }

      return res.status(400).json({ error: 'Requisicao invalida.' });
    }
  };
}

module.exports = {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString,
  validateRequest
};
