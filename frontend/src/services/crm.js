import { API_URL, authHeaders } from './api';

async function handleJsonResponse(res, fallback = 'Erro na requisicao') {
  if (!res.ok) {
    let msg = fallback;
    try {
      const body = await res.json();
      msg = body?.error || msg;
    } catch (_) { }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function buildQuery(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  }
  return p.toString();
}

// --- Leads ---

export async function listarLeads(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/leads${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao listar leads');
}

export async function exportarLeadsCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/leads/export${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    let msg = 'Erro ao exportar leads';
    try {
      const body = await res.json();
      msg = body?.error || msg;
    } catch (_) { }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || 'crm-leads.csv'
  };
}

export async function listarCandidatosRedistribuicaoCrm() {
  const res = await fetch(`${API_URL}/crm/leads/redistribution-candidates`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao listar candidatos de redistribuicao');
}

export async function obterLead(id) {
  const res = await fetch(`${API_URL}/crm/leads/${id}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao buscar lead');
}

export async function criarLead(dados) {
  const res = await fetch(`${API_URL}/crm/leads`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar lead');
}

export async function atualizarLead(id, dados) {
  const res = await fetch(`${API_URL}/crm/leads/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar lead');
}

export async function alterarEtapaLead(id, stageId) {
  const res = await fetch(`${API_URL}/crm/leads/${id}/stage`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage_id: stageId })
  });
  return handleJsonResponse(res, 'Erro ao alterar etapa');
}

export async function registrarPerdaLead(id, motivoId, obs) {
  const res = await fetch(`${API_URL}/crm/leads/${id}/loss`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo_id: motivoId, obs })
  });
  return handleJsonResponse(res, 'Erro ao registrar perda');
}

