const {
  gerarAmostraBoletoTitulo,
  gerarBoletoTitulo,
  gerarPdfBoletoTitulo,
  getConfigBoletoCaixa,
  listarTitulosBoleto,
  visualizarBoletoTitulo
} = require('../services/boletoCaixaService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async config(req, res) {
    try {
      return res.json(getConfigBoletoCaixa());
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao carregar configuracao de boletos');
    }
  },

  async titulos(req, res) {
    try {
      const data = await listarTitulosBoleto(req, req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar titulos para boleto');
    }
  },

  async show(req, res) {
    try {
      const data = await visualizarBoletoTitulo(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao visualizar boleto');
    }
  },

  async gerar(req, res) {
    try {
      const data = await gerarBoletoTitulo(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar boleto');
    }
  },

  async amostra(req, res) {
    try {
      const data = await gerarAmostraBoletoTitulo(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar amostra de boleto');
    }
  },

  async pdf(req, res) {
    try {
      const amostra = ['1', 'true', 'sim', 'yes'].includes(String(req.query?.amostra || '').toLowerCase());
      const data = await gerarPdfBoletoTitulo(req, req.params.id, { amostra });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
      return res.send(data.buffer);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar PDF do boleto');
    }
  }
};
