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
  'financeiro.relatorios.visualizar',
  'financeiro.relatorios.resultado_obras',
  'financeiro.conciliacao.visualizar',
  'financeiro.conciliacao.importar',
  'financeiro.conciliacao.conciliar',
  'financeiro.cadastros.visualizar',
  'financeiro.cadastros.gerenciar'
];

const BOLETOS_PERMISSION_KEYS = [
  'boletos.emitir.visualizar',
  'boletos.emitir.gerar'
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

  return userHasAnyRhDpCapability(user, [
    'integracao_sienge_view',
    'integracao_sienge_retry',
    'integracao_sienge_config_manage'
  ]);
}

async function canViewRhDpDashboard(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_dashboard_view']);
}

async function canViewRhDpColaboradores(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_colaboradores_view', 'rh_dp_colaboradores_edit']);
}

async function canManageRhDpColaboradores(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_colaboradores_edit']);
}

async function canViewRhDpDocumentos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_documentos_view', 'rh_dp_documentos_manage']);
}

async function canManageRhDpDocumentos(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_documentos_manage']);
}

async function canExecuteRhDpImportacoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_importacoes_execute']);
}

async function canViewRhDpApuracao(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_apuracao_view', 'rh_dp_apuracao_edit', 'rh_dp_fechamento_execute']);
}

async function canEditRhDpApuracao(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_apuracao_edit']);
}

async function canViewRhDpObrigacoes(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_obrigacoes_view', 'rh_dp_fechamento_execute']);
}

async function canExecuteRhDpFechamento(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['rh_dp_fechamento_execute']);
}

async function canViewIntegracaoSienge(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['integracao_sienge_view', 'integracao_sienge_retry', 'integracao_sienge_config_manage']);
}

async function canRetryIntegracaoSienge(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['integracao_sienge_retry']);
}

async function canManageIntegracaoSiengeConfig(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return userHasAnyRhDpCapability(user, ['integracao_sienge_config_manage']);
}

async function canExportCrmLeads(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return hasAnyProfile(user, ['ADMIN', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM']);
}

async function canRedistributeCrmLeads(user) {
  if (isBusinessAdmin(user)) {
    return true;
  }

  return hasAnyProfile(user, ['ADMIN', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM']);
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

module.exports = {
  canAccessBoletos,
  canAccessComercial,
  canAccessCompras,
  canAccessProvisoes,
  canAccessFinanceiro,
  canAccessIntegracaoSienge,
  canAccessRhDp,
  canAuditComprasPedidos,
  buildUserScopeTokens,
  canAccessComprovantes,
  canEditRhDpApuracao,
  canEditProvisoes,
  canExecuteRhDpFechamento,
  canExecuteRhDpImportacoes,
  canCreateProvisoes,
  canExportCrmLeads,
  canGenerateBoletos,
  canCreateComercialContratos,
  canManageComercialContratos,
  canManageComercialEmpreendimentos,
  canManageComprasCotacoes,
  canManageComprasPedidos,
  canRedistributeCrmLeads,
  canManageIntegracaoSiengeConfig,
  canManageProvisoesCategorias,
  canManageProvisoesStatus,
  canManageRhDpColaboradores,
  canManageRhDpDocumentos,
  getFinanceiroObraScopeIds,
  canRetryIntegracaoSienge,
  canViewIntegracaoSienge,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  canViewComprasCotacoes,
  canViewComprasPedidos,
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
  userHasRhDpCapabilityConfig
};
