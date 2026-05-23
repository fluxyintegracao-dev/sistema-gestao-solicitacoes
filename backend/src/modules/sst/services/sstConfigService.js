'use strict';

const { ConfiguracaoSistema } = require('../../../models');
const { DEFAULT_SST_CONFIG, SST_CONFIG_KEY } = require('../constants/sstConstants');

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return [...new Set(
    source
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  )];
}

function normalizeConfig(input = {}) {
  const config = {};
  Object.entries(DEFAULT_SST_CONFIG).forEach(([key, fallback]) => {
    if (key === 'dias_alerta_validade') {
      const parsed = Number(input[key]);
      config[key] = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
      return;
    }
    config[key] = normalizeList(input[key], fallback);
  });
  return config;
}

async function getSstConfig() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: SST_CONFIG_KEY },
    order: [['id', 'DESC']]
  });
  return normalizeConfig(parseJson(item?.valor, DEFAULT_SST_CONFIG));
}

async function saveSstConfig(input = {}) {
  const config = normalizeConfig(input);
  const valor = JSON.stringify(config);
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: SST_CONFIG_KEY },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave: SST_CONFIG_KEY, valor });
  }

  return config;
}

module.exports = {
  getSstConfig,
  saveSstConfig
};
