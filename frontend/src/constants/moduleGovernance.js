function normalizeModuleKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const MODULE_GOVERNANCE = [
  {
    key: 'SOLICITACOES',
    label: 'Solicitações',
    packageLabel: 'Pacote Operacional',
    role: 'Núcleo operacional',
    dependency: 'Base fixa da instalação. Deve permanecer ativo em todos os planos.',
    usedIn: ['Nova Solicitação', 'Lista de Solicitações', 'Detalhe da Solicitação', 'Prioridades Diretoria'],
    disabledEffect: 'Não se aplica: este módulo faz parte do núcleo e permanece ativo.',
    permissionsEffect: 'Permissões de área controlam lista, criação, aprovação, prioridades e a aba financeira.'
  },
  {
    key: 'COMUNICACAO_INTERNA',
    label: 'Comunicação Interna',
    packageLabel: 'Pacote Operacional',
    role: 'Add-on operacional simples',
    dependency: 'Independente dos demais módulos. Pode ser vendido junto do pacote operacional.',
    usedIn: ['Comunicação Interna'],
    disabledEffect: 'Oculta menu, caixa de entrada, saída e endpoints de conversas internas.',
    permissionsEffect: 'Permissões de comunicação controlam leitura e marcação de mensagens.'
  },
  {
    key: 'BIBLIOTECA_MODELOS',
    label: 'Arquivos Modelos',
    packageLabel: 'Pacote Operacional',
    role: 'Biblioteca operacional',
    dependency: 'Independente dos demais módulos. Complementa treinamentos e padrões internos.',
    usedIn: ['Arquivos Modelos', 'Arquivos Modelos Config'],
    disabledEffect: 'Oculta biblioteca de modelos e bloqueia endpoints de arquivos modelos.',
    permissionsEffect: 'Permissões definem upload e gestão por página; leitura segue a regra da página ativa.'
  },
  {
    key: 'TREINAMENTO',
    label: 'Central de Treinamento',
    packageLabel: 'Pacote Institucional',
    role: 'Institucionalização e onboarding',
    dependency: 'Independente dos demais módulos. Usa S3 para vídeos e documentos privados.',
    usedIn: ['Central de Treinamento', 'Perguntas e Respostas', 'Vídeos', 'Guias por módulo'],
    disabledEffect: 'Oculta a central de treinamento e bloqueia endpoints de conteúdo e arquivos.',
    permissionsEffect: 'Permissões de treinamento controlam visualização, gestão e publicação.'
  },
  {
    key: 'COMPRAS',
    label: 'Solicitações de Compra',
    packageLabel: 'Pacote Compras',
    role: 'Fluxo principal de compras',
    dependency: 'Base para cotações, fornecedores e pedidos de compra.',
    usedIn: ['Solicitações de Compra', 'Pedidos de Compra', 'Cadastros de Insumos', 'Unidades', 'Categorias'],
    disabledEffect: 'Oculta o domínio de compras e desativa automaticamente Cotações e Pedidos.',
    permissionsEffect: 'Permissões de Compras atuam no fluxo de compras e nos submódulos vinculados.'
  },
  {
    key: 'COTACOES',
    label: 'Cotações e Pedidos',
    packageLabel: 'Pacote Compras',
    role: 'Add-on do fluxo de compras',
    dependency: 'Requer o módulo Compras ativo.',
    requiresAll: ['COMPRAS'],
    usedIn: ['Cotações', 'Nova Cotação Avulsa', 'Fornecedores', 'Pedidos de Compra'],
    disabledEffect: 'Oculta cotações, fornecedores e rotas protegidas por COTACOES dentro do domínio de compras.',
    permissionsEffect: 'Permissões de cotações só produzem efeito com Compras e Cotações ativos.'
  },
  {
    key: 'FINANCEIRO',
    label: 'Financeiro',
    packageLabel: 'Pacote Financeiro',
    role: 'Financeiro central',
    dependency: 'Módulo financeiro deve funcionar sem Comercial. Integra opcionalmente com Obras, Boletos, Provisões e RH/DP.',
    usedIn: ['Títulos Financeiros', 'Comprovantes', 'Relatórios Financeiros', 'Conciliação OFX', 'Cadastros Financeiros'],
    disabledEffect: 'Oculta rotas financeiras e desativa automaticamente add-ons que dependem de Financeiro, como Boletos e Provisões.',
    permissionsEffect: 'Permissões de Financeiro controlam visualização, criação, baixa, estorno, conciliação, comprovantes e cadastros.'
  },
  {
    key: 'BOLETOS',
    label: 'Boletos',
    packageLabel: 'Add-on Boletos',
    role: 'Add-on bancário do Financeiro',
    dependency: 'Requer Financeiro ativo. Não deve exigir Comercial.',
    requiresAll: ['FINANCEIRO'],
    usedIn: ['Geração de Boletos', 'Títulos a Receber'],
    disabledEffect: 'Oculta a tela de boletos e bloqueia endpoints de emissão, amostra e PDF.',
    permissionsEffect: 'Permissões de Boletos controlam visualização e geração.'
  },
  {
    key: 'OBRAS',
    label: 'Obras',
    packageLabel: 'Pacote Obras',
    role: 'Cadastro mestre e apropriações',
    dependency: 'Fornece obras e apropriações para Solicitações, Compras, Financeiro e Provisões.',
    usedIn: ['Gestão de Obras', 'Gestão de Apropriações', 'Nova Solicitação', 'Novo Título Financeiro', 'Resultado de Obras'],
    disabledEffect: 'Apropriação e resultado de obras saem das telas consumidoras; Provisões fica indisponível.',
    permissionsEffect: 'Permissões de Obras controlam cadastro, gestão e apropriações.'
  },
  {
    key: 'PROVISOES',
    label: 'Provisionamento',
    packageLabel: 'Add-on Financeiro/Obras',
    role: 'Previsão financeira por obra',
    dependency: 'Requer Financeiro e Obras ativos.',
    requiresAll: ['FINANCEIRO', 'OBRAS'],
    usedIn: ['Dashboard de Previsão', 'Provisionamentos', 'Nova Provisão', 'Categorias Macro'],
    disabledEffect: 'Oculta provisionamento e bloqueia rotas de previsão gerencial.',
    permissionsEffect: 'Permissões de Provisões só produzem efeito com Financeiro, Obras e Provisões ativos.'
  },
  {
    key: 'CONTRATOS',
    label: 'Contratos',
    packageLabel: 'Complemento Operacional',
    role: 'Complemento opcional',
    dependency: 'Acopla com Solicitações sem bloquear o fluxo principal.',
    usedIn: ['Nova Solicitação', 'Detalhe da Solicitação', 'Gestão de Contratos'],
    disabledEffect: 'Os campos de contrato somem da Nova Solicitação e deixam de ser obrigatórios.',
    permissionsEffect: 'Permissões de Contratos só produzem efeito com o módulo ativo.'
  },
  {
    key: 'COMERCIAL',
    label: 'Comercial',
    packageLabel: 'Pacote Comercial',
    role: 'Vendas e empreendimentos',
    dependency: 'Módulo próprio de empreendimentos, unidades e contratos de venda. Pode integrar com Financeiro, mas não deve ser exigido por ele.',
    usedIn: ['Empreendimentos', 'Unidades', 'Mapa de Unidades', 'Tabelas de Preço', 'Contratos de Venda'],
    disabledEffect: 'Oculta telas comerciais e endpoints protegidos por módulo. Telas financeiras devem esconder filtros de empreendimento comercial.',
    permissionsEffect: 'Permissões de Comercial controlam empreendimentos, vendas e contratos comerciais.'
  },
  {
    key: 'CRM',
    label: 'CRM',
    packageLabel: 'Pacote CRM',
    role: 'Relacionamento e funil',
    dependency: 'Pode ser vendido separado, mas comercialmente combina com o Pacote Comercial.',
    recommendedWith: ['COMERCIAL'],
    usedIn: ['Dashboards CRM', 'Leads', 'Inbox', 'Automações', 'Administração CRM'],
    disabledEffect: 'Oculta o menu CRM e bloqueia endpoints do CRM.',
    permissionsEffect: 'Permissões de CRM controlam dashboards, leads, atendimento, automações e configurações.'
  },
  {
    key: 'RH_DP',
    label: 'RH/DP',
    packageLabel: 'Pacote RH/DP',
    role: 'Rotinas trabalhistas',
    dependency: 'Pode operar com cadastros, documentos, importações e apuração. Fechamentos financeiros exigem Financeiro ativo.',
    usedIn: ['Visão do Módulo RH/DP', 'Empresas do Grupo', 'Colaboradores', 'Documentos', 'Importações', 'Apuração', 'Fechamentos'],
    disabledEffect: 'Oculta o menu RH/DP e bloqueia endpoints do RH/DP.',
    permissionsEffect: 'Permissões de RH/DP controlam dashboard, colaboradores, documentos, importações, apuração e fechamento.'
  }
];

