'use strict';

const { ConfiguracaoSistema } = require('../models');
const {
  getPermissoesAreasUsuarios,
  invalidatePermissoesAreasCache
} = require('../services/authorizationService');
const { normalizeModuloPermissaoList, MODULO_PERMISSION_GROUPS } = require('../constants/moduloPermissoes');

const CHAVE = 'PERMISSOES_AREAS_USUARIOS';

module.exports = {
  /**
   * GET /configuracoes/permissoes-areas
   * Retorna o mapa atual de permissões de área por usuário.
   */
  async get(req, res) {
    try {
      const usuarios = await getPermissoesAreasUsuarios();
      return res.json({ usuarios });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar permissoes de areas' });
    }
  },

  /**
   * PUT /configuracoes/permissoes-areas
   * Salva o mapa completo de permissões de área por usuário.
   * Body: { usuarios: { "123": ["chave1", "chave2"], ... } }
   */
  async save(req, res) {
    try {
      const input = req.body?.usuarios;
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return res.status(400).json({ error: 'Campo "usuarios" invalido' });
      }

      const normalizedUsuarios = Object.entries(input).reduce((acc, [userId, permissions]) => {
        const id = Number(userId);
        if (!Number.isInteger(id) || id <= 0) return acc;
        const normalized = normalizeModuloPermissaoList(permissions);
        // Só salva se houver permissões (sem entrada = acesso completo ao módulo)
        if (normalized.length) acc[id] = normalized;
        return acc;
      }, {});

      const valor = JSON.stringify({ usuarios: normalizedUsuarios });

      const existente = await ConfiguracaoSistema.findOne({
        where: { chave: CHAVE },
        order: [['id', 'DESC']]
      });

      if (existente) {
        await ConfiguracaoSistema.update(
          { valor },
          { where: { id: existente.id } }
        );
      } else {
        await ConfiguracaoSistema.create({ chave: CHAVE, valor });
      }

      invalidatePermissoesAreasCache();
      const persistedUsuarios = await getPermissoesAreasUsuarios();

      return res.json({ usuarios: persistedUsuarios });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar permissoes de areas' });
    }
  },

  /**
   * GET /configuracoes/permissoes-areas/registry
   * Retorna o registro de todas as permissões disponíveis (para o frontend montar a UI).
   */
  async registry(req, res) {
    return res.json(MODULO_PERMISSION_GROUPS);
  }
};
