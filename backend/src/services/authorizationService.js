const { ConfiguracaoSistema, Setor, UsuarioObra } = require('../models');
const { userHasSetorCapability } = require('./setorCapabilityService');
const {
  normalizePermission,
  normalizeRhDpPermissionList
} = require('../constants/rhDpPermissions');
const { normalizeModuloPermissaoList } = require('../constants/moduloPermissoes');

const CHAVE_SETORES_ACESSO_TODAS_OBRAS = 'SETORES_ACESSO_TODAS_OBRAS';
const CHAVE_USUARIOS_ACESSO_FINANCEIRO = 'USUARIOS_ACESSO_FINANCEIRO';
const CHAVE_USUARIOS_PERMISSOES_RH_DP = 'USUARIOS_PERMISSOES_RH_DP';
const CHAVE_PERMISSOES_AREAS_USUARIOS = 'PERMISSOES_AREAS_USUARIOS';
const CACHE_TTL_MS = 30 * 1000;

const FINANCEIRO_PERMISSION_KEYS = [
  'financeiro.titulos.visualizar',
  'financeiro.titulos.criar',
  'financeiro.titulos.baixar',
  'financeiro.titulos.estornar',
  'financeiro.comprovantes.excluir',
  'financeiro.relatorios.visualizar',
  'financeiro.relatorios.resultado_obras',
  'financeiro.conciliacao.visualizar',
  'financeiro.conciliacao.importar',
  'financeiro.conciliacao.conciliar',
  'financeiro.cadastros.visualizar',
  'financeiro.cadastros.gerenciar',
  'financeiro.pagamentos.visualizar',
  'financeiro.pagamentos.preparar',
  'financeiro.pagamentos.aprovar',
  'financeiro.pagamentos.enviar_banco',
  'financeiro.pagamentos.cancelar',
  'financeiro.pagamentos.reprocessar',
  'financeiro.pagamentos.confirmar_baixa',
  'financeiro.pagamentos.auditar',
  'financeiro.pagamentos.configurar',
  'financeiro.favorecidos.visualizar',
  'financeiro.favorecidos.gerenciar',
  'financeiro.favorecidos.auditar'
];

const FINANCEIRO_PAGAMENTOS_PERMISSION_KEYS = [
  'financeiro.pagamentos.visualizar',
  'financeiro.pagamentos.preparar',
  'financeiro.pagamentos.aprovar',
  'financeiro.pagamentos.enviar_banco',
  'financeiro.pagamentos.cancelar',
  'financeiro.pagamentos.reprocessar',
  'financeiro.pagamentos.confirmar_baixa',
  'financeiro.pagamentos.auditar',
  'financeiro.pagamentos.configurar'
];

const FINANCEIRO_FAVORECIDOS_PERMISSION_KEYS = [
  'financeiro.favorecidos.visualizar',
  'financeiro.favorecidos.gerenciar',
  'financeiro.favorecidos.auditar'
];

const BOLETOS_PERMISSION_KEYS = [
  'boletos.emitir.visualizar',
  'boletos.emitir.gerar'
];

const SOLICITACOES_ANEXOS_DELETE_KEYS = [
  'solicitacoes.anexos.excluir'
];

const SOLICITACOES_PRIORIDADES_VIEW_KEYS = [
  'solicitacoes.prioridades.visualizar',
  'solicitacoes.prioridades.criar',
  'solicitacoes.prioridades.finalizar',
  'solicitacoes.prioridades.cancelar',
  'solicitacoes.prioridades.excluir'
];

const SOLICITACOES_PRIORIDADES_CREATE_KEYS = [
  'solicitacoes.prioridades.criar'
];

const SOLICITACOES_PRIORIDADES_FINISH_KEYS = [
  'solicitacoes.prioridades.finalizar'
];

const SOLICITACOES_PRIORIDADES_CANCEL_KEYS = [
  'solicitacoes.prioridades.cancelar'
];

const SOLICITACOES_PRIORIDADES_DELETE_KEYS = [
  'solicitacoes.prioridades.excluir'
];

const COMPRAS_PEDIDOS_VIEW_KEYS = [
  'compras.pedidos.visualizar',
  'compras.pedidos.criar',
  'compras.pedidos.aprovar',
  'compras.pedidos.auditoria'
];

const COMPRAS_PEDIDOS_MANAGE_KEYS = [
  'compras.pedidos.criar',
  'compras.pedidos.aprovar'
];

const COMPRAS_PEDIDOS_AUDIT_KEYS = [
  'compras.pedidos.auditoria'
];

const COMPRAS_COTACOES_VIEW_KEYS = [
  'compras.cotacoes.visualizar',
  'compras.cotacoes.gerenciar'
];

const COMPRAS_COTACOES_MANAGE_KEYS = [
  'compras.cotacoes.gerenciar'
];

