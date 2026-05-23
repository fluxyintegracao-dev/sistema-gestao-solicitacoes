import { userHasSetorCapability } from './setor';
import { normalizeRhDpPermissionList } from '../constants/rhDpPermissions';

export function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isSuperadmin(user) {
  return normalizeToken(user?.perfil) === 'SUPERADMIN';
}

export function isAdministrador(user) {
  return normalizeToken(user?.perfil) === 'ADMINISTRADOR';
}

export function isAdmin(user) {
  return normalizeToken(user?.perfil) === 'ADMIN';
}

export function isBusinessAdmin(user) {
  return isSuperadmin(user) || isAdministrador(user);
}

export function isAdminGeo(user) {
  return isAdmin(user) && userHasSetorCapability(user, 'eh_setor_geo');
}

export function canManageUsers(user) {
  return isBusinessAdmin(user) || isAdminGeo(user);
}

export function getEnabledModules(user) {
  return Array.isArray(user?.modulos_habilitados) ? user.modulos_habilitados : [];
}

export function hasEnabledModule(user, moduleKey, options = {}) {
  const normalizedKey = normalizeToken(moduleKey);
  const allowSuperadminBypass = options.allowSuperadminBypass !== false;

  if (!normalizedKey) return true;
  if (allowSuperadminBypass && isSuperadmin(user)) return true;

  const modules = getEnabledModules(user);
  if (!modules.length) return true;

  const found = modules.find((item) => normalizeToken(item?.key) === normalizedKey);
  if (!found) return true;
  return Boolean(found.enabled);
}

export function canAccessSolicitacoes(user) {
  return hasEnabledModule(user, 'SOLICITACOES');
}

export function canAccessPrioridadesDiretoria(user) {
  if (!canAccessSolicitacoes(user)) return false;
  if (isBusinessAdmin(user)) return true;
  if (user?.prioridade_diretoria_acesso) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'solicitacoes.prioridades.visualizar',
      'solicitacoes.prioridades.criar',
      'solicitacoes.prioridades.finalizar',
      'solicitacoes.prioridades.cancelar',
      'solicitacoes.prioridades.excluir'
    ]);
  }

  const tokens = [
    user?.setor?.codigo,
    user?.setor?.nome,
    user?.area,
    ...(Array.isArray(user?.setores) ? user.setores.flatMap(setor => [setor?.codigo, setor?.nome]) : []),
    ...(Array.isArray(user?.setoresVinculos)
      ? user.setoresVinculos.flatMap(vinculo => [vinculo?.setor?.codigo, vinculo?.setor?.nome])
      : [])
  ].map(normalizeToken).filter(Boolean);

  return (
    tokens.includes('DIR_ADMIN') ||
    tokens.includes('DIR_OBRAS_PUBLICAS') ||
    tokens.includes('DIR_OBRAS_PRIVADAS')
  );
}

export function canDeleteSolicitacaoAnexo(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasPermissao(user, 'solicitacoes.anexos.excluir');
  }
  return userHasSetorCapability(user, 'eh_setor_compras');
}

export function canAccessCompras(user) {
  if (!hasEnabledModule(user, 'COMPRAS')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'compras.pedidos.visualizar',
      'compras.pedidos.criar',
      'compras.pedidos.aprovar',
      'compras.pedidos.auditoria',
      'compras.cotacoes.visualizar',
      'compras.cotacoes.gerenciar',
      'compras.relatorios.visualizar',
      'compras.relatorios.cotacoes',
      'compras.relatorios.pedidos'
    ]);
  }

  return (
    Boolean(user?.pode_criar_solicitacao_compra) ||
    userHasSetorCapability(user, 'eh_setor_compras') ||
    userHasSetorCapability(user, 'eh_setor_geo')
  );
}

export function canManageComprasPedidos(user) {
  if (!hasEnabledModule(user, 'COMPRAS')) return false;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'compras.pedidos.criar',
      'compras.pedidos.aprovar'
    ]);
  }
  return isBusinessAdmin(user) || userHasSetorCapability(user, 'eh_setor_compras');
}

