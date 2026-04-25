function normalizeApiUrl(value) {
  const raw = String(value || '/api').trim().replace(/\/+$/g, '');
  if (!raw) return '/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_ORIGIN = String(API_URL).replace(/\/api\/?$/, '');

let currentAuthToken = null;
let currentCsrfToken = null;
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'fluxy_csrf';

function getCookieValue(name) {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length) || null;
}

function isUnsafeMethod(method) {
  const normalized = String(method || 'GET').trim().toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalized);
}

function rememberCsrfTokenFromResponse(response) {
  try {
    const nextToken = response?.headers?.get?.(CSRF_HEADER_NAME);
    if (nextToken) {
      currentCsrfToken = nextToken;
    }
  } catch {
    // Nem toda resposta permite leitura de headers; mantem o token atual.
  }
}

export function installFetchSecurityDefaults() {
  if (typeof window === 'undefined' || window.__fluxyFetchSecurityInstalled) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const baseHeaders = input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init.headers || baseHeaders || {});
    const method = init.method || (input instanceof Request ? input.method : 'GET');

    if (currentAuthToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentAuthToken}`);
    }

    if (isUnsafeMethod(method) && !headers.has(CSRF_HEADER_NAME)) {
      const csrfToken = currentCsrfToken || getCookieValue(CSRF_COOKIE_NAME);
      if (csrfToken) {
        headers.set(CSRF_HEADER_NAME, csrfToken);
      }
    }

    const response = await nativeFetch(input, {
      ...init,
      credentials: init.credentials || 'include',
      headers
    });

    rememberCsrfTokenFromResponse(response);
    return response;
  };

  window.__fluxyFetchSecurityInstalled = true;
};

export function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return `${API_ORIGIN}/${path}`;
}

export function getAuthToken() {
  return currentAuthToken;
}

export function setAuthToken(token) {
  currentAuthToken = token || null;
}

export function clearAuthToken() {
  currentAuthToken = null;
  currentCsrfToken = null;
}

export function authHeaders(extra = {}) {
  const token = getAuthToken();
  if (!token) return extra;
  return { ...extra, Authorization: `Bearer ${token}` };
}
