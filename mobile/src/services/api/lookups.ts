import { apiRequest, buildQueryString } from './client';
import type {
  ApropriacaoOption,
  AreasObraConfig,
  AreasPorSetorOrigemConfig,
  ContratoOption,
  ObraOption,
  SetorOption,
  TipoSolicitacaoOption,
  TipoSubContratoOption,
  TiposSolicitacaoPorSetorConfig,
  UsuarioPublicoOption
} from './types';

export async function getMinhasObras() {
  return apiRequest<ObraOption[]>(`/obras/minhas${buildQueryString({ modo: 'CRIACAO' })}`);
}

export async function getSolicitacoesObrasVisiveis() {
  return apiRequest<ObraOption[]>('/solicitacoes/filtros/obras');
}

export async function getTiposSolicitacao() {
  return apiRequest<TipoSolicitacaoOption[]>('/tipos-solicitacao');
}

export async function getSetores() {
  return apiRequest<SetorOption[]>('/setores');
}

export async function getUsuariosLista() {
  return apiRequest<UsuarioPublicoOption[]>('/usuarios-lista');
}

export async function getAreasObra() {
  return apiRequest<AreasObraConfig>('/configuracoes/areas-obra');
}

export async function getAreasPorSetorOrigem() {
  return apiRequest<AreasPorSetorOrigemConfig>('/configuracoes/areas-por-setor-origem');
}

export async function getTiposSolicitacaoPorSetor() {
  return apiRequest<TiposSolicitacaoPorSetorConfig>('/configuracoes/tipos-solicitacao-por-setor');
}

export async function getTiposSubContrato(tipo_macro_id?: string | number) {
  return apiRequest<TipoSubContratoOption[]>(
    `/tipos-sub-contrato${buildQueryString({ tipo_macro_id })}`
  );
}

export async function getContratos({
  obra_id,
  ref,
  modo
}: {
  obra_id?: string | number;
  ref?: string;
  modo?: string;
} = {}) {
  return apiRequest<ContratoOption[]>(
    `/contratos${buildQueryString({ obra_id, ref, modo })}`
  );
}

export async function getApropriacoes({
  obra_id
}: {
  obra_id?: string | number;
} = {}) {
  return apiRequest<ApropriacaoOption[]>(
    `/compras/apropriacoes${buildQueryString({ obra_id })}`
  );
}
