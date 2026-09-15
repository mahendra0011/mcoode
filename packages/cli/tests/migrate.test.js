import { describe, it, expect, beforeEach } from 'vitest';
import {
  snapshotBehavior,
  generateCharacterizationTests,
  runProjectTestCommand,
  verifyEquivalence,
  diffAgainstSnapshot,
  toComparisonRows,
  planMigration,
  runMigrate
} from '../src/core/migrate/index.js';
import { ModelRouter } from '../src/core/router.js';
import { MockProvider } from '../src/providers/mock.js';
import { EventEmitter } from 'node:events';

describe('Migrate Mode (doc 51)', () => {
  let router;

  beforeEach(() => {
    router = new ModelRouter({
      secrets: {},
      config: { routing: {} },
      providers: [new MockProvider()]
    });
  });

  describe('Characterization & Snapshotting', () => {
    it('generates characterization tests that capture current behavior', async () => {
      const features = [
        { id: 'f1', name: 'Order Total Calc', layer: 'backend', route: '/api/orders/total' },
        { id: 'f2', name: 'User Search', layer: 'backend', route: '/api/users/search' }
      ];

      const tests = await generateCharacterizationTests(features, { router });
      expect(tests).toHaveLength(2);
      expect(tests[0].feature).toBe('f1');
      expect(tests[0].code).toBeDefined();
      expect(tests[1].feature).toBe('f2');
    });

    it('snapshots project behavior with baseline tests and characterization', async () => {
      const mockRunner = async () => ({
        tests: [{ id: 't1', name: 'unit 1', passed: true, feature: 'f1' }]
      });
      const snapshot = await snapshotBehavior(process.cwd(), { router, testRunner: mockRunner });
      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotAt).toBeDefined();
      expect(Array.isArray(snapshot.characterizationTests)).toBe(true);
      expect(snapshot.baselineTests).toBeDefined();
      expect(typeof snapshot.baselineTests.total).toBe('number');
    });
  });

  describe('Behavioral Equivalence Diffing (diffAgainstSnapshot)', () => {
    it('treats identical pass/pass as EQUIVALENT (no regression)', () => {
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'auth login', feature: 'auth', passed: true },
            { id: 't2', name: 'order checkout', feature: 'orders', passed: true }
          ]
        }
      };

      const current = {
        tests: [
          { id: 't1', name: 'auth login', feature: 'auth', passed: true },
          { id: 't2', name: 'order checkout', feature: 'orders', passed: true }
        ]
      };

      const regressions = diffAgainstSnapshot(snapshot, current);
      expect(regressions).toHaveLength(0);
    });

    it('treats snapshot-locked bug staying a bug (fail/fail) as EQUIVALENT', () => {
      // In Migrate Mode, equivalence means "does what it did before", NOT "is bug-free"
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'known legacy edgecase', feature: 'edgecase', passed: false }
          ]
        }
      };

      const current = {
        tests: [
          { id: 't1', name: 'known legacy edgecase', feature: 'edgecase', passed: false }
        ]
      };

      const regressions = diffAgainstSnapshot(snapshot, current);
      expect(regressions).toHaveLength(0);
    });

    it('flags test flipping from PASS to FAIL as a regression', () => {
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'order total returns number', feature: 'order-total', passed: true }
          ]
        }
      };

      const current = {
        tests: [
          { id: 't1', name: 'order total returns number', feature: 'order-total', passed: false }
        ]
      };

      const regressions = diffAgainstSnapshot(snapshot, current);
      expect(regressions).toHaveLength(1);
      expect(regressions[0].feature).toBe('order-total');
      expect(regressions[0].regressed).toBe(true);
      expect(regressions[0].expectedState).toBe('pass');
      expect(regressions[0].currentState).toBe('fail');
    });

    it('flags test flipping from FAIL to PASS as a behavior change / regression', () => {
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'returns legacy string format', feature: 'format', passed: false }
          ]
        }
      };

      const current = {
        tests: [
          { id: 't1', name: 'returns legacy string format', feature: 'format', passed: true }
        ]
      };

      const regressions = diffAgainstSnapshot(snapshot, current);
      expect(regressions).toHaveLength(1);
      expect(regressions[0].feature).toBe('format');
      expect(regressions[0].regressed).toBe(true);
      expect(regressions[0].expectedState).toBe('fail');
      expect(regressions[0].currentState).toBe('pass');
    });

    it('flags missing baseline test as a regression', () => {
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'user profile route', feature: 'user-profile', passed: true }
          ]
        }
      };

      const current = {
        tests: []
      };

      const regressions = diffAgainstSnapshot(snapshot, current);
      expect(regressions).toHaveLength(1);
      expect(regressions[0].currentState).toBe('missing');
    });
  });

  describe('UI Adapter (toComparisonRows)', () => {
    it('maps equivalence results into done / incomplete comparison rows', () => {
      const equivalenceResults = [
        { feature: 'order-total', regressed: true, reason: 'now returns string instead of number' },
        { feature: 'user-search', regressed: false, reason: 'order identical' }
      ];

      const rows = toComparisonRows(equivalenceResults);
      expect(rows).toEqual([
        { id: 'order-total', text: 'now returns string instead of number', state: 'incomplete' },
        { id: 'user-search', text: 'order identical', state: 'done' }
      ]);
    });
  });

  describe('Migration Planner', () => {
    it('plans migration with domain: "migration" for todos', async () => {
      const plan = await planMigration('convert this project from JavaScript to TypeScript', { router });
      expect(plan).toBeDefined();
      expect(plan.todos.length).toBeGreaterThan(0);
      for (const todo of plan.todos) {
        expect(todo.domain).toBe('migration');
        expect(todo.id).toBeDefined();
        expect(todo.title).toBeDefined();
      }
    });
  });

  describe('Verification Loop (verifyEquivalence)', () => {
    it('returns equivalent: true when tests match baseline exactly', async () => {
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 't1', name: 'test 1', feature: 'f1', passed: true }
          ],
          total: 1
        },
        characterizationTests: []
      };

      const mockRunner = async () => ({
        tests: [{ id: 't1', name: 'test 1', feature: 'f1', passed: true }]
      });

      const bus = new EventEmitter();
      const verified = await verifyEquivalence(snapshot, { router, bus, maxPasses: 2, testRunner: mockRunner });
      expect(verified.equivalent).toBe(true);
      expect(verified.passes).toBe(1);
      expect(verified.regressions).toHaveLength(0);
    });

    it('invokes subagentManager to fix regressions when behavior flips', async () => {
      // Snapshot with a test expected to pass
      const snapshot = {
        baselineTests: {
          tests: [
            { id: 'char-f1', name: 'Characterization: f1', feature: 'f1', passed: true }
          ],
          total: 1
        },
        characterizationTests: [
          { feature: 'f1', code: 'export function test_f1() { return true; }' }
        ]
      };

      let passCount = 0;
      const mockRunner = async () => {
        passCount++;
        // On pass 1, simulate regression (passed: false), then on pass 2, it's fixed (passed: true)
        return {
          tests: [{ id: 'char-f1', name: 'Characterization: f1', feature: 'f1', passed: passCount > 1 }]
        };
      };

      let ranFix = false;
      const mockSubagentManager = {
        run: async (todos) => {
          ranFix = true;
          return { total: todos.length, done: todos.length };
        }
      };

      const verified = await verifyEquivalence(snapshot, {
        subagentManager: mockSubagentManager,
        router,
        maxPasses: 3,
        testRunner: mockRunner
      });

      expect(verified).toBeDefined();
      expect(ranFix).toBe(true);
      expect(verified.equivalent).toBe(true);
      expect(verified.passes).toBe(2);
    });
  });

  describe('Full Migration Workflow (runMigrate)', () => {
    it('executes the full migrate lifecycle', async () => {
      const bus = new EventEmitter();
      const statusEvents = [];
      bus.on('MIGRATE_STATUS', (e) => statusEvents.push(e.stage));

      const mockRunner = async () => ({
        tests: [{ id: 't1', name: 'test 1', feature: 'f1', passed: true }]
      });

      const result = await runMigrate('upgrade React 18 to React 19', {
        router,
        bus,
        yes: true,
        maxPasses: 2,
        testRunner: mockRunner
      });

      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.snapshot).toBeDefined();
      expect(statusEvents).toContain('snapshot');
      expect(statusEvents).toContain('plan');
      expect(statusEvents).toContain('executing');
    });

    it('respects user cancellation during plan confirmation', async () => {
      const mockRunner = async () => ({
        tests: [{ id: 't1', name: 'test 1', feature: 'f1', passed: true }]
      });

      const result = await runMigrate('swap Redux Toolkit for Zustand', {
        router,
        yes: false,
        testRunner: mockRunner,
        onConfirmPlan: async () => false // User says 'no'
      });

      expect(result.cancelled).toBe(true);
      expect(result.equivalent).toBe(false);
    });
  });
});
