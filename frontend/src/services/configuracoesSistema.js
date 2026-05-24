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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar configuracao de aprovacao por diretoria');
  }
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

export async function getTiposCompartilhadosEntreSetores() {
  const res = await fetch(`${API_URL}/configuracoes/tipos-compartilhados-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de tipos compartilhados');
  return res.json();
}

export async function salvarTiposCompartilhadosEntreSetores(data) {
  const res = await fetch(`${API_URL}/configuracoes/tipos-compartilhados-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de tipos compartilhados');
  return res.json();
}

export async function getAutomacaoStatusSetor() {
  const res = await fetch(`${API_URL}/configuracoes/automacao-status-setor`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de automacao por status');
  return res.json();
}

export async function salvarAutomacaoStatusSetor(data) {
  const res = await fetch(`${API_URL}/configuracoes/automacao-status-setor`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao salvar configuracao de automacao por status');
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

export async function getSetoresSemAlteracaoStatus() {
  const res = await fetch(`${API_URL}/configuracoes/setores-sem-alteracao-status`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar configuracao de setores sem alteracao de status');
  return res.json();
}

export async function salvarSetoresSemAlteracaoStatus(data) {
  const res = await fetch(`${API_URL}/configuracoes/setores-sem-alteracao-status`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar configuracao de setores sem alteracao de status');
  }
  return res.json();
}

export async function getUsuariosAcessoPrioridadeDiretoria() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-prioridade-diretoria`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar usuarios com acesso a prioridade diretoria');
  return res.json();
}

export async function salvarUsuariosAcessoPrioridadeDiretoria(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-acesso-prioridade-diretoria`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar usuarios com acesso a prioridade diretoria');
  }
  return res.json();
}

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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar permissao especial de envio');
  }
  return res.json();
}

export async function getUsuariosAlterarValorSolicitacao() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-alterar-valor-solicitacao`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar usuarios com permissao para alterar valor');
  return res.json();
}

export async function salvarUsuariosAlterarValorSolicitacao(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-alterar-valor-solicitacao`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar permissao para alterar valor');
  }
  return res.json();
}

export async function getMinhaPermissaoAlterarValorSolicitacao() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-alterar-valor-solicitacao/minha-permissao`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar permissao para alterar valor');
  return res.json();
}

export async function getUsuariosListarTodasSolicitacoes() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-listar-todas-solicitacoes`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar usuarios com permissao para listar todas as solicitacoes');
  return res.json();
}

export async function salvarUsuariosListarTodasSolicitacoes(data) {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-listar-todas-solicitacoes`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erro ao salvar permissao para listar todas as solicitacoes');
  }
  return res.json();
}

export async function getMinhaPermissaoListarTodasSolicitacoes() {
  const res = await fetch(`${API_URL}/configuracoes/usuarios-listar-todas-solicitacoes/minha-permissao`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Erro ao buscar permissao para listar todas as solicitacoes');
  return res.json();
}
