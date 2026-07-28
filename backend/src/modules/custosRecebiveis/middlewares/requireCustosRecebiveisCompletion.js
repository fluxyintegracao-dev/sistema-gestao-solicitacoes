'use strict';

const { calcularEstadoGuardUsuario, guardMode } = require('../services/obrigacaoService');

const ALWAYS_ALLOWED_PREFIXES = Object.freeze([
  '/auth/logout',
  '/auth/heartbeat',
  '/usuarios/me',
  '/perfil',
  '/ajuda',
  '/suporte',
  '/custos-recebiveis'
]);

function isAllowedRoute(req) {
  const path = String(req.path || req.originalUrl || '').split('?')[0];
  return ALWAYS_ALLOWED_PREFIXES.some((prefix) => (
    path === prefix || path.startsWith(`${prefix}/`)
  ));
}

async function requireCustosRecebiveisCompletion(req, res, next) {
  if (guardMode() === 'observe') return next();
  try {
    const state = await calcularEstadoGuardUsuario(req.user, {
      mode: 'enforce',
      persistir: false
    });
    if (!state.bloqueado || isAllowedRoute(req)) return next();
    return res.status(403).json({
      error: state.motivo || 'Existe uma obrigacao mensal pendente.',
      code: 'MONTHLY_REQUIREMENT_PENDING',
      custos_recebiveis_pendencia: state
    });
  } catch (error) {
    console.error('Falha segura ao avaliar guard de Custos e Recebiveis:', error.message);
    return next();
  }
}

module.exports = requireCustosRecebiveisCompletion;
module.exports.ALWAYS_ALLOWED_PREFIXES = ALWAYS_ALLOWED_PREFIXES;
module.exports.isAllowedRoute = isAllowedRoute;
