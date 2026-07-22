'use strict';

const SST_CORE_RESOURCES = new Set([
  'pgr',
  'pcmso',
  'aso',
  'exames',
  'epi',
  'treinamentos',
  'documentos',
  'ltcat',
  'avaliacoes_quantitativas'
]);

const SST_ALWAYS_AVAILABLE_PATHS = new Set([
  '/health',
  '/configuracoes',
  '/dashboard',
  '/relatorio-operacional',
  '/conformidade'
]);

const SST_SIMPLIFIED_PERMISSION_KEYS = new Set([
  'sst.dashboard.visualizar',
  'sst.pgr.visualizar',
  'sst.pgr.gerenciar',
  'sst.pcmso.visualizar',
  'sst.pcmso.gerenciar',
  'sst.aso.visualizar',
  'sst.aso.gerenciar',
  'sst.exames.visualizar',
  'sst.exames.gerenciar',
  'sst.epi.visualizar',
  'sst.epi.gerenciar',
  'sst.treinamentos.visualizar',
  'sst.treinamentos.gerenciar',
  'sst.documentos.visualizar',
  'sst.documentos.gerenciar',
  'sst.ltcat.visualizar',
  'sst.ltcat.gerenciar',
  'sst.avaliacoes_quantitativas.visualizar',
  'sst.avaliacoes_quantitativas.gerenciar',
  'sst.configuracoes.gerenciar'
]);

function isSstSimplifiedMode() {
  return String(process.env.SST_SIMPLIFIED_MODE || 'true').toLowerCase() !== 'false';
}

function getResourceFromPath(path = '') {
  return String(path).split('/').filter(Boolean)[0] || '';
}

function isCoreSstResource(resource) {
  return SST_CORE_RESOURCES.has(String(resource || '').toLowerCase());
}

function isVisibleSstPermissionKey(key) {
  const normalizedKey = String(key || '').trim();
  if (!isSstSimplifiedMode() || !normalizedKey.startsWith('sst.')) return true;
  return SST_SIMPLIFIED_PERMISSION_KEYS.has(normalizedKey);
}

function getVisiblePermissionRegistry(groups = []) {
  if (!isSstSimplifiedMode()) return groups;

  return groups.map((group) => {
    if (group.modulo !== 'SST') return group;

    return {
      ...group,
      areas: (group.areas || [])
        .map((area) => ({
          ...area,
          permissoes: (area.permissoes || []).filter((permission) => (
            isVisibleSstPermissionKey(permission.key)
          ))
        }))
        .filter((area) => area.permissoes.length > 0)
    };
  });
}

function evaluateSstSimplifiedAccess({ method = 'GET', path = '/' } = {}) {
  if (!isSstSimplifiedMode()) return { allowed: true, mode: 'complete' };

  const normalizedMethod = String(method).toUpperCase();
  const normalizedPath = String(path || '/').split('?')[0];
  const resource = getResourceFromPath(normalizedPath);
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);

  if (SST_ALWAYS_AVAILABLE_PATHS.has(normalizedPath)) {
    return { allowed: true, mode: 'simplified-core' };
  }

  if (resource === 'documentos' && (
    normalizedPath === '/documentos/upload'
    || /^\/documentos\/\d+\/url$/.test(normalizedPath)
  )) {
    return { allowed: true, mode: 'simplified-core' };
  }

  if (isCoreSstResource(resource)) {
    return { allowed: true, mode: 'simplified-core' };
  }

  // Historical records remain available for consultation, but legacy flows
  // cannot create side effects while the simplified mode is active.
  if (isRead && resource && !normalizedPath.includes('/analisar-ia')) {
    return { allowed: true, mode: 'legacy-read-only' };
  }

  return {
    allowed: false,
    mode: 'legacy-disabled',
    status: 410,
    code: 'SST_LEGACY_FLOW_DISABLED',
    error: 'Este fluxo legado do SST esta desativado no modo simplificado.'
  };
}

function enforceSstSimplifiedMode(req, res, next) {
  const decision = evaluateSstSimplifiedAccess({ method: req.method, path: req.path });
  res.setHeader('X-SST-Mode', decision.mode);
  if (decision.allowed) return next();
  return res.status(decision.status || 410).json({
    error: decision.error,
    code: decision.code
  });
}

module.exports = {
  SST_CORE_RESOURCES,
  SST_SIMPLIFIED_PERMISSION_KEYS,
  evaluateSstSimplifiedAccess,
  enforceSstSimplifiedMode,
  getVisiblePermissionRegistry,
  getResourceFromPath,
  isCoreSstResource,
  isSstSimplifiedMode,
  isVisibleSstPermissionKey
};
