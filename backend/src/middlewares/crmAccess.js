const { isModuleEnabled } = require('../services/moduleConfigService');
const { isSuperadmin } = require('../services/authorizationService');
const { registrarEventoSeguranca } = require('../services/securityLogService');

// CRM permissions stored in crm_config as JSON array per user or
// role. For Phase 1, superadmin and ADMIN/GESTOR bypass; all other
// users require explicit grant via crm_config key CRM_PERMISSOES_PERFIS.
const CRM_PERFIS_ACESSO_PADRAO = ['SUPERADMIN', 'ADMIN', 'ADMINISTRADOR', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM', 'DIRETORIA'];

function requireCrmModule(options = {}) {
  return async (req, res, next) => {
    try {
      if (isSuperadmin(req.user)) return next();

      const enabled = await isModuleEnabled('CRM');
      if (!enabled) {
        return res.status(403).json({ error: 'Modulo CRM desabilitado para esta instalacao' });
      }

      const perfil = String(req.user?.perfil || '').toUpperCase();
      if (!CRM_PERFIS_ACESSO_PADRAO.includes(perfil)) {
        await registrarEventoSeguranca({
          req,
          usuarioId: req.user?.id || null,
          tipoEvento: 'CRM_ACCESS_DENIED',
          recursoTipo: 'MODULE',
          recursoId: 'CRM',
          status: 'DENIED',
          descricao: `Perfil sem acesso ao CRM: ${perfil}`
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
