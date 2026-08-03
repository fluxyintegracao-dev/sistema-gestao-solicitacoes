'use strict';

const CUSTOS_RECEBIVEIS_MODULE_KEY = 'CUSTOS_RECEBIVEIS';

const CUSTOS_RECEBIVEIS_PERMISSIONS = Object.freeze({
  MODULE_ACCESS: 'custos_recebiveis.modulo.acessar',
  ALL_OBRAS_SCOPE: 'custos_recebiveis.escopo.todas_obras',
  DASHBOARD_VIEW: 'custos_recebiveis.dashboard.visualizar',
  COMPARATIVO_VIEW: 'custos_recebiveis.comparativo.visualizar',
  OBRAS_VIEW: 'custos_recebiveis.obras.visualizar',
  ESTRUTURA_VIEW: 'custos_recebiveis.estrutura_micro.visualizar',
  PLANEJAMENTO_VIEW: 'custos_recebiveis.planejamento.visualizar',
  MEDICAO_VIEW: 'custos_recebiveis.medicao.visualizar',
  REALIZADOS_VIEW: 'custos_recebiveis.realizados.visualizar',
  OBRIGACOES_VIEW: 'custos_recebiveis.obrigacoes.visualizar',
  AUDITORIA_VIEW: 'custos_recebiveis.auditoria.visualizar',
  ESTRUTURA_IMPORT: 'custos_recebiveis.estrutura_micro.importar',
  ESTRUTURA_PUBLISH: 'custos_recebiveis.estrutura_micro.publicar_versao',
  PLANEJAMENTO_COSTS: 'custos_recebiveis.planejamento.preencher_custos',
  PLANEJAMENTO_RECEIVABLES: 'custos_recebiveis.planejamento.preencher_recebiveis',
  PLANEJAMENTO_FINISH: 'custos_recebiveis.planejamento.finalizar',
  MEDICAO_CONSOLIDATE: 'custos_recebiveis.medicao.consolidar',
  REALIZADOS_UPDATE: 'custos_recebiveis.realizados.atualizar',
  REALIZADOS_RECONCILE: 'custos_recebiveis.realizados.reconciliar',
  REOPEN_REQUEST: 'custos_recebiveis.reabertura.solicitar',
  REOPEN_APPROVE: 'custos_recebiveis.reabertura.aprovar',
  OBLIGATION_BYPASS: 'custos_recebiveis.obrigacoes.conceder_bypass',
  CONFIG_MANAGE: 'custos_recebiveis.configuracoes.gerenciar',
  REPORT_EXPORT: 'custos_recebiveis.relatorio.exportar'
});

module.exports = {
  CUSTOS_RECEBIVEIS_MODULE_KEY,
  CUSTOS_RECEBIVEIS_PERMISSIONS
};
