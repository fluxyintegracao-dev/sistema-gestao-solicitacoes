'use strict';

const express = require('express');
const permit = require('../../../middlewares/permissions');
const { validateRequest } = require('../../../middlewares/validation');
const { validateNumericIdParam } = require('../../../validators/securityValidators');
const {
  canAccessFiscal,
  canManageFiscalConfig,
  canRunFiscalSync,
  canViewFiscalDocuments,
  canViewFiscalLogs,
  canViewFiscalSync
} = require('../../../services/authorizationService');
const FiscalDashboardController = require('../controllers/FiscalDashboardController');
const FiscalCertificateController = require('../controllers/FiscalCertificateController');
const FiscalCompanyController = require('../controllers/FiscalCompanyController');
const FiscalDocumentController = require('../controllers/FiscalDocumentController');
const FiscalSyncLogController = require('../controllers/FiscalSyncLogController');
const {
  validateFiscalCertificateCreateBody,
  validateFiscalCertificateQuery,
  validateFiscalCompanyCreateBody,
  validateFiscalCompanyQuery,
  validateFiscalCompanyUpdateBody,
  validateFiscalDocumentQuery,
  validateFiscalSyncLogQuery,
  validateFiscalSyncRunBody
} = require('../validators/fiscalValidators');

const router = express.Router();

const allowFiscal = permit({
  resource: 'FISCAL',
  custom: async (req) => (
    (await canAccessFiscal(req.user))
      ? true
      : 'Acesso negado para o modulo fiscal'
  )
});

const allowFiscalConfig = permit({
  resource: 'FISCAL_CONFIG',
  custom: async (req) => (
    (await canManageFiscalConfig(req.user))
      ? true
      : 'Acesso negado para configuracoes fiscais'
  )
});

const allowFiscalDocuments = permit({
  resource: 'FISCAL_DOCUMENTS',
  custom: async (req) => (
    (await canViewFiscalDocuments(req.user))
      ? true
      : 'Acesso negado para documentos fiscais'
  )
});

const allowFiscalSync = permit({
  resource: 'FISCAL_SYNC',
  custom: async (req) => (
    (await canViewFiscalSync(req.user))
      ? true
      : 'Acesso negado para sincronizacao fiscal'
  )
});

const allowFiscalSyncRun = permit({
  resource: 'FISCAL_SYNC_RUN',
  custom: async (req) => (
    (await canRunFiscalSync(req.user))
      ? true
      : 'Acesso negado para executar sincronizacao fiscal'
  )
});

const allowFiscalLogs = permit({
  resource: 'FISCAL_LOGS',
  custom: async (req) => (
    (await canViewFiscalLogs(req.user))
      ? true
      : 'Acesso negado para logs fiscais'
  )
});

router.get('/health', allowFiscal, FiscalDashboardController.health);
router.get('/dashboard', allowFiscal, FiscalDashboardController.dashboard);

router.get('/companies', allowFiscalConfig, validateRequest({ query: validateFiscalCompanyQuery }), FiscalCompanyController.index);
router.post('/companies', allowFiscalConfig, validateRequest({ body: validateFiscalCompanyCreateBody }), FiscalCompanyController.create);
router.patch('/companies/:id', allowFiscalConfig, validateRequest({ params: validateNumericIdParam('id', 'Empresa fiscal'), body: validateFiscalCompanyUpdateBody }), FiscalCompanyController.update);

router.get('/certificates', allowFiscalConfig, validateRequest({ query: validateFiscalCertificateQuery }), FiscalCertificateController.index);
router.post('/certificates', allowFiscalConfig, validateRequest({ body: validateFiscalCertificateCreateBody }), FiscalCertificateController.create);
router.post('/certificates/:id/validate', allowFiscalConfig, validateRequest({ params: validateNumericIdParam('id', 'Certificado fiscal') }), FiscalCertificateController.validate);

router.get('/documents', allowFiscalDocuments, validateRequest({ query: validateFiscalDocumentQuery }), FiscalDocumentController.index);
router.get('/documents/:id/xml-url', allowFiscalDocuments, validateRequest({ params: validateNumericIdParam('id', 'Documento fiscal') }), FiscalDocumentController.xmlUrl);
router.get('/documents/:id/pdf-url', allowFiscalDocuments, validateRequest({ params: validateNumericIdParam('id', 'Documento fiscal') }), FiscalDocumentController.pdfUrl);
router.get('/documents/:id', allowFiscalDocuments, validateRequest({ params: validateNumericIdParam('id', 'Documento fiscal') }), FiscalDocumentController.show);

router.post('/sync/run-manual', allowFiscalSyncRun, validateRequest({ body: validateFiscalSyncRunBody }), FiscalSyncLogController.runManual);
router.get('/sync/logs', allowFiscalSync, allowFiscalLogs, validateRequest({ query: validateFiscalSyncLogQuery }), FiscalSyncLogController.index);

module.exports = router;
