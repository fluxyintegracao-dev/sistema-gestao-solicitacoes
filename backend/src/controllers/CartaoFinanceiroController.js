const {
  atualizarCartaoFinanceiro,
  criarCartaoFinanceiro,
  listarCartoesFinanceiros
} = require('../services/financeiroCadastroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const cartoes = await listarCartoesFinanceiros(req);
      return res.json(cartoes);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar cartoes financeiros');
    }
  },

  async create(req, res) {
    try {
      const cartao = await criarCartaoFinanceiro(req, req.body || {});
      return res.status(201).json(cartao);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar cartao financeiro');
    }
  },

  async update(req, res) {
    try {
      const cartao = await atualizarCartaoFinanceiro(req, req.params.id, req.body || {});
      return res.json(cartao);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar cartao financeiro');
    }
  }
};
