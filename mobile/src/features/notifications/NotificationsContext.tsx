import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode
} from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas
} from '../../services/api/notificacoes';
import type { NotificacaoItem, NotificacoesResponse } from '../../services/api/types';

const TIPOS_SUPORTADOS = ['MENCAO_COMENTARIO'];

interface NotificationsContextValue {
  items: NotificacaoItem[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  markAsRead: (destinatarioId: number | string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function getQueryKey(userId?: number | null) {
  return ['notificacoes', 'mencoes', userId || 'anon'] as const;
}

function updateSingleReadState(
  current: NotificacoesResponse | undefined,
  destinatarioId: number | string
) {
  if (!current) return current;

  const nowIso = new Date().toISOString();
  const target = current.itens.find(
    (item) => Number(item.destinatario_id) === Number(destinatarioId)
  );
  const wasUnread = Boolean(target && !target.lida_em);

  return {
    ...current,
    total_nao_lidas: Math.max(0, current.total_nao_lidas - (wasUnread ? 1 : 0)),
    itens: current.itens.map((item) => (
      Number(item.destinatario_id) === Number(destinatarioId)
        ? { ...item, lida_em: item.lida_em || nowIso }
        : item
    ))
  };
}

function updateAllReadState(current: NotificacoesResponse | undefined) {
  if (!current) return current;

  const nowIso = new Date().toISOString();

  return {
    ...current,
    total_nao_lidas: 0,
    itens: current.itens.map((item) => ({
      ...item,
      lida_em: item.lida_em || nowIso
    }))
  };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const queryKey = useMemo(() => getQueryKey(user?.id), [user?.id]);

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: () => getNotificacoes({
      limit: 20,
      tipos: TIPOS_SUPORTADOS
    }),
    enabled: isAuthenticated && Boolean(user?.id),
    staleTime: 60_000,
    refetchInterval: isAuthenticated ? 120_000 : false,
    refetchIntervalInBackground: false
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    await notificationsQuery.refetch();
  }, [isAuthenticated, notificationsQuery, user?.id]);

  const markAsRead = useCallback(async (destinatarioId: number | string) => {
    await marcarNotificacaoLida(destinatarioId);
    queryClient.setQueryData<NotificacoesResponse | undefined>(
      queryKey,
      (current) => updateSingleReadState(current, destinatarioId)
    );
  }, [queryClient, queryKey]);

  const markAllAsRead = useCallback(async () => {
    await marcarTodasNotificacoesLidas();
    queryClient.setQueryData<NotificacoesResponse | undefined>(
      queryKey,
      (current) => updateAllReadState(current)
    );
  }, [queryClient, queryKey]);

  const value = useMemo<NotificationsContextValue>(() => ({
    items: notificationsQuery.data?.itens || [],
    unreadCount: notificationsQuery.data?.total_nao_lidas || 0,
    isLoading: notificationsQuery.isLoading,
    isRefreshing: notificationsQuery.isRefetching,
    refresh,
    markAsRead,
    markAllAsRead
  }), [
    markAllAsRead,
    markAsRead,
    notificationsQuery.data?.itens,
    notificationsQuery.data?.total_nao_lidas,
    notificationsQuery.isLoading,
    notificationsQuery.isRefetching,
    refresh
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications precisa ser usado dentro de NotificationsProvider');
  }

  return context;
}
