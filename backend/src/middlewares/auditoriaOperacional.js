'use strict';

const { recordHttpEvent } = require('../modules/governanca/services/auditoriaOperacionalService');

const SKIP_PATHS = [
  '/auth/heartbeat',
  '/live-updates',
  '/governanca/auditoria-operacional/navegacao'
];

module.exports = function auditoriaOperacional(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || SKIP_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  let recorded = false;
  res.on('finish', () => {
    if (recorded || !req.user?.id) return;
    recorded = true;
    recordHttpEvent(req, res.statusCode).catch(() => {});
  });
  return next();
};
