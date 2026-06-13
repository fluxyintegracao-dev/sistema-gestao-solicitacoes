import { API_URL, authHeaders } from '../../../services/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/governanca${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.error || 'Falha ao acessar governanca do sistema');
  }

  return response.json();
}

export function getGovernancaDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/dashboard${query ? `?${query}` : ''}`);
}

export function gerarGovernancaSnapshot(dataReferencia) {
  return request('/snapshots/gerar', {
    method: 'POST',
    body: JSON.stringify(dataReferencia ? { data_referencia: dataReferencia } : {})
  });
}

export function buildGovernancaExportUrl({ type = 'dashboard', format = 'csv' } = {}) {
  const query = new URLSearchParams({ type, format }).toString();
  return `${API_URL}/governanca/export?${query}`;
}