export function canViewComprasPedidos(user) {
  if (!hasEnabledModule(user, 'COMPRAS')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'compras.pedidos.visualizar',
      'compras.pedidos.criar',
      'compras.pedidos.aprovar',
      'compras.pedidos.auditoria',
      'compras.relatorios.visualizar',
      'compras.relatorios.pedidos'
    ]);
  }
  return canAccessCompras(user);
}

export function canCreateComprasPedidos(user) {
  return canManageComprasPedidos(user);
}

export function canViewComprasCotacoes(user) {
  if (!hasEnabledModule(user, 'COMPRAS')) return false;
  if (!hasEnabledModule(user, 'COTACOES')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'compras.cotacoes.visualizar',
      'compras.cotacoes.gerenciar',
      'compras.relatorios.visualizar',
      'compras.relatorios.cotacoes'
    ]);
  }
  return canAccessCompras(user);
}

export function canManageComprasCotacoes(user) {
  if (!hasEnabledModule(user, 'COMPRAS')) return false;
  if (!hasEnabledModule(user, 'COTACOES')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasPermissao(user, 'compras.cotacoes.gerenciar');
  }
  return userHasSetorCapability(user, 'eh_setor_compras');
}

export function canAccessFinanceiro(user) {
  if (!hasEnabledModule(user, 'FINANCEIRO')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'financeiro.titulos.visualizar',
      'financeiro.titulos.criar',
      'financeiro.titulos.baixar',
      'financeiro.titulos.estornar',
      'financeiro.comprovantes.excluir',
      'financeiro.relatorios.visualizar',
      'financeiro.relatorios.grupo_consolidado',
      'financeiro.relatorios.fluxo_consolidado',
      'financeiro.relatorios.dre',
      'financeiro.relatorios.diagnostico_dre',
      'financeiro.relatorios.intercompany',
      'financeiro.relatorios.endividamento',
      'financeiro.relatorios.analitico',
      'financeiro.relatorios.resultado_obras',
      'financeiro.relatorios.centros_custo',
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
    ]);
  }

  return (
    Boolean(user?.financeiro_liberado) ||
    normalizeToken(user?.perfil) === 'FINANCEIRO' ||
    userHasSetorCapability(user, 'eh_setor_financeiro')
  );
}

function userHasPaymentApprovalDirectorate(user) {
  const tokens = [
    user?.setor?.codigo,
    user?.setor?.nome,
    user?.area,
    ...(Array.isArray(user?.setores) ? user.setores.flatMap(setor => [setor?.codigo, setor?.nome]) : []),
    ...(Array.isArray(user?.setoresVinculos)
      ? user.setoresVinculos.flatMap(vinculo => [vinculo?.setor?.codigo, vinculo?.setor?.nome])
      : [])
  ].map(normalizeToken).filter(Boolean);

  return (
    tokens.includes('DIR_ADMIN') ||
    tokens.includes('DIRETORIA_ADMINISTRATIVA') ||
    tokens.includes('DIRETORIA ADMINISTRATIVA') ||
    tokens.includes('DIR_EXECUTIVA') ||
    tokens.includes('DIRETORIA_EXECUTIVA') ||
    tokens.includes('DIRETORIA EXECUTIVA')
  );
}

export function canAccessPagamentos(user) {
  if (!hasEnabledModule(user, 'FINANCEIRO')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'financeiro.pagamentos.visualizar',
      'financeiro.pagamentos.preparar',
      'financeiro.pagamentos.aprovar',
      'financeiro.pagamentos.enviar_banco',
      'financeiro.pagamentos.cancelar',
      'financeiro.pagamentos.reprocessar',
      'financeiro.pagamentos.confirmar_baixa',
      'financeiro.pagamentos.auditar',
      'financeiro.pagamentos.configurar'
    ]);
  }

  return canAccessFinanceiro(user) || userHasPaymentApprovalDirectorate(user);
}

