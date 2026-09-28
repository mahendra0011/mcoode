import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { pluginRoutes } from './routes/plugins.js';
import { watchRoutes } from './routes/watch.js';
import { usageRoutes } from './routes/usage.js';
import { uploadRoutes } from './routes/uploads.js';
import { keyRoutes } from './routes/keys.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { settingsRoutes } from './routes/settings.js';
import { githubAuthRoutes, githubApiRoutes } from './routes/github.js';
import { searchRoutes } from './routes/search.js';
import { extensionRoutes } from './routes/extensions.js';
import { languageRoutes } from './routes/languages.js';
import { androidRoutes } from './routes/android.js';
import { pairRoutes, pairSuggestMiddleware } from './routes/pair.js';
import { promptRoutes } from './routes/prompt.js';
import { cleanRoutes } from './routes/clean.js';

/**
 * BSEC-002: central route policy — routers are protected BY DEFAULT.
 *
 * Every `/api/v1/*` mount lives in this table. `mountApiRoutes()` iterates it,
 * so a new route file cannot be mounted without an explicit policy entry, and
 * an entry with `auth: 'router'` fails fast when no secret is available
 * (instead of the old `if (secret) router.use(...)` fail-open pattern).
 *
 * `auth` meanings:
 *  - 'router'  — factory receives `{ secret, env }` and installs authMiddleware
 *                itself (asserted by tests/route-policy.test.js via the
 *                `_mcodeAuth` marker set in auth.js).
 *  - 'public'  — explicitly allowlisted as unauthenticated (read-only by
 *                design, documented in docs/API.md).
 *  - 'inline'  — registered directly on the app with its own guarded
 *                middleware chain from the route file (still marker-checked).
 *
 * App-level endpoints outside this table (documented here so the startup log
 * tells the whole story): `/health`, `/metrics`, `/api/docs` (Swagger UI),
 * `/api/v1/version`, and the Socket.IO `/live` handshake.
 */
export const ROUTE_POLICY = [
  { mount: '/api/v1/auth', auth: 'router', factory: 'authRoutes', note: 'login/OTP routes guard their own sensitive endpoints' },
  { mount: '/api/v1/sessions', auth: 'router', factory: 'sessionRoutes' },
  { mount: '/api/v1/plugins', auth: 'router', factory: 'pluginRoutes' },
  { mount: '/api/v1/watch', auth: 'router', factory: 'watchRoutes' },
  { mount: '/api/v1/usage', auth: 'router', factory: 'usageRoutes' },
  { mount: '/api/v1/uploads', auth: 'router', factory: 'uploadRoutes' },
  { mount: '/api/v1/keys', auth: 'router', factory: 'keyRoutes' },
  { mount: '/api/v1/workspaces', auth: 'router', factory: 'workspaceRoutes' },
  { mount: '/api/v1/settings', auth: 'router', factory: 'settingsRoutes' },
  { mount: '/api/v1/auth/github', auth: 'public', factory: 'githubAuthRoutes', note: 'OAuth login/callback — public by design (the `state` param is the CSRF guard)' },
  { mount: '/api/v1/github', auth: 'router', factory: 'githubApiRoutes' },
  { mount: '/api/v1/search', auth: 'router', factory: 'searchRoutes' },
  { mount: '/api/v1/extensions', auth: 'router', factory: 'extensionRoutes' },
  { mount: '/api/v1/languages', auth: 'public', factory: 'languageRoutes', note: 'read-only runtime list — public by design (docs/API.md)' },
  { mount: '/api/v1/android', auth: 'router', factory: 'androidRoutes' },
  { mount: '/api/v1/pair', auth: 'router', factory: 'pairRoutes' },
  { mount: '/api/v1/pair-suggest', auth: 'inline', factory: 'pairSuggestMiddleware', note: 'legacy alias of /api/v1/pair/suggest, guarded by the same chain' },
  { mount: '/api/v1/prompt', auth: 'router', factory: 'promptRoutes' },
  { mount: '/api/v1/clean', auth: 'router', factory: 'cleanRoutes' }
];

/** The only API mounts allowed without authentication. */
export const PUBLIC_API_MOUNTS = ROUTE_POLICY.filter((e) => e.auth === 'public').map((e) => e.mount);

