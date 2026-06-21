import { API_URL, authHeaders } from './api';

async function getErrorMessage(res, fallback) {
  const data = await res.json().catch(() => null);
  return data?.error || fallback;
}

export async function getTiposSubContrato({ tipo_macro_id, setor } = {}) {
  const params = new URLSearchParams();
  if (tipo_macro_id) params.set('tipo_macro_id', tipo_macro_id);
  if (setor) params.set('setor', setor);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/tipos-sub-contrato${query}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao buscar subtipos'));
  return res.json();
}

export async function criarTipoSubContrato(data) {
  const res = await fetch(`${API_URL}/tipos-sub-contrato`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao criar subtipo'));
  return res.json();
}

export async function atualizarTipoSubContrato(id, data) {
  const res = await fetch(`${API_URL}/tipos-sub-contrato/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao atualizar subtipo'));
  return res.json();
}

export async function ativarTipoSubContrato(id) {
  const res = await fetch(`${API_URL}/tipos-sub-contrato/${id}/ativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao ativar subtipo'));
  }
}

export async function desativarTipoSubContrato(id) {
  const res = await fetch(`${API_URL}/tipos-sub-contrato/${id}/desativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao desativar subtipo'));
  }
}

export async function excluirTipoSubContrato(id) {
  const res = await fetch(`${API_URL}/tipos-sub-contrato/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao excluir subtipo'));
  }
}
