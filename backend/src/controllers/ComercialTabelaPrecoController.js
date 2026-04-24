const {
  ativarTabelaPrecoComercial,
  atualizarTabelaPrecoComercial,
  criarTabelaPrecoComercial,
  listarTabelasPrecoComerciais
} = require('../services/comercialService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarTabelasPrecoComerciais(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar tabelas de preco');
    }
  },

  async create(req, res) {
    try {
      const data = await criarTabelaPrecoComercial(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar tabela de preco');
    }
  },

  async update(req, res) {
    try {
      const data = await atualizarTabelaPrecoComercial(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar tabela de preco');
    }
  },

  async ativar(req, res) {
    try {
      const data = await ativarTabelaPrecoComercial(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao ativar tabela de preco');
    }
  }
};
