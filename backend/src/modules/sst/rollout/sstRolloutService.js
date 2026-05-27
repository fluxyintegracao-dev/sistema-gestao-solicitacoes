'use strict';

const { Op } = require('sequelize');
const {
  SstOperationalAlert,
  SstRolloutPlano
} = require('../../../models');
const { getSstFeatureFlags } = require('../feature-flags/sstFeatureFlagsService');

function buildWhere(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.obra_id) where.obra_id = query.obra_id;
  return where;
}

async function gerarStatusRolloutSst(query = {}) {
  const where = buildWhere(query);
  const flags = await getSstFeatureFlags();
  const [planosAtivos, planosPausados, planosRecentes, alertasAbertos] = await Promise.all([
    SstRolloutPlano.count({ where: { ...where, status: 'ATIVO' } }),
    SstRolloutPlano.count({ where: { ...where, status: 'PAUSADO' } }),
    SstRolloutPlano.findAll({
      where: { ...where, status: { [Op.in]: ['PLANEJADO', 'ATIVO', 'PAUSADO'] } },
      order: [['updatedAt', 'DESC']],
      limit: 20
    }),
    SstOperationalAlert.count({ where: { ...where, status: 'ABERTO' } })
  ]);

  const flagsCriticasAtivas = [
    'SST_ROLLOUT_ASSISTIDO',
    'SST_TELEMETRIA_OPERACIONAL',
    'SST_HARDENING_OPERACIONAL',
    'SST_MONITORAMENTO_PRODUCAO'
  ].filter((flag) => flags[flag]);

  return {
    filtros: {
      empresa_id: query.empresa_id || null,
      obra_id: query.obra_id || null
    },
    flags,
    cards: {
      planos_ativos: planosAtivos,
      planos_pausados: planosPausados,
      alertas_abertos: alertasAbertos,
      flags_controle_ativas: flagsCriticasAtivas.length
    },
    readiness: {
      nivel: flags.SST_ROLLOUT_ASSISTIDO && flags.SST_TELEMETRIA_OPERACIONAL ? 'PRONTO_PILOTO' : 'CONTROLADO_MANUAL',
      pode_ampliar_rollout: planosAtivos > 0 && alertasAbertos === 0 && flags.SST_ROLLOUT_ASSISTIDO,
      observacao: flags.SST_ROLLOUT_ASSISTIDO
        ? 'Rollout assistido habilitado. Ampliar apenas com telemetria e alertas sob controle.'
        : 'Rollout assistido desabilitado. Operacao segue manual e sem ativacao gradual automatizada.'
    },
    planos: planosRecentes
  };
}

async function registrarRollbackRolloutSst(planoId, motivo, usuario_id = null) {
  const plano = await SstRolloutPlano.findByPk(planoId);
  if (!plano) {
    const error = new Error('Plano de rollout SST nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await plano.update({
    status: 'PAUSADO',
    rollback_em: new Date(),
    rollback_motivo: motivo || 'Rollback operacional solicitado.',
    atualizado_por: usuario_id
  });

  return plano;
}

module.exports = {
  gerarStatusRolloutSst,
  registrarRollbackRolloutSst
};
