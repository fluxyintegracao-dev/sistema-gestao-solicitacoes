'use strict';

const metricsService = require('../services/governancaMetricsService');
const { buildExport } = require('../services/governancaExportService');
const { logAccess } = require('../services/governancaAccessLogService');
const operationalAudit = require('../services/auditoriaOperacionalService');
const { canViewOperationalAuditUsers } = require('../../../services/authorizationService');

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

async function auditoriaOperacionalResumo(req, res, next) {
  try {
    res.json(await operationalAudit.getSummary(req.query));
  } catch (error) { next(error); }
}

async function auditoriaOperacionalUsuarios(req, res, next) {
  try {
    res.json(await operationalAudit.getUsers(req.query));
  } catch (error) { next(error); }
}

async function auditoriaOperacionalEventos(req, res, next) {
  try {
    res.json(await operationalAudit.getEvents(req.query));
  } catch (error) { next(error); }
}

async function auditoriaOperacionalOpcoes(req, res, next) {
  try {
    const options = await operationalAudit.getOptions(req.query);
    if (!(await canViewOperationalAuditUsers(req.user))) options.usuarios = [];
    res.json(options);
  } catch (error) { next(error); }
}

async function auditoriaOperacionalNavegacao(req, res, next) {
  try {
    await operationalAudit.recordNavigation(req, req.body);
    res.status(202).json({ ok: true });
  } catch (error) { next(error); }
}

async function auditoriaOperacionalExportar(req, res, next) {
  try {
    const csv = await operationalAudit.exportCsv(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-operacional-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
}

module.exports = {
  adocao,
  auditoria,
  auditoriaOperacionalEventos,
  auditoriaOperacionalExportar,
  auditoriaOperacionalNavegacao,
  auditoriaOperacionalOpcoes,
  auditoriaOperacionalResumo,
  auditoriaOperacionalUsuarios,
  dashboard,
  eficiencia,
  executiva,
  exportar,
  gerarSnapshot,
  health,
  produto,
  snapshots
};