const COMPRAS_PERMISSION_KEYS = [
  ...COMPRAS_PEDIDOS_VIEW_KEYS,
  ...COMPRAS_COTACOES_VIEW_KEYS
];

const COMERCIAL_EMPREENDIMENTOS_VIEW_KEYS = [
  'comercial.empreendimentos.visualizar',
  'comercial.empreendimentos.gerenciar'
];

const COMERCIAL_EMPREENDIMENTOS_MANAGE_KEYS = [
  'comercial.empreendimentos.gerenciar'
];

const COMERCIAL_CONTRATOS_VIEW_KEYS = [
  'comercial.vendas.visualizar',
  'comercial.vendas.criar',
  'comercial.vendas.contratos'
];

const COMERCIAL_CONTRATOS_CREATE_KEYS = [
  'comercial.vendas.criar',
  'comercial.vendas.contratos'
];

const COMERCIAL_CONTRATOS_MANAGE_KEYS = [
  'comercial.vendas.contratos'
];

const COMERCIAL_PERMISSION_KEYS = [
  ...COMERCIAL_EMPREENDIMENTOS_VIEW_KEYS,
  ...COMERCIAL_CONTRATOS_VIEW_KEYS
];

const COMERCIAL_BASE_READ_KEYS = [
  ...COMERCIAL_EMPREENDIMENTOS_VIEW_KEYS,
  ...COMERCIAL_CONTRATOS_VIEW_KEYS
];

const CONTRATOS_VIEW_KEYS = [
  'contratos.geral.visualizar',
  'contratos.geral.criar',
  'contratos.geral.editar'
];

const CONTRATOS_CREATE_KEYS = [
  'contratos.geral.criar',
  'contratos.geral.editar'
];

const CONTRATOS_MANAGE_KEYS = [
  'contratos.geral.editar'
];

const CRM_DASHBOARD_KEYS = [
  'crm.dashboard.visualizar'
];

const CRM_LEADS_VIEW_KEYS = [
  'crm.leads.visualizar',
  'crm.leads.criar',
  'crm.leads.exportar',
  'crm.leads.redistribuir'
];

const CRM_LEADS_WRITE_KEYS = [
  'crm.leads.criar'
];

const CRM_LEADS_EXPORT_KEYS = [
  'crm.leads.exportar'
];

const CRM_LEADS_REDISTRIBUTE_KEYS = [
  'crm.leads.redistribuir'
];

const CRM_LEADS_ASSIGNMENT_LEGACY_PROFILES = [
  'ADMIN',
  'ADMINISTRADOR',
  'ADMIN_CRM',
  'GESTOR_COMERCIAL',
  'COORDENADOR_CRM',
  'ATENDENTE_INTERNO',
  'CORRETOR_EXTERNO'
];

const CRM_ATENDIMENTO_VIEW_KEYS = [
  'crm.atendimento.visualizar',
  'crm.atendimento.enviar'
];

const CRM_ATENDIMENTO_SEND_KEYS = [
  'crm.atendimento.enviar'
];

const CRM_AUTOMACOES_VIEW_KEYS = [
  'crm.automacoes.visualizar',
  'crm.automacoes.gerenciar'
];

const CRM_AUTOMACOES_MANAGE_KEYS = [
  'crm.automacoes.gerenciar'
];

const CRM_AUTOMATION_MANAGER_LEGACY_PROFILES = [
  'ADMIN',
  'ADMINISTRADOR',
  'ADMIN_CRM',
  'GESTOR_COMERCIAL',
  'COORDENADOR_CRM'
];

const CRM_CONFIG_VIEW_KEYS = [
  'crm.configuracoes.visualizar',
  'crm.configuracoes.gerenciar'
];

const CRM_CONFIG_MANAGE_KEYS = [
  'crm.configuracoes.gerenciar'
];

const CRM_PERMISSION_KEYS = [
  ...CRM_DASHBOARD_KEYS,
  ...CRM_LEADS_VIEW_KEYS,
  ...CRM_ATENDIMENTO_VIEW_KEYS,
  ...CRM_AUTOMACOES_VIEW_KEYS,
  ...CRM_CONFIG_VIEW_KEYS
];

const RH_DP_AREA_PERMISSION_KEYS = [
  'rh_dp.dashboard.visualizar',
  'rh_dp.empresas.gerenciar',
  'rh_dp.colaboradores.visualizar',
  'rh_dp.colaboradores.editar',
  'rh_dp.documentos.visualizar',
  'rh_dp.documentos.gerenciar',
  'rh_dp.importacoes.executar',
  'rh_dp.apuracao.visualizar',
  'rh_dp.apuracao.editar',
  'rh_dp.fechamento.executar',
  'rh_dp.fechamento.reabrir',
  'rh_dp.obrigacoes.visualizar'
];

const INTEGRACAO_SIENGE_AREA_PERMISSION_KEYS = [
  'integracao_sienge.geral.visualizar',
  'integracao_sienge.geral.reprocessar',
  'integracao_sienge.geral.configurar'
];

