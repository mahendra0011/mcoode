/**
 * Test Mode — "traditional" test types (doc 48, Step 3a).
 *
 * unit / integration / load / a11y. These extend the TestingPanel (doc 35)
 * philosophy — auto-generated cases run through the project's own tooling.
 * unit + integration tests are model-generated from the feature inventory,
 * integration/load tests are executed directly against `targetUrl` (safety:
 * local/staging by default), a11y uses axe-core when installed.
 */
import { join, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseInventoryOutput } from './feature-inventory.js';

const UNIT_SYSTEM = `TEST_MODE_UNIT_TESTS
You are mcode's unit-test generator. Given a list of features/functions from
the user's project, write runnable unit tests.

Respond with ONLY a JSON object (no markdown fence, no commentary):
{ "cases": [ { "name": "adds numbers correctly", "code": "assert(1+1===2)" } ] }

Rules:
- "code" is plain JavaScript using ONLY the node:test + node:assert modules
  (already imported for you as: import { test } from 'node:test'; import assert from 'node:assert';)
- write 6-15 cases covering the most testable pure logic implied by the features
- each case is independent and side-effect free`;

const INTEGRATION_SYSTEM = `TEST_MODE_INTEGRATION_TESTS
You are mcode's integration-test generator. Given backend endpoints from the
user's project, define HTTP requests that verify each endpoint works.

Respond with ONLY a JSON object (no markdown fence, no commentary):
{ "requests": [ { "name": "health check", "method": "GET", "path": "/api/health", "body": null, "expectStatus": 200, "expectContains": "ok" } ] }

Rules:
- expectStatus is the HTTP status a healthy endpoint returns
- expectContains (optional) is a substring the response body should include
- use realistic-but-harmless request bodies; never destructive verbs on
  collections (no DELETE on list endpoints)`;

function pickRoute(route, methodHint = 'GET') {
  const m = /^\s*([A-Z]+)\s+(.+)$/.exec(String(route || ''));
  if (m) return { method: m[1], path: m[2] };
  return { method: methodHint, path: String(route || '/') };
}

/* ── Unit tests (Step 3a) ─────────────────────────────────────────────── */

export async function generateAndRunUnitTests(inventory, { router, bus = null, projectPath } = {}) {
  bus?.emit('TEST_TRADITIONAL', { kind: 'unit', status: 'running' });
  const summary = { kind: 'unit', total: 0, passed: 0, failed: 0, detail: '', cases: [] };

  let cases = [];
  try {
    const assignment = await router.pick('test');
    const raw = await assignment.provider.complete(assignment.model.id, {
      messages: [
        { role: 'system', content: UNIT_SYSTEM },
        { role: 'user', content: `FEATURES:\n${JSON.stringify(inventory.slice(0, 25), null, 2)}` }
      ],
      temperature: 0.2
    });
    const parsed = parseInventoryOutput(raw?.text);
    cases = Array.isArray(parsed) ? parsed : parsed.cases || [];
  } catch (err) {
    summary.detail = `generation failed: ${err.message}`;
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
    return summary;
  }

  if (cases.length === 0) {
    summary.detail = 'no cases generated';
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
    return summary;
  }

  // Generated tests run under node:test — works with zero project dependencies.
  const body = cases.map((c) => `test(${JSON.stringify(String(c.name).slice(0, 120))}, () => {\n${c.code}\n});`).join('\n\n');
  const file = join(projectPath, '.mcode', 'reports', 'test-mode-generated', `unit-${Date.now()}.test.mjs`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `import { test } from 'node:test';\nimport assert from 'node:assert';\n\n${body}\n`, 'utf8');

  const { execa } = await import('execa');
  try {
    const res = await execa(process.execPath, ['--test', file], { cwd: projectPath, reject: false, timeout: 120_000 });
    const stdout = res.stdout || '';
    const passMatch = /pass\s+(\d+)/.exec(stdout);
    const failMatch = /fail(?:ed)?\s+(\d+)/.exec(stdout);
    summary.total = cases.length;
    summary.passed = passMatch ? Number(passMatch[1]) : cases.length;
    summary.failed = failMatch ? Number(failMatch[1]) : Math.max(0, cases.length - summary.passed);
    summary.detail = res.exitCode === 0 ? 'all generated unit tests passed' : `exit ${res.exitCode} — ${stdout.split('\n').filter((l) => /not ok|fail/i.test(l)).slice(0, 5).join(' | ')}`;
    summary.cases = cases.map((c) => c.name);
    summary.file = file;
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: summary.failed > 0 ? 'failed' : 'done' });
  } catch (err) {
    summary.detail = `runner failed: ${err.message}`;
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
  }
  return summary;
}

