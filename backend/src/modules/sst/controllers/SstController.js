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

  async monitoramentoProducao(req, res) {
    try {
      const data = await sstService.monitoramentoProducao(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar monitoramento de producao SST' });
    }
  },

  async observabilidadeAvancada(req, res) {
    try {
      const data = await sstService.observabilidadeAvancada(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar observabilidade avancada SST' });
    }
  },

  async statusFilas(req, res) {
    try {
      const data = await sstService.statusFilas(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar filas SST' });
    }
  },

  async enqueueJob(req, res) {
    try {
      const data = await sstService.enqueueJob(req.body || {}, req.user);
      return res.status(data.ignored ? 200 : 201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao enfileirar job SST' });
    }
  },

  async processarWorker(req, res) {
    try {
      const data = await sstService.processarWorker(req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao processar worker SST' });
    }
  },

  async cacheStatus(req, res) {
    try {
      const data = await sstService.cacheStatus();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar cache SST' });
    }
  },

  async limparCacheExpirado(req, res) {
    try {
      const data = await sstService.limparCacheExpirado();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao limpar cache SST' });
    }
  },

  async qualityCheck(req, res) {
    try {
      const data = await sstService.qualityCheck(req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao executar quality check SST' });
    }
  },

  async qualidadeResumo(req, res) {
    try {
      const data = await sstService.qualidadeResumo();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar qualidade SST' });
    }
  },

  async governancaResumo(req, res) {
    try {
      const data = await sstService.governancaResumo(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar governanca SST' });
    }
  },

  async registrarGovernanca(req, res) {
    try {
      const data = await sstService.registrarGovernanca(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao registrar governanca SST' });
    }
  },

  async registrarPerformance(req, res) {
    try {
      const data = await sstService.registrarPerformance(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao registrar performance SST' });
    }
  },

  async rolloutStatus(req, res) {
    try {
      const data = await sstService.rolloutStatus(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar rollout SST' });
    }
  },

  async telemetriaResumo(req, res) {
    try {
      const data = await sstService.telemetriaResumo(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar telemetria SST' });
    }
  },

  async registrarTelemetria(req, res) {
    try {
      const data = await sstService.registrarTelemetria(req.body || {}, req.user);
      return res.status(data.registrada ? 201 : 200).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao registrar telemetria SST' });
    }
  },

  async hardeningStatus(req, res) {
    try {
      const data = await sstService.hardeningStatus(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao carregar hardening SST' });
    }
  },

  async gerarAlertasOperacionais(req, res) {
    try {
      const data = await sstService.gerarAlertasOperacionais(req.query, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao gerar alertas operacionais SST' });
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
        texto_extraido: req.body?.texto_extraido || req.body?.texto || null,
        usuario_id: req.user?.id || null
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao analisar documento SST com IA' });
    }
  },

  async aprovarAnaliseIa(req, res) {
    try {
      const data = await sstService.aprovarAnaliseIa(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao aprovar sugestao de IA documental SST' });
    }
  },

  async rejeitarAnaliseIa(req, res) {
    try {
      const data = await sstService.rejeitarAnaliseIa(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao rejeitar sugestao de IA documental SST' });
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

  async esocialEventos(req, res) {
    try {
      const data = await sstService.esocialEventos(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar eventos eSocial SST' });
    }
  },

  async esocialLotes(req, res) {
    try {
      const data = await sstService.esocialLotes(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar lotes eSocial SST' });
    }
  },

  async esocialRetornos(req, res) {
    try {
      const data = await sstService.esocialRetornos(req.query);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar retornos eSocial SST' });
    }
  },

  async esocialCertificadoStatus(req, res) {
    try {
      const data = await sstService.esocialCertificadoStatus(req.query, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao validar certificado eSocial SST' });
    }
  },

  async esocialGerarXml(req, res) {
    try {
      const data = await sstService.esocialGerarXml(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao gerar XML eSocial SST' });
    }
  },

  async esocialValidarXml(req, res) {
    try {
      const data = await sstService.esocialValidarXml(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao validar XML eSocial SST' });
    }
  },

  async esocialAssinarXml(req, res) {
    try {
      const data = await sstService.esocialAssinarXml(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao assinar XML eSocial SST' });
    }
  },

  async esocialCriarLoteRestrita(req, res) {
    try {
      const data = await sstService.esocialCriarLoteRestrita(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar lote eSocial restrito' });
    }
  },

  async esocialEnviarRestrita(req, res) {
    try {
      const data = await sstService.esocialEnviarRestrita(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao enviar lote eSocial para producao restrita' });
    }
  },

  async esocialConsultarRetorno(req, res) {
    try {
      const data = await sstService.esocialConsultarRetorno(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao consultar retorno eSocial restrito' });
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
