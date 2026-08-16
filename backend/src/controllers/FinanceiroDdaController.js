const service = require('../services/financeiroDdaService');

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    error: error.message || 'Erro interno no modulo DDA.',
    code: error.code || undefined
  });
}

module.exports = {
  async resumo(req, res) {
    try { return res.json(await service.resumo(req.query)); } catch (error) { return sendError(res, error); }
  },
  async index(req, res) {
    try { return res.json(await service.listar(req.query)); } catch (error) { return sendError(res, error); }
  },
  async show(req, res) {
    try { return res.json(await service.detalhe(req.params.id)); } catch (error) { return sendError(res, error); }
  },
  async candidatos(req, res) {
    try { return res.json(await service.candidatos(req.params.id)); } catch (error) { return sendError(res, error); }
  },
  async sincronizacoes(req, res) {
    try { return res.json(await service.sincronizacoes(req.query)); } catch (error) { return sendError(res, error); }
  },
  async sincronizar(req, res) {
    try { return res.status(202).json(await service.sincronizar(req.body, req.user)); } catch (error) { return sendError(res, error); }
  },
  async reprocessarMatch(req, res) {
    try { return res.json(await service.reprocessarMatch(req.params.id, req.user)); } catch (error) { return sendError(res, error); }
  },
  async vincular(req, res) {
    try { return res.json(await service.vincular(req.params.id, req.body.titulo_id, req.user)); } catch (error) { return sendError(res, error); }
  },
  async confirmarSugestao(req, res) {
    try { return res.json(await service.confirmarSugestao(req.params.id, req.user)); } catch (error) { return sendError(res, error); }
  },
  async ignorar(req, res) {
    try { return res.json(await service.ignorar(req.params.id, req.body.motivo, req.user)); } catch (error) { return sendError(res, error); }
  }
};
