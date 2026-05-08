const MOCK_MODE = 'MOCK_HOMOLOGACAO';
const REAL_MODE_DISABLED = 'REAL_DESABILITADO';

function createHttpError(statusCode, message, code = 'BB_PROVIDER_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function digitsOnly(value) {
  return normalizeText(value).replace(/\D/g, '');
}

function getMode(context = {}) {
  const configRef = normalizeUpper(context?.provider?.config_ref || context?.config_ref);
  if (!configRef || configRef === MOCK_MODE || configRef.includes('MOCK')) return MOCK_MODE;
  return REAL_MODE_DISABLED;
}

function maskRef(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-2)}`;
}

function sanitizeAccount(account = {}) {
  return {
    payment_account_id: account?.id || null,
    ambiente: account?.ambiente || null,
    banco_codigo: account?.banco_codigo || null,
    agencia: account?.agencia || null,
    agencia_digito: account?.agencia_digito || null,
    conta: account?.conta || null,
    conta_digito: account?.conta_digito || null,
    tipo_conta: account?.tipo_conta || null,
    convenio: account?.convenio || null,
    cnpj_pagador: digitsOnly(account?.cnpj_pagador),
    client_id_ref: maskRef(account?.client_id_ref),
    client_secret_ref: maskRef(account?.client_secret_ref),
    certificate_ref: maskRef(account?.certificate_ref)
  };
}

function sanitizeProvider(provider = {}) {
  return {
    provider_id: provider?.id || null,
    codigo: provider?.codigo || null,
    ambiente: provider?.ambiente || null,
    config_ref: provider?.config_ref || null
  };
}

function buildBatchRequestSnapshot(batch, context = {}) {
  const items = Array.isArray(batch?.items) ? batch.items : [];
  return {
    mode: getMode(context),
    provider: sanitizeProvider(context?.provider || batch?.provider),
    account: sanitizeAccount(context?.account || batch?.paymentAccount),
    batch: {
      id: batch?.id || null,
      codigo: batch?.codigo || null,
      correlation_id: batch?.correlation_id || null,
      idempotency_key: batch?.idempotency_key || null,
      data_programada: batch?.data_programada || null,
      quantidade_itens: Number(batch?.quantidade_itens || items.length || 0),
      valor_total: Number(batch?.valor_total || 0)
    },
    items: items.map((item) => ({
      sequencia: item?.sequencia || null,
      payment_intent_id: item?.payment_intent_id || item?.intent?.id || null,
      valor: Number(item?.valor || item?.intent?.valor || 0),
      correlation_id: item?.intent?.correlation_id || null,
      metodo: item?.intent?.metodo || 'PIX_CHAVE',
      favorecido: item?.intent?.beneficiary_snapshot
        ? {
            nome: item.intent.beneficiary_snapshot.nome || null,
            cpf_cnpj: digitsOnly(item.intent.beneficiary_snapshot.cpf_cnpj),
            pix_tipo_chave: item.intent.beneficiary_snapshot.pix_tipo_chave || null,
            pix_chave: item.intent.beneficiary_snapshot.pix_chave || null
          }
        : null
    }))
  };
}

function assertMockOrThrow(context = {}) {
  const mode = getMode(context);
  if (mode === MOCK_MODE) return mode;
  throw createHttpError(
    501,
    'Provider Banco do Brasil real ainda nao esta habilitado. Configure OAuth2/mTLS e valide a documentacao oficial antes de ativar.',
    'BB_REAL_PROVIDER_DISABLED'
  );
}

function sanitizeProviderResponse(response = {}) {
  return {
    mode: response?.mode || null,
    accepted: Boolean(response?.accepted),
    provider_batch_id: response?.provider_batch_id || null,
    provider_transaction_id: response?.provider_transaction_id || null,
    status: response?.status || null,
    error_code: response?.error_code || null,
    error_message: response?.error_message || null
  };
}

module.exports = {
  MOCK_MODE,
  REAL_MODE_DISABLED,

  async authenticate(context = {}) {
    const mode = assertMockOrThrow(context);
    return {
      mode,
      authenticated: true,
      provider: sanitizeProvider(context?.provider),
      account: sanitizeAccount(context?.account)
    };
  },

  async submitBatch(batch, context = {}) {
    const mode = assertMockOrThrow(context);
    return {
      mode,
      accepted: true,
      provider_batch_id: `MOCK-BB-${batch.codigo}`,
      status: 'ENVIADO_AO_BANCO'
    };
  },

  async getBatchStatus(providerBatchId, context = {}) {
    const mode = assertMockOrThrow(context);
    return {
      mode,
      provider_batch_id: providerBatchId,
      status: 'PROCESSANDO_BANCO'
    };
  },

  async getPaymentStatus(providerTransactionId, context = {}) {
    const mode = assertMockOrThrow(context);
    return {
      mode,
      provider_transaction_id: providerTransactionId,
      status: 'PROCESSANDO_BANCO'
    };
  },

  async cancelPayment(intent, context = {}) {
    const mode = assertMockOrThrow(context);
    return {
      mode,
      provider_transaction_id: intent?.correlation_id || null,
      status: 'CANCELADO'
    };
  },

  buildBatchRequestSnapshot,
  sanitizeProviderResponse,

  normalizeError(error) {
    return {
      code: error?.code || 'BB_PROVIDER_ERROR',
      message: error?.message || 'Erro no provider Banco do Brasil',
      statusCode: error?.statusCode || 500
    };
  },

  normalizeStatus(response) {
    return normalizeUpper(response?.status || 'PROCESSANDO_BANCO');
  }
};