let setoresAcessoTodasObrasCache = {
  expiresAt: 0,
  setores: []
};
let usuariosAcessoFinanceiroCache = {
  expiresAt: 0,
  usuarios: []
};
let usuariosPermissoesRhDpCache = {
  expiresAt: 0,
  usuarios: {}
};

let permissoesAreasUsuariosCache = {
  expiresAt: 0,
  usuarios: {}
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function buildUserScopeTokens(user) {
  const tokens = new Set([
    normalizeToken(user?.perfil),
    normalizeToken(user?.area),
    normalizeToken(user?.setor?.codigo),
    normalizeToken(user?.setor?.nome),
    normalizeToken(user?.setor_id)
  ].filter(Boolean));

  if ((!user?.setor?.codigo && !user?.setor?.nome) && user?.setor_id) {
    const setor = await Setor.findByPk(user.setor_id, {
      attributes: ['codigo', 'nome']
    });

    if (setor?.codigo) tokens.add(normalizeToken(setor.codigo));
    if (setor?.nome) tokens.add(normalizeToken(setor.nome));
  }

  return Array.from(tokens).filter(Boolean);
}

async function getSetoresAcessoTodasObras() {
  const now = Date.now();
  if (setoresAcessoTodasObrasCache.expiresAt > now) {
    return setoresAcessoTodasObrasCache.setores;
  }

  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_ACESSO_TODAS_OBRAS },
    order: [['id', 'DESC']],
    attributes: ['valor']
  });

  let setores = [];
  if (item?.valor) {
    try {
      const data = JSON.parse(item.valor);
      setores = [...new Set(
        (Array.isArray(data?.setores) ? data.setores : [])
          .map(normalizeToken)
          .filter(Boolean)
      )];
    } catch {
      setores = [];
    }
  }

  setoresAcessoTodasObrasCache = {
    expiresAt: now + CACHE_TTL_MS,
    setores
  };

  return setores;
}

async function getUsuariosAcessoFinanceiro() {
  const now = Date.now();
  if (usuariosAcessoFinanceiroCache.expiresAt > now) {
    return usuariosAcessoFinanceiroCache.usuarios;
  }

  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ACESSO_FINANCEIRO },
    order: [['id', 'DESC']],
    attributes: ['valor']
  });

  let usuarios = [];
  if (item?.valor) {
    try {
      const data = JSON.parse(item.valor);
      usuarios = [...new Set(
        (Array.isArray(data?.usuarios) ? data.usuarios : [])
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0)
      )];
    } catch {
      usuarios = [];
    }
  }

  usuariosAcessoFinanceiroCache = {
    expiresAt: now + CACHE_TTL_MS,
    usuarios
  };

  return usuarios;
}

async function getUsuariosPermissoesRhDp() {
  const now = Date.now();
  if (usuariosPermissoesRhDpCache.expiresAt > now) {
    return usuariosPermissoesRhDpCache.usuarios;
  }

  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_PERMISSOES_RH_DP },
    order: [['id', 'DESC']],
    attributes: ['valor']
  });

  let usuarios = {};
  if (item?.valor) {
    try {
      const data = JSON.parse(item.valor);
      const input = data?.usuarios && typeof data.usuarios === 'object' ? data.usuarios : {};
      usuarios = Object.entries(input).reduce((acc, [userId, permissions]) => {
        const id = Number(userId);
        if (!Number.isInteger(id) || id <= 0) {
          return acc;
        }

        const normalizedPermissions = normalizeRhDpPermissionList(permissions);
        if (!normalizedPermissions.length) {
          return acc;
        }

        acc[id] = normalizedPermissions;
        return acc;
      }, {});
    } catch {
      usuarios = {};
    }
  }

  usuariosPermissoesRhDpCache = {
    expiresAt: now + CACHE_TTL_MS,
    usuarios
  };

  return usuarios;
}

async function getPermissoesAreasUsuarios() {
  const now = Date.now();
  if (permissoesAreasUsuariosCache.expiresAt > now) {
    return permissoesAreasUsuariosCache.usuarios;
  }

  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_PERMISSOES_AREAS_USUARIOS },
    order: [['id', 'DESC']],
    attributes: ['valor']
  });

  let usuarios = {};
  if (item?.valor) {
    try {
      const data = JSON.parse(item.valor);
      const input = data?.usuarios && typeof data.usuarios === 'object' ? data.usuarios : {};
      usuarios = Object.entries(input).reduce((acc, [userId, permissions]) => {
        const id = Number(userId);
        if (!Number.isInteger(id) || id <= 0) return acc;
        const normalized = normalizeModuloPermissaoList(permissions);
        if (normalized.length) acc[id] = normalized;
        return acc;
      }, {});
    } catch {
      usuarios = {};
    }
  }

  permissoesAreasUsuariosCache = {
    expiresAt: now + CACHE_TTL_MS,
    usuarios
  };

  return usuarios;
}

