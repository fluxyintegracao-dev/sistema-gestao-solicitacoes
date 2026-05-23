import { API_URL, authHeaders } from './api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    if (!text) {
      throw new Error(fallbackMessage);
    }

    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.error || fallbackMessage);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || fallbackMessage);
      }
      throw error;
    }
  }

  return text ? JSON.parse(text) : null;
}

function buildQuery(params = {}) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
}

export async function getRhEmpresasGrupo(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/empresas-grupo?${query}` : `${API_URL}/rh/empresas-grupo`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar empresas do grupo');
}

export async function criarRhEmpresaGrupo(data) {
  const response = await fetch(`${API_URL}/rh/empresas-grupo`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao criar empresa do grupo');
}

export async function atualizarRhEmpresaGrupo(id, data) {
  const response = await fetch(`${API_URL}/rh/empresas-grupo/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao atualizar empresa do grupo');
}

export async function getRhColaboradores(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/colaboradores?${query}` : `${API_URL}/rh/colaboradores`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar colaboradores RH/DP');
}

export async function getRhRelatorioOperacional(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/relatorios/operacional?${query}` : `${API_URL}/rh/relatorios/operacional`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar relatorio operacional RH/DP');
}

export async function getRhColaborador(id) {
  const response = await fetch(`${API_URL}/rh/colaboradores/${id}`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar colaborador RH/DP');
}

export async function criarRhColaborador(data) {
  const response = await fetch(`${API_URL}/rh/colaboradores`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao criar colaborador RH/DP');
}

export async function atualizarRhColaborador(id, data) {
  const response = await fetch(`${API_URL}/rh/colaboradores/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao atualizar colaborador RH/DP');
}

export async function importarRhColaboradores(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/rh/colaboradores/importar-massa`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao importar colaboradores RH/DP');
}

export async function getRhDocumentoTipos(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/documentos/tipos?${query}` : `${API_URL}/rh/documentos/tipos`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar tipos de documento RH/DP');
}

export async function getRhDocumentos(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/documentos?${query}` : `${API_URL}/rh/documentos`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar documentos RH/DP');
}

export async function getRhDocumentoLink(id) {
  const response = await fetch(`${API_URL}/rh/documentos/${id}/link`, {
    headers: authHeaders()
  });
  const data = await parseJson(response, 'Erro ao gerar link do documento RH/DP');
  return data?.url;
}

function appendOptionalFormField(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  formData.append(key, value);
}

export async function uploadRhDocumento({ colaborador_id, tipo_documento_id, validade, status, observacoes, file }) {
  const formData = new FormData();
  appendOptionalFormField(formData, 'colaborador_id', colaborador_id);
  appendOptionalFormField(formData, 'tipo_documento_id', tipo_documento_id);
  appendOptionalFormField(formData, 'validade', validade);
  appendOptionalFormField(formData, 'status', status);
  appendOptionalFormField(formData, 'observacoes', observacoes);
  formData.append('file', file);

  const response = await fetch(`${API_URL}/rh/documentos`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao enviar documento RH/DP');
}

export async function atualizarRhDocumento(id, data) {
  const response = await fetch(`${API_URL}/rh/documentos/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao atualizar documento RH/DP');
}

export async function substituirRhDocumento(id, { tipo_documento_id, validade, status, observacoes, file }) {
  const formData = new FormData();
  appendOptionalFormField(formData, 'tipo_documento_id', tipo_documento_id);
  appendOptionalFormField(formData, 'validade', validade);
  appendOptionalFormField(formData, 'status', status);
  appendOptionalFormField(formData, 'observacoes', observacoes);
  formData.append('file', file);

  const response = await fetch(`${API_URL}/rh/documentos/${id}/substituir`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao substituir documento RH/DP');
}

export async function getRhImportacoes(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/importacoes?${query}` : `${API_URL}/rh/importacoes`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar importacoes RH/DP');
}

export async function getRhImportacao(id) {
  const response = await fetch(`${API_URL}/rh/importacoes/${id}`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar detalhe da importacao RH/DP');
}

export async function criarPreviewRhImportacao({ tipo, competencia, empresa_grupo_id, obra_id, tipo_vinculo, observacoes, file }) {
  const formData = new FormData();
  appendOptionalFormField(formData, 'tipo', tipo);
  appendOptionalFormField(formData, 'competencia', competencia);
  appendOptionalFormField(formData, 'empresa_grupo_id', empresa_grupo_id);
  appendOptionalFormField(formData, 'obra_id', obra_id);
  appendOptionalFormField(formData, 'tipo_vinculo', tipo_vinculo);
  appendOptionalFormField(formData, 'observacoes', observacoes);
  formData.append('file', file);

  const response = await fetch(`${API_URL}/rh/importacoes/preview`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao gerar preview da importacao RH/DP');
}

export async function confirmarRhImportacao(id) {
  const response = await fetch(`${API_URL}/rh/importacoes/${id}/confirmar`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao confirmar importacao RH/DP');
}

export async function getRhApuracoes(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/apuracoes?${query}` : `${API_URL}/rh/apuracoes`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar apuracoes RH/DP');
}

export async function getRhApuracao(id) {
  const response = await fetch(`${API_URL}/rh/apuracoes/${id}`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar detalhe da apuracao RH/DP');
}

export async function gerarRhApuracao(data) {
  const response = await fetch(`${API_URL}/rh/apuracoes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao gerar apuracao RH/DP');
}

export async function atualizarRhApuracaoItem(apuracaoId, itemId, data) {
  const response = await fetch(`${API_URL}/rh/apuracoes/${apuracaoId}/itens/${itemId}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao atualizar item da apuracao RH/DP');
}

export async function conferirRhApuracao(id) {
  const response = await fetch(`${API_URL}/rh/apuracoes/${id}/conferir`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao conferir apuracao RH/DP');
}

export async function getRhFechamentos(params = {}) {
  const query = buildQuery(params);
  const url = query ? `${API_URL}/rh/fechamentos?${query}` : `${API_URL}/rh/fechamentos`;
  const response = await fetch(url, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar fechamentos RH/DP');
}

export async function getRhFechamento(id) {
  const response = await fetch(`${API_URL}/rh/fechamentos/${id}`, {
    headers: authHeaders()
  });
  return parseJson(response, 'Erro ao buscar detalhe do fechamento RH/DP');
}

export async function fecharRhApuracao(apuracaoId, data) {
  const response = await fetch(`${API_URL}/rh/apuracoes/${apuracaoId}/fechar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao fechar apuracao RH/DP');
}

export async function reabrirRhFechamento(fechamentoId, data) {
  const response = await fetch(`${API_URL}/rh/fechamentos/${fechamentoId}/reabrir`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseJson(response, 'Erro ao reabrir fechamento RH/DP');
}
