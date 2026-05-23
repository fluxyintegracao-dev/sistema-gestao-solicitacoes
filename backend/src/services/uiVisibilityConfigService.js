'use strict';

const { ConfiguracaoSistema } = require('../models');
const {
  UI_VISIBILITY_COMPONENTS,
  normalizeHiddenUiComponents
} = require('../constants/uiVisibilityRegistry');

const CHAVE_UI_VISIBILITY = 'UI_COMPONENT_VISIBILITY';

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getUiVisibilityConfig() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_UI_VISIBILITY },
    order: [['id', 'DESC']],
    attributes: ['valor']
  });
  const payload = parseJson(item?.valor, { hidden: [] });
  return {
    registry: UI_VISIBILITY_COMPONENTS,
    hidden: normalizeHiddenUiComponents(payload?.hidden)
  };
}

async function saveUiVisibilityConfig(input = {}) {
  const hidden = normalizeHiddenUiComponents(input.hidden);
  const valor = JSON.stringify({ hidden });
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_UI_VISIBILITY },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave: CHAVE_UI_VISIBILITY, valor });
  }

  return {
    registry: UI_VISIBILITY_COMPONENTS,
    hidden
  };
}

module.exports = {
  CHAVE_UI_VISIBILITY,
  getUiVisibilityConfig,
  saveUiVisibilityConfig
};
