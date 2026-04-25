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
  },
  {
    key: 'COMERCIAL',
    label: 'Comercial',
    role: 'Vendas, empreendimentos e contratos comerciais',
    dependency: 'Pode consumir dados financeiros e cadastros mestres, mas fica separado de Solicitacoes',
    usedIn: ['Empreendimentos', 'Unidades', 'Mapa de Unidades', 'Tabelas de Preco', 'Contratos de Venda'],
    disabledEffect: 'Oculta telas comerciais e endpoints protegidos por modulo.',
    permissionsEffect: 'Permissoes de Comercial controlam empreendimentos, vendas e contratos comerciais.'
  },
  {
    key: 'FINANCEIRO',
    label: 'Financeiro',
    role: 'Titulos, relatorios, conciliacao e cadastros financeiros',
    dependency: 'Integra com Obras, Boletos, Provisoes e comprovantes',
    usedIn: ['Titulos Financeiros', 'Relatorios Financeiros', 'Conciliacao OFX', 'Cadastros Financeiros'],
    disabledEffect: 'Oculta rotas financeiras e bloqueia endpoints do modulo.',
    permissionsEffect: 'Permissoes de Financeiro controlam visualizacao, criacao, baixa, estorno, conciliacao e cadastros.'
  },
  {
    key: 'BOLETOS',
    label: 'Boletos',
    role: 'Emissao e consulta de boletos',
    dependency: 'Complementa o Financeiro',
    usedIn: ['Boletos'],
    disabledEffect: 'Oculta a tela de boletos e bloqueia endpoints de emissao.',
    permissionsEffect: 'Permissoes de Boletos controlam visualizacao e geracao.'
  },
  {
    key: 'CRM',
    label: 'CRM',
    role: 'Leads, atendimento, dashboards, automacoes e integracoes de canais',
    dependency: 'Modulo comercial independente',
    usedIn: ['Dashboards CRM', 'Leads', 'Inbox', 'Automacoes', 'Administracao CRM'],
    disabledEffect: 'Oculta o menu CRM e bloqueia endpoints do CRM.',
    permissionsEffect: 'Permissoes de CRM controlam dashboards, leads, atendimento, automacoes e configuracoes.'
  },
  {
    key: 'RH_DP',
    label: 'RH/DP',
    role: 'Colaboradores, documentos, apuracao e fechamentos',
    dependency: 'Pode acoplar com Financeiro para obrigacoes e fechamentos',
    usedIn: ['Visao do Modulo RH/DP', 'Empresas do Grupo', 'Colaboradores', 'Documentos', 'Importacoes', 'Apuracao', 'Fechamentos'],
    disabledEffect: 'Oculta o menu RH/DP e bloqueia endpoints do RH/DP.',
    permissionsEffect: 'Permissoes de RH/DP substituem a configuracao legada de capacidades por usuario.'
  },
  {
    key: 'INTEGRACAO_SIENGE',
    label: 'Integracao SIENGE',
    role: 'Monitoramento, reprocessamento e configuracao da fila SIENGE',
    dependency: 'Complementa RH/DP e rotinas financeiras/contabeis',
    usedIn: ['Integracao SIENGE'],
    disabledEffect: 'Oculta a tela de integracao e bloqueia endpoints do SIENGE.',
    permissionsEffect: 'Permissoes de Integracao SIENGE controlam visualizar, reprocessar e configurar.'
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
