const { Setor } = require('../models');
const runtimeCache = require('../utils/runtimeCache');

const CACHE_KEY_SETORES_ATIVOS = 'setores:ativos';
const CACHE_TTL_MS = 60 * 1000;

module.exports = {

  async index(req, res) {
    try {
      const cached = runtimeCache.get(CACHE_KEY_SETORES_ATIVOS);
      if (cached) {
        return res.json(cached);
      }

      const setores = await Setor.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });

      runtimeCache.set(CACHE_KEY_SETORES_ATIVOS, setores, CACHE_TTL_MS);

      return res.json(setores);

    } catch (error) {
      console.error('Erro ao listar setores:', error);
      return res.status(500).json({
        error: 'Erro ao buscar setores'
      });
    }
  },

  async create(req, res) {
    try {
      const { nome, codigo } = req.body;

      const setor = await Setor.create({
        nome,
        codigo
      });

      runtimeCache.del(CACHE_KEY_SETORES_ATIVOS);

      return res.status(201).json(setor);

    } catch (error) {
      console.error('Erro ao criar setor:', error);
      return res.status(500).json({
        error: 'Erro ao criar setor'
      });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, codigo } = req.body;

      if (!nome && !codigo) {
        return res.status(400).json({ error: 'Nada para atualizar' });
      }

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor nao encontrado' });
      }

      await setor.update({
        nome: nome || setor.nome,
        codigo: codigo ? String(codigo).toUpperCase() : setor.codigo
      });

      runtimeCache.del(CACHE_KEY_SETORES_ATIVOS);

      return res.json(setor);

    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      return res.status(500).json({
        error: 'Erro ao atualizar setor'
      });
    }
  },

  async ativar(req, res) {
    try {
      const { id } = req.params;

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      await setor.update({ ativo: true });
      runtimeCache.del(CACHE_KEY_SETORES_ATIVOS);

      return res.sendStatus(204);

    } catch (error) {
      console.error('Erro ao ativar setor:', error);
      return res.status(500).json({
        error: 'Erro ao ativar setor'
      });
    }
  },

  async desativar(req, res) {
    try {
      const { id } = req.params;

      const setor = await Setor.findByPk(id);
      if (!setor) {
        return res.status(404).json({ error: 'Setor não encontrado' });
      }

      await setor.update({ ativo: false });
      runtimeCache.del(CACHE_KEY_SETORES_ATIVOS);

      return res.sendStatus(204);

    } catch (error) {
      console.error('Erro ao desativar setor:', error);
      return res.status(500).json({
        error: 'Erro ao desativar setor'
      });
    }
  }

};