/* ── Integration tests (Step 3a) ──────────────────────────────────────── */

export async function generateAndRunIntegrationTests(inventory, { router, bus = null, targetUrl = 'http://localhost:3000' } = {}) {
  bus?.emit('TEST_TRADITIONAL', { kind: 'integration', status: 'running' });
  const summary = { kind: 'integration', total: 0, passed: 0, failed: 0, detail: '', cases: [] };

  const backendFeatures = inventory.filter((f) => f.layer === 'backend' || f.layer === 'both');
  let requests = [];
  try {
    const assignment = await router.pick('test');
    const raw = await assignment.provider.complete(assignment.model.id, {
      messages: [
        { role: 'system', content: INTEGRATION_SYSTEM },
        { role: 'user', content: `ENDPOINTS:\n${JSON.stringify(backendFeatures.slice(0, 25), null, 2)}` }
      ],
      temperature: 0.2
    });
    const parsed = parseInventoryOutput(raw?.text);
    requests = Array.isArray(parsed) ? parsed : parsed.requests || [];
  } catch (err) {
    summary.detail = `generation failed: ${err.message}`;
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
    return summary;
  }

  if (requests.length === 0) {
    // Deterministic fallback: plain GET on each backend route.
    requests = backendFeatures.slice(0, 15).map((f) => {
      const { method, path } = pickRoute(f.route);
      return { name: f.name, method, path, expectStatus: 200 };
    }).filter((r) => r.method === 'GET');
  }

  summary.total = requests.length;
  for (const req of requests) {
    try {
      const url = new URL(req.path, targetUrl).href;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, {
        method: req.method || 'GET',
        headers: { 'content-type': 'application/json' },
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: ctrl.signal
      });
      clearTimeout(timer);
      const text = await res.text().catch(() => '');
      const statusOk = req.expectStatus ? res.status === req.expectStatus : res.status < 500;
      const containsOk = !req.expectContains || text.includes(req.expectContains);
      if (statusOk && containsOk) {
        summary.passed++;
        summary.cases.push({ name: req.name, status: 'passed', httpStatus: res.status });
      } else {
        summary.failed++;
        summary.cases.push({ name: req.name, status: 'failed', httpStatus: res.status, detail: statusOk ? `body missing "${req.expectContains}"` : `expected ${req.expectStatus || '<500'}, got ${res.status}` });
      }
    } catch (err) {
      summary.failed++;
      summary.cases.push({ name: req.name, status: 'failed', detail: err.message });
    }
  }
  summary.detail = `${summary.passed}/${summary.total} passed against ${targetUrl}`;
  bus?.emit('TEST_TRADITIONAL', { ...summary, status: summary.failed > 0 ? 'failed' : 'done' });
  return summary;
}

/* ── Accessibility (Step 3a) — axe-core, no AI needed ─────────────────── */

