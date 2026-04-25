import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AppRouteFallback from '../components/AppRouteFallback';
import NotificacoesBell from '../components/NotificacoesBell';
import { getResumoConversas } from '../services/conversasInternas';
import { getInstalacaoPublica } from '../services/instalacao';
import {
  HiOutlineSquares2X2,
  HiOutlinePlusCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloudArrowUp,
  HiOutlineReceiptRefund,
  HiOutlineUsers,
  HiOutlineRectangleGroup,
  HiOutlineUserCircle,
  HiOutlineWallet,
  HiOutlineBuildingOffice2,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineCog6Tooth,
  HiOutlineBanknotes,
  HiOutlineFolderOpen,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineArchiveBox,
  HiOutlineDocumentText,
  HiOutlineInboxStack,
  HiOutlinePaperAirplane
} from 'react-icons/hi2';
import { BsBuildingsFill } from 'react-icons/bs';
import {
  canAccessBiblioteca,
  canAccessBoletos,
  canAccessComercial,
  canAccessCadastroObras,
  canAccessComunicacao,
  canAccessCompras,
  canAccessContratos,
  canAccessFinanceiro,
  canAccessProvisoes,
  canAccessPrioridadesDiretoria,
  canAccessRhDp,
  canAccessRhDpDashboard,
  canAccessRhDpEmpresas,
  canCreateProvisionamentos,
  canExecuteRhDpImportacoes,
  canManageProvisionamentoCategorias,
  canViewIntegracaoSienge,
  canViewProvisionamentos,
  canViewProvisionamentosDashboard,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  canAccessCrm,
  canCreateCrmLeads,
  canManageUsers,
  canViewCrmAtendimento,
  canViewCrmAutomacoes,
  canViewCrmConfiguracoes,
  canViewCrmDashboard,
  canViewCrmLeads,
  canCreateComprasPedidos,
  canManageComprasCotacoes,
  canViewComprasCotacoes,
  canViewComprasPedidos,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  hasEnabledModule,
  isBusinessAdmin,
  isSuperadmin
} from '../utils/acessoProduto';
import { isNativeApp, registerNativeBackButtonHandler } from '../mobile/runtime';

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [inboxNovasCount, setInboxNovasCount] = useState(0);
  const [saidaNovasCount, setSaidaNovasCount] = useState(0);
  const [comunicacaoNovasCount, setComunicacaoNovasCount] = useState(0);
  const [instalacao, setInstalacao] = useState({
    product_name: 'Fluxy',
    company_name: '',
    logo_url: ''
  });
  const nativeApp = isNativeApp();

  const sidebarWidth = isMobileViewport ? 292 : (collapsed ? 76 : 236);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);

    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      document.body.style.overflow = '';
      return undefined;
    }

    document.body.style.overflow = menuAberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto, isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport) setMenuAberto(false);
  }, [location.pathname, isMobileViewport]);

  useEffect(() => {
    return registerNativeBackButtonHandler({
      canCloseMenu: () => menuAberto,
      onCloseMenu: () => setMenuAberto(false),
      canNavigateBack: () => location.pathname !== '/',
      onNavigateBack: () => navigate(-1)
    });
  }, [location.pathname, menuAberto, navigate]);

  useEffect(() => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      setInboxNovasCount(0);
      setSaidaNovasCount(0);
      setComunicacaoNovasCount(0);
      return undefined;
    }

    let ativo = true;

    const atualizarBadge = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      try {
        const resumo = await getResumoConversas();
        if (!ativo) return;
        const naoLidas = Number(resumo?.nao_lidas || 0);
        setComunicacaoNovasCount(naoLidas);
        setInboxNovasCount(naoLidas);
        setSaidaNovasCount(0);
      } catch {
        // sem bloqueio visual em caso de falha temporaria
      }
    };

    atualizarBadge();
    const interval = setInterval(atualizarBadge, 60000);

    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    let ativo = true;

    getInstalacaoPublica()
      .then((data) => {
        if (!ativo || !data) return;
        setInstalacao((current) => ({
          ...current,
          ...data
        }));
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const superadmin = isSuperadmin(user);
  const businessAdmin = isBusinessAdmin(user);
  const gestaoUsuarios = canManageUsers(user);
  const moduloBibliotecaHabilitado = hasEnabledModule(user, 'BIBLIOTECA_MODELOS');
  const moduloCotacoesHabilitado = hasEnabledModule(user, 'COTACOES');
  const crmAccess = canAccessCrm(user);
  const crmDashboardAccess = canViewCrmDashboard(user);
  const crmLeadsAccess = canViewCrmLeads(user);
  const crmLeadsCreateAccess = canCreateCrmLeads(user);
  const crmAtendimentoAccess = canViewCrmAtendimento(user);
  const crmAutomacoesAccess = canViewCrmAutomacoes(user);
  const crmConfiguracoesAccess = canViewCrmConfiguracoes(user);
  const comprasAccess = canAccessCompras(user);
  const comprasPedidosAccess = canViewComprasPedidos(user);
  const comprasPedidosCreateAccess = canCreateComprasPedidos(user);
  const comprasCotacoesAccess = canViewComprasCotacoes(user);
  const comprasCotacoesManageAccess = canManageComprasCotacoes(user);
  const prioridadesDiretoriaAccess = canAccessPrioridadesDiretoria(user);
  const financeiroAccess = canAccessFinanceiro(user);
  const boletosAccess = canAccessBoletos(user);
  const financeiroModuleEnabled = hasEnabledModule(user, 'FINANCEIRO');
  const comercialAccess = canAccessComercial(user);
  const comercialEmpreendimentosAccess = canViewComercialEmpreendimentos(user);
  const comercialContratosAccess = canViewComercialContratos(user);
  const provisoesAccess = canAccessProvisoes(user);
  const provisoesDashboardAccess = canViewProvisionamentosDashboard(user);
  const provisoesListaAccess = canViewProvisionamentos(user);
  const provisoesCreateAccess = canCreateProvisionamentos(user);
  const provisoesCategoriasAccess = canManageProvisionamentoCategorias(user);
  const rhDpAccess = canAccessRhDp(user);
  const rhDpDashboardAccess = canAccessRhDpDashboard(user);
  const rhDpEmpresasAccess = canAccessRhDpEmpresas(user);
  const rhDpColaboradoresAccess = canViewRhDpColaboradores(user);
  const rhDpDocumentosAccess = canViewRhDpDocumentos(user);
  const rhDpImportacoesAccess = canExecuteRhDpImportacoes(user);
  const rhDpApuracaoAccess = canViewRhDpApuracao(user);
  const rhDpObrigacoesAccess = canViewRhDpObrigacoes(user) && financeiroModuleEnabled;
  const integracaoSiengeAccess = canViewIntegracaoSienge(user);
  const obrasAccess = canAccessCadastroObras(user);
  const contratosAccess = canAccessContratos(user);
  const bibliotecaAccess = canAccessBiblioteca(user);
  const comunicacaoAccess = canAccessComunicacao(user);
  const brandLabel = instalacao.product_name || 'Fluxy';
  const brandAlt = instalacao.company_name || brandLabel;
  const brandInitial = String(brandLabel || 'F').trim().charAt(0).toUpperCase() || 'F';

  const menuGroups = useMemo(() => {
    const groups = [];
    const item = (to, label, icon) => ({ to, label, icon });
    const groupIcons = {
      Painel: HiOutlineSquares2X2,
      Solicitacoes: HiOutlineClipboardDocumentList,
      Comunicacao: HiOutlineChatBubbleLeftRight,
      Compras: HiOutlineWallet,
      Financeiro: HiOutlineWallet,
      CRM: HiOutlineUsers,
      Comercial: HiOutlineBuildingOffice2,
      Provisionamento: HiOutlineBanknotes,
      'RH/DP': HiOutlineUsers,
      Integracoes: HiOutlineAdjustmentsHorizontal,
      Relatorios: HiOutlineDocumentText,
      Cadastros: HiOutlineRectangleGroup,
      Contratos: HiOutlineBanknotes,
      Configuracoes: HiOutlineCog6Tooth,
      Biblioteca: HiOutlineFolderOpen,
      Conta: HiOutlineUserCircle
    };

    const addGroup = (label, entries) => {
      const items = entries.filter(Boolean);
      if (items.length) {
        groups.push({ label, icon: groupIcons[label] || HiOutlineFolderOpen, items });
      }
    };

    const perfil = String(user?.perfil || '').toUpperCase();
    const canSeeDashboard = businessAdmin || financeiroAccess || perfil === 'ADMIN';
    const solicitacoesLabel =
      perfil === 'USUARIO'
        ? 'Minhas Solicitacoes'
        : ['SETOR', 'FINANCEIRO'].includes(perfil)
          ? 'Solicitacoes do Setor'
          : 'Solicitacoes';

    if (canSeeDashboard) {
      addGroup('Painel', [
        item('/', 'Dashboard', HiOutlineSquares2X2)
      ]);
    }

    addGroup('Solicitacoes', [
      item('/solicitacoes', solicitacoesLabel, HiOutlineDocumentText),
      item('/solicitacoes-arquivadas', 'Arquivadas', HiOutlineArchiveBox),
      prioridadesDiretoriaAccess ? item('/prioridades-diretoria', 'Prioridades Diretoria', HiOutlineBanknotes) : null,
      perfil !== 'SETOR' && perfil !== 'FINANCEIRO'
        ? item('/nova-solicitacao', 'Nova Solicitacao', HiOutlinePlusCircle)
        : null
    ]);

    if (comunicacaoAccess) {
      addGroup('Comunicacao', [
        item('/comunicacao-interna', 'Comunicacao Interna', HiOutlineChatBubbleLeftRight)
      ]);
    }

    if (bibliotecaAccess) {
      addGroup('Biblioteca', [
        item('/arquivos-modelos', 'Arquivos Modelos', HiOutlineFolderOpen)
      ]);
    }

    if (comprasAccess) {
      addGroup('Compras', [
        item('/solicitacoes-compra', 'Solicitacoes de Compra', HiOutlineClipboardDocumentList),
        comprasPedidosCreateAccess ? item('/solicitacoes-compra/nova', 'Nova Solicitacao de Compra', HiOutlinePlusCircle) : null,
        comprasPedidosAccess ? item('/pedidos-compra', 'Pedidos de Compra', HiOutlineDocumentText) : null,
        businessAdmin ? item('/gestao-insumos', 'Gestao de Insumos', HiOutlineRectangleGroup) : null,
        businessAdmin ? item('/gestao-unidades', 'Gestao de Unidades', HiOutlineBuildingOffice2) : null,
        businessAdmin ? item('/gestao-categorias', 'Gestao de Categorias', HiOutlineFolderOpen) : null
      ]);
    }

    if (moduloCotacoesHabilitado && comprasCotacoesAccess) {
      addGroup('Cotacoes', [
        item('/cotacoes', 'Cotacoes', HiOutlineInboxStack),
        comprasCotacoesManageAccess ? item('/cotacoes/nova', 'Nova Cotacao Avulsa', HiOutlinePlusCircle) : null,
        comprasCotacoesManageAccess ? item('/gestao-fornecedores', 'Fornecedores', HiOutlineUsers) : null
      ]);
    }

    if (financeiroAccess || boletosAccess) {
      addGroup('Financeiro', [
        financeiroAccess ? item('/financeiro/titulos', 'Titulos Financeiros', HiOutlineWallet) : null,
        boletosAccess ? item('/financeiro/boletos', 'Boletos', HiOutlineDocumentText) : null,
        financeiroAccess ? item('/financeiro/relatorios', 'Relatorios Financeiros', HiOutlineDocumentText) : null,
        financeiroAccess ? item('/financeiro/conciliacao', 'Conciliacao OFX', HiOutlineBanknotes) : null,
        financeiroAccess ? item('/financeiro/cadastros', 'Cadastros Financeiros', HiOutlineRectangleGroup) : null,
        financeiroAccess ? item('/comprovantes/upload', 'Upload Comprovantes', HiOutlineCloudArrowUp) : null,
        financeiroAccess ? item('/comprovantes/pendentes', 'Comprovantes Pendentes', HiOutlineReceiptRefund) : null
      ]);
    }

    if (crmAccess) {
      addGroup('CRM', [
        crmDashboardAccess ? item('/crm/dashboard', 'Dashboard', HiOutlineSquares2X2) : null,
        crmDashboardAccess ? item('/crm/dashboard-gerencial', 'Gerencial', HiOutlineSquares2X2) : null,
        crmDashboardAccess ? item('/crm/dashboard-sla', 'SLA', HiOutlineClipboardDocumentList) : null,
        crmDashboardAccess ? item('/crm/dashboard-distribuicao', 'Distribuicao', HiOutlineAdjustmentsHorizontal) : null,
        crmAtendimentoAccess ? item('/crm/inbox', 'Inbox', HiOutlineChatBubbleLeftRight) : null,
        crmLeadsAccess ? item('/crm/leads', 'Leads', HiOutlineUsers) : null,
        crmLeadsAccess ? item('/crm/carteira', 'Minha Carteira', HiOutlineUsers) : null,
        crmLeadsCreateAccess ? item('/crm/leads/novo', 'Novo Lead', HiOutlinePlusCircle) : null,
        crmLeadsAccess ? item('/crm/kanban', 'Kanban', HiOutlineSquares2X2) : null,
        crmLeadsAccess ? item('/crm/tarefas', 'Tarefas', HiOutlineClipboardDocumentList) : null,
        crmAutomacoesAccess ? item('/crm/automacoes', 'Automacoes', HiOutlineAdjustmentsHorizontal) : null,
        crmConfiguracoesAccess ? item('/crm/admin/canais', 'Canais', HiOutlineCog6Tooth) : null,
        crmConfiguracoesAccess ? item('/crm/admin/numeros', 'Numeros', HiOutlinePaperAirplane) : null,
        crmConfiguracoesAccess ? item('/crm/admin/integracoes', 'Integracoes', HiOutlineAdjustmentsHorizontal) : null
      ]);
    }

    if (comercialAccess) {
      addGroup('Comercial', [
        comercialEmpreendimentosAccess ? item('/comercial/empreendimentos', 'Empreendimentos', HiOutlineBuildingOffice2) : null,
        comercialEmpreendimentosAccess ? item('/comercial/unidades', 'Unidades', HiOutlineRectangleGroup) : null,
        comercialEmpreendimentosAccess ? item('/comercial/mapa-unidades', 'Mapa de Unidades', HiOutlineSquares2X2) : null,
        comercialEmpreendimentosAccess ? item('/comercial/tabelas-preco', 'Tabelas de Preco', HiOutlineDocumentText) : null,
        comercialContratosAccess ? item('/comercial/contratos', 'Contratos de Venda', HiOutlineBanknotes) : null
      ]);
    }

    if (provisoesAccess) {
      addGroup('Provisionamento', [
        provisoesDashboardAccess ? item('/provisoes-financeiras/dashboard', 'Dashboard de Previsao', HiOutlineSquares2X2) : null,
        provisoesListaAccess ? item('/provisoes-financeiras', 'Provisionamentos', HiOutlineBanknotes) : null,
        provisoesCreateAccess ? item('/provisoes-financeiras/nova', 'Nova Provisao', HiOutlinePlusCircle) : null,
        provisoesCategoriasAccess ? item('/provisoes-financeiras/categorias', 'Categorias Macro', HiOutlineFolderOpen) : null
      ]);
    }

    if (rhDpAccess) {
      addGroup('RH/DP', [
        rhDpDashboardAccess ? item('/rh-dp', 'Visao do Modulo', HiOutlineUsers) : null,
        rhDpEmpresasAccess ? item('/rh-dp/empresas', 'Empresas do Grupo', HiOutlineBuildingOffice2) : null,
        rhDpColaboradoresAccess ? item('/rh-dp/colaboradores', 'Colaboradores', HiOutlineUsers) : null,
        rhDpDocumentosAccess ? item('/rh-dp/documentos', 'Documentos', HiOutlineFolderOpen) : null,
        rhDpImportacoesAccess ? item('/rh-dp/importacoes', 'Importacoes', HiOutlineCloudArrowUp) : null,
        rhDpApuracaoAccess ? item('/rh-dp/apuracao', 'Apuracao', HiOutlineDocumentText) : null,
        rhDpObrigacoesAccess ? item('/rh-dp/fechamentos', 'Fechamentos', HiOutlineBanknotes) : null
      ]);
    }

    if (integracaoSiengeAccess) {
      addGroup('Integracoes', [
        item('/integracao-sienge', 'SIENGE', HiOutlineAdjustmentsHorizontal)
      ]);
    }

    if (businessAdmin && comprasAccess) {
      addGroup('Relatorios', [
        item('/relatorios/administrativos', 'Auditoria de Compras', HiOutlineDocumentText)
      ]);
    }

    if (gestaoUsuarios || businessAdmin) {
      addGroup('Cadastros', [
        gestaoUsuarios ? item('/usuarios', 'Usuarios', HiOutlineUsers) : null,
        businessAdmin && obrasAccess ? item('/obras', 'Obras', HiOutlineBuildingOffice2) : null,
        businessAdmin && obrasAccess ? item('/gestao-apropriacoes', 'Gestao de Apropriacoes', HiOutlineAdjustmentsHorizontal) : null,
        businessAdmin ? item('/setores', 'Setores', HiOutlineAdjustmentsHorizontal) : null,
        businessAdmin ? item('/tipos-solicitacao', 'Tipos de Solicitacao', HiOutlineClipboardDocumentList) : null,
        businessAdmin ? item('/parceiros', 'Cadastro de Pessoas', HiOutlineUsers) : null,
        businessAdmin ? item('/parceiros-categorias', 'Categorias de Parceiro', HiOutlineArchiveBox) : null
      ]);
    }

    if (contratosAccess) {
      addGroup('Contratos', [
        item('/gestao-contratos', 'Gestao de Contratos', HiOutlineBanknotes)
      ]);
    }

    if (businessAdmin) {
      addGroup('Configuracoes', [
        item('/configuracoes', 'Configuracoes', HiOutlineCog6Tooth),
        item('/aprovacao-diretoria', 'Aprovacao Diretoria', HiOutlineAdjustmentsHorizontal),
        item('/usuarios-envio-qualquer-setor', 'Envio Livre por Usuario', HiOutlineUsers),
        item('/tipos-compartilhados-setor', 'Tipos Compartilhados', HiOutlineClipboardDocumentList),
        item('/automacao-status-setor', 'Automacao por Status', HiOutlinePaperAirplane),
        comprasAccess ? item('/configuracoes-cotacao', 'Config. Cotacoes', HiOutlineAdjustmentsHorizontal) : null,
        comprasAccess ? item('/configuracoes-status-pedidos-compra', 'Status dos Pedidos', HiOutlineClipboardDocumentList) : null,
        superadmin && comercialAccess ? item('/configuracoes-comercial-categorias', 'Categorias Comerciais', HiOutlineArchiveBox) : null,
        superadmin ? item('/configuracoes-modulos', 'Modulos e Planos', HiOutlineCog6Tooth) : null,
        superadmin && moduloBibliotecaHabilitado ? item('/arquivos-modelos-config', 'Arquivos Modelos', HiOutlineFolderOpen) : null
      ]);
    }

    addGroup('Conta', [
      item('/perfil', 'Meu Perfil', HiOutlineUserCircle)
    ]);

    return groups;
  }, [
    user?.perfil,
    businessAdmin,
    bibliotecaAccess,
    comercialAccess,
    comercialContratosAccess,
    comercialEmpreendimentosAccess,
    comunicacaoAccess,
    comprasAccess,
    comprasCotacoesAccess,
    comprasCotacoesManageAccess,
    comprasPedidosAccess,
    comprasPedidosCreateAccess,
    contratosAccess,
    crmAccess,
    crmAtendimentoAccess,
    crmAutomacoesAccess,
    crmConfiguracoesAccess,
    crmDashboardAccess,
    crmLeadsAccess,
    crmLeadsCreateAccess,
    financeiroAccess,
    boletosAccess,
    financeiroModuleEnabled,
    gestaoUsuarios,
    integracaoSiengeAccess,
    moduloBibliotecaHabilitado,
    moduloCotacoesHabilitado,
    obrasAccess,
    prioridadesDiretoriaAccess,
    provisoesAccess,
    provisoesCategoriasAccess,
    provisoesCreateAccess,
    provisoesDashboardAccess,
    provisoesListaAccess,
    rhDpApuracaoAccess,
    rhDpAccess,
    rhDpColaboradoresAccess,
    rhDpDashboardAccess,
    rhDpDocumentosAccess,
    rhDpEmpresasAccess,
    rhDpImportacoesAccess,
    rhDpObrigacoesAccess,
    comercialAccess,
    superadmin
  ]);

  const flatMenuItems = useMemo(
    () => menuGroups.flatMap(group => group.items),
    [menuGroups]
  );

  useEffect(() => {
    setExpandedGroups(prev => {
      const validLabels = new Set(menuGroups.map(group => group.label));
      const filtered = prev.filter(label => validLabels.has(label));
      const activeGroup = menuGroups.find(group =>
        group.items.some(item => isPathActive(location.pathname, item.to))
      )?.label;

      if (filtered.length === 0) {
        if (activeGroup) return [activeGroup];
        return menuGroups.length > 0 ? [menuGroups[0].label] : [];
      }

      if (activeGroup && !filtered.includes(activeGroup)) {
        return [...filtered, activeGroup];
      }

      return filtered;
    });
  }, [menuGroups, location.pathname]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const isActive = path => isPathActive(location.pathname, path);
  const toggleGroup = (label) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className={`layout-shell flex min-h-screen overflow-x-hidden ${nativeApp ? 'layout-shell-native' : ''}`}>
        <aside
          className={`sidebar ${collapsed ? 'collapsed' : ''} fixed md:static top-0 left-0 h-full md:h-auto z-40 transform transition-all duration-200 ${
            menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          style={{ width: `${sidebarWidth}px`, transition: 'width 0.25s ease' }}
          role="navigation"
          aria-label="Menu lateral"
        >
          <div className="flex flex-col h-full px-3 md:px-4 py-3 md:py-4 gap-3">
            <div className={`brand ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {instalacao.logo_url ? (
                <img
                  src={instalacao.logo_url}
                  alt={brandAlt}
                  className="h-7 w-auto"
                />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {brandInitial}
                </div>
              )}
              <div className="flex items-center gap-2 brand-text">
                <div className="leading-tight">
                  <p className="brand-title inline-flex items-center gap-1.5">
                    <BsBuildingsFill size={14} />
                    <span>{brandLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuAberto(false)}
                  className="chevron-btn md:hidden"
                  aria-label="Fechar menu"
                  type="button"
                >
                  <HiOutlineBars3 size={22} />
                </button>
              </div>
            </div>

            {!collapsed && (
              <div className="user-block mt-1 mb-2">
                <span className="font-semibold" style={{ color: 'var(--nav-text)' }}>{user?.nome}</span>
                <span className="user-role">{perfilUpper || 'USUARIO'}</span>
              </div>
            )}

            <nav className="flex-1">
              {collapsed ? (
                <ul className="nav-list">
                  {flatMenuItems.map(item => (
                    <MenuItem
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      active={isActive(item.to)}
                              onSelect={() => {
                                navigate(item.to);
                                if (isMobileViewport) setMenuAberto(false);
                              }}
                              collapsed={collapsed}
                              inboxNovasCount={inboxNovasCount}
                              saidaNovasCount={saidaNovasCount}
                            />
                          ))}
                </ul>
              ) : (
                <ul className="nav-list nav-list-grouped">
                  {menuGroups.map(group => {
                    const isOpen = expandedGroups.includes(group.label);
                    const groupId = `submenu-${String(group.label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    const GroupIcon = group.icon;

                    return (
                      <li key={group.label} className="nav-group">
                        <button
                          type="button"
                          className={`nav-group-toggle ${isOpen ? 'open' : ''}`}
                          onClick={() => toggleGroup(group.label)}
                          aria-expanded={isOpen}
                          aria-controls={groupId}
                        >
                          <span className="nav-group-heading">
                            {GroupIcon && <GroupIcon className="nav-group-icon" />}
                            <span className="nav-group-title">{group.label}</span>
                            {group.label === 'Comunicacao' && (inboxNovasCount + saidaNovasCount) > 0 && (
                              <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-semibold bg-red-600 text-white">
                                {(inboxNovasCount + saidaNovasCount) > 99 ? '99+' : (inboxNovasCount + saidaNovasCount)}
                              </span>
                            )}
                          </span>
                          {isOpen ? (
                            <HiOutlineChevronDown className="nav-group-chevron" />
                          ) : (
                            <HiOutlineChevronRight className="nav-group-chevron" />
                          )}
                        </button>
                        <div
                          id={groupId}
                          className={`nav-sublist-wrap ${isOpen ? 'open' : ''}`}
                        >
                          <ul className="nav-sublist">
                            {group.items.map(item => (
                              <MenuItem
                                key={item.to}
                                to={item.to}
                                label={item.label}
                                icon={item.icon}
                                active={isActive(item.to)}
                                onSelect={() => {
                                  navigate(item.to);
                                  if (isMobileViewport) setMenuAberto(false);
                                }}
                                collapsed={false}
                                subItem
                                inboxNovasCount={comunicacaoNovasCount}
                                saidaNovasCount={0}
                              />
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>

            <div className="flex flex-col gap-3">
              <button
                onClick={logout}
                className="nav-btn text-blue-300 hover:text-white"
                type="button"
              >
                <HiOutlineArrowRightOnRectangle className="nav-icon" />
                {!collapsed && 'Sair'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="sidebar-toggle-rail hidden md:inline-flex"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            type="button"
          >
            <HiOutlineChevronLeft
              className={`sidebar-toggle-icon ${collapsed ? 'is-collapsed' : ''}`}
            />
          </button>
        </aside>

        {menuAberto && (
          <div
            className="fixed inset-0 bg-black/30 md:hidden z-30"
            onClick={() => setMenuAberto(false)}
            aria-hidden="true"
          />
        )}

        <main className={`layout-main flex-1 min-w-0 bg-[var(--c-bg)] transition-colors duration-200 ${nativeApp ? 'layout-main-native' : ''}`}>
          <div className="mx-auto w-full max-w-none px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 pb-6 md:pb-9">
            <div className={`topbar-shell flex flex-wrap items-center justify-between gap-4 md:gap-6 mb-5 md:mb-7 w-full py-4 md:py-5 min-h-[76px] ${nativeApp ? 'topbar-shell-native' : ''}`}>
              <button
                onClick={() => setMenuAberto(true)}
                className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text)]"
                aria-label="Abrir menu"
                type="button"
              >
                <HiOutlineBars3 size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="brand-title truncate inline-flex items-center gap-2" style={{ fontSize: '1.1rem' }}>
                  <BsBuildingsFill size={16} />
                  <span>{brandLabel}</span>
                </p>
                <p className="text-xs text-[var(--c-muted)] truncate">
                  {user?.nome} · {perfilUpper || 'USUARIO'}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="theme-toggle"
                  type="button"
                >
                  {theme === 'dark' ? (
                    <>
                      <HiOutlineSun size={18} /> <span className="hidden sm:inline">Claro</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineMoon size={18} /> <span className="hidden sm:inline">Escuro</span>
                    </>
                  )}
                </button>
                <NotificacoesBell />
              </div>
            </div>
            <Suspense fallback={<AppRouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function isPathActive(currentPath, targetPath) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function MenuItem({ to, label, icon: Icon, active, onSelect, collapsed, subItem = false, inboxNovasCount = 0, saidaNovasCount = 0 }) {
  const mostrarBadgeInbox = to === '/comunicacao-interna' || to === '/conversas/entrada';
  const mostrarBadgeSaida = to === '/conversas/saida';
  const inboxCount = Number(inboxNovasCount || 0);
  const saidaCount = Number(saidaNovasCount || 0);
  return (
    <li>
      <Link
        to={to}
        onClick={() => onSelect()}
        className={`nav-btn ${subItem ? 'nav-btn-sub' : ''} ${active ? 'active' : ''}`}
        title={label}
        aria-label={label}
      >
        {Icon && <Icon className="nav-icon" />}
        {!collapsed && <span>{label}</span>}
        {!collapsed && mostrarBadgeInbox && inboxCount > 0 && (
          <span className="ml-auto inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-semibold bg-red-600 text-white">
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}
        {!collapsed && mostrarBadgeSaida && saidaCount > 0 && (
          <span className="ml-auto inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-semibold bg-red-600 text-white">
            {saidaCount > 99 ? '99+' : saidaCount}
          </span>
        )}
      </Link>
    </li>
  );
}
