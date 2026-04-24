const {
  getInstallationConfig,
  saveInstallationConfig
} = require('../services/installationConfig');
const { loadRuntimeConfig } = require('../services/runtimeConfig');

module.exports = {
  async publica(req, res) {
    try {
      const config = await getInstallationConfig();
      return res.json({
        product_name: config.product_name,
        company_name: config.company_name,
        logo_url: config.logo_url,
        login_title: config.login_title,
        login_subtitle: config.login_subtitle
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar configuracao publica da instalacao' });
    }
  },

  async show(req, res) {
    try {
      const config = await getInstallationConfig();
      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar configuracao da instalacao' });
    }
  },

  async update(req, res) {
    try {
      const config = await saveInstallationConfig(req.body || {});
      await loadRuntimeConfig();
      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuracao da instalacao' });
    }
  }
};
