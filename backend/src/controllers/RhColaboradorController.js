const {
  atualizarColaboradorRh,
  criarColaboradorRh,
  detalharColaboradorRh,
  importarColaboradoresRh,
  listarColaboradoresRh
} = require('../services/rhService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async index(req, res) {
    try {
      const data = await listarColaboradoresRh(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar colaboradores RH/DP');
    }
  },

  async show(req, res) {
    try {
      const data = await detalharColaboradorRh(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar colaborador RH/DP');
    }
  },

  async create(req, res) {
    try {
      const data = await criarColaboradorRh(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar colaborador RH/DP');
    }
  },

  async update(req, res) {
    try {
      const data = await atualizarColaboradorRh(req.params.id, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar colaborador RH/DP');
    }
  },

  async importarMassa(req, res) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Arquivo de importacao nao enviado.' });
      }

      const data = await importarColaboradoresRh(req.file, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao importar colaboradores RH/DP');
    }
  }
};
