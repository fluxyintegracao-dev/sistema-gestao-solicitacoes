const { Op } = require('sequelize');
const { ProvisaoCategoriaMacro } = require('../models');

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function normalizarNome(value) {
  return String(value || '').trim();
}

module.exports = {
  async index(req, res) {
    try {
      const incluirInativas = String(req.query?.incluir_inativas || '').trim() === '1';
      const where = {};

      if (!incluirInativas || String(req.user?.perfil || '').toUpperCase() !== 'SUPERADMIN') {
        where.ativo = true;
      }

      const categorias = await ProvisaoCategoriaMacro.findAll({
        where,
        order: [['ordem_exibicao', 'ASC'], ['nome', 'ASC']]
      });

      return res.json(categorias);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar categorias macro do provisionamento financeiro' });
    }
  },

  async create(req, res) {
    try {
      const nome = normalizarNome(req.body?.nome);
      if (!nome) {
        return res.status(400).json({ error: 'Informe o nome da categoria macro.' });
      }

      const existente = await ProvisaoCategoriaMacro.findOne({
        where: {
          nome: { [Op.eq]: nome }
        }
      });

      if (existente) {
        return res.status(400).json({ error: 'Ja existe categoria macro com esse nome.' });
      }

      const categoria = await ProvisaoCategoriaMacro.create({
        nome,
        descricao: String(req.body?.descricao || '').trim() || null,
        ativo: parseBoolean(req.body?.ativo, true),
        ordem_exibicao: req.body?.ordem_exibicao != null && req.body?.ordem_exibicao !== ''
          ? Number(req.body.ordem_exibicao)
          : null
      });

      return res.status(201).json(categoria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar categoria macro do provisionamento financeiro' });
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Identificador invalido.' });
      }

      const categoria = await ProvisaoCategoriaMacro.findByPk(id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoria macro nao encontrada.' });
      }

      const nome = req.body?.nome != null ? normalizarNome(req.body.nome) : categoria.nome;
      if (!nome) {
        return res.status(400).json({ error: 'Informe o nome da categoria macro.' });
      }

      const existente = await ProvisaoCategoriaMacro.findOne({
        where: {
          nome: { [Op.eq]: nome },
          id: { [Op.ne]: categoria.id }
        }
      });

      if (existente) {
        return res.status(400).json({ error: 'Ja existe categoria macro com esse nome.' });
      }

      await categoria.update({
        nome,
        descricao: req.body?.descricao != null ? (String(req.body.descricao || '').trim() || null) : categoria.descricao,
        ativo: parseBoolean(req.body?.ativo, categoria.ativo),
        ordem_exibicao: req.body?.ordem_exibicao != null && req.body?.ordem_exibicao !== ''
          ? Number(req.body.ordem_exibicao)
          : categoria.ordem_exibicao
      });

      return res.json(categoria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar categoria macro do provisionamento financeiro' });
    }
  },

  async ativar(req, res) {
    try {
      const id = Number(req.params?.id);
      const categoria = await ProvisaoCategoriaMacro.findByPk(id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoria macro nao encontrada.' });
      }

      await categoria.update({ ativo: true });
      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao ativar categoria macro do provisionamento financeiro' });
    }
  },

  async desativar(req, res) {
    try {
      const id = Number(req.params?.id);
      const categoria = await ProvisaoCategoriaMacro.findByPk(id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoria macro nao encontrada.' });
      }

      await categoria.update({ ativo: false });
      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desativar categoria macro do provisionamento financeiro' });
    }
  }
};
