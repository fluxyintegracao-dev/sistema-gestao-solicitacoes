const { isModuleEnabled } = require('../services/moduleConfigService');
const { canAccessCrm, isSuperadmin } = require('../services/authorizationService');
const { registrarEventoSeguranca } = require('../services/securityLogService');

function requireCrmModule(options = {}) {
  return async (req, res, next) => {
    try {
      if (isSuperadmin(req.user)) return next();

      const enabled = await isModuleEnabled('CRM');
      if (!enabled) {
        return res.status(403).json({ error: 'Modulo CRM desabilitado para esta instalacao' });
      }

      if (!(await canAccessCrm(req.user))) {
        const perfil = String(req.user?.perfil || '').toUpperCase();
        await registrarEventoSeguranca({
          req,
          usuarioId: req.user?.id || null,
          tipoEvento: 'CRM_ACCESS_DENIED',
          recursoTipo: 'MODULE',
          recursoId: 'CRM',
          status: 'DENIED',
          descricao: `Usuario sem acesso ao CRM: perfil=${perfil}`
        });
        return res.status(403).json({ error: 'Acesso negado ao modulo CRM' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao validar acesso ao CRM' });
    }
  };
}

module.exports = { requireCrmModule };
