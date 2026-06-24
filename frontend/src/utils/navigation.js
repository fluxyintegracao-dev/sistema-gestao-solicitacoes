import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function getFallbackRoute(pathname = '/') {
  const path = String(pathname || '/').toLowerCase();

  if (path.startsWith('/solicitacoes-compra-direta')) return '/solicitacoes-compra';
  if (path.startsWith('/solicitacoes-compra')) return '/solicitacoes-compra';
  if (path.startsWith('/pedidos-compra')) return '/pedidos-compra';
  if (path.startsWith('/compras') || path.startsWith('/cotacoes') || path.startsWith('/gestao-insumos') || path.startsWith('/gestao-categorias') || path.startsWith('/gestao-unidades') || path.startsWith('/gestao-fornecedores')) {
    return '/solicitacoes-compra';
  }
  if (path.startsWith('/financeiro') || path.startsWith('/comprovantes')) return '/financeiro/titulos';
  if (path.startsWith('/comercial')) return '/comercial/contratos';
  if (path.startsWith('/crm')) return '/crm/dashboard';
  if (path.startsWith('/rh-dp')) return '/rh-dp';
  if (path.startsWith('/sst')) return '/sst';
  if (path.startsWith('/fiscal')) return '/fiscal';
  if (path.startsWith('/provisoes-financeiras')) return '/provisoes-financeiras';
  if (path.startsWith('/configuracoes') || path.startsWith('/usuarios') || path.startsWith('/setores') || path.startsWith('/tipos-solicitacao') || path.startsWith('/cores-sistema') || path.startsWith('/permissoes')) {
    return '/configuracoes';
  }
  if (path.startsWith('/contratos') || path.startsWith('/gestao-contratos')) return '/gestao-contratos';
  if (path.startsWith('/obras')) return '/obras';
  if (path.startsWith('/comunicacao')) return '/comunicacao-interna';
  if (path.startsWith('/biblioteca') || path.startsWith('/arquivos-modelos')) return '/arquivos-modelos';
  if (path.startsWith('/solicitacoes')) return '/solicitacoes';

  return '/solicitacoes';
}

export function hasSafeBrowserHistory() {
  if (typeof window === 'undefined') return false;
  const historyState = window.history?.state;
  const routerIndex = Number(historyState?.idx);
  return Number.isInteger(routerIndex) && routerIndex > 0;
}

export function useSafeNavigateBack(defaultFallback) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((fallbackOverride) => {
    const fallback = fallbackOverride || defaultFallback || getFallbackRoute(location.pathname);

    if (hasSafeBrowserHistory()) {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  }, [defaultFallback, location.pathname, navigate]);
}
