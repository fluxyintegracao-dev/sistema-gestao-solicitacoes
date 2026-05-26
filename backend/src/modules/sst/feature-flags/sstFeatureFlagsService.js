'use strict';

const { DEFAULT_SST_CONFIG, SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { getSstConfig } = require('../services/sstConfigService');

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'sim', 's', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n', 'no'].includes(normalized)) return false;
  return fallback;
}

async function getSstFeatureFlags() {
  const config = await getSstConfig();
  return Object.fromEntries(
    Object.values(SST_FEATURE_FLAGS).map((flag) => [
      flag,
      normalizeBoolean(config[flag], DEFAULT_SST_CONFIG[flag])
    ])
  );
}

async function isSstFeatureEnabled(flag) {
  const flags = await getSstFeatureFlags();
  return Boolean(flags[flag]);
}

async function assertSstFeatureEnabled(flag, message = 'Funcionalidade SST desabilitada por feature flag.') {
  const enabled = await isSstFeatureEnabled(flag);
  if (!enabled) {
    const error = new Error(message);
    error.code = 'SST_FEATURE_DISABLED';
    error.flag = flag;
    error.statusCode = 409;
    throw error;
  }
  return true;
}

module.exports = {
  assertSstFeatureEnabled,
  getSstFeatureFlags,
  isSstFeatureEnabled
};
