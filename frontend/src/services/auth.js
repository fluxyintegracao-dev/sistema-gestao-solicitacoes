import { API_URL } from './api';

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function buildError(data, fallbackMessage) {
  const error = new Error(data?.error || fallbackMessage);
  error.status = Number(data?.status || 0) || 0;
  error.data = data;
  return error;
}

export async function loginRequest(payload) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(payload?.email || '').trim(),
      senha: payload?.senha || ''
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao efetuar login.');
  }

  return data;
}

export async function loginMfaRequest(payload) {
  const response = await fetch(`${API_URL}/login/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_token: payload?.challenge_token || '',
      codigo: payload?.codigo || ''
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao validar autenticacao em duas etapas.');
  }

  return data;
}

export async function getCurrentSession() {
  const response = await fetch(`${API_URL}/auth/me`);
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw buildError(data, 'Erro ao restaurar sessao.');
  }

  return data;
}

export async function logoutRequest() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST'
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao encerrar sessao.');
  }

  return data;
}

export async function forgotPasswordRequest(email) {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email || '').trim() })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao solicitar recuperacao de senha.');
  }

  return data;
}

export async function resetPasswordRequest({ token, senha }) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: String(token || '').trim(),
      senha: String(senha || '')
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao definir nova senha.');
  }

  return data;
}

export async function startMfaSetupRequest() {
  const response = await fetch(`${API_URL}/auth/mfa/setup`, {
    method: 'POST'
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao iniciar configuracao do MFA.');
  }

  return data;
}

export async function enableMfaRequest(codigo) {
  const response = await fetch(`${API_URL}/auth/mfa/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao habilitar MFA.');
  }

  return data;
}

export async function disableMfaRequest(codigo) {
  const response = await fetch(`${API_URL}/auth/mfa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(data, 'Erro ao desabilitar MFA.');
  }

  return data;
}
