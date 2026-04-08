import { apiRequest } from './client';
import type { AuthSession } from './types';

interface LoginPayload {
  email: string;
  senha: string;
}

export async function loginRequest(payload: LoginPayload) {
  return apiRequest<AuthSession>('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      senha: payload.senha
    })
  });
}

export async function heartbeatRequest() {
  return apiRequest<{ ok: boolean; recebido_em: string }>('/auth/heartbeat', {
    method: 'POST'
  });
}

export async function changePasswordRequest(payload: {
  senha_atual: string;
  senha_nova: string;
}) {
  return apiRequest<void>('/usuarios/me/senha', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
