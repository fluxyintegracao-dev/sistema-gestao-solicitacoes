import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AppRouteFallback from '../components/AppRouteFallback';
import NotificacoesBell from '../components/NotificacoesBell';
import { getResumoConversas } from '../services/conversasInternas';
import { getInstalacaoPublica } from '../services/instalacao';
import { getSuporteWhatsapp } from '../services/configuracoesSistema';
import {
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineChevronRight,
  HiOutlineArrowRightOnRectangle,
  HiOutlineLifebuoy,
  HiOutlineChatBubbleOvalLeft
} from 'react-icons/hi2';
import { isSuperadmin } from '../utils/acessoProduto';
import { findActiveNode, getVisibleModule, resolveLabel } from '../navigation/navigationConfig';
import CommandPalette from '../navigation/CommandPalette';
import { AtalhosProvider } from '../navigation/AtalhosContext';
import AtalhosTopbar from '../navigation/AtalhosTopbar';
import { isNativeApp, registerNativeBackButtonHandler } from '../mobile/runtime';
import { getFallbackRoute, hasSafeBrowserHistory } from '../utils/navigation';
import OperationalAuditTracker from '../modules/governanca/components/OperationalAuditTracker';
import cscLogo from '../assets/CSC_logo_lockup_cropped.png';
import fluxyMark from '../assets/fluxy_mark_cropped.png';

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

