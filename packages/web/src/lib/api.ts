/**
 * Shared API helpers for the web frontend.
 *
 * Centralizes the auth-header pattern that was previously copy-pasted
 * (inconsistently) across components. Every fetch() to a backend route
 * that runs behind authMiddleware must include the Authorization header
 * — using this helper avoids the class of bugs where a component forgets
 * to attach credentials.
 */

export function getAuthHeaders(extra: Record<string, string> = {}): { Authorization: string } & Record<string, string> {
  const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}') as { access?: string; refresh?: string };
  return {
    Authorization: `Bearer ${tokens.access || ''}`,
    ...extra
  };
}

export function getToken(): string {
  const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}') as { access?: string; refresh?: string };
  return tokens.access || '';
}

/** Read the full { access, refresh } token pair from localStorage. */
export function getTokens(): { access?: string; refresh?: string } {
  return JSON.parse(localStorage.getItem('mcode_tokens') || '{}') as { access?: string; refresh?: string };
}

/** Persist the token pair to localStorage. */
export function setTokens(tokens: { access?: string; refresh?: string }): void {
  localStorage.setItem('mcode_tokens', JSON.stringify(tokens));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mcode:reload-models'));
  }
}

/**
 * fetchWithAuth — wraps fetch() with automatic Bearer-token injection and
 * transparent refresh-on-401. If the access token has expired (401), it
 * calls POST /api/v1/auth/refresh with the stored refresh token, updates
 * localStorage, and retries the original request once. If the refresh
 * also fails, the user is redirected to /login.
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
  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    // Attempt a silent refresh
    const { refresh } = getTokens();
    if (refresh) {
      try {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        });
        if (refreshRes.ok) {
          const tokens = await refreshRes.json();
          setTokens(tokens);
          headers.set('Authorization', `Bearer ${tokens.access}`);
          return fetch(input, { ...init, headers });
        }
      } catch {
        /* refresh failed — return the 401 response */
      }
    }
    // Refresh failed or no refresh token — return the 401 response so callers
    // can decide how to handle it (redirect, show error, etc.). This avoids
    // a hard redirect that breaks test rendering and non-browser contexts.
    return response;
  }

  // Non-401 response — return it so callers can read the body.
  return response;
}
