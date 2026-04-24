const {
  atualizarCategoriaFinanceira,
  criarCategoriaFinanceira,
  listarCategoriasFinanceiras
} = require('../services/financeiroCadastroService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async index(req, res) {
    try {
      const categorias = await listarCategoriasFinanceiras(req);
      return res.json(categorias);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar categorias financeiras');
    }
  },

  async create(req, res) {
    try {
      const categoria = await criarCategoriaFinanceira(req, req.body || {});
      return res.status(201).json(categoria);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar categoria financeira');
    }
  },

  async update(req, res) {
    try {
      const categoria = await atualizarCategoriaFinanceira(req, req.params.id, req.body || {});
      return res.json(categoria);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao atualizar categoria financeira');
    }
  }
};
