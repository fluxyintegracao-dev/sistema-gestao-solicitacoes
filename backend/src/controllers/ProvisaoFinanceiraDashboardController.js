const { getDashboardProvisionamento } = require('../services/provisaoFinanceiraService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async resumo(req, res) {
    try {
      const data = await getDashboardProvisionamento(req.query || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao carregar dashboard do provisionamento');
    }
  }
};
