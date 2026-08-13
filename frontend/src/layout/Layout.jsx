import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AppRouteFallback from '../components/AppRouteFallback';
import NotificacoesBell from '../components/NotificacoesBell';
import fluxyMark from '../assets/fluxy_mark_cropped.png';
import { getResumoConversas } from '../services/conversasInternas';
import { getInstalacaoPublica } from '../services/instalacao';
import { getSuporteWhatsapp } from '../services/configuracoesSistema';
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
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
  HiOutlineClipboardDocumentCheck,
  HiOutlineInboxStack,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineKey,
  HiOutlineCreditCard,
  HiOutlineLifebuoy,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineBell,
  HiOutlineAcademicCap
} from 'react-icons/hi2';
import {
  canAccessBiblioteca,
  canAccessBoletos,
  canAccessComercial,
  canAccessCadastroObras,
  canAccessComunicacao,
  canAccessConfiguracoes,
  canAccessCompras,
  canAccessDashboard,
  canAccessContratos,
  canAccessFinanceiro,
  canAccessBancosEnterprise,
  canAccessFiscal,
  canAccessPagamentos,
  canAccessProvisoes,
  canAccessPrioridadesDiretoria,
  canAccessRhDp,
  canAccessRhDpDashboard,
  canAccessRhDpEmpresas,
  canAccessSst,
  canAccessTreinamento,
  canCreateProvisionamentos,
  canExecuteRhDpImportacoes,
  canManageProvisionamentoCategorias,
  canManageSstArea,
  canViewProvisionamentos,
  canViewProvisionamentosDashboard,
  canViewFinanceiroRelatorios,
  hasPermissao,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  canViewSolicitacoesRelatorios,
  canViewSstArea,
  canViewSstDashboard,
  canAccessCrm,
  canCreateCrmLeads,
  canManageFiscalConfig,
  canManageUsers,
  canViewCrmAtendimento,
  canViewCrmAutomacoes,
  canViewCrmConfiguracoes,
  canViewCrmDashboard,
  canViewCrmLeads,
  canViewFiscalDocuments,
  canViewFiscalLogs,
  canViewSystemGovernance,
  canViewOperationalAudit,
  canCreateCompraSolicitacao,
  canManageComprasConfiguracoes,
  canManageComprasCotacoes,
  canManageConfiguracoesArea,
  canViewCompraSolicitacoes,
  canViewComprasCotacoes,
  canViewComprasDelegacao,
  canViewComprasFornecedores,
  canViewComprasPedidos,
  canViewComprasRelatorios,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  hasEnabledModule,
  isBusinessAdmin,
  isSuperadmin
} from '../utils/acessoProduto';
import {
  SST_NAV,
  SST_SIMPLIFIED_MODE
} from '../modules/sst/constants/sstResources';
import { canAccessCustosRecebiveis } from '../modules/custosRecebiveis/utils/access';
import { isNativeApp, registerNativeBackButtonHandler } from '../mobile/runtime';
import { getFallbackRoute, hasSafeBrowserHistory } from '../utils/navigation';
import OperationalAuditTracker from '../modules/governanca/components/OperationalAuditTracker';

const SST_SIMPLIFIED_ICONS = {
  pgr: HiOutlineExclamationTriangle,
  pcmso: HiOutlineClipboardDocumentCheck,
  aso: HiOutlineClipboardDocumentCheck,
  exames: HiOutlineDocumentText,
  epi: HiOutlineShieldCheck,
  treinamentos: HiOutlineUsers,
  documentos: HiOutlineFolderOpen,
  ltcat: HiOutlineBuildingOffice2,
  avaliacoes_quantitativas: HiOutlineAdjustmentsHorizontal
};

const COMPRAS_RESPONSIVE_ROUTES = [
  '/solicitacoes-compra',
  '/solicitacoes-compra-direta',
  '/pedidos-compra',
  '/compras/delegacao',
  '/compras/relatorios',
  '/relatorios/administrativos',
  '/gestao-apropriacoes',
  '/gestao-insumos',
  '/gestao-unidades',
  '/gestao-categorias',
  '/gestao-fornecedores',
  '/cotacoes',
  '/configuracoes-cotacao',
  '/configuracoes-status-pedidos-compra'
];

