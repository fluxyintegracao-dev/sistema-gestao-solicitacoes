'use strict';

const metricsService = require('../services/governancaMetricsService');
const { buildExport } = require('../services/governancaExportService');
const { logAccess } = require('../services/governancaAccessLogService');

async function dashboard(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_DASHBOARD', req.query);
    const data = await metricsService.getDashboard(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function executiva(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_EXECUTIVA');
    res.json(await metricsService.getExecutiveOverview());
  } catch (error) {
    next(error);
  }
}

async function adocao(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_ADOCAO');
    res.json(await metricsService.getAdoptionMetrics());
  } catch (error) {
    next(error);
  }
}

async function eficiencia(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_EFICIENCIA');
    res.json(await metricsService.getOperationalEfficiency());
  } catch (error) {
    next(error);
  }
}

async function auditoria(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_AUDITORIA', req.query);
    res.json(await metricsService.getAuditGovernance(req.query));
  } catch (error) {
    next(error);
  }
}

async function health(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_HEALTH');
    res.json(await metricsService.getTechnicalHealth());
  } catch (error) {
    next(error);
  }
}

async function produto(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_PRODUTO');
    res.json(await metricsService.getProductEvolution());
  } catch (error) {
    next(error);
  }
}

async function snapshots(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_SNAPSHOTS', req.query);
    res.json(await metricsService.listSnapshots(req.query));
  } catch (error) {
    next(error);
  }
}

async function gerarSnapshot(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_GERAR_SNAPSHOT', req.body);
    const snapshot = await metricsService.createDailySnapshot({
      dataReferencia: req.body?.data_referencia
    });
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
}

async function exportar(req, res, next) {
  try {
    await logAccess(req, 'GOVERNANCA_EXPORTAR', req.query);
    const rows = await metricsService.exportRows(req.query?.type);
    const exported = buildExport({
      rows,
      format: req.query?.format,
      title: 'Governanca do Sistema FLUXY'
    });
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.body);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  adocao,
  auditoria,
  dashboard,
  eficiencia,
  executiva,
  exportar,
  gerarSnapshot,
  health,
  produto,
  snapshots
};
