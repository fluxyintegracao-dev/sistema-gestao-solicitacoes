'use strict';

const {
  listarDocumentosFiscais,
  obterDocumentoFiscal
} = require('../services/fiscalDocumentService');

function handleError(res, error) {
  console.error('[fiscal] documento fiscal:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar documento fiscal.'
  });
}

async function index(req, res) {
  try {
    const result = await listarDocumentosFiscais(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

async function show(req, res) {
  try {
    const document = await obterDocumentoFiscal(req.params.id);
    return res.json(document);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  index,
  show
};
