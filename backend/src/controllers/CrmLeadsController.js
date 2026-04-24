const {
  listarLeads,
  exportarLeadsCsv,
  obterLead,
  criarLead,
  atualizarLead,
  alterarEtapa,
  registrarPerda,
  registrarConversao,
  arquivarLead,
  redistribuirLead,
  listarCandidatosRedistribuicao
} = require('../services/crmService');
const { listarInteracoes, registrarInteracao } = require('../services/crmInteractionService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarLeads(req.query || {});
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar leads');
    }
  },

  async export(req, res) {
    try {
      const data = await exportarLeadsCsv(req.query || {}, req.user?.id, req);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="crm-leads-${timestamp}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(`\uFEFF${data.csv}`);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao exportar leads');
    }
  },

  async show(req, res) {
    try {
      const lead = await obterLead(req.params.id);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao buscar lead');
    }
  },

  async create(req, res) {
    try {
      const lead = await criarLead(req.body || {}, req.user?.id, req);
      return res.status(201).json(lead);
    } catch (error) {
      if (error.status === 409) {
        return res.status(409).json({ error: error.message, duplicateId: error.duplicateId });
      }
      return responderErroController(res, error, 'Erro ao criar lead');
    }
  },

  async redistributionCandidates(req, res) {
    try {
      const data = await listarCandidatosRedistribuicao();
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar candidatos de redistribuicao');
    }
  },

  async update(req, res) {
    try {
      const lead = await atualizarLead(req.params.id, req.body || {}, req.user?.id, req);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar lead');
    }
  },

  async changeStage(req, res) {
    try {
      const { stage_id } = req.body || {};
      if (!stage_id) return res.status(400).json({ error: 'stage_id e obrigatorio' });
      const lead = await alterarEtapa(req.params.id, stage_id, req.user?.id, req);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao alterar etapa do lead');
    }
  },

  async registerLoss(req, res) {
    try {
      const { motivo_id, obs } = req.body || {};
      const lead = await registrarPerda(req.params.id, motivo_id, obs, req.user?.id, req);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao registrar perda');
    }
  },

  async registerConversion(req, res) {
    try {
      const lead = await registrarConversao(req.params.id, req.user?.id, req);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao registrar conversao');
    }
  },

  async archive(req, res) {
    try {
      await arquivarLead(req.params.id, req.user?.id, req);
      return res.json({ ok: true });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao arquivar lead');
    }
  },

  async redistribute(req, res) {
    try {
      const lead = await redistribuirLead(req.params.id, req.body || {}, req.user?.id, req);
      return res.json(lead);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao redistribuir lead');
    }
  },

  async listInteractions(req, res) {
    try {
      const data = await listarInteracoes(req.params.id, req.query || {});
      return res.json(data);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar interacoes');
    }
  },

  async createInteraction(req, res) {
    try {
      const interaction = await registrarInteracao(req.params.id, req.body || {}, req.user?.id, req);
      return res.status(201).json(interaction);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao registrar interacao');
    }
  }
};
