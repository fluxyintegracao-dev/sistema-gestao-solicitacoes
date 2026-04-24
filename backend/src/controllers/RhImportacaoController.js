const {
  confirmarImportacaoRh,
  criarPreviewImportacaoRh,
  detalharImportacaoRh,
  listarImportacoesRh
} = require('../services/rhImportacaoService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarImportacoesRh(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar importacoes RH/DP');
    }
  },

  async show(req, res) {
    try {
      const data = await detalharImportacaoRh(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar importacao RH/DP');
    }
  },

  async createPreview(req, res) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Arquivo de importacao nao enviado.' });
      }

      const data = await criarPreviewImportacaoRh(req.body || {}, req.file, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar preview da importacao RH/DP');
    }
  },

  async confirmar(req, res) {
    try {
      const data = await confirmarImportacaoRh(req.params.id, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao confirmar importacao RH/DP');
    }
  }
};
