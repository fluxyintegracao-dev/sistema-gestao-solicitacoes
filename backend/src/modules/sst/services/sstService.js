'use strict';

const { Op } = require('sequelize');
const {
  EmpresaGrupo,
  Obra,
  RhColaborador,
  User,
  sequelize,
  SstAso,
  SstDocumento,
  SstEpiEntrega,
  SstAcidente,
  SstEventoEsocial,
  SstEventoOperacional,
  SstExame,
  SstExposicao,
  SstHistorico,
  SstRisco,
  SstTreinamento
} = require('../../../models');
const { uploadToS3, getPresignedUrl } = require('../../../services/s3');
const { ValidationError } = require('../../../middlewares/validation');
const { SST_EVENT_TYPES, SST_RESOURCE_CONFIG, SST_VALIDITY_ALERT_DAYS } = require('../constants/sstConstants');
const { getSstConfig } = require('./sstConfigService');
const { registrarEventoSst } = require('./sstEventService');
const { analisarConformidadeSst } = require('../compliance/sstComplianceEngine');
const { gerarAnalyticsSst } = require('../analytics/sstAnalyticsService');
const {
  gerarDashboardExecutivoSst,
  gerarHeatmapSst
} = require('../analytics/sstExecutiveAnalyticsService');
const { gerarCentroOperacionalCorporativoSst } = require('../analytics/sstCorporateCenterService');
const { automatizarVencimentosProximos, processarEventosAbertosSst } = require('../automation/sstAutomationService');
const { avaliarBloqueiosColaborador } = require('../blocking/sstBlockingService');
const { getCacheStatusSst, limparCacheExpiradoSst } = require('../cache/sstCacheService');
const { SST_AI_READINESS } = require('../ai/sstAiReadiness');
const {
  analisarDocumentoSstComIa,
  aprovarSugestaoAnaliseDocumento,
  rejeitarSugestaoAnaliseDocumento,
  getDocumentAnalysisReadiness
} = require('../ai/document-analysis/sstDocumentAnalysisService');
const { gerarInteligenciaOperacionalSst } = require('../ai/operational-intelligence/sstOperationalIntelligenceService');
const { getSstDocumentAiReadiness } = require('../ai/sstDocumentAiPipeline');
const { gerarVisaoOperacionalObraSst } = require('../integrations/obras/sstObraIntegrationService');
const { processarIntegracaoObraSst } = require('../integrations/obras/sstObrasControlledIntegrationService');
const { processarEventoRhdpSst } = require('../integrations/rhdp/sstRhdpControlledIntegrationService');
const { getSstFeatureFlags } = require('../feature-flags/sstFeatureFlagsService');
const { gerarResumoGovernancaSst, registrarGovernanceLogSst } = require('../governance/sstGovernanceService');
const {
  gerarChecklistHomologacaoSst,
  homologarWorkflowsSst,
  simularMassaHomologacaoSst
} = require('../homologation/sstHomologationService');
const { gerarAlertasOperacionaisSst } = require('../alerts/sstAlertService');
const { gerarStatusHardeningSst } = require('../hardening/sstHardeningService');
const { sincronizarNotificacoesSst, marcarNotificacaoLida } = require('../notifications/sstNotificationService');
const { gerarObservabilidadeSst } = require('../observability/sstObservabilityService');
const { gerarObservabilidadeAvancadaSst, registrarPerformanceMetricSst } = require('../observability/sstAdvancedObservabilityService');
const { getSstPredictionReadiness } = require('../prediction/sstPredictionService');
const { gerarMonitoramentoProducaoSst } = require('../production/sstProductionReadinessService');
const { executarQualityCheckSst, gerarResumoQualidadeSst } = require('../quality/sstQualityService');
const { enqueueSstJob, gerarStatusFilasSst } = require('../queues/sstQueueService');
const { gerarRecomendacoesSst } = require('../recommendations/sstRecommendationService');
const { gerarStatusRolloutSst } = require('../rollout/sstRolloutService');
const { recalcularScoreSst } = require('../scoring/sstScoringService');
const { gerarResumoTelemetriaSst, registrarMetricaSst } = require('../telemetry/sstTelemetryService');
const { gerarTimelineColaborador } = require('../timeline/sstTimelineService');
const { processarWorkerSst } = require('../workers/sstWorkerService');
const { processarFilaWorkflowSst, processarEventoWorkflow } = require('../workflow-engine/sstWorkflowEngineService');
const { revisarConformidadeColaborador } = require('../workflows/sstWorkflowService');
const esocialControlledService = require('../../esocial/services/EsocialSstControlledService');

