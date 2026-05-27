'use strict';

const express = require('express');
const permit = require('../../../middlewares/permissions');
const { validateRequest } = require('../../../middlewares/validation');
const {
  canAccessSst,
  canManageSstArea,
  canViewSstArea,
  canViewSstDashboard
} = require('../../../services/authorizationService');
const SstController = require('../controllers/SstController');
const uploadSstFile = require('../config/uploadSstFile');
const {
  normalizeSstPayload,
  validateSstQuery,
  validateSstResourceParam,
  validateSstResourceWithIdParam
} = require('../validators/sstValidators');
const { validateNumericIdParam } = require('../../../validators/securityValidators');
const { SST_RESOURCE_CONFIG } = require('../constants/sstConstants');

const router = express.Router();

const allowSst = permit({
  resource: 'SST',
  custom: async (req) => (
    (await canAccessSst(req.user))
      ? true
      : 'Acesso negado para o modulo SST'
  )
});

const allowSstDashboard = permit({
  resource: 'SST_DASHBOARD',
  custom: async (req) => (
    (await canViewSstDashboard(req.user))
      ? true
      : 'Acesso negado para o dashboard SST'
  )
});

function allowSstResource(action) {
  return permit({
    resource: `SST_${action}`,
    custom: async (req) => {
      const resource = req.params.resource;
      const area = SST_RESOURCE_CONFIG[resource]?.area || resource;
      const allowed = action === 'MANAGE'
        ? await canManageSstArea(req.user, area)
        : await canViewSstArea(req.user, area);
      return allowed ? true : 'Acesso negado para esta area do SST';
    }
  });
}

function forceDocumentResource(req, res, next) {
  req.params.resource = 'documentos';
  return next();
}

function forceEsocialResource(req, res, next) {
  req.params.resource = 'esocial';
  return next();
}