const FACTORIES = {
  authRoutes,
  sessionRoutes,
  pluginRoutes,
  watchRoutes,
  usageRoutes,
  uploadRoutes,
  keyRoutes,
  workspaceRoutes,
  settingsRoutes,
  githubAuthRoutes,
  githubApiRoutes,
  searchRoutes,
  extensionRoutes,
  languageRoutes,
  androidRoutes,
  pairRoutes,
  pairSuggestMiddleware,
  promptRoutes,
  cleanRoutes
};

export function policyEntry(mount) {
  return ROUTE_POLICY.find((e) => e.mount === mount) || null;
}

export function isPublicMount(mount) {
  return PUBLIC_API_MOUNTS.includes(mount);
}

/**
 * Mount a router that MUST be protected — refuses to start without a secret
 * (fail closed; BSEC-002). Use this for every future `app.use('/api/…')`.
 */
export function mountProtected(app, mountPath, factory, { secret, env = process.env } = {}) {
  if (!secret) {
    throw new Error(`[route-policy] refusing to mount ${mountPath} without a secret (BSEC-002: fail closed)`);
  }
  const entry = policyEntry(mountPath);
  if (entry && entry.auth === 'public') {
    throw new Error(`[route-policy] ${mountPath} is allowlisted as PUBLIC — mount it with mountPublic()`);
  }
  app.use(mountPath, factory({ secret, env }));
}

/**
 * Mount a router that is explicitly public — refuses any path that is not in
 * the allowlist, so "public by accident" cannot happen (BSEC-002).
 */
export function mountPublic(app, mountPath, factory, opts = {}) {
  if (!isPublicMount(mountPath)) {
    throw new Error(`[route-policy] ${mountPath} is not allowlisted as public — add it to ROUTE_POLICY with auth:'public' (or mount it protected)`);
  }
  app.use(mountPath, factory(opts));
}

/**
 * Mount every entry of the policy table and return a report for the startup
 * log (BSEC-002: protected/public counts).
 *
 * @returns {{ entries: Array<{mount: string, auth: string, guarded: any}>, protectedCount: number, publicCount: number, publicMounts: string[] }}
 */
export function mountApiRoutes(app, { secret, env = process.env } = {}) {
  const entries = [];
  for (const entry of ROUTE_POLICY) {
    const factory = FACTORIES[entry.factory];
    if (typeof factory !== 'function') {
      throw new Error(`[route-policy] unknown factory "${entry.factory}" for ${entry.mount}`);
    }
    if (entry.auth === 'public') {
      if (!isPublicMount(entry.mount)) throw new Error(`[route-policy] ${entry.mount} is not allowlisted as public`);
      const router = factory({ secret, env });
      app.use(entry.mount, router);
      entries.push({ mount: entry.mount, auth: 'public', guarded: router });
    } else if (entry.auth === 'inline') {
      // Explicit [middleware…] chain from the route file (pair-suggest alias).
      if (!secret) throw new Error(`[route-policy] refusing to mount ${entry.mount} without a secret (BSEC-002: fail closed)`);
      const chain = factory({ secret, env });
      app.post(entry.mount, ...chain);
      entries.push({ mount: entry.mount, auth: 'inline', guarded: chain });
    } else {
      if (!secret) throw new Error(`[route-policy] refusing to mount ${entry.mount} without a secret (BSEC-002: fail closed)`);
      const router = factory({ secret, env });
      app.use(entry.mount, router);
      entries.push({ mount: entry.mount, auth: 'router', guarded: router });
    }
  }
  return {
    entries,
    protectedCount: entries.filter((e) => e.auth !== 'public').length,
    publicCount: entries.filter((e) => e.auth === 'public').length,
    publicMounts: entries.filter((e) => e.auth === 'public').map((e) => e.mount)
  };
}

/** BSEC-002: startup visibility — how many mounts are guarded, which are not. */
export function logRoutePolicy(report, log = console.info) {
  log(
    `[routes] policy: ${report.protectedCount} protected · ${report.publicCount} public`
    + (report.publicMounts.length ? ` (${report.publicMounts.join(', ')})` : '')
    + ' · public app endpoints: /health /metrics /api/docs /api/v1/version /live'
  );
}