export function canPreparePagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.preparar');
  return userHasSetorCapability(user, 'eh_setor_financeiro') || normalizeToken(user?.perfil) === 'FINANCEIRO';
}

export function canApprovePagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.aprovar');
  return userHasPaymentApprovalDirectorate(user);
}

export function canSendPagamentosBanco(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.enviar_banco');
  return userHasSetorCapability(user, 'eh_setor_financeiro') || normalizeToken(user?.perfil) === 'FINANCEIRO';
}

export function canCancelPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.cancelar');
  return userHasSetorCapability(user, 'eh_setor_financeiro') || normalizeToken(user?.perfil) === 'FINANCEIRO';
}

export function canReprocessPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.reprocessar');
  return userHasSetorCapability(user, 'eh_setor_financeiro') || normalizeToken(user?.perfil) === 'FINANCEIRO';
}

export function canConfirmarBaixaPagamento(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.confirmar_baixa');
  return userHasSetorCapability(user, 'eh_setor_financeiro') || normalizeToken(user?.perfil) === 'FINANCEIRO';
}

export function canAuditPagamentos(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.pagamentos.auditar');
  return (
    userHasSetorCapability(user, 'eh_setor_financeiro') ||
    normalizeToken(user?.perfil) === 'FINANCEIRO' ||
    userHasPaymentApprovalDirectorate(user)
  );
}

export function canManagePaymentBeneficiaries(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) return hasPermissao(user, 'financeiro.favorecidos.gerenciar');
  return (
    userHasSetorCapability(user, 'eh_setor_financeiro') ||
    normalizeToken(user?.perfil) === 'FINANCEIRO' ||
    userHasPaymentApprovalDirectorate(user)
  );
}

export function canDeleteComprovante(user) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasPermissao(user, 'financeiro.comprovantes.excluir');
  }
  return false;
}

export function canAccessBoletos(user) {
  if (!hasEnabledModule(user, 'BOLETOS')) return false;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'boletos.emitir.visualizar',
      'boletos.emitir.gerar'
    ]);
  }
  return canAccessFinanceiro(user) && (
    hasPermissao(user, 'boletos.emitir.visualizar') ||
    hasPermissao(user, 'boletos.emitir.gerar')
  );
}

export function canAccessCadastroObras(user) {
  if (!hasEnabledModule(user, 'OBRAS')) return false;
  if (isBusinessAdmin(user)) return true;
  return hasAnyExplicitPermissao(user, [
    'obras.cadastro.visualizar',
    'obras.cadastro.gerenciar'
  ]);
}

export function canAccessGestaoObras(user) {
  if (!hasEnabledModule(user, 'OBRAS')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'obras.gestao.visualizar',
      'obras.gestao.apropriacoes'
    ]);
  }
  return canAccessCadastroObras(user);
}

export function canAccessContratos(user) {
  if (!hasEnabledModule(user, 'CONTRATOS')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'contratos.geral.visualizar',
      'contratos.geral.criar',
      'contratos.geral.editar',
      'contratos.relatorios.visualizar'
    ]);
  }
  return isAdminGeo(user) || userHasSetorCapability(user, 'eh_setor_obra');
}

export function canAccessComercial(user) {
  if (!hasEnabledModule(user, 'COMERCIAL')) return false;
  if (isBusinessAdmin(user)) return true;
  return hasAnyExplicitPermissao(user, [
    'comercial.empreendimentos.visualizar',
    'comercial.empreendimentos.gerenciar',
    'comercial.vendas.visualizar',
    'comercial.vendas.criar',
    'comercial.vendas.contratos',
    'comercial.relatorios.visualizar'
  ]);
}

export function canViewComercialEmpreendimentos(user) {
  if (!hasEnabledModule(user, 'COMERCIAL')) return false;
  if (isBusinessAdmin(user)) return true;
  return hasAnyExplicitPermissao(user, [
    'comercial.empreendimentos.visualizar',
    'comercial.empreendimentos.gerenciar'
  ]);
}

