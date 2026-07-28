'use strict';

const { ConfiguracaoSistema } = require('../models');
const {
  getPermissoesAreasConfig,
  invalidatePermissoesAreasCache
} = require('../services/authorizationService');
const { normalizeModuloPermissaoList, MODULO_PERMISSION_GROUPS } = require('../constants/moduloPermissoes');
const {
  getVisiblePermissionRegistry,
  isSstSimplifiedMode,
  isVisibleSstPermissionKey
} = require('../modules/sst/constants/sstSimplificationPolicy');

const CHAVE = 'PERMISSOES_AREAS_USUARIOS';
const PAYMENT_APPROVE_KEY = 'financeiro.pagamentos.aprovar';
const PAYMENT_OPERATOR_KEYS = new Set([
  'financeiro.pagamentos.preparar',
  'financeiro.pagamentos.enviar_banco'
]);

function enforcePaymentRoleSeparation(permissoes = []) {
  const normalized = normalizeModuloPermissaoList(permissoes);
  if (!normalized.includes(PAYMENT_APPROVE_KEY)) return normalized;
  return normalized.filter((key) => !PAYMENT_OPERATOR_KEYS.has(key));
}

function normalizePerfilKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function normalizeUsuarios(input, { enforcePaymentRoles = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce((acc, [usuarioId, permissoes]) => {
    const id = Number(usuarioId);
    if (!Number.isFinite(id) || id <= 0) {
      return acc;
    }

    acc[id] = enforcePaymentRoles
      ? enforcePaymentRoleSeparation(permissoes)
      : normalizeModuloPermissaoList(permissoes);
    return acc;
  }, {});
}

function normalizePadroesSetorPerfil(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce((acc, [setorKey, perfis]) => {
    const normalizedSetorKey = String(setorKey || '').trim();
    if (!normalizedSetorKey || !perfis || typeof perfis !== 'object' || Array.isArray(perfis)) {
      return acc;
    }

    const normalizedPerfis = Object.entries(perfis).reduce((perfilAcc, [perfil, permissoes]) => {
      const perfilKey = normalizePerfilKey(perfil);
      if (!perfilKey) {
        return perfilAcc;
      }

      perfilAcc[perfilKey] = enforcePaymentRoleSeparation(permissoes);
      return perfilAcc;
    }, {});

    acc[normalizedSetorKey] = normalizedPerfis;
    return acc;
  }, {});
}

function preserveHiddenSstPermissions(incoming = [], current = []) {
  if (!isSstSimplifiedMode()) return incoming;

  return normalizeModuloPermissaoList([
    ...incoming,
    ...current.filter((key) => !isVisibleSstPermissionKey(key))
  ]);
}

function preserveHiddenSstPermissionsByUser(incoming = {}, current = {}) {
  const result = { ...incoming };
  const userIds = new Set([...Object.keys(incoming), ...Object.keys(current)]);

  userIds.forEach((userId) => {
    result[userId] = preserveHiddenSstPermissions(incoming[userId] || [], current[userId] || []);
  });

  return result;
}

function preserveHiddenSstPermissionsByProfile(incoming = {}, current = {}) {
  const result = { ...incoming };
  const sectorKeys = new Set([...Object.keys(incoming), ...Object.keys(current)]);

  sectorKeys.forEach((sectorKey) => {
    result[sectorKey] = { ...(incoming[sectorKey] || {}) };
    const profiles = new Set([
      ...Object.keys(incoming[sectorKey] || {}),
      ...Object.keys(current[sectorKey] || {})
    ]);
    profiles.forEach((profile) => {
      result[sectorKey][profile] = preserveHiddenSstPermissions(
        incoming[sectorKey]?.[profile] || [],
        current[sectorKey]?.[profile] || []
      );
    });
  });

  return result;
}

module.exports = {
  async get(req, res) {
    try {
      const config = await getPermissoesAreasConfig();
      return res.json(config);
    } catch (error) {
      console.error('[permissoes-areas] Erro ao carregar configuracao', error);
      return res.status(500).json({ error: 'Erro ao carregar permissoes de areas' });
    }
  },

  async save(req, res) {
    try {
      const currentConfig = await getPermissoesAreasConfig();

      let normalizedUsuarios = Object.prototype.hasOwnProperty.call(req.body || {}, 'usuarios')
        ? normalizeUsuarios(req.body?.usuarios)
        : currentConfig.usuarios || {};

      let normalizedBloqueios = Object.prototype.hasOwnProperty.call(req.body || {}, 'usuarios_bloqueios')
        ? normalizeUsuarios(req.body?.usuarios_bloqueios, { enforcePaymentRoles: false })
        : currentConfig.usuarios_bloqueios || {};

      let normalizedPadroes = Object.prototype.hasOwnProperty.call(req.body || {}, 'padroes_setor_perfil')
        ? normalizePadroesSetorPerfil(req.body?.padroes_setor_perfil)
        : currentConfig.padroes_setor_perfil || {};

      normalizedUsuarios = preserveHiddenSstPermissionsByUser(
        normalizedUsuarios,
        currentConfig.usuarios || {}
      );
      normalizedBloqueios = preserveHiddenSstPermissionsByUser(
        normalizedBloqueios,
        currentConfig.usuarios_bloqueios || {}
      );
      normalizedPadroes = preserveHiddenSstPermissionsByProfile(
        normalizedPadroes,
        currentConfig.padroes_setor_perfil || {}
      );

      const valor = JSON.stringify({
        usuarios: normalizedUsuarios,
        usuarios_bloqueios: normalizedBloqueios,
        padroes_setor_perfil: normalizedPadroes
      });

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE },
        order: [['id', 'DESC']]
      });

      if (existente) {
        await ConfiguracaoSistema.update({ valor }, { where: { id: existente.id } });
      } else {
        await ConfiguracaoSistema.create({ chave: CHAVE, valor });
      }

      invalidatePermissoesAreasCache();
      const persistedConfig = await getPermissoesAreasConfig();
      return res.json(persistedConfig);
    } catch (error) {
      console.error('[permissoes-areas] Erro ao salvar configuracao', error);
      return res.status(500).json({ error: 'Erro ao salvar permissoes de areas' });
    }
  },

  async registry(req, res) {
    return res.json(getVisiblePermissionRegistry(MODULO_PERMISSION_GROUPS));
  }
};