const MODULE_GOVERNANCE_MAP = new Map(
  MODULE_GOVERNANCE.map((item) => [normalizeModuleKey(item.key), item])
);

function normalizeModuleList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => normalizeModuleKey(item))
    .filter(Boolean);
}

function getEnabledMap(modules = []) {
  return new Map(
    (Array.isArray(modules) ? modules : []).map((item) => [
      normalizeModuleKey(item?.key),
      Boolean(item?.enabled)
    ])
  );
}

function hasRequiredAny(governance, enabledMap) {
  const requiresAny = normalizeModuleList(governance?.requiresAny);
  if (!requiresAny.length) return true;
  return requiresAny.some((key) => enabledMap.get(key));
}

function hasRequiredAll(governance, enabledMap) {
  const requiresAll = normalizeModuleList(governance?.requiresAll);
  return requiresAll.every((key) => enabledMap.get(key));
}

export function getModuleGovernance(moduleKey) {
  return MODULE_GOVERNANCE_MAP.get(normalizeModuleKey(moduleKey)) || null;
}

export function buildModuleEnabledMap(modules = []) {
  return getEnabledMap(modules);
}

export function getModuleDependencyLabels(moduleKey) {
  const governance = getModuleGovernance(moduleKey);
  const requiresAll = normalizeModuleList(governance?.requiresAll)
    .map((key) => getModuleGovernance(key)?.label || key);
  const requiresAny = normalizeModuleList(governance?.requiresAny)
    .map((key) => getModuleGovernance(key)?.label || key);

  return { requiresAll, requiresAny };
}

