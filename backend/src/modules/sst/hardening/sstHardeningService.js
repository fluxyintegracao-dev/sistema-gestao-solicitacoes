'use strict';

const { Op } = require('sequelize');
const {
  SstAutomationLog,
  SstHardeningPolicy,
  SstIntegrationLog,
  SstWorkflowLog
} = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { getSstFeatureFlags } = require('../feature-flags/sstFeatureFlagsService');

async function gerarStatusHardeningSst(query = {}) {
  const flags = await getSstFeatureFlags();
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.obra_id) where.obra_id = query.obra_id;

  const [
    politicasAtivas,
    politicasRecentes,
    workflowsLentos,
    automacoesComErro,
    integracoesComErro
  ] = await Promise.all([
    SstHardeningPolicy.count({ where: { ativo: true } }),
    SstHardeningPolicy.findAll({ where: {}, order: [['updatedAt', 'DESC']], limit: 20 }),
    SstWorkflowLog.count({ where: { ...where, duracao_ms: { [Op.gte]: 30000 } } }),
    SstAutomationLog.count({ where: { ...where, status: 'ERRO' } }),
    SstIntegrationLog.count({ where: { ...where, status: 'ERRO' } })
  ]);

  const pendencias = [];
  if (!flags[SST_FEATURE_FLAGS.HARDENING_OPERACIONAL]) pendencias.push('Feature flag de hardening operacional desabilitada.');
  if (!politicasAtivas) pendencias.push('Nenhuma politica de hardening ativa foi cadastrada.');
  if (workflowsLentos > 0) pendencias.push('Existem workflows com duracao acima do limite conceitual de 30s.');
  if (automacoesComErro > 0 || integracoesComErro > 0) pendencias.push('Existem erros em automacoes ou integracoes controladas.');

  return {
    flags,
    cards: {
      politicas_ativas: politicasAtivas,
      workflows_lentos: workflowsLentos,
      automacoes_com_erro: automacoesComErro,
      integracoes_com_erro: integracoesComErro
    },
    status: {
      nivel: pendencias.length ? 'ATENCAO' : 'CONTROLADO',
      pendencias
    },
    politicas: politicasRecentes
  };
}

async function executarComHardeningSst(nome, fn, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = Number(options.timeout_ms || 30000);
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout SST em ${nome}`)), timeoutMs);
  });

  try {
    const resultado = await Promise.race([fn(), timeout]);
    return {
      ok: true,
      duracao_ms: Date.now() - startedAt,
      resultado
    };
  } catch (error) {
    return {
      ok: false,
      duracao_ms: Date.now() - startedAt,
      erro: error.message
    };
  }
}

module.exports = {
  executarComHardeningSst,
  gerarStatusHardeningSst
};
