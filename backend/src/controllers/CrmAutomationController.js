const {
  listarAutomacoes,
  criarAutomacao,
  atualizarAutomacao,
  ativarAutomacao,
  desativarAutomacao
} = require('../services/crmAutomationService');
const {
  executarCicloAutomacoesCrm,
  listarExecucoesAutomacaoCrm
} = require('../services/crmAutomationRuntimeService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      return res.json(await listarAutomacoes(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar automacoes CRM');
    }
  },

  async create(req, res) {
    try {
      return res.status(201).json(await criarAutomacao(req.body || {}, req.user?.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar automacao CRM');
    }
  },

  async update(req, res) {
    try {
      return res.json(await atualizarAutomacao(req.params.id, req.body || {}, req.user?.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar automacao CRM');
    }
  },

  async activate(req, res) {
    try {
      return res.json(await ativarAutomacao(req.params.id, req.user?.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao ativar automacao CRM');
    }
  },

  async deactivate(req, res) {
    try {
      return res.json(await desativarAutomacao(req.params.id, req.user?.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao desativar automacao CRM');
    }
  },

  async runCycle(req, res) {
    try {
      return res.json(await executarCicloAutomacoesCrm({ actorUserId: req.user?.id || null, manual: true }));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao executar ciclo de automacoes CRM');
    }
  },

  async executions(req, res) {
    try {
      return res.json(await listarExecucoesAutomacaoCrm(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar execucoes de automacao CRM');
    }
  }
};