export function canViewComercialContratos(user) {
  if (!hasEnabledModule(user, 'COMERCIAL')) return false;
  if (isBusinessAdmin(user)) return true;
  return hasAnyExplicitPermissao(user, [
    'comercial.vendas.visualizar',
    'comercial.vendas.criar',
    'comercial.vendas.contratos',
    'comercial.relatorios.visualizar'
  ]);
}

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
  'rh_dp.obrigacoes.visualizar',
  'rh_dp.relatorios.visualizar'
];

const RH_DP_LEGACY_TO_AREA = {
  rh_dp_dashboard_view: ['rh_dp.dashboard.visualizar'],
  rh_dp_colaboradores_view: ['rh_dp.colaboradores.visualizar'],
  rh_dp_colaboradores_edit: ['rh_dp.colaboradores.editar'],
  rh_dp_documentos_view: ['rh_dp.documentos.visualizar'],
  rh_dp_documentos_manage: ['rh_dp.documentos.gerenciar'],
  rh_dp_importacoes_execute: ['rh_dp.importacoes.executar'],
  rh_dp_apuracao_view: ['rh_dp.apuracao.visualizar'],
  rh_dp_apuracao_edit: ['rh_dp.apuracao.editar'],
  rh_dp_fechamento_execute: ['rh_dp.fechamento.executar'],
  rh_dp_fechamento_reopen: ['rh_dp.fechamento.reabrir'],
  rh_dp_obrigacoes_view: ['rh_dp.obrigacoes.visualizar']
};

const INTEGRACAO_SIENGE_AREA_PERMISSION_KEYS = [
  'integracao_sienge.geral.visualizar',
  'integracao_sienge.geral.reprocessar',
  'integracao_sienge.geral.configurar'
];

const INTEGRACAO_SIENGE_LEGACY_TO_AREA = {
  integracao_sienge_view: ['integracao_sienge.geral.visualizar'],
  integracao_sienge_retry: ['integracao_sienge.geral.reprocessar'],
  integracao_sienge_config_manage: ['integracao_sienge.geral.configurar']
};

export function canAccessRhDp(user) {
  if (!hasEnabledModule(user, 'RH_DP')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, RH_DP_AREA_PERMISSION_KEYS);
  }
  return getRhDpCapabilities(user).length > 0;
}

export function canAccessIntegracaoSienge(user) {
  if (!hasEnabledModule(user, 'INTEGRACAO_SIENGE')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, INTEGRACAO_SIENGE_AREA_PERMISSION_KEYS);
  }
  return getIntegracaoSiengeCapabilities(user).length > 0;
}

export function canAccessProvisoes(user) {
  if (!hasEnabledModule(user, 'PROVISOES')) return false;
  if (isBusinessAdmin(user)) return true;

  return (
    hasPermissao(user, 'provisoes.lista.visualizar') ||
    hasPermissao(user, 'provisoes.cadastro.criar') ||
    hasPermissao(user, 'provisoes.cadastro.editar') ||
    hasPermissao(user, 'provisoes.dashboard.visualizar') ||
    hasPermissao(user, 'provisoes.relatorios.visualizar') ||
    hasPermissao(user, 'provisoes.status.gerenciar') ||
    hasPermissao(user, 'provisoes.categorias.gerenciar')
  );
}

export function getRhDpCapabilities(user) {
  return normalizeRhDpPermissionList(user?.rh_dp_capacidades || []);
}

export function getIntegracaoSiengeCapabilities(user) {
  return normalizeRhDpPermissionList(user?.integracao_sienge_capacidades || []);
}

export function hasRhDpCapability(user, capability) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    const key = String(capability || '').trim().toLowerCase();
    return hasAnyPermissao(user, RH_DP_LEGACY_TO_AREA[key] || []);
  }
  return getRhDpCapabilities(user).includes(String(capability || '').trim().toLowerCase());
}

