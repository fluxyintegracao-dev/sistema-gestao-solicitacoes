const https = require('https');

const { env } = require('../../config/env');
const { createBancoDoBrasilError, maskToken } = require('./bancoDoBrasilErrors');

let tokenCache = null;

function isTokenValid() {
  return tokenCache?.access_token && tokenCache.expiresAt > Date.now() + 60 * 1000;
}

function assertAuthConfig() {
  if (!env.bbClientId || !env.bbClientSecret) {
    throw createBancoDoBrasilError(400, 'Credenciais OAuth BB nao configuradas.', 'BB_OAUTH_CONFIG_MISSING');
  }
  if (!env.bbOauthTokenUrl) {
    throw createBancoDoBrasilError(400, 'URL OAuth BB nao configurada.', 'BB_OAUTH_URL_MISSING');
  }
}

function requestToken({ body, basic, startedAt }) {
  const url = new URL(env.bbOauthTokenUrl);
  const payload = body.toString();
  const headers = {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(payload),
    Accept: 'application/json'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers,
      timeout: env.bbRequestTimeoutMs,
      ALPNProtocols: ['http/1.1']
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }

        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(createBancoDoBrasilError(504, 'Timeout ao autenticar no OAuth Banco do Brasil.', 'BB_OAUTH_TIMEOUT', {
        elapsed_ms: Date.now() - startedAt
      }));
    });
    req.on('error', (error) => reject(createBancoDoBrasilError(
      502,
      'Falha de conexao ao autenticar no OAuth Banco do Brasil.',
      error.code || 'BB_OAUTH_CONNECTION_ERROR',
      {
        elapsed_ms: Date.now() - startedAt,
        host: url.hostname,
        port: url.port || 443,
        cause: error.message
      }
    )));
    req.write(payload);
    req.end();
  });
}

async function getAccessToken(scope) {
  if (!env.bbSandboxRealEnabled) {
    return {
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: env.bbTokenCacheTtlSeconds,
      scope: scope || '',
      masked_token: 'mock***token'
    };
  }

  if (isTokenValid()) return tokenCache.publicToken;
  assertAuthConfig();

  const body = new URLSearchParams({
    grant_type: 'client_credentials'
  });
  if (scope) body.set('scope', scope);

  const basic = Buffer.from(`${env.bbClientId}:${env.bbClientSecret}`).toString('base64');
  const startedAt = Date.now();
  const response = await requestToken({ body, basic, startedAt });
  const data = response.data || {};

  if (!response.ok || !data.access_token) {
    throw createBancoDoBrasilError(
      response.status || 502,
      'Falha ao autenticar no OAuth Banco do Brasil.',
      'BB_OAUTH_TOKEN_ERROR',
      {
        http_status: response.status,
        elapsed_ms: Date.now() - startedAt,
        response: data?.error ? { error: data.error, error_description: data.error_description } : null
      }
    );
  }

  const expiresIn = Number(data.expires_in || env.bbTokenCacheTtlSeconds || 3000);
  const publicToken = {
    access_token: data.access_token,
    token_type: data.token_type || 'Bearer',
    expires_in: expiresIn,
    scope: data.scope || scope || '',
    masked_token: maskToken(data.access_token)
  };

  tokenCache = {
    access_token: data.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    publicToken
  };

  return publicToken;
}

function clearTokenCache() {
  tokenCache = null;
}

module.exports = {
  clearTokenCache,
  getAccessToken
};
