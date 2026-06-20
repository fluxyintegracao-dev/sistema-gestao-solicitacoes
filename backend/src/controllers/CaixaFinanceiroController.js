const {
  abrirSessaoCaixa,
  confirmarConciliacaoDiaCaixa,
  fecharSessaoCaixa,
  listarSessoesCaixa,
  obterResumoSessaoCaixa
} = require('../services/caixaFinanceiroService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      return res.json(await listarSessoesCaixa(req, req.query || {}));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar caixas financeiros');
    }
  },

  async show(req, res) {
    try {
      return res.json(await obterResumoSessaoCaixa(req, req.params.id));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar caixa financeiro');
    }
  },

  async abrir(req, res) {
    try {
      const sessao = await abrirSessaoCaixa(req, req.body || {});
      return res.status(201).json(sessao);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao abrir caixa financeiro');
    }
  },

  async confirmarConciliacaoDia(req, res) {
    try {
      return res.json(await confirmarConciliacaoDiaCaixa(req, req.body || {}));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao confirmar conciliacao do dia');
    }
  },

  async fechar(req, res) {
    try {
      return res.json(await fecharSessaoCaixa(req, req.params.id, req.body || {}));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao fechar caixa financeiro');
    }
  }
};