// Breadcrumb clicável: Início › Módulo › Tela. Lê a mesma fonte única
// de navegação dos hubs e permite voltar a qualquer nível em um clique.
function Breadcrumb({ user, pathname }) {
  const hubMatch = pathname.match(/^\/hub\/([^/]+)/);
  const hubModule = hubMatch ? getVisibleModule(user, hubMatch[1]) : null;
  const active = !hubMatch && pathname !== '/' ? findActiveNode(user, pathname) : null;

  return (
    <nav className="fx-breadcrumb" aria-label="Trilha de navegação">
      {pathname === '/' ? (
        <span className="fx-breadcrumb-current" aria-current="page">Início</span>
      ) : (
        <Link to="/">Início</Link>
      )}

      {hubModule && (
        <>
          <HiOutlineChevronRight size={13} className="fx-breadcrumb-sep" aria-hidden="true" />
          <span className="fx-breadcrumb-current" aria-current="page">
            {resolveLabel(hubModule, user)}
          </span>
        </>
      )}

      {active && (
        <>
          <HiOutlineChevronRight size={13} className="fx-breadcrumb-sep" aria-hidden="true" />
          {active.module.children.length > 1 ? (
            <Link to={`/hub/${active.module.id}`}>{resolveLabel(active.module, user)}</Link>
          ) : (
            <span className="fx-breadcrumb-current">{resolveLabel(active.module, user)}</span>
          )}
          {resolveLabel(active.item, user) !== resolveLabel(active.module, user) && (
            <>
              <HiOutlineChevronRight size={13} className="fx-breadcrumb-sep" aria-hidden="true" />
              <span className="fx-breadcrumb-current" aria-current="page">
                {resolveLabel(active.item, user)}
              </span>
            </>
          )}
        </>
      )}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [comunicacaoNovasCount, setComunicacaoNovasCount] = useState(0);
  const [instalacao, setInstalacao] = useState({
    product_name: 'Fluxy',
    company_name: '',
    logo_url: ''
  });
  const [suporteWhatsappUrl, setSuporteWhatsappUrl] = useState(null);
  const nativeApp = isNativeApp();
  const superadmin = isSuperadmin(user);
  const comprasResponsiveRoute = isComprasResponsiveRoute(location.pathname);
  const custosRecebiveisResponsiveRoute = location.pathname.startsWith('/custos-recebiveis');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Atalho global Ctrl+K / Cmd+K para a busca de telas.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
        event.preventDefault();
        setBuscaAberta((atual) => !atual);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    return registerNativeBackButtonHandler({
      canCloseMenu: () => buscaAberta,
      onCloseMenu: () => setBuscaAberta(false),
      canNavigateBack: () => location.pathname !== '/',
      onNavigateBack: () => {
        if (hasSafeBrowserHistory()) {
          navigate(-1);
          return;
        }
        navigate(getFallbackRoute(location.pathname), { replace: true });
      }
    });
  }, [location.pathname, buscaAberta, navigate]);

  useEffect(() => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
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
        setComunicacaoNovasCount(Number(resumo?.nao_lidas || 0));
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
        setInstalacao((current) => ({ ...current, ...data }));
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

  const brandLabel = instalacao.product_name || 'Fluxy';
  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  const fecharBusca = useCallback(() => setBuscaAberta(false), []);

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const tituloDocumento = useMemo(() => {
    const ativo = findActiveNode(user, location.pathname);
    return ativo ? `${resolveLabel(ativo.item, user)} · ${brandLabel}` : brandLabel;
  }, [user, location.pathname, brandLabel]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = tituloDocumento;
    }
  }, [tituloDocumento]);

  return (
    <AtalhosProvider>
    <div className={theme === 'dark' ? 'dark' : ''}>
      {/* overflow-x-CLIP, não hidden: hidden acopla overflow-y:auto e o shell
          vira um scrollport que nunca rola — a topbar e o cabeçalho fixo
          (R13) "grudavam" nele em vez de grudar na janela (defeito 02/09). */}
      <div className={`layout-shell fluxy-app-shell flex min-h-screen overflow-x-clip ${nativeApp ? 'layout-shell-native' : ''} ${custosRecebiveisResponsiveRoute ? 'custos-recebiveis-layout-scope' : ''}`}>
        <OperationalAuditTracker />
        <div className="layout-shell-backdrop" aria-hidden="true" />

        <main className={`layout-main flex-1 min-w-0 transition-colors duration-200 ${nativeApp ? 'layout-main-native' : ''}`}>
          <div className={`layout-content-shell ${comprasResponsiveRoute ? 'compras-responsive-scope' : ''}`}>
            <header className={`fx-topbar ${nativeApp ? 'topbar-shell-native' : ''}`}>
              <div className="fx-topbar-nav">
                {/* Marca no canto superior esquerdo — âncora visual do
                    sistema. Discreta, sem sombras (D9); clique = Início.
                    No mobile fica só o símbolo do Fluxy. */}
                <Link to="/" className="fx-brand" aria-label="CSC · Fluxy — ir para o início">
                  <img src={cscLogo} alt="CSC" width={53} height={26} className="fx-brand-csc" />
                  <img src={fluxyMark} alt="" aria-hidden="true" width={22} height={22} className="fx-brand-fluxy" />
                  <span className="fx-brand-nome">Fluxy</span>
                </Link>
                <span className="fx-brand-divisor" aria-hidden="true" />

                <Link to="/" className="fx-home-btn" aria-label="Ir para o início">
                  <HiOutlineHome size={17} aria-hidden="true" />
                  <span className="hidden sm:inline">Início</span>
                </Link>

                <button
                  type="button"
                  className="fx-search-btn"
                  onClick={() => setBuscaAberta(true)}
                  aria-label="Buscar tela (Ctrl+K)"
                  aria-haspopup="dialog"
                >
                  <HiOutlineMagnifyingGlass size={16} aria-hidden="true" />
                  <span className="hidden md:inline">Buscar</span>
                  <kbd className="fx-search-kbd hidden md:inline">Ctrl K</kbd>
                </button>

                <Breadcrumb user={user} pathname={location.pathname} />

                {/* Estrela de fixar a tela atual + fileira de atalhos
                    (ícones na cor do módulo, excedente no painel »). */}
                <AtalhosTopbar />
              </div>

              <div className="fx-topbar-tray">
                <button
                  onClick={toggleTheme}
                  className="theme-toggle"
                  type="button"
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {theme === 'dark' ? (
                    <HiOutlineSun size={18} aria-hidden="true" />
                  ) : (
                    <HiOutlineMoon size={18} aria-hidden="true" />
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
                  <HiOutlineLifebuoy size={18} aria-hidden="true" />
                </button>

                <Link
                  to="/comunicacao-interna"
                  className="theme-toggle topbar-chat-btn"
                  aria-label="Chat interno"
                  title="Chat interno"
                  style={{ position: 'relative' }}
                >
                  <HiOutlineChatBubbleOvalLeft size={18} aria-hidden="true" />
                  {comunicacaoNovasCount > 0 && (
                    <span className="notification-trigger-badge">
                      {comunicacaoNovasCount > 99 ? '99+' : comunicacaoNovasCount}
                    </span>
                  )}
                </Link>

                <NotificacoesBell />

                <Link
                  to="/perfil"
                  className="theme-toggle"
                  aria-label={`Meu perfil — ${user?.nome || 'usuário'} (${perfilUpper || 'USUARIO'})`}
                  title={`${user?.nome || 'Usuário'} · ${perfilUpper || 'USUARIO'}`}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--ui-surface-soft)',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {String(user?.nome || 'U').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden lg:inline">{String(user?.nome || '').split(' ')[0]}</span>
                </Link>

                <button
                  onClick={logout}
                  className="theme-toggle"
                  type="button"
                  aria-label="Sair do sistema"
                  title="Sair"
                >
                  <HiOutlineArrowRightOnRectangle size={18} aria-hidden="true" />
                  <span className="hidden lg:inline">Sair</span>
                </button>
              </div>
            </header>

            <Suspense fallback={<AppRouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <CommandPalette open={buscaAberta} onClose={fecharBusca} />
      </div>
    </div>
    </AtalhosProvider>
  );
}
