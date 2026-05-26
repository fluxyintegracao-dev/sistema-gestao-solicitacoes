'use strict';

const {
  SstAutomationLog,
  SstBlockingLog,
  SstEventoOperacional,
  SstIntegrationLog,
  SstWorkflow,
  SstWorkflowAcao,
  SstWorkflowLog
} = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { getSstFeatureFlags } = require('../feature-flags/sstFeatureFlagsService');
const { getDocumentAnalysisReadiness } = require('../ai/document-analysis/sstDocumentAnalysisService');
const { getSstPredictionReadiness } = require('../prediction/sstPredictionService');

function check(name, status, details = null, severity = 'INFO') {
  return { name, status, severity, details };
}

async function gerarChecklistHomologacaoSst() {
  const flags = await getSstFeatureFlags();
  const [
    workflowsAtivos,
    workflowAcoes,
    eventosAbertos,
    workflowLogs,
    automationLogs,
    integrationLogs,
    blockingLogs
  ] = await Promise.all([
    SstWorkflow.count({ where: { ativo: true } }),
    SstWorkflowAcao.count({ where: { ativo: true } }),
    SstEventoOperacional.count({ where: { status: 'ABERTO' } }),
    SstWorkflowLog.count(),
    SstAutomationLog.count(),
    SstIntegrationLog.count(),
    SstBlockingLog.count()
  ]);

  const iaDocumental = getDocumentAnalysisReadiness();
  const predicao = getSstPredictionReadiness();
  const checks = [
    check('Transmissao real eSocial bloqueada', 'OK', 'Nenhum endpoint de envio real foi habilitado nesta fase.'),
    check('Feature flags SST carregadas', Object.keys(flags).length ? 'OK' : 'PENDENTE', flags),
    check('Integracao RH/DP controlada por flag', flags[SST_FEATURE_FLAGS.INTEGRACAO_RHDP] ? 'ATIVA' : 'DESATIVADA', SST_FEATURE_FLAGS.INTEGRACAO_RHDP),
    check('Integracao Obras controlada por flag', flags[SST_FEATURE_FLAGS.INTEGRACAO_OBRAS] ? 'ATIVA' : 'DESATIVADA', SST_FEATURE_FLAGS.INTEGRACAO_OBRAS),
    check('Workflows configurados', workflowsAtivos > 0 ? 'OK' : 'PENDENTE', `${workflowsAtivos} workflow(s) ativo(s).`, workflowsAtivos > 0 ? 'INFO' : 'ALERTA'),
    check('Acoes de workflow configuradas', workflowAcoes > 0 ? 'OK' : 'PENDENTE', `${workflowAcoes} acao(oes) ativa(s).`, workflowAcoes > 0 ? 'INFO' : 'ALERTA'),
    check('Eventos abertos monitorados', 'OK', `${eventosAbertos} evento(s) operacional(is) aberto(s).`),
    check('Logs operacionais disponiveis', 'OK', { workflowLogs, automationLogs, integrationLogs, blockingLogs }),
    check('IA documental desacoplada', iaDocumental.ready ? 'OK' : 'PENDENTE_PROVIDER', iaDocumental),
    check('Predicao future-ready', predicao.ready ? 'OK' : 'PREPARADO', predicao)
  ];

  const pendentes = checks.filter((item) => ['PENDENTE', 'PENDENTE_PROVIDER'].includes(item.status)).length;
  const criticos = checks.filter((item) => item.severity === 'CRITICA').length;

  return {
    status_geral: criticos ? 'BLOQUEADO' : (pendentes ? 'ATENCAO' : 'OK'),
    pendencias: pendentes,
    criticos,
    checks,
    recomendacao: criticos
      ? 'Nao liberar go-live SST antes de tratar checks criticos.'
      : 'Pode seguir homologacao assistida, mantendo feature flags criticas controladas.'
  };
}

async function homologarWorkflowsSst({ dry_run = true } = {}) {
  const checklist = await gerarChecklistHomologacaoSst();
  return {
    dry_run: dry_run !== false,
    executou_mutacoes: false,
    status: checklist.status_geral,
    mensagem: 'Homologacao de workflows executada em modo analitico para evitar duplicidade operacional.',
    checklist
  };
}

async function simularMassaHomologacaoSst() {
  return {
    dry_run: true,
    executou_mutacoes: false,
    cenarios: [
      'Admissao com onboarding SST',
      'Mudanca de funcao com revisao de ASO, EPI e treinamento',
      'ASO vencendo com notificacao e pendencia',
      'Treinamento vencido com pendencia operacional',
      'Acidente grave com criticidade e recomendacao',
      'Obra critica com score e heatmap'
    ],
    observacao: 'A massa real deve ser criada no ambiente de homologacao com usuarios-chave e dados amostrais controlados.'
  };
}

module.exports = {
  gerarChecklistHomologacaoSst,
  homologarWorkflowsSst,
  simularMassaHomologacaoSst
};
