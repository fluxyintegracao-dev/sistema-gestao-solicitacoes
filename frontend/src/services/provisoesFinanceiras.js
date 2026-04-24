import { API_URL, authHeaders } from './api';

function buildUrl(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, value);
  });

  const suffix = query.toString();
  return suffix ? `${API_URL}${path}?${suffix}` : `${API_URL}${path}`;
}

async function parseJsonOrThrow(response, fallbackMessage) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body;
}

export async function getProvisionamentoFinanceiroContexto() {
  const response = await fetch(`${API_URL}/provisoes-financeiras/contexto`, {
    headers: authHeaders(),
    cache: 'no-store'
  });

  return parseJsonOrThrow(response, 'Erro ao carregar contexto do provisionamento');
}

export async function listarCategoriasMacroProvisionamento(params = {}) {
  const response = await fetch(buildUrl('/provisoes-financeiras/categorias', params), {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao listar categorias macro do provisionamento');
}

export async function criarCategoriaMacroProvisionamento(payload) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/categorias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao criar categoria macro do provisionamento');
}

export async function atualizarCategoriaMacroProvisionamento(id, payload) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao atualizar categoria macro do provisionamento');
}

export async function ativarCategoriaMacroProvisionamento(id) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}/ativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao ativar categoria macro do provisionamento');
}

export async function desativarCategoriaMacroProvisionamento(id) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/categorias/${id}/desativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao desativar categoria macro do provisionamento');
}

export async function listarProvisoesFinanceiras(params = {}) {
  const response = await fetch(buildUrl('/provisoes-financeiras', params), {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao listar provisionamentos');
}

export async function getDashboardProvisionamentoFinanceiro(params = {}) {
  const response = await fetch(buildUrl('/provisoes-financeiras/dashboard/resumo', params), {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao carregar dashboard do provisionamento');
}

export async function getProvisaoFinanceira(id) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao carregar detalhe do provisionamento');
}

export async function criarProvisaoFinanceira(payload) {
  const response = await fetch(`${API_URL}/provisoes-financeiras`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao criar provisionamento');
}

export async function atualizarProvisaoFinanceira(id, payload) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao atualizar provisionamento');
}

export async function adicionarComentarioProvisaoFinanceira(id, payload) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}/comentarios`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao registrar comentario do provisionamento');
}

export async function listarAnexosProvisaoFinanceira(id) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}/anexos`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao listar anexos do provisionamento');
}

export async function uploadAnexosProvisaoFinanceira(id, files) {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}/anexos`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJsonOrThrow(response, 'Erro ao enviar anexos do provisionamento');
}

export async function obterLinkAnexoProvisaoFinanceira(anexoId) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/anexos/${anexoId}/link`, {
    headers: authHeaders()
  });

  return parseJsonOrThrow(response, 'Erro ao gerar link do anexo do provisionamento');
}

async function executarAcaoStatus(id, acao, payload = {}) {
  const response = await fetch(`${API_URL}/provisoes-financeiras/${id}/${acao}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  return parseJsonOrThrow(response, 'Erro ao atualizar status do provisionamento');
}

export function enviarProvisionamentoParaAnalise(id, payload = {}) {
  return executarAcaoStatus(id, 'analise', payload);
}

export function aprovarProvisaoFinanceira(id, payload = {}) {
  return executarAcaoStatus(id, 'aprovar', payload);
}

export function cancelarProvisaoFinanceira(id, payload = {}) {
  return executarAcaoStatus(id, 'cancelar', payload);
}

export function realizarProvisaoFinanceira(id, payload = {}) {
  return executarAcaoStatus(id, 'realizar', payload);
}

export function reabrirProvisaoFinanceira(id, payload = {}) {
  return executarAcaoStatus(id, 'reabrir', payload);
}
