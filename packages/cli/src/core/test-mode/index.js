/**
 * Test Mode — orchestrator (doc 48).
 *
 * `runTestMode()` ties together:
 *   Step 2 — buildFeatureInventory() (backend + frontend, every feature)
 *   Step 3a — unit / integration / load / a11y (traditional types)
 *   Step 3b — runAutonomousTesting() (plan → act → observe → heal loop)
 *   Final  — buildTestReport()/saveTestReport() (docs 43/47 MD shape)
 *
 * All self-heal fixes go through `dispatchFix` — a Subagent-based dispatcher
 * that mirrors subagent-manager's internal fixer and therefore respects the
 * same permission/config plumbing as every other mode (docs 24/41).
 *
 * Safety: autonomous testing targets a local/staging URL by default; the
 * target must be set explicitly via config (mcode.config.json → testMode)
 * or the --target flag to point anywhere else.
 */
import { EventEmitter } from 'node:events';
import { SUBAGENT_STATUS } from '@mcode/shared';
import { buildFeatureInventory } from './feature-inventory.js';
import { runAutonomousTesting } from './autonomous-agent.js';
import { generateAndRunUnitTests, generateAndRunIntegrationTests, runLoadTest, runA11yScan } from './traditional.js';
import { buildTestReport, saveTestReport } from './report.js';

export { buildTestReport, saveTestReport, generateAndRunUnitTests, generateAndRunIntegrationTests, runLoadTest, runA11yScan };
export { buildFeatureInventory, heuristicInventory, parseInventoryOutput, buildRepoContext } from './feature-inventory.js';
export { planInteractionScript, executeStep, executeScriptWithSelfHeal, runAutonomousTesting, describeStep, diagnoseFailure, attachPageCollectors } from './autonomous-agent.js';

export const TEST_TYPES = Object.freeze([
  { id: 'unit', label: 'Unit tests', desc: 'Functions/modules in isolation' },
  { id: 'integration', label: 'Integration tests', desc: 'API routes, DB interactions' },
  { id: 'e2e', label: 'End-to-end', desc: 'Full user flows, browser-driven' },
  { id: 'visual', label: 'Visual regression', desc: 'Screenshot diffing' },
  { id: 'load', label: 'Load/performance', desc: 'Concurrency + response-time testing' },
  { id: 'a11y', label: 'Accessibility', desc: 'WCAG compliance scan' },
  { id: 'autonomous', label: 'Autonomous exploratory testing', desc: 'AI plays the app like a real user', recommended: true }
]);

/** Default safety target: local dev instances only. */
export const DEFAULT_TARGET_URL = 'http://localhost:3000';

const LOCAL_TARGET_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?/i;
const STAGING_HINT_RE = /(staging|stage|test|qa|preview)\./i;

/**
 * Resolve and validate the target URL. Anything that is not localhost or an
 * obvious staging host requires `allowRemote: true` so the agent never
 * accidentally drives production traffic/data (doc 48 safety note).
 */
