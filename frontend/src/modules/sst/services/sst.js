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

export async function getSstExecutivo(params = {}) {
  const res = await fetch(`${API_URL}/sst/executivo${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar dashboard executivo SST');
}

export async function getSstHeatmap(params = {}) {
  const res = await fetch(`${API_URL}/sst/heatmap${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar heatmap SST');
}

export async function getSstCentroOperacional(params = {}) {
  const res = await fetch(`${API_URL}/sst/centro-operacional${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar centro operacional SST');
}

export async function getSstFeatureFlags() {
  const res = await fetch(`${API_URL}/sst/feature-flags`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar feature flags SST');
}

export async function getSstObservabilidade(params = {}) {
  const res = await fetch(`${API_URL}/sst/observabilidade${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar observabilidade SST');
}

export async function getSstChecklistHomologacao() {
  const res = await fetch(`${API_URL}/sst/homologacao/checklist`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar checklist de homologacao SST');
}

export async function homologarWorkflowsSst(payload = {}) {
  const res = await fetch(`${API_URL}/sst/homologacao/workflows`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao homologar workflows SST');
}

export async function simularHomologacaoSst() {
  const res = await fetch(`${API_URL}/sst/homologacao/simular`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao simular homologacao SST');
}

export async function getSstInteligenciaOperacional(params = {}) {
  const res = await fetch(`${API_URL}/sst/inteligencia-operacional${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar inteligencia operacional SST');
}

export async function gerarRecomendacoesSst(params = {}) {
  const res = await fetch(`${API_URL}/sst/recomendacoes/gerar${toQuery(params)}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao gerar recomendacoes SST');
}

export async function recalcularScoreSst(params = {}) {
  const res = await fetch(`${API_URL}/sst/scores/recalcular${toQuery(params)}`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao recalcular score SST');
}

export async function getSstTimeline(colaboradorId) {
  const res = await fetch(`${API_URL}/sst/timeline/${colaboradorId}`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar timeline SST');
}

export async function revisarConformidadeSst(colaboradorId, payload = {}) {
  const res = await fetch(`${API_URL}/sst/workflows/revisar-colaborador/${colaboradorId}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao revisar conformidade SST');
}

export async function avaliarBloqueiosSst(colaboradorId) {
  const res = await fetch(`${API_URL}/sst/bloqueios/colaborador/${colaboradorId}/avaliar`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao avaliar bloqueios SST');
}

export async function sincronizarNotificacoesSst() {
  const res = await fetch(`${API_URL}/sst/notificacoes/sincronizar`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao sincronizar notificacoes SST');
}

export async function getSstPredictionReadiness() {
  const res = await fetch(`${API_URL}/sst/prediction/readiness`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao carregar prontidao preditiva SST');
}

export async function processarAutomacoesSst(payload = {}) {
  const res = await fetch(`${API_URL}/sst/automation/processar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao processar automacoes SST');
}

export async function processarWorkflowsSst(payload = {}) {
  const res = await fetch(`${API_URL}/sst/workflows/processar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao processar workflows SST');
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

export async function analisarDocumentoIaSst(id, payload = {}) {
  const res = await fetch(`${API_URL}/sst/documentos/${id}/analisar-ia`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  return parseResponse(res, 'Erro ao analisar documento SST com IA');
}

export async function sincronizarEventosVencimentoSst() {
  const res = await fetch(`${API_URL}/sst/eventos/sincronizar-vencimentos`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao sincronizar eventos SST');
}
