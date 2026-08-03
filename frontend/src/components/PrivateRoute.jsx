import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppRouteFallback from './AppRouteFallback';

const CUSTOS_RECEBIVEIS_ALLOWED_ROUTES = [
  '/custos-recebiveis',
  '/perfil',
  '/ajuda',
  '/suporte'
];

function isCustosRecebiveisAllowedRoute(pathname) {
  return CUSTOS_RECEBIVEIS_ALLOWED_ROUTES.some((route) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));
}

export default function PrivateRoute({ children }) {
  const { isAuthenticated, authReady, user } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <AppRouteFallback fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mfa_setup_pending && location.pathname !== '/perfil') {
    return <Navigate to="/perfil" replace />;
  }

  const crPending = user?.custos_recebiveis_pendencia;
  if (crPending?.bloqueado && !isCustosRecebiveisAllowedRoute(location.pathname)) {
    const params = new URLSearchParams({
      aba: 'planejamento',
      bloqueio: '1'
    });
    if (crPending.obra_id) params.set('obra', crPending.obra_id);
    if (crPending.competencia) params.set('competencia', crPending.competencia);
    return <Navigate to={`/custos-recebiveis?${params.toString()}`} replace />;
  }

  return children;
}

export {
  CUSTOS_RECEBIVEIS_ALLOWED_ROUTES,
  isCustosRecebiveisAllowedRoute
};
