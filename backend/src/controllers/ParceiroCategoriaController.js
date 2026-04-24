const { Op } = require('sequelize');
const { ParceiroCategoria } = require('../models');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

module.exports = {
  async index(req, res) {
    try {
      const incluirInativos = String(req.query.incluir_inativos || '').trim() === '1';
      const termo = normalizeText(req.query.q);
      const where = incluirInativos ? {} : { ativo: true };

      if (termo) {
        where[Op.or] = [
          { nome: { [Op.like]: `%${termo}%` } }
        ];
      }

      const categorias = await ParceiroCategoria.findAll({
        where,
        order: [['nome', 'ASC']]
      });

      return res.json(categorias);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar categorias de parceiro' });
    }
  },

  async create(req, res) {
    try {
      const nome = String(req.body?.nome || '').trim();
      if (!nome) {
        return res.status(400).json({ error: 'Informe o nome da categoria' });
      }

      const categoria = await ParceiroCategoria.create({
        nome,
        ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true
      });

      return res.status(201).json(categoria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar categoria de parceiro' });
    }
  },

  async update(req, res) {
    try {
      const categoria = await ParceiroCategoria.findByPk(req.params.id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoria nao encontrada' });
      }

      const nome = req.body?.nome;
      if (nome !== undefined && !String(nome || '').trim()) {
        return res.status(400).json({ error: 'Informe o nome da categoria' });
      }

      await categoria.update({
        nome: nome !== undefined ? String(nome).trim() : categoria.nome,
        ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : categoria.ativo
      });

      return res.json(categoria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar categoria de parceiro' });
    }
  },

  async destroy(req, res) {
    try {
      const categoria = await ParceiroCategoria.findByPk(req.params.id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoria nao encontrada' });
      }

      await categoria.update({ ativo: false });
      return res.json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desativar categoria de parceiro' });
    }
  }
};
