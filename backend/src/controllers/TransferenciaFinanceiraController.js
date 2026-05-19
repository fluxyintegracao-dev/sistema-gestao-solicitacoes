const {
  cancelarTransferenciaFinanceira,
  criarTransferenciaFinanceira,
  listarTransferenciasFinanceiras
} = require('../services/transferenciaFinanceiraService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      return res.json(await listarTransferenciasFinanceiras(req, req.query || {}));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar transferencias financeiras');
    }
  },

  async create(req, res) {
    try {
      const { transferencia } = await criarTransferenciaFinanceira(req, req.body || {});
      return res.status(201).json(transferencia);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao registrar transferencia financeira');
    }
  },

  async cancelar(req, res) {
    try {
      return res.json(await cancelarTransferenciaFinanceira(req, req.params.id, req.body || {}));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao cancelar transferencia financeira');
    }
  }
};
