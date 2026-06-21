import { API_URL, authHeaders } from './api';

async function getErrorMessage(res, fallback) {
  const data = await res.json().catch(() => null);
  return data?.error || fallback;
}

export async function getTiposSolicitacao() {
  const res = await fetch(`${API_URL}/tipos-solicitacao`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao buscar tipos'));
  return res.json();
}

export async function criarTipoSolicitacao(data) {
  const res = await fetch(`${API_URL}/tipos-solicitacao`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao criar tipo'));
  return res.json();
}

export async function atualizarTipoSolicitacao(id, data) {
  const res = await fetch(`${API_URL}/tipos-solicitacao/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error(await getErrorMessage(res, 'Erro ao atualizar tipo'));
  return res.json();
}

export async function ativarTipoSolicitacao(id) {
  const res = await fetch(`${API_URL}/tipos-solicitacao/${id}/ativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao ativar tipo'));
  }
}

export async function desativarTipoSolicitacao(id) {
  const res = await fetch(`${API_URL}/tipos-solicitacao/${id}/desativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao desativar tipo'));
  }
}

export async function excluirTipoSolicitacao(id) {
  const res = await fetch(`${API_URL}/tipos-solicitacao/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Erro ao excluir tipo'));
  }
}
