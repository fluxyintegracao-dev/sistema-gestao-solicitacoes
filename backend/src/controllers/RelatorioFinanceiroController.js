const { gerarRelatorioFluxoCaixa } = require('../services/relatorioFinanceiroService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async fluxoCaixa(req, res) {
    try {
      const relatorio = await gerarRelatorioFluxoCaixa(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio de fluxo de caixa');
    }
  }
};
