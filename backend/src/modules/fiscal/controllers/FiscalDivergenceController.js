'use strict';

const { listarDivergenciasFiscais } = require('../services/fiscalDivergenceService');

function handleError(res, error) {
  console.error('[fiscal] divergencias fiscais:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao processar divergencias fiscais.'
  });
}

async function index(req, res) {
  try {
    const result = await listarDivergenciasFiscais(req.query || {});
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  index
};