export function getModuleDependents(moduleKey) {
  const normalizedKey = normalizeModuleKey(moduleKey);
  return MODULE_GOVERNANCE.filter((item) => {
    const requiresAll = normalizeModuleList(item.requiresAll);
    const requiresAny = normalizeModuleList(item.requiresAny);
    return requiresAll.includes(normalizedKey) || requiresAny.includes(normalizedKey);
  });
}

export function areModuleRequirementsSatisfied(moduleKey, modules = []) {
  const governance = getModuleGovernance(moduleKey);
  if (!governance) return true;
  const enabledMap = getEnabledMap(modules);
  return hasRequiredAll(governance, enabledMap) && hasRequiredAny(governance, enabledMap);
}

export function normalizeModuleSelection(modules = []) {
  const next = (Array.isArray(modules) ? modules : []).map((item) => ({ ...item }));
  const enabledMap = getEnabledMap(next);

  next.forEach((item) => {
    if (item.locked && !item.enabled) {
      item.enabled = true;
      enabledMap.set(normalizeModuleKey(item.key), true);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    next.forEach((item) => {
      const key = normalizeModuleKey(item.key);
      const governance = getModuleGovernance(key);
      if (!item.enabled || item.locked || !governance) return;
      if (hasRequiredAll(governance, enabledMap) && hasRequiredAny(governance, enabledMap)) return;

      item.enabled = false;
      enabledMap.set(key, false);
      changed = true;
    });
  }

  return next;
}

function enableModuleWithDependencies(itemsByKey, moduleKey, visited = new Set()) {
  const key = normalizeModuleKey(moduleKey);
  if (!key || visited.has(key)) return;
  visited.add(key);

  const item = itemsByKey.get(key);
  if (item && !item.locked) {
    item.enabled = true;
  }

  const governance = getModuleGovernance(key);
  if (!governance) return;

  normalizeModuleList(governance.requiresAll).forEach((dependencyKey) => {
    const dependency = itemsByKey.get(dependencyKey);
    if (dependency && !dependency.locked) {
      dependency.enabled = true;
    }
    enableModuleWithDependencies(itemsByKey, dependencyKey, visited);
  });

  const requiresAny = normalizeModuleList(governance.requiresAny);
  if (requiresAny.length) {
    const hasAnyEnabled = requiresAny.some((dependencyKey) => itemsByKey.get(dependencyKey)?.enabled);
    if (!hasAnyEnabled) {
      const fallbackKey = normalizeModuleKey(governance.defaultRequiredModule) || requiresAny[0];
      const fallback = itemsByKey.get(fallbackKey);
      if (fallback && !fallback.locked) {
        fallback.enabled = true;
      }
      enableModuleWithDependencies(itemsByKey, fallbackKey, visited);
    }
  }
}

export function toggleModuleWithDependencies(modules = [], targetKey) {
  const key = normalizeModuleKey(targetKey);
  const next = (Array.isArray(modules) ? modules : []).map((item) => ({ ...item }));
  const itemsByKey = new Map(next.map((item) => [normalizeModuleKey(item.key), item]));
  const target = itemsByKey.get(key);

  if (!target || target.locked) {
    return next;
  }

  if (!target.enabled) {
    enableModuleWithDependencies(itemsByKey, key);
  } else {
    target.enabled = false;
  }

  return normalizeModuleSelection(next);
}