function getConfig(resource) {
  const config = SST_RESOURCE_CONFIG[String(resource || '').trim().toLowerCase()];
  if (!config) throw new ValidationError('Recurso SST invalido.', 404);
  return config;
}

function getModel(resource) {
  const config = getConfig(resource);
  const model = require('../../../models')[config.modelName];
  if (!model) throw new ValidationError('Modelo SST indisponivel.', 500);
  return model;
}

function buildWhere(query = {}, model = null) {
  const where = {};
  if (query.empresa_id && (!model || model.rawAttributes?.empresa_id)) where.empresa_id = query.empresa_id;
  if (query.obra_id && (!model || model.rawAttributes?.obra_id)) where.obra_id = query.obra_id;
  if (query.colaborador_id && (!model || model.rawAttributes?.colaborador_id)) where.colaborador_id = query.colaborador_id;
  if (query.status && (!model || model.rawAttributes?.status)) where.status = query.status;
  if (typeof query.ativo === 'boolean' && (!model || model.rawAttributes?.ativo)) where.ativo = query.ativo;
  if (query.search) {
    const searchable = ['nome', 'titulo', 'descricao', 'responsavel', 'medico_responsavel', 'tipo_evento', 'mensagem']
      .filter((field) => !model || model.rawAttributes?.[field]);
    if (searchable.length) {
      where[Op.or] = searchable.map((field) => ({ [field]: { [Op.like]: `%${query.search}%` } }));
    }
  }
  return where;
}

