import { API_URL, authHeaders } from './api';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = 'Erro ao processar requisição';
    try {
      const payload = await res.json();
      msg = payload.error || msg;
    } catch (e) {
      // ignore
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const listarObras = () => request('/py/obras');
export const listarCategorias = () => request('/py/categorias');
export const listarUnidades = () => request('/py/unidades');
export const listarInsumos = () => request('/py/insumos');
export const listarApropriacoes = (obra_id, search) => {
  const params = new URLSearchParams();
  if (obra_id) params.append('obra_id', obra_id);
  if (search) params.append('search', search);
  const qs = params.toString();
  return request(`/py/apropriacoes${qs ? `?${qs}` : ''}`);
};
export const listarRequisicoes = () => request('/py/requisicoes');

export const criarObra = (data) => request('/py/obras', { method: 'POST', body: data });
export const criarCategoria = (data) => request('/py/categorias', { method: 'POST', body: data });
export const criarUnidade = (data) => request('/py/unidades', { method: 'POST', body: data });
export const criarInsumo = (data) => request('/py/insumos', { method: 'POST', body: data });
export const criarRequisicao = (data) => request('/py/requisicoes', { method: 'POST', body: data });
export const criarApropriacao = (data) => request('/py/apropriacoes', { method: 'POST', body: data });
export const importarApropriacoes = (data) => request('/py/apropriacoes/bulk', { method: 'POST', body: data });

export async function exportarRequisicaoPdf(id) {
  const res = await fetch(`${API_URL}/py/requisicoes/${id}/export`, {
    headers: {
      ...authHeaders()
    }
  });
  if (!res.ok) {
    throw new Error('Erro ao exportar PDF');
  }
  return res.blob();
}
