'use strict';

const {
  executarProbeStorageFiscal,
  getDashboardFiscal,
  getDiagnosticoFiscal,
  getRelatorioFiscalOperacional
} = require('../services/fiscalDashboardService');
const { getFiscalS3Config, isFiscalS3Configured } = require('../services/fiscalS3Service');

function handleError(res, error) {
  console.error('[fiscal] erro:', error);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Erro interno no modulo fiscal.'
  });
}

async function health(req, res) {
  try {
    const storage = getFiscalS3Config();
    return res.json({
      ok: true,
      module: 'FISCAL',
      sefaz_enabled: process.env.FISCAL_SEFAZ_ENABLED === 'true',
      storage_configured: isFiscalS3Configured(),
      storage_prefix: storage.prefix
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function dashboard(req, res) {
  try {
    const data = await getDashboardFiscal();
    return res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
}

async function diagnostics(req, res) {
  try {
    const data = await getDiagnosticoFiscal();
    return res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
}

async function operationalReport(req, res) {
  try {
    const data = await getRelatorioFiscalOperacional(req.query || {});
    return res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
}

async function storageProbe(req, res) {
  try {
    const data = await executarProbeStorageFiscal({ req });
    return res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  dashboard,
  diagnostics,
  health,
  operationalReport,
  storageProbe
};
