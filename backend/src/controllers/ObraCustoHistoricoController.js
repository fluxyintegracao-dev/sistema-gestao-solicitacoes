const {
  confirmarImportacaoCustosHistoricos,
  listarImportacoesCustosHistoricos,
  previewImportacaoCustosHistoricos
} = require('../services/obraCustoHistoricoService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async preview(req, res) {
    try {
      const data = await previewImportacaoCustosHistoricos(req, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao validar importacao de custos historicos');
    }
  },

  async confirmar(req, res) {
    try {
      const data = await confirmarImportacaoCustosHistoricos(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao importar custos historicos');
    }
  },

  async importacoes(req, res) {
    try {
      const data = await listarImportacoesCustosHistoricos(req, req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar importacoes de custos historicos');
    }
  }
};
