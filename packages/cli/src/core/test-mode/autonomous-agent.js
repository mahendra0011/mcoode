/**
 * Test Mode — Autonomous exploratory testing agent (doc 48, Step 3b).
 *
 * Extends PlaywrightAudit's passive audit machinery (doc 36/44) into a
 * planning + acting + self-healing loop:
 *
 *   1. PLAN   — model writes a step-by-step interaction script for ONE feature
 *   2. ACT    — Playwright executes the script like a real user
 *   3. OBSERVE — after each step: URL/element/console/network expectations
 *   4. DIAGNOSE — on failure: screenshot + console/network logs to the model
 *   5. FIX    — dispatch a fix subagent (same dispatcher as every other mode)
 *   6. RE-RUN the SAME failed step (never the whole script) to verify
 *
 * Safety (per doc 48): max 3 self-heal attempts per step; a feature that
 * still fails after the budget is marked `needs-review` and the agent moves
 * on — it never loops forever.
 */
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const SCRIPT_SYSTEM = `TEST_MODE_SCRIPT
You are mcode's test-mode interaction planner. Write a step-by-step browser
interaction script to test the given feature as a REAL user would.

Respond with ONLY a JSON object (no markdown fence, no commentary):
{ "steps": [
  { "action": "navigate", "target": "/checkout" },
  { "action": "fill", "target": "#address", "value": "123 Main St" },
  { "action": "click", "target": "text=Continue" },
  { "action": "select", "target": "select#payment", "value": "card" },
  { "action": "press", "target": "Enter" },
  { "action": "wait", "target": "2000" },
  { "action": "expect", "target": "[data-testid=order-number]", "expectAfter": "confirmation page with order number" }
] }

Rules:
- actions: navigate | click | fill | select | press | wait | expect
- target for navigate is a URL or path; for others a CSS selector, or
  "text=..." for visible-text targeting, or "placeholder=..." for inputs
- keep scripts 3-10 steps, ending with at least one expect step
- selectors must be plausible for the described feature — do not invent
  decorative selectors you cannot justify`;

const DIAGNOSE_SYSTEM = `TEST_MODE_DIAGNOSE
You are mcode's test-mode failure diagnostician. A browser automation step
failed while testing the user's running app. Diagnose the ROOT CAUSE and
identify which source file(s) likely need fixing.

Respond with ONLY a JSON object (no markdown, no commentary):
{ "issue": "short root-cause statement",
  "domain": "frontend | backend | db | devops | test",
  "likelyFiles": ["src/components/PaymentSelector.jsx"],
  "summary": "1-3 sentences of diagnosis detail",
  "fixHint": "what the subagent should change" }`;

/** Parse a JSON object out of loose model output (fences, prose, etc.). */
export function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  if (start === -1) throw new Error('model output contained no JSON object');
  let end = start;
  while ((end = candidate.indexOf('}', end)) !== -1) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      end += 1;
    }
  }
  throw new Error('model output contained no valid JSON object');
}

const STEP_DESC = {
  navigate: (s) => `Navigate to ${s.target}`,
  click: (s) => `Click "${s.target.replace(/^text=|^placeholder=/, '')}"`,
  fill: (s) => `Fill ${s.target} with "${(s.value || '').slice(0, 30)}"`,
  select: (s) => `Select "${s.value}" in ${s.target}`,
  press: (s) => `Press ${s.target}`,
  wait: (s) => `Wait ${s.target}ms`,
  expect: (s) => `Expect ${s.expectAfter || s.target}`
};

export function describeStep(step) {
  const fn = STEP_DESC[step?.action];
  return fn ? fn(step) : `${step?.action} ${step?.target || ''}`.trim();
}

/** Resolve a model-provided target to a Playwright locator. */
function toLocator(page, target) {
  const t = String(target || '');
  if (t.startsWith('text=')) return page.getByText(t.slice(5), { exact: false }).first();
  if (t.startsWith('placeholder=')) return page.getByPlaceholder(t.slice(12)).first();
  if (t.startsWith('role=')) {
    const m = /^role=([\w]+)(?:\[name=["']?([^"'\]]*)["']?\])?$/.exec(t);
    if (m) return page.getByRole(m[1], m[2] ? { name: m[2] } : {}).first();
  }
  return page.locator(t).first();
}

/**
 * Execute ONE script step in the live browser and verify its outcome.
 * @returns {{ success: boolean, error?: string, url?: string }}
 */
