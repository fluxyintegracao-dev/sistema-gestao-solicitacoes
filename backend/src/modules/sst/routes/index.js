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
router.get('/obras/:obraId/visao-operacional', allowSstDashboard, validateRequest({ params: validateNumericIdParam('obraId', 'Obra SST') }), SstController.visaoObra);

router.get('/:resource', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceParam, query: validateSstQuery }), SstController.index);
router.post('/:resource', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceParam, body: normalizeSstPayload }), SstController.create);
router.get('/:resource/:id', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceWithIdParam }), SstController.show);
router.patch('/:resource/:id', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceWithIdParam, body: normalizeSstPayload }), SstController.update);

module.exports = router;
