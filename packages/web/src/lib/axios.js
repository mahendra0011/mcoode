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

const api = axios.create({
  // Vite dev server proxies /api → http://localhost:3100
  baseURL: '/', // rely on Vite proxy for /api paths
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
    if (response?.status !== 401 || config.__isRetry) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(api(config));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    config.__isRetry = true;

    const { refresh } = getTokens();
    if (!refresh) {
      isRefreshing = false;
      // No refresh token — reject so caller can redirect to /login
      return Promise.reject(error);
    }

    try {
      const refreshRes = await axios.post(
        '/api/v1/auth/refresh',
        { refresh },
        { baseURL: '/', timeout: 5000, headers: { 'Content-Type': 'application/json' } }
      );

      if (refreshRes.data && refreshRes.data.access) {
        setTokens({ access: refreshRes.data.access, refresh: refreshRes.data.refresh || refresh });
        config.headers.Authorization = `Bearer ${refreshRes.data.access}`;

        // Retry all queued requests with the new token
        pendingRequests.forEach((req) => req.resolve(refreshRes.data.access));
        pendingRequests = [];

        return api(config);
      }
    } catch {
      // Refresh failed — reject all queued requests
      pendingRequests.forEach((req) => req.reject(error));
      pendingRequests = [];
    } finally {
      isRefreshing = false;
    }

    return Promise.reject(error);
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