export function hasIntegracaoSiengeCapability(user, capability) {
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    const key = String(capability || '').trim().toLowerCase();
    return hasAnyPermissao(user, INTEGRACAO_SIENGE_LEGACY_TO_AREA[key] || []);
  }
  return getIntegracaoSiengeCapabilities(user).includes(String(capability || '').trim().toLowerCase());
}

export function canAccessRhDpDashboard(user) {
  if (!canAccessRhDp(user)) return false;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, ['rh_dp.dashboard.visualizar', 'rh_dp.relatorios.visualizar']);
  }
  return hasRhDpCapability(user, 'rh_dp_dashboard_view');
}

export function canAccessRhDpEmpresas(user) {
  if (!hasEnabledModule(user, 'RH_DP')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasPermissao(user, 'rh_dp.empresas.gerenciar');
  }
  return false;
}

export function canViewRhDpColaboradores(user) {
  return canAccessRhDp(user) && (
    hasRhDpCapability(user, 'rh_dp_colaboradores_view') ||
    hasRhDpCapability(user, 'rh_dp_colaboradores_edit')
  );
}

export function canManageRhDpColaboradores(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_colaboradores_edit');
}

export function canViewRhDpDocumentos(user) {
  return canAccessRhDp(user) && (
    hasRhDpCapability(user, 'rh_dp_documentos_view') ||
    hasRhDpCapability(user, 'rh_dp_documentos_manage')
  );
}

export function canManageRhDpDocumentos(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_documentos_manage');
}

export function canExecuteRhDpImportacoes(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_importacoes_execute');
}

export function canViewRhDpApuracao(user) {
  return canAccessRhDp(user) && (
    hasRhDpCapability(user, 'rh_dp_apuracao_view') ||
    hasRhDpCapability(user, 'rh_dp_apuracao_edit') ||
    hasRhDpCapability(user, 'rh_dp_fechamento_execute')
  );
}

export function canEditRhDpApuracao(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_apuracao_edit');
}

export function canViewRhDpObrigacoes(user) {
  return canAccessRhDp(user) && (
    hasRhDpCapability(user, 'rh_dp_obrigacoes_view') ||
    hasRhDpCapability(user, 'rh_dp_fechamento_execute') ||
    hasRhDpCapability(user, 'rh_dp_fechamento_reopen')
  );
}

export function canExecuteRhDpFechamento(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_fechamento_execute');
}

export function canReopenRhDpFechamento(user) {
  return canAccessRhDp(user) && hasRhDpCapability(user, 'rh_dp_fechamento_reopen');
}

export function canViewIntegracaoSienge(user) {
  return canAccessIntegracaoSienge(user) && (
    hasIntegracaoSiengeCapability(user, 'integracao_sienge_view') ||
    hasIntegracaoSiengeCapability(user, 'integracao_sienge_retry') ||
    hasIntegracaoSiengeCapability(user, 'integracao_sienge_config_manage')
  );
}

export function canRetryIntegracaoSienge(user) {
  return canAccessIntegracaoSienge(user) && hasIntegracaoSiengeCapability(user, 'integracao_sienge_retry');
}

export function canManageIntegracaoSiengeConfig(user) {
  return canAccessIntegracaoSienge(user) && hasIntegracaoSiengeCapability(user, 'integracao_sienge_config_manage');
}

export function canViewProvisionamentos(user) {
  return canAccessProvisoes(user) && (
    hasPermissao(user, 'provisoes.lista.visualizar') ||
    hasPermissao(user, 'provisoes.cadastro.criar') ||
    hasPermissao(user, 'provisoes.cadastro.editar')
  );
}

export function canCreateProvisionamentos(user) {
  return canAccessProvisoes(user) && (
    hasPermissao(user, 'provisoes.cadastro.criar') ||
    hasPermissao(user, 'provisoes.cadastro.editar')
  );
}

export function canManageProvisionamentos(user) {
  return canAccessProvisoes(user) && hasPermissao(user, 'provisoes.cadastro.editar');
}