function buildInclude(model) {
  const include = [];
  if (model.rawAttributes?.empresa_id) {
    include.push({ model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'] });
  }
  if (model.rawAttributes?.obra_id) {
    include.push({ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'] });
  }
  if (model.rawAttributes?.colaborador_id) {
    include.push({ model: RhColaborador, as: 'colaborador', attributes: ['id', 'nome', 'cpf', 'matricula', 'cargo', 'status'] });
  }
  if (model.rawAttributes?.ambiente_id) {
    const { SstAmbienteTrabalho } = require('../../../models');
    include.push({ model: SstAmbienteTrabalho, as: 'ambiente', attributes: ['id', 'nome', 'tipo_ambiente'] });
  }
  if (model.rawAttributes?.agente_nocivo_id) {
    const { SstAgenteNocivo } = require('../../../models');
    include.push({ model: SstAgenteNocivo, as: 'agenteNocivo', attributes: ['id', 'nome', 'tipo_agente'] });
  }
  if (model.rawAttributes?.politica_id) {
    const { SstPoliticaBloqueio } = require('../../../models');
    include.push({ model: SstPoliticaBloqueio, as: 'politica', attributes: ['id', 'codigo', 'nome', 'tipo_bloqueio'] });
  }
  if (model.rawAttributes?.workflow_id) {
    const { SstWorkflow } = require('../../../models');
    include.push({ model: SstWorkflow, as: 'workflow', attributes: ['id', 'codigo', 'nome', 'gatilho_evento'] });
  }
  if (model.rawAttributes?.documento_id) {
    const { SstDocumento } = require('../../../models');
    include.push({ model: SstDocumento, as: 'documento', attributes: ['id', 'tipo_documento', 'titulo', 'status'] });
  }
  if (model.rawAttributes?.usuario_id) {
    include.push({ model: User, as: 'usuario', attributes: ['id', 'nome', 'email'] });
  }
  if (model.rawAttributes?.responsavel_id) {
    include.push({ model: User, as: 'responsavel', attributes: ['id', 'nome', 'email'] });
  }
  if (model.rawAttributes?.criado_por) {
    include.push({ model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] });
  }
  return include;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function alertDate(days = SST_VALIDITY_ALERT_DAYS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || SST_VALIDITY_ALERT_DAYS));
  return date.toISOString().slice(0, 10);
}

async function listResource(resource, query = {}) {
  const config = getConfig(resource);
  const model = getModel(resource);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(Math.max(1, Number(query.limit || 50)), 200);
  const { count, rows } = await model.findAndCountAll({
    where: buildWhere(query, model),
    include: buildInclude(model),
    order: config.listOrder || [['updatedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });
  return { rows, total: count, page, limit };
}

async function getResource(resource, id) {
  const model = getModel(resource);
  const item = await model.findByPk(id, { include: buildInclude(model) });
  if (!item) throw new ValidationError('Registro SST nao encontrado.', 404);
  return item;
}

async function createResource(resource, payload, user) {
  const config = getConfig(resource);
  const model = getModel(resource);
  if (!config.createFields?.length) {
    throw new ValidationError('Este recurso SST nao permite criacao direta.', 400);
  }
  const item = await sequelize.transaction(async (transaction) => {
    const created = await model.create({
      ...payload,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    }, { transaction });

    await emitEventForResource(resource, created, user, transaction);
    await registrarHistoricoSst({
      resource,
      item: created,
      acao: 'CRIADO',
      depois: created.toJSON(),
      user,
      transaction
    });
    return created;
  });

  return getResource(resource, item.id);
}

async function updateResource(resource, id, payload, user) {
  const config = getConfig(resource);
  if (!config.updateFields?.length) {
    throw new ValidationError('Este recurso SST nao permite edicao direta.', 400);
  }
  const item = await getResource(resource, id);
  const antes = item.toJSON();
  await sequelize.transaction(async (transaction) => {
    await item.update({
      ...payload,
      atualizado_por: user?.id || null
    }, { transaction });
    await emitEventForResource(resource, item, user, transaction);
    await registrarHistoricoSst({
      resource,
      item,
      acao: 'ATUALIZADO',
      antes,
      depois: item.toJSON(),
      user,
      transaction
    });
  });
  return getResource(resource, id);
}

async function uploadDocument(file, metadata, user) {
  if (!file?.buffer) {
    throw new ValidationError('Arquivo SST obrigatorio.');
  }

  const arquivo_url = await uploadToS3(file, 'sst/documentos');
  return createResource('documentos', {
    ...metadata,
    arquivo_url,
    nome_original: file.originalname,
    mimetype: file.mimetype,
    tamanho_bytes: file.size
  }, user);
}

async function getDocumentSignedUrl(id) {
  const documento = await getResource('documentos', id);
  if (!documento.arquivo_url) {
    throw new ValidationError('Documento sem arquivo vinculado.', 404);
  }
  return {
    id: documento.id,
    url: await getPresignedUrl(documento.arquivo_url, 300)
  };
}

async function dashboard(query = {}) {
  const sstConfig = await getSstConfig();
  const alertDays = Number(sstConfig?.dias_alerta_validade || SST_VALIDITY_ALERT_DAYS);
  const baseQuery = { ...query, search: null };
  const riscoWhere = buildWhere(baseQuery, SstRisco);
  const asoWhere = buildWhere(baseQuery, SstAso);
  const exameWhere = buildWhere(baseQuery, SstExame);
  const epiWhere = buildWhere(baseQuery, SstEpiEntrega);
  const treinamentoWhere = buildWhere(baseQuery, SstTreinamento);
  const documentoWhere = buildWhere(baseQuery, SstDocumento);
  const validadeExameWhere = {
    ...exameWhere,
    validade: { [Op.between]: [todayDate(), alertDate(alertDays)] }
  };
  const validadeAsoWhere = {
    ...asoWhere,
    validade: { [Op.between]: [todayDate(), alertDate(alertDays)] }
  };
  const asoVencidosWhere = {
    ...asoWhere,
    validade: { [Op.lt]: todayDate() }
  };
  const vencidosExameWhere = {
    ...exameWhere,
    validade: { [Op.lt]: todayDate() }
  };
  const validadeEpiWhere = { ...epiWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };
  const validadeTreinamentoWhere = { ...treinamentoWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };
  const validadeDocumentoWhere = { ...documentoWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };
  const epiVencidosWhere = { ...epiWhere, validade: { [Op.lt]: todayDate() } };
  const treinamentoVencidosWhere = { ...treinamentoWhere, validade: { [Op.lt]: todayDate() } };
  const conformidade = await analisarConformidadeSst(baseQuery);
  const analytics = await gerarAnalyticsSst(baseQuery);

  const [
    riscosCriticos,
    riscosTotal,
    asoTotal,
    asoVencendo,
    asoVencidos,
    colaboradoresInaptos,
    examesVencendo,
    examesVencidos,
    epiVencendo,
    epiVencidos,
    treinamentosVencendo,
    treinamentosVencidos,
    documentosVencendo
  ] = await Promise.all([
    SstRisco.count({ where: { ...riscoWhere, severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true } }),
    SstRisco.count({ where: { ...riscoWhere, ativo: true } }),
    SstAso.count({ where: asoWhere }),
    SstAso.count({ where: validadeAsoWhere }),
    SstAso.count({ where: asoVencidosWhere }),
    SstAso.count({ where: { ...asoWhere, apto: false } }),
    SstExame.count({ where: validadeExameWhere }),
    SstExame.count({ where: vencidosExameWhere }),
    SstEpiEntrega.count({ where: validadeEpiWhere }),
    SstEpiEntrega.count({ where: epiVencidosWhere }),
    SstTreinamento.count({ where: validadeTreinamentoWhere }),
    SstTreinamento.count({ where: treinamentoVencidosWhere }),
    SstDocumento.count({ where: validadeDocumentoWhere })
  ]);

  const complianceScore = conformidade.compliance_score;

  return {
    periodo_alerta_dias: alertDays,
    cards: {
      riscos_total: riscosTotal,
      riscos_criticos: riscosCriticos,
      asos_total: asoTotal,
      aso_vencendo: asoVencendo,
      aso_vencidos: asoVencidos,
      colaboradores_inaptos: colaboradoresInaptos,
      exames_vencendo: examesVencendo,
      exames_vencidos: examesVencidos,
      epi_vencendo: epiVencendo,
      epi_vencidos: epiVencidos,
      treinamentos_vencendo: treinamentosVencendo,
      treinamentos_vencidos: treinamentosVencidos,
      documentos_vencendo: documentosVencendo,
      pendencias_total: conformidade.pendencias_total,
      pendencias_criticas: conformidade.pendencias_criticas,
      compliance_score: complianceScore
    },
    conformidade,
    analytics
  };
}

async function relatorioOperacional(query = {}) {
  const sstConfig = await getSstConfig();
  const baseQuery = { ...query, search: null };
  const filtros = {
    empresa_id: baseQuery.empresa_id || null,
    obra_id: baseQuery.obra_id || null,
    colaborador_id: baseQuery.colaborador_id || null
  };

  const dashboardData = await dashboard(baseQuery);
  const [
    riscosCriticos,
    acidentesRecentes,
    eventosAbertos,
    documentosPendentes,
    exposicoesRecentes,
    esocialEventos,
    historicosRecentes,
    conformidade,
    analytics
  ] = await Promise.all([
    SstRisco.findAll({
      where: { ...buildWhere(baseQuery, SstRisco), severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true },
      include: buildInclude(SstRisco),
      order: [['severidade', 'DESC'], ['updatedAt', 'DESC']],
      limit: 50
    }),
    SstAcidente.findAll({
      where: buildWhere(baseQuery, SstAcidente),
      include: buildInclude(SstAcidente),
      order: [['data_ocorrencia', 'DESC'], ['id', 'DESC']],
      limit: 50
    }),
    SstEventoOperacional.findAll({
      where: { ...buildWhere(baseQuery, SstEventoOperacional), status: 'ABERTO' },
      include: buildInclude(SstEventoOperacional),
      order: [['createdAt', 'DESC']],
      limit: 80
    }),
    SstDocumento.findAll({
      where: { ...buildWhere(baseQuery, SstDocumento), status: { [Op.in]: ['ENVIADO', 'REJEITADO', 'VENCIDO'] } },
      include: buildInclude(SstDocumento),
      order: [['validade', 'ASC'], ['updatedAt', 'DESC']],
      limit: 50
    }),
    SstExposicao.findAll({
      where: buildWhere(baseQuery, SstExposicao),
      include: buildInclude(SstExposicao),
      order: [['data_inicio', 'DESC'], ['id', 'DESC']],
      limit: 50
    }),
    SstEventoEsocial.findAll({
      where: buildWhere(baseQuery, SstEventoEsocial),
      include: buildInclude(SstEventoEsocial),
      order: [['updatedAt', 'DESC']],
      limit: 50
    }),
    SstHistorico.findAll({
      where: buildWhere(baseQuery, SstHistorico),
      include: buildInclude(SstHistorico),
      order: [['createdAt', 'DESC']],
      limit: 80
    }),
    analisarConformidadeSst(baseQuery),
    gerarAnalyticsSst(baseQuery)
  ]);

  const statusEsocial = esocialEventos.reduce((acc, item) => {
    const status = item.status || 'SEM_STATUS';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    filtros,
    cards: dashboardData.cards,
    periodo_alerta_dias: dashboardData.periodo_alerta_dias,
    prontidao_esocial: {
      transmissao_habilitada: Boolean(sstConfig.esocial_transmissao_habilitada),
      documentacao_oficial_validada: Boolean(sstConfig.esocial_documentacao_oficial_validada),
      ambiente: sstConfig.esocial_ambiente || 'NAO_CONFIGURADO',
      observacoes_tecnicas: sstConfig.esocial_observacoes_tecnicas || null,
      eventos_preparados: esocialEventos.length,
      status: statusEsocial,
      bloqueio_produto: !sstConfig.esocial_transmissao_habilitada || !sstConfig.esocial_documentacao_oficial_validada
    },
    riscos_criticos: riscosCriticos,
    acidentes_recentes: acidentesRecentes,
    exposicoes_recentes: exposicoesRecentes,
    conformidade,
    analytics,
    ia_prontidao: SST_AI_READINESS,
    eventos_abertos: eventosAbertos,
    documentos_pendentes: documentosPendentes,
    esocial_eventos: esocialEventos,
    historicos_recentes: historicosRecentes
  };
}

async function dashboardExecutivo(query = {}) {
  const executivo = await gerarDashboardExecutivoSst(query);
  return {
    ...executivo,
    predicao: getSstPredictionReadiness(),
    ia_documental: {
      ...getSstDocumentAiReadiness(),
      fase4: getDocumentAnalysisReadiness()
    }
  };
}

async function heatmap(query = {}) {
  return gerarHeatmapSst(query);
}

async function timelineColaborador(colaboradorId) {
  return gerarTimelineColaborador(colaboradorId);
}

function predictionReadiness() {
  return {
    predicao: getSstPredictionReadiness(),
    ia_documental: {
      ...getSstDocumentAiReadiness(),
      fase4: getDocumentAnalysisReadiness()
    },
    ia_prontidao: SST_AI_READINESS
  };
}

async function centroOperacional(query = {}) {
  return gerarCentroOperacionalCorporativoSst(query);
}

async function inteligenciaOperacional(query = {}) {
  return gerarInteligenciaOperacionalSst(query);
}

async function recomendacoes(query = {}, user = null) {
  return gerarRecomendacoesSst(query, user?.id || null);
}

async function recalcularScore(query = {}) {
  return recalcularScoreSst(query);
}

async function processarAutomacoes({ limit = 50, usuario_id = null } = {}) {
  const [eventos, vencimentos] = await Promise.all([
    processarEventosAbertosSst({ limit, usuario_id }),
    automatizarVencimentosProximos({ usuario_id })
  ]);
  return { eventos, vencimentos };
}

async function processarWorkflows({ evento_id = null, limit = 50, usuario_id = null } = {}) {
  if (evento_id) return processarEventoWorkflow(evento_id, { usuario_id });
  return processarFilaWorkflowSst({ limit, usuario_id });
}

async function analisarDocumentoIa(documento_id, { texto_extraido = null, texto = null, usuario_id = null } = {}) {
  return analisarDocumentoSstComIa({ documento_id, texto_extraido: texto_extraido || texto, usuario_id });
}

async function aprovarAnaliseIa(id, user = null) {
  return aprovarSugestaoAnaliseDocumento(id, user);
}

async function rejeitarAnaliseIa(id, user = null) {
  return rejeitarSugestaoAnaliseDocumento(id, user);
}

async function visaoObra(obra_id) {
  return gerarVisaoOperacionalObraSst(obra_id);
}

async function esocialEventos(query = {}) {
  return esocialControlledService.listarEventosControlados(query);
}

async function esocialLotes(query = {}) {
  return esocialControlledService.listarLotes(query);
}

async function esocialRetornos(query = {}) {
  return esocialControlledService.listarRetornos(query);
}

async function esocialCertificadoStatus(query = {}, user = null) {
  return esocialControlledService.validateCertificate({ empresa_id: query.empresa_id || null }, user);
}

async function esocialGerarXml(evento_id, user = null) {
  return esocialControlledService.gerarXmlEvento(evento_id, user);
}

async function esocialValidarXml(evento_id, user = null) {
  return esocialControlledService.validarXmlEvento(evento_id, user);
}

async function esocialAssinarXml(evento_id, user = null) {
  return esocialControlledService.assinarXmlEvento(evento_id, user);
}

async function esocialCriarLoteRestrita(payload = {}, user = null) {
  return esocialControlledService.criarLoteRestrita(payload, user);
}

async function esocialEnviarRestrita(lote_id, user = null) {
  return esocialControlledService.enviarRestrita(lote_id, user);
}

async function esocialConsultarRetorno(lote_id, user = null) {
  return esocialControlledService.consultarRetorno(lote_id, user);
}

async function featureFlags() {
  return getSstFeatureFlags();
}

async function observabilidade(query = {}) {
  return gerarObservabilidadeSst(query);
}

async function observabilidadeAvancada(query = {}) {
  return gerarObservabilidadeAvancadaSst(query);
}

async function monitoramentoProducao(query = {}) {
  return gerarMonitoramentoProducaoSst(query);
}

async function rolloutStatus(query = {}) {
  return gerarStatusRolloutSst(query);
}

async function telemetriaResumo(query = {}) {
  return gerarResumoTelemetriaSst(query);
}

async function hardeningStatus(query = {}) {
  return gerarStatusHardeningSst(query);
}

async function gerarAlertasOperacionais(query = {}, user = null) {
  return gerarAlertasOperacionaisSst(query, user?.id || null);
}

async function registrarTelemetria(payload = {}, user = null) {
  return registrarMetricaSst(payload, user?.id || payload.usuario_id || null);
}

async function enqueueJob(payload = {}, user = null) {
  return enqueueSstJob({
    ...payload,
    usuario_id: user?.id || payload.usuario_id || null
  });
}

async function processarWorker(payload = {}) {
  return processarWorkerSst(payload);
}

async function statusFilas(query = {}) {
  return gerarStatusFilasSst(query);
}

async function cacheStatus() {
  return getCacheStatusSst();
}

async function limparCacheExpirado() {
  return limparCacheExpiradoSst();
}

async function qualityCheck(user = null) {
  return executarQualityCheckSst({ usuario_id: user?.id || null });
}

async function qualidadeResumo() {
  return gerarResumoQualidadeSst();
}

async function governancaResumo() {
  return gerarResumoGovernancaSst();
}

async function registrarGovernanca(payload = {}, user = null) {
  return registrarGovernanceLogSst(payload, user?.id || payload.usuario_id || null);
}

async function registrarPerformance(payload = {}, user = null) {
  return registrarPerformanceMetricSst(payload, user?.id || payload.usuario_id || null);
}

async function checklistHomologacao() {
  return gerarChecklistHomologacaoSst();
}

async function homologarWorkflows(payload = {}) {
  return homologarWorkflowsSst(payload);
}

async function simularHomologacao() {
  return simularMassaHomologacaoSst();
}

async function processarIntegracaoRhdp(payload = {}, user = null) {
  return processarEventoRhdpSst({
    ...payload,
    usuario_id: user?.id || payload.usuario_id || null
  });
}

async function processarIntegracaoObra(obra_id, user = null) {
  return processarIntegracaoObraSst({
    obra_id,
    usuario_id: user?.id || null
  });
}

async function registrarHistoricoSst({
  resource,
  item,
  acao,
  antes = null,
  depois = null,
  user = null,
  transaction = null
}) {
  const plain = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  await SstHistorico.create({
    empresa_id: plain?.empresa_id || null,
    obra_id: plain?.obra_id || null,
    colaborador_id: plain?.colaborador_id || null,
    recurso: resource,
    recurso_id: plain?.id || null,
    acao,
    resumo: `${acao} em ${resource}${plain?.id ? ` #${plain.id}` : ''}`,
    antes: antes ? JSON.stringify(antes) : null,
    depois: depois ? JSON.stringify(depois) : null,
    criado_por: user?.id || null,
    atualizado_por: user?.id || null
  }, { transaction });
}

async function emitEventForResource(resource, item, user, transaction) {
  const plain = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  if (resource === 'acidentes') {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.ACIDENTE_REGISTRADO,
      severidade: ['GRAVE', 'FATAL'].includes(String(plain.gravidade || '').toUpperCase()) ? 'CRITICA' : 'ALERTA',
      origem_tipo: 'sst_acidentes',
      origem_id: plain.id,
      mensagem: `Acidente/incidente registrado: ${plain.tipo}`,
      usuario_id: user?.id || null,
      transaction
    });
    if (['GRAVE', 'FATAL'].includes(String(plain.gravidade || '').toUpperCase())) {
      await registrarEventoSst({
        empresa_id: plain.empresa_id,
        obra_id: plain.obra_id,
        colaborador_id: plain.colaborador_id,
        tipo_evento: SST_EVENT_TYPES.ACIDENTE_GRAVE,
        severidade: 'CRITICA',
        origem_tipo: 'sst_acidentes',
        origem_id: plain.id,
        mensagem: `Acidente grave/fatal registrado: ${plain.tipo}`,
        usuario_id: user?.id || null,
        transaction
      });
    }
  }

  if (resource === 'riscos' && ['ALTA', 'CRITICA'].includes(String(plain.severidade || '').toUpperCase())) {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      tipo_evento: SST_EVENT_TYPES.RISCO_CRITICO_IDENTIFICADO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_riscos',
      origem_id: plain.id,
      mensagem: `Risco critico identificado: ${plain.nome}`,
      usuario_id: user?.id || null,
      transaction
    });
  }

  if (resource === 'aso' && plain.apto === false) {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.COLABORADOR_INAPTO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_aso',
      origem_id: plain.id,
      mensagem: 'Colaborador marcado como inapto em ASO.',
      usuario_id: user?.id || null,
      transaction
    });
  }

  if (resource === 'aso') {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.ASO_CADASTRADO,
      severidade: 'INFO',
      origem_tipo: 'sst_aso',
      origem_id: plain.id,
      mensagem: `ASO registrado para tipo ${plain.tipo_exame}.`,
      usuario_id: user?.id || null,
      transaction
    });
  }

  if (resource === 'epi') {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.EPI_ENTREGUE,
      severidade: 'INFO',
      origem_tipo: 'sst_epi_entregas',
      origem_id: plain.id,
      mensagem: `EPI entregue: ${plain.epi_nome || 'sem nome informado'}.`,
      usuario_id: user?.id || null,
      transaction
    });
  }
}