export function resolveTargetUrl({ targetUrl, configTarget, allowRemote = false }) {
  const url = String(targetUrl || configTarget || DEFAULT_TARGET_URL);
  const parsed = new URL(url);
  if (!allowRemote && !LOCAL_TARGET_RE.test(url) && !STAGING_HINT_RE.test(parsed.host)) {
    throw new Error(
      `refusing to target non-local URL "${url}" without explicit consent — ` +
      'set testMode.targetUrl in mcode.config.json or pass --allow-remote'
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * Build the fix dispatcher used by the autonomous loop. Mirrors
 * SubagentManager's internal `_runFixer` — one Subagent, bugfix domain,
 * bounded turns, records scoring + token usage. `router` may be null
 * (CI/offline) in which case fixes are skipped and reported.
 */
export async function dispatchFixSubagent(todo, { router, projectPath, config = {}, undoStack = null, auditLog = null, ledger = null, reasoning = null, bus = null } = {}) {
  if (!router) {
    return { status: SUBAGENT_STATUS.FAILED, error: 'no router — fixes disabled', summary: null };
  }
  const { Subagent } = await import('../subagent.js');
  const assignment = await router.pick(todo.domain || 'bugfix');
  if (!assignment?.provider) {
    return { status: SUBAGENT_STATUS.FAILED, error: 'no model available for fixes', summary: null };
  }

  const description = [
    'An automated browser test of this project failed. Diagnose and fix the root cause in the source code.',
    `Feature: ${todo.feature?.name || 'n/a'} (${todo.feature?.route || 'n/a'})`,
    `Failed step: ${JSON.stringify(todo.step || {})}`,
    `Diagnosis: ${todo.diagnosis?.summary || todo.diagnosis?.issue || 'unknown'}`,
    todo.diagnosis?.fixHint ? `Fix hint: ${todo.diagnosis.fixHint}` : '',
    todo.files?.length ? `Likely files: ${todo.files.join(', ')}` : ''
  ].filter(Boolean).join('\n');

  const sub = new Subagent({
    todo: {
      id: todo.id,
      title: todo.title,
      description,
      domain: todo.domain || 'bugfix',
      files: todo.files,
      maxTurns: 8
    },
    assignment: {
      ...assignment,
      ledger: (res) => ledger?.record?.(assignment.provider.id, {
        inputTokens: res?.usage?.inputTokens || 0,
        outputTokens: res?.usage?.outputTokens || 0
      })
    },
    projectPath,
    bus,
    undoStack,
    config,
    reasoning
  });

  const result = await sub.run();

  // Record the bugfix result for model scoring (same as SubagentManager).
  if (router.recordAssignment) {
    try {
      await router.recordAssignment(assignment.ref, 'bugfix', result.status === SUBAGENT_STATUS.DONE);
    } catch { /* best-effort */ }
  }

  return result;
}

/**
 * Run Test Mode end to end.
 * @param {string[]} selectedTypes — subset of TEST_TYPES ids
 * @param {{ projectPath, router, config, bus, undoStack, auditLog, ledger,
 *           targetUrl, allowRemote, headless }} opts
 */
export async function runTestMode(selectedTypes = [], {
  projectPath = process.cwd(),
  router = null,
  config = {},
  bus = null,
  undoStack = null,
  auditLog = null,
  ledger = null,
  targetUrl = null,
  allowRemote = false,
  headless = true
} = {}) {
  const t0 = Date.now();
  const testConfig = { ...(config?.testMode || {}) };
  const finalTarget = resolveTargetUrl({ targetUrl, configTarget: testConfig?.targetUrl, allowRemote });

  bus?.emit('TEST_MODE_STARTED', { types: selectedTypes, targetUrl: finalTarget });

  // Step 2 — inventory
  const inventory = await buildFeatureInventory(projectPath, { router, bus });
  bus?.emit('TEST_INVENTORY', { features: inventory });

  const wantsAutonomous = selectedTypes.some((t) => t === 'autonomous' || t === 'e2e' || t === 'visual');
  const autonomousResults = [];
  let autonomousSkipped = null;

  // Step 3b — autonomous exploratory testing (runs FIRST so its fixes are
  // in place before the traditional suites hit the same app)
  if (wantsAutonomous) {
    const frontendCount = inventory.filter((f) => f.layer !== 'backend').length;
    bus?.emit('MESSAGE', { kind: 'system', text: `autonomous testing — ${frontendCount} frontend feature(s) against ${finalTarget}` });
    const { results, skipped } = await runAutonomousTesting(inventory, {
      router, bus, projectPath,
      config: testConfig,
      dispatchFix: async (todo) => dispatchFixSubagent(todo, {
        router, projectPath,
        config: { ...config, auditLog },
        undoStack, ledger,
        reasoning: router?.reasoning || null,
        bus
      }),
      targetUrl: finalTarget,
      headless
    });
    autonomousResults.push(...results);
    autonomousSkipped = skipped;
  }

  // Step 3a — traditional types
  const traditional = [];
  if (selectedTypes.includes('unit')) traditional.push(await generateAndRunUnitTests(inventory, { router, bus, projectPath }));
  if (selectedTypes.includes('integration')) traditional.push(await generateAndRunIntegrationTests(inventory, { router, bus, targetUrl: finalTarget }));
  if (selectedTypes.includes('load')) traditional.push(await runLoadTest(inventory, { bus, targetUrl: finalTarget }));
  if (selectedTypes.includes('a11y')) traditional.push(await runA11yScan(inventory, { bus, targetUrl: finalTarget }));

  // Final report (docs 43/47 MD shape, test-scoped)
  const reportMd = buildTestReport({
    projectName: projectPath.split(/[\\/]/).pop(),
    inventory,
    autonomousResults,
    traditional,
    targetUrl: finalTarget,
    skipped: autonomousSkipped
  });
  const { filePath, reportFileName } = await saveTestReport(reportMd, projectPath);

  const selfHealedCount = autonomousResults.reduce((n, r) => n + (r.fixedIssues?.length || 0), 0);
  const summary = {
    types: selectedTypes,
    inventoryCount: inventory.length,
    autonomous: autonomousResults.map((r) => ({
      feature: r.feature,
      featureId: r.featureId,
      route: r.route,
      status: r.status,
      selfHealed: r.fixedIssues?.length || 0,
      error: r.error || null,
      screenshotPath: r.screenshotPath || null
    })),
    autonomousSkipped,
    selfHealedCount,
    needsReview: autonomousResults.filter((r) => r.status === 'needs-review').length,
    traditional,
    reportPath: filePath,
    reportFileName,
    reportMd,
    targetUrl: finalTarget,
    elapsedSecs: Math.round((Date.now() - t0) / 1000)
  };

  bus?.emit('TEST_MODE_DONE', summary);
  return summary;
}

/** Build a plain bus with the standard event names pre-wired (CLI convenience). */
export function createTestBus() {
  return new EventEmitter();
}
