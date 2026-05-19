'use strict';

const {
  atualizarFiscalCompany,
  criarFiscalCompany,
  listarFiscalCompanies
} = require('../services/fiscalCompanyService');

function handleError(res, error) {
  console.error('[fiscal] empresa fiscal:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar empresa fiscal.'
  });
}

async function index(req, res) {
  try {
    const result = await listarFiscalCompanies(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const company = await criarFiscalCompany(req, req.body);
    return res.status(201).json(company);
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const company = await atualizarFiscalCompany(req, req.params.id, req.body);
    return res.json(company);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  create,
  index,
  update
};
