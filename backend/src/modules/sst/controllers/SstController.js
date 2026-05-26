'use strict';

const sstService = require('../services/sstService');
const { getSstConfig, saveSstConfig } = require('../services/sstConfigService');
const { gerarEventosVencimentoSst } = require('../services/sstEventService');

module.exports = {
  async config(req, res) {
    try {
      const data = await getSstConfig();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar configuracoes SST' });
    }
  },

  async updateConfig(req, res) {
    try {
      const data = await saveSstConfig(req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao salvar configuracoes SST' });
    }
  },

  async dashboard(req, res) {
    try {
      const data = await sstService.dashboard(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar dashboard SST' });
    }
  },

  async relatorioOperacional(req, res) {
    try {
      const data = await sstService.relatorioOperacional(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar relatorio operacional SST' });
    }
  },

  async conformidade(req, res) {
    try {
      const data = await sstService.analisarConformidadeSst(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar conformidade SST' });
    }
  },

  async executivo(req, res) {
    try {
      const data = await sstService.dashboardExecutivo(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar dashboard executivo SST' });
    }
  },

  async heatmap(req, res) {
    try {
      const data = await sstService.heatmap(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar heatmap SST' });
    }
  },

  async centroOperacional(req, res) {
    try {
      const data = await sstService.centroOperacional(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar centro operacional SST' });
    }
  },

  async featureFlags(req, res) {
    try {
      const data = await sstService.featureFlags();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar feature flags SST' });
    }
  },

  async observabilidade(req, res) {
    try {
      const data = await sstService.observabilidade(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar observabilidade SST' });
    }
  },

  async checklistHomologacao(req, res) {
    try {
      const data = await sstService.checklistHomologacao();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar checklist de homologacao SST' });
    }
  },

  async homologarWorkflows(req, res) {
    try {
      const data = await sstService.homologarWorkflows(req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao homologar workflows SST' });
    }
  },

  async simularHomologacao(req, res) {
    try {
      const data = await sstService.simularHomologacao();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao simular homologacao SST' });
    }
  },

  async inteligenciaOperacional(req, res) {
    try {
      const data = await sstService.inteligenciaOperacional(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar inteligencia operacional SST' });
    }
  },

  async recomendacoes(req, res) {
    try {
      const data = await sstService.recomendacoes(req.query, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao gerar recomendacoes SST' });
    }
  },

  async recalcularScore(req, res) {
    try {
      const data = await sstService.recalcularScore(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao recalcular score SST' });
    }
  },

  async timeline(req, res) {
    try {
      const data = await sstService.timelineColaborador(req.params.colaboradorId);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar timeline SST' });
    }
  },

  async revisarColaborador(req, res) {
    try {
      const data = await sstService.revisarConformidadeColaborador({
        colaborador_id: req.params.colaboradorId,
        motivo: req.body?.motivo,
        alteracao: req.body?.alteracao,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao revisar conformidade SST' });
    }
  },

  async avaliarBloqueios(req, res) {
    try {
      const data = await sstService.avaliarBloqueiosColaborador({
        colaborador_id: req.params.colaboradorId,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao avaliar bloqueios SST' });
    }
  },

  async syncNotifications(req, res) {
    try {
      const data = await sstService.sincronizarNotificacoesSst({ usuario_id: req.user?.id || null });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao sincronizar notificacoes SST' });
    }
  },

  async markNotificationRead(req, res) {
    try {
      const data = await sstService.marcarNotificacaoLida(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao marcar notificacao SST' });
    }
  },

  async predictionReadiness(req, res) {
    try {
      const data = await sstService.predictionReadiness();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar prontidao preditiva SST' });
    }
  },

  async processarAutomacoes(req, res) {
    try {
      const data = await sstService.processarAutomacoes({
        limit: req.body?.limit || req.query?.limit,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao processar automacoes SST' });
    }
  },

  async processarWorkflows(req, res) {
    try {
      const data = await sstService.processarWorkflows({
        evento_id: req.body?.evento_id || req.query?.evento_id,
        limit: req.body?.limit || req.query?.limit,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao processar workflows SST' });
    }
  },

  async processarIntegracaoRhdp(req, res) {
    try {
      const data = await sstService.processarIntegracaoRhdp(req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao processar integracao SST/RHDP' });
    }
  },

  async processarIntegracaoObra(req, res) {
    try {
      if (!/^\d+$/.test(String(req.params.obraId || ''))) {
        return res.status(400).json({ error: 'Obra SST invalida.' });
      }
      const data = await sstService.processarIntegracaoObra(req.params.obraId, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao processar integracao SST/Obras' });
    }
  },

  async analisarDocumentoIa(req, res) {
    try {
      const data = await sstService.analisarDocumentoIa(req.params.id, {
        provider: req.body?.provider || req.query?.provider || null,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao analisar documento SST com IA' });
    }
  },

  async visaoObra(req, res) {
    try {
      const data = await sstService.visaoObra(req.params.obraId);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar visao SST da obra' });
    }
  },

  async index(req, res) {
    try {
      const data = await sstService.listResource(req.params.resource, req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar registros SST' });
    }
  },

  async show(req, res) {
    try {
      const data = await sstService.getResource(req.params.resource, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao buscar registro SST' });
    }
  },

  async create(req, res) {
    try {
      const data = await sstService.createResource(req.params.resource, req.body, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar registro SST' });
    }
  },

  async update(req, res) {
    try {
      const data = await sstService.updateResource(req.params.resource, req.params.id, req.body, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao atualizar registro SST' });
    }
  },

  async uploadDocument(req, res) {
    try {
      const data = await sstService.uploadDocument(req.file, req.body, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao enviar documento SST' });
    }
  },

  async documentUrl(req, res) {
    try {
      const data = await sstService.getDocumentSignedUrl(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao assinar documento SST' });
    }
  },

  async syncEvents(req, res) {
    try {
      const data = await gerarEventosVencimentoSst({ usuario_id: req.user?.id || null });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao sincronizar eventos SST' });
    }
  }
};
