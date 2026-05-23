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
router.post('/eventos/sincronizar-vencimentos', (req, res, next) => {
  req.params.resource = 'eventos';
  return next();
}, allowSstResource('MANAGE'), SstController.syncEvents);
router.post('/documentos/upload', forceDocumentResource, allowSstResource('MANAGE'), uploadSstFile.single('file'), validateRequest({ body: normalizeSstPayload }), SstController.uploadDocument);
router.get('/documentos/:id/url', forceDocumentResource, allowSstResource('VIEW'), validateRequest({ params: validateNumericIdParam('id', 'Documento SST') }), SstController.documentUrl);

router.get('/:resource', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceParam, query: validateSstQuery }), SstController.index);
router.post('/:resource', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceParam, body: normalizeSstPayload }), SstController.create);
router.get('/:resource/:id', allowSstResource('VIEW'), validateRequest({ params: validateSstResourceWithIdParam }), SstController.show);
router.patch('/:resource/:id', allowSstResource('MANAGE'), validateRequest({ params: validateSstResourceWithIdParam, body: normalizeSstPayload }), SstController.update);

module.exports = router;
