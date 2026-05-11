const {
  baixarFaturaCartao,
  carregarFaturaCartao,
  listarFaturasCartao
} = require('../services/faturaCartaoFinanceiroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const faturas = await listarFaturasCartao(req, req.query || {});
      return res.json(faturas);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar faturas de cartao');
    }
  },

  async show(req, res) {
    try {
      const fatura = await carregarFaturaCartao(req, req.params.id);
      return res.json(fatura);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar fatura de cartao');
    }
  },

  async baixar(req, res) {
    try {
      const fatura = await baixarFaturaCartao(req, req.params.id, req.body || {});
      return res.json(fatura);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao baixar fatura de cartao');
    }
  }
};