async function getAreasPermissoesForUser(user) {
  if (!user?.id) return [];
  // BusinessAdmin: sem restrições, retorna array vazio (frontend interpreta como acesso total)
  if (isBusinessAdmin(user)) return [];
  const sessionPermissions = normalizeModuloPermissaoList(user.areas_permissoes);
  if (sessionPermissions.length > 0) {
    return sessionPermissions;
  }
  const permissionMap = await getPermissoesAreasUsuarios();
  return permissionMap[Number(user.id)] || [];
}

async function userHasAreaPermission(user, permissionKeys = []) {
  if (isBusinessAdmin(user)) return true;

  const expected = new Set(
    (Array.isArray(permissionKeys) ? permissionKeys : [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (!expected.size) {
    return false;
  }

  const permissions = await getAreasPermissoesForUser(user);
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return true;
  }

  return permissions.some((permission) => expected.has(String(permission || '').trim().toLowerCase()));
}

async function userHasConfiguredAreaPermissions(user) {
  if (isBusinessAdmin(user)) return false;
  const permissions = await getAreasPermissoesForUser(user);
  return Array.isArray(permissions) && permissions.length > 0;
}

async function userHasAreaPermissionWhenConfigured(user, permissionKeys = []) {
  if (isBusinessAdmin(user)) return true;
  if (!(await userHasConfiguredAreaPermissions(user))) return false;
  return userHasAreaPermission(user, permissionKeys);
}

async function userHasAreaOrRhDpLegacyPermission(user, areaPermissionKeys = [], legacyPermissionKeys = []) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, areaPermissionKeys);
  }
  return userHasAnyRhDpCapability(user, legacyPermissionKeys);
}

function invalidatePermissoesAreasCache() {
  permissoesAreasUsuariosCache = {
    expiresAt: 0,
    usuarios: {}
  };
}

function invalidateObraAccessConfigCache() {
  setoresAcessoTodasObrasCache = {
    expiresAt: 0,
    setores: []
  };
}

function invalidateFinanceiroAccessConfigCache() {
  usuariosAcessoFinanceiroCache = {
    expiresAt: 0,
    usuarios: []
  };
}

function invalidateRhDpAccessConfigCache() {
  usuariosPermissoesRhDpCache = {
    expiresAt: 0,
    usuarios: {}
  };
}

function isSuperadmin(user) {
  return hasAnyProfile(user, ['SUPERADMIN']);
}

function isAdministrador(user) {
  return hasAnyProfile(user, ['ADMINISTRADOR']);
}

function isBusinessAdmin(user) {
  return isSuperadmin(user) || isAdministrador(user);
}

function hasAnyProfile(user, perfis = []) {
  const perfilUsuario = normalizeToken(user?.perfil);
  return (Array.isArray(perfis) ? perfis : []).some((perfil) => normalizeToken(perfil) === perfilUsuario);
}

async function hasAnyScopeToken(user, tokensPermitidos = []) {
  const tokensUsuario = await buildUserScopeTokens(user);
  const permitidos = new Set((Array.isArray(tokensPermitidos) ? tokensPermitidos : []).map(normalizeToken));
  return tokensUsuario.some((token) => permitidos.has(token));
}

async function userHasAllObrasAccess(user) {
  if (!user?.id) {
    return false;
  }

  if (isSuperadmin(user)) {
    return true;
  }

  const setoresPermitidos = await getSetoresAcessoTodasObras();
  if (!setoresPermitidos.length) {
    return false;
  }

  const tokensUsuario = await buildUserScopeTokens(user);
  return tokensUsuario.some((token) => setoresPermitidos.includes(normalizeToken(token)));
}

async function userHasFinanceiroAccessConfig(user) {
  if (!user?.id) {
    return false;
  }

  const usuariosPermitidos = await getUsuariosAcessoFinanceiro();
  return usuariosPermitidos.includes(Number(user.id));
}

async function getRhDpCapabilitiesForUser(user) {
  if (!user?.id) {
    return [];
  }

  if (isBusinessAdmin(user)) {
    const permissionMap = await getUsuariosPermissoesRhDp();
    return permissionMap[Number(user.id)] || [];
  }

  const permissionMap = await getUsuariosPermissoesRhDp();
  return permissionMap[Number(user.id)] || [];
}

async function userHasRhDpCapabilityConfig(user, capability) {
  if (!user?.id) {
    return false;
  }

  const permissions = await getRhDpCapabilitiesForUser(user);
  return permissions.includes(normalizePermission(capability));
}

async function userHasAnyRhDpCapability(user, capabilities = []) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  const expected = new Set(
    (Array.isArray(capabilities) ? capabilities : [])
      .map(normalizePermission)
      .filter(Boolean)
  );

  if (!expected.size) {
    return false;
  }

  const permissions = await getRhDpCapabilitiesForUser(user);
  return permissions.some((permission) => expected.has(permission));
}

