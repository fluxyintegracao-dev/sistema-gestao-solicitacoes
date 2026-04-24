const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env')
});

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasEnvKey(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function trimTrailingSlashes(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

function trimLeadingAndTrailingSlashes(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function buildSiengeApiBaseUrl({ baseUrl, host, subdomain, basePath }) {
  const explicitBaseUrl = trimTrailingSlashes(baseUrl);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const normalizedHost = trimTrailingSlashes(host);
  const normalizedSubdomain = trimLeadingAndTrailingSlashes(subdomain);
  const normalizedBasePath = trimLeadingAndTrailingSlashes(basePath);

  if (!normalizedHost || !normalizedSubdomain) {
    return '';
  }

  const parts = [`${normalizedHost}/${normalizedSubdomain}`];
  if (normalizedBasePath) {
    parts.push(normalizedBasePath);
  }

  return parts.join('/');
}

const env = {
  nodeEnv: String(process.env.NODE_ENV || 'development').trim(),
  port: Number(process.env.PORT || 8000),
  trustProxy: Number(process.env.TRUST_PROXY || 1),
  dbHost: String(process.env.DB_HOST || '127.0.0.1').trim(),
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: String(process.env.DB_USER || '').trim(),
  dbPassword: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
  dbName: String(process.env.DB_NAME || '').trim(),
  jwtSecret: String(process.env.JWT_SECRET || '').trim(),
  jwtExpiresIn: String(process.env.JWT_EXPIRES_IN || '8h').trim(),
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10),
  requestBodyLimitMb: Number(process.env.REQUEST_BODY_LIMIT_MB || 2),
  corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS),
  authCookieName: String(process.env.AUTH_COOKIE_NAME || 'fluxy_auth').trim(),
  csrfCookieName: String(process.env.CSRF_COOKIE_NAME || 'fluxy_csrf').trim(),
  csrfHeaderName: String(process.env.CSRF_HEADER_NAME || 'x-csrf-token').trim().toLowerCase(),
  authCookieSameSite: String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').trim().toLowerCase(),
  authCookieSecure: parseBoolean(process.env.AUTH_COOKIE_SECURE, String(process.env.NODE_ENV || 'development').trim() === 'production'),
  authCookieDomain: String(process.env.AUTH_COOKIE_DOMAIN || '').trim(),
  loginRateLimitWindowMinutes: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15),
  loginRateLimitMaxAttempts: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5),
  uploadRateLimitWindowMinutes: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES || 5),
  uploadRateLimitMaxAttempts: Number(process.env.UPLOAD_RATE_LIMIT_MAX_ATTEMPTS || 30),
  criticalRateLimitWindowMinutes: Number(process.env.CRITICAL_RATE_LIMIT_WINDOW_MINUTES || 1),
  criticalRateLimitMaxAttempts: Number(process.env.CRITICAL_RATE_LIMIT_MAX_ATTEMPTS || 60),
  passwordRateLimitWindowMinutes: Number(process.env.PASSWORD_RATE_LIMIT_WINDOW_MINUTES || 15),
  passwordRateLimitMaxAttempts: Number(process.env.PASSWORD_RATE_LIMIT_MAX_ATTEMPTS || 5),
  csvImportMaxRows: Number(process.env.CSV_IMPORT_MAX_ROWS || 5000),
  redisUrl: String(process.env.REDIS_URL || process.env.VALKEY_URL || '').trim(),
  redisKeyPrefix: String(process.env.REDIS_KEY_PREFIX || 'fluxy:').trim(),
  redisRequired: parseBoolean(
    process.env.REDIS_REQUIRED,
    String(process.env.NODE_ENV || 'development').trim() === 'production'
  ),
  clamavEnabled: parseBoolean(process.env.CLAMAV_ENABLED, false),
  clamavHost: String(process.env.CLAMAV_HOST || '127.0.0.1').trim(),
  clamavPort: Number(process.env.CLAMAV_PORT || 3310),
  clamavTimeoutMs: Number(process.env.CLAMAV_TIMEOUT_MS || 15000),
  clamavFailClosed: parseBoolean(process.env.CLAMAV_FAIL_CLOSED, false),
  clamavRequired: parseBoolean(
    process.env.CLAMAV_REQUIRED,
    String(process.env.NODE_ENV || 'development').trim() === 'production'
  ),
  securityLogRetentionDays: Number(process.env.SECURITY_LOG_RETENTION_DAYS || 90),
  mfaIssuer: String(process.env.MFA_ISSUER || process.env.PRODUCT_NAME || 'Fluxy').trim(),
  mfaChallengeExpiresIn: String(process.env.MFA_CHALLENGE_EXPIRES_IN || '5m').trim(),
  productName: String(process.env.PRODUCT_NAME || 'Fluxy').trim(),
  companyName: String(process.env.COMPANY_NAME || '').trim(),
  companyLegalName: String(process.env.COMPANY_LEGAL_NAME || '').trim(),
  companyLogoUrl: String(process.env.COMPANY_LOGO_URL || '').trim(),
  appDomain: String(process.env.APP_DOMAIN || '').trim(),
  opsEnabled: String(process.env.OPS_ENABLED || 'false').trim().toLowerCase() === 'true',
  opsBaseUrl: String(process.env.OPS_BASE_URL || '').trim(),
  opsClientId: String(process.env.OPS_CLIENT_ID || '').trim(),
  opsApiKey: String(process.env.OPS_API_KEY || '').trim(),
  opsHeartbeatIntervalMinutes: Number(process.env.OPS_HEARTBEAT_INTERVAL_MINUTES || 5),
  opsMetricsIntervalMinutes: Number(process.env.OPS_METRICS_INTERVAL_MINUTES || 15),
  crmAutomationEnabled: parseBoolean(process.env.CRM_AUTOMATION_ENABLED, true),
  crmAutomationIntervalSeconds: Number(process.env.CRM_AUTOMATION_INTERVAL_SECONDS || 60),
  crmAutomationStartupDelayMs: Number(process.env.CRM_AUTOMATION_STARTUP_DELAY_MS || 15000),
  crmAutomationBatchSize: Number(process.env.CRM_AUTOMATION_BATCH_SIZE || 100),
  siengeApiBaseUrl: String(process.env.SIENGE_API_BASE_URL || '').trim(),
  siengeApiHost: String(process.env.SIENGE_API_HOST || 'https://api.sienge.com.br').trim(),
  siengeApiSubdomain: String(process.env.SIENGE_API_SUBDOMAIN || '').trim(),
  siengeApiBasePath: String(process.env.SIENGE_API_BASE_PATH || '/public/api/v1').trim(),
  siengeEndpointTitulos: String(process.env.SIENGE_ENDPOINT_TITULOS || '').trim(),
  siengeEndpointCredores: String(process.env.SIENGE_ENDPOINT_CREDORES || '').trim(),
  siengeEndpointCredorDetalhe: String(process.env.SIENGE_ENDPOINT_CREDOR_DETALHE || '').trim(),
  siengeEndpointCredorBankInformations: String(process.env.SIENGE_ENDPOINT_CREDOR_BANK_INFORMATIONS || '').trim(),
  siengeEndpointCredorPixInformations: String(process.env.SIENGE_ENDPOINT_CREDOR_PIX_INFORMATIONS || '').trim(),
  siengeUsername: String(process.env.SIENGE_USERNAME || '').trim(),
  siengePassword: String(process.env.SIENGE_PASSWORD || '').trim(),
  siengeToken: String(process.env.SIENGE_TOKEN || '').trim(),
  siengeRequestTimeoutMs: Number(process.env.SIENGE_REQUEST_TIMEOUT_MS || 20000),
  caixaAgencia: String(process.env.CAIXA_AGENCIA || '').trim(),
  caixaCodigoBeneficiario: String(process.env.CAIXA_CODIGO_BENEFICIARIO || '').trim(),
  caixaBeneficiarioNome: String(process.env.CAIXA_BENEFICIARIO_NOME || '').trim(),
  caixaBeneficiarioCpfCnpj: String(process.env.CAIXA_BENEFICIARIO_CPF_CNPJ || '').trim(),
  caixaBeneficiarioEndereco: String(process.env.CAIXA_BENEFICIARIO_ENDERECO || '').trim(),
  caixaLocalPagamento: String(process.env.CAIXA_LOCAL_PAGAMENTO || '').trim(),
  caixaBoletoAmbiente: String(process.env.CAIXA_BOLETO_AMBIENTE || 'TESTE').trim().toUpperCase(),
  caixaBoletoHomologado: parseBoolean(process.env.CAIXA_BOLETO_HOMOLOGADO, false),
  caixaBoletoInstrucao: String(process.env.CAIXA_BOLETO_INSTRUCAO || '').trim()
};

env.siengeResolvedBaseUrl = buildSiengeApiBaseUrl({
  baseUrl: env.siengeApiBaseUrl,
  host: env.siengeApiHost,
  subdomain: env.siengeApiSubdomain,
  basePath: env.siengeApiBasePath
});

function validateRequiredEnv() {
  const missing = [];

  if (!env.dbHost) missing.push('DB_HOST');
  if (!Number.isInteger(env.dbPort) || env.dbPort <= 0) missing.push('DB_PORT');
  if (!env.dbUser) missing.push('DB_USER');
  if (!env.dbName) missing.push('DB_NAME');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (!hasEnvKey('DB_PASSWORD') && !hasEnvKey('DB_PASS')) {
    missing.push('DB_PASSWORD');
  }
  if (env.redisRequired && !env.redisUrl) {
    missing.push('REDIS_URL');
  }
  if (env.clamavRequired && !env.clamavEnabled) {
    missing.push('CLAMAV_ENABLED');
  }

  if (missing.length > 0) {
    throw new Error(
      `Variaveis de ambiente obrigatorias ausentes ou invalidas: ${missing.join(', ')}`
    );
  }
}

module.exports = {
  env,
  buildSiengeApiBaseUrl,
  parseCsv,
  validateRequiredEnv
};
