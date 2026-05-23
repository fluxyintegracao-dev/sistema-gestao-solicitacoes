const { gerarRelatorioRhDpOperacional } = require('../services/rhRelatorioService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async operacional(req, res) {
    try {
      const relatorio = await gerarRelatorioRhDpOperacional(req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar relatorio operacional de RH/DP');
    }
  }
};
