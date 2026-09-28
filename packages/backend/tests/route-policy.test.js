import { describe, it, expect } from 'vitest';
import express from 'express';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const { ROUTE_POLICY, PUBLIC_API_MOUNTS, mountApiRoutes, mountProtected, mountPublic, logRoutePolicy, policyEntry } =
  await import('../src/route-policy.js');
const { authMiddleware } = await import('../src/auth.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

/** Recursively look for the `_mcodeAuth` marker set by authMiddleware(). */
function hasAuth(x) {
  if (!x) return false;
  if (Array.isArray(x)) return x.some(hasAuth);
  if (typeof x === 'function') {
    if (x._mcodeAuth) return true;
    if (Array.isArray(x.stack)) return x.stack.some(hasAuth); // express Router
    return false;
  }
  // Route layer: guard lives in route.stack (per-route middleware)
  if (x.route && Array.isArray(x.route.stack)) {
    if (x.route.stack.some((h) => hasAuth(h.handle))) return true;
  }
  if (x.handle) return hasAuth(x.handle);
  return false;
}

describe('BSEC-002 route policy', () => {
  it('mountApiRoutes mounts every policy entry and reports protected/public counts', () => {
    const app = express();
    const report = mountApiRoutes(app, { secret: 'test-secret', env: {} });

    expect(report.entries.map((e) => e.mount)).toEqual(ROUTE_POLICY.map((e) => e.mount));
    // Only the two read-only / OAuth-entry routers are public by design.
    expect([...report.publicMounts].sort()).toEqual(['/api/v1/auth/github', '/api/v1/languages']);
    expect(report.publicCount).toBe(2);
    expect(report.protectedCount).toBe(ROUTE_POLICY.length - 2);
    expect([...PUBLIC_API_MOUNTS].sort()).toEqual(['/api/v1/auth/github', '/api/v1/languages']);
  });

  it('every non-public mount carries the authMiddleware marker', () => {
    const app = express();
    const report = mountApiRoutes(app, { secret: 'test-secret', env: {} });

    for (const entry of report.entries) {
      if (entry.auth === 'public') continue;
      expect(hasAuth(entry.guarded), `${entry.mount} must install authMiddleware`).toBe(true);
    }
  });

  it('the public allowlist routers really are unauthenticated', () => {
    const app = express();
    const report = mountApiRoutes(app, { secret: 'test-secret', env: {} });
    for (const mount of PUBLIC_API_MOUNTS) {
      const entry = report.entries.find((e) => e.mount === mount);
      expect(entry.auth).toBe('public');
      expect(hasAuth(entry.guarded), `${mount} is allowlisted as public`).toBe(false);
    }
  });

  it('mountProtected fails closed when the secret is missing', () => {
    const app = express();
    expect(() =>
      mountProtected(app, '/api/v1/thing', () => express.Router(), { secret: undefined })
    ).toThrow(/fail closed/);
    // …and refuses to "protect" an entry that is allowlisted as public.
    expect(() =>
      mountProtected(app, '/api/v1/languages', () => express.Router(), { secret: 's' })
    ).toThrow(/PUBLIC/);
  });

  it('mountPublic refuses any path that is not explicitly allowlisted', () => {
    const app = express();
    expect(() =>
      mountPublic(app, '/api/v1/oops', () => express.Router(), {})
    ).toThrow(/not allowlisted as public/);
    expect(() =>
      mountPublic(app, '/api/v1/languages', () => express.Router(), {})
    ).not.toThrow();
  });

  it('mountApiRoutes fails closed without a secret', () => {
    const app = express();
    expect(() => mountApiRoutes(app, { secret: undefined, env: {} })).toThrow(/fail closed/);
  });

  it('startup log states the protected/public split', () => {
    const lines = [];
    const app = express();
    const report = mountApiRoutes(app, { secret: 'test-secret', env: {} });
    logRoutePolicy(report, (line) => lines.push(line));
    expect(lines[0]).toContain(`${report.protectedCount} protected`);
    expect(lines[0]).toContain('/api/v1/languages');
  });

  it('server.js mounts exclusively through ROUTE_POLICY (no stray app.use)', () => {
    const serverSrc = readFileSync(join(srcDir, 'server.js'), 'utf8');
    expect(serverSrc).toContain('mountApiRoutes(app, { secret, env })');
    expect(serverSrc).toContain('logRoutePolicy(routeReport)');
    // No direct /api/v1 router mounts may survive outside route-policy.js
    // (the `rateLimit` middlewares in front of auth/session mounts are fine).
    expect(serverSrc).not.toMatch(/app\.use\('\/api\/v1\/[^']+',\s*[a-zA-Z]+Routes/);
    expect(serverSrc).not.toMatch(/app\.post\('\/api\/v1\//);
  });

  it('no route file may mount auth conditionally (the old fail-open pattern)', () => {
    for (const file of readdirSync(join(srcDir, 'routes'))) {
      const src = readFileSync(join(srcDir, 'routes', file), 'utf8');
      expect(src, `${file} must not use if (secret) router.use(...)`).not.toMatch(/if\s*\(\s*secret\s*\)\s*router\.use/);
    }
  });

  it('authMiddleware exposes the _mcodeAuth marker', () => {
    const mw = authMiddleware({ secret: 'x' });
    expect(mw._mcodeAuth).toBe(true);
    expect(typeof mw).toBe('function');
    expect(policyEntry('/api/v1/languages').auth).toBe('public');
    expect(policyEntry('/api/v1/nope')).toBeNull();
  });
});
