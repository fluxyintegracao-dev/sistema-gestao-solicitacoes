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
    role: 'Nucleo operacional',
    dependency: 'Base fixa da instalacao',
    usedIn: ['Nova Solicitacao', 'Lista de Solicitacoes', 'Detalhe da Solicitacao'],
    disabledEffect: 'Nao se aplica: este modulo faz parte do nucleo e permanece ativo.',
    permissionsEffect: 'Permissoes de area controlam lista, criacao, aprovacao e a aba financeira.'
  },
  {
    key: 'CONTRATOS',
    label: 'Contratos',
    role: 'Complemento opcional',
    dependency: 'Acopla com Solicitacoes sem bloquear o fluxo principal',
    usedIn: ['Nova Solicitacao', 'Detalhe da Solicitacao', 'Gestao de Contratos'],
    disabledEffect: 'Os campos de contrato somem da Nova Solicitacao e deixam de ser obrigatorios.',
    permissionsEffect: 'Permissoes de Contratos so produzem efeito com o modulo ativo.'
  },
  {
    key: 'OBRAS',
    label: 'Obras',
    role: 'Cadastro mestre e apropriacoes',
    dependency: 'Fornece obras e apropriacoes para Solicitacoes e Financeiro',
    usedIn: ['Gestao de Obras', 'Gestao de Apropriacoes', 'Nova Solicitacao', 'Novo Titulo Financeiro'],
    disabledEffect: 'Apropriacao some das telas consumidoras e deixa de ser obrigatoria.',
    permissionsEffect: 'Permissoes de Obras controlam cadastro, gestao e apropriacoes.'
  },
  {
    key: 'COMPRAS',
    label: 'Solicitacoes de Compra',
    role: 'Fluxo independente de compras',
    dependency: 'Nao controla apropriacoes e nao e requisito para Nova Solicitacao',
    usedIn: ['Solicitacoes de Compra', 'Cotacoes', 'Pedidos de Compra'],
    disabledEffect: 'Oculta o dominio de compras, sem bloquear o modulo principal de Solicitacoes.',
    permissionsEffect: 'Permissoes de Compras atuam apenas no fluxo de compras e cotacoes.'
  }
];

const MODULE_GOVERNANCE_MAP = new Map(
  MODULE_GOVERNANCE.map((item) => [item.key, item])
);

export function getModuleGovernance(moduleKey) {
  return MODULE_GOVERNANCE_MAP.get(normalizeModuleKey(moduleKey)) || null;
}

export function buildModuleEnabledMap(modules = []) {
  return new Map(
    (Array.isArray(modules) ? modules : []).map((item) => [
      normalizeModuleKey(item?.key),
      Boolean(item?.enabled)
    ])
  );
}

