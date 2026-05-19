import { API_URL, authHeaders } from './api';

async function tratarResposta(res, fallback) {
  if (res.ok) {
    return res.status === 204 ? true : res.json();
  }

  let mensagem = fallback;
  let payload = null;
  try {
    payload = await res.json();
    mensagem = payload?.error || mensagem;
  } catch (_) {
    try {
      const text = await res.text();
      if (text) mensagem = text;
    } catch (_) {}
  }
  const error = new Error(mensagem);
  error.data = payload;
  throw error;
}

export async function getPrioridadesDiretoriaContexto() {
  const res = await fetch(`${API_URL}/prioridades-diretoria/contexto`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao buscar contexto de prioridades');
}

export async function listarLotesPrioridadeDiretoria(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/prioridades-diretoria/lotes?${query}`
    : `${API_URL}/prioridades-diretoria/lotes`;
  const res = await fetch(url, {
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

export async function solicitarUrgenciaPrioridadeDiretoria(data) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/solicitar-urgencia`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return tratarResposta(res, 'Erro ao solicitar prioridade para o financeiro');
}

export async function getLotePrioridadeDiretoria(id) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}`, {
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao buscar lote de prioridade');
}

export async function getSolicitacoesDisponiveisPrioridadeDiretoria(id, params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([chave, valor]) => {
    if (Array.isArray(valor)) {
      valor
        .filter((item) => item !== undefined && item !== null && String(item).trim() !== '')
        .forEach((item) => queryParams.append(chave, item));
      return;
    }
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      queryParams.append(chave, valor);
    }
  });
  const query = queryParams.toString();
  const url = query
    ? `${API_URL}/prioridades-diretoria/lotes/${id}/solicitacoes-disponiveis?${query}`
    : `${API_URL}/prioridades-diretoria/lotes/${id}/solicitacoes-disponiveis`;
  const res = await fetch(url, {
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

export async function salvarSelecaoLotePrioridadeDiretoria(id, data) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/salvar-selecao`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return tratarResposta(res, 'Erro ao salvar selecao do lote de prioridade');
}

export async function finalizarPedidoPrioridadeDiretoria(id, data) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/finalizar-pedido`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return tratarResposta(res, 'Erro ao finalizar pedido de prioridade');
}

export async function reabrirLotePrioridadeDiretoria(id) {
  const res = await fetch(`${API_URL}/prioridades-diretoria/lotes/${id}/reabrir`, {
    method: 'POST',
    headers: authHeaders()
  });
  return tratarResposta(res, 'Erro ao reabrir lote de prioridade');
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
