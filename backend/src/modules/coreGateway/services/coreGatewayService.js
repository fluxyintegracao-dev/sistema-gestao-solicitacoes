'use strict';

const crypto = require('crypto');

const API_VERSION = 'v1';
const CONTRACT_PATH = 'docs/core-gateway/CONTRATOS_API_EXPERIENCE.md';

function getRequestId(req) {
  const headerRequestId = String(req?.headers?.['x-request-id'] || '').trim();
  if (headerRequestId) {
    return headerRequestId;
  }

  if (req?.coreGateway?.requestId) {
    return req.coreGateway.requestId;
  }

  return crypto.randomUUID();
}

function buildMeta(req) {
  return {
    version: API_VERSION,
    request_id: getRequestId(req)
  };
}

function buildGatewayResponse(data, req) {
  return {
    success: true,
    data,
    meta: buildMeta(req)
  };
}

function buildGatewayError(code, message, req, details = null) {
  const error = {
    code,
    message
  };

  if (details) {
    error.details = details;
  }

  return {
    success: false,
    error,
    meta: buildMeta(req)
  };
}

function buildPlannedEndpointResponse(endpoint, req) {
  return buildGatewayResponse({
    status: 'PLANNED',
    implemented: false,
    endpoint,
    contract: CONTRACT_PATH,
    message: 'Endpoint reservado para o Core Gateway. Dados oficiais ainda nao foram expostos nesta fase.'
  }, req);
}

module.exports = {
  API_VERSION,
  CONTRACT_PATH,
  getRequestId,
  buildGatewayResponse,
  buildGatewayError,
  buildPlannedEndpointResponse
};