router.get('/health', allowSst, (req, res) => res.json({ ok: true, module: 'SST' }));
router.get('/configuracoes', (req, res, next) => {
  req.params.resource = 'configuracoes';
  return next();
}, allowSstResource('VIEW'), SstController.config);
router.patch('/configuracoes', (req, res, next) => {
  req.params.resource = 'configuracoes';
  return next();
}, allowSstResource('MANAGE'), SstController.updateConfig);
router.get('/dashboard', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.dashboard);
router.get('/relatorio-operacional', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.relatorioOperacional);
router.get('/conformidade', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.conformidade);
router.get('/executivo', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.executivo);
router.get('/heatmap', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.heatmap);
router.get('/centro-operacional', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.centroOperacional);
router.get('/feature-flags', (req, res, next) => {
  req.params.resource = 'configuracoes';
  return next();
}, allowSstResource('VIEW'), SstController.featureFlags);
router.get('/observabilidade', (req, res, next) => {
  req.params.resource = 'workflow_logs';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.observabilidade);
router.get('/producao/monitoramento', (req, res, next) => {
  req.params.resource = 'telemetria';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.monitoramentoProducao);
router.get('/observabilidade-avancada', (req, res, next) => {
  req.params.resource = 'performance_metrics';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.observabilidadeAvancada);
router.get('/queues/status', (req, res, next) => {
  req.params.resource = 'queue_metrics';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.statusFilas);
router.post('/queues/enqueue', (req, res, next) => {
  req.params.resource = 'jobs';
  return next();
}, allowSstResource('MANAGE'), SstController.enqueueJob);
router.post('/workers/processar', (req, res, next) => {
  req.params.resource = 'jobs';
  return next();
}, allowSstResource('MANAGE'), SstController.processarWorker);
router.get('/cache/status', (req, res, next) => {
  req.params.resource = 'cache_entries';
  return next();
}, allowSstResource('VIEW'), SstController.cacheStatus);
router.post('/cache/limpar-expirado', (req, res, next) => {
  req.params.resource = 'cache_entries';
  return next();
}, allowSstResource('MANAGE'), SstController.limparCacheExpirado);
router.post('/quality/check', (req, res, next) => {
  req.params.resource = 'quality_issues';
  return next();
}, allowSstResource('MANAGE'), SstController.qualityCheck);
router.get('/quality/resumo', (req, res, next) => {
  req.params.resource = 'quality_issues';
  return next();
}, allowSstResource('VIEW'), SstController.qualidadeResumo);
router.get('/governance/resumo', (req, res, next) => {
  req.params.resource = 'governance_logs';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.governancaResumo);
router.post('/governance/logs', (req, res, next) => {
  req.params.resource = 'governance_logs';
  return next();
}, allowSstResource('MANAGE'), SstController.registrarGovernanca);
router.post('/performance/registrar', (req, res, next) => {
  req.params.resource = 'performance_metrics';
  return next();
}, allowSstResource('MANAGE'), SstController.registrarPerformance);
router.get('/rollout/status', (req, res, next) => {
  req.params.resource = 'rollout_planos';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.rolloutStatus);
router.get('/telemetria/resumo', (req, res, next) => {
  req.params.resource = 'telemetria';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.telemetriaResumo);
router.post('/telemetria/registrar', (req, res, next) => {
  req.params.resource = 'telemetria';
  return next();
}, allowSstResource('MANAGE'), SstController.registrarTelemetria);
router.get('/hardening/status', (req, res, next) => {
  req.params.resource = 'hardening_policies';
  return next();
}, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.hardeningStatus);
router.post('/alertas/gerar', (req, res, next) => {
  req.params.resource = 'alertas_operacionais';
  return next();
}, allowSstResource('MANAGE'), validateRequest({ query: validateSstQuery }), SstController.gerarAlertasOperacionais);
router.get('/homologacao/checklist', (req, res, next) => {
  req.params.resource = 'workflow_logs';
  return next();
}, allowSstResource('VIEW'), SstController.checklistHomologacao);
router.post('/homologacao/workflows', (req, res, next) => {
  req.params.resource = 'workflow_execucoes';
  return next();
}, allowSstResource('MANAGE'), SstController.homologarWorkflows);
router.post('/homologacao/simular', (req, res, next) => {
  req.params.resource = 'workflow_execucoes';
  return next();
}, allowSstResource('MANAGE'), SstController.simularHomologacao);
router.get('/inteligencia-operacional', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.inteligenciaOperacional);
router.get('/recomendacoes/gerar', allowSstDashboard, validateRequest({ query: validateSstQuery }), SstController.recomendacoes);
router.post('/scores/recalcular', (req, res, next) => {
  req.params.resource = 'scores';
  return next();
}, allowSstResource('MANAGE'), SstController.recalcularScore);
router.get('/timeline/:colaboradorId', allowSstDashboard, validateRequest({ params: validateNumericIdParam('colaboradorId', 'Colaborador SST') }), SstController.timeline);
router.get('/prediction/readiness', allowSstDashboard, SstController.predictionReadiness);
router.post('/automation/processar', (req, res, next) => {
  req.params.resource = 'workflow_execucoes';
  return next();
}, allowSstResource('MANAGE'), SstController.processarAutomacoes);
router.post('/workflows/processar', (req, res, next) => {
  req.params.resource = 'workflow_execucoes';
  return next();
}, allowSstResource('MANAGE'), SstController.processarWorkflows);
router.post('/integracoes/rhdp/processar', (req, res, next) => {
  req.params.resource = 'integration_logs';
  return next();
}, allowSstResource('MANAGE'), SstController.processarIntegracaoRhdp);
router.post('/integracoes/obras/:obraId/processar', (req, res, next) => {
  req.params.resource = 'integration_logs';
  return next();
}, allowSstResource('MANAGE'), SstController.processarIntegracaoObra);
router.post('/workflows/revisar-colaborador/:colaboradorId', (req, res, next) => {
  req.params.resource = 'pendencias';
  return next();
}, allowSstResource('MANAGE'), SstController.revisarColaborador);
router.post('/bloqueios/colaborador/:colaboradorId/avaliar', (req, res, next) => {
  req.params.resource = 'bloqueios';
  return next();
}, allowSstResource('MANAGE'), SstController.avaliarBloqueios);
router.post('/notificacoes/sincronizar', (req, res, next) => {
  req.params.resource = 'notificacoes';
  return next();
}, allowSstResource('MANAGE'), SstController.syncNotifications);
router.patch('/notificacoes/:id/ler', (req, res, next) => {
  req.params.resource = 'notificacoes';
  return next();
}, allowSstResource('MANAGE'), SstController.markNotificationRead);
router.post('/eventos/sincronizar-vencimentos', (req, res, next) => {
  req.params.resource = 'eventos';
  return next();
}, allowSstResource('MANAGE'), SstController.syncEvents);
router.post('/documentos/upload', forceDocumentResource, allowSstResource('MANAGE'), uploadSstFile.single('file'), validateRequest({ body: normalizeSstPayload }), SstController.uploadDocument);
router.get('/documentos/:id/url', forceDocumentResource, allowSstResource('VIEW'), validateRequest({ params: validateNumericIdParam('id', 'Documento SST') }), SstController.documentUrl);
router.post('/documentos/:id/analisar-ia', forceDocumentResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Documento SST') }), SstController.analisarDocumentoIa);
router.post('/documentos/analises/:id/aprovar', forceDocumentResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Analise IA documental SST') }), SstController.aprovarAnaliseIa);
router.post('/documentos/analises/:id/rejeitar', forceDocumentResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Analise IA documental SST') }), SstController.rejeitarAnaliseIa);
router.get('/obras/:obraId/visao-operacional', allowSstDashboard, validateRequest({ params: validateNumericIdParam('obraId', 'Obra SST') }), SstController.visaoObra);
router.get('/esocial/eventos', forceEsocialResource, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.esocialEventos);
router.get('/esocial/lotes', forceEsocialResource, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.esocialLotes);
router.get('/esocial/retornos', forceEsocialResource, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.esocialRetornos);
router.get('/esocial/certificado/status', forceEsocialResource, allowSstResource('VIEW'), validateRequest({ query: validateSstQuery }), SstController.esocialCertificadoStatus);
router.post('/esocial/eventos/:id/gerar-xml', forceEsocialResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Evento eSocial SST') }), SstController.esocialGerarXml);
router.post('/esocial/eventos/:id/validar-xml', forceEsocialResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Evento eSocial SST') }), SstController.esocialValidarXml);
router.post('/esocial/eventos/:id/assinar-xml', forceEsocialResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Evento eSocial SST') }), SstController.esocialAssinarXml);
router.post('/esocial/lotes/restrita', forceEsocialResource, allowSstResource('MANAGE'), SstController.esocialCriarLoteRestrita);
router.post('/esocial/lotes/:id/enviar-restrita', forceEsocialResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Lote eSocial SST') }), SstController.esocialEnviarRestrita);
router.post('/esocial/lotes/:id/consultar-retorno', forceEsocialResource, allowSstResource('MANAGE'), validateRequest({ params: validateNumericIdParam('id', 'Lote eSocial SST') }), SstController.esocialConsultarRetorno);

router.get('/:resource', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceParam, query: validateSstQuery }), SstController.index);
router.post('/:resource', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceParam, body: normalizeSstPayload }), SstController.create);
router.get('/:resource/:id', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceWithIdParam }), SstController.show);
router.patch('/:resource/:id', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceWithIdParam, body: normalizeSstPayload }), SstController.update);

module.exports = router;
