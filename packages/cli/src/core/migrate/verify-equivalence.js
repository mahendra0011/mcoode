import { runProjectTestCommand } from './equivalence-check.js';

/**
 * @typedef {{ id?: string, name?: string, feature?: string, passed?: boolean }} EquivTest
 * @typedef {{ tests?: Array<EquivTest>, total?: number, baselineTests?: { tests?: Array<EquivTest> }, characterizationTests?: Array<object> }} EquivSnapshot
 * @typedef {{ on: Function, off: Function, emit: (event: string, payload?: any) => void }} BusLike
 * @typedef {{ run: (todos: object[]) => Promise<object> }} FixRunner
 */

/**
 * Compare current test run against the baseline snapshot.
 * In Migrate Mode, equivalence means the app does EXACTLY what it did before.
 * A test passing/failing the SAME way as the snapshot = correct.
 * A test flipping from pass-to-fail or fail-to-pass = a regression!
 *
 * @param {EquivSnapshot} snapshot - Result from snapshotBehavior
 * @param {EquivSnapshot} current - Result from runProjectTestCommand
 * @returns {Array<{ feature: string, expectedState: string, currentState: string, reason: string, regressed: boolean }>}
 */
/**
 * FINDING-861: scrub non-deterministic values (timestamps, UUIDs, random
 * numbers, durations, absolute paths, PIDs) so output comparisons don't
 * flag timestamp/RNG noise as behavior changes.
 *
 * @param {unknown} output
 * @returns {string}
 */
export function normalizeTestOutput(output) {
  return String(output ?? '')
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<TIME>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\b\d+\.\d+\.\d+\.\d+(?::\d+)?\b/g, '<ADDR>')
    .replace(/(?:\d+\s?(?:ms|s|sec|seconds)|\(\d+\s?ms\))/gi, '<DUR>')
    .replace(/\b\d{10,13}\b/g, '<EPOCH>')
    .replace(/[A-Za-z]:\\(?:[^\\s]+\\)*[^\\s]*/g, '<PATH>')
    .replace(/(?:^|\s)\/(?:[^/\s]+\/)+[^/\s]*/g, '<PATH>')
    .replace(/\bpid\s*\d+\b/gi, 'pid <PID>')
    .replace(/\b0x[0-9a-f]+\b/gi, '<HEX>')
    .replace(/\b[a-f0-9]{32,64}\b/gi, '<HASH>');
}

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

    // FINDING-861: a pass/fail flip whose normalized outputs are identical
    // cannot be a real behavior change (same output, different verdict =
    // harness noise). Mark it flaky so the caller skips the fix loop.
    const basePassed = base.passed;
    const currPassed = curr.passed;
    if (basePassed !== currPassed) {
      const sameOutput =
        base.output !== undefined && curr.output !== undefined &&
        normalizeTestOutput(base.output) === normalizeTestOutput(curr.output);
      if (sameOutput) continue;
      // Status FLIPPED (pass->fail or fail->pass)
      regressions.push({
        id: key,
        feature: featureName,
        expectedState: basePassed ? 'pass' : 'fail',
        currentState: currPassed ? 'pass' : 'fail',
        reason: `Behavior changed: "${featureName}" was ${basePassed ? 'PASSING' : 'FAILING'} at baseline, but is now ${currPassed ? 'PASSING' : 'FAILING'}`,
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
 * @param {EquivSnapshot} snapshot
 * @param {{
 *   subagentManager?: FixRunner|null,
 *   router?: object,
 *   bus?: BusLike|null,
 *   maxPasses?: number,
 *   projectPath?: string,
 *   testRunner?: Function|null
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
      characterizationTests: /** @type {Array<{feature: string, code?: string, name?: string, run?: Function}>} */ (snapshot?.characterizationTests || []),
      testRunner
    });

    let regressions = diffAgainstSnapshot(snapshot, current);

    // FINDING-861: confirm flips before spending fix passes on them. A test
    // with non-deterministic output (Date.now(), Math.random(), UUIDs) can
    // flip spuriously; re-running once filters flakes that would otherwise
    // send the 5-pass repair loop after working code.
    if (regressions.length > 0) {
      const confirm = await runProjectTestCommand(projectPath, {
        characterizationTests: /** @type {Array<{feature: string, code?: string, name?: string, run?: Function}>} */ (snapshot?.characterizationTests || []),
        testRunner
      });
      const stillFailing = diffAgainstSnapshot(snapshot, confirm);
      const stillSet = new Set(stillFailing.map((r) => r.id));
      const flaky = regressions.filter((r) => !stillSet.has(r.id));
      if (flaky.length > 0) {
        bus?.emit('MIGRATE_STATUS', {
          stage: 'verify',
          pass,
          message: `ignoring ${flaky.length} non-reproducible flip${flaky.length !== 1 ? 's' : ''} (flaky: ${flaky.map((r) => r.feature).join(', ').slice(0, 200)})`
        });
      }
      regressions = stillFailing;
      history.push({ pass, totalTests: current.total, regressionsCount: regressions.length, regressions, flaky: flaky.map((r) => r.id) });
    } else {
      history.push({ pass, totalTests: current.total, regressionsCount: 0, regressions });
    }

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
    regressions: [],
    unresolvedRegressions: [],
    history
  };
}
