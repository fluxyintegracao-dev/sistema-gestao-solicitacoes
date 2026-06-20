'use strict';

const { ConfiguracaoSistema } = require('../models');
const {
  getPermissoesAreasConfig,
  invalidatePermissoesAreasCache
} = require('../services/authorizationService');
const { normalizeModuloPermissaoList, MODULO_PERMISSION_GROUPS } = require('../constants/moduloPermissoes');

const CHAVE = 'PERMISSOES_AREAS_USUARIOS';

function normalizePerfilKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function normalizeUsuarios(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce((acc, [usuarioId, permissoes]) => {
    const id = Number(usuarioId);
    if (!Number.isFinite(id) || id <= 0) {
      return acc;
    }

    acc[id] = normalizeModuloPermissaoList(permissoes);
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

      perfilAcc[perfilKey] = normalizeModuloPermissaoList(permissoes);
      return perfilAcc;
    }, {});

    acc[normalizedSetorKey] = normalizedPerfis;
    return acc;
  }, {});
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

      const normalizedUsuarios = Object.prototype.hasOwnProperty.call(req.body || {}, 'usuarios')
        ? normalizeUsuarios(req.body?.usuarios)
        : currentConfig.usuarios || {};

      const normalizedPadroes = Object.prototype.hasOwnProperty.call(req.body || {}, 'padroes_setor_perfil')
        ? normalizePadroesSetorPerfil(req.body?.padroes_setor_perfil)
        : currentConfig.padroes_setor_perfil || {};

      const valor = JSON.stringify({
        usuarios: normalizedUsuarios,
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
    return res.json(MODULO_PERMISSION_GROUPS);
  }
};
