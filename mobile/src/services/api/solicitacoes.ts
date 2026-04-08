import { apiRequest, buildQueryString } from './client';
import type {
  AddComentarioPayload,
  ApiPaginatedResponse,
  CreateSolicitacaoPayload,
  MobileUploadAsset,
  ResumoSolicitacoes,
  SolicitacaoDetalhe,
  SolicitacaoListItem
} from './types';
import {
  normalizeSolicitacaoDetalhe,
  normalizeSolicitacaoListItem
} from '../../utils/solicitacoes';

export interface SolicitacoesQuery {
  page?: number;
  limit?: number;
  codigo?: string;
  status?: string;
  obra_ids?: string;
  area?: string;
  tipo_solicitacao_id?: string;
  responsavel?: string;
}

export async function getSolicitacoesPage(params: SolicitacoesQuery = {}) {
  const query = buildQueryString({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    codigo: params.codigo,
    status: params.status,
    obra_ids: params.obra_ids,
    area: params.area,
    tipo_solicitacao_id: params.tipo_solicitacao_id,
    responsavel: params.responsavel
  });

  const response = await apiRequest<ApiPaginatedResponse<SolicitacaoListItem>>(`/solicitacoes${query}`);
  return {
    ...response,
    items: (response.items || []).map(normalizeSolicitacaoListItem)
  };
}

export async function getSolicitacoesResumo() {
  return apiRequest<ResumoSolicitacoes>('/solicitacoes/resumo');
}

export async function getSolicitacaoById(id: string | number) {
  const response = await apiRequest<SolicitacaoDetalhe>(`/solicitacoes/${id}`);
  return normalizeSolicitacaoDetalhe(response);
}

export async function createSolicitacao(payload: CreateSolicitacaoPayload) {
  const response = await apiRequest<SolicitacaoDetalhe>('/solicitacoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return normalizeSolicitacaoDetalhe(response);
}

export async function addSolicitacaoComment(id: string | number, payload: AddComentarioPayload) {
  return apiRequest(`/solicitacoes/${id}/comentarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function assumirSolicitacao(id: string | number) {
  return apiRequest(`/solicitacoes/${id}/assumir`, {
    method: 'POST'
  });
}

export async function atualizarStatusSolicitacao(id: string | number, status: string) {
  return apiRequest(`/solicitacoes/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
}

export async function enviarSolicitacaoParaSetor(id: string | number, setorDestino: string) {
  return apiRequest(`/solicitacoes/${id}/enviar-setor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ setor_destino: setorDestino })
  });
}

export async function getSignedAttachmentUrl(url: string) {
  const query = buildQueryString({ url });
  const result = await apiRequest<{ url?: string }>(`/anexos/presign${query}`);
  return result?.url || url;
}

export async function uploadSolicitacaoArquivos({
  solicitacaoId,
  files,
  tipo = 'ANEXO'
}: {
  solicitacaoId: string | number;
  files: MobileUploadAsset[];
  tipo?: 'ANEXO' | 'COMPROVANTE';
}) {
  const formData = new FormData();
  formData.append('solicitacao_id', String(solicitacaoId));
  formData.append('tipo', tipo);

  files.forEach((file, index) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name || `arquivo-${index + 1}`,
      type: file.type || 'application/octet-stream'
    } as never);
  });

  return apiRequest('/anexos/upload', {
    method: 'POST',
    body: formData
  });
}
