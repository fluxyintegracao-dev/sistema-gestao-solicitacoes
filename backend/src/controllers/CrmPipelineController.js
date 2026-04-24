const {
  listarPipelines,
  criarEtapaPipeline,
  atualizarEtapaPipeline,
  removerEtapaPipeline,
  listarMotivosPerda,
  kanbanLeads
} = require('../services/crmService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const pipelines = await listarPipelines();
      return res.json(pipelines);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar pipelines');
    }
  },

  async kanban(req, res) {
    try {
      const pipelineId = req.params.id || req.query.pipeline_id;
      const data = await kanbanLeads(pipelineId, req.query || {});
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao montar kanban');
    }
  },

  async createStage(req, res) {
    try {
      const etapa = await criarEtapaPipeline(req.params.id, req.body || {}, req.user?.id, req);
      return res.status(201).json(etapa);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar etapa do pipeline');
    }
  },

  async updateStage(req, res) {
    try {
      const etapa = await atualizarEtapaPipeline(req.params.id, req.body || {}, req.user?.id, req);
      return res.json(etapa);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar etapa do pipeline');
    }
  },

  async deleteStage(req, res) {
    try {
      const data = await removerEtapaPipeline(req.params.id, req.user?.id, req);
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao remover etapa do pipeline');
    }
  },

  async lossReasons(req, res) {
    try {
      const motivos = await listarMotivosPerda();
      return res.json(motivos);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar motivos de perda');
    }
  }
};
