import { API_URL, authHeaders } from './api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    if (!text) {
      throw new Error(fallbackMessage);
    }

    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.error || fallbackMessage);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || fallbackMessage);
      }
      throw error;
    }
  }

  return text ? JSON.parse(text) : null;
}

function buildQuery(params = {}) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
}

export async function getIntegracaoSiengeConfig() {
  const response = await fetch(`${API_URL}/integracoes/sienge/config`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar configuracao da Integracao SIENGE');
}

export async function salvarIntegracaoSiengeConfig(data) {
  const response = await fetch(`${API_URL}/integracoes/sienge/config`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao salvar configuracao da Integracao SIENGE');
}

export async function getIntegracaoSiengeSaude() {
  const response = await fetch(`${API_URL}/integracoes/sienge/saude`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao avaliar prontidao da Integracao SIENGE');
}

export async function getIntegracaoSiengeCredorParceiroContexto(parceiroId) {
  const response = await fetch(`${API_URL}/integracoes/sienge/credores/parceiros/${parceiroId}/contexto`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar o contexto do credor SIENGE para o parceiro');
}

export async function salvarIntegracaoSiengeCredorParceiroMapeamento(parceiroId, data) {
  const response = await fetch(`${API_URL}/integracoes/sienge/credores/parceiros/${parceiroId}/mapeamento`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao salvar o mapeamento do credor SIENGE para o parceiro');
}

export async function buscarIntegracaoSiengeCredorParceiro(parceiroId, data = {}) {
  const response = await fetch(`${API_URL}/integracoes/sienge/credores/parceiros/${parceiroId}/buscar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao buscar credor SIENGE para o parceiro');
}

export async function cadastrarIntegracaoSiengeCredorParceiro(parceiroId, data = {}) {
  const response = await fetch(`${API_URL}/integracoes/sienge/credores/parceiros/${parceiroId}/cadastrar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao cadastrar credor SIENGE para o parceiro');
}

export async function getIntegracaoSiengeFila(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/integracoes/sienge/fila?${query}` : `${API_URL}/integracoes/sienge/fila`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao listar fila da Integracao SIENGE');
}

export async function criarIntegracaoSiengeFila(data) {
  const response = await fetch(`${API_URL}/integracoes/sienge/fila`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao preparar item para a fila SIENGE');
}

export async function reprocessarIntegracaoSiengeFila(id, data = {}) {
  const response = await fetch(`${API_URL}/integracoes/sienge/fila/${id}/reprocessar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao reprocessar item da fila SIENGE');
}

export async function getIntegracaoSiengeLogs(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/integracoes/sienge/logs?${query}` : `${API_URL}/integracoes/sienge/logs`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao listar logs da Integracao SIENGE');
}

export async function importarCargaInicialSienge(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/integracoes/sienge/carga-inicial`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao importar carga inicial SIENGE');
}

export async function baixarModeloCargaInicialSienge() {
  const response = await fetch(`${API_URL}/integracoes/sienge/carga-inicial/modelo`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    await parseJson(response, 'Erro ao baixar modelo da carga inicial SIENGE');
  }

  return response.blob();
}
