import { API_URL, authHeaders } from './api';

async function parseResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || fallbackMessage);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function getUsuarios() {
  const res = await fetch(`${API_URL}/usuarios`, {
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao buscar usuarios');
}

export async function getUsuario(id) {
  const res = await fetch(`${API_URL}/usuarios/${id}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error('Erro ao buscar usuario');
  }
  return res.json();
}

export async function criarUsuario(data) {
  const res = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseResponse(res, 'Erro ao criar usuario');
}

export async function atualizarUsuario(id, data) {
  const res = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return parseResponse(res, 'Erro ao atualizar usuario');
}

export async function ativarUsuario(id) {
  await fetch(`${API_URL}/usuarios/${id}/ativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });
}

export async function desativarUsuario(id) {
  await fetch(`${API_URL}/usuarios/${id}/desativar`, {
    method: 'PATCH',
    headers: authHeaders()
  });
}

export async function enviarConviteUsuario(id) {
  const res = await fetch(`${API_URL}/usuarios/${id}/enviar-convite`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao enviar link de definicao de senha');
}

export async function forcarResetSenhaUsuarios() {
  const res = await fetch(`${API_URL}/usuarios/forcar-reset-senhas`, {
    method: 'POST',
    headers: authHeaders()
  });
  return parseResponse(res, 'Erro ao forcar redefinicao de senhas');
}

export async function alterarSenhaAtual({ senha_atual, senha_nova }) {
  const res = await fetch(`${API_URL}/usuarios/me/senha`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ senha_atual, senha_nova })
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {}
    throw new Error(data?.error || 'Erro ao alterar senha');
  }
}

export async function importarUsuariosEmMassa(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/usuarios/importar-massa`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Erro ao importar usuários em massa');
  }

  return data;
}
