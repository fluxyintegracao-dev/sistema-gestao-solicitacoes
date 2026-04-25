import { API_URL, authHeaders } from './api';

export async function getTemaSistema() {
  const res = await fetch(`${API_URL}/configuracoes/tema`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar tema do sistema');
  return res.json();
}

export async function salvarTemaSistema(data) {
  const res = await fetch(`${API_URL}/configuracoes/tema`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar tema do sistema');
  return res.json();
}

export async function getTimeoutInatividade() {
  const res = await fetch(`${API_URL}/configuracoes/timeout-inatividade`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar timeout de inatividade');
  return res.json();
}

export async function salvarTimeoutInatividade(data) {
  const res = await fetch(`${API_URL}/configuracoes/timeout-inatividade`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao salvar timeout de inatividade');
  }
  return res.json();
}

export async function enviarHeartbeatSessao() {
  const res = await fetch(`${API_URL}/auth/heartbeat`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao enviar heartbeat da sessao');
  }
  return res.json();
}

export async function getAreasObra() {
  const res = await fetch(`${API_URL}/configuracoes/areas-obra`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de areas');
  return res.json();
}

export async function salvarAreasObra(data) {
  const res = await fetch(`${API_URL}/configuracoes/areas-obra`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de areas');
  return res.json();
}

export async function getAreasPorSetorOrigem() {
  const res = await fetch(`${API_URL}/configuracoes/areas-por-setor-origem`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao por setor de origem');
  return res.json();
}

export async function salvarAreasPorSetorOrigem(data) {
  const res = await fetch(`${API_URL}/configuracoes/areas-por-setor-origem`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao por setor de origem');
  return res.json();
}

export async function getSetoresVisiveisPorUsuario() {
  const res = await fetch(`${API_URL}/configuracoes/setores-visiveis-usuario`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao por usuario');
  return res.json();
}

export async function salvarSetoresVisiveisPorUsuario(data) {
  const res = await fetch(`${API_URL}/configuracoes/setores-visiveis-usuario`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao por usuario');
  return res.json();
}

export async function getTiposSolicitacaoPorSetor() {
  const res = await fetch(`${API_URL}/configuracoes/tipos-solicitacao-por-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de tipos por setor');
  return res.json();
}

export async function salvarTiposSolicitacaoPorSetor(data) {
  const res = await fetch(`${API_URL}/configuracoes/tipos-solicitacao-por-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de tipos por setor');
  return res.json();
}

export async function getAprovacaoDiretoria() {
  const res = await fetch(`${API_URL}/configuracoes/aprovacao-diretoria`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de aprovacao por diretoria');
  return res.json();
}

export async function salvarAprovacaoDiretoria(data) {
  const res = await fetch(`${API_URL}/configuracoes/aprovacao-diretoria`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de aprovacao por diretoria');
  return res.json();
}

export async function getTiposCompartilhadosSetor() {
  const res = await fetch(`${API_URL}/configuracoes/tipos-compartilhados-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar tipos compartilhados entre setores');
  return res.json();
}

export async function salvarTiposCompartilhadosSetor(data) {
  const res = await fetch(`${API_URL}/configuracoes/tipos-compartilhados-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar tipos compartilhados entre setores');
  return res.json();
}

export async function getAutomacaoStatusSetor() {
  const res = await fetch(`${API_URL}/configuracoes/automacao-status-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar automacao de status por setor');
  return res.json();
}

export async function salvarAutomacaoStatusSetor(data) {
  const res = await fetch(`${API_URL}/configuracoes/automacao-status-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar automacao de status por setor');
  return res.json();
}

export const getTiposCompartilhadosEntreSetores = getTiposCompartilhadosSetor;
export const salvarTiposCompartilhadosEntreSetores = salvarTiposCompartilhadosSetor;

export async function getUsuariosEnvioQualquerSetor() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-envio-qualquer-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar usuarios com permissao especial de envio');
  return res.json();
}

export async function salvarUsuariosEnvioQualquerSetor(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-envio-qualquer-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar usuarios com permissao especial de envio');
  return res.json();
}

export async function getSetoresCriacaoTodasObras() {
  const res = await fetch(`${API_URL}/configuracoes/setores-criacao-todas-obras`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de criacao em todas as obras');
  return res.json();
}

export async function salvarSetoresCriacaoTodasObras(data) {
  const res = await fetch(`${API_URL}/configuracoes/setores-criacao-todas-obras`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de criacao em todas as obras');
  return res.json();
}

export async function getSetoresAcessoTodasObras() {
  const res = await fetch(`${API_URL}/configuracoes/setores-acesso-todas-obras`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de acesso em todas as obras');
  return res.json();
}

export async function salvarSetoresAcessoTodasObras(data) {
  const res = await fetch(`${API_URL}/configuracoes/setores-acesso-todas-obras`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de acesso em todas as obras');
  return res.json();
}

export async function getUsuariosAcessoFinanceiro() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-financeiro`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de acesso ao financeiro');
  return res.json();
}

export async function salvarUsuariosAcessoFinanceiro(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-financeiro`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de acesso ao financeiro');
  return res.json();
}

export async function getUsuariosAcessoPrioridadeDiretoria() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-prioridade-diretoria`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de acesso a prioridade diretoria');
  return res.json();
}

export async function salvarUsuariosAcessoPrioridadeDiretoria(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-prioridade-diretoria`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || 'Erro ao salvar configuracao de acesso a prioridade diretoria');
  }
  return res.json();
}

export async function getUsuariosPermissoesRhDp() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-permissoes-rh-dp`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de permissoes do RH/DP');
  return res.json();
}

export async function salvarUsuariosPermissoesRhDp(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-permissoes-rh-dp`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de permissoes do RH/DP');
  return res.json();
}

export async function getPermissoesAreasRegistry() {
  const res = await fetch(`${API_URL}/configuracoes/permissoes-areas/registry`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar registro de permissoes');
  return res.json();
}

export async function getPermissoesAreas() {
  const res = await fetch(`${API_URL}/configuracoes/permissoes-areas`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar permissoes de areas');
  return res.json();
}

export async function salvarPermissoesAreas(data) {
  const res = await fetch(`${API_URL}/configuracoes/permissoes-areas`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar permissoes de areas');
  return res.json();
}

export async function getStatusPedidosCompra() {
  const res = await fetch(`${API_URL}/configuracoes/status-pedidos-compra`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de status dos pedidos');
  return res.json();
}

export async function salvarStatusPedidosCompra(data) {
  const res = await fetch(`${API_URL}/configuracoes/status-pedidos-compra`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao salvar configuracao de status dos pedidos');
  }
  return res.json();
}

export async function getComercialCategoriasContrato() {
  const res = await fetch(`${API_URL}/configuracoes/comercial-categorias-contrato`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao buscar categorias comerciais do contrato');
  }
  return res.json();
}

export async function salvarComercialCategoriasContrato(data) {
  const res = await fetch(`${API_URL}/configuracoes/comercial-categorias-contrato`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao salvar categorias comerciais do contrato');
  }
  return res.json();
}

export async function getModulosSistema() {
  const res = await fetch(`${API_URL}/configuracoes/modulos`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao buscar configuracao de modulos');
  }
  return res.json();
}

export async function salvarModulosSistema(data) {
  const res = await fetch(`${API_URL}/configuracoes/modulos`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Erro ao salvar configuracao de modulos');
  }
  return res.json();
}
