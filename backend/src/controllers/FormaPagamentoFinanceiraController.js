const {
  atualizarFormaPagamentoFinanceira,
  criarFormaPagamentoFinanceira,
  listarFormasPagamentoFinanceiras
} = require('../services/financeiroCadastroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const formas = await listarFormasPagamentoFinanceiras(req);
      return res.json(formas);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar formas de pagamento');
    }
  },

  async create(req, res) {
    try {
      const forma = await criarFormaPagamentoFinanceira(req, req.body || {});
      return res.status(201).json(forma);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar forma de pagamento');
    }
  },

  async update(req, res) {
    try {
      const forma = await atualizarFormaPagamentoFinanceira(req, req.params.id, req.body || {});
      return res.json(forma);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar forma de pagamento');
    }
  }
};
