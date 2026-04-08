import { apiRequest, buildQueryString } from './client';
import type { ParceiroCategoriaOption, ParceiroResumo } from './types';

export interface BuscarParceirosParams {
  q?: string;
  nome?: string;
  cpf_cnpj?: string;
  fornecedor?: string | number | boolean;
  cliente?: string | number | boolean;
  categoria_id?: string | number;
  incluir_categorias?: string | number | boolean;
  ativo?: string | number | boolean;
  limit?: string | number;
}

export interface CriarParceiroPayload {
  cpf_cnpj: string;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  estado?: string;
  categoria_ids?: number[];
}

export async function buscarParceiros(params: BuscarParceirosParams = {}) {
  return apiRequest<ParceiroResumo[]>(
    `/parceiros${buildQueryString(params as Record<string, string | number | boolean | null | undefined>)}`
  );
}

export async function criarParceiro(payload: CriarParceiroPayload) {
  return apiRequest<ParceiroResumo>('/parceiros', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function listarCategoriasParceiro() {
  return apiRequest<ParceiroCategoriaOption[]>('/parceiros/categorias');
}