function isComprasResponsiveRoute(pathname = '') {
  return COMPRAS_RESPONSIVE_ROUTES.some((route) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));
}

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroupId, setOpenGroupId] = useState(null);
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
  const [suporteWhatsappUrl, setSuporteWhatsappUrl] = useState(null);
  const nativeApp = isNativeApp();
  const comprasResponsiveRoute = isComprasResponsiveRoute(location.pathname);
  const custosRecebiveisResponsiveRoute = location.pathname.startsWith('/custos-recebiveis');

  const sidebarWidth = isMobileViewport ? 304 : (collapsed ? 86 : 286);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

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
    if (!menuAberto) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuAberto(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuAberto]);

  useEffect(() => {
    return registerNativeBackButtonHandler({
      canCloseMenu: () => menuAberto,
      onCloseMenu: () => setMenuAberto(false),
      canNavigateBack: () => location.pathname !== '/',
      onNavigateBack: () => {
        if (hasSafeBrowserHistory()) {
          navigate(-1);
          return;
        }
        navigate(getFallbackRoute(location.pathname), { replace: true });
      }
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
        // nao bloqueia a navegacao
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

  useEffect(() => {
    let ativo = true;

    getSuporteWhatsapp()
      .then((data) => {
        if (!ativo) return;
        setSuporteWhatsappUrl(data?.url || null);
      })
      .catch(() => {
        if (ativo) setSuporteWhatsappUrl(null);
      });

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
  const comprasSolicitacoesAccess = canViewCompraSolicitacoes(user);
  const comprasSolicitacoesCreateAccess = canCreateCompraSolicitacao(user);
  const comprasPedidosAccess = canViewComprasPedidos(user);
  const comprasDelegacaoAccess = canViewComprasDelegacao(user);
  const comprasCotacoesAccess = canViewComprasCotacoes(user);
  const comprasCotacoesManageAccess = canManageComprasCotacoes(user);
  const comprasFornecedoresAccess = canViewComprasFornecedores(user);
  const comprasRelatoriosAccess = canViewComprasRelatorios(user);
  const comprasConfiguracoesAccess = canManageComprasConfiguracoes(user);
  const configuracoesAccess = canAccessConfiguracoes(user);
  const configuracoesGeralAccess = canManageConfiguracoesArea(user, 'geral');
  const configuracoesCadastrosAccess = canManageConfiguracoesArea(user, 'cadastros');
  const configuracoesStatusVinculosAccess = canManageConfiguracoesArea(user, 'status_vinculos');
  const configuracoesAparenciaAccess = canManageConfiguracoesArea(user, 'aparencia');
  const configuracoesModulosAccess = canManageConfiguracoesArea(user, 'modulos');
  const prioridadesDiretoriaAccess = canAccessPrioridadesDiretoria(user);
  const solicitacoesRelatoriosAccess = canViewSolicitacoesRelatorios(user);
  const financeiroAccess = canAccessFinanceiro(user);
  const financeiroRelatoriosAccess = canViewFinanceiroRelatorios(user);
  const bancosEnterpriseAccess = canAccessBancosEnterprise(user);
  const fiscalAccess = canAccessFiscal(user);
  const fiscalConfigAccess = canManageFiscalConfig(user);
  const fiscalDocumentsAccess = canViewFiscalDocuments(user);
  const fiscalLogsAccess = canViewFiscalLogs(user);
  const pagamentosAccess = canAccessPagamentos(user);
  const boletosAccess = canAccessBoletos(user);
  const financeiroModuleEnabled = hasEnabledModule(user, 'FINANCEIRO');
  const custosRecebiveisAccess = canAccessCustosRecebiveis(user);
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
  const sstAccess = canAccessSst(user);
  const sstDashboardAccess = canViewSstDashboard(user);
  const governancaSistemaAccess = canViewSystemGovernance(user);
  const auditoriaOperacionalAccess = canViewOperationalAudit(user);
  const obrasAccess = canAccessCadastroObras(user);
  const contratosAccess = canAccessContratos(user);
  const bibliotecaAccess = canAccessBiblioteca(user);
  const treinamentoAccess = canAccessTreinamento(user);
  const comunicacaoAccess = canAccessComunicacao(user);
  const brandLabel = instalacao.product_name || 'Fluxy';
  const brandInitial = String(brandLabel || 'F').trim().charAt(0).toUpperCase() || 'F';
  const menuGroups = useMemo(() => {
    const groups = [];
    const item = (to, label, icon) => ({ to, label, icon });
    const groupIcons = {
      Painel: HiOutlineSquares2X2,
      Solicitações: HiOutlineClipboardDocumentList,
      Comunicação: HiOutlineChatBubbleLeftRight,
      Compras: HiOutlineWallet,
      Financeiro: HiOutlineWallet,
      'Custos e Recebíveis': HiOutlineBanknotes,
      Fiscal: HiOutlineDocumentText,
      CRM: HiOutlineUsers,
      Comercial: HiOutlineBuildingOffice2,
      Provisionamento: HiOutlineBanknotes,
      'RH/DP': HiOutlineUsers,
      SST: HiOutlineShieldCheck,
      Integrações: HiOutlineAdjustmentsHorizontal,
      Relatórios: HiOutlineDocumentText,
      Cadastros: HiOutlineRectangleGroup,
      Contratos: HiOutlineBanknotes,
      'Administração': HiOutlineShieldCheck,
      Configurações: HiOutlineCog6Tooth,
      Biblioteca: HiOutlineFolderOpen,
      Treinamento: HiOutlineAcademicCap,
      Cotações: HiOutlineInboxStack,
      Conta: HiOutlineUserCircle
    };

    const addGroup = (label, entries) => {
      const items = entries.filter(Boolean);
      if (items.length) {
        groups.push({ label, icon: groupIcons[label] || HiOutlineFolderOpen, items });
      }
    };

    const perfil = String(user?.perfil || '').toUpperCase();
    const canSeeDashboard = canAccessDashboard(user);
    const solicitacoesLabel =
      perfil === 'USUARIO'
        ? 'Minhas Solicitações'
        : ['SETOR', 'FINANCEIRO'].includes(perfil)
          ? 'Solicitações do Setor'
          : 'Solicitações';

    if (canSeeDashboard) {
      addGroup('Painel', [
        item('/', 'Dashboard', HiOutlineSquares2X2)
      ]);
    }

    addGroup('Solicitações', [
      item('/solicitacoes', solicitacoesLabel, HiOutlineDocumentText),
      solicitacoesRelatoriosAccess ? item('/solicitacoes/relatorios', 'Relatórios', HiOutlineDocumentText) : null,
      item('/solicitacoes-arquivadas', 'Arquivadas', HiOutlineArchiveBox),
      prioridadesDiretoriaAccess ? item('/prioridades-diretoria', 'Prioridades Diretoria', HiOutlineBanknotes) : null,
      perfil !== 'SETOR' && perfil !== 'FINANCEIRO'
        ? item('/nova-solicitacao', 'Nova Solicitacao', HiOutlinePlusCircle)
        : null
    ]);

    if (comunicacaoAccess) {
      addGroup('Comunicação', [
        item('/comunicacao-interna', 'Comunicação Interna', HiOutlineChatBubbleLeftRight)
      ]);
    }

    if (bibliotecaAccess) {
      addGroup('Biblioteca', [
        item('/arquivos-modelos', 'Arquivos Modelos', HiOutlineFolderOpen)
      ]);
    }

    if (treinamentoAccess) {
      addGroup('Treinamento', [
        item('/treinamento', 'Central de Treinamento', HiOutlineAcademicCap)
      ]);
    }

    if (comprasAccess) {
      addGroup('Compras', [
        comprasSolicitacoesAccess ? item('/solicitacoes-compra', 'Solicitações de Compra', HiOutlineClipboardDocumentList) : null,
        comprasSolicitacoesCreateAccess ? item('/solicitacoes-compra/nova', 'Nova Solicitacao de Compra', HiOutlinePlusCircle) : null,
        comprasPedidosAccess ? item('/pedidos-compra', 'Pedidos de Compra', HiOutlineDocumentText) : null,
        comprasDelegacaoAccess ? item('/compras/delegacao', 'Delegacao de Compras', HiOutlineUsers) : null,
        comprasRelatoriosAccess ? item('/compras/relatorios', 'Relatórios de Compras', HiOutlineDocumentText) : null,
        moduloCotacoesHabilitado && comprasCotacoesAccess ? item('/cotacoes', 'Cotações', HiOutlineInboxStack) : null,
        moduloCotacoesHabilitado && comprasFornecedoresAccess ? item('/gestao-fornecedores', 'Fornecedores', HiOutlineUsers) : null,
        moduloCotacoesHabilitado && comprasConfiguracoesAccess ? item('/configuracoes-cotacao', 'Config. Cotações', HiOutlineAdjustmentsHorizontal) : null,
        comprasConfiguracoesAccess ? item('/gestao-insumos', 'Gestão de Insumos', HiOutlineRectangleGroup) : null,
        comprasConfiguracoesAccess ? item('/gestao-unidades', 'Gestão de Unidades', HiOutlineBuildingOffice2) : null,
        comprasConfiguracoesAccess ? item('/gestao-categorias', 'Gestão de Categorias', HiOutlineFolderOpen) : null
      ]);
    }

    if (financeiroAccess || financeiroRelatoriosAccess || bancosEnterpriseAccess || pagamentosAccess || boletosAccess) {
      addGroup('Financeiro', [
        financeiroAccess ? item('/financeiro/contas-a-receber', 'Contas a Receber', HiOutlineWallet) : null,
        financeiroAccess ? item('/financeiro/contas-a-pagar', 'Contas a Pagar', HiOutlineWallet) : null,
        financeiroAccess && hasPermissao(user, 'financeiro.cheques.visualizar')
          ? item('/financeiro/cheques-terceiros', 'Cheques de Terceiros', HiOutlineCreditCard)
          : null,
        financeiroAccess && hasPermissao(user, 'financeiro.baixas_compostas.visualizar')
          ? item('/financeiro/baixas-compostas', 'Baixas com Multiplas Fontes', HiOutlineReceiptRefund)
          : null,
        bancosEnterpriseAccess ? item('/financeiro/bancos', 'Bancos Enterprise', HiOutlineBanknotes) : null,
        financeiroAccess ? item('/financeiro/financiamentos-bancarios', 'Financiamentos Bancarios', HiOutlineBanknotes) : null,
        pagamentosAccess ? item('/financeiro/pagamentos', 'Pagamentos em Massa', HiOutlinePaperAirplane) : null,
        boletosAccess ? item('/financeiro/boletos', 'Boletos', HiOutlineDocumentText) : null,
        financeiroAccess ? item('/financeiro/faturas-cartao', 'Faturas de Cartao', HiOutlineCreditCard) : null,
        financeiroRelatoriosAccess ? item('/financeiro/relatorios', 'Relatórios Financeiros', HiOutlineDocumentText) : null,
        financeiroAccess ? item('/financeiro/baixas', 'Baixas Realizadas', HiOutlineBanknotes) : null,
        financeiroAccess ? item('/financeiro/conciliacao', 'Conciliacao OFX', HiOutlineBanknotes) : null,
        financeiroAccess ? item('/financeiro/caixas', 'Caixas e Contas', HiOutlineBanknotes) : null,
        financeiroAccess ? item('/financeiro/cadastros', 'Cadastros Financeiros', HiOutlineRectangleGroup) : null,
        financeiroAccess ? item('/comprovantes/upload', 'Upload Comprovantes', HiOutlineCloudArrowUp) : null,
        financeiroAccess ? item('/comprovantes/pendentes', 'Comprovantes Pendentes', HiOutlineReceiptRefund) : null
      ]);
    }

    if (custosRecebiveisAccess) {
      addGroup('Custos e Recebíveis', [
        item('/custos-recebiveis', 'Custos e Recebíveis', HiOutlineBanknotes)
      ]);
    }

    if (fiscalAccess) {
      addGroup('Fiscal', [
        item('/fiscal', 'Painel Fiscal', HiOutlineSquares2X2),
        item('/fiscal/relatorios', 'Relatórios Fiscais', HiOutlineDocumentText),
        fiscalConfigAccess ? item('/fiscal/empresas', 'Empresas Fiscais', HiOutlineBuildingOffice2) : null,
        fiscalConfigAccess ? item('/fiscal/empresas#certificados', 'Certificados', HiOutlineKey) : null,
        fiscalConfigAccess ? item('/fiscal/diagnostico', 'Diagnostico', HiOutlineAdjustmentsHorizontal) : null,
        fiscalDocumentsAccess ? item('/fiscal/documentos', 'Documentos Fiscais', HiOutlineDocumentText) : null,
        fiscalDocumentsAccess ? item('/fiscal/divergencias', 'Divergencias', HiOutlineExclamationTriangle) : null,
        fiscalDocumentsAccess ? item('/fiscal/exportacao-contabil', 'Exportacao Contabil', HiOutlineFolderOpen) : null,
        fiscalLogsAccess ? item('/fiscal/logs', 'Logs de Sincronizacao', HiOutlineClipboardDocumentList) : null
      ]);
    }

    if (crmAccess) {
      addGroup('CRM', [
        crmDashboardAccess ? item('/crm/dashboard', 'Dashboard', HiOutlineSquares2X2) : null,
        crmDashboardAccess ? item('/crm/relatorios', 'Relatórios CRM', HiOutlineDocumentText) : null,
        crmAtendimentoAccess ? item('/crm/inbox', 'Inbox', HiOutlineChatBubbleLeftRight) : null,
        crmLeadsAccess ? item('/crm/leads', 'Leads', HiOutlineUsers) : null,
        crmLeadsAccess ? item('/crm/carteira', 'Minha Carteira', HiOutlineUsers) : null,
        crmLeadsCreateAccess ? item('/crm/leads/novo', 'Novo Lead', HiOutlinePlusCircle) : null,
        crmLeadsAccess ? item('/crm/kanban', 'Kanban', HiOutlineSquares2X2) : null,
        crmLeadsAccess ? item('/crm/tarefas', 'Tarefas', HiOutlineClipboardDocumentList) : null,
        crmAutomacoesAccess ? item('/crm/automacoes', 'Automacoes', HiOutlineAdjustmentsHorizontal) : null,
        crmConfiguracoesAccess ? item('/crm/admin/canais', 'Canais', HiOutlineCog6Tooth) : null,
        crmConfiguracoesAccess ? item('/crm/admin/numeros', 'Números', HiOutlinePaperAirplane) : null,
        crmConfiguracoesAccess ? item('/crm/admin/integracoes', 'Integrações', HiOutlineAdjustmentsHorizontal) : null
      ]);
    }

    if (comercialAccess) {
      addGroup('Comercial', [
        item('/comercial/relatorios', 'Relatórios Comerciais', HiOutlineDocumentText),
        comercialEmpreendimentosAccess ? item('/comercial/empreendimentos', 'Empreendimentos', HiOutlineBuildingOffice2) : null,
        comercialEmpreendimentosAccess ? item('/comercial/unidades', 'Unidades', HiOutlineRectangleGroup) : null,
        comercialEmpreendimentosAccess ? item('/comercial/mapa-unidades', 'Mapa de Unidades', HiOutlineSquares2X2) : null,
        comercialEmpreendimentosAccess ? item('/comercial/tabelas-preco', 'Tabelas de Preco', HiOutlineDocumentText) : null,
        comercialContratosAccess ? item('/comercial/contratos', 'Contratos de Venda', HiOutlineBanknotes) : null,
        comercialContratosAccess ? item('/comercial/modelos-contrato', 'Modelos de Contrato', HiOutlineFolderOpen) : null
      ]);
    }

    if (provisoesAccess) {
      addGroup('Provisionamento', [
        provisoesDashboardAccess ? item('/provisoes-financeiras/dashboard', 'Dashboard de Previsao', HiOutlineSquares2X2) : null,
        provisoesDashboardAccess ? item('/provisoes-financeiras/relatorios', 'Relatórios', HiOutlineDocumentText) : null,
        provisoesListaAccess ? item('/provisoes-financeiras', 'Provisionamentos', HiOutlineBanknotes) : null,
        provisoesCreateAccess ? item('/provisoes-financeiras/nova', 'Nova Provisao', HiOutlinePlusCircle) : null,
        provisoesCategoriasAccess ? item('/provisoes-financeiras/categorias', 'Categorias Macro', HiOutlineFolderOpen) : null
      ]);
    }

    if (rhDpAccess) {
      addGroup('RH/DP', [
        rhDpDashboardAccess ? item('/rh-dp', 'Visao do Modulo', HiOutlineUsers) : null,
        rhDpDashboardAccess ? item('/rh-dp/relatorios', 'Relatórios', HiOutlineDocumentText) : null,
        rhDpColaboradoresAccess ? item('/rh-dp/colaboradores', 'Colaboradores', HiOutlineUsers) : null,
        rhDpDocumentosAccess ? item('/rh-dp/documentos', 'Documentos', HiOutlineFolderOpen) : null,
        rhDpImportacoesAccess ? item('/rh-dp/importacoes', 'Importacoes', HiOutlineCloudArrowUp) : null,
        rhDpApuracaoAccess ? item('/rh-dp/apuracao', 'Apuracao', HiOutlineDocumentText) : null,
        rhDpObrigacoesAccess ? item('/rh-dp/fechamentos', 'Fechamentos', HiOutlineBanknotes) : null
      ]);
    }

    if (sstAccess && SST_SIMPLIFIED_MODE) {
      addGroup('SST', SST_NAV.map(([resource, label]) => (
        canViewSstArea(user, resource)
          ? item(
            `/sst/${resource}`,
            label,
            SST_SIMPLIFIED_ICONS[resource] || HiOutlineShieldCheck
          )
          : null
      )));
    } else if (sstAccess) {
      addGroup('SST', [
        sstDashboardAccess ? item('/sst', 'Dashboard SST', HiOutlineShieldCheck) : null,
        sstDashboardAccess ? item('/sst/relatorios/centro-operacional', 'Centro Operacional SST', HiOutlineSquares2X2) : null,
        sstDashboardAccess ? item('/sst/relatorios/executivo', 'Executivo SST', HiOutlineSparkles) : null,
        sstDashboardAccess ? item('/sst/relatorios/heatmap', 'Heatmap SST', HiOutlineSquares2X2) : null,
        sstDashboardAccess ? item('/sst/observabilidade', 'Observabilidade SST', HiOutlineClipboardDocumentList) : null,
        sstDashboardAccess ? item('/sst/producao', 'Produção SST', HiOutlineAdjustmentsHorizontal) : null,
        sstDashboardAccess ? item('/sst/observabilidade-avancada', 'SST Enterprise', HiOutlineAdjustmentsHorizontal) : null,
        sstDashboardAccess ? item('/sst/timeline', 'Timeline SST', HiOutlineClipboardDocumentList) : null,
        sstDashboardAccess ? item('/sst/relatorios', 'Relatórios SST', HiOutlineDocumentText) : null,
        canViewSstArea(user, 'riscos') ? item('/sst/riscos', 'Riscos', HiOutlineExclamationTriangle) : null,
        canViewSstArea(user, 'riscos') ? item('/sst/ambientes', 'Ambientes', HiOutlineBuildingOffice2) : null,
        canViewSstArea(user, 'riscos') ? item('/sst/exposicoes', 'Exposicoes', HiOutlineAdjustmentsHorizontal) : null,
        canViewSstArea(user, 'aso') ? item('/sst/aso', 'ASO', HiOutlineClipboardDocumentCheck) : null,
        canViewSstArea(user, 'exames') ? item('/sst/exames', 'Exames', HiOutlineDocumentText) : null,
        canViewSstArea(user, 'epi') ? item('/sst/epi', 'EPI', HiOutlineShieldCheck) : null,
        canViewSstArea(user, 'treinamentos') ? item('/sst/treinamentos', 'Treinamentos', HiOutlineUsers) : null,
        canViewSstArea(user, 'acidentes') ? item('/sst/acidentes', 'Acidentes', HiOutlineExclamationTriangle) : null,
        canViewSstArea(user, 'documentos') ? item('/sst/documentos', 'Documentos', HiOutlineFolderOpen) : null,
        canViewSstArea(user, 'esocial') ? item('/sst/esocial', 'eSocial', HiOutlineAdjustmentsHorizontal) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/eventos', 'Eventos', HiOutlineClipboardDocumentList) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/pendencias', 'Pendencias SST', HiOutlineInboxStack) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/bloqueios', 'Bloqueios SST', HiOutlineKey) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/notificacoes', 'Notificacoes SST', HiOutlineChatBubbleOvalLeft) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/scores', 'Scores SST', HiOutlineRectangleGroup) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/recomendacoes', 'Recomendacoes SST', HiOutlineSparkles) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/telemetria', 'Telemetria SST', HiOutlineAdjustmentsHorizontal) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/alertas_operacionais', 'Alertas SST', HiOutlineExclamationTriangle) : null,
        canViewSstArea(user, 'analytics') ? item('/sst/workflow_execucoes', 'Execucoes Workflow', HiOutlineClipboardDocumentList) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/politicas_bloqueio', 'Politicas de bloqueio', HiOutlineCog6Tooth) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/workflows', 'Workflows SST', HiOutlineAdjustmentsHorizontal) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/workflow_acoes', 'Acoes Workflow', HiOutlineAdjustmentsHorizontal) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/rollout_planos', 'Rollout SST', HiOutlineAdjustmentsHorizontal) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/hardening_policies', 'Hardening SST', HiOutlineCog6Tooth) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/criticidades', 'Criticidades SST', HiOutlineAdjustmentsHorizontal) : null,
        canManageSstArea(user, 'configuracoes') ? item('/sst/configuracoes', 'Configurações', HiOutlineCog6Tooth) : null
      ]);
    }

    if (gestaoUsuarios || businessAdmin || configuracoesCadastrosAccess) {
      addGroup('Cadastros', [
        gestaoUsuarios ? item('/usuarios', 'Usuários', HiOutlineUsers) : null,
        (superadmin || configuracoesCadastrosAccess) ? item('/empresas-grupo', 'Empresas do Grupo', HiOutlineBuildingOffice2) : null,
        (businessAdmin || configuracoesCadastrosAccess) && obrasAccess ? item('/obras', 'Obras', HiOutlineBuildingOffice2) : null,
        businessAdmin && obrasAccess ? item('/gestao-apropriacoes', 'Gestão de Apropriações', HiOutlineAdjustmentsHorizontal) : null,
        (businessAdmin || configuracoesCadastrosAccess) ? item('/setores', 'Setores', HiOutlineAdjustmentsHorizontal) : null,
        (businessAdmin || configuracoesCadastrosAccess) ? item('/tipos-solicitacao', 'Tipos de Solicitacao', HiOutlineClipboardDocumentList) : null,
        (businessAdmin || configuracoesCadastrosAccess) ? item('/parceiros', 'Cadastro de Pessoas', HiOutlineUsers) : null,
        (businessAdmin || configuracoesCadastrosAccess) ? item('/parceiros-categorias', 'Categorias de Parceiro', HiOutlineArchiveBox) : null
      ]);
    }

    if (contratosAccess) {
      addGroup('Contratos', [
        item('/contratos/relatorios', 'Relatórios', HiOutlineDocumentText),
        item('/gestao-contratos', 'Gestão de Contratos', HiOutlineBanknotes)
      ]);
    }

    if (governancaSistemaAccess || auditoriaOperacionalAccess) {
      addGroup('Administração', [
        governancaSistemaAccess ? item('/governanca', 'Governança do Sistema', HiOutlineShieldCheck) : null,
        auditoriaOperacionalAccess ? item('/governanca/auditoria-operacional', 'Auditoria Operacional', HiOutlineClipboardDocumentList) : null
      ]);
    }

    if (configuracoesAccess) {
      addGroup('Configurações', [
        item('/configuracoes', 'Configurações', HiOutlineCog6Tooth),
        configuracoesStatusVinculosAccess ? item('/usuarios-acesso-prioridade-diretoria', 'Acesso Prioridades', HiOutlineUsers) : null,
        configuracoesStatusVinculosAccess ? item('/usuarios-envio-qualquer-setor', 'Envio Livre por Usuario', HiOutlineUsers) : null,
        configuracoesStatusVinculosAccess ? item('/tipos-compartilhados-setor', 'Tipos Compartilhados', HiOutlineClipboardDocumentList) : null,
        configuracoesStatusVinculosAccess ? item('/automacao-status-setor', 'Automacao por Status', HiOutlinePaperAirplane) : null,
        moduloCotacoesHabilitado && comprasConfiguracoesAccess ? item('/configuracoes-cotacao', 'Config. Cotações', HiOutlineAdjustmentsHorizontal) : null,
        comprasConfiguracoesAccess ? item('/configuracoes-status-pedidos-compra', 'Status dos Pedidos', HiOutlineClipboardDocumentList) : null,
        configuracoesGeralAccess && comercialAccess ? item('/configuracoes-comercial-categorias', 'Categorias Comerciais', HiOutlineArchiveBox) : null,
        configuracoesModulosAccess ? item('/configuracoes-modulos', 'Modulos e Planos', HiOutlineCog6Tooth) : null,
        configuracoesAparenciaAccess ? item('/configuracoes-notificacoes-sistema', 'Notificacoes Sistema', HiOutlineBell) : null,
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
    comprasConfiguracoesAccess,
    configuracoesAccess,
    configuracoesAparenciaAccess,
    configuracoesCadastrosAccess,
    configuracoesGeralAccess,
    configuracoesModulosAccess,
    configuracoesStatusVinculosAccess,
    comprasCotacoesAccess,
    comprasCotacoesManageAccess,
    comprasDelegacaoAccess,
    comprasFornecedoresAccess,
    comprasPedidosAccess,
    comprasRelatoriosAccess,
    comprasSolicitacoesAccess,
    comprasSolicitacoesCreateAccess,
    contratosAccess,
    custosRecebiveisAccess,
    crmAccess,
    crmAtendimentoAccess,
    crmAutomacoesAccess,
    crmConfiguracoesAccess,
    crmDashboardAccess,
    crmLeadsAccess,
    crmLeadsCreateAccess,
    financeiroAccess,
    fiscalAccess,
    fiscalConfigAccess,
    fiscalDocumentsAccess,
    fiscalLogsAccess,
    pagamentosAccess,
    boletosAccess,
    financeiroModuleEnabled,
    gestaoUsuarios,
    governancaSistemaAccess,
    auditoriaOperacionalAccess,
    moduloBibliotecaHabilitado,
    moduloCotacoesHabilitado,
    obrasAccess,
    prioridadesDiretoriaAccess,
    solicitacoesRelatoriosAccess,
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
    sstAccess,
    sstDashboardAccess,
    superadmin,
    treinamentoAccess
  ]);

  const flatMenuItems = useMemo(
    () => menuGroups.flatMap((group) => group.items.map((item) => ({ ...item, groupLabel: group.label }))),
    [menuGroups]
  );

  const activeMatch = useMemo(() => findActiveMenuMatch(menuGroups, location.pathname), [menuGroups, location.pathname]);
  const activeGroupLabel = activeMatch?.group?.label || null;
  const activeItem = activeMatch?.item || null;
  const currentSectionLabel = activeItem?.label || activeGroupLabel || 'Workspace';
  const pageDescription = activeGroupLabel
    ? `${activeGroupLabel} · ${user?.nome || 'Operacao'}`
    : `${brandLabel} · ${perfilUpper || 'USUARIO'}`;

  useEffect(() => {
    setOpenGroupId(activeGroupLabel);
  }, [activeGroupLabel]);

  const notificationCount = inboxNovasCount + saidaNovasCount;

  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  const closeMobileSidebar = () => {
    if (isMobileViewport) setMenuAberto(false);
  };

  const handleSelect = (groupLabel) => {
    if (groupLabel) setOpenGroupId(groupLabel);
    closeMobileSidebar();
  };

  const toggleGroup = (label) => {
    setOpenGroupId((current) => (current === label ? null : label));
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className={`layout-shell fluxy-app-shell flex min-h-screen overflow-x-hidden ${nativeApp ? 'layout-shell-native' : ''} ${custosRecebiveisResponsiveRoute ? 'custos-recebiveis-layout-scope' : ''}`}>
        <OperationalAuditTracker />
        <div className="layout-shell-backdrop" aria-hidden="true" />

        <aside
          className={`sidebar ${collapsed ? 'collapsed' : ''} fixed md:sticky top-0 left-0 h-full z-40 transform transition-all duration-300 ${
            menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          style={{ width: `${sidebarWidth}px` }}
          role="navigation"
          aria-label="Menu lateral"
        >
          <div className="sidebar-inner">
            <div className={`brand ${collapsed ? 'brand-collapsed' : ''}`}>
              <div className="brand-mark">
                <div className="brand-logo-tile" aria-hidden="true">
                  <img
                    src={fluxyMark}
                    alt=""
                    className="brand-logo-icon"
                  />
                </div>
              </div>

              {!collapsed && (
                <div className="brand-copy">
                  <p className="brand-wordmark">Fluxy</p>
                </div>
              )}

              <button
                onClick={() => setMenuAberto(false)}
                className="chevron-btn md:hidden"
                aria-label="Fechar menu"
                type="button"
              >
                <HiOutlineChevronLeft size={18} />
              </button>
            </div>

            {!collapsed && (
              <section className="sidebar-profile-card" aria-label="Resumo da conta">
                <div className="sidebar-profile-avatar">
                  {String(user?.nome || brandInitial).trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="sidebar-profile-copy min-w-0">
                  <p className="sidebar-profile-name">{user?.nome || 'Usuário'}</p>
                  <p className="sidebar-profile-email">
                    {user?.email || user?.setor?.nome || user?.area || ''}
                  </p>
                  {perfilUpper && (
                    <span className="sidebar-profile-badge">{perfilUpper}</span>
                  )}
                </div>
              </section>
            )}

            <nav className="sidebar-nav">
              {collapsed ? (
                <ul className="nav-list nav-list-collapsed">
                  {flatMenuItems.map((item) => (
                    <MenuItem
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      active={isPathActive(location.pathname, item.to)}
                      onSelect={() => handleSelect(item.groupLabel)}
                      collapsed
                      groupLabel={item.groupLabel}
                      inboxNovasCount={item.to === '/comunicacao-interna' ? comunicacaoNovasCount : 0}
                      saidaNovasCount={0}
                    />
                  ))}
                </ul>
              ) : (
                <ul className="nav-list nav-list-grouped">
                  {menuGroups.map((group) => {
                    const isOpen = openGroupId === group.label;
                    const isGroupActive = group.items.some((item) => isPathActive(location.pathname, item.to));
                    const groupId = `submenu-${String(group.label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    const GroupIcon = group.icon;
                    const unreadCount = group.label === 'Comunicação' ? notificationCount : 0;

                    return (
                      <li key={group.label} className={`nav-group ${isGroupActive ? 'active' : ''}`}>
                        <button
                          type="button"
                          className={`nav-group-toggle ${isOpen ? 'open' : ''} ${isGroupActive ? 'current' : ''}`}
                          onClick={() => toggleGroup(group.label)}
                          aria-expanded={isOpen}
                          aria-controls={groupId}
                        >
                          <span className="nav-group-heading">
                            {GroupIcon && <GroupIcon className="nav-group-icon" />}
                            <span className="nav-group-title">{group.label}</span>
                            {unreadCount > 0 && (
                              <span className="nav-count-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
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
                            {group.items.map((item) => (
                              <MenuItem
                                key={item.to}
                                to={item.to}
                                label={item.label}
                                icon={item.icon}
                                active={isPathActive(location.pathname, item.to)}
                                onSelect={() => handleSelect(group.label)}
                                collapsed={false}
                                subItem
                                groupLabel={group.label}
                                inboxNovasCount={item.to === '/comunicacao-interna' ? comunicacaoNovasCount : 0}
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

            <div className="sidebar-footer">
              {!collapsed && (
                <div className="sidebar-footer-note">
                  <HiOutlineSparkles className="sidebar-footer-note-icon" />
                  <span>Fluxo visual renovado, mantendo regras e endpoints atuais.</span>
                </div>
              )}

              <button
                onClick={logout}
                className="nav-btn nav-btn-logout"
                type="button"
              >
                <HiOutlineArrowRightOnRectangle className="nav-icon" />
                {!collapsed && 'Sair'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setCollapsed((current) => !current)}
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
          <button
            type="button"
            className="sidebar-overlay fixed inset-0 md:hidden z-30"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu lateral"
          />
        )}

        <main className={`layout-main flex-1 min-w-0 transition-colors duration-200 ${nativeApp ? 'layout-main-native' : ''}`}>
          <div className={`layout-content-shell ${comprasResponsiveRoute ? 'compras-responsive-scope' : ''}`}>
            <header className={`topbar-shell ${nativeApp ? 'topbar-shell-native' : ''}`}>
              <div className="topbar-leading">
                <button
                  onClick={() => setMenuAberto(true)}
                  className="topbar-menu-button md:hidden"
                  aria-label="Abrir menu"
                  type="button"
                >
                  <HiOutlineBars3 size={20} />
                </button>

                <div className="topbar-context">
                  <p className="topbar-breadcrumb">
                    <span>{activeGroupLabel || brandLabel}</span>
                    {activeItem && activeItem.label !== activeGroupLabel ? (
                      <>
                        <HiOutlineChevronRight size={14} />
                        <span>{activeItem.label}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="topbar-title-row">
                    <div>
                      <h1 className="topbar-title">{currentSectionLabel}</h1>
                      <p className="topbar-subtitle">{pageDescription}</p>
                    </div>
                    <span className="topbar-status-chip">
                      {theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="topbar-tray">
                <button
                  onClick={toggleTheme}
                  className="theme-toggle"
                  type="button"
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {theme === 'dark' ? (
                    <>
                      <HiOutlineSun size={18} />
                      <span className="hidden sm:inline">Claro</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineMoon size={18} />
                      <span className="hidden sm:inline">Escuro</span>
                    </>
                  )}
                </button>

                <button
                  className="theme-toggle topbar-support-btn"
                  type="button"
                  aria-label="Suporte"
                  title={suporteWhatsappUrl ? 'Abrir suporte no WhatsApp' : 'WhatsApp de suporte nao configurado'}
                  onClick={() => {
                    if (suporteWhatsappUrl) {
                      window.open(suporteWhatsappUrl, '_blank', 'noopener,noreferrer');
                    } else if (superadmin) {
                      navigate('/configuracoes-suporte');
                    }
                  }}
                >
                  <HiOutlineLifebuoy size={18} />
                  <span className="hidden sm:inline">Suporte</span>
                </button>

                <Link
                  to="/comunicacao-interna"
                  className="theme-toggle topbar-chat-btn"
                  aria-label="Chat interno"
                  title="Chat interno"
                  style={{ position: 'relative' }}
                >
                  <HiOutlineChatBubbleOvalLeft size={18} />
                  <span className="hidden sm:inline">Chat</span>
                  {comunicacaoNovasCount > 0 && (
                    <span className="notification-trigger-badge">
                      {comunicacaoNovasCount > 99 ? '99+' : comunicacaoNovasCount}
                    </span>
                  )}
                </Link>

                <NotificacoesBell />
              </div>
            </header>

            <Suspense fallback={<AppRouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function findActiveMenuMatch(menuGroups, pathname) {
  let bestMatch = null;

  for (const group of menuGroups) {
    for (const item of group.items) {
      if (!isPathActive(pathname, item.to)) continue;
      if (!bestMatch || item.to.length > bestMatch.item.to.length) {
        bestMatch = { group, item };
      }
    }
  }

  return bestMatch;
}

function isPathActive(currentPath, targetPath) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function MenuItem({
  to,
  label,
  icon: Icon,
  active,
  onSelect,
  collapsed,
  subItem = false,
  groupLabel,
  inboxNovasCount = 0,
  saidaNovasCount = 0
}) {
  const mostrarBadgeInbox = to === '/comunicacao-interna' || to === '/conversas/entrada';
  const mostrarBadgeSaida = to === '/conversas/saida';
  const inboxCount = Number(inboxNovasCount || 0);
  const saidaCount = Number(saidaNovasCount || 0);

  return (
    <li>
      <Link
        to={to}
        onClick={onSelect}
        className={`nav-btn ${subItem ? 'nav-btn-sub' : ''} ${active ? 'active' : ''}`}
        title={collapsed ? `${groupLabel} · ${label}` : label}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        {Icon && <Icon className="nav-icon" />}
        {!collapsed && <span className="nav-btn-label">{label}</span>}

        {!collapsed && mostrarBadgeInbox && inboxCount > 0 && (
          <span className="nav-count-badge nav-count-badge-inline">
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}

        {!collapsed && mostrarBadgeSaida && saidaCount > 0 && (
          <span className="nav-count-badge nav-count-badge-inline">
            {saidaCount > 99 ? '99+' : saidaCount}
          </span>
        )}
      </Link>
    </li>
  );
}
