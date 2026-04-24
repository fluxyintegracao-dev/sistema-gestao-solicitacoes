import { apiRequest } from './client';
import type { AuthLoginResponse, AuthSession } from './types';

interface LoginPayload {
  email: string;
  senha: string;
}

export async function loginRequest(payload: LoginPayload) {
  return apiRequest<AuthLoginResponse>('/login', {
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

export async function loginMfaRequest(payload: {
  challenge_token: string;
  codigo: string;
}) {
  return apiRequest<AuthSession>('/login/mfa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      challenge_token: payload.challenge_token,
      codigo: payload.codigo
    })
  });
}

export async function heartbeatRequest() {
  return apiRequest<{ ok: boolean; recebido_em: string }>('/auth/heartbeat', {
    method: 'POST'
  });
}

export async function startMfaSetupRequest() {
  return apiRequest<{
    secret: string;
    secret_masked: string;
    otpauth_url: string;
    qr_code_data_url: string;
  }>('/auth/mfa/setup', {
    method: 'POST'
  });
}

export async function enableMfaRequest(codigo: string) {
  return apiRequest<AuthSession>('/auth/mfa/enable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ codigo })
  });
}

export async function disableMfaRequest(codigo: string) {
  return apiRequest<{ ok: boolean; mfa_totp_enabled: boolean }>('/auth/mfa/disable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ codigo })
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
