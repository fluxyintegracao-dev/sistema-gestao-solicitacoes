const {
  atualizarContaBancaria,
  criarContaBancaria,
  listarContasBancarias
} = require('../services/financeiroCadastroService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async index(req, res) {
    try {
      const contas = await listarContasBancarias(req);
      return res.json(contas);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar contas bancarias');
    }
  },

  async create(req, res) {
    try {
      const conta = await criarContaBancaria(req, req.body || {});
      return res.status(201).json(conta);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar conta bancaria');
    }
  },

  async update(req, res) {
    try {
      const conta = await atualizarContaBancaria(req, req.params.id, req.body || {});
      return res.json(conta);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao atualizar conta bancaria');
    }
  }
};
