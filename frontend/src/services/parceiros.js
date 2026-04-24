import { API_URL, authHeaders } from './api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }

  return text ? JSON.parse(text) : null;
}

export async function buscarParceiros(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/parceiros?${query}` : `${API_URL}/parceiros`;
  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar parceiros');
}

export async function criarParceiro(data) {
  const response = await fetch(`${API_URL}/parceiros`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar parceiro');
}

export async function atualizarParceiro(id, data) {
  const response = await fetch(`${API_URL}/parceiros/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar parceiro');
}

export async function listarCategoriasParceiro(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_URL}/parceiros/categorias?${query}` : `${API_URL}/parceiros/categorias`;
  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar categorias de parceiro');
}

export async function criarCategoriaParceiro(data) {
  const response = await fetch(`${API_URL}/parceiros/categorias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar categoria de parceiro');
}

export async function atualizarCategoriaParceiro(id, data) {
  const response = await fetch(`${API_URL}/parceiros/categorias/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar categoria de parceiro');
}

export async function desativarCategoriaParceiro(id) {
  const response = await fetch(`${API_URL}/parceiros/categorias/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao desativar categoria de parceiro');
}