async function hasObraAccess(user, obraId) {
  if (!obraId) {
    return false;
  }

  if (await userHasAllObrasAccess(user)) {
    return true;
  }

  const vinculo = await UsuarioObra.findOne({
    where: {
      user_id: user?.id,
      obra_id: obraId
    },
    attributes: ['id']
  });

  return Boolean(vinculo);
}

async function getUserObraIds(user) {
  if (!user?.id) {
    return [];
  }

  const vinculos = await UsuarioObra.findAll({
    where: {
      user_id: user.id
    },
    attributes: ['obra_id']
  });

  return [
    ...new Set(
      vinculos
        .map((item) => Number(item.obra_id))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  ];
}

async function getUserObraScopeIds(user) {
  if (await userHasAllObrasAccess(user)) {
    return null;
  }

  return getUserObraIds(user);
}

async function canManageUsers(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return hasAnyProfile(user, ['ADMIN']) && userHasSetorCapability(user, 'eh_setor_geo');
}

async function canAccessFinanceiro(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, FINANCEIRO_PERMISSION_KEYS);
  }

  if (hasAnyProfile(user, ['FINANCEIRO'])) {
    return true;
  }

  if (await userHasFinanceiroAccessConfig(user)) {
    return true;
  }

  return userHasSetorCapability(user, 'eh_setor_financeiro');
}

async function canAccessBoletos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, BOLETOS_PERMISSION_KEYS);
  }

  return (await canAccessFinanceiro(user)) && userHasAreaPermission(user, BOLETOS_PERMISSION_KEYS);
}

async function canGenerateBoletos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['boletos.emitir.gerar']);
  }

  return (await canAccessFinanceiro(user)) && userHasAreaPermission(user, ['boletos.emitir.gerar']);
}

async function userHasFinanceiroSector(user) {
  if (hasAnyProfile(user, ['FINANCEIRO'])) {
    return true;
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('FINANCEIRO') || await userHasSetorCapability(user, 'eh_setor_financeiro');
}

async function userHasPaymentApprovalDirectorate(user) {
  const tokens = await buildUserScopeTokens(user);
  return (
    tokens.includes('DIR_ADMIN') ||
    tokens.includes('DIRETORIA_ADMINISTRATIVA') ||
    tokens.includes('DIRETORIA ADMINISTRATIVA') ||
    tokens.includes('DIR_EXECUTIVA') ||
    tokens.includes('DIRETORIA_EXECUTIVA') ||
    tokens.includes('DIRETORIA EXECUTIVA')
  );
}

async function canAccessPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, FINANCEIRO_PAGAMENTOS_PERMISSION_KEYS);
  }

  return (await userHasFinanceiroSector(user)) || userHasPaymentApprovalDirectorate(user);
}

async function canPreparePagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.preparar']);
  }

  return userHasFinanceiroSector(user);
}

async function canApprovePagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.aprovar']);
  }

  return userHasPaymentApprovalDirectorate(user);
}

async function canSendPagamentosBanco(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.enviar_banco']);
  }

  return userHasFinanceiroSector(user);
}

async function canCancelPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.cancelar']);
  }

  return userHasFinanceiroSector(user);
}

async function canReprocessPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.reprocessar']);
  }

  return userHasFinanceiroSector(user);
}

async function canConfigurePagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.configurar']);
  }

  return userHasFinanceiroSector(user);
}

async function canConfirmarBaixaPagamento(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.pagamentos.confirmar_baixa']);
  }

  return userHasFinanceiroSector(user);
}

async function canManagePaymentBeneficiaries(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.favorecidos.gerenciar']);
  }

  return (await userHasFinanceiroSector(user)) || userHasPaymentApprovalDirectorate(user);
}

async function canViewPaymentBeneficiaries(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, FINANCEIRO_FAVORECIDOS_PERMISSION_KEYS);
  }

  return (await canAccessFinanceiro(user)) || userHasPaymentApprovalDirectorate(user);
}

async function canAuditPaymentBeneficiaries(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.favorecidos.auditar']);
  }

  return userHasFinanceiroSector(user) || userHasPaymentApprovalDirectorate(user);
}

async function canDeleteSolicitacaoAnexo(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_ANEXOS_DELETE_KEYS);
  }

  return userHasSetorCapability(user, 'eh_setor_compras');
}

async function canViewPrioridadesDiretoria(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_PRIORIDADES_VIEW_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return (
    tokens.includes('DIR_ADMIN') ||
    tokens.includes('DIR_OBRAS_PUBLICAS') ||
    tokens.includes('DIR_OBRAS_PRIVADAS')
  );
}

async function canCreatePrioridadeDiretoriaLote(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_PRIORIDADES_CREATE_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('DIR_ADMIN');
}

async function canFinalizePrioridadeDiretoriaLote(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_PRIORIDADES_FINISH_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('DIR_OBRAS_PUBLICAS') || tokens.includes('DIR_OBRAS_PRIVADAS');
}

