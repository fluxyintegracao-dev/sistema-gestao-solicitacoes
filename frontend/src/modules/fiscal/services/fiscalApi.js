import { API_URL, authHeaders } from '../../../services/api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    if (!text) throw new Error(fallbackMessage);
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.error || fallbackMessage);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text || fallbackMessage);
      throw error;
    }
  }
  return text ? JSON.parse(text) : null;
}

function buildUrl(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  return query ? `${API_URL}${path}?${query}` : `${API_URL}${path}`;
}

export async function getFiscalHealth() {
  const response = await fetch(`${API_URL}/fiscal/health`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao consultar saude do modulo fiscal');
}

export async function getFiscalDashboard() {
  const response = await fetch(`${API_URL}/fiscal/dashboard`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar painel fiscal');
}

export async function getFiscalCompanies(params = {}) {
  const response = await fetch(buildUrl('/fiscal/companies', params), {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar empresas fiscais');
}

export async function createFiscalCompany(payload) {
  const response = await fetch(`${API_URL}/fiscal/companies`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseJson(response, 'Erro ao cadastrar empresa fiscal');
}

export async function updateFiscalCompany(id, payload) {
  const response = await fetch(`${API_URL}/fiscal/companies/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseJson(response, 'Erro ao atualizar empresa fiscal');
}

export async function getFiscalDocuments(params = {}) {
  const response = await fetch(buildUrl('/fiscal/documents', params), {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar documentos fiscais');
}

export async function getFiscalSyncLogs(params = {}) {
  const response = await fetch(buildUrl('/fiscal/sync/logs', params), {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar logs fiscais');
}
