const {
  listarTarefas,
  criarTarefa,
  atualizarTarefa,
  concluirTarefa,
  cancelarTarefa
} = require('../services/crmTaskService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarTarefas(req.query || {});
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar tarefas');
    }
  },

  async create(req, res) {
    try {
      const task = await criarTarefa(req.body || {}, req.user?.id, req);
      return res.status(201).json(task);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar tarefa');
    }
  },

  async update(req, res) {
    try {
      const task = await atualizarTarefa(req.params.id, req.body || {}, req.user?.id, req);
      return res.json(task);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar tarefa');
    }
  },

  async complete(req, res) {
    try {
      const task = await concluirTarefa(req.params.id, req.user?.id, req);
      return res.json(task);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao concluir tarefa');
    }
  },

  async cancel(req, res) {
    try {
      const task = await cancelarTarefa(req.params.id, req.user?.id, req);
      return res.json(task);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao cancelar tarefa');
    }
  }
};
