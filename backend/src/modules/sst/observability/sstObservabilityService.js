'use strict';

const { Op } = require('sequelize');
const {
  SstAutomationLog,
  SstBlockingLog,
  SstBloqueioOperacional,
  SstComplianceScore,
  SstEventoOperacional,
  SstIntegrationLog,
  SstNotificacao,
  SstPendenciaOperacional,
  SstWorkflowExecucao,
  SstWorkflowLog
} = require('../../../models');
const { getSstFeatureFlags } = require('../feature-flags/sstFeatureFlagsService');

function buildWhere(query = {}, model = null) {
  const where = {};
  if (query.empresa_id && (!model || model.rawAttributes?.empresa_id)) where.empresa_id = query.empresa_id;
  if (query.obra_id && (!model || model.rawAttributes?.obra_id)) where.obra_id = query.obra_id;
  if (query.colaborador_id && (!model || model.rawAttributes?.colaborador_id)) where.colaborador_id = query.colaborador_id;
  return where;
}

async function countBy(model, field, where = {}) {
  if (!model) return {};
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

async function gerarObservabilidadeSst(query = {}) {
  const baseWhere = buildWhere(query);
  const erroWhere = { ...baseWhere, status: { [Op.in]: ['ERRO', 'FALHA'] } };
  const flags = await getSstFeatureFlags();

  const [
    workflowsPorStatus,
    workflowLogsStatus,
    automationLogsStatus,
    integrationLogsStatus,
    blockingLogsStatus,
    eventosAbertos,
    notificacoesNaoLidas,
    pendenciasAbertas,
    pendenciasCriticas,
    bloqueiosAbertos,
    scoresRecentes,
    errosWorkflows,
    errosAutomacoes,
    errosIntegracoes,
    errosBloqueios,
    ultimosWorkflowLogs,
    ultimosAutomationLogs,
    ultimosIntegrationLogs,
    ultimosBlockingLogs
  ] = await Promise.all([
    countBy(SstWorkflowExecucao, 'status', baseWhere),
    countBy(SstWorkflowLog, 'status', baseWhere),
    countBy(SstAutomationLog, 'status', baseWhere),
    countBy(SstIntegrationLog, 'status', baseWhere),
    countBy(SstBlockingLog, 'status', baseWhere),
    SstEventoOperacional.count({ where: { ...baseWhere, status: 'ABERTO' } }),
    SstNotificacao.count({ where: { ...baseWhere, status: 'NAO_LIDA' } }),
    SstPendenciaOperacional.count({ where: { ...baseWhere, status: 'ABERTA' } }),
    SstPendenciaOperacional.count({ where: { ...baseWhere, status: 'ABERTA', criticidade: { [Op.in]: ['CRITICA', 'EMERGENCIAL'] } } }),
    SstBloqueioOperacional.count({ where: { ...baseWhere, status: 'ABERTO' } }),
    SstComplianceScore.count({ where: baseWhere }),
    SstWorkflowLog.count({ where: erroWhere }),
    SstAutomationLog.count({ where: erroWhere }),
    SstIntegrationLog.count({ where: erroWhere }),
    SstBlockingLog.count({ where: erroWhere }),
    SstWorkflowLog.findAll({ where: baseWhere, order: [['createdAt', 'DESC']], limit: 20 }),
    SstAutomationLog.findAll({ where: baseWhere, order: [['createdAt', 'DESC']], limit: 20 }),
    SstIntegrationLog.findAll({ where: baseWhere, order: [['createdAt', 'DESC']], limit: 20 }),
    SstBlockingLog.findAll({ where: baseWhere, order: [['createdAt', 'DESC']], limit: 20 })
  ]);

  const errosTotal = errosWorkflows + errosAutomacoes + errosIntegracoes + errosBloqueios;

  return {
    filtros: {
      empresa_id: query.empresa_id || null,
      obra_id: query.obra_id || null,
      colaborador_id: query.colaborador_id || null
    },
    flags,
    cards: {
      eventos_abertos: eventosAbertos,
      notificacoes_nao_lidas: notificacoesNaoLidas,
      pendencias_abertas: pendenciasAbertas,
      pendencias_criticas: pendenciasCriticas,
      bloqueios_abertos: bloqueiosAbertos,
      scores_registrados: scoresRecentes,
      erros_operacionais: errosTotal
    },
    status: {
      workflows: workflowsPorStatus,
      workflow_logs: workflowLogsStatus,
      automation_logs: automationLogsStatus,
      integration_logs: integrationLogsStatus,
      blocking_logs: blockingLogsStatus
    },
    saude_operacional: {
      nivel: errosTotal > 0 ? 'ATENCAO' : 'CONTROLADO',
      erro_total: errosTotal,
      observacao: errosTotal > 0
        ? 'Existem erros registrados nos logs operacionais SST.'
        : 'Sem erros operacionais registrados nos logs SST consultados.'
    },
    ultimos_logs: {
      workflows: ultimosWorkflowLogs,
      automacoes: ultimosAutomationLogs,
      integracoes: ultimosIntegrationLogs,
      bloqueios: ultimosBlockingLogs
    }
  };
}

module.exports = {
  gerarObservabilidadeSst
};
