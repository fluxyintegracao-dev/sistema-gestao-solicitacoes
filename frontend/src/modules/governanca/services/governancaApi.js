import { API_URL, authHeaders, getAuditSessionId } from '../../../services/api';

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

function queryString(params = {}) {
  const clean = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== '' && value != null) acc[key] = value;
    return acc;
  }, {});
  const query = new URLSearchParams(clean).toString();
  return query ? `?${query}` : '';
}

export function registrarNavegacaoOperacional(payload) {
  return request('/auditoria-operacional/navegacao', {
    method: 'POST',
    body: JSON.stringify({ ...payload, sessao_id: getAuditSessionId() })
  });
}

export function getAuditoriaOperacionalResumo(params) {
  return request(`/auditoria-operacional/resumo${queryString(params)}`);
}

export function getAuditoriaOperacionalUsuarios(params) {
  return request(`/auditoria-operacional/usuarios${queryString(params)}`);
}

export function getAuditoriaOperacionalEventos(params) {
  return request(`/auditoria-operacional/eventos${queryString(params)}`);
}

export function getAuditoriaOperacionalOpcoes(params) {
  return request(`/auditoria-operacional/opcoes${queryString(params)}`);
}

export async function downloadAuditoriaOperacional(params) {
  const response = await fetch(`${API_URL}/governanca/auditoria-operacional/export${queryString(params)}`, {
    headers: authHeaders()
  });
  if (!response.ok) throw new Error('Nao foi possivel exportar a auditoria operacional.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `auditoria-operacional-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
