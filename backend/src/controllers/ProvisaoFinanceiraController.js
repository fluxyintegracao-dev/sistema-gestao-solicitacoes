const {
  addComentarioProvisionamento,
  alterarStatusProvisionamento,
  createProvisionamento,
  getAnexoProvisionamentoLink,
  getProvisionamentoById,
  getProvisionamentoContext,
  listAnexosProvisionamento,
  listProvisionamentos,
  updateProvisionamento,
  uploadAnexosProvisionamento
} = require('../services/provisaoFinanceiraService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async contexto(req, res) {
    try {
      const data = await getProvisionamentoContext(req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao carregar contexto do provisionamento');
    }
  },

  async index(req, res) {
    try {
      const data = await listProvisionamentos(req.query || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar provisionamentos');
    }
  },

  async show(req, res) {
    try {
      const data = await getProvisionamentoById(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar detalhe do provisionamento');
    }
  },

  async create(req, res) {
    try {
      const data = await createProvisionamento(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar provisionamento');
    }
  },

  async update(req, res) {
    try {
      const data = await updateProvisionamento(req.params.id, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar provisionamento');
    }
  },

  async adicionarComentario(req, res) {
    try {
      const data = await addComentarioProvisionamento(
        req.params.id,
        req.body?.comentario,
        req.user
      );
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao registrar comentario no provisionamento');
    }
  },

  async listarAnexos(req, res) {
    try {
      const data = await listAnexosProvisionamento(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar anexos do provisionamento');
    }
  },

  async uploadAnexos(req, res) {
    try {
      const data = await uploadAnexosProvisionamento(req.params.id, req.files || [], req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao enviar anexos do provisionamento');
    }
  },

  async obterLinkAnexo(req, res) {
    try {
      const data = await getAnexoProvisionamentoLink(req.params.anexoId, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar link do anexo do provisionamento');
    }
  },

  async enviarAnalise(req, res) {
    try {
      const data = await alterarStatusProvisionamento(req.params.id, 'analise', req.body?.comentario, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao enviar provisionamento para analise');
    }
  },

  async aprovar(req, res) {
    try {
      const data = await alterarStatusProvisionamento(req.params.id, 'aprovar', req.body?.comentario, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao aprovar provisionamento');
    }
  },

  async cancelar(req, res) {
    try {
      const data = await alterarStatusProvisionamento(req.params.id, 'cancelar', req.body?.comentario, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao cancelar provisionamento');
    }
  },

  async realizar(req, res) {
    try {
      const data = await alterarStatusProvisionamento(req.params.id, 'realizar', req.body?.comentario, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao marcar provisionamento como realizado');
    }
  },

  async reabrir(req, res) {
    try {
      const data = await alterarStatusProvisionamento(req.params.id, 'reabrir', req.body?.comentario, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao reabrir provisionamento');
    }
  }
};
