'use strict';

const crypto = require('crypto');
const { env } = require('../../../config/env');
const { buildGatewayError, getRequestId } = require('../services/coreGatewayService');
const { auditCoreGateway } = require('../audit/coreGatewayAuditService');

function getHeader(req, name) {
  return String(req.headers[String(name).toLowerCase()] || '').trim();
}

function safeCompareHex(left, right) {
  const normalizedLeft = String(left || '').trim();
  const normalizedRight = String(right || '').trim();

  if (!normalizedLeft || !normalizedRight || normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalizedLeft, 'hex'),
      Buffer.from(normalizedRight, 'hex')
    );
  } catch (error) {
    return false;
  }
}

function buildSignaturePayload(req, timestamp) {
  return `${timestamp}.${String(req.method || '').toUpperCase()}.${req.originalUrl}`;
}

function createExpectedSignature(req, timestamp) {
  return crypto
    .createHmac('sha256', env.coreGatewayClientSecret)
    .update(buildSignaturePayload(req, timestamp))
    .digest('hex');
}

async function deny(req, res, statusCode, code, message, metadata = {}) {
  await auditCoreGateway(req, {
    tipoEvento: 'CORE_GATEWAY_AUTH_DENIED',
    status: 'DENIED',
    descricao: message,
    metadata: {
      reason: code,
      ...metadata
    }
  });

  return res.status(statusCode).json(buildGatewayError(code, message, req));
}

async function requireCoreGatewayAuth(req, res, next) {
  req.coreGateway = {
    requestId: getRequestId(req)
  };

  if (!env.coreGatewayEnabled) {
    return deny(
      req,
      res,
      503,
      'CORE_GATEWAY_DISABLED',
      'Core Gateway desativado por feature flag.'
    );
  }

  if (!env.coreGatewayClientId || !env.coreGatewayClientSecret) {
    return deny(
      req,
      res,
      503,
      'CORE_GATEWAY_NOT_CONFIGURED',
      'Core Gateway sem credenciais configuradas no backend.'
    );
  }

  const origin = getHeader(req, 'origin');
  if (origin && env.coreGatewayAllowedOrigins.length > 0 && !env.coreGatewayAllowedOrigins.includes(origin)) {
    return deny(req, res, 403, 'CORE_GATEWAY_ORIGIN_FORBIDDEN', 'Origem nao autorizada.', { origin });
  }

  const clientId = getHeader(req, 'x-fluxy-experience-client-id');
  const timestamp = getHeader(req, 'x-fluxy-experience-timestamp');
  const signature = getHeader(req, 'x-fluxy-experience-signature');

  if (!clientId || !timestamp || !signature) {
    return deny(
      req,
      res,
      401,
      'CORE_GATEWAY_AUTH_HEADERS_MISSING',
      'Headers de autenticacao do Core Gateway ausentes.'
    );
  }

  req.coreGateway.clientId = clientId;

  if (clientId !== env.coreGatewayClientId) {
    return deny(req, res, 403, 'CORE_GATEWAY_CLIENT_FORBIDDEN', 'Cliente nao autorizado.');
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return deny(req, res, 401, 'CORE_GATEWAY_TIMESTAMP_INVALID', 'Timestamp invalido.');
  }

  const toleranceMs = Number(env.coreGatewaySignatureToleranceMs || 300000);
  const skewMs = Math.abs(Date.now() - timestampMs);
  if (skewMs > toleranceMs) {
    return deny(req, res, 401, 'CORE_GATEWAY_TIMESTAMP_EXPIRED', 'Timestamp fora da janela permitida.', {
      skew_ms: skewMs,
      tolerance_ms: toleranceMs
    });
  }

  const expectedSignature = createExpectedSignature(req, timestamp);
  if (!safeCompareHex(signature, expectedSignature)) {
    return deny(req, res, 401, 'CORE_GATEWAY_SIGNATURE_INVALID', 'Assinatura invalida.');
  }

  await auditCoreGateway(req, {
    tipoEvento: 'CORE_GATEWAY_AUTH_ALLOWED',
    status: 'ALLOWED',
    descricao: 'Core Gateway autenticado.'
  });

  return next();
}

module.exports = {
  requireCoreGatewayAuth,
  buildSignaturePayload
};
