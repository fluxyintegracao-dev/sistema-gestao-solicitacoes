'use strict';

const { Op } = require('sequelize');
const {
  SstJob,
  SstPerformanceMetric
} = require('../../../models');
const { getCacheStatusSst } = require('../cache/sstCacheService');
const { gerarResumoGovernancaSst } = require('../governance/sstGovernanceService');
const { gerarResumoQualidadeSst } = require('../quality/sstQualityService');
const { gerarStatusFilasSst } = require('../queues/sstQueueService');
const { gerarMonitoramentoProducaoSst } = require('../production/sstProductionReadinessService');

async function registrarPerformanceMetricSst(payload = {}, usuario_id = null) {
  return SstPerformanceMetric.create({
    metric_name: payload.metric_name,
    scope_type: payload.scope_type || 'SISTEMA',
    empresa_id: payload.empresa_id || null,
    obra_id: payload.obra_id || null,
    colaborador_id: payload.colaborador_id || null,
    value: payload.value ?? 0,
    unit: payload.unit || null,
    sampled_at: payload.sampled_at || new Date(),
    payload_json: payload.payload_json ? JSON.stringify(payload.payload_json) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });
}

async function gerarObservabilidadeAvancadaSst(query = {}) {
  const [producao, filas, cache, qualidade, governanca, performanceRecentes] = await Promise.all([
    gerarMonitoramentoProducaoSst(query),
    gerarStatusFilasSst(query),
    getCacheStatusSst(),
    gerarResumoQualidadeSst(),
    gerarResumoGovernancaSst(),
    SstPerformanceMetric.findAll({ order: [['sampled_at', 'DESC']], limit: 30 })
  ]);

  const jobsAtrasados = await SstJob.count({
    where: {
      status: 'PENDENTE',
      next_run_at: { [Op.lt]: new Date() }
    }
  });

  return {
    producao,
    filas,
    cache,
    qualidade,
    governanca,
    performance: {
      recentes: performanceRecentes,
      jobs_atrasados: jobsAtrasados
    },
    readiness_enterprise: {
      nivel: jobsAtrasados > 0 || filas.snapshot.dead_letter_count > 0 ? 'ATENCAO' : 'CONTROLADO',
      observacao: jobsAtrasados > 0
        ? 'Existem jobs pendentes atrasados. Verificar worker e filas antes de ampliar rollout.'
        : 'Sem jobs atrasados na fila SST consultada.'
    }
  };
}

module.exports = {
  gerarObservabilidadeAvancadaSst,
  registrarPerformanceMetricSst
};
