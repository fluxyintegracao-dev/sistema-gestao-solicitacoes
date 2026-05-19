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

export async function getEmpresasGrupo(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/empresas-grupo?${query}` : `${API_URL}/empresas-grupo`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar empresas do grupo');
}

export async function criarEmpresaGrupo(data) {
  const response = await fetch(`${API_URL}/empresas-grupo`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao criar empresa do grupo');
}

export async function atualizarEmpresaGrupo(id, data) {
  const response = await fetch(`${API_URL}/empresas-grupo/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao atualizar empresa do grupo');
}
