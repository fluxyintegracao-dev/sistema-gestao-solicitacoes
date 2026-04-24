import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppRouteFallback from './AppRouteFallback';

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

  return children;
}
