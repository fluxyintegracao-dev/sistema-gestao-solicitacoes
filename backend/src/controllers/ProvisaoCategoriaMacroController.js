const {
  createCategoriaProvisionamento,
  listCategoriasProvisionamento,
  updateCategoriaProvisionamento,
  updateCategoriaProvisionamentoStatus
} = require('../services/provisaoFinanceiraService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listCategoriasProvisionamento(req.query || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar categorias macro do provisionamento');
    }
  },

  async create(req, res) {
    try {
      const data = await createCategoriaProvisionamento(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar categoria macro do provisionamento');
    }
  },

  async update(req, res) {
    try {
      const data = await updateCategoriaProvisionamento(req.params.id, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar categoria macro do provisionamento');
    }
  },

  async ativar(req, res) {
    try {
      const data = await updateCategoriaProvisionamentoStatus(req.params.id, true, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao ativar categoria macro do provisionamento');
    }
  },

  async desativar(req, res) {
    try {
      const data = await updateCategoriaProvisionamentoStatus(req.params.id, false, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao desativar categoria macro do provisionamento');
    }
  }
};
