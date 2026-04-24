import { API_URL, authHeaders } from './api';

function handleJsonResponse(response, fallbackMessage) {
  return response.text().then((text) => {
    if (!response.ok) {
      throw new Error(text || fallbackMessage);
    }

    return text ? JSON.parse(text) : null;
  });
}

export async function listarApropriacoes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/apropriacoes?${query}`
    : `${API_URL}/apropriacoes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar apropriacoes');
}

export async function criarApropriacao(data) {
  const response = await fetch(`${API_URL}/apropriacoes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar apropriacao');
}

export async function atualizarApropriacao(id, data) {
  const response = await fetch(`${API_URL}/apropriacoes/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao atualizar apropriacao');
}

export async function deletarApropriacao(id) {
  const response = await fetch(`${API_URL}/apropriacoes/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao deletar apropriacao');
}
