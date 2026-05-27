'use strict';

const { Op } = require('sequelize');
const {
  SstAutomationLog,
  SstComplianceScore,
  SstIntegrationLog,
  SstNotificacao,
  SstOperationalAlert,
  SstWorkflowLog
} = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { isSstFeatureEnabled } = require('../feature-flags/sstFeatureFlagsService');

async function upsertAlerta(payload, usuario_id = null) {
  const existente = await SstOperationalAlert.findOne({
    where: {
      tipo_alerta: payload.tipo_alerta,
      status: 'ABERTO',
      origem_tipo: payload.origem_tipo || null,
      origem_id: payload.origem_id || null
    }
  });

  if (existente) {
    return { criado: false, alerta: existente };
  }

  const alerta = await SstOperationalAlert.create({
    ...payload,
    status: payload.status || 'ABERTO',
    payload_json: payload.payload_json ? JSON.stringify(payload.payload_json) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });
  return { criado: true, alerta };
}

async function gerarAlertasOperacionaisSst(query = {}, usuario_id = null) {
  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.ALERTAS_AVANCADOS);
  if (!enabled) {
    return {
      gerado: false,
      status: 'IGNORADO_FLAG_DESATIVADA',
      flag: SST_FEATURE_FLAGS.ALERTAS_AVANCADOS,
      alertas: []
    };
  }

  const baseWhere = {};
  if (query.empresa_id) baseWhere.empresa_id = query.empresa_id;
  if (query.obra_id) baseWhere.obra_id = query.obra_id;

  const [workflowErrors, automationErrors, integrationErrors, notificacoes, scoresCriticos] = await Promise.all([
    SstWorkflowLog.findAll({ where: { ...baseWhere, status: 'ERRO' }, order: [['createdAt', 'DESC']], limit: 10 }),
    SstAutomationLog.findAll({ where: { ...baseWhere, status: 'ERRO' }, order: [['createdAt', 'DESC']], limit: 10 }),
    SstIntegrationLog.findAll({ where: { ...baseWhere, status: 'ERRO' }, order: [['createdAt', 'DESC']], limit: 10 }),
    SstNotificacao.count({ where: { ...baseWhere, status: 'NAO_LIDA' } }),
    SstComplianceScore.findAll({
      where: { ...baseWhere, nivel: { [Op.in]: ['CRITICO', 'EMERGENCIAL'] } },
      order: [['calculado_em', 'DESC']],
      limit: 10
    })
  ]);

  const alertas = [];
  for (const log of workflowErrors) {
    alertas.push(await upsertAlerta({
      tipo_alerta: 'WORKFLOW_FALHA',
      criticidade: 'ALTA',
      empresa_id: log.empresa_id,
      obra_id: log.obra_id,
      colaborador_id: log.colaborador_id,
      titulo: 'Falha em workflow SST',
      mensagem: log.erro || log.mensagem || 'Workflow SST registrou erro.',
      origem_tipo: 'sst_workflow_logs',
      origem_id: log.id
    }, usuario_id));
  }
  for (const log of automationErrors) {
    alertas.push(await upsertAlerta({
      tipo_alerta: 'AUTOMACAO_FALHA',
      criticidade: 'ALTA',
      empresa_id: log.empresa_id,
      obra_id: log.obra_id,
      colaborador_id: log.colaborador_id,
      titulo: 'Falha em automacao SST',
      mensagem: log.erro || log.mensagem || 'Automacao SST registrou erro.',
      origem_tipo: 'sst_automation_logs',
      origem_id: log.id
    }, usuario_id));
  }
  for (const log of integrationErrors) {
    alertas.push(await upsertAlerta({
      tipo_alerta: 'INTEGRACAO_FALHA',
      criticidade: 'ALTA',
      empresa_id: log.empresa_id,
      obra_id: log.obra_id,
      colaborador_id: log.colaborador_id,
      titulo: 'Falha em integracao SST',
      mensagem: log.erro || log.mensagem || 'Integracao SST registrou erro.',
      origem_tipo: 'sst_integration_logs',
      origem_id: log.id
    }, usuario_id));
  }

  if (notificacoes > 100) {
    alertas.push(await upsertAlerta({
      tipo_alerta: 'EXCESSO_NOTIFICACOES',
      criticidade: 'MEDIA',
      titulo: 'Volume alto de notificacoes SST',
      mensagem: `Existem ${notificacoes} notificacoes SST nao lidas.`
    }, usuario_id));
  }

  for (const score of scoresCriticos) {
    alertas.push(await upsertAlerta({
      tipo_alerta: 'SCORE_CRITICO',
      criticidade: 'CRITICA',
      empresa_id: score.empresa_id,
      obra_id: score.obra_id,
      colaborador_id: score.colaborador_id,
      titulo: 'Score SST critico',
      mensagem: `Score ${score.score} no escopo ${score.escopo_tipo}.`,
      origem_tipo: 'sst_compliance_scores',
      origem_id: score.id
    }, usuario_id));
  }

  return {
    gerado: true,
    criados: alertas.filter((item) => item.criado).length,
    existentes: alertas.filter((item) => !item.criado).length,
    alertas: alertas.map((item) => item.alerta)
  };
}

module.exports = {
  gerarAlertasOperacionaisSst
};
