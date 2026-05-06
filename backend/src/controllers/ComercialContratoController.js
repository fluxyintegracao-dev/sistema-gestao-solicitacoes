const {
  atualizarContratoComercial,
  carregarContratoComercial,
  criarContratoComercial,
  distratarContratoComercial,
  excluirContratoComercial,
  listarContratosComerciais,
  sincronizarStatusFinanceiroContratoComercial,
  trocarUnidadeContratoComercial
} = require('../services/comercialService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarContratosComerciais(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar contratos comerciais');
    }
  },

  async show(req, res) {
    try {
      const data = await carregarContratoComercial(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar contrato comercial');
    }
  },

  async create(req, res) {
    try {
      const data = await criarContratoComercial(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar contrato comercial');
    }
  },

  async update(req, res) {
    try {
      const data = await atualizarContratoComercial(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar contrato comercial');
    }
  },

  async distratar(req, res) {
    try {
      const data = await distratarContratoComercial(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao distratar contrato comercial');
    }
  },

  async trocarUnidade(req, res) {
    try {
      const data = await trocarUnidadeContratoComercial(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao trocar unidade do contrato comercial');
    }
  },

  async sincronizarStatusFinanceiro(req, res) {
    try {
      const data = await sincronizarStatusFinanceiroContratoComercial(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao sincronizar status financeiro do contrato');
    }
  },

  async destroy(req, res) {
    try {
      const data = await excluirContratoComercial(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao excluir contrato comercial');
    }
  }
};
