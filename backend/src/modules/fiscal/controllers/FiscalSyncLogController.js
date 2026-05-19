'use strict';

const { listarLogsSincronizacao } = require('../services/fiscalSyncLogService');

function handleError(res, error) {
  console.error('[fiscal] logs de sincronizacao:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno ao consultar logs fiscais.'
  });
}

async function index(req, res) {
  try {
    const result = await listarLogsSincronizacao(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  index
};
