'use strict';

const { Op } = require('sequelize');
const { SstCacheEntry } = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { isSstFeatureEnabled } = require('../feature-flags/sstFeatureFlagsService');

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getSstCache(namespace, key) {
  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.CACHE_OPERACIONAL);
  if (!enabled) return { hit: false, disabled: true };

  const entry = await SstCacheEntry.findOne({
    where: {
      namespace,
      cache_key: key,
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } }
      ]
    }
  });

  if (!entry) return { hit: false };

  await entry.update({
    last_hit_at: new Date(),
    hit_count: Number(entry.hit_count || 0) + 1
  });

  return {
    hit: true,
    value: parseJson(entry.value_json),
    entry
  };
}

async function setSstCache(namespace, key, value, { ttl_seconds = 300, tags = [] } = {}) {
  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.CACHE_OPERACIONAL);
  if (!enabled) return { stored: false, disabled: true };

  const expiresAt = ttl_seconds ? new Date(Date.now() + Number(ttl_seconds) * 1000) : null;
  const [entry, created] = await SstCacheEntry.findOrCreate({
    where: { namespace, cache_key: key },
    defaults: {
      value_json: JSON.stringify(value ?? null),
      tags_json: JSON.stringify(tags || []),
      expires_at: expiresAt
    }
  });

  if (!created) {
    await entry.update({
      value_json: JSON.stringify(value ?? null),
      tags_json: JSON.stringify(tags || []),
      expires_at: expiresAt
    });
  }

  return { stored: true, entry };
}

async function getCacheStatusSst() {
  const [total, expirados, recentes] = await Promise.all([
    SstCacheEntry.count(),
    SstCacheEntry.count({ where: { expires_at: { [Op.lt]: new Date() } } }),
    SstCacheEntry.findAll({ order: [['updatedAt', 'DESC']], limit: 20 })
  ]);

  return {
    cards: {
      entradas_total: total,
      expiradas: expirados,
      ativas: Math.max(total - expirados, 0)
    },
    recentes
  };
}

async function limparCacheExpiradoSst() {
  const total = await SstCacheEntry.destroy({
    where: { expires_at: { [Op.lt]: new Date() } }
  });
  return { removidos: total };
}

module.exports = {
  getCacheStatusSst,
  getSstCache,
  limparCacheExpiradoSst,
  setSstCache
};
