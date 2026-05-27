'use strict';

const { Op } = require('sequelize');
const {
  SstAutomationLog,
  SstBlockingLog,
  SstIntegrationLog,
  SstOperationalAlert,
  SstTelemetryMetric,
  SstWorkflowLog
} = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { getSstFeatureFlags, isSstFeatureEnabled } = require('../feature-flags/sstFeatureFlagsService');

function buildWhere(query = {}, model = null) {
  const where = {};
  if (query.empresa_id && (!model || model.rawAttributes?.empresa_id)) where.empresa_id = query.empresa_id;
  if (query.obra_id && (!model || model.rawAttributes?.obra_id)) where.obra_id = query.obra_id;
  if (query.colaborador_id && (!model || model.rawAttributes?.colaborador_id)) where.colaborador_id = query.colaborador_id;
  return where;
}

async function countBy(model, field, where = {}) {
  const rows = await model.findAll({
    attributes: [
      field,
      [model.sequelize.fn('COUNT', model.sequelize.col(field)), 'total']
    ],
    where,
    group: [field],
    raw: true
  });
  return rows.reduce((acc, row) => {
    acc[row[field] || 'SEM_VALOR'] = Number(row.total || 0);
    return acc;
  }, {});
}

async function avgDuration(model, where = {}) {
  const value = await model.findOne({
    attributes: [[model.sequelize.fn('AVG', model.sequelize.col('duracao_ms')), 'media']],
    where: { ...where, duracao_ms: { [Op.ne]: null } },
    raw: true
  });
  return Math.round(Number(value?.media || 0));
}

async function registrarMetricaSst(payload = {}, usuario_id = null) {
  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.TELEMETRIA_OPERACIONAL);
  if (!enabled) {
    return {
      registrada: false,
      status: 'IGNORADO_FLAG_DESATIVADA',
      flag: SST_FEATURE_FLAGS.TELEMETRIA_OPERACIONAL
    };
  }

  const metrica = await SstTelemetryMetric.create({
    tipo_metrica: payload.tipo_metrica,
    escopo_tipo: payload.escopo_tipo || 'SISTEMA',
    empresa_id: payload.empresa_id || null,
    obra_id: payload.obra_id || null,
    colaborador_id: payload.colaborador_id || null,
    referencia_tipo: payload.referencia_tipo || null,
    referencia_id: payload.referencia_id || null,
    valor: payload.valor ?? null,
    unidade: payload.unidade || null,
    status: payload.status || 'REGISTRADO',
    duracao_ms: payload.duracao_ms || null,
    payload_json: payload.payload_json ? JSON.stringify(payload.payload_json) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });

  return { registrada: true, metrica };
}

async function gerarResumoTelemetriaSst(query = {}) {
  const baseWhere = buildWhere(query, SstTelemetryMetric);
  const logWhere = buildWhere(query);
  const erroWhere = { ...logWhere, status: { [Op.in]: ['ERRO', 'FALHA'] } };
  const flags = await getSstFeatureFlags();

  const [
    metricasTotal,
    metricasPorTipo,
    metricasPorStatus,
    alertasAbertos,
    alertasCriticos,
    workflowsLentos,
    mediaWorkflowMs,
    mediaAutomacaoMs,
    falhasWorkflow,
    falhasAutomacao,
    falhasIntegracao,
    falhasBloqueio,
    ultimasMetricas
  ] = await Promise.all([
    SstTelemetryMetric.count({ where: baseWhere }),
    countBy(SstTelemetryMetric, 'tipo_metrica', baseWhere),
    countBy(SstTelemetryMetric, 'status', baseWhere),
    SstOperationalAlert.count({ where: { ...logWhere, status: 'ABERTO' } }),
    SstOperationalAlert.count({ where: { ...logWhere, status: 'ABERTO', criticidade: { [Op.in]: ['CRITICA', 'EMERGENCIAL'] } } }),
    SstWorkflowLog.count({ where: { ...logWhere, duracao_ms: { [Op.gte]: 30000 } } }),
    avgDuration(SstWorkflowLog, logWhere),
    avgDuration(SstAutomationLog, logWhere),
    SstWorkflowLog.count({ where: erroWhere }),
    SstAutomationLog.count({ where: erroWhere }),
    SstIntegrationLog.count({ where: erroWhere }),
    SstBlockingLog.count({ where: erroWhere }),
    SstTelemetryMetric.findAll({ where: baseWhere, order: [['createdAt', 'DESC']], limit: 30 })
  ]);

  const falhasTotal = falhasWorkflow + falhasAutomacao + falhasIntegracao + falhasBloqueio;

  return {
    filtros: {
      empresa_id: query.empresa_id || null,
      obra_id: query.obra_id || null,
      colaborador_id: query.colaborador_id || null
    },
    flags,
    cards: {
      metricas_total: metricasTotal,
      falhas_total: falhasTotal,
      alertas_abertos: alertasAbertos,
      alertas_criticos: alertasCriticos,
      workflows_lentos: workflowsLentos,
      media_workflow_ms: mediaWorkflowMs,
      media_automacao_ms: mediaAutomacaoMs
    },
    status: {
      metricas_por_tipo: metricasPorTipo,
      metricas_por_status: metricasPorStatus,
      falhas: {
        workflow: falhasWorkflow,
        automacao: falhasAutomacao,
        integracao: falhasIntegracao,
        bloqueio: falhasBloqueio
      }
    },
    saude: {
      nivel: falhasTotal > 0 || alertasCriticos > 0 ? 'ATENCAO' : 'CONTROLADO',
      observacao: falhasTotal > 0
        ? 'Existem falhas operacionais recentes que devem ser revisadas antes de ampliar o rollout.'
        : 'Sem falhas operacionais registradas nos logs consultados.'
    },
    ultimas_metricas: ultimasMetricas
  };
}

module.exports = {
  gerarResumoTelemetriaSst,
  registrarMetricaSst
};
