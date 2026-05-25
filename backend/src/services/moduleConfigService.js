const { ConfiguracaoSistema } = require('../models');

const CHAVE_MODULOS_HABILITADOS = 'MODULOS_HABILITADOS';

const MODULE_CATALOG = [
  {
    key: 'SOLICITACOES',
    label: 'Solicitacoes',
    packageKey: 'OPERACIONAL',
    packageLabel: 'Pacote Operacional',
    description: 'Modulo principal do fluxo operacional.',
    enabled: true,
    locked: true
  },
  {
    key: 'COMUNICACAO_INTERNA',
    label: 'Comunicacao Interna',
    packageKey: 'OPERACIONAL',
    packageLabel: 'Pacote Operacional',
    description: 'Caixa de entrada, saida e conversas internas.',
    enabled: true,
    locked: false
  },
  {
    key: 'BIBLIOTECA_MODELOS',
    label: 'Arquivos Modelos',
    packageKey: 'OPERACIONAL',
    packageLabel: 'Pacote Operacional',
    description: 'Biblioteca de modelos e arquivos padrao operacionais.',
    enabled: true,
    locked: false
  },
  {
    key: 'TREINAMENTO',
    label: 'Central de Treinamento',
    packageKey: 'INSTITUCIONAL',
    packageLabel: 'Pacote Institucional',
    description: 'Perguntas, respostas, videos, guias e trilhas de treinamento com materiais em S3.',
    enabled: true,
    locked: false
  },
  {
    key: 'COMPRAS',
    label: 'Solicitacoes de Compra',
    packageKey: 'COMPRAS',
    packageLabel: 'Pacote Compras',
    description: 'Fluxo de solicitacao, aprovacao e liberacao de compras.',
    enabled: true,
    locked: false
  },
  {
    key: 'COTACOES',
    label: 'Cotacoes e Pedidos',
    packageKey: 'COMPRAS',
    packageLabel: 'Pacote Compras',
    description: 'Cotacoes com fornecedores, comparativo de precos e pedidos de compra. Depende do modulo de compras.',
    enabled: true,
    locked: false,
    requiresAll: ['COMPRAS']
  },
  {
    key: 'FINANCEIRO',
    label: 'Financeiro',
    packageKey: 'FINANCEIRO',
    packageLabel: 'Pacote Financeiro',
    description: 'Titulos, baixas, comprovantes, conciliacao OFX e relatorios financeiros.',
    enabled: true,
    locked: false
  },
  {
    key: 'BOLETOS',
    label: 'Boletos',
    packageKey: 'FINANCEIRO',
    packageLabel: 'Add-on Boletos',
    description: 'Emissao bancaria, homologacao, remessa e retorno de boletos. Disponivel apenas com Financeiro ativo.',
    enabled: false,
    locked: false,
    requiresAll: ['FINANCEIRO']
  },
  {
    key: 'FISCAL',
    label: 'Fiscal',
    packageKey: 'FISCAL',
    packageLabel: 'Pacote Fiscal',
    description: 'Entrada fiscal, documentos DFe, logs de sincronizacao e vinculos fiscais.',
    enabled: false,
    locked: false
  },
  {
    key: 'OBRAS',
    label: 'Gestao de Obras',
    packageKey: 'OBRAS',
    packageLabel: 'Pacote Obras',
    description: 'Visao consolidada por obra com orcamento, custos, apropriacoes e relatorios.',
    enabled: true,
    locked: false
  },
  {
    key: 'PROVISOES',
    label: 'Provisionamento',
    packageKey: 'OBRAS_FINANCEIRO',
    packageLabel: 'Add-on Financeiro/Obras',
    description: 'Previsao gerencial de desembolso por obra com dashboard, detalhamento e historico.',
    enabled: false,
    locked: false,
    requiresAll: ['FINANCEIRO', 'OBRAS']
  },
  {
    key: 'CONTRATOS',
    label: 'Contratos',
    packageKey: 'OPERACIONAL',
    packageLabel: 'Complemento Operacional',
    description: 'Cadastro, acompanhamento e anexos de contratos.',
    enabled: true,
    locked: false
  },
  {
    key: 'COMERCIAL',
    label: 'Comercial',
    packageKey: 'COMERCIAL',
    packageLabel: 'Pacote Comercial',
    description: 'Empreendimentos, unidades, contratos de venda e carteira comercial.',
    enabled: false,
    locked: false
  },
  {
    key: 'CRM',
    label: 'CRM',
    packageKey: 'CRM',
    packageLabel: 'Pacote CRM',
    description: 'Gestao de leads, funil comercial, distribuicao e acompanhamento de oportunidades.',
    enabled: false,
    locked: false,
    recommendedWith: ['COMERCIAL']
  },
  {
    key: 'RH_DP',
    label: 'RH/DP',
    packageKey: 'RH_DP',
    packageLabel: 'Pacote RH/DP',
    description: 'Colaboradores, documentos, apuracao por competencia e fechamento operacional do RH/DP.',
    enabled: false,
    locked: false
  },
  {
    key: 'SST',
    label: 'SST',
    packageKey: 'SST',
    packageLabel: 'Pacote SST',
    description: 'Saude e seguranca do trabalho com riscos, ASO, exames, EPI, treinamentos, acidentes e base futura eSocial.',
    enabled: false,
    locked: false,
    recommendedWith: ['RH_DP', 'OBRAS']
  },
  {
    key: 'INTEGRACAO_SIENGE',
    label: 'Integracao SIENGE',
    packageKey: 'INTEGRACOES',
    packageLabel: 'Add-on SIENGE',
    description: 'Gateway tecnico para envio de titulos, fila, logs e reprocessamento da integracao com SIENGE.',
    enabled: false,
    locked: false,
    requiresAny: ['FINANCEIRO', 'RH_DP', 'COMERCIAL'],
    defaultRequiredModule: 'FINANCEIRO'
  }
];

function normalizeModuleKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeModuleList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => normalizeModuleKey(item))
    .filter(Boolean);
}

function serializeCatalogItem(item) {
  return {
    key: item.key,
    label: item.label,
    packageKey: item.packageKey,
    packageLabel: item.packageLabel,
    description: item.description,
    enabled: Boolean(item.enabled),
    locked: Boolean(item.locked),
    requiresAll: normalizeModuleList(item.requiresAll),
    requiresAny: normalizeModuleList(item.requiresAny),
    defaultRequiredModule: normalizeModuleKey(item.defaultRequiredModule),
    recommendedWith: normalizeModuleList(item.recommendedWith)
  };
}

function getDefaultModules() {
  return MODULE_CATALOG.map(serializeCatalogItem);
}

function moduleRequirementsSatisfied(moduleItem, enabledByKey) {
  const requiresAll = normalizeModuleList(moduleItem.requiresAll);
  const requiresAny = normalizeModuleList(moduleItem.requiresAny);

  if (requiresAll.some((key) => !enabledByKey.get(key))) {
    return false;
  }

  if (requiresAny.length && !requiresAny.some((key) => enabledByKey.get(key))) {
    return false;
  }

  return true;
}

function enforceModuleDependencies(modules) {
  const enabledByKey = new Map(modules.map((item) => [item.key, Boolean(item.enabled)]));

  modules.forEach((item) => {
    if (item.locked && !item.enabled) {
      item.enabled = true;
      enabledByKey.set(item.key, true);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    modules.forEach((item) => {
      if (!item.enabled || item.locked) return;
      if (moduleRequirementsSatisfied(item, enabledByKey)) return;

      item.enabled = false;
      enabledByKey.set(item.key, false);
      changed = true;
    });
  }

  return modules;
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

  const modules = defaults.map((item) => ({
    ...item,
    enabled: item.locked
      ? true
      : (byKey.has(item.key) ? Boolean(byKey.get(item.key)?.enabled) : Boolean(item.enabled))
  }));

  return enforceModuleDependencies(modules);
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
