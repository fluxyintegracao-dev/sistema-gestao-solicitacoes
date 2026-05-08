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
  const response = await fetch(env.bbOauthTokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

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
