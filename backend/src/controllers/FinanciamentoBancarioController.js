const {
  carregarFinanciamentoBancario,
  criarFinanciamentoBancario,
  gerarTitulosFinanciamentoBancario,
  listarAuditoriaFinanciamentoBancario,
  listarFinanciamentosBancarios
} = require('../services/financiamentoBancarioService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async index(req, res) {
    try {
      const financiamentos = await listarFinanciamentosBancarios(req, req.query || {});
      return res.json(financiamentos);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar financiamentos bancarios');
    }
  },

  async show(req, res) {
    try {
      const financiamento = await carregarFinanciamentoBancario(req, req.params.id);
      return res.json(financiamento);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao buscar financiamento bancario');
    }
  },

  async create(req, res) {
    try {
      const financiamento = await criarFinanciamentoBancario(req, req.body || {});
      return res.status(201).json(financiamento);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao cadastrar financiamento bancario');
    }
  },

  async gerarTitulos(req, res) {
    try {
      const financiamento = await gerarTitulosFinanciamentoBancario(req, req.params.id);
      return res.json(financiamento);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar titulos do financiamento bancario');
    }
  },

  async auditoria(req, res) {
    try {
      const auditoria = await listarAuditoriaFinanciamentoBancario(req, req.params.id);
      return res.json(auditoria);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar auditoria do financiamento bancario');
    }
  }
};
