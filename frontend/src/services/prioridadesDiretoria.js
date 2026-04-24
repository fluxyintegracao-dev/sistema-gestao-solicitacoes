import { API_URL, authHeaders } from './api';

async function tratarResposta(res, fallback) {
  if (res.ok) {
    return res.status === 204 ? true : res.json();
  }

  let mensagem = fallback;
  try {
    const json = await res.json();
    mensagem = json?.error || mensagem;
  } catch {
    try {
      const text = await res.text();
      if (text) mensagem = text;
    } catch {
      // mantem fallback
    }
  }
  throw new Error(mensagem);
}

function montarQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, value);
    }
  });
  return query.toString();
}

export async function getPrioridadesDiretoriaContexto() {
  const res = await fetch(`${API_URL}/prioridades-diretoria/contexto`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao buscar contexto de prioridades');
}

export async function listarLotesPrioridadeDiretoria(params = {}) {
  const query = montarQuery(params);
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes${query ? `?${query}` : ''}`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao listar lotes de prioridade');
}

export async function criarLotePrioridadeDiretoria(data) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return tratarResposta(res, 'Erro ao criar lote de prioridade');
}

export async function getLotePrioridadeDiretoria(id) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao buscar lote de prioridade');
}

export async function getSolicitacoesDisponiveisPrioridadeDiretoria(id, params = {}) {
  const query = montarQuery(params);
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/solicitacoes-disponiveis${query ? `?${query}` : ''}`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao buscar solicitacoes elegiveis para prioridade');
}

export async function finalizarLotePrioridadeDiretoria(id, data) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/finalizar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return tratarResposta(res, 'Erro ao finalizar lote de prioridade');
}

export async function cancelarLotePrioridadeDiretoria(id) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/cancelar`, {
    method: 'POST',
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao cancelar lote de prioridade');
}

export async function excluirLotePrioridadeDiretoria(id) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao excluir lote de prioridade');
}
