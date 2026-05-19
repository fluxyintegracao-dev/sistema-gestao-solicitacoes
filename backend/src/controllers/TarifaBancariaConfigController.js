const {
  listarTarifasBancariasConfig,
  salvarTarifasBancariasConfig
} = require('../services/financeiroCadastroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const itens = await listarTarifasBancariasConfig(req);
      return res.json(itens);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar atalhos de tarifas bancarias');
    }
  },

  async update(req, res) {
    try {
      const itens = await salvarTarifasBancariasConfig(req, req.body || {});
      return res.json(itens);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao salvar atalhos de tarifas bancarias');
    }
  }
};
