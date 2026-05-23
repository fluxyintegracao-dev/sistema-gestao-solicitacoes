'use strict';

const {
  getUiVisibilityConfig,
  saveUiVisibilityConfig
} = require('../services/uiVisibilityConfigService');

module.exports = {
  async show(req, res) {
    try {
      const config = await getUiVisibilityConfig();
      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar configuracao de visibilidade' });
    }
  },

  async update(req, res) {
    try {
      const config = await saveUiVisibilityConfig(req.body || {});
      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao de visibilidade' });
    }
  }
};
