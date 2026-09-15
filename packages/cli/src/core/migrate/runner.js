import { EventEmitter } from 'node:events';
import { snapshotBehavior } from './equivalence-check.js';
import { planMigration } from './planner.js';
import { verifyEquivalence } from './verify-equivalence.js';
import { SubagentManager } from '../subagent-manager.js';
import { buildRepoContext } from '../test-mode/feature-inventory.js';
import { ModelRouter } from '../router.js';

/**
 * Executes full Migrate Mode lifecycle:
 * 1. Snapshot baseline behavior + characterization tests
 * 2. Generate migration plan with 'migration' domain
 * 3. Execute migration subagents
 * 4. Verify behavioral equivalence in a regression fix loop
 *
 * @param {string} prompt - The migration instruction
 * @param {{
 *   projectPath?: string,
 *   router?: object,
 *   bus?: EventEmitter,
 *   maxPasses?: number,
 *   yes?: boolean,
 *   onConfirmPlan?: (plan: object) => Promise<boolean>,
 *   config?: object
 * }} options
 */
export async function runMigrate(prompt, {
  projectPath = process.cwd(),
  router = null,
  bus = null,
  maxPasses = 5,
  yes = false,
  onConfirmPlan = null,
  config = {},
  testRunner = null
} = {}) {
  const eventBus = bus || new EventEmitter();

  if (!router) {
    router = new ModelRouter({ config });
    await router.init();
  }

  // 1. SNAPSHOT
  eventBus.emit('MIGRATE_STATUS', { stage: 'snapshot', message: 'snapshotting current behavior...' });
  const snapshot = await snapshotBehavior(projectPath, { router, bus: eventBus, testRunner });

  // 2. PLAN
  eventBus.emit('MIGRATE_STATUS', { stage: 'plan', message: 'planning migration (domain: migration)...' });
  const repoContext = await buildRepoContext(projectPath);
  const plan = await planMigration(prompt, { projectPath, repoContext, router, bus: eventBus });

  // 3. CONFIRM (unless --yes)
  if (!yes && onConfirmPlan) {
    const proceed = await onConfirmPlan(plan);
    if (!proceed) {
      eventBus.emit('MIGRATE_STATUS', { stage: 'cancelled', message: 'migration cancelled by user' });
      return {
        cancelled: true,
        snapshot,
        plan,
        equivalent: false
      };
    }
  }

  // 4. EXECUTE
  eventBus.emit('MIGRATE_STATUS', {
    stage: 'executing',
    totalTodos: plan.todos.length,
    message: `executing migration... ${plan.todos.length} todo${plan.todos.length !== 1 ? 's' : ''}`
  });

  const subagentManager = new SubagentManager({
    plan,
    router,
    projectPath,
    config,
    bus: eventBus,
    options: { skipIntegrationTests: true }
  });

  const executionResults = await subagentManager.run(plan.todos);

  // 5. VERIFY EQUIVALENCE
  const verification = await verifyEquivalence(snapshot, {
    subagentManager,
    router,
    bus: eventBus,
    maxPasses,
    projectPath,
    testRunner
  });

  const summary = {
    cancelled: false,
    equivalent: verification.equivalent,
    passes: verification.passes,
    regressions: verification.regressions || [],
    unresolvedRegressions: verification.unresolvedRegressions || [],
    snapshot,
    plan,
    executionResults,
    verification
  };

  eventBus.emit('MIGRATE_COMPLETE', summary);
  return summary;
}