export async function executeStep(page, step) {
  const outcome = { success: false, url: page.url() };
  const action = String(step?.action || '').toLowerCase();
  try {
    switch (action) {
      case 'navigate': {
        const target = String(step.target || '/');
        const url = /^https?:\/\//i.test(target)
          ? target
          : new URL(target, page.url() !== 'about:blank' ? page.url() : undefined).href;
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        if (resp && resp.status() >= 500) {
          outcome.error = `navigation returned HTTP ${resp.status()}`;
          return outcome;
        }
        break;
      }
      case 'click': {
        const locator = toLocator(page, step.target);
        await locator.waitFor({ state: 'visible', timeout: 8000 });
        await locator.click({ timeout: 5000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        break;
      }
      case 'fill': {
        const locator = toLocator(page, step.target);
        await locator.waitFor({ state: 'visible', timeout: 8000 });
        await locator.fill(String(step.value ?? ''), { timeout: 5000 });
        break;
      }
      case 'select': {
        const locator = toLocator(page, step.target);
        await locator.waitFor({ state: 'attached', timeout: 8000 });
        await locator.selectOption(String(step.value ?? ''), { timeout: 5000 }).catch(async () => {
          // non-<select> dropdowns: click the option text instead
          await page.getByText(String(step.value ?? '')).first().click({ timeout: 4000 });
        });
        break;
      }
      case 'press': {
        await page.keyboard.press(step.target || 'Enter');
        break;
      }
      case 'wait': {
        await page.waitForTimeout(Number(step.target) || 1000);
        outcome.success = true;
        return outcome;
      }
      case 'expect': {
        if (step.target && /^(https?:\/\/|\/)/.test(step.target) && !step.expectAfter) {
          const expected = step.target;
          const current = page.url();
          const ok = expected.startsWith('/') ? (current.endsWith(expected) || current.includes(expected)) : current.includes(expected);
          if (!ok) {
            outcome.error = `expected URL to contain "${expected}" but was ${current}`;
            return outcome;
          }
        } else if (step.target) {
          const locator = toLocator(page, step.target);
          await locator.waitFor({ state: 'visible', timeout: 8000 });
        }
        break;
      }
      default:
        outcome.error = `unknown action "${step?.action}"`;
        return outcome;
    }
    outcome.success = true;
    outcome.url = page.url();
    return outcome;
  } catch (err) {
    outcome.error = err.message || String(err);
    outcome.url = page.url();
    return outcome;
  }
}

/** PLAN — model writes the interaction script for ONE feature. */
export async function planInteractionScript(feature, { router, bus = null, targetUrl = null } = {}) {
  let steps = null;
  if (router) {
    try {
      const assignment = await router.pick('test');
      if (assignment?.provider) {
        const raw = await assignment.provider.complete(assignment.model.id, {
          messages: [
            { role: 'system', content: SCRIPT_SYSTEM },
            {
              role: 'user',
              content: `FEATURE:\n${JSON.stringify({ ...feature, targetUrl }, null, 2)}\n\nBase URL when navigating by path: ${targetUrl || 'http://localhost:3000'}`
            }
          ],
          temperature: 0.2
        });
        const parsed = parseJsonLoose(raw?.text);
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) steps = parsed.steps;
        else if (Array.isArray(parsed)) steps = parsed;
      }
    } catch (err) {
      bus?.emit('MESSAGE', { kind: 'warn', text: `script planning failed for ${feature.name}: ${err.message}` });
    }
  }
  if (!steps) {
    // Deterministic fallback: navigate to the route and expect it to render.
    steps = [{ action: 'navigate', target: feature.route || '/' }, { action: 'expect', target: 'body' }];
  }
  return steps;
}

/** DIAGNOSE — screenshot context + logs to the model for a root-cause read. */
export async function diagnoseFailure({ feature, step, outcome, consoleLogs = [], failedRequests = [], screenshotPath = null }, { router }) {
  const errorText = outcome?.error || 'unknown error';
  // No router/model available — degrade to a deterministic diagnosis report
  if (!router) {
    return {
      issue: `step failed: ${errorText}`,
      domain: 'bugfix',
      likelyFiles: [],
      summary: errorText,
      fixHint: ''
    };
  }
  const assignment = await router.pick('bugfix');
  const prompt = [
    `FAILED STEP: ${JSON.stringify(step)}`,
    `ERROR: ${outcome?.error || 'unknown'}`,
    `CURRENT URL: ${outcome?.url || 'n/a'}`,
    consoleLogs.length ? `CONSOLE LOGS:\n${consoleLogs.slice(-20).join('\n')}` : 'CONSOLE LOGS: (none captured)',
    failedRequests.length ? `FAILED NETWORK REQUESTS:\n${failedRequests.join('\n')}` : 'FAILED NETWORK REQUESTS: (none)',
    screenshotPath ? `SCREENSHOT (saved for the report): ${screenshotPath}` : 'SCREENSHOT: (unavailable)',
    `FEATURE: ${feature?.name} (${feature?.route || 'n/a'})`
  ].join('\n\n');

  let raw = null;
  try {
    raw = await assignment.provider.complete(assignment.model.id, {
      messages: [
        { role: 'system', content: DIAGNOSE_SYSTEM },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    });
    const parsed = parseJsonLoose(raw?.text);
    return {
      issue: String(parsed.issue || 'unknown failure'),
      domain: ['frontend', 'backend', 'db', 'devops', 'test'].includes(parsed.domain) ? parsed.domain : 'bugfix',
      likelyFiles: Array.isArray(parsed.likelyFiles) ? parsed.likelyFiles.map(String).slice(0, 6) : [],
      summary: String(parsed.summary || parsed.issue || 'no summary'),
      fixHint: String(parsed.fixHint || '')
    };
  } catch {
    return {
      issue: `step failed: ${outcome?.error || 'unknown error'}`,
      domain: 'bugfix',
      likelyFiles: [],
      summary: outcome?.error || 'diagnosis model unavailable',
      fixHint: ''
    };
  }
}

/**
 * Execute a planned script with the self-healing loop.
 * On a failed step: diagnose -> dispatch fix subagent -> re-run the SAME step
 * (max `maxAttempts`, default 3). Never re-runs the script from scratch.
 */
export async function executeScriptWithSelfHeal(page, script, feature, ctx) {
  const { router, bus, dispatchFix, projectPath, maxAttempts = 3 } = ctx;
  const screenshotsDir = join(projectPath || process.cwd(), '.mcode', 'reports', 'test-screenshots');
  const fixedIssues = [];
  const stepResults = [];

  for (let i = 0; i < script.length; i++) {
    const step = script[i];
    const desc = describeStep(step);
    const outcome = await executeStep(page, step);

    if (outcome.success) {
      stepResults.push({ index: i, step, desc, status: 'passed' });
      bus?.emit('TEST_STEP', { feature: feature.name, featureId: feature.id, index: i + 1, total: script.length, desc, status: 'ok' });
      continue;
    }

    bus?.emit('TEST_STEP_FAILED', { feature: feature.name, featureId: feature.id, index: i + 1, total: script.length, desc, error: outcome.error });

    // Capture evidence once — screenshot + page logs
    let screenshotPath = null;
    try {
      await mkdir(screenshotsDir, { recursive: true });
      const shot = await page.screenshot({ fullPage: true });
      screenshotPath = join(screenshotsDir, `${feature.id}-step${i + 1}-${Date.now()}.png`);
      await writeFile(screenshotPath, shot);
    } catch {
      /* screenshot is evidence only — never fail the loop for it */
    }
    const consoleLogs = await collectConsoleErrors(page);
    const failedRequests = await collectFailedRequests(page);

    let fixed = false;
    let lastDiagnosis = null;
    for (let attempt = 1; attempt <= maxAttempts && !fixed; attempt++) {
      const diagnosis = await diagnoseFailure(
        { feature, step, outcome, consoleLogs, failedRequests, screenshotPath },
        { router }
      );
      lastDiagnosis = diagnosis;
      bus?.emit('TEST_DIAGNOSIS', {
        feature: feature.name,
        featureId: feature.id,
        attempt,
        issue: diagnosis.issue,
        summary: diagnosis.summary,
        likelyFiles: diagnosis.likelyFiles,
        screenshotPath
      });

      // FIX — same dispatcher contract as every other mode (subagentManager /
      // Subagent); respects permissionMode via the caller-supplied dispatchFix.
      const fixResult = await dispatchFix({
        feature, step, diagnosis, attempt,
        id: `testfix-${feature.id}-${i}-${attempt}`,
        title: `Fix: ${diagnosis.issue}`.slice(0, 90),
        domain: diagnosis.domain || 'bugfix',
        files: diagnosis.likelyFiles
      }, ctx);

      // RE-RUN the SAME failed step (not the whole script) to verify the fix
      const retryOutcome = await executeStep(page, step);
      fixed = retryOutcome.success;
      if (fixed) {
        stepResults.push({ index: i, step, desc, status: 'fixed', attempts: attempt, diagnosis });
        fixedIssues.push({
          feature: feature.name,
          featureId: feature.id,
          issue: diagnosis.issue,
          files: diagnosis.likelyFiles,
          attempts: attempt,
          fixedBy: fixResult?.summary || 'subagent'
        });
        bus?.emit('TEST_STEP', { feature: feature.name, featureId: feature.id, index: i + 1, total: script.length, desc, status: 'ok', retried: true });
      } else if (attempt === maxAttempts) {
        bus?.emit('MESSAGE', { kind: 'warn', text: `could not auto-heal ${feature.name} step ${i + 1} after ${maxAttempts} attempts — marking needs-review` });
      }
    }

    if (!fixed) {
      stepResults.push({ index: i, step, desc, status: 'failed', diagnosis: lastDiagnosis, screenshotPath });
      return {
        feature: feature.name,
        featureId: feature.id,
        route: feature.route,
        status: 'needs-review',
        failedAt: step,
        failedAtDesc: desc,
        error: outcome.error,
        screenshotPath,
        fixedIssues,
        stepResults,
        attemptsExhausted: true
      };
    }
  }

  return {
    feature: feature.name,
    featureId: feature.id,
    route: feature.route,
    status: fixedIssues.length > 0 ? 'passed-after-fix' : 'passed',
    fixedIssues,
    stepResults
  };
}

/* ── page-log collectors (best-effort, attached per page) ── */
const pageState = new WeakMap();

/** Attach console/network collectors to a page (idempotent). */
export function attachPageCollectors(page) {
  if (pageState.has(page)) return pageState.get(page);
  const state = { consoleErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') state.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => state.consoleErrors.push(err.message));
  page.on('requestfailed', (req) => {
    state.failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText || 'failed'}`);
  });
  pageState.set(page, state);
  return state;
}

async function collectConsoleErrors(page) {
  return pageState.get(page)?.consoleErrors || [];
}

async function collectFailedRequests(page) {
  return pageState.get(page)?.failedRequests || [];
}

/**
 * Run the autonomous exploratory loop across all frontend features.
 * @param {Array} inventory — feature inventory (Step 2)
 * @param {{ router, bus, projectPath, config, dispatchFix, targetUrl, headless }} ctx
 */
export async function runAutonomousTesting(inventory, { router, bus = null, projectPath, config = {}, dispatchFix = null, targetUrl = 'http://localhost:3000', headless = true } = {}) {
  const maxFeatures = config?.autonomous?.maxFeatures || 30;
  const headlessFlag = config?.autonomous?.headless ?? headless;
  const frontendFeatures = inventory
    .filter((f) => f.layer === 'frontend' || f.layer === 'both')
    .slice(0, maxFeatures);

  if (frontendFeatures.length === 0) {
    return { results: [], skipped: 'no frontend features in inventory' };
  }

  const messages = [];
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: headlessFlag });
  } catch (err) {
    const reason = /Executable doesn't exist/.test(err?.message || '')
      ? 'Playwright browser binary missing — run `npx playwright install chromium` then re-run test mode.'
      : `browser launch failed: ${err?.message || err}`;
    bus?.emit('MESSAGE', { kind: 'warn', text: reason });
    return { results: [], skipped: reason };
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  attachPageCollectors(page);
  const results = [];

  try {
    for (const feature of frontendFeatures) {
      bus?.emit('TEST_FEATURE_START', { feature: feature.name, featureId: feature.id, route: feature.route });
      let script;
      let result;
      try {
        script = await planInteractionScript(feature, { router, bus, targetUrl });
        result = await executeScriptWithSelfHeal(page, script, feature, {
          router, bus, dispatchFix, projectPath,
          maxAttempts: config?.maxSelfHealAttempts || 3
        });
      } catch (err) {
        result = {
          feature: feature.name,
          featureId: feature.id,
          route: feature.route,
          status: 'needs-review',
          error: err.message || String(err),
          stepResults: [],
          fixedIssues: []
        };
      }
      results.push(result);
      bus?.emit('TEST_FEATURE_DONE', { feature: feature.name, featureId: feature.id, status: result.status, selfHealed: result.fixedIssues?.length || 0 });
    }
  } finally {
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
  }

  return { results, skipped: messages.length ? messages.join('; ') : null };
}
