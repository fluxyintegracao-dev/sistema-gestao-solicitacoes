'use strict';

const {
  criarFiscalCertificate,
  listarFiscalCertificates,
  validarFiscalCertificate
} = require('../services/fiscalCertificateService');

function handleError(res, error) {
  console.error('[fiscal] certificado fiscal:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar certificado fiscal.'
  });
}

async function index(req, res) {
  try {
    const result = await listarFiscalCertificates(req.query);
    return res.json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const result = await criarFiscalCertificate(req, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function validate(req, res) {
  try {
    const result = await validarFiscalCertificate(req, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  create,
  index,
  validate
};
