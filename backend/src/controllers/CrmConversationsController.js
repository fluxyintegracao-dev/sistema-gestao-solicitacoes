const {
  listarConversas,
  obterConversa,
  criarConversa,
  atualizarConversa,
  registrarMensagem,
  marcarConversaComoLida,
  listarTemplates,
  criarTemplate,
  atualizarTemplate
} = require('../services/crmConversationService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      return res.json(await listarConversas(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar conversas CRM');
    }
  },

  async show(req, res) {
    try {
      return res.json(await obterConversa(req.params.id, req.user?.id, req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao buscar conversa CRM');
    }
  },

  async create(req, res) {
    try {
      return res.status(201).json(await criarConversa(req.body || {}, req.user?.id, req));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar conversa CRM');
    }
  },

  async update(req, res) {
    try {
      return res.json(await atualizarConversa(req.params.id, req.body || {}, req.user?.id, req));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar conversa CRM');
    }
  },

  async createMessage(req, res) {
    try {
      return res.status(201).json(await registrarMensagem(req.params.id, req.body || {}, req.user?.id, req));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao registrar mensagem CRM');
    }
  },

  async markRead(req, res) {
    try {
      return res.json(await marcarConversaComoLida(req.params.id, req.user?.id, req));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao marcar conversa como lida');
    }
  },

  async templates(req, res) {
    try {
      return res.json(await listarTemplates(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar templates CRM');
    }
  },

  async createTemplate(req, res) {
    try {
      return res.status(201).json(await criarTemplate(req.body || {}, req.user?.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar template CRM');
    }
  },

  async updateTemplate(req, res) {
    try {
      return res.json(await atualizarTemplate(req.params.id, req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar template CRM');
    }
  }
};
