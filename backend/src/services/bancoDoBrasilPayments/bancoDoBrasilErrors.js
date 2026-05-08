function createBancoDoBrasilError(statusCode, message, code = 'BB_PAYMENTS_ERROR', details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function maskToken(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length <= 12) return `${text.slice(0, 4)}***`;
  return `${text.slice(0, 8)}***${text.slice(-4)}`;
}

function maskSecret(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-2)}`;
}

function sanitizeHeaders(headers = {}) {
  const sanitized = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    const normalized = String(key || '').toLowerCase();
    if (normalized === 'authorization') {
      sanitized[key] = 'Bearer ***';
    } else if (normalized.includes('app-key') || normalized.includes('secret') || normalized.includes('token')) {
      sanitized[key] = maskSecret(value);
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
}

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const normalized = String(key).toLowerCase();
    if (['authorization', 'access_token', 'client_secret', 'bb_client_secret', 'cert_passphrase'].includes(normalized)) {
      return [key, '***'];
    }
    if (normalized.includes('app_key') || normalized.includes('app-key')) {
      return [key, maskSecret(item)];
    }
    return [key, sanitizePayload(item)];
  }));
}

module.exports = {
  createBancoDoBrasilError,
  maskSecret,
  maskToken,
  sanitizeHeaders,
  sanitizePayload
};