module.exports = {
  createResource,
  analisarDocumentoIa,
  aprovarAnaliseIa,
  checklistHomologacao,
  dashboard,
  dashboardExecutivo,
  centroOperacional,
  esocialAssinarXml,
  esocialCertificadoStatus,
  esocialConsultarRetorno,
  esocialCriarLoteRestrita,
  esocialEnviarRestrita,
  esocialEventos,
  esocialGerarXml,
  esocialLotes,
  esocialRetornos,
  esocialValidarXml,
  featureFlags,
  cacheStatus,
  heatmap,
  hardeningStatus,
  getDocumentSignedUrl,
  getResource,
  homologarWorkflows,
  inteligenciaOperacional,
  analisarConformidadeSst,
  avaliarBloqueiosColaborador,
  listResource,
  marcarNotificacaoLida,
  monitoramentoProducao,
  observabilidade,
  observabilidadeAvancada,
  predictionReadiness,
  processarAutomacoes,
  processarIntegracaoObra,
  processarIntegracaoRhdp,
  processarWorkflows,
  processarWorker,
  recomendacoes,
  recalcularScore,
  enqueueJob,
  statusFilas,
  limparCacheExpirado,
  qualityCheck,
  qualidadeResumo,
  governancaResumo,
  registrarGovernanca,
  registrarPerformance,
  registrarTelemetria,
  relatorioOperacional,
  rejeitarAnaliseIa,
  revisarConformidadeColaborador,
  simularHomologacao,
  sincronizarNotificacoesSst,
  telemetriaResumo,
  timelineColaborador,
  gerarAlertasOperacionais,
  rolloutStatus,
  updateResource,
  visaoObra,
  uploadDocument
};
