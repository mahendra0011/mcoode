/**
 * Shared API helpers for the web frontend.
 *
 * Centralizes the auth-header pattern that was previously copy-pasted
 * (inconsistently) across components. Every fetch() to a backend route
 * that runs behind authMiddleware must include the Authorization header
 * — using this helper avoids the class of bugs where a component forgets
 * to attach credentials.
 */

export function getAuthHeaders(extra = {}) {
  const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
  return {
    Authorization: `Bearer ${tokens.access || ''}`,
    ...extra
  };
}

export function getToken() {
  const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
  return tokens.access || '';
}
