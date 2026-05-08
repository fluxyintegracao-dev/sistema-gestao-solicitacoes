import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../services/api';
import { useAuth } from './AuthContext';

const LiveUpdatesContext = createContext({
  connectionState: 'idle',
  subscribe: () => () => {}
});

function buildStreamUrl() {
  return `${API_URL}/live-updates?topics=solicitacoes`;
}

export function LiveUpdatesProvider({ children }) {
  const { authReady, isAuthenticated } = useAuth();
  const listenersRef = useRef(new Set());
  const sourceRef = useRef(null);
  const [connectionState, setConnectionState] = useState('idle');

  const subscribe = useMemo(() => (
    (listener) => {
      if (typeof listener !== 'function') {
        return () => {};
      }

      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    }
  ), []);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    if (!isAuthenticated) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnectionState('idle');
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      setConnectionState('unsupported');
      return undefined;
    }

    setConnectionState('connecting');

    const source = new window.EventSource(buildStreamUrl(), {
      withCredentials: true
    });
    sourceRef.current = source;

    const handleConnected = () => {
      setConnectionState('open');
    };

    const handleRealtime = (event) => {
      try {
        const payload = JSON.parse(event.data);
        listenersRef.current.forEach((listener) => {
          try {
            listener(payload);
          } catch (error) {
            console.error('Erro ao processar evento em tempo real', error);
          }
        });
      } catch (error) {
        console.error('Erro ao interpretar evento em tempo real', error);
      }
    };

    const handleError = () => {
      setConnectionState('error');
    };

    source.addEventListener('connected', handleConnected);
    source.addEventListener('fluxy.realtime', handleRealtime);
    source.onerror = handleError;

    return () => {
      source.removeEventListener('connected', handleConnected);
      source.removeEventListener('fluxy.realtime', handleRealtime);
      source.close();

      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
    };
  }, [authReady, isAuthenticated]);

  return (
    <LiveUpdatesContext.Provider
      value={{
        connectionState,
        subscribe
      }}
    >
      {children}
    </LiveUpdatesContext.Provider>
  );
}

export function useLiveUpdates() {
  return useContext(LiveUpdatesContext);
}

export function useLiveUpdateSubscription({
  enabled = true,
  filter,
  onEvent,
  fallbackRefresh,
  fallbackMs = 45 * 1000
} = {}) {
  const { connectionState, subscribe } = useLiveUpdates();
  const onEventRef = useRef(onEvent);
  const filterRef = useRef(filter);
  const fallbackRef = useRef(fallbackRefresh);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    fallbackRef.current = fallbackRefresh;
  }, [fallbackRefresh]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return subscribe((payload) => {
      if (typeof filterRef.current === 'function' && !filterRef.current(payload)) {
        return;
      }

      if (typeof onEventRef.current === 'function') {
        onEventRef.current(payload);
      }
    });
  }, [enabled, subscribe]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (connectionState === 'open') {
      return undefined;
    }

    if (typeof fallbackRef.current !== 'function') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      fallbackRef.current?.();
    }, Math.max(30 * 1000, Number(fallbackMs || 45 * 1000)));

    return () => {
      window.clearInterval(interval);
    };
  }, [connectionState, enabled, fallbackMs]);

  return {
    connectionState
  };
}
