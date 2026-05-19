'use strict';

const {
  gerarArquivoLoteContabil,
  gerarLoteContabil,
  gerarUrlLoteContabil,
  listarLotesContabeis,
  obterLoteContabil
} = require('../services/fiscalAccountingBatchService');

function handleError(res, error) {
  console.error('[fiscal] lote contabil:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar lote contabil fiscal.'
  });
}

async function index(req, res) {
  try {
    const result = await listarLotesContabeis(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function show(req, res) {
  try {
    const result = await obterLoteContabil(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const result = await gerarLoteContabil(req, req.body || {});
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function generate(req, res) {
  try {
    const result = await gerarArquivoLoteContabil(req, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function zipUrl(req, res) {
  try {
    const result = await gerarUrlLoteContabil(req, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  create,
  generate,
  index,
  show,
  zipUrl
};
