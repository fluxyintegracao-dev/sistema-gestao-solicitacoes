import { getAccessToken } from '../../features/auth/token-store';

const DEFAULT_API_URL = 'https://api.jrfluxy.com.br/api';

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) {
      void unauthorizedHandler();
    }

    const message =
      typeof body === 'string'
        ? body
        : (body as { error?: string } | null)?.error || `Erro ${response.status}`;

    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}
