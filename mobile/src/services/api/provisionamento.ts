import { apiRequest, buildQueryString } from './client';
import type {
  DashboardProvisionamentoResumo,
  MobileUploadAsset,
  ProvisionamentoContexto,
  ProvisionamentoDetalhe,
  ProvisionamentoPaginatedResponse,
  ProvisionamentoCategoriaOption
} from './types';

export interface ProvisionamentoListQuery {
  page?: number;
  limit?: number;
  obra_id?: string | number;
  categoria_macro_id?: string | number;
  status?: string;
  prioridade?: string;
  busca?: string;
  fornecedor?: string;
  data_inicial?: string;
  data_final?: string;
  valor_minimo?: string | number;
  valor_maximo?: string | number;
  usuario_criacao_id?: string | number;
  sort_by?: string;
  sort_dir?: string;
}

export async function getProvisionamentoFinanceiroContexto() {
  return apiRequest<ProvisionamentoContexto>('/provisoes-financeiras/contexto');
}

export async function listarCategoriasMacroProvisionamento(params: Record<string, string | number | boolean | null | undefined> = {}) {
  return apiRequest<ProvisionamentoCategoriaOption[]>(`/provisoes-financeiras/categorias${buildQueryString(params)}`);
}

export async function listarProvisoesFinanceiras(params: ProvisionamentoListQuery = {}) {
  return apiRequest<ProvisionamentoPaginatedResponse>(
    `/provisoes-financeiras${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`
  );
}

export async function getProvisaoFinanceira(id: string | number) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}`);
}

export async function criarProvisaoFinanceira(payload: Record<string, unknown>) {
  return apiRequest<ProvisionamentoDetalhe>('/provisoes-financeiras', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function atualizarProvisaoFinanceira(id: string | number, payload: Record<string, unknown>) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function atualizarStatusProvisaoFinanceira(id: string | number, payload: { status: string; comentario?: string }) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function aprovarProvisaoFinanceira(id: string | number, payload: { comentario?: string } = {}) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}/aprovar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function cancelarProvisaoFinanceira(id: string | number, payload: { comentario?: string } = {}) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}/cancelar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function realizarProvisaoFinanceira(id: string | number, payload: { comentario?: string } = {}) {
  return apiRequest<ProvisionamentoDetalhe>(`/provisoes-financeiras/${id}/realizar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function adicionarComentarioProvisaoFinanceira(id: string | number, payload: { comentario: string }) {
  return apiRequest<ProvisionamentoHistoricoComentario>(`/provisoes-financeiras/${id}/comentarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

type ProvisionamentoHistoricoComentario = {
  id: number;
  comentario?: string | null;
};

export async function uploadAnexosProvisaoFinanceira(id: string | number, files: MobileUploadAsset[]) {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name || `arquivo-${index + 1}`,
      type: file.type || 'application/octet-stream'
    } as never);
  });

  return apiRequest(`/provisoes-financeiras/${id}/anexos`, {
    method: 'POST',
    body: formData
  });
}

export async function obterUrlAssinadaAnexoProvisaoFinanceira(url: string) {
  const query = buildQueryString({ url });
  const response = await apiRequest<{ url?: string }>(`/provisoes-financeiras/anexos/presign${query}`);
  return response?.url || '';
}

export async function getDashboardProvisionamentoFinanceiro(params: Record<string, string | number | boolean | null | undefined> = {}) {
  return apiRequest<DashboardProvisionamentoResumo>(`/provisoes-financeiras/dashboard/resumo${buildQueryString(params)}`);
}
