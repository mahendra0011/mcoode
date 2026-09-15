import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import {
  TEST_TYPES,
  DEFAULT_TARGET_URL,
  resolveTargetUrl,
  buildTestReport,
  saveTestReport,
  createTestBus,
  runTestMode,
  dispatchFixSubagent
} from '../src/core/test-mode/index.js';
import {
  buildFeatureInventory,
  heuristicInventory,
  parseInventoryOutput,
  buildRepoContext
} from '../src/core/test-mode/feature-inventory.js';
import {
  parseJsonLoose,
  describeStep,
  executeStep,
  planInteractionScript,
  diagnoseFailure,
  attachPageCollectors,
  runAutonomousTesting
} from '../src/core/test-mode/autonomous-agent.js';

describe('Test Mode (doc 48) — autonomous self-healing testing agent', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcode-testmode-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Step 1 — test type selector', () => {
    it('defines all 7 types with autonomous recommended', () => {
      expect(TEST_TYPES.map((t) => t.id)).toEqual(['unit', 'integration', 'e2e', 'visual', 'load', 'a11y', 'autonomous']);
      const autonomous = TEST_TYPES.find((t) => t.id === 'autonomous');
      expect(autonomous.recommended).toBe(true);
      expect(autonomous.desc).toContain('AI plays the app like a real user');
      for (const t of TEST_TYPES) {
        expect(t.label).toBeDefined();
        expect(t.desc).toBeDefined();
      }
    });

    it('ships a default local-only target and guards remote URLs (safety note)', () => {
      expect(DEFAULT_TARGET_URL).toBe('http://localhost:3000');
      expect(resolveTargetUrl({ targetUrl: 'http://localhost:5173' })).toBe('http://localhost:5173');
      expect(resolveTargetUrl({ targetUrl: 'http://127.0.0.1:8080/' })).toBe('http://127.0.0.1:8080');
      expect(() => resolveTargetUrl({ targetUrl: 'https://prod.example.com' })).toThrow(/refusing to target non-local/);
      // explicit consent + staging hostname hint both work
      expect(resolveTargetUrl({ targetUrl: 'https://example.com', allowRemote: true })).toBe('https://example.com');
      expect(resolveTargetUrl({ targetUrl: 'https://staging.myapp.com' })).toBe('https://staging.myapp.com');
      // config target is applied when no explicit target given
      expect(resolveTargetUrl({ configTarget: 'http://localhost:9999' })).toBe('http://localhost:9999');
    });
  });

  describe('Step 2 — feature inventory', () => {
    it('parseInventoryOutput handles fenced and bare JSON objects', () => {
      expect(parseInventoryOutput('```json\n{"features":[{"id":"f1","name":"Login"}]}\n```').features[0].id).toBe('f1');
      expect(parseInventoryOutput('{"features":[{"id":"f2"}]}').features[0].id).toBe('f2');
      expect(parseInventoryOutput('prefix [{"id":"a"},{"id":"b"}] suffix')).toHaveLength(2);
      expect(() => parseInventoryOutput('no json here')).toThrow();
    });

    it('heuristicInventory scans express-style routes and page files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'heur' }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'app', 'dashboard'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'server.js'),
        `app.get('/api/health', h); app.post('/api/orders', o);`
      );
      fs.writeFileSync(path.join(tmpDir, 'app', 'dashboard', 'page.tsx'), `export default () => <main>hi</main>`);

      const inventory = await heuristicInventory(tmpDir);
      expect(inventory.length).toBeGreaterThanOrEqual(3);
      expect(inventory.some((f) => f.layer === 'backend' && f.route === 'GET /api/health')).toBe(true);
      expect(inventory.some((f) => f.layer === 'backend' && f.route === 'POST /api/orders' && f.requiresAuth === false)).toBe(true);
      expect(inventory.some((f) => f.layer === 'frontend' && f.route === '/dashboard')).toBe(true);
    });

    it('buildFeatureInventory falls back to heuristic when no router is available', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'fallback' }));
      const inv = await buildFeatureInventory(tmpDir, {});
      expect(inv.length).toBeGreaterThan(0);
      for (const f of inv) {
        expect(f.id).toBeDefined();
        expect(f.name).toBeDefined();
        expect(['frontend', 'backend', 'both']).toContain(f.layer);
        expect(f.route).toBeDefined();
      }
    });

    it('buildRepoContext produces a tech-stack summary', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'ctx', dependencies: { react: '^19' }, scripts: { test: 'vitest run', dev: 'vite' } }));
      const ctx = await buildRepoContext(tmpDir);
      expect(ctx).toContain('--- tech stack ---');
    });
  });

  describe('Step 3b — autonomous agent', () => {
    it('parses model JSON loosely and describes steps', () => {
      const parsed = parseJsonLoose('Sure here you go:\n{"steps":[{"action":"click","target":"text=Continue"}]}\nThanks!');
      expect(parsed.steps[0].action).toBe('click');
      expect(describeStep({ action: 'click', target: 'text=Continue' })).toBe('Click "Continue"');
      expect(describeStep({ action: 'navigate', target: '/checkout' })).toBe('Navigate to /checkout');
      expect(describeStep({ action: 'fill', target: '#email', value: 'a@b.co' })).toBe('Fill #email with "a@b.co"');
      expect(describeStep({ action: 'expect', expectAfter: 'confirmation page' })).toBe('Expect confirmation page');
    });

    it('executeStep runs navigate/click/expect and surfaces failures', async () => {
      // Minimal Playwright-shaped page double
      const page = {
        _url: 'about:blank',
        url: () => page._url,
        async goto(target) { page._url = target; return { status: () => 200 }; },
        locator(sel) {
          return {
            first() { return this; },
            async waitFor() {
              if (sel === '[data-testid=missing]') throw new Error('element not found: [data-testid=missing]');
            },
            async click() { page._url = 'http://localhost:3000/success'; },
            async fill() {},
            async selectOption() {},
          };
        },
        getByText() { return page.locator('text').first(); },
        getByPlaceholder() { return page.locator('placeholder-item').first(); },
        keyboard: { async press() {} },
        async waitForTimeout() {},
        async waitForLoadState() {},
      };

      const ok = await executeStep(page, { action: 'navigate', target: 'http://localhost:3000/login' });
      expect(ok.success).toBe(true);
      expect(ok.url).toBe('http://localhost:3000/login');

      const done = await executeStep(page, { action: 'expect', target: '/login' });
      expect(done.success).toBe(true);

      const failed = await executeStep(page, { action: 'expect', target: '[data-testid=missing]' });
      expect(failed.success).toBe(false);
      expect(failed.error).toContain('element not found');

      // unknown actions fail closed
      const unknown = await executeStep(page, { action: 'explode', target: 'x' });
      expect(unknown.success).toBe(false);
    });

    it('planInteractionScript falls back to a deterministic navigate+expect script', async () => {
      const steps = await planInteractionScript(
        { layer: 'frontend', route: '/about', name: 'About' },
        { router: null }
      );
      expect(steps.length).toBe(2);
      expect(steps[0].action).toBe('navigate');
      expect(steps[1].action).toBe('expect');
    });

    it('diagnoseFailure degrades gracefully when no model/router is available', async () => {
      const diag = await diagnoseFailure(
        { feature: { name: 'Checkout', route: '/checkout' }, step: { action: 'click', target: '#pay' }, outcome: { error: 'boom' }, consoleLogs: [], failedRequests: [] },
        { router: null }
      );
      expect(diag.issue).toBeDefined();
      expect(diag).toHaveProperty('domain');
      expect(diag).toHaveProperty('likelyFiles');
    });

    it('attachPageCollectors watches console errors and failed requests', () => {
      const handlers = {};
      const page = {
        on: (evt, fn) => { handlers[evt] = fn; },
      };
      attachPageCollectors(page);
      expect(typeof handlers.console).toBe('function');
      expect(typeof handlers.pageerror).toBe('function');
      expect(typeof handlers.requestfailed).toBe('function');
    });

    it('runAutonomousTesting skips cleanly when there are no frontend features', async () => {
      const { results, skipped } = await runAutonomousTesting(
        [{ id: 'b1', name: 'API', layer: 'backend', route: 'GET /api/x' }],
        { router: null, projectPath: tmpDir, config: {}, headless: true }
      );
      expect(results).toHaveLength(0);
      expect(skipped).toContain('no frontend features');
    });
  });

  describe('Final report (docs 43/47 MD shape, test-scoped)', () => {
    it('buildTestReport renders the autonomous summary + self-healed issues', () => {
      const md = buildTestReport({
        projectName: 'my-app',
        inventory: [{ id: 'f1', name: 'Checkout', layer: 'frontend', route: '/checkout' }],
        autonomousResults: [
          {
            feature: 'Checkout',
            featureId: 'f1',
            route: '/checkout',
            status: 'passed-after-fix',
            fixedIssues: [
              { feature: 'Checkout', issue: 'payment radio missing data-testid', files: ['src/PaymentSelector.jsx'], attempts: 1 }
            ]
          }
        ],
        traditional: [
          { kind: 'unit', total: 12, passed: 12, failed: 0, detail: 'all passed' },
          { kind: 'load', total: 1, passed: 1, failed: 0, cases: [{ p95Ms: 340, concurrency: 100 }] }
        ],
        targetUrl: 'http://localhost:3000'
      });
      expect(md).toContain('# Test Report — my-app');
      expect(md).toContain('## Autonomous Testing — 1 features');
      expect(md).toContain('0 passed cleanly');
      expect(md).toContain('1 passed after auto-fix (1 issues found and fixed during testing)');
      expect(md).toContain('## Self-Healed Issues');
      expect(md).toContain('1. Checkout — payment radio missing data-testid — src/PaymentSelector.jsx');
      expect(md).toContain('## Unit Tests');
      expect(md).toContain('12/12 passed');
      expect(md).toContain('p95 latency 340ms at 100 concurrent users');
    });

    it('saveTestReport writes to .mcode/reports/', async () => {
      const { filePath, reportFileName } = await saveTestReport('# Test Report\n', tmpDir);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(reportFileName).toMatch(/^test-report-.*\.md$/);
    });
  });

  describe('Plumbing', () => {
    it('createTestBus returns an EventEmitter', () => {
      const bus = createTestBus();
      expect(bus).toBeInstanceOf(EventEmitter);
    });

    it('dispatchFixSubagent is a no-op (failed) without a router', async () => {
      const r = await dispatchFixSubagent({ id: 'x', title: 'fix', domain: 'bugfix' }, {});
      expect(r.status).toBe('failed');
    });

    it('runTestMode rejects remote targets without consent and reports on local ones', async () => {
      const bus = createTestBus();
      const seen = [];
      bus.on('TEST_MODE_DONE', (s) => seen.push(s));

      // safety: remote without allowRemote throws
      await expect(
        runTestMode(['autonomous'], { projectPath: tmpDir, bus, targetUrl: 'https://example.com' })
      ).rejects.toThrow(/refusing to target non-local/);

      // local run with heuristic-only inventory completes and writes a report
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'smoke' }));
      const summary = await runTestMode(['unit'], { projectPath: tmpDir, bus, targetUrl: 'http://localhost:9999' });
      expect(summary.reportFileName).toMatch(/^test-report-.*\.md$/);
      expect(summary.targetUrl).toBe('http://localhost:9999');
      expect(seen).toHaveLength(1);
      expect(seen[0].types).toEqual(['unit']);
    }, 60_000);
  });
});