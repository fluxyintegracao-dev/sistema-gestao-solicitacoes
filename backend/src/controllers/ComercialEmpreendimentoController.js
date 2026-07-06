const {
  atualizarEmpreendimento,
  criarEmpreendimento,
  listarEmpreendimentos,
  listarObrasComerciais
} = require('../services/comercialService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async obras(req, res) {
    try {
      const data = await listarObrasComerciais();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar obras comerciais');
    }
  },

  async index(req, res) {
    try {
      const data = await listarEmpreendimentos(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar empreendimentos');
    }
  },

  async create(req, res) {
    try {
      const data = await criarEmpreendimento(req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar empreendimento');
    }
  },

  async update(req, res) {
    try {
      const data = await atualizarEmpreendimento(req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar empreendimento');
    }
  }
};
