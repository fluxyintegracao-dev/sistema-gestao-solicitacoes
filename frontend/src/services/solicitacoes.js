import { API_URL, authHeaders } from './api';

function buildResponseError(status, fallbackMessage, data = null) {
  const details = Array.isArray(data?.errors)
    ? data.errors.map((item) => item?.message || item?.error || item).filter(Boolean).join('\n')
    : '';
  const message = data?.error || data?.message || data?.erro || data?.details || details || fallbackMessage;
  const error = new Error(message);
  error.status = Number(status || 0) || 0;
  error.data = data;
  return error;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

export async function getSolicitacoes(params = '') {
  const res = await fetch(`${API_URL}/solicitacoes${params}`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao buscar solicitacoes', await parseJsonSafe(res));
  }

  return res.json();
}

export async function getObrasVisiveisSolicitacoes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/solicitacoes/filtros/obras?${query}`
    : `${API_URL}/solicitacoes/filtros/obras`;

  const res = await fetch(url, {
    headers: authHeaders()
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao buscar obras visiveis das solicitacoes', await parseJsonSafe(res));
  }

  return res.json();
}

export async function obterRelatorioSolicitacoesOperacional(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const url = query.toString()
    ? `${API_URL}/solicitacoes/relatorios/operacional?${query.toString()}`
    : `${API_URL}/solicitacoes/relatorios/operacional`;

  const res = await fetch(url, {
    headers: authHeaders()
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao buscar relatorio operacional de solicitacoes', await parseJsonSafe(res));
  }

  return res.json();
}

export async function createSolicitacao(data, options = {}) {
  const headers = authHeaders({ 'Content-Type': 'application/json' });
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const res = await fetch(`${API_URL}/solicitacoes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const json = await parseJsonSafe(res);
    throw buildResponseError(res.status, 'Erro ao criar solicitacao', json);
  }

  return res.json();
}

export async function getSolicitacaoById(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao buscar solicitacao', await parseJsonSafe(res));
  }

  return res.json();
}

export async function getSolicitacaoResumoLista(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/resumo-lista`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao buscar resumo da solicitacao', await parseJsonSafe(res));
  }

  return res.json();
}

export async function updateStatusSolicitacao(id, status) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function aprovarDiretoriaSolicitacao(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/aprovar-diretoria`, {
    method: 'POST',
    headers: authHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function adicionarPagamentoSolicitacao(id, data) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/pagamentos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}

export async function atualizarPendenciaFinanceiraSolicitacao(id, data) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/pendencia-financeira`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao atualizar pendencia financeira da solicitacao', await parseJsonSafe(res));
  }

  return res.json();
}

export async function updateValorSolicitacao(id, valor) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/valor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ valor })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function updateDataVencimentoSolicitacao(id, data_vencimento) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/data-vencimento`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ data_vencimento: data_vencimento || null })
  });

  if (!res.ok) {
    throw buildResponseError(res.status, 'Erro ao atualizar data de vencimento', await parseJsonSafe(res));
  }

  return true;
}

export async function updateRefContratoSolicitacao(id, contrato_id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/ref-contrato`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ contrato_id })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function deleteSolicitacao(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function arquivarSolicitacao(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/arquivar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function desarquivarSolicitacao(id) {
  const res = await fetch(`${API_URL}/solicitacoes/${id}/desarquivar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

export async function arquivarSolicitacoesEmMassa(solicitacao_ids = []) {
  const res = await fetch(`${API_URL}/solicitacoes/arquivar-massa`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ solicitacao_ids })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}

export async function enviarSolicitacoesParaSetorEmMassa({ solicitacao_ids, setor_destino }) {
  const res = await fetch(`${API_URL}/solicitacoes/enviar-setor-massa`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ solicitacao_ids, setor_destino })
  });

  if (!res.ok) {
    const json = await parseJsonSafe(res);
    throw buildResponseError(res.status, 'Erro ao enviar solicitacoes em massa', json);
  }

  return res.json();
}
