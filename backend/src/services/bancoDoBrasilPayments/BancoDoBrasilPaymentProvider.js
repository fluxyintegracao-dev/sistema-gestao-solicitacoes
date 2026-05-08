const { env } = require('../../config/env');
const { getAccessToken } = require('./bancoDoBrasilAuthService');
const { requestJson, getHealth } = require('./bancoDoBrasilHttpClient');
const {
  mapBatchToPixTransferRequest,
  mapReleasePaymentsRequest
} = require('./bancoDoBrasilPayloadMapper');
const {
  mapPaymentStatus,
  mapRequestStatus
} = require('./bancoDoBrasilStatusMapper');
const {
  createBancoDoBrasilError,
  sanitizePayload
} = require('./bancoDoBrasilErrors');

const SCOPES = {
  PIX_BATCH: 'pagamentos-lote.transferencias-pix-requisicao',
  RELEASE: 'pagamentos-lote.lotes-requisicao',
  INFO: 'pagamentos-lote.lotes-info'
};

function assertSandboxRealEnabled() {
  if (!env.bbSandboxRealEnabled) {
    throw createBancoDoBrasilError(
      400,
      'Sandbox real BB desabilitado. Ative BB_SANDBOX_REAL_ENABLED=true para chamar o Banco do Brasil.',
      'BB_SANDBOX_DISABLED'
    );
  }
}

function getProviderBatchIdFromResponse(data, fallback) {
  return String(
    data?.id ||
    data?.numeroRequisicao ||
    data?.numeroSolicitacao ||
    data?.numeroLote ||
    fallback ||
    ''
  ).trim() || null;
}

function normalizeSubmitStatus(data) {
  if (data?.estadoRequisicao !== undefined && data?.estadoRequisicao !== null) {
    return mapRequestStatus(data.estadoRequisicao);
  }
  if (data?.estadoPagamento) {
    return mapPaymentStatus(data.estadoPagamento);
  }
  return 'ENVIADO_AO_BANCO';
}

function normalizeInfoStatus(data) {
  if (data?.estadoPagamento) {
    return mapPaymentStatus(data.estadoPagamento);
  }
  if (data?.estadoRequisicao !== undefined && data?.estadoRequisicao !== null) {
    return mapRequestStatus(data.estadoRequisicao);
  }
  if (Array.isArray(data?.pagamentos) && data.pagamentos.length) {
    const statuses = data.pagamentos.map((payment) => mapPaymentStatus(payment.estadoPagamento));
    if (statuses.every((status) => status === 'AGUARDANDO_CONFIRMACAO_BAIXA')) {
      return 'AGUARDANDO_CONFIRMACAO_BAIXA';
    }
    if (statuses.some((status) => status === 'REJEITADO_BANCO')) {
      return 'PARCIALMENTE_REJEITADO';
    }
  }
  return 'PROCESSANDO_BANCO';
}

async function submitPixBatch(batch) {
  assertSandboxRealEnabled();
  const body = mapBatchToPixTransferRequest(batch);
  const token = await getAccessToken(SCOPES.PIX_BATCH);
  const response = await requestJson({
    method: 'POST',
    path: '/lotes-transferencias-pix',
    body,
    accessToken: token.access_token
  });

  return {
    operation: 'SUBMIT_PIX_BATCH',
    provider_status: normalizeSubmitStatus(response.data),
    provider_batch_id: getProviderBatchIdFromResponse(response.data, body.numeroRequisicao),
    provider_transaction_id: getProviderBatchIdFromResponse(response.data, body.numeroRequisicao),
    http_status: response.http_status,
    request_snapshot: response.request_snapshot,
    response_snapshot: response.response_snapshot,
    data: sanitizePayload(response.data)
  };
}

async function releasePayments(batch) {
  assertSandboxRealEnabled();
  const body = mapReleasePaymentsRequest(batch);
  const token = await getAccessToken(SCOPES.RELEASE);
  const response = await requestJson({
    method: 'POST',
    path: '/liberar-pagamentos',
    body,
    accessToken: token.access_token
  });

  return {
    operation: 'RELEASE_PAYMENTS',
    provider_status: normalizeSubmitStatus(response.data),
    provider_batch_id: getProviderBatchIdFromResponse(response.data, body.numeroRequisicao),
    http_status: response.http_status,
    request_snapshot: response.request_snapshot,
    response_snapshot: response.response_snapshot,
    data: sanitizePayload(response.data)
  };
}

async function getBatchStatus(providerBatchId) {
  assertSandboxRealEnabled();
  if (!providerBatchId) {
    throw createBancoDoBrasilError(400, 'Identificador do lote BB nao informado.', 'BB_BATCH_ID_REQUIRED');
  }

  const token = await getAccessToken(SCOPES.INFO);
  const response = await requestJson({
    method: 'GET',
    path: `/${encodeURIComponent(String(providerBatchId))}`,
    accessToken: token.access_token
  });

  return {
    operation: 'GET_BATCH_STATUS',
    provider_status: normalizeInfoStatus(response.data),
    provider_batch_id: String(providerBatchId),
    http_status: response.http_status,
    request_snapshot: response.request_snapshot,
    response_snapshot: response.response_snapshot,
    data: sanitizePayload(response.data)
  };
}

async function getBatchRequestStatus(numeroSolicitacao) {
  assertSandboxRealEnabled();
  if (!numeroSolicitacao) {
    throw createBancoDoBrasilError(400, 'Numero da solicitacao BB nao informado.', 'BB_REQUEST_ID_REQUIRED');
  }

  const token = await getAccessToken(SCOPES.INFO);
  const response = await requestJson({
    method: 'GET',
    path: `/${encodeURIComponent(String(numeroSolicitacao))}/solicitacao`,
    accessToken: token.access_token
  });

  return {
    operation: 'GET_BATCH_REQUEST_STATUS',
    provider_status: normalizeInfoStatus(response.data),
    provider_batch_id: String(numeroSolicitacao),
    http_status: response.http_status,
    request_snapshot: response.request_snapshot,
    response_snapshot: response.response_snapshot,
    data: sanitizePayload(response.data)
  };
}

async function searchPaymentsStatus(filters = {}) {
  assertSandboxRealEnabled();
  const token = await getAccessToken(SCOPES.INFO);
  const response = await requestJson({
    method: 'GET',
    path: '/pagamentos',
    query: filters,
    accessToken: token.access_token
  });

  return {
    operation: 'SEARCH_PAYMENTS_STATUS',
    provider_status: normalizeInfoStatus(response.data),
    http_status: response.http_status,
    request_snapshot: response.request_snapshot,
    response_snapshot: response.response_snapshot,
    data: sanitizePayload(response.data)
  };
}

function normalizeError(error) {
  return {
    code: error.code || error.name || 'BB_PAYMENTS_ERROR',
    message: error.message || 'Erro na integracao Banco do Brasil',
    statusCode: error.statusCode || 500,
    details: sanitizePayload(error.details || null)
  };
}

module.exports = {
  SCOPES,
  getHealth,
  submitPixBatch,
  releasePayments,
  getBatchStatus,
  getBatchRequestStatus,
  searchPaymentsStatus,
  normalizeError
};
