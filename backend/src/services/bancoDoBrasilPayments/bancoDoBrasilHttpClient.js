const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const { env } = require('../../config/env');
const { createBancoDoBrasilError, sanitizeHeaders, sanitizePayload } = require('./bancoDoBrasilErrors');

function assertRealSandboxEnabled() {
  if (!env.bbSandboxRealEnabled) {
    throw createBancoDoBrasilError(501, 'Integracao real BB esta desabilitada. Ative a chamada real ao Banco do Brasil nas variaveis de ambiente.', 'BB_SANDBOX_REAL_DISABLED');
  }
}

function buildHttpsAgent() {
  assertRealSandboxEnabled();
  if (!env.bbCertPath) {
    throw createBancoDoBrasilError(400, 'Certificado mTLS BB nao configurado: informe BB_CERT_PATH.', 'BB_CERT_MISSING');
  }

  const options = {};
  if (env.bbCertType === 'pfx') {
    options.pfx = fs.readFileSync(env.bbCertPath);
    if (env.bbCertPassphrase) options.passphrase = env.bbCertPassphrase;
  } else {
    throw createBancoDoBrasilError(400, `Tipo de certificado BB nao suportado: ${env.bbCertType}`, 'BB_CERT_TYPE_UNSUPPORTED');
  }

  if (env.bbCaCertPath) {
    options.ca = fs.readFileSync(env.bbCaCertPath);
  }

  if (env.bbPaymentsEnv === 'sandbox' && env.bbTlsRejectUnauthorized === false) {
    options.rejectUnauthorized = false;
  }

  return new https.Agent(options);
}

function buildUrl(path, query = {}) {
  const url = new URL(`${env.bbPaymentsBaseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  if (!env.bbAppKey) {
    throw createBancoDoBrasilError(400, 'App key BB nao configurada: informe BB_APP_KEY.', 'BB_APP_KEY_MISSING');
  }
  url.searchParams.set('gw-dev-app-key', env.bbAppKey);
  return url;
}

function requestJson({ method = 'GET', path, query, body, accessToken }) {
  assertRealSandboxEnabled();
  if (!accessToken) {
    throw createBancoDoBrasilError(400, 'Token OAuth BB ausente para chamada ao provider.', 'BB_ACCESS_TOKEN_MISSING');
  }

  const url = buildUrl(path, query);
  const payload = body == null ? null : JSON.stringify(body);
  const startedAt = Date.now();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json'
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  const requestSnapshot = {
    method,
    url: `${url.origin}${url.pathname}`,
    query: sanitizePayload(Object.fromEntries(url.searchParams.entries())),
    headers: sanitizeHeaders(headers),
    body: sanitizePayload(body)
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method,
      headers,
      agent: buildHttpsAgent(),
      timeout: env.bbRequestTimeoutMs
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }

        const result = {
          http_status: res.statusCode,
          headers: sanitizeHeaders(res.headers),
          data: sanitizePayload(data),
          request_snapshot: requestSnapshot,
          response_snapshot: {
            http_status: res.statusCode,
            body: sanitizePayload(data)
          },
          elapsed_ms: Date.now() - startedAt
        };

        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(createBancoDoBrasilError(
            res.statusCode || 502,
            'Chamada ao Banco do Brasil falhou.',
            'BB_HTTP_ERROR',
            result
          ));
        }

        return resolve(result);
      });
    });

    req.on('timeout', () => {
      req.destroy(createBancoDoBrasilError(504, 'Timeout na chamada ao Banco do Brasil.', 'BB_HTTP_TIMEOUT', {
        request_snapshot: requestSnapshot,
        elapsed_ms: Date.now() - startedAt
      }));
    });
    req.on('error', (error) => reject(error));
    if (payload) req.write(payload);
    req.end();
  });
}

function getHealth() {
  return {
    enabled: env.bbPaymentsEnabled,
    provider: env.bbPaymentsProvider,
    env: env.bbPaymentsEnv,
    mode: env.bbSandboxRealEnabled ? 'BB_REAL' : 'MOCK',
    baseURL: env.bbPaymentsBaseUrl,
    tokenURL: env.bbOauthTokenUrl,
    realProviderEnabled: env.bbSandboxRealEnabled,
    sandboxRealEnabled: env.bbSandboxRealEnabled,
    certificateConfigured: Boolean(env.bbCertPath),
    caConfigured: Boolean(env.bbCaCertPath),
    tlsRejectUnauthorized: env.bbTlsRejectUnauthorized,
    appKeyConfigured: Boolean(env.bbAppKey),
    clientIdConfigured: Boolean(env.bbClientId),
    clientSecretConfigured: Boolean(env.bbClientSecret),
    autoLiberarLote: env.bbAutoLiberarLote,
    webhookEnabled: env.bbWebhookEnabled,
    webhookPath: env.bbWebhookPath,
    webhookRequireMtls: env.bbWebhookRequireMtls
  };
}

module.exports = {
  getHealth,
  requestJson
};
