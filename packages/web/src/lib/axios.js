/**
 * Shared Axios instance for the web frontend.
 *
 * Replaces the manual `fetch` / `fetchWithAuth` pattern with a single
 * configured instance that:
 *  - Injects the Bearer access token automatically (request interceptor)
 *  - Attempts a transparent token refresh on 401 (response interceptor)
 *  - Enforces a default timeout so slow endpoints (e.g. /keys/models which
 *    makes external provider API calls) don't hang the UI indefinitely.
 *
 * Usage:
 *   import api from '../lib/axios';
 *   const { data } = await api.get('/api/v1/keys');
 *   const { data } = await api.post('/api/v1/keys', body);
 *
 * For endpoints that are known to be slow (model listing), pass a custom
 * timeout:
 *   const { data } = await api.get('/api/v1/keys/models', { timeout: 10000 });
 */
import axios from 'axios';
import { getTokens, setTokens, clearTokens } from './api';


function resolveBaseURL() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // WEB-027: the `window.mcodeElectron.backendUrl` branch (Electron desktop
  // shell) was deleted — there is no packages/desktop in this repository, so it
  // could never fire. In production, always use relative URLs so Next rewrites
  // proxy /api → BACKEND. A hardcoded localhost:3100 from .env.local would
  // bypass the proxy and break prod.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');
    if (!isLocal) return '/';
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) return envUrl;
    return '/';
  }
  return envUrl || '/';
}

const api = axios.create({
  // WEB-027: the Electron "point at the child-process backend" case is gone.
  // In the browser we prefer relative /api (Next rewrites → BACKEND_URL).
  baseURL: resolveBaseURL(),
  withCredentials: true,
  timeout: 8000, // 8s default — slow external provider calls can override
  // NOTE: Do NOT set a default Content-Type here. When a FormData body is
  // passed (e.g. zip uploads, file attachments), axios must be allowed to
  // auto-set `multipart/form-data` with the correct boundary. A static
  // `application/json` default causes axios to JSON.stringify(FormData)
  // instead, silently breaking all multipart uploads.
  headers: {},
});

// ── Request interceptor: inject Bearer token (+ pro-active refresh) ──
// For FormData bodies, let the browser set the multipart Content-Type with
// the correct boundary automatically (don't override it).
function tokenExpiresInSec(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return Infinity;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    // FINDING-732: atob is not UTF-8-safe, so decode via TextDecoder.
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
    if (!json.exp) return Infinity;
    return json.exp - Math.floor(Date.now() / 1000);
  } catch {
    return Infinity;
  }
}

let proactiveRefreshPromise = null;

/**
 * Refresh the access token.
 *
 * The httpOnly `mcode_refresh` cookie is the session of record (audit WEB-011):
 * the request body is empty, so no credential travels through JS at all.
 * `withCredentials` is what actually carries the cookie. The in-memory refresh
 * token (see `lib/api.ts`) is only a fallback for a version skew against an
 * older backend build that insists on a body token.
 */
async function refreshAccessToken() {
  // WEB-027: the Electron child-process backend URL is gone — the auth origin is
  // always same-origin (Next rewrites /api → BACKEND in production).
  const baseURL = '/';
  const viaCookie = await axios.post('/api/v1/auth/refresh', {}, {
    baseURL,
    timeout: 15000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });
  if (viaCookie.data?.access) return viaCookie.data;

  const { refresh } = getTokens();
  if (!refresh) return null;
  const viaBody = await axios.post('/api/v1/auth/refresh', { refresh }, { baseURL, timeout: 15000 });
  return viaBody.data?.access ? viaBody.data : null;
}

async function ensureFreshToken() {
  const { access } = getTokens();
  if (!access) return;
  if (tokenExpiresInSec(access) > 60) return;
  if (!proactiveRefreshPromise) {
    proactiveRefreshPromise = refreshAccessToken()
      .then((tokens) => {
        if (tokens) setTokens(tokens);
      })
      .catch((err) => {
        // WEB-002: never swallow a failed real-token refresh silently — the caller
        // must log out instead of continuing with a dead access token. Fake E2E
        // tokens skip this path entirely so tests are not redirected to /login.
        if (typeof window === 'undefined') return;
        const isTestToken = access === 'fake' || access.startsWith('fake-');
        if (isTestToken) return;
        console.warn('[auth] token refresh failed:', err?.message || err);
        clearTokens();
        window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
      })
      .finally(() => { proactiveRefreshPromise = null; });
  }
  await proactiveRefreshPromise;
}

api.interceptors.request.use(async (config) => {
  if (!config.url?.includes('/auth/refresh')) {
    await ensureFreshToken();
  }
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  // Only set Content-Type for non-FormData requests so multipart uploads
  // keep their auto-generated boundary
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
  }
  return config;
});

// ── Response interceptor: transparent refresh on 401 ──
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Only handle 401s — other errors propagate to the caller
    if (response?.status !== 401 || config?.__isRetry) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            config.headers.Authorization = `Bearer ${token}`;
            config.__isRetry = true;
            resolve(api(config));
          },
          reject: (err) => reject(err),
        });
      });
    }

    isRefreshing = true;
    config.__isRetry = true;

    // The session of record is the httpOnly cookie: refresh with an empty body
    // first (WEB-011). The in-memory refresh token is only a version-skew
    // fallback, and it is legitimately absent after a page reload.
    const { refresh, access } = getTokens();
    const isTestToken = access === 'fake' || refresh === 'fake' || refresh === 'fake-refresh'
      || (access && access.startsWith('fake-'))
      || (refresh && refresh.startsWith('fake-'));
    if (isTestToken) {
      // E2E fake tokens cannot be refreshed — fail fast so tests are not
      // redirected to /login by the interceptor.
      isRefreshing = false;
      const rejectList = pendingRequests;
      pendingRequests = [];
      rejectList.forEach((req) => req.reject(error));
      return Promise.reject(error);
    }

    try {
      const refreshed = await refreshAccessToken();
      if (refreshed?.access) {
        setTokens(refreshed);
        config.headers.Authorization = `Bearer ${refreshed.access}`;

        // Retry all queued requests with the new token
        const resolveList = pendingRequests;
        pendingRequests = [];
        resolveList.forEach((req) => req.resolve(refreshed.access));

        return api(config);
      }
      throw new Error('Refresh response missing access token');
    } catch (refreshErr) {
      // Refresh failed — only redirect to /login if the refresh endpoint explicitly rejected the token (401/403)
      isRefreshing = false;
      const rejectList = pendingRequests;
      pendingRequests = [];
      rejectList.forEach((req) => req.reject(error));
      const status = refreshErr?.response?.status;
      if (typeof window !== 'undefined' && (status === 401 || status === 403) && !isTestToken) {
        clearTokens();
        window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
        window.location.href = '/login';
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

// Shorthand helpers that keep the same return shape as fetchWithAuth callers
export async function apiGet(url, opts = {}) {
  const res = await api.get(url, opts);
  return res;
}

export async function apiPost(url, body, opts = {}) {
  return api.post(url, body, opts);
}

export async function apiDelete(url, opts = {}) {
  return api.delete(url, opts);
}
