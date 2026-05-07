const {
  createBeneficiary,
  deactivateBeneficiary,
  getBeneficiaryAuditLogs,
  listBeneficiariesByPartner,
  updateBeneficiary,
  validateBeneficiary
} = require('../services/paymentBeneficiaryService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async index(req, res) {
    try {
      const data = await listBeneficiariesByPartner(req, req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar favorecidos bancarios');
    }
  },

  async create(req, res) {
    try {
      const data = await createBeneficiary(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar favorecido bancario');
    }
  },

  async update(req, res) {
    try {
      const data = await updateBeneficiary(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao atualizar favorecido bancario');
    }
  },

  async destroy(req, res) {
    try {
      const data = await deactivateBeneficiary(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao desativar favorecido bancario');
    }
  },

  async validate(req, res) {
    try {
      const data = await validateBeneficiary(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao validar favorecido bancario');
    }
  },

  async auditoria(req, res) {
    try {
      const data = await getBeneficiaryAuditLogs(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar auditoria do favorecido');
    }
  }
};
