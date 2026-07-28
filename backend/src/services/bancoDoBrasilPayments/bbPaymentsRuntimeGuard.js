const { env } = require('../../config/env');
const { createBancoDoBrasilError } = require('./bancoDoBrasilErrors');

const OFFICIAL_ENDPOINTS = {
  sandbox: {
    payments: 'https://pagamentos-lote.mtls.api.hm.bb.com.br/v1',
    oauth: 'https://oauth.hm.bb.com.br/oauth/token',
    accountEnvironment: 'HOMOLOGACAO'
  },
  production: {
    payments: 'https://pagamentos-lote.mtls.api.bb.com.br/v1',
    oauth: 'https://oauth.bb.com.br/oauth/token',
    accountEnvironment: 'PRODUCAO'
  }
};

function normalizeEnvironment(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'producao') return 'production';
  if (normalized === 'homologacao') return 'sandbox';
  return normalized;
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

function fail(message, code) {
  throw createBancoDoBrasilError(503, message, code);
}

function assertBbRealSendingAllowed({ account = null, provider = null } = {}) {
  if (!env.bbPaymentsEnabled) {
    fail('Pagamentos BB estao desabilitados por BB_PAYMENTS_ENABLED.', 'BB_PAYMENTS_DISABLED');
  }
  if (String(env.bbProviderMode || '').trim().toLowerCase() !== 'real') {
    fail('Provider BB real bloqueado: BB_PROVIDER_MODE deve ser real.', 'BB_PROVIDER_MODE_BLOCKED');
  }
  if (!env.bbSandboxRealEnabled) {
    fail('Provider BB real bloqueado por BB_REAL_PROVIDER_ENABLED.', 'BB_REAL_PROVIDER_DISABLED');
  }
  if (env.bbTlsRejectUnauthorized !== true) {
    fail('Provider BB real exige validacao TLS ativa.', 'BB_TLS_VALIDATION_REQUIRED');
  }

  const environment = normalizeEnvironment(env.bbPaymentsEnv);
  const expected = OFFICIAL_ENDPOINTS[environment];
  if (!expected) {
    fail('BB_PAYMENTS_ENV deve ser sandbox ou production.', 'BB_ENV_INVALID');
  }
  if (environment === 'production' && String(env.nodeEnv || '').trim().toLowerCase() !== 'production') {
    fail('Endpoint BB de producao so pode ser usado com NODE_ENV=production.', 'BB_NODE_ENV_MISMATCH');
  }
  if (normalizeUrl(env.bbPaymentsBaseUrl) !== expected.payments) {
    fail('Endpoint de pagamentos BB nao pertence a allowlist oficial do ambiente.', 'BB_PAYMENTS_URL_BLOCKED');
  }
  if (normalizeUrl(env.bbOauthTokenUrl) !== expected.oauth) {
    fail('Endpoint OAuth BB nao pertence a allowlist oficial do ambiente.', 'BB_OAUTH_URL_BLOCKED');
  }

  if (account) {
    const accountEnvironment = String(account.ambiente || '').trim().toUpperCase();
    if (accountEnvironment !== expected.accountEnvironment) {
      fail('Ambiente da conta pagadora diverge do ambiente BB configurado.', 'BB_ACCOUNT_ENV_MISMATCH');
    }
  }
  if (provider) {
    const providerEnvironment = String(provider.ambiente || '').trim().toUpperCase();
    if (providerEnvironment !== expected.accountEnvironment) {
      fail('Ambiente do provider diverge do ambiente BB configurado.', 'BB_PROVIDER_ENV_MISMATCH');
    }
  }

  return {
    environment,
    paymentsUrl: expected.payments,
    oauthUrl: expected.oauth
  };
}

module.exports = {
  OFFICIAL_ENDPOINTS,
  assertBbRealSendingAllowed,
  normalizeEnvironment
};
