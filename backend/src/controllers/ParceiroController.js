const { Parceiro, ParceiroCategoria } = require('../models');
const {
  atualizarParceiro,
  buscarParceiros,
  criarParceiro
} = require('../services/parceiroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const parceiros = await buscarParceiros(req.query || {});
      return res.json(parceiros);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar parceiros' });
    }
  },

  async show(req, res) {
    try {
      const parceiro = await Parceiro.findByPk(req.params.id, {
        include: [
          {
            model: ParceiroCategoria,
            as: 'categorias',
            through: { attributes: [] },
            where: { ativo: true },
            required: false
          }
        ]
      });
      if (!parceiro) {
        return res.status(404).json({ error: 'Parceiro nao encontrado' });
      }

      return res.json(parceiro);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar parceiro' });
    }
  },

  async create(req, res) {
    try {
      const parceiro = await criarParceiro(req.body || {});
      return res.status(201).json(parceiro);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar parceiro', { status: 400 });
    }
  },

  async update(req, res) {
    try {
      const parceiro = await atualizarParceiro(req.params.id, req.body || {});
      return res.json(parceiro);
    } catch (error) {
      const status = /nao encontrado/i.test(String(error.message || '')) ? 404 : 400;
      return responderErroController(res, error, 'Erro ao atualizar parceiro', { status });
    }
  }
};
