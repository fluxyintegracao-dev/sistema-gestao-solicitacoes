import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './session-storage';
import { clearAccessToken, setAccessToken } from './token-store';
import { heartbeatRequest, loginRequest } from '../../services/api/auth';
import { ApiError, setUnauthorizedHandler } from '../../services/api/client';
import type { AuthSession } from '../../services/api/types';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface SignInPayload {
  email: string;
  senha: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  authError: string | null;
  hasModule: (moduleCode: string) => boolean;
  clearAuthError: () => void;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: (options?: { expired?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeToken(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isSuperadmin(session: AuthSession | null) {
  return normalizeToken(session?.user?.perfil) === 'SUPERADMIN';
}

function normalizeEnabledModules(rawModules: unknown) {
  if (Array.isArray(rawModules)) {
    return rawModules.reduce<Record<string, boolean>>((acc, item) => {
      const key = normalizeToken((item as { key?: unknown })?.key);
      if (!key) return acc;
      acc[key] = Boolean((item as { enabled?: unknown })?.enabled);
      return acc;
    }, {});
  }

  if (rawModules && typeof rawModules === 'object') {
    return Object.entries(rawModules as Record<string, unknown>).reduce<Record<string, boolean>>(
      (acc, [key, enabled]) => {
        const normalizedKey = normalizeToken(key);
        if (!normalizedKey) return acc;
        acc[normalizedKey] = Boolean(enabled);
        return acc;
      },
      {}
    );
  }

  return {};
}

function normalizeSession(session: AuthSession | null) {
  if (!session?.user) return session;

  return {
    ...session,
    user: {
      ...session.user,
      modulos_habilitados: normalizeEnabledModules(session.user.modulos_habilitados)
    }
  } satisfies AuthSession;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [authError, setAuthError] = useState<string | null>(null);
  const heartbeatInFlightRef = useRef(false);
  const lastHeartbeatAtRef = useRef(0);

  const signOut = useCallback(async ({ expired = false }: { expired?: boolean } = {}) => {
    heartbeatInFlightRef.current = false;
    lastHeartbeatAtRef.current = 0;
    clearAccessToken();
    await clearStoredSession();
    setSession(null);
    setStatus('unauthenticated');
    setAuthError(expired ? 'Sua sessao expirou. Entre novamente.' : null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const stored = await loadStoredSession();

        if (!mounted) return;

        if (stored?.token && stored?.user) {
          const normalizedStored = normalizeSession(stored);
          setAccessToken(normalizedStored?.token || null);
          setSession(normalizedStored);
          setStatus('authenticated');
          return;
        }

        setStatus('unauthenticated');
      } catch {
        if (!mounted) return;
        setStatus('unauthenticated');
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (status === 'authenticated') {
        return signOut({ expired: true });
      }
      return undefined;
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [signOut, status]);

  const runHeartbeat = useCallback(async (force = false) => {
    if (status !== 'authenticated' || heartbeatInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastHeartbeatAtRef.current < 45_000) {
      return;
    }

    heartbeatInFlightRef.current = true;

    try {
      await heartbeatRequest();
      lastHeartbeatAtRef.current = Date.now();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }

      console.warn('Heartbeat mobile do FLUXY falhou.', error);
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return undefined;
    }

    void runHeartbeat(true);

    const intervalId = setInterval(() => {
      void runHeartbeat(false);
    }, 60_000);

    const appStateSubscription = AppState.addEventListener('change', (nextStatus) => {
      if (nextStatus === 'active') {
        void runHeartbeat(true);
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [runHeartbeat, status]);

  const signIn = useCallback(async ({ email, senha }: SignInPayload) => {
    setAuthError(null);

    try {
      const nextSession = normalizeSession(await loginRequest({ email, senha }));
      lastHeartbeatAtRef.current = 0;
      setAccessToken(nextSession?.token || null);
      if (nextSession) {
        await saveStoredSession(nextSession);
      }
      setSession(nextSession);
      setStatus('authenticated');
    } catch (error) {
      clearAccessToken();
      await clearStoredSession();
      setSession(null);
      setStatus('unauthenticated');

      if (error instanceof ApiError) {
        setAuthError(error.message || 'Nao foi possivel entrar no app.');
        return;
      }

      setAuthError('Nao foi possivel entrar no app. Tente novamente.');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user || null,
    status,
    isAuthenticated: status === 'authenticated',
    authError,
    hasModule: (moduleCode: string) => {
      const normalizedKey = normalizeToken(moduleCode);
      const modules = session?.user?.modulos_habilitados || {};

      if (!normalizedKey) return true;
      if (isSuperadmin(session)) return true;
      if (!Object.keys(modules).length) return true;

      return Object.prototype.hasOwnProperty.call(modules, normalizedKey)
        ? Boolean(modules[normalizedKey])
        : true;
    },
    clearAuthError: () => setAuthError(null),
    signIn,
    signOut
  }), [authError, session, signIn, signOut, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de AuthProvider');
  }

  return context;
}