async function canCancelPrioridadeDiretoriaLote(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_PRIORIDADES_CANCEL_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('DIR_ADMIN');
}

async function canDeletePrioridadeDiretoriaLote(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, SOLICITACOES_PRIORIDADES_DELETE_KEYS);
  }

  return false;
}

async function canAccessCompras(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMPRAS_PERMISSION_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return (
    Boolean(user?.pode_criar_solicitacao_compra) ||
    await userHasSetorCapability(user, 'eh_setor_compras') ||
    await userHasSetorCapability(user, 'eh_setor_geo') ||
    tokens.includes('COMPRAS') ||
    tokens.includes('GEO') ||
    tokens.includes('GERENCIA_PROCESSOS') ||
    tokens.includes('GERENCIA DE PROCESSOS') ||
    tokens.includes('GESTAO_PROCESSOS') ||
    tokens.includes('GESTAO DE PROCESSOS')
  );
}

async function canViewComprasPedidos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMPRAS_PEDIDOS_VIEW_KEYS);
  }

  return canAccessCompras(user);
}

async function canManageComprasPedidos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMPRAS_PEDIDOS_MANAGE_KEYS);
  }

  return userHasSetorCapability(user, 'eh_setor_compras');
}

async function canAuditComprasPedidos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, [
      ...COMPRAS_PEDIDOS_AUDIT_KEYS,
      ...COMPRAS_PEDIDOS_MANAGE_KEYS
    ]);
  }

  return userHasSetorCapability(user, 'eh_setor_compras');
}

async function canViewComprasCotacoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMPRAS_COTACOES_VIEW_KEYS);
  }

  return canAccessCompras(user);
}

async function canManageComprasCotacoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMPRAS_COTACOES_MANAGE_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return (
    await userHasSetorCapability(user, 'eh_setor_compras') ||
    tokens.includes('COMPRAS')
  );
}

async function canAccessRhDp(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, RH_DP_AREA_PERMISSION_KEYS);
  }

  return userHasAnyRhDpCapability(user, [
    'rh_dp_dashboard_view',
    'rh_dp_colaboradores_view',
    'rh_dp_colaboradores_edit',
    'rh_dp_documentos_view',
    'rh_dp_documentos_manage',
    'rh_dp_importacoes_execute',
    'rh_dp_apuracao_view',
    'rh_dp_apuracao_edit',
    'rh_dp_fechamento_execute',
    'rh_dp_fechamento_reopen',
    'rh_dp_obrigacoes_view'
  ]);
}

async function canAccessProvisoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, [
    'provisoes.lista.visualizar',
    'provisoes.cadastro.criar',
    'provisoes.cadastro.editar',
    'provisoes.status.gerenciar',
    'provisoes.dashboard.visualizar',
    'provisoes.categorias.gerenciar'
  ]);
}

async function canAccessComercial(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_PERMISSION_KEYS);
  }

  return false;
}

async function canReadComercialBaseData(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_BASE_READ_KEYS);
  }

  return false;
}

async function canViewComercialEmpreendimentos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_EMPREENDIMENTOS_VIEW_KEYS);
  }

  return false;
}

async function canManageComercialEmpreendimentos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_EMPREENDIMENTOS_MANAGE_KEYS);
  }

  return false;
}

async function canViewComercialContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_CONTRATOS_VIEW_KEYS);
  }

  return false;
}

async function canCreateComercialContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_CONTRATOS_CREATE_KEYS);
  }

  return false;
}

async function canManageComercialContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, COMERCIAL_CONTRATOS_MANAGE_KEYS);
  }

  return false;
}

async function canAccessContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CONTRATOS_VIEW_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return (
    (tokens.includes('ADMIN') && await userHasSetorCapability(user, 'eh_setor_geo')) ||
    await userHasSetorCapability(user, 'eh_setor_obra')
  );
}

async function canAccessContratosGlobal(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasSetorCapability(user, 'eh_setor_obra')) {
    return false;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CONTRATOS_VIEW_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('ADMIN') && await userHasSetorCapability(user, 'eh_setor_geo');
}

async function shouldRestrictContratosToObras(user) {
  if (isBusinessAdmin(user)) {
    return false;
  }

  return userHasSetorCapability(user, 'eh_setor_obra');
}

async function canCreateContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CONTRATOS_CREATE_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('ADMIN') && await userHasSetorCapability(user, 'eh_setor_geo');
}

async function canManageContratos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CONTRATOS_MANAGE_KEYS);
  }

  const tokens = await buildUserScopeTokens(user);
  return tokens.includes('ADMIN') && await userHasSetorCapability(user, 'eh_setor_geo');
}

async function canViewProvisoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, [
    'provisoes.lista.visualizar',
    'provisoes.cadastro.criar',
    'provisoes.cadastro.editar',
    'provisoes.categorias.gerenciar'
  ]);
}