export function canManageProvisionamentosStatus(user) {
  return canAccessProvisoes(user) && hasPermissao(user, 'provisoes.status.gerenciar');
}

export function canViewProvisionamentosDashboard(user) {
  return canAccessProvisoes(user) && hasAnyPermissao(user, [
    'provisoes.dashboard.visualizar',
    'provisoes.relatorios.visualizar'
  ]);
}

export function canManageProvisionamentoCategorias(user) {
  return canAccessProvisoes(user) && hasPermissao(user, 'provisoes.categorias.gerenciar');
}

export function canAccessBiblioteca(user) {
  if (!hasEnabledModule(user, 'BIBLIOTECA_MODELOS')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'biblioteca.geral.visualizar',
      'biblioteca.geral.gerenciar'
    ]);
  }
  return true;
}

export function canAccessComunicacao(user) {
  if (!hasEnabledModule(user, 'COMUNICACAO_INTERNA')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, [
      'comunicacao.geral.visualizar',
      'comunicacao.geral.enviar'
    ]);
  }
  return true;
}

const FISCAL_PERMISSION_KEYS = [
  'fiscal.view',
  'fiscal.config.manage',
  'fiscal.document.view',
  'fiscal.document.upload',
  'fiscal.document.link',
  'fiscal.document.ignore',
  'fiscal.sync.view',
  'fiscal.sync.run',
  'fiscal.logs.view',
  'fiscal.relatorios.visualizar'
];

export function canAccessFiscal(user) {
  if (!hasEnabledModule(user, 'FISCAL')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, FISCAL_PERMISSION_KEYS);
  }
  return false;
}

export function canManageFiscalConfig(user) {
  if (!hasEnabledModule(user, 'FISCAL')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasPermissao(user, 'fiscal.config.manage');
  }
  return false;
}

export function canViewFiscalDocuments(user) {
  if (!hasEnabledModule(user, 'FISCAL')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, ['fiscal.document.view', 'fiscal.document.upload', 'fiscal.document.link', 'fiscal.document.ignore', 'fiscal.relatorios.visualizar']);
  }
  return false;
}

export function canViewFiscalLogs(user) {
  if (!hasEnabledModule(user, 'FISCAL')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, ['fiscal.sync.view', 'fiscal.sync.run', 'fiscal.logs.view', 'fiscal.relatorios.visualizar']);
  }
  return false;
}

const CRM_PERFIS = ['SUPERADMIN', 'ADMIN', 'ADMINISTRADOR', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM', 'DIRETORIA'];
const CRM_PERFIS_EXPORT = ['SUPERADMIN', 'ADMIN', 'ADMINISTRADOR', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM'];
const CRM_PERFIS_REDISTRIBUTE = ['SUPERADMIN', 'ADMIN', 'ADMINISTRADOR', 'ADMIN_CRM', 'GESTOR_COMERCIAL', 'COORDENADOR_CRM'];
const CRM_DASHBOARD_KEYS = ['crm.dashboard.visualizar', 'crm.relatorios.visualizar'];
const CRM_LEADS_VIEW_KEYS = [
  'crm.leads.visualizar',
  'crm.leads.criar',
  'crm.leads.exportar',
  'crm.leads.redistribuir'
];
const CRM_LEADS_WRITE_KEYS = ['crm.leads.criar'];
const CRM_LEADS_EXPORT_KEYS = ['crm.leads.exportar'];
const CRM_LEADS_REDISTRIBUTE_KEYS = ['crm.leads.redistribuir'];
const CRM_ATENDIMENTO_VIEW_KEYS = ['crm.atendimento.visualizar', 'crm.atendimento.enviar'];
const CRM_ATENDIMENTO_SEND_KEYS = ['crm.atendimento.enviar'];
const CRM_AUTOMACOES_VIEW_KEYS = ['crm.automacoes.visualizar', 'crm.automacoes.gerenciar'];
const CRM_AUTOMACOES_MANAGE_KEYS = ['crm.automacoes.gerenciar'];
const CRM_CONFIG_VIEW_KEYS = ['crm.configuracoes.visualizar', 'crm.configuracoes.gerenciar'];
const CRM_CONFIG_MANAGE_KEYS = ['crm.configuracoes.gerenciar'];
const CRM_PERMISSION_KEYS = [
  ...CRM_DASHBOARD_KEYS,
  ...CRM_LEADS_VIEW_KEYS,
  ...CRM_ATENDIMENTO_VIEW_KEYS,
  ...CRM_AUTOMACOES_VIEW_KEYS,
  ...CRM_CONFIG_VIEW_KEYS
];

export function canAccessCrm(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_PERMISSION_KEYS);
  }
  const perfil = normalizeToken(user?.perfil || '');
  return CRM_PERFIS.includes(perfil);
}

