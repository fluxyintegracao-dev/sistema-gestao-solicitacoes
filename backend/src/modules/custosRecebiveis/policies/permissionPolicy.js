'use strict';

const {
  getPermissoesAreasConfig,
  normalizeToken,
  isSuperadmin
} = require('../../../services/authorizationService');
const { normalizeModuloPermissaoList } = require('../../../constants/moduloPermissoes');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');

function resolveSetorKeys(user) {
  return [...new Set(
    [user?.setor_id, user?.setor?.id, user?.setor?.codigo, user?.setor?.nome]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .flatMap((value) => [value, normalizeToken(value)])
      .filter(Boolean)
  )];
}

async function resolveExplicitCustosRecebiveisPermissions(user, dependencies = {}) {
  const configResolver = dependencies.getPermissoesAreasConfig || getPermissoesAreasConfig;
  const config = await configResolver();
  const userId = Number(user?.id);
  const profile = normalizeToken(user?.perfil);
  const defaults = [];

  resolveSetorKeys(user).forEach((setorKey) => {
    const profiles = config?.padroes_setor_perfil?.[setorKey];
    if (profiles?.[profile]) defaults.push(...profiles[profile]);
  });

  const blocked = new Set(normalizeModuloPermissaoList(
    config?.usuarios_bloqueios?.[userId] || []
  ));

  return normalizeModuloPermissaoList([
    ...(Array.isArray(user?.areas_permissoes) ? user.areas_permissoes : []),
    ...(config?.usuarios?.[userId] || []),
    ...defaults
  ]).filter((permission) => !blocked.has(permission));
}

async function hasExplicitCustosRecebiveisPermission(user, permissionKey, dependencies = {}) {
  const isSuperadminResolver = dependencies.isSuperadmin || isSuperadmin;
  const permissionsResolver = dependencies.resolveExplicitPermissions
    || resolveExplicitCustosRecebiveisPermissions;

  if (isSuperadminResolver(user)) return true;

  const expected = String(permissionKey || '').trim().toLowerCase();
  if (!expected) return false;

  const permissions = await permissionsResolver(user, dependencies);
  return (Array.isArray(permissions) ? permissions : []).some((permission) => (
    String(permission || '').trim().toLowerCase() === expected
  ));
}

function requireCustosRecebiveisPermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (await hasExplicitCustosRecebiveisPermission(req.user, permissionKey)) {
        return next();
      }

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'AUTHZ_DENIED',
        recursoTipo: 'CUSTOS_RECEBIVEIS',
        recursoId: req.originalUrl,
        status: 'DENIED',
        descricao: 'Permissao explicita ausente para Custos e Recebiveis',
        metadata: { permissao_requerida: permissionKey }
      });

      return res.status(403).json({ error: 'Acesso negado para Custos e Recebiveis' });
    } catch (error) {
      console.error('Erro ao validar permissao de Custos e Recebiveis:', error.message);
      return res.status(500).json({ error: 'Erro ao validar permissao do modulo' });
    }
  };
}

module.exports = {
  hasExplicitCustosRecebiveisPermission,
  resolveExplicitCustosRecebiveisPermissions,
  requireCustosRecebiveisPermission
};