async function canCreateProvisoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, [
    'provisoes.cadastro.criar',
    'provisoes.cadastro.editar'
  ]);
}

async function canEditProvisoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, ['provisoes.cadastro.editar']);
}

async function canManageProvisoesStatus(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, ['provisoes.status.gerenciar']);
}

async function canViewProvisoesDashboard(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, ['provisoes.dashboard.visualizar']);
}

async function canManageProvisoesCategorias(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermission(user, ['provisoes.categorias.gerenciar']);
}

async function canAccessIntegracaoSienge(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, INTEGRACAO_SIENGE_AREA_PERMISSION_KEYS);
  }

  return userHasAnyRhDpCapability(user, [
    'integracao_sienge_view',
    'integracao_sienge_retry',
    'integracao_sienge_config_manage'
  ]);
}

async function canViewRhDpDashboard(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.dashboard.visualizar'], ['rh_dp_dashboard_view']);
}

async function canManageRhDpEmpresas(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAreaPermissionWhenConfigured(user, ['rh_dp.empresas.gerenciar']);
}

async function canViewRhDpColaboradores(user) {
  return userHasAreaOrRhDpLegacyPermission(user, [
    'rh_dp.colaboradores.visualizar',
    'rh_dp.colaboradores.editar'
  ], ['rh_dp_colaboradores_view', 'rh_dp_colaboradores_edit']);
}

async function canManageRhDpColaboradores(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.colaboradores.editar'], ['rh_dp_colaboradores_edit']);
}

async function canViewRhDpDocumentos(user) {
  return userHasAreaOrRhDpLegacyPermission(user, [
    'rh_dp.documentos.visualizar',
    'rh_dp.documentos.gerenciar'
  ], ['rh_dp_documentos_view', 'rh_dp_documentos_manage']);
}

async function canManageRhDpDocumentos(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.documentos.gerenciar'], ['rh_dp_documentos_manage']);
}

async function canExecuteRhDpImportacoes(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.importacoes.executar'], ['rh_dp_importacoes_execute']);
}

async function canViewRhDpApuracao(user) {
  return userHasAreaOrRhDpLegacyPermission(user, [
    'rh_dp.apuracao.visualizar',
    'rh_dp.apuracao.editar',
    'rh_dp.fechamento.executar'
  ], ['rh_dp_apuracao_view', 'rh_dp_apuracao_edit', 'rh_dp_fechamento_execute']);
}

async function canEditRhDpApuracao(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.apuracao.editar'], ['rh_dp_apuracao_edit']);
}

async function canViewRhDpObrigacoes(user) {
  return userHasAreaOrRhDpLegacyPermission(user, [
    'rh_dp.obrigacoes.visualizar',
    'rh_dp.fechamento.executar',
    'rh_dp.fechamento.reabrir'
  ], ['rh_dp_obrigacoes_view', 'rh_dp_fechamento_execute', 'rh_dp_fechamento_reopen']);
}

async function canExecuteRhDpFechamento(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.fechamento.executar'], ['rh_dp_fechamento_execute']);
}

async function canReopenRhDpFechamento(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['rh_dp.fechamento.reabrir'], ['rh_dp_fechamento_reopen']);
}

async function canViewIntegracaoSienge(user) {
  return userHasAreaOrRhDpLegacyPermission(user, [
    'integracao_sienge.geral.visualizar',
    'integracao_sienge.geral.reprocessar',
    'integracao_sienge.geral.configurar'
  ], ['integracao_sienge_view', 'integracao_sienge_retry', 'integracao_sienge_config_manage']);
}

async function canRetryIntegracaoSienge(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['integracao_sienge.geral.reprocessar'], ['integracao_sienge_retry']);
}

async function canManageIntegracaoSiengeConfig(user) {
  return userHasAreaOrRhDpLegacyPermission(user, ['integracao_sienge.geral.configurar'], ['integracao_sienge_config_manage']);
}

async function canAccessCrm(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_PERMISSION_KEYS);
  }

  return hasAnyProfile(user, ['ADMIN', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM', 'DIRETORIA']);
}

async function canViewCrmDashboard(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_DASHBOARD_KEYS);
  }
  return canAccessCrm(user);
}

async function canViewCrmLeads(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_LEADS_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

async function canCreateCrmLeads(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_LEADS_WRITE_KEYS);
  }
  return canAccessCrm(user);
}

async function canExportCrmLeads(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_LEADS_EXPORT_KEYS);
  }

  return hasAnyProfile(user, ['ADMIN', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM']);
}

async function canRedistributeCrmLeads(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_LEADS_REDISTRIBUTE_KEYS);
  }

  return hasAnyProfile(user, ['ADMIN', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM']);
}

async function canReceiveCrmLeadAssignment(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_LEADS_VIEW_KEYS);
  }

  return hasAnyProfile(user, CRM_LEADS_ASSIGNMENT_LEGACY_PROFILES);
}

