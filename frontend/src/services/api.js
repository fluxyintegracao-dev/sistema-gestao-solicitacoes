export const API_URL = import.meta.env.VITE_API_URL ?? '/api';
export const API_ORIGIN = String(API_URL).replace(/\/api\/?$/, '');

let currentAuthToken = null;

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

    if (isUnsafeMethod(method) && !headers.has('X-CSRF-Token')) {
      const csrfToken = getCookieValue('fluxy_csrf');
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }

    return nativeFetch(input, {
      ...init,
      credentials: init.credentials || 'include',
      headers
    });
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
}

export function authHeaders(extra = {}) {
  const token = getAuthToken();
  if (!token) return extra;
  return { ...extra, Authorization: `Bearer ${token}` };
}
