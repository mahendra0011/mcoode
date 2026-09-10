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
import { getTokens, setTokens } from './api';
import { getBackendUrl } from './electron-nav';

const api = axios.create({
  // In Electron, point directly at the child-process backend.
  // In the browser, Vite dev server proxies /api → http://localhost:3100.
  baseURL: typeof window !== 'undefined' && window.mcodeElectron?.backendUrl
    ? window.mcodeElectron.backendUrl
    : (process.env.NEXT_PUBLIC_API_URL || '/'),
  timeout: 8000, // 8s default — slow external provider calls can override
  // NOTE: Do NOT set a default Content-Type here. When a FormData body is
  // passed (e.g. zip uploads, file attachments), axios must be allowed to
  // auto-set `multipart/form-data` with the correct boundary. A static
  // `application/json` default causes axios to JSON.stringify(FormData)
  // instead, silently breaking all multipart uploads.
  headers: {},
});

// ── Request interceptor: inject Bearer token ──
// For FormData bodies, let the browser set the multipart Content-Type with
// the correct boundary automatically (don't override it).
api.interceptors.request.use((config) => {
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

    const { refresh } = getTokens();
    if (!refresh) {
      isRefreshing = false;
      const rejectList = pendingRequests;
      pendingRequests = [];
      rejectList.forEach((req) => req.reject(error));
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mcode_tokens');
        // Dispatch event so the React app can handle SPA navigation;
        // fall back to hard redirect for non-React contexts or browser.
        window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
        if (!window.mcodeElectron) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    try {
      const refreshRes = await axios.post(
        '/api/v1/auth/refresh',
        { refresh },
        {
          baseURL: typeof window !== 'undefined' && window.mcodeElectron?.backendUrl
            ? window.mcodeElectron.backendUrl
            : (process.env.NEXT_PUBLIC_API_URL || '/'),
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (refreshRes.data && refreshRes.data.access) {
        const newAccess = refreshRes.data.access;
        const newRefresh = refreshRes.data.refresh || refresh;
        setTokens({ access: newAccess, refresh: newRefresh });
        config.headers.Authorization = `Bearer ${newAccess}`;

        // Retry all queued requests with the new token
        const resolveList = pendingRequests;
        pendingRequests = [];
        resolveList.forEach((req) => req.resolve(newAccess));

        return api(config);
      }
      throw new Error('Refresh response missing access token');
    } catch {
      // Refresh failed — clear invalid tokens, reject all queued requests, and redirect to /login
      const rejectList = pendingRequests;
      pendingRequests = [];
      rejectList.forEach((req) => req.reject(error));
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mcode_tokens');
        window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
        if (!window.mcodeElectron) {
          window.location.href = '/login';
        }
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
