import { API_URL, authHeaders } from './api';

// Preferências de exibição e filtros nomeados das listas (ListaAvancada),
// persistidos NO BANCO por usuário e por lista — sobrevivem a troca de
// máquina, celular e limpeza de cache do navegador.

async function parseResponse(response, defaultError) {
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }
  let message = defaultError;
  try {
    const data = await response.json();
    message = data?.error || message;
  } catch {
    // sem body json
  }
  throw new Error(message);
}

export async function getListaPreferencias(lista) {
  const response = await fetch(`${API_URL}/listas/${encodeURIComponent(lista)}/preferencias`, {
    headers: authHeaders()
  });
  const data = await parseResponse(response, 'Erro ao carregar preferências da lista');
  return data?.preferencias || {};
}

export async function salvarListaPreferencias(lista, preferencias) {
  const response = await fetch(`${API_URL}/listas/${encodeURIComponent(lista)}/preferencias`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ preferencias })
  });
  return parseResponse(response, 'Erro ao salvar preferências da lista');
}

export async function getFiltrosSalvos(lista) {
  const response = await fetch(`${API_URL}/listas/${encodeURIComponent(lista)}/filtros`, {
    headers: authHeaders()
  });
  const data = await parseResponse(response, 'Erro ao carregar filtros salvos');
  return Array.isArray(data) ? data : [];
}

export async function salvarFiltroNomeado(lista, nome, filtros) {
  const response = await fetch(`${API_URL}/listas/${encodeURIComponent(lista)}/filtros`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nome, filtros })
  });
  return parseResponse(response, 'Erro ao salvar filtro');
}

export async function excluirFiltroNomeado(lista, id) {
  const response = await fetch(`${API_URL}/listas/${encodeURIComponent(lista)}/filtros/${Number(id)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return parseResponse(response, 'Erro ao excluir filtro');
}
