const ALLOWED_PENDING_ROUTES = [
  { method: 'GET', path: '/auth/me' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'POST', path: '/auth/heartbeat' },
  { method: 'POST', path: '/auth/mfa/setup' },
  { method: 'POST', path: '/auth/mfa/enable' },
  { method: 'PATCH', path: '/usuarios/me/senha' }
];

function isAllowedPendingRoute(req) {
  const method = String(req.method || '').trim().toUpperCase();
  const routePath = String(req.path || '').trim();
  return ALLOWED_PENDING_ROUTES.some((item) => item.method === method && item.path === routePath);
}

async function requireMfaCompletion(req, res, next) {
  if (!req.auth?.mfa_setup_pending) {
    return next();
  }

  if (isAllowedPendingRoute(req)) {
    return next();
  }

  return res.status(403).json({
    error: 'Autenticacao em duas etapas obrigatoria pendente de configuracao.',
    mfa_setup_required: true
  });
}

module.exports = requireMfaCompletion;
