const { ConfiguracaoSistema } = require('../models');

const CHAVE_MODULOS_HABILITADOS = 'MODULOS_HABILITADOS';

const MODULE_CATALOG = [
  {
    key: 'SOLICITACOES',
    label: 'Solicitacoes',
    description: 'Modulo principal do fluxo operacional.',
    enabled: true,
    locked: true
  },
  {
    key: 'COMPRAS',
    label: 'Solicitacoes de Compra',
    description: 'Fluxo de solicitacao, aprovacao e liberacao de compras.',
    enabled: true,
    locked: false
  },
  {
    key: 'COTACOES',
    label: 'Cotacoes e Pedidos',
    description: 'Cotacoes com fornecedores, comparativo de precos e pedidos de compra. Pode ser usado de forma independente sem o modulo de Solicitacoes.',
    enabled: true,
    locked: false
  },
  {
    key: 'FINANCEIRO',
    label: 'Financeiro',
    description: 'Titulos, baixas, conciliacao OFX e relatorios financeiros.',
    enabled: true,
    locked: false
  },
  {
    key: 'OBRAS',
    label: 'Gestao de Obras',
    description: 'Visao consolidada por obra com orcamento, custos e relatorios.',
    enabled: true,
    locked: false
  },
  {
    key: 'CONTRATOS',
    label: 'Contratos',
    description: 'Cadastro, acompanhamento e anexos de contratos.',
    enabled: true,
    locked: false
  },
  {
    key: 'COMERCIAL',
    label: 'Comercial',
    description: 'Empreendimentos, unidades, contratos de venda e carteira comercial.',
    enabled: false,
    locked: false
  },
  {
    key: 'PROVISOES',
    label: 'Provisionamento',
    description: 'Previsao gerencial de desembolso por obra com dashboard, detalhamento e historico.',
    enabled: false,
    locked: false
  },
  {
    key: 'RH_DP',
    label: 'RH/DP',
    description: 'Colaboradores, documentos, apuracao por competencia e fechamento operacional do RH/DP.',
    enabled: false,
    locked: false
  },
  {
    key: 'INTEGRACAO_SIENGE',
    label: 'Integracao SIENGE',
    description: 'Gateway tecnico para envio de titulos, fila, logs e reprocessamento da integracao com SIENGE.',
    enabled: false,
    locked: false
  },
  {
    key: 'BOLETOS',
    label: 'Boletos',
    description: 'Emissao bancaria, homologacao, remessa e retorno de boletos.',
    enabled: false,
    locked: false
  },
  {
    key: 'BIBLIOTECA_MODELOS',
    label: 'Arquivos Modelos',
    description: 'Biblioteca de modelos e arquivos padrao operacionais.',
    enabled: true,
    locked: false
  },
  {
    key: 'COMUNICACAO_INTERNA',
    label: 'Comunicacao Interna',
    description: 'Caixa de entrada, saida e conversas internas.',
    enabled: true,
    locked: false
  },
  {
    key: 'CRM',
    label: 'CRM',
    description: 'Gestao de leads, funil comercial, distribuicao e acompanhamento de oportunidades.',
    enabled: false,
    locked: false
  }
];

function normalizeModuleKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getDefaultModules() {
  return MODULE_CATALOG.map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    enabled: Boolean(item.enabled),
    locked: Boolean(item.locked)
  }));
}

function normalizeModulesInput(rawList) {
  const defaults = getDefaultModules();
  const source = Array.isArray(rawList) ? rawList : [];
  const byKey = new Map(
    source
      .map((item) => ({
        key: normalizeModuleKey(item?.key),
        enabled: Boolean(item?.enabled)
      }))
      .filter((item) => item.key)
      .map((item) => [item.key, item])
  );

  return defaults.map((item) => ({
    ...item,
    enabled: item.locked
      ? true
      : (byKey.has(item.key) ? Boolean(byKey.get(item.key)?.enabled) : Boolean(item.enabled))
  }));
}

async function getModuloConfig() {
  const existing = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_MODULOS_HABILITADOS },
    order: [['id', 'DESC']]
  });

  if (!existing?.valor) {
    return getDefaultModules();
  }

  try {
    return normalizeModulesInput(JSON.parse(existing.valor));
  } catch {
    return getDefaultModules();
  }
}

async function saveModuloConfig(rawList) {
  const modules = normalizeModulesInput(rawList);
  const valor = JSON.stringify(modules);

  const existing = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_MODULOS_HABILITADOS },
    order: [['id', 'DESC']]
  });

  if (existing) {
    await existing.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_MODULOS_HABILITADOS,
      valor
    });
  }

  return modules;
}

async function isModuleEnabled(moduleKey) {
  const normalized = normalizeModuleKey(moduleKey);
  if (!normalized) return true;

  const modules = await getModuloConfig();
  const found = modules.find((item) => item.key === normalized);
  if (!found) {
    return true;
  }

  return Boolean(found.enabled);
}

module.exports = {
  CHAVE_MODULOS_HABILITADOS,
  MODULE_CATALOG,
  getDefaultModules,
  getModuloConfig,
  isModuleEnabled,
  normalizeModuleKey,
  normalizeModulesInput,
  saveModuloConfig
};