export async function registrarConversaoLead(id) {
  const res = await fetch(`${API_URL}/crm/leads/${id}/convert`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao registrar conversao');
}

export async function arquivarLead(id) {
  const res = await fetch(`${API_URL}/crm/leads/${id}/archive`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao arquivar lead');
}

export async function redistribuirLeadCrm(id, dados = {}) {
  const res = await fetch(`${API_URL}/crm/leads/${id}/redistribute`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao redistribuir lead');
}

// --- Pipelines / Config ---

export async function listarPipelines() {
  const res = await fetch(`${API_URL}/crm/pipelines`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar pipelines');
}

export async function obterKanban(pipelineId, params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/pipelines/${pipelineId}/kanban${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao carregar kanban');
}

export async function criarEtapaPipelineCrm(pipelineId, dados) {
  const res = await fetch(`${API_URL}/crm/pipelines/${pipelineId}/stages`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar etapa do pipeline');
}

export async function atualizarEtapaPipelineCrm(stageId, dados) {
  const res = await fetch(`${API_URL}/crm/pipeline-stages/${stageId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar etapa do pipeline');
}

export async function removerEtapaPipelineCrm(stageId) {
  const res = await fetch(`${API_URL}/crm/pipeline-stages/${stageId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao remover etapa do pipeline');
}

export async function listarMotivosPerda() {
  const res = await fetch(`${API_URL}/crm/loss-reasons`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar motivos de perda');
}

// --- Interactions ---

export async function listarInteracoes(leadId, params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/leads/${leadId}/interactions${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao listar interacoes');
}

export async function registrarInteracao(leadId, dados) {
  const res = await fetch(`${API_URL}/crm/leads/${leadId}/interactions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao registrar interacao');
}

// --- Tasks ---

export async function listarTarefas(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/tasks${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao listar tarefas');
}

export async function criarTarefa(dados) {
  const res = await fetch(`${API_URL}/crm/tasks`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar tarefa');
}

export async function atualizarTarefa(id, dados) {
  const res = await fetch(`${API_URL}/crm/tasks/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar tarefa');
}

export async function concluirTarefa(id) {
  const res = await fetch(`${API_URL}/crm/tasks/${id}/complete`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao concluir tarefa');
}

export async function cancelarTarefa(id) {
  const res = await fetch(`${API_URL}/crm/tasks/${id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao cancelar tarefa');
}

// --- Dashboard ---

export async function obterDashboardOperacional() {
  const res = await fetch(`${API_URL}/crm/dashboard/operacional`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao carregar dashboard');
}

export async function obterDashboardGerencialCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/dashboard/gerencial${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao carregar dashboard gerencial');
}

export async function obterDashboardSlaCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/dashboard/sla${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao carregar dashboard de SLA');
}

export async function obterDashboardDistribuicaoCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/dashboard/distribuicao${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao carregar dashboard de distribuicao');
}

// --- Conversas / Inbox ---

export async function listarConversasCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/conversations${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar conversas CRM');
}

export async function obterConversaCrm(id, params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/conversations/${id}${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao buscar conversa CRM');
}

export async function criarConversaCrm(dados) {
  const res = await fetch(`${API_URL}/crm/conversations`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar conversa CRM');
}

export async function atualizarConversaCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/conversations/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar conversa CRM');
}

export async function registrarMensagemCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/conversations/${id}/messages`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao registrar mensagem CRM');
}

export async function marcarConversaLidaCrm(id) {
  const res = await fetch(`${API_URL}/crm/conversations/${id}/read`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao marcar conversa como lida');
}

export async function listarTemplatesMensagemCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/message-templates${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar templates CRM');
}

export async function criarTemplateMensagemCrm(dados) {
  const res = await fetch(`${API_URL}/crm/message-templates`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar template CRM');
}

export async function atualizarTemplateMensagemCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/message-templates/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar template CRM');
}

// --- Automacoes ---

export async function listarAutomacoesCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/automation-rules${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar automacoes CRM');
}

export async function criarAutomacaoCrm(dados) {
  const res = await fetch(`${API_URL}/crm/automation-rules`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar automacao CRM');
}

export async function atualizarAutomacaoCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/automation-rules/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar automacao CRM');
}

export async function ativarAutomacaoCrm(id) {
  const res = await fetch(`${API_URL}/crm/automation-rules/${id}/activate`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao ativar automacao CRM');
}

export async function desativarAutomacaoCrm(id) {
  const res = await fetch(`${API_URL}/crm/automation-rules/${id}/deactivate`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao desativar automacao CRM');
}

export async function executarCicloAutomacoesCrm() {
  const res = await fetch(`${API_URL}/crm/automation-rules/run-cycle`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao executar ciclo de automacoes CRM');
}

export async function listarExecucoesAutomacaoCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/automation-executions${q ? `?${q}` : ''}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao listar execucoes de automacao CRM');
}

// --- Admin / Canais ---

export async function listarCanaisCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/channels${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar canais CRM');
}

export async function criarCanalCrm(dados) {
  const res = await fetch(`${API_URL}/crm/channels`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar canal CRM');
}

export async function atualizarCanalCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/channels/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar canal CRM');
}

export async function excluirCanalCrm(id) {
  const res = await fetch(`${API_URL}/crm/channels/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao excluir canal CRM');
}

// --- Admin / Numeros ---

export async function listarNumerosCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/phone-assets${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar numeros CRM');
}

export async function criarNumeroCrm(dados) {
  const res = await fetch(`${API_URL}/crm/phone-assets`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao criar numero CRM');
}

export async function atualizarNumeroCrm(id, dados) {
  const res = await fetch(`${API_URL}/crm/phone-assets/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao atualizar numero CRM');
}

export async function excluirNumeroCrm(id) {
  const res = await fetch(`${API_URL}/crm/phone-assets/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao excluir numero CRM');
}

// --- Admin / Integracoes ---

export async function obterIntegracoesCrm() {
  const res = await fetch(`${API_URL}/crm/integrations/config`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao carregar integracoes CRM');
}

export async function atualizarIntegracoesCrm(dados) {
  const res = await fetch(`${API_URL}/crm/integrations/config`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return handleJsonResponse(res, 'Erro ao salvar integracoes CRM');
}

export async function listarEventosMetaCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/integrations/meta/events${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar eventos Meta');
}

export async function reprocessarEventoMetaCrm(id) {
  const res = await fetch(`${API_URL}/crm/integrations/meta/events/${id}/reprocess`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao reprocessar evento Meta');
}

export async function listarEventosGoogleCrm(params = {}) {
  const q = buildQuery(params);
  const res = await fetch(`${API_URL}/crm/integrations/google/events${q ? `?${q}` : ''}`, { headers: authHeaders() });
  return handleJsonResponse(res, 'Erro ao listar eventos Google');
}

export async function reprocessarEventoGoogleCrm(id) {
  const res = await fetch(`${API_URL}/crm/integrations/google/events/${id}/reprocess`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleJsonResponse(res, 'Erro ao reprocessar evento Google');
}
