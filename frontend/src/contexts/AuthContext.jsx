import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getTimeoutInatividade } from '../services/configuracoesSistema';

export const AuthContext = createContext();
const DEFAULT_IDLE_TIMEOUT_MINUTES = 20;
const IDLE_TIMEOUT_STORAGE_KEY = 'timeout_inatividade_minutos';

export function AuthProvider({ children }) {
  function getStoredUser() {
    try {
      const value = localStorage.getItem('usuario');
      if (!value || value === 'undefined') return null;
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function getStoredToken() {
    const value = localStorage.getItem('token');
    if (!value || value === 'undefined') return null;
    return value;
  }

  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(() => {
    const value = Number(localStorage.getItem(IDLE_TIMEOUT_STORAGE_KEY));
    return Number.isNaN(value) || value <= 0 ? DEFAULT_IDLE_TIMEOUT_MINUTES : value;
  });

  const idleTimerRef = useRef(null);
  const tokenExpireTimerRef = useRef(null);
  const tokenExpireHandledRef = useRef(false);

  const isAuthenticated = !!token;

  function parseJwtExpirationMs(jwtToken) {
    try {
      const parts = String(jwtToken || '').split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
      const payload = JSON.parse(atob(padded));
      const expSeconds = Number(payload?.exp);
      if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;

      return expSeconds * 1000;
    } catch {
      return null;
    }
  }

  function login(data) {
    setUser(data.user);
    setToken(data.token);
    tokenExpireHandledRef.current = false;

    localStorage.setItem('usuario', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
  }

  function logout() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (tokenExpireTimerRef.current) {
      clearTimeout(tokenExpireTimerRef.current);
      tokenExpireTimerRef.current = null;
    }

    setUser(null);
    setToken(null);
    tokenExpireHandledRef.current = false;

    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
  }

  function handleTokenExpired() {
    if (tokenExpireHandledRef.current) return;
    tokenExpireHandledRef.current = true;
    alert('Sua sessao expirou. Faca login novamente.');
    logout();
  }

  useEffect(() => {
    if (!token) return;

    let cancelado = false;
    (async () => {
      try {
        const data = await getTimeoutInatividade();
        const minutos = Number(data?.minutos);
        if (!cancelado && !Number.isNaN(minutos) && minutos > 0) {
          setIdleTimeoutMinutes(minutos);
          localStorage.setItem(IDLE_TIMEOUT_STORAGE_KEY, String(minutos));
        }
      } catch {
        // fallback silencioso para valor atual/default
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const reiniciarTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        alert('Sessao encerrada por inatividade. Faca login novamente.');
        logout();
      }, Math.max(1, Number(idleTimeoutMinutes || DEFAULT_IDLE_TIMEOUT_MINUTES)) * 60 * 1000);
    };

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach(evento => window.addEventListener(evento, reiniciarTimer, { passive: true }));
    reiniciarTimer();

    return () => {
      eventos.forEach(evento => window.removeEventListener(evento, reiniciarTimer));
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isAuthenticated, idleTimeoutMinutes]);

  useEffect(() => {
    if (!token) return undefined;

    if (tokenExpireTimerRef.current) {
      clearTimeout(tokenExpireTimerRef.current);
      tokenExpireTimerRef.current = null;
    }
    tokenExpireHandledRef.current = false;

    const expiresAt = parseJwtExpirationMs(token);
    if (!expiresAt) return undefined;

    const msUntilExpire = expiresAt - Date.now();
    if (msUntilExpire <= 0) {
      handleTokenExpired();
      return undefined;
    }

    tokenExpireTimerRef.current = setTimeout(() => {
      handleTokenExpired();
    }, msUntilExpire);

    return () => {
      if (tokenExpireTimerRef.current) {
        clearTimeout(tokenExpireTimerRef.current);
        tokenExpireTimerRef.current = null;
      }
    };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        idleTimeoutMinutes,
        isAuthenticated,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
