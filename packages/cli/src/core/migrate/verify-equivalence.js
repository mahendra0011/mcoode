import { runProjectTestCommand } from './equivalence-check.js';

/**
 * Compare current test run against the baseline snapshot.
 * In Migrate Mode, equivalence means the app does EXACTLY what it did before.
 * A test passing/failing the SAME way as the snapshot = correct.
 * A test flipping from pass-to-fail or fail-to-pass = a regression!
 *
 * @param {object} snapshot - Result from snapshotBehavior
 * @param {object} current - Result from runProjectTestCommand
 * @returns {Array<{ feature: string, expectedState: string, currentState: string, reason: string, regressed: boolean }>}
 */
export function diffAgainstSnapshot(snapshot, current) {
  const baselineTests = snapshot?.baselineTests?.tests || [];
  const currentTests = current?.tests || [];

  const baselineMap = new Map();
  for (const t of baselineTests) {
    const key = t.id || t.name;
    baselineMap.set(key, t);
  }

  const currentMap = new Map();
  for (const t of currentTests) {
    const key = t.id || t.name;
    currentMap.set(key, t);
  }

  const regressions = [];

  // Check all baseline tests for status flip
  for (const [key, base] of baselineMap.entries()) {
    const curr = currentMap.get(key);
    const featureName = base.feature || base.name || key;

    if (!curr) {
      // Test missing in current run
      regressions.push({
        id: key,
        feature: featureName,
        expectedState: base.passed ? 'pass' : 'fail',
        currentState: 'missing',
        reason: `Test "${featureName}" is missing in the migrated project`,
        regressed: true
      });
      continue;
    }

    if (base.passed !== curr.passed) {
      // Status FLIPPED (pass->fail or fail->pass)
      regressions.push({
        id: key,
        feature: featureName,
        expectedState: base.passed ? 'pass' : 'fail',
        currentState: curr.passed ? 'pass' : 'fail',
        reason: `Behavior changed: "${featureName}" was ${base.passed ? 'PASSING' : 'FAILING'} at baseline, but is now ${curr.passed ? 'PASSING' : 'FAILING'}`,
        regressed: true
      });
    }
  }

  return regressions;
}

/**
 * Convert equivalence check results into rows suitable for ComparisonTable UI.
 * A 'regressed' row shows 'incomplete' (✗), and 'unchanged' shows 'done' (✓).
 */
export function toComparisonRows(equivalenceResults = []) {
  return equivalenceResults.map((r) => ({
    id: r.feature || r.id,
    text: r.reason || r.feature || r.id,
    state: r.regressed ? 'incomplete' : 'done'
  }));
}

/**
 * Iterative behavioral-equivalence verification loop.
 * Runs current tests + characterization tests against migrated code.
 * If any results flipped, dispatches subagents to restore original behavior.
 *
 * @param {object} snapshot
 * @param {{
 *   subagentManager?: object,
 *   router?: object,
 *   bus?: object,
 *   maxPasses?: number,
 *   projectPath?: string
 * }} options
 * @returns {Promise<{
 *   equivalent: boolean,
 *   passes: number,
 *   regressions: Array<object>,
 *   unresolvedRegressions?: Array<object>,
 *   history: Array<object>
 * }>}
 */
export async function verifyEquivalence(snapshot, { subagentManager, router, bus, maxPasses = 5, projectPath = process.cwd(), testRunner = null } = {}) {
  let pass = 1;
  const history = [];

  while (pass <= maxPasses) {
    bus?.emit('MIGRATE_STATUS', {
      stage: 'verify',
      pass,
      maxPasses,
      message: `verifying behavioral equivalence — pass ${pass}/${maxPasses}...`
    });

    const current = await runProjectTestCommand(projectPath, {
      characterizationTests: snapshot?.characterizationTests || [],
      testRunner
    });

    const regressions = diffAgainstSnapshot(snapshot, current);
    history.push({ pass, totalTests: current.total, regressionsCount: regressions.length, regressions });

    bus?.emit('MIGRATE_PASS_RESULT', {
      pass,
      maxPasses,
      regressions,
      equivalent: regressions.length === 0
    });

    if (!regressions.length) {
      bus?.emit('MIGRATE_STATUS', {
        stage: 'verified',
        pass,
        message: `✓ equivalent — all ${current.total} tests match baseline exactly`
      });
      return {
        equivalent: true,
        passes: pass,
        regressions: [],
        history
      };
    }

    if (pass >= maxPasses) {
      bus?.emit('MIGRATE_STATUS', {
        stage: 'failed',
        pass,
        message: `⚠ reached max equivalence passes (${maxPasses}) with ${regressions.length} unresolved regressions`
      });
      return {
        equivalent: false,
        passes: pass,
        unresolvedRegressions: regressions,
        regressions,
        history
      };
    }

    // Prepare fix todos for regressions
    const fixTodos = regressions.map((r, idx) => ({
      id: `migfix-${r.feature ? r.feature.replace(/[^a-zA-Z0-9_-]/g, '_') : idx}-${pass}`,
      title: `Restore original behavior for: ${r.feature}`,
      description: `Fix regression: ${r.reason}. Original behavior was ${r.expectedState.toUpperCase()}. Ensure output matches baseline.`,
      domain: 'migration',
      context: r
    }));

    bus?.emit('MIGRATE_STATUS', {
      stage: 'fixing',
      pass,
      fixCount: fixTodos.length,
      message: `fixing ${fixTodos.length} regression${fixTodos.length !== 1 ? 's' : ''}...`
    });

    if (subagentManager && typeof subagentManager.run === 'function') {
      await subagentManager.run(fixTodos);
    }

    pass++;
  }

  return {
    equivalent: false,
    passes: pass - 1,
    unresolvedRegressions: [],
    history
  };
}
