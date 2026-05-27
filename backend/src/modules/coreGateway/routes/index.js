'use strict';

const express = require('express');
const { env } = require('../../../config/env');
const { createRateLimit } = require('../../../middlewares/rateLimit');
const CoreGatewayController = require('../controllers/CoreGatewayController');
const { requireCoreGatewayAuth } = require('../middlewares/coreGatewayAuth');

const router = express.Router();

const coreGatewayRateLimit = createRateLimit({
  windowMs: env.coreGatewayRateLimitWindowMs,
  max: env.coreGatewayRateLimitMax,
  message: 'Muitas requisicoes ao Core Gateway. Tente novamente em instantes.',
  eventType: 'CORE_GATEWAY_RATE_LIMIT_BLOCKED',
  resource: 'CORE_GATEWAY',
  keyGenerator: (req) => {
    const clientId = String(req.headers['x-fluxy-experience-client-id'] || 'anonymous').trim();
    return `core-gateway:${clientId}:${req.method}:${req.path}`;
  }
});

router.get('/health', CoreGatewayController.health);

router.use(coreGatewayRateLimit);
router.use(requireCoreGatewayAuth);

router.get('/events/catalog', CoreGatewayController.eventos);

router.get('/comercial/empreendimentos', CoreGatewayController.listarEmpreendimentos);
router.get('/comercial/unidades', CoreGatewayController.listarUnidades);
router.get('/comercial/mapa-unidades', CoreGatewayController.listarMapaUnidades);
router.post('/comercial/simulacao', CoreGatewayController.simularComercial);

router.get('/portal/dashboard', CoreGatewayController.planned('GET /api/gateway/portal/dashboard'));
router.post('/portal/autorizacao', CoreGatewayController.autorizarPortalCliente);
router.get('/portal/financeiro', CoreGatewayController.planned('GET /api/gateway/portal/financeiro'));
router.get('/portal/parcelas', CoreGatewayController.planned('GET /api/gateway/portal/parcelas'));
router.get('/portal/boletos/:id', CoreGatewayController.planned('GET /api/gateway/portal/boletos/:id'));
router.get('/portal/documentos', CoreGatewayController.planned('GET /api/gateway/portal/documentos'));
router.get('/portal/obra', CoreGatewayController.planned('GET /api/gateway/portal/obra'));
router.get('/portal/chamados', CoreGatewayController.planned('GET /api/gateway/portal/chamados'));
router.post('/portal/chamados', CoreGatewayController.planned('POST /api/gateway/portal/chamados'));

module.exports = router;
