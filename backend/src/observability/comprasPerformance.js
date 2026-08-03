const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const comprasRequestStorage = new AsyncLocalStorage();

const COMPRAS_PATH_PREFIXES = [
  '/api/compras',
  '/api/cotacoes',
  '/api/configuracoes/cotacoes'
];

function clampSampleRate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 0), 1);
}

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeRequestPath(value) {
  const path = String(value || '').split('?')[0].trim();
  if (!path) return '';
  return path.length > 1 ? path.replace(/\/+$/g, '') : path;
}

function isComprasRequestPath(value) {
  const path = normalizeRequestPath(value);
  return COMPRAS_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function sanitizeFallbackRoute(value) {
  const path = normalizeRequestPath(value);
  if (!path) return 'rota_desconhecida';

  const segments = path.split('/').map((segment, index, allSegments) => {
    if (!segment) return segment;
    if (/^\d+$/.test(segment)) return ':id';

    const previous = String(allSegments[index - 1] || '').toLowerCase();
    if (previous === 'cotacoes' && index === 3) return ':token';
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ':chave';
    if (segment.length >= 40) return ':chave';
    return segment;
  });

  return segments.join('/');
}

function resolveRequestRoute(req) {
  const routePath = String(req?.route?.path || '').trim();
  if (routePath) {
    const baseUrl = String(req?.baseUrl || '/api').replace(/\/+$/g, '');
    return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
  }

  return sanitizeFallbackRoute(req?.originalUrl || req?.url || req?.path);
}

function resolveQueryType(sql) {
  const normalized = String(sql || '')
    .replace(/^Executed\s+\([^)]*\):\s*/i, '')
    .replace(/^Executing\s+\([^)]*\):\s*/i, '')
    .trim();
  const match = normalized.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : 'OUTRA';
}

function recordDatabaseQuery(sql, elapsedMs) {
  const context = comprasRequestStorage.getStore();
  if (!context) return;

  const durationMs = normalizePositiveNumber(elapsedMs, 0);
  const queryType = resolveQueryType(sql);

  context.database.queryCount += 1;
  context.database.totalDurationMs += durationMs;
  context.database.maxDurationMs = Math.max(context.database.maxDurationMs, durationMs);
  context.database.byType[queryType] = Number(context.database.byType[queryType] || 0) + 1;

  if (durationMs >= context.slowQueryThresholdMs) {
    context.database.slowQueryCount += 1;
  }
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function responseBytes(res) {
  const contentLength = Number(res?.getHeader?.('content-length'));
  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
}

function buildPerformanceEntry({ req, res, context, startedAt, aborted = false }) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  const queryKeys = Object.keys(req?.query || {}).sort().slice(0, 20);

  return {
    request_id: context.requestId,
    method: String(req?.method || 'GET').toUpperCase(),
    route: resolveRequestRoute(req),
    status: Number(res?.statusCode || 0),
    aborted: Boolean(aborted),
    duration_ms: roundMetric(durationMs),
    response_bytes: responseBytes(res),
    query_keys: queryKeys,
    db_query_count: context.database.queryCount,
    db_duration_ms: roundMetric(context.database.totalDurationMs),
    db_max_query_ms: roundMetric(context.database.maxDurationMs),
    db_slow_query_count: context.database.slowQueryCount,
    db_queries_by_type: context.database.byType
  };
}

function createComprasPerformanceMiddleware(options = {}) {
  const enabled = Boolean(options.enabled);
  const sampleRate = clampSampleRate(options.sampleRate);
  const slowQueryThresholdMs = normalizePositiveNumber(options.slowQueryThresholdMs, 250);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const logger = typeof options.logger === 'function' ? options.logger : console.log;

  return function comprasPerformanceMiddleware(req, res, next) {
    if (!enabled || !isComprasRequestPath(req?.originalUrl || req?.url || req?.path)) {
      return next();
    }

    if (sampleRate <= 0 || random() > sampleRate) {
      return next();
    }

    const requestIdHeader = String(req?.headers?.['x-request-id'] || '').trim();
    const context = {
      requestId: requestIdHeader.slice(0, 100) || randomUUID(),
      slowQueryThresholdMs,
      database: {
        queryCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        slowQueryCount: 0,
        byType: Object.create(null)
      }
    };
    const startedAt = process.hrtime.bigint();
    let finalized = false;

    function finalize(aborted) {
      if (finalized) return;
      finalized = true;
      const entry = buildPerformanceEntry({ req, res, context, startedAt, aborted });
      logger(`[COMPRAS_PERF] ${JSON.stringify(entry)}`);
    }

    res.once('finish', () => finalize(false));
    res.once('close', () => finalize(!res.writableEnded));

    return comprasRequestStorage.run(context, next);
  };
}

module.exports = {
  buildPerformanceEntry,
  createComprasPerformanceMiddleware,
  isComprasRequestPath,
  recordDatabaseQuery,
  resolveQueryType,
  sanitizeFallbackRoute
};
