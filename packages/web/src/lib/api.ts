/**
 * Shared API helpers for the web frontend.
 *
 * Centralizes the auth pattern that was previously copy-pasted (inconsistently)
 * across components, so a component can never forget to attach credentials.
 *
 * ── Token storage policy (audit WEB-011) ──────────────────────────────────
 * The backend already issues an httpOnly cookie pair (`mcode_access` 15 min,
 * `mcode_refresh` 30 days — `setAuthCookies` in `packages/backend/src/auth.js`)
 * and `POST /api/v1/auth/refresh` accepts a **cookie-only** refresh
 * (`req.body.refresh || readAuthCookies(req).mcode_refresh`).
 *
 * So this module now:
 *   • keeps only the **short-lived access token** in `localStorage` — it is
 *     needed for the socket handshake, which cannot read cookies;
 *   • keeps the **refresh token in memory only** for the lifetime of the tab,
 *     never in script-readable storage;
 *   • relies on the httpOnly `mcode_refresh` cookie for anything durable.
 *
 * Before this change both tokens (including the 30-day refresh credential) sat
 * in `localStorage`, so any XSS became a full account takeover.
 */

const TOKEN_KEY = 'mcode_tokens';

/**
 * Refresh token for the current tab — memory only, never serialised.
 * Populated from a login/refresh response; lost on reload by design (the
 * httpOnly cookie covers the reload case).
 */
let memoryRefresh: string | undefined;

/**
 * 729: guarded parse — malformed JSON (or disabled storage in private
 * browsing) yields {} instead of a render-crashing SyntaxError.
 *
 * Also scrubs a legacy `refresh` field out of the stored blob on first read, so
 * a session created before WEB-011 does not keep a 30-day token in storage.
 */
function readStoredTokens(): { access?: string } {
  let parsed: { access?: string; refresh?: string } = {};
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
    const value = JSON.parse(raw || '{}');
    if (value && typeof value === 'object') parsed = value;
  } catch {
    parsed = {};
  }
  if (parsed.refresh) {
    memoryRefresh = memoryRefresh || parsed.refresh;
    delete parsed.refresh;
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ access: parsed.access }));
    } catch {
      /* storage unavailable — memory-only session, still fine */
    }
  }
  return { access: parsed.access };
}

/**
 * Origin prefix for absolute `fetch` calls.
 *
 * WEB-027: this used to return `window.mcodeElectron.backendUrl` for the
 * Electron desktop shell. There is no `packages/desktop` in this repository,
 * so the bridge could never be present — the value was always `''` (same-origin).
 * Kept as a function so the intent stays explicit at the call site.
 */
function backendOrigin(): string {
  return '';
}

export function getAuthHeaders(extra: Record<string, string> = {}): { Authorization: string } & Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra
  };
}

export function getToken(): string {
  return readStoredTokens().access || '';
}

/** The in-session token pair. `refresh` is memory-only (see the policy above). */
export function getTokens(): { access?: string; refresh?: string } {
  return { access: readStoredTokens().access, refresh: memoryRefresh };
}

/**
 * Persist the session.
 *  - `access`  → localStorage (needed for the socket handshake across reloads)
 *  - `refresh` → memory only
 */
export function setTokens(tokens: { access?: string; refresh?: string }): void {
  memoryRefresh = tokens.refresh || memoryRefresh;
  try {
    // Never write `refresh` back out (defence in depth: even if a caller passes
    // one, only the access token reaches storage).
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ access: tokens.access }));
  } catch {
    /* private mode / storage disabled — the session stays in memory + cookie */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mcode:reload-models'));
  }
}

/** Drop every client-side credential (used by the logout paths). */
export function clearTokens(): void {
  memoryRefresh = undefined;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Exchange the httpOnly `mcode_refresh` cookie for a new access token.
 *
 * The cookie is the source of truth, so no token is sent in the body — the
 * request only proves the browser still holds the cookie. If the backend is an
 * older build that insists on a body token, the in-memory refresh token is used
 * as a fallback so an in-flight tab is never logged out by a version skew.
 */
export async function refreshSession(): Promise<{ access?: string; refresh?: string } | null> {
  const base = backendOrigin();
  const tryRefresh = async (body: Record<string, unknown>) => {
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { access?: string; refresh?: string };
  };

  const viaCookie = await tryRefresh({});
  if (viaCookie?.access) return viaCookie;
  if (memoryRefresh) return tryRefresh({ refresh: memoryRefresh });
  return null;
}

/**
 * fetchWithAuth — wraps fetch() with Bearer-token injection and a transparent
 * refresh-on-401 driven by the httpOnly cookie.
 *
 * Usage: replace `fetch(url, opts)` → `fetchWithAuth(url, opts)` for any
 * authenticated endpoint. The Authorization header is added automatically;
 * callers should still pass Content-Type for JSON bodies.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });

  if (response.status === 401) {
    const tokens = await refreshSession().catch(() => null);
    if (tokens?.access) {
      setTokens(tokens);
      headers.set('Authorization', `Bearer ${tokens.access}`);
      return fetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });
    }
    // Refresh failed — return the 401 response so callers can decide how to
    // handle it (redirect, show error, etc.). This avoids a hard redirect that
    // breaks test rendering and non-browser contexts.
    return response;
  }

  return response;
}
