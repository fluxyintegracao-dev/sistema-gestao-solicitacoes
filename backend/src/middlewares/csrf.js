const { env } = require('../config/env');
const { registrarEventoSeguranca } = require('../services/securityLogService');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = async function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(String(req.method || '').toUpperCase())) {
    return next();
  }

  if (req.auth_mode !== 'cookie') {
    return next();
  }

  const cookieToken = String(req.cookies?.[env.csrfCookieName] || '').trim();
  const headerToken = String(req.headers?.[env.csrfHeaderName] || '').trim();

  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'CSRF_VALIDATION_FAILURE',
    recursoTipo: 'AUTH',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Requisicao bloqueada por validacao CSRF'
  });

  return res.status(403).json({ error: 'Requisicao rejeitada por validacao de seguranca.' });
};