export function canViewCrmDashboard(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_DASHBOARD_KEYS);
  }
  return canAccessCrm(user);
}

export function canViewCrmLeads(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_LEADS_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

export function canCreateCrmLeads(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_LEADS_WRITE_KEYS);
  }
  return canAccessCrm(user);
}

export function canExportCrmLeads(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_LEADS_EXPORT_KEYS);
  }
  const perfil = normalizeToken(user?.perfil || '');
  return CRM_PERFIS_EXPORT.includes(perfil);
}

export function canRedistributeCrmLeads(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_LEADS_REDISTRIBUTE_KEYS);
  }
  const perfil = normalizeToken(user?.perfil || '');
  return CRM_PERFIS_REDISTRIBUTE.includes(perfil);
}

export function canViewCrmAtendimento(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_ATENDIMENTO_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

export function canSendCrmAtendimento(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_ATENDIMENTO_SEND_KEYS);
  }
  return canAccessCrm(user);
}

export function canViewCrmAutomacoes(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_AUTOMACOES_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

export function canManageCrmAutomacoes(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_AUTOMACOES_MANAGE_KEYS);
  }
  return canAccessCrm(user);
}

export function canViewCrmConfiguracoes(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_CONFIG_VIEW_KEYS);
  }
  return canAccessCrm(user);
}

export function canManageCrmConfiguracoes(user) {
  if (!hasEnabledModule(user, 'CRM')) return false;
  if (isBusinessAdmin(user)) return true;
  if (hasConfiguredAreaPermissions(user)) {
    return hasAnyPermissao(user, CRM_CONFIG_MANAGE_KEYS);
  }
  return canAccessCrm(user);
}

/**
 * Verifica se o usuário tem uma permissão de área específica.
 *
 * SUPERADMIN e ADMINISTRADOR têm bypass total (retorna sempre true).
 * Usuários sem nenhuma permissão configurada têm acesso completo (backwards compat).
 * Usuários COM permissões configuradas: somente as chaves listadas são concedidas.
 *
 * @param {object} user - Objeto do usuário da sessão
 * @param {string} permKey - Chave no formato "modulo.area.acao" (ex: "financeiro.titulos.criar")
 */
export function hasPermissao(user, permKey) {
  if (isBusinessAdmin(user)) return true;
  const lista = user?.areas_permissoes;
  // Sem configuração = acesso completo (compatibilidade com instalações existentes)
  if (!Array.isArray(lista) || lista.length === 0) return true;
  return lista.includes(String(permKey).toLowerCase());
}

export function hasConfiguredAreaPermissions(user) {
  const lista = user?.areas_permissoes;
  return Array.isArray(lista) && lista.length > 0;
}

export function hasAnyPermissao(user, permKeys = []) {
  return (Array.isArray(permKeys) ? permKeys : []).some((permKey) => hasPermissao(user, permKey));
}

export function hasAnyExplicitPermissao(user, permKeys = []) {
  if (isBusinessAdmin(user)) return true;
  if (!hasConfiguredAreaPermissions(user)) return false;
  return hasAnyPermissao(user, permKeys);
}
