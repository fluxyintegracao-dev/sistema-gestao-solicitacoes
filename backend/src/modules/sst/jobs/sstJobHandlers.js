'use strict';

const { analisarDocumentoSstComIa } = require('../ai/document-analysis/sstDocumentAnalysisService');
const { gerarAnalyticsSst } = require('../analytics/sstAnalyticsService');
const { gerarHeatmapSst } = require('../analytics/sstExecutiveAnalyticsService');
const { sincronizarNotificacoesSst } = require('../notifications/sstNotificationService');
const { recalcularScoreSst } = require('../scoring/sstScoringService');
const { processarEventoWorkflow, processarFilaWorkflowSst } = require('../workflow-engine/sstWorkflowEngineService');

async function score(payload = {}) {
  return recalcularScoreSst(payload);
}

async function notifications(payload = {}) {
  return sincronizarNotificacoesSst({ usuario_id: payload.usuario_id || null });
}

async function workflow(payload = {}) {
  if (payload.evento_id) {
    return processarEventoWorkflow(payload.evento_id, { usuario_id: payload.usuario_id || null });
  }
  return processarFilaWorkflowSst({ limit: payload.limit || 25, usuario_id: payload.usuario_id || null });
}

async function analytics(payload = {}) {
  return gerarAnalyticsSst(payload);
}

async function heatmap(payload = {}) {
  return gerarHeatmapSst(payload);
}

async function iaDocumental(payload = {}) {
  if (!payload.documento_id) {
    return {
      skipped: true,
      reason: 'documento_id nao informado para IA documental SST.'
    };
  }
  return analisarDocumentoSstComIa({
    documento_id: payload.documento_id,
    provider: payload.provider || null,
    usuario_id: payload.usuario_id || null
  });
}

const SST_JOB_HANDLERS = {
  SstScoreRecalculationJob: score,
  SstNotificationJob: notifications,
  SstWorkflowJob: workflow,
  SstAnalyticsRefreshJob: analytics,
  SstHeatmapRefreshJob: heatmap,
  SstIaDocumentAnalysisJob: iaDocumental
};

module.exports = {
  SST_JOB_HANDLERS
};
