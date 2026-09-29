import { NextResponse, type NextRequest } from 'next/server';

/**
 * WEB-007 follow-up: Next.js emits a small inline bootstrap script per
 * document (the `__next_r` request marker and the RSC stream payloads).
 * A `script-src` without `'unsafe-inline'` blocks them, hydration never
 * happens, and the app hangs on the startup overlay forever.
 *
 * Rather than re-opening `script-src` to `'unsafe-inline'` for every
 * injection vector, mint a per-request nonce and let Next.js stamp it
 * on the scripts it generates (it reads the nonce back out of the
 * request's CSP header).
 *
 * Nonces require dynamic rendering; `src/app/layout.tsx` opts in with
 * `export const dynamic = 'force-dynamic'`.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  /**
   * WEB-012: `connect-src https: wss:` allowed *any* remote origin, which — together
   * with tokens that used to sit in localStorage — turned any injection or
   * compromised dependency into a token-exfiltration channel. The policy is now
   * pinned to the origins the app actually talks to.
   */
  const backend = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/$/, '');
  const backendWs = backend.replace(/^http/, 'ws');
  // A deployment behind a custom domain proxies /api through Next itself
  // (`baseURL: '/'` in lib/axios.js), so 'self' already covers it; the explicit
  // entries are for direct-to-backend (dev / Electron) usage.
  const connectSources = [
    "'self'",
    backend,
    backendWs,
    ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
  ]
    .filter(Boolean)
    .join(' ');

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} blob:`,
    // The UI themes itself at runtime (inline style attributes on dynamic
    // values), so style-src has to stay on 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    // `img-src` still allows https: because web-search result favicons are
    // loaded from provider CDNs — that is WEB-009 (favicon proxy), tracked
    // separately. connect-src below is the one that carries credentials.
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // WEB-012: the app renders source, diffs and terminal output — it must not be
    // framable. The backend already sends `frame-ancestors 'none'`; the web
    // origin did not.
    "frame-ancestors 'none'",
    "report-uri /csp-report",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ]
    .join('; ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Everything except prefetches and assets that never need the header.
       * `api` is excluded: those responses are JSON proxied to the backend,
       * which sets its own CSP.
       */
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
