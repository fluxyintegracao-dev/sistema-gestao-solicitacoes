import { API_URL, authHeaders } from './api';

function buildUrl(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, value);
  });
  const suffix = query.toString();
  return suffix ? `${API_URL}${path}?${suffix}` : `${API_URL}${path}`;
}

async function parseJsonOrThrow(res, fallbackMessage) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body;
}

export async function getProvisionamentoFinanceiroContexto() {
  const res = await fetch(`${API_URL}/provisoes-financeiras/contexto`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao buscar contexto do provisionamento financeiro');
}

export async function getProvisionamentoFinanceiroPermissoes() {
  const res = await fetch(`${API_URL}/configuracoes/provisoes-financeiras/permissoes`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao buscar permissoes do provisionamento financeiro');
}

export async function salvarProvisionamentoFinanceiroPermissoes(data) {
  const res = await fetch(`${API_URL}/configuracoes/provisoes-financeiras/permissoes`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao salvar permissoes do provisionamento financeiro');
}

export async function listarCategoriasMacroProvisionamento(params = {}) {
  const res = await fetch(buildUrl('/provisoes-financeiras/categorias', params), {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao buscar categorias macro do provisionamento financeiro');
}

export async function criarCategoriaMacroProvisionamento(data) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/categorias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao criar categoria macro do provisionamento financeiro');
}

export async function atualizarCategoriaMacroProvisionamento(id, data) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao atualizar categoria macro do provisionamento financeiro');
}

export async function ativarCategoriaMacroProvisionamento(id) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}/ativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao ativar categoria macro do provisionamento financeiro');
}

export async function desativarCategoriaMacroProvisionamento(id) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}/desativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao desativar categoria macro do provisionamento financeiro');
}

export async function listarProvisoesFinanceiras(params = {}) {
  const res = await fetch(buildUrl('/provisoes-financeiras', params), {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao listar provisoes financeiras');
}

export async function exportarProvisoesFinanceirasCsv(params = {}) {
  const res = await fetch(buildUrl('/provisoes-financeiras/exportar', params), {
    headers: authHeaders()
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao exportar provisoes financeiras');
  }

  return res.blob();
}

export async function getProvisaoFinanceira(id) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao buscar provisao financeira');
}

export async function criarProvisaoFinanceira(data) {
  const res = await fetch(`${API_URL}/provisoes-financeiras`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao criar provisao financeira');
}

export async function atualizarProvisaoFinanceira(id, data) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao atualizar provisao financeira');
}

export async function listarHistoricoProvisaoFinanceira(id) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}/historico`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao listar historico da provisao financeira');
}

export async function adicionarComentarioProvisaoFinanceira(id, data) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}/comentarios`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow(res, 'Erro ao adicionar comentario na provisao financeira');
}

export async function uploadAnexosProvisaoFinanceira(id, files) {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => formData.append('files', file));

  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}/anexos`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJsonOrThrow(res, 'Erro ao enviar anexos da provisao financeira');
}

export async function listarAnexosProvisaoFinanceira(id) {
  const res = await fetch(`${API_URL}/provisoes-financeiras/${id}/anexos`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(res, 'Erro ao listar anexos da provisao financeira');
}

export async function obterUrlAssinadaAnexoProvisaoFinanceira(url) {
  const alvo = encodeURIComponent(url || '');
  const res = await fetch(`${API_URL}/provisoes-financeiras/anexos/presign?url=${alvo}`, {
    headers: authHeaders()
  });

  const body = await parseJsonOrThrow(res, 'Erro ao gerar URL assinada do anexo');
  return body?.url || '';
}
