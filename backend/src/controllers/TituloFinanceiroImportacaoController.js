const {
  carregarImportacao,
  confirmarImportacao,
  criarPreviewImportacao,
  gerarModeloImportacao
} = require('../services/tituloFinanceiroImportacaoService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async modelo(req, res) {
    try {
      const buffer = await gerarModeloImportacao(req);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao-contas-a-pagar.xlsx"');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao exportar modelo de contas a pagar');
    }
  },

  async preview(req, res) {
    try {
      const importacao = await criarPreviewImportacao(req, req.file);
      return res.status(201).json(importacao);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao validar planilha de contas a pagar');
    }
  },

  async show(req, res) {
    try {
      const importacao = await carregarImportacao(req, req.params.id);
      return res.json(importacao);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao consultar importacao de contas a pagar');
    }
  },

  async confirmar(req, res) {
    try {
      const importacao = await confirmarImportacao(req, req.params.id, {
        idempotencyKey: req.get('Idempotency-Key'),
        aceitarAvisos: req.body?.aceitar_avisos === true
      });
      return res.json(importacao);
    } catch (error) {
      return responderErroController(res, error, 'Erro ao confirmar importacao de contas a pagar');
    }
  }
};
