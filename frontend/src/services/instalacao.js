import { API_URL, authHeaders } from './api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }

  return text ? JSON.parse(text) : null;
}

export async function getInstalacaoPublica() {
  const response = await fetch(`${API_URL}/instalacao/publica`);
  return parseJson(response, 'Erro ao buscar configuracao publica da instalacao');
}

export async function getInstalacao() {
  const response = await fetch(`${API_URL}/instalacao`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar configuracao da instalacao');
}

export async function salvarInstalacao(data) {
  const response = await fetch(`${API_URL}/instalacao`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao salvar configuracao da instalacao');
}
