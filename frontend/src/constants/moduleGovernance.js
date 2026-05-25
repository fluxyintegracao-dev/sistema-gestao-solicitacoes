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
    label: 'Solicitacoes',
    packageLabel: 'Pacote Operacional',
    role: 'Nucleo operacional',
    dependency: 'Base fixa da instalacao. Deve permanecer ativo em todos os planos.',
    usedIn: ['Nova Solicitacao', 'Lista de Solicitacoes', 'Detalhe da Solicitacao', 'Prioridades Diretoria'],
    disabledEffect: 'Nao se aplica: este modulo faz parte do nucleo e permanece ativo.',
    permissionsEffect: 'Permissoes de area controlam lista, criacao, aprovacao, prioridades e a aba financeira.'
  },
  {
    key: 'COMUNICACAO_INTERNA',
    label: 'Comunicacao Interna',
    packageLabel: 'Pacote Operacional',
    role: 'Add-on operacional simples',
    dependency: 'Independente dos demais modulos. Pode ser vendido junto do pacote operacional.',
    usedIn: ['Comunicacao Interna'],
    disabledEffect: 'Oculta menu, caixa de entrada, saida e endpoints de conversas internas.',
    permissionsEffect: 'Permissoes de comunicacao controlam leitura e marcacao de mensagens.'
  },
  {
    key: 'BIBLIOTECA_MODELOS',
    label: 'Arquivos Modelos',
    packageLabel: 'Pacote Operacional',
    role: 'Biblioteca operacional',
    dependency: 'Independente dos demais modulos. Complementa treinamentos e padroes internos.',
    usedIn: ['Arquivos Modelos', 'Arquivos Modelos Config'],
    disabledEffect: 'Oculta biblioteca de modelos e bloqueia endpoints de arquivos modelos.',
    permissionsEffect: 'Permissoes definem upload e gestao por pagina; leitura segue a regra da pagina ativa.'
  },
  {
    key: 'TREINAMENTO',
    label: 'Central de Treinamento',
    packageLabel: 'Pacote Institucional',
    role: 'Institucionalizacao e onboarding',
    dependency: 'Independente dos demais modulos. Usa S3 para videos e documentos privados.',
    usedIn: ['Central de Treinamento', 'Perguntas e Respostas', 'Videos', 'Guias por modulo'],
    disabledEffect: 'Oculta a central de treinamento e bloqueia endpoints de conteudo e arquivos.',
    permissionsEffect: 'Permissoes de treinamento controlam visualizacao, gestao e publicacao.'
  },
  {
    key: 'COMPRAS',
    label: 'Solicitacoes de Compra',
    packageLabel: 'Pacote Compras',
    role: 'Fluxo principal de compras',
    dependency: 'Base para cotacoes, fornecedores e pedidos de compra.',
    usedIn: ['Solicitacoes de Compra', 'Pedidos de Compra', 'Cadastros de Insumos', 'Unidades', 'Categorias'],
    disabledEffect: 'Oculta o dominio de compras e desativa automaticamente Cotacoes e Pedidos.',
    permissionsEffect: 'Permissoes de Compras atuam no fluxo de compras e nos submodulos vinculados.'
  },
  {
    key: 'COTACOES',
    label: 'Cotacoes e Pedidos',
    packageLabel: 'Pacote Compras',
    role: 'Add-on do fluxo de compras',
    dependency: 'Requer o modulo Compras ativo.',
    requiresAll: ['COMPRAS'],
    usedIn: ['Cotacoes', 'Nova Cotacao Avulsa', 'Fornecedores', 'Pedidos de Compra'],
    disabledEffect: 'Oculta cotacoes, fornecedores e rotas protegidas por COTACOES dentro do dominio de compras.',
    permissionsEffect: 'Permissoes de cotacoes so produzem efeito com Compras e Cotacoes ativos.'
  },
  {
    key: 'FINANCEIRO',
    label: 'Financeiro',
    packageLabel: 'Pacote Financeiro',
    role: 'Financeiro central',
    dependency: 'Modulo financeiro deve funcionar sem Comercial. Integra opcionalmente com Obras, Boletos, Provisoes, RH/DP e SIENGE.',
    usedIn: ['Titulos Financeiros', 'Comprovantes', 'Relatorios Financeiros', 'Conciliacao OFX', 'Cadastros Financeiros'],
    disabledEffect: 'Oculta rotas financeiras e desativa automaticamente add-ons que dependem de Financeiro, como Boletos e Provisoes.',
    permissionsEffect: 'Permissoes de Financeiro controlam visualizacao, criacao, baixa, estorno, conciliacao, comprovantes e cadastros.'
  },
  {
    key: 'BOLETOS',
    label: 'Boletos',
    packageLabel: 'Add-on Boletos',
    role: 'Add-on bancario do Financeiro',
    dependency: 'Requer Financeiro ativo. Nao deve exigir Comercial.',
    requiresAll: ['FINANCEIRO'],
    usedIn: ['Geracao de Boletos', 'Titulos a Receber'],
    disabledEffect: 'Oculta a tela de boletos e bloqueia endpoints de emissao, amostra e PDF.',
    permissionsEffect: 'Permissoes de Boletos controlam visualizacao e geracao.'
  },
  {
    key: 'OBRAS',
    label: 'Obras',
    packageLabel: 'Pacote Obras',
    role: 'Cadastro mestre e apropriacoes',
    dependency: 'Fornece obras e apropriacoes para Solicitacoes, Compras, Financeiro e Provisoes.',
    usedIn: ['Gestao de Obras', 'Gestao de Apropriacoes', 'Nova Solicitacao', 'Novo Titulo Financeiro', 'Resultado de Obras'],
    disabledEffect: 'Apropriacao e resultado de obras saem das telas consumidoras; Provisoes fica indisponivel.',
    permissionsEffect: 'Permissoes de Obras controlam cadastro, gestao e apropriacoes.'
  },
  {
    key: 'PROVISOES',
    label: 'Provisionamento',
    packageLabel: 'Add-on Financeiro/Obras',
    role: 'Previsao financeira por obra',
    dependency: 'Requer Financeiro e Obras ativos.',
    requiresAll: ['FINANCEIRO', 'OBRAS'],
    usedIn: ['Dashboard de Previsao', 'Provisionamentos', 'Nova Provisao', 'Categorias Macro'],
    disabledEffect: 'Oculta provisionamento e bloqueia rotas de previsao gerencial.',
    permissionsEffect: 'Permissoes de Provisoes so produzem efeito com Financeiro, Obras e Provisoes ativos.'
  },
  {
    key: 'CONTRATOS',
    label: 'Contratos',
    packageLabel: 'Complemento Operacional',
    role: 'Complemento opcional',
    dependency: 'Acopla com Solicitacoes sem bloquear o fluxo principal.',
    usedIn: ['Nova Solicitacao', 'Detalhe da Solicitacao', 'Gestao de Contratos'],
    disabledEffect: 'Os campos de contrato somem da Nova Solicitacao e deixam de ser obrigatorios.',
    permissionsEffect: 'Permissoes de Contratos so produzem efeito com o modulo ativo.'
  },
  {
    key: 'COMERCIAL',
    label: 'Comercial',
    packageLabel: 'Pacote Comercial',
    role: 'Vendas e empreendimentos',
    dependency: 'Modulo proprio de empreendimentos, unidades e contratos de venda. Pode integrar com Financeiro, mas nao deve ser exigido por ele.',
    usedIn: ['Empreendimentos', 'Unidades', 'Mapa de Unidades', 'Tabelas de Preco', 'Contratos de Venda'],
    disabledEffect: 'Oculta telas comerciais e endpoints protegidos por modulo. Telas financeiras devem esconder filtros de empreendimento comercial.',
    permissionsEffect: 'Permissoes de Comercial controlam empreendimentos, vendas e contratos comerciais.'
  },
  {
    key: 'CRM',
    label: 'CRM',
    packageLabel: 'Pacote CRM',
    role: 'Relacionamento e funil',
    dependency: 'Pode ser vendido separado, mas comercialmente combina com o Pacote Comercial.',
    recommendedWith: ['COMERCIAL'],
    usedIn: ['Dashboards CRM', 'Leads', 'Inbox', 'Automacoes', 'Administracao CRM'],
    disabledEffect: 'Oculta o menu CRM e bloqueia endpoints do CRM.',
    permissionsEffect: 'Permissoes de CRM controlam dashboards, leads, atendimento, automacoes e configuracoes.'
  },
  {
    key: 'RH_DP',
    label: 'RH/DP',
    packageLabel: 'Pacote RH/DP',
    role: 'Rotinas trabalhistas',
    dependency: 'Pode operar com cadastros, documentos, importacoes e apuracao. Fechamentos financeiros exigem Financeiro ativo.',
    usedIn: ['Visao do Modulo RH/DP', 'Empresas do Grupo', 'Colaboradores', 'Documentos', 'Importacoes', 'Apuracao', 'Fechamentos'],
    disabledEffect: 'Oculta o menu RH/DP e bloqueia endpoints do RH/DP.',
    permissionsEffect: 'Permissoes de RH/DP controlam dashboard, colaboradores, documentos, importacoes, apuracao e fechamento.'
  },
  {
    key: 'INTEGRACAO_SIENGE',
    label: 'Integracao SIENGE',
    packageLabel: 'Add-on SIENGE',
    role: 'Gateway tecnico',
    dependency: 'Requer pelo menos um modulo origem ativo: Financeiro, RH/DP ou Comercial. Por padrao, ativa junto do Financeiro.',
    requiresAny: ['FINANCEIRO', 'RH_DP', 'COMERCIAL'],
    defaultRequiredModule: 'FINANCEIRO',
    usedIn: ['Integracao SIENGE', 'Fila SIENGE', 'Logs SIENGE'],
    disabledEffect: 'Oculta a tela de integracao e bloqueia endpoints do SIENGE.',
    permissionsEffect: 'Permissoes de Integracao SIENGE controlam visualizar, reprocessar e configurar.'
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
