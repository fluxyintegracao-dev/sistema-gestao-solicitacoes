'use strict';

const { registrarEventoSeguranca } = require('../../../services/securityLogService');

async function auditCoreGateway(req, {
  tipoEvento = 'CORE_GATEWAY_ACCESS',
  status = 'INFO',
  descricao = null,
  metadata = {}
} = {}) {
  const clientId = req?.coreGateway?.clientId
    || String(req?.headers?.['x-fluxy-experience-client-id'] || '').trim()
    || null;

  return registrarEventoSeguranca({
    req,
    usuarioId: null,
    tipoEvento,
    recursoTipo: 'CORE_GATEWAY',
    recursoId: req?.originalUrl || null,
    status,
    descricao,
    metadata: {
      client_id: clientId,
      request_id: req?.coreGateway?.requestId || String(req?.headers?.['x-request-id'] || '').trim() || null,
      method: req?.method || null,
      path: req?.originalUrl || null,
      ...metadata
    }
  });
}

module.exports = {
  auditCoreGateway
};
