const { isSuperadmin } = require('../services/authorizationService');
const { isModuleEnabled, normalizeModuleKey } = require('../services/moduleConfigService');
const { registrarEventoSeguranca } = require('../services/securityLogService');

function requireEnabledModule(moduleKey, options = {}) {
  const normalized = normalizeModuleKey(moduleKey);
  const allowSuperadminBypass = options.allowSuperadminBypass !== false;

  return async (req, res, next) => {
    try {
      if (!normalized) {
        return next();
      }

      if (allowSuperadminBypass && isSuperadmin(req.user)) {
        return next();
      }

      const enabled = await isModuleEnabled(normalized);
      if (enabled) {
        return next();
      }

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'MODULE_DISABLED_ACCESS',
        recursoTipo: 'MODULE',
        recursoId: normalized,
        status: 'DENIED',
        descricao: `Acesso negado ao modulo desabilitado: ${normalized}`
      });

      return res.status(403).json({
        error: `Modulo ${normalized} desabilitado para esta instalacao`
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao validar modulo habilitado' });
    }
  };
}

function requireAnyEnabledModule(moduleKeys = [], options = {}) {
  const normalizedKeys = (Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys])
    .map((item) => normalizeModuleKey(item))
    .filter(Boolean);
  const allowSuperadminBypass = options.allowSuperadminBypass !== false;

  return async (req, res, next) => {
    try {
      if (!normalizedKeys.length) {
        return next();
      }

      if (allowSuperadminBypass && isSuperadmin(req.user)) {
        return next();
      }

      const results = await Promise.all(normalizedKeys.map((key) => isModuleEnabled(key)));
      const enabled = results.some(Boolean);
      if (enabled) {
        return next();
      }

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'MODULE_DISABLED_ACCESS',
        recursoTipo: 'MODULE',
        recursoId: normalizedKeys.join(','),
        status: 'DENIED',
        descricao: `Acesso negado aos modulos desabilitados: ${normalizedKeys.join(', ')}`
      });

      return res.status(403).json({
        error: `Nenhum dos modulos requeridos esta habilitado: ${normalizedKeys.join(', ')}`
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao validar modulos habilitados' });
    }
  };
}

module.exports = {
  requireEnabledModule,
  requireAnyEnabledModule
};
