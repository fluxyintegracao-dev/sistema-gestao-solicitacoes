'use strict';

const UI_VISIBILITY_COMPONENTS = [
  {
    module: 'RELATORIOS',
    label: 'Hubs de relatorios',
    description: 'Cards de entrada para relatorios por modulo.',
    pages: [
      {
        key: 'relatorios.hub.compras',
        path: '/compras/relatorios',
        label: 'Relatorios de Compras',
        components: [
          { key: 'relatorios.compras.auditoria', label: 'Auditoria de compras', type: 'card' },
          { key: 'relatorios.compras.demanda_pedidos', label: 'Demanda e pedidos', type: 'card' },
          { key: 'relatorios.compras.evolucao', label: 'Evolucao mensal', type: 'card' },
          { key: 'relatorios.compras.compras_fornecedor', label: 'Compras por fornecedor', type: 'card' },
          { key: 'relatorios.compras.categorias_insumos', label: 'Categorias e insumos', type: 'card' },
          { key: 'relatorios.compras.precos_insumos', label: 'Precos por insumo', type: 'card' },
          { key: 'relatorios.compras.cotacoes', label: 'Cotacoes', type: 'card' },
          { key: 'relatorios.compras.pedidos_compra', label: 'Pedidos de compra', type: 'card' },
          { key: 'relatorios.compras.economia_cotacoes', label: 'Economia em cotacoes', type: 'card' },
          { key: 'relatorios.compras.pendencias_cotacoes', label: 'Pendencias de cotacoes', type: 'card' },
          { key: 'relatorios.compras.fornecedores', label: 'Fornecedores', type: 'card' },
          { key: 'relatorios.compras.ciclo', label: 'Ciclo de compras', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.financeiro',
        path: '/financeiro/relatorios',
        label: 'Relatorios Financeiros',
        components: [
          { key: 'relatorios.financeiro.grupo_consolidado', label: 'Grupo consolidado', type: 'card' },
          { key: 'relatorios.financeiro.fluxo_consolidado', label: 'Fluxo consolidado', type: 'card' },
          { key: 'relatorios.financeiro.dre', label: 'DRE', type: 'card' },
          { key: 'relatorios.financeiro.diagnostico_dre', label: 'Diagnostico DRE', type: 'card' },
          { key: 'relatorios.financeiro.intercompany', label: 'Intercompany', type: 'card' },
          { key: 'relatorios.financeiro.endividamento', label: 'Endividamento', type: 'card' },
          { key: 'relatorios.financeiro.analitico', label: 'Analitico financeiro', type: 'card' },
          { key: 'relatorios.financeiro.resultado_obras', label: 'Resultado de obras', type: 'card' },
          { key: 'relatorios.financeiro.centros_custo', label: 'Centros de custo', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.crm',
        path: '/crm/relatorios',
        label: 'Relatorios CRM',
        components: [
          { key: 'relatorios.crm.executivo', label: 'Executivo CRM', type: 'card' },
          { key: 'relatorios.crm.dashboard', label: 'Dashboard CRM', type: 'card' },
          { key: 'relatorios.crm.gerencial', label: 'Gerencial', type: 'card' },
          { key: 'relatorios.crm.sla', label: 'SLA', type: 'card' },
          { key: 'relatorios.crm.distribuicao', label: 'Distribuicao', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.comercial',
        path: '/comercial/relatorios',
        label: 'Relatorios Comerciais',
        components: [
          { key: 'relatorios.comercial.operacional', label: 'Painel comercial operacional', type: 'card' },
          { key: 'relatorios.comercial.mapa_unidades', label: 'Mapa de unidades', type: 'card' },
          { key: 'relatorios.comercial.contratos', label: 'Contratos de venda', type: 'card' },
          { key: 'relatorios.comercial.tabelas_preco', label: 'Tabelas de preco', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.provisionamento',
        path: '/provisoes-financeiras/relatorios',
        label: 'Relatorios de Provisionamento',
        components: [
          { key: 'relatorios.provisionamento.operacional', label: 'Painel operacional', type: 'card' },
          { key: 'relatorios.provisionamento.dashboard', label: 'Dashboard de previsao', type: 'card' },
          { key: 'relatorios.provisionamento.lista', label: 'Provisionamentos', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.rhdp',
        path: '/rh-dp/relatorios',
        label: 'Relatorios RH/DP',
        components: [
          { key: 'relatorios.rhdp.operacional', label: 'Painel operacional RH/DP', type: 'card' },
          { key: 'relatorios.rhdp.apuracao', label: 'Apuracao', type: 'card' },
          { key: 'relatorios.rhdp.fechamentos', label: 'Fechamentos', type: 'card' },
          { key: 'relatorios.rhdp.importacoes', label: 'Importacoes', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.contratos',
        path: '/contratos/relatorios',
        label: 'Relatorios de Contratos',
        components: [
          { key: 'relatorios.contratos.operacional', label: 'Painel operacional de contratos', type: 'card' },
          { key: 'relatorios.contratos.gestao', label: 'Gestao de contratos', type: 'card' }
        ]
      },
      {
        key: 'relatorios.hub.fiscal',
        path: '/fiscal/relatorios',
        label: 'Relatorios Fiscais',
        components: [
          { key: 'relatorios.fiscal.operacional', label: 'Painel operacional fiscal', type: 'card' },
          { key: 'relatorios.fiscal.documentos', label: 'Documentos fiscais', type: 'card' },
          { key: 'relatorios.fiscal.divergencias', label: 'Divergencias fiscais', type: 'card' },
          { key: 'relatorios.fiscal.logs', label: 'Logs de sincronizacao', type: 'card' }
        ]
      }
    ]
  },
  {
    module: 'FINANCEIRO',
    label: 'Financeiro executivo',
    description: 'Blocos do painel Grupo Consolidado.',
    pages: [
      {
        key: 'financeiro.grupo_consolidado',
        path: '/financeiro/relatorios/grupo-consolidado',
        label: 'Grupo Consolidado',
        components: [
          { key: 'financeiro.grupo_consolidado.metricas', label: 'Cards executivos', type: 'dashboard' },
          { key: 'financeiro.grupo_consolidado.caixa_empresas', label: 'Tabela caixa por empresa', type: 'table' },
          { key: 'financeiro.grupo_consolidado.riscos', label: 'Riscos executivos', type: 'dashboard' },
          { key: 'financeiro.grupo_consolidado.resultado_empresas', label: 'Tabela resultado por empresa', type: 'table' },
          { key: 'financeiro.grupo_consolidado.resultado_obras', label: 'Tabela resultado por obra', type: 'table' },
          { key: 'financeiro.grupo_consolidado.intercompany', label: 'Tabela intercompany', type: 'table' }
        ]
      },
      {
        key: 'financeiro.fluxo_caixa',
        path: '/financeiro/relatorios',
        label: 'Relatorios Financeiros',
        components: [
          { key: 'financeiro.fluxo_caixa.metricas', label: 'Cards de fluxo de caixa', type: 'dashboard' },
          { key: 'financeiro.fluxo_caixa.grafico', label: 'Grafico previsto x realizado', type: 'dashboard' },
          { key: 'financeiro.fluxo_caixa.detalhamento', label: 'Tabela detalhamento por periodo', type: 'table' }
        ]
      }
    ]
  },
  {
    module: 'CRM',
    label: 'CRM',
    description: 'Blocos executivos do CRM.',
    pages: [
      {
        key: 'crm.relatorio_executivo',
        path: '/crm/relatorios/executivo',
        label: 'Relatorio Executivo CRM',
        components: [
          { key: 'crm.relatorio_executivo.metricas', label: 'Cards executivos', type: 'dashboard' },
          { key: 'crm.relatorio_executivo.leitura', label: 'Leitura executiva', type: 'dashboard' },
          { key: 'crm.relatorio_executivo.distribuicoes', label: 'Distribuicoes', type: 'dashboard' }
        ]
      }
    ]
  },
  {
    module: 'COMERCIAL',
    label: 'Comercial',
    description: 'Blocos do relatorio comercial operacional.',
    pages: [
      {
        key: 'comercial.relatorio_operacional',
        path: '/comercial/relatorios/operacional',
        label: 'Relatorio Comercial Operacional',
        components: [
          { key: 'comercial.relatorio_operacional.metricas', label: 'Cards comerciais', type: 'dashboard' },
          { key: 'comercial.relatorio_operacional.distribuicoes_principais', label: 'Distribuicoes principais', type: 'dashboard' },
          { key: 'comercial.relatorio_operacional.contratos', label: 'Tabela contratos comerciais', type: 'table' },
          { key: 'comercial.relatorio_operacional.distribuicoes_secundarias', label: 'Distribuicoes de estoque/corretor/mes', type: 'dashboard' }
        ]
      }
    ]
  },
  {
    module: 'RH_DP',
    label: 'RH/DP',
    description: 'Blocos do relatorio operacional RH/DP.',
    pages: [
      {
        key: 'rhdp.relatorio_operacional',
        path: '/rh-dp/relatorios/operacional',
        label: 'Relatorio Operacional RH/DP',
        components: [
          { key: 'rhdp.relatorio_operacional.metricas', label: 'Cards RH/DP', type: 'dashboard' },
          { key: 'rhdp.relatorio_operacional.distribuicoes', label: 'Distribuicoes', type: 'dashboard' },
          { key: 'rhdp.relatorio_operacional.colaboradores', label: 'Tabela colaboradores', type: 'table' },
          { key: 'rhdp.relatorio_operacional.documentos', label: 'Tabela documentos criticos', type: 'table' }
        ]
      }
    ]
  }
];

const UI_VISIBILITY_KEYS = new Set(
  UI_VISIBILITY_COMPONENTS.flatMap((group) =>
    group.pages.flatMap((page) =>
      page.components.map((component) => component.key)
    )
  )
);

function normalizeUiVisibilityKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHiddenUiComponents(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(
    input
      .map(normalizeUiVisibilityKey)
      .filter((key) => key && UI_VISIBILITY_KEYS.has(key))
  )];
}

module.exports = {
  UI_VISIBILITY_COMPONENTS,
  UI_VISIBILITY_KEYS,
  normalizeHiddenUiComponents,
  normalizeUiVisibilityKey
};
