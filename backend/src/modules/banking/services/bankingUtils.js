function toNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeStatus(value) {
  return String(value || 'INDEFINIDO').trim().toUpperCase() || 'INDEFINIDO';
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function serializeError(error) {
  return {
    message: error?.message || 'Falha ao carregar origem bancaria.',
    code: error?.code || error?.name || 'BANKING_ADAPTER_ERROR'
  };
}

function buildStatusCounters(rows = [], statusField = 'status', countField = 'count') {
  return rows.reduce((acc, row) => {
    const status = normalizeStatus(row[statusField]);
    acc[status] = toNumber(row[countField]);
    return acc;
  }, {});
}

function sumCounters(counters = {}, keys = []) {
  return keys.reduce((sum, key) => sum + toNumber(counters[normalizeStatus(key)]), 0);
}

module.exports = {
  buildStatusCounters,
  normalizeDate,
  normalizeStatus,
  serializeError,
  sumCounters,
  toNumber
};
