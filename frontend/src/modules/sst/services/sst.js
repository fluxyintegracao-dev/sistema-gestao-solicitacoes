import { API_URL, authHeaders } from '../../../services/api';

async function parseResponse(res, fallbackMessage) {
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || fallbackMessage);
  }
  return res.json();
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getSstDashboard(params = {}) {
  const res = await fetch(`${API_URL}/sst/dashboard${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar dashboard SST');
}

export async function getSstRelatorioOperacional(params = {}) {
  const res = await fetch(`${API_URL}/sst/relatorio-operacional${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar relatorio operacional SST');
}

export async function getSstConfig() {
  const res = await fetch(`${API_URL}/sst/configuracoes`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar configuracoes SST');
}

export async function salvarSstConfig(payload) {
  const res = await fetch(`${API_URL}/sst/configuracoes`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao salvar configuracoes SST');
}

export async function listarSst(resource, params = {}) {
  const res = await fetch(`${API_URL}/sst/${resource}${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao listar registros SST');
}

export async function criarSst(resource, payload) {
  const res = await fetch(`${API_URL}/sst/${resource}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao criar registro SST');
}

export async function atualizarSst(resource, id, payload) {
  const res = await fetch(`${API_URL}/sst/${resource}/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao atualizar registro SST');
}

export async function uploadDocumentoSst(payload, file) {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, value);
    }
  });
  form.append('file', file);

  const res = await fetch(`${API_URL}/sst/documentos/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form
  });
  return parseResponse(res, 'Erro ao enviar documento SST');
}

export async function getDocumentoSstUrl(id) {
  const res = await fetch(`${API_URL}/sst/documentos/${id}/url`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao gerar link do documento SST');
}

export async function sincronizarEventosVencimentoSst() {
  const res = await fetch(`${API_URL}/sst/eventos/sincronizar-vencimentos`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao sincronizar eventos SST');
}
