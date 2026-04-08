import { apiRequest, buildQueryString } from './client';
import type { NotificacoesResponse } from './types';

interface NotificacoesQuery {
  limit?: number;
  nao_lidas?: boolean;
  tipos?: string[];
}

export async function getNotificacoes(params: NotificacoesQuery = {}) {
  const query = buildQueryString({
    limit: params.limit ?? 20,
    nao_lidas: params.nao_lidas ? 1 : undefined,
    tipos: params.tipos?.join(',')
  });

  return apiRequest<NotificacoesResponse>(`/notificacoes${query}`);
}

export async function marcarNotificacaoLida(destinatarioId: number | string) {
  return apiRequest<void>(`/notificacoes/${destinatarioId}/lida`, {
    method: 'PATCH'
  });
}

export async function marcarTodasNotificacoesLidas() {
  return apiRequest<void>('/notificacoes/lidas', {
    method: 'PATCH'
  });
}