async function canViewCrmAtendimento(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_ATENDIMENTO_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

async function canSendCrmAtendimento(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_ATENDIMENTO_SEND_KEYS);
  }
  return canAccessCrm(user);
}

async function canViewCrmAutomacoes(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_AUTOMACOES_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

async function canManageCrmAutomacoes(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_AUTOMACOES_MANAGE_KEYS);
  }
  return canAccessCrm(user);
}

async function canReceiveCrmAutomationManagerNotification(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_AUTOMACOES_MANAGE_KEYS);
  }

  return hasAnyProfile(user, CRM_AUTOMATION_MANAGER_LEGACY_PROFILES);
}

async function canViewCrmConfiguracoes(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_CONFIG_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

async function canManageCrmConfiguracoes(user) {
  if (isBusinessAdmin(user)) return true;
  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, CRM_CONFIG_MANAGE_KEYS);
  }
  return canAccessCrm(user);
}

async function getFinanceiroObraScopeIds(user) {
  if (await canAccessFinanceiro(user)) {
    return null;
  }

  return getUserObraScopeIds(user);
}

async function canAccessComprovantes(user) {
  return canAccessFinanceiro(user);
}

async function canDeleteComprovante(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  if (await userHasConfiguredAreaPermissions(user)) {
    return userHasAreaPermission(user, ['financeiro.comprovantes.excluir']);
  }

  return false;
}

module.exports = {
  canAccessBoletos,
  canAccessComercial,
  canAccessContratos,
  canAccessContratosGlobal,
  canAccessCompras,
  canAccessCrm,
  canAccessProvisoes,
  canAccessFinanceiro,
  canAccessIntegracaoSienge,
  canAccessRhDp,
  canAuditComprasPedidos,
  buildUserScopeTokens,
  canAccessComprovantes,
  canCancelPrioridadeDiretoriaLote,
  canAccessPagamentos,
  canApprovePagamentos,
  canAuditPaymentBeneficiaries,
  canConfigurePagamentos,
  canConfirmarBaixaPagamento,
  canCreatePrioridadeDiretoriaLote,
  canDeleteComprovante,
  canDeletePrioridadeDiretoriaLote,
  canDeleteSolicitacaoAnexo,
  canEditRhDpApuracao,
  canEditProvisoes,
  canExecuteRhDpFechamento,
  canExecuteRhDpImportacoes,
  canCreateCrmLeads,
  canCreateProvisoes,
  canCreateContratos,
  canCancelPagamentos,
  canReprocessPagamentos,
  canExportCrmLeads,
  canGenerateBoletos,
  canCreateComercialContratos,
  canManagePaymentBeneficiaries,
  canManageComercialContratos,
  canManageContratos,
  canManageComercialEmpreendimentos,
  canManageComprasCotacoes,
  canManageComprasPedidos,
  canManageCrmAutomacoes,
  canManageCrmConfiguracoes,
  canManageRhDpEmpresas,
  canFinalizePrioridadeDiretoriaLote,
  canRedistributeCrmLeads,
  canReceiveCrmAutomationManagerNotification,
  canReceiveCrmLeadAssignment,
  canReopenRhDpFechamento,
  canReadComercialBaseData,
  canPreparePagamentos,
  canManageIntegracaoSiengeConfig,
  canManageProvisoesCategorias,
  canManageProvisoesStatus,
  canManageRhDpColaboradores,
  canManageRhDpDocumentos,
  getFinanceiroObraScopeIds,
  canRetryIntegracaoSienge,
  canSendPagamentosBanco,
  canViewIntegracaoSienge,
  canViewPaymentBeneficiaries,
  canViewPrioridadesDiretoria,
  canSendCrmAtendimento,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  canViewComprasCotacoes,
  canViewComprasPedidos,
  canViewCrmAtendimento,
  canViewCrmAutomacoes,
  canViewCrmConfiguracoes,
  canViewCrmDashboard,
  canViewCrmLeads,
  canViewProvisoes,
  canViewProvisoesDashboard,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDashboard,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  getRhDpCapabilitiesForUser,
  isAdministrador,
  isBusinessAdmin,
  canManageUsers,
  getSetoresAcessoTodasObras,
  getUsuariosAcessoFinanceiro,
  getUsuariosPermissoesRhDp,
  getUserObraIds,
  getUserObraScopeIds,
  hasAnyProfile,
  hasAnyScopeToken,
  hasObraAccess,
  getAreasPermissoesForUser,
  getPermissoesAreasUsuarios,
  invalidateFinanceiroAccessConfigCache,
  invalidateObraAccessConfigCache,
  invalidatePermissoesAreasCache,
  invalidateRhDpAccessConfigCache,
  isSuperadmin,
  normalizeToken,
  userHasAreaPermission,
  userHasFinanceiroAccessConfig,
  userHasAllObrasAccess,
  userHasAnyRhDpCapability,
  userHasRhDpCapabilityConfig,
  shouldRestrictContratosToObras
};