export async function runA11yScan(inventory, { bus = null, targetUrl = 'http://localhost:3000' } = {}) {
  bus?.emit('TEST_TRADITIONAL', { kind: 'a11y', status: 'running' });
  const summary = { kind: 'a11y', total: 0, passed: 0, failed: 0, detail: '', cases: [] };

  let axeSource = null;
  try {
    // resolve from node_modules if present (CommonJS export)
    const req = (await import('node:module')).createRequire(import.meta.url);
    axeSource = req('axe-core/axe.min.js');
  } catch {
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js');
      if (res.ok) axeSource = await res.text();
    } catch {
      /* offline without local axe — degrade below */
    }
  }
  if (!axeSource) {
    summary.detail = 'axe-core unavailable (install it locally to enable a11y scanning)';
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
    return summary;
  }

  const pages = inventory
    .filter((f) => f.layer === 'frontend' || f.layer === 'both')
    .map((f) => f.route)
    .map((r) => (/^\s*[A-Z]+\s+/.test(r) ? null : r))
    .filter(Boolean)
    .slice(0, 8);

  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    summary.detail = /Executable doesn't exist/.test(err?.message || '')
      ? 'Playwright browser binary missing — run `npx playwright install chromium`'
      : `browser launch failed: ${err?.message || err}`;
    bus?.emit('TEST_TRADITIONAL', { ...summary, status: 'failed' });
    return summary;
  }
  const page = await browser.newPage();

  try {
    for (const route of pages) {
      summary.total++;
      try {
        const url = new URL(route, targetUrl).href;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.evaluate(axeSource);
        const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
        const violations = results.violations || [];
        const minor = violations.filter((v) => v.impact === 'minor' || v.impact === undefined).length;
        const serious = violations.length - minor;
        if (serious === 0) {
          summary.passed++;
          summary.cases.push({ name: `a11y ${route}`, status: 'passed', detail: `${minor} low-severity issue${minor === 1 ? '' : 's'}` });
        } else {
          summary.failed++;
          summary.cases.push({ name: `a11y ${route}`, status: 'failed', detail: violations.slice(0, 4).map((v) => `${v.id}(${v.impact})`).join(', ') });
        }
      } catch (err) {
        summary.cases.push({ name: `a11y ${route}`, status: 'failed', detail: err.message });
      }
    }
    summary.detail = `${summary.passed}/${summary.total} pages passed WCAG spot-check`;
  } finally {
    try {
      await browser.close();
    } catch { /* ignore */ }
  }
  bus?.emit('TEST_TRADITIONAL', { ...summary, status: summary.failed > 0 ? 'failed' : 'done' });
  return summary;
}

/* ── Load testing (Step 3a) ───────────────────────────────────────────── */

export async function runLoadTest(inventory, { bus = null, targetUrl = 'http://localhost:3000', concurrency = 10, requestsPerVU = 10 } = {}) {
  bus?.emit('TEST_TRADITIONAL', { kind: 'load', status: 'running' });
  const summary = { kind: 'load', total: 0, passed: 0, failed: 0, detail: '', cases: [] };
  const backendFeatures = inventory.filter((f) => f.layer === 'backend' || f.layer === 'both').slice(0, 5);

  for (const feature of backendFeatures) {
    const { method, path } = pickRoute(feature.route);
    if (method !== 'GET') {
      summary.cases.push({ name: `${feature.name} (skipped — ${method} not load-safe)`, status: 'skipped' });
      continue;
    }
    const url = new URL(path, targetUrl).href;
    const latencies = [];
    let errors = 0;
    const total = concurrency * requestsPerVU;

    async function worker() {
      for (let i = 0; i < requestsPerVU; i++) {
        const t0 = Date.now();
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 10_000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(timer);
          await res.arrayBuffer().catch(() => {});
          if (res.status >= 500) errors++;
        } catch {
          errors++;
        }
        latencies.push(Date.now() - t0);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] || 0;
    const errorRate = total > 0 ? errors / total : 0;
    const passed = errorRate < 0.05; // <5% errors at load = pass
    if (passed) summary.passed++;
    else summary.failed++;
    summary.total++;
    summary.cases.push({ name: `${method} ${path}`, status: passed ? 'passed' : 'failed', p50Ms: p50, p95Ms: p95, errorRate: Number(errorRate.toFixed(3)), concurrency, requests: total });
  }

  if (summary.total === 0) {
    summary.detail = 'no safe GET endpoints found for load testing';
  } else {
    const worst = summary.cases.filter((c) => c.p95Ms !== undefined).sort((a, b) => b.p95Ms - a.p95Ms)[0];
    summary.detail = worst ? `worst p95 ${worst.p95Ms}ms at ${worst.concurrency} VUs` : 'load run complete';
  }
  bus?.emit('TEST_TRADITIONAL', { ...summary, status: summary.failed > 0 ? 'failed' : 'done' });
  return summary;
}
