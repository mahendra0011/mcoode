import { describe, it, expect, afterAll, vi } from 'vitest';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

// MF-002/003: nothing may touch the developer's real ~/.mcode.
const home = await mkdtemp(join(tmpdir(), 'mcode-mf234-home-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const { SubagentManager, FileLockManager } = await import('../src/core/subagent-manager.js');
const { Orchestrator } = await import('../src/core/orchestrator.js');
const { CostLedger, estimateCallCost, DEFAULT_CONFIG, EVENTS } = await import('@mcode/shared');
const { ToolExecutor, UndoStack } = await import('../src/core/tools.js');
const { readSessionState, writeDryRunPlan, readDryRunPlan } = await import('../src/core/session-state.js');
const { renderPlan } = await import('../src/core/plan-view.js');
const { getProjectId } = await import('../src/core/store.js');

const MockProvider = (await import('../src/providers/mock.js')).MockProvider;
const provider = new MockProvider();
const fakeRouter = {
  reasoning: null,
  pick: async () => ({ provider, model: (await provider.listModels())[0], ref: 'mock:mock' })
};

async function freshProject(tag) {
  return mkdtemp(join(tmpdir(), `mcode-mf234-${tag}-`));
}

/** Two waves: t2 depends on t1, so a budget stop after wave 1 is observable. */
function twoWavePlan() {
  return {
    summary: 'budget fixture',
    prompt: 'do things',
    todos: [
      { id: 't1', title: 'First', description: '', domain: 'backend', dependsOn: [], files: ['a.js'] },
      { id: 't2', title: 'Second', description: '', domain: 'frontend', dependsOn: ['t1'], files: ['b.js'] }
    ]
  };
}

function makeManager({ projectPath, plan, options = {}, bus = new EventEmitter() }) {
  return new SubagentManager({
    plan,
    router: fakeRouter,
    projectPath,
    config: { concurrency: 2, maxTurnsPerSubagent: 6 },
    bus,
    options: {
      ledger: new CostLedger(),
      skipIntegrationTests: true,
      session: { prompt: 'budget fixture', startedAt: '2026-01-01T00:00:00.000Z' },
      ...options
    }
  });
}

afterAll(async () => {
  await rm(home, { recursive: true, force: true }).catch(() => {});
});

describe('MF-002 cost attribution + budget ceiling', () => {
  it('estimateCallCost prefers catalog pricing and falls back to provider rates', () => {
    const catalog = estimateCallCost(
      { costPer1kIn: 0.01, costPer1kOut: 0.02 },
      { inputTokens: 1000, outputTokens: 500 }
    );
    expect(catalog).toBeCloseTo(0.01 + 0.01, 6); // 1k in + 0.5k out

    const fallback = estimateCallCost(
      { ref: 'openai:gpt-4o', id: 'gpt-4o' },
      { inputTokens: 1_000_000, outputTokens: 1_000_000 }
    );
    expect(fallback).toBeCloseTo(0.15 + 0.6, 6); // COST_RATES.openai per 1M
    expect(estimateCallCost({ ref: 'x:y' }, { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it('attributes every call to its mode with an estimated cost (spendByMode)', async () => {
    const projectPath = await freshProject('ledger');
    const ledger = new CostLedger();
    const manager = makeManager({ projectPath, plan: { todos: [] }, options: { ledger } });

    const recorder = manager._ledgerRecorder(
      { provider: { id: 'mock' }, model: { id: 'mock', ref: 'mock:mock' }, ref: 'mock:mock' },
      'backend'
    );
    recorder({ usage: { inputTokens: 1000, outputTokens: 500 } });
    recorder({ usage: { inputTokens: 2000, outputTokens: 1000 } });

    const spend = ledger.spendByMode();
    expect(spend.backend.runs).toBe(2);
    expect(spend.backend.tokens).toBe(4500);
    expect(spend.backend.cost).toBeGreaterThan(0);
    expect(manager.spendUsd).toBeCloseTo(spend.backend.cost, 6);
  });

  it('stops dispatching new todos once the budget ceiling is crossed', async () => {
    const projectPath = await freshProject('schedule');
    const manager = makeManager({ projectPath, plan: { todos: [] }, options: { maxCost: 0.5 } });

    // Simulate spend crossing the ceiling mid-run.
    manager._spendUsd = 1;
    manager._checkBudget();
    expect(manager.budgetAbort).toMatchObject({ limitUsd: 0.5 });

    const spawn = vi.spyOn(manager, '_spawn');
    manager.queue.push({ id: 't9', title: 'queued', domain: 'docs', dependsOn: [] });
    manager._schedule();

    expect(spawn).not.toHaveBeenCalled(); // nothing new is dispatched…
    expect(manager.queue).toHaveLength(0); // …and the drain can complete
    spawn.mockRestore();
  });

  it('aborts the run cleanly after the wave in flight and keeps a resumable checkpoint', async () => {
    const projectPath = await freshProject('abort');
    const projectId = await getProjectId(projectPath);
    const bus = new EventEmitter();
    const manager = makeManager({
      projectPath,
      plan: twoWavePlan(),
      options: { maxCost: 0.5 },
      bus
    });

    const dispatched = [];
    vi.spyOn(manager, '_dispatch').mockImplementation(async (todo) => {
      dispatched.push(todo.id);
      manager._spendUsd += 0.6; // first dispatch busts the $0.50 ceiling
      manager._checkBudget();
      const result = { todoId: todo.id, status: 'done' };
      manager.results.set(todo.id, result);
      return result;
    });

    const summaries = [];
    bus.on('BUILD_COMPLETE', (p) => summaries.push(p));

    const merged = await manager.runAll();

    expect(dispatched).toEqual(['t1']); // wave 2 (t2) never dispatched
    expect(merged.done).toBe(1);
    expect(merged.total).toBe(2);
    expect(manager.budgetAbort).toBeTruthy();

    // MF-001 + MF-002: budget abort leaves an 'interrupted' resume target.
    const state = await readSessionState(projectId);
    expect(state.status).toBe('interrupted');

    // The BUILD_COMPLETE payload carries the money + budget outcome.
    expect(summaries).toHaveLength(1);
    expect(summaries[0].spendUsd).toBeGreaterThan(0);
    expect(summaries[0].budget).toMatchObject({ limitUsd: 0.5 });
  });

  it('does not enforce a ceiling when --max-cost is absent', async () => {
    const projectPath = await freshProject('noceiling');
    const manager = makeManager({ projectPath, plan: { todos: [] } });
    manager._spendUsd = 99;
    manager._checkBudget();
    expect(manager.budgetAbort).toBeNull();
  });
});

describe('MF-004 writer audit + conflicts', () => {
  it('records writes per todo and reports files touched by 2+ todos', async () => {
    const projectPath = await freshProject('overlap');
    const manager = makeManager({ projectPath, plan: { todos: [] } });

    manager._recordWrite('t1', 'src\\app.js', 'u1');
    manager._recordWrite('t1', 'src/app.js', 'u2'); // same todo, same file → one writer
    manager._recordWrite('t2', 'src/app.js');
    manager._recordWrite('t2', 'src/only-t2.js');

    const overlaps = manager.overlappingWrites();
    expect(overlaps).toEqual([{ file: 'src/app.js', writers: ['t1', 't2'] }]);
  });

  it('resolveOverlaps rolls back the later write when asked to keep the first', async () => {
    const projectPath = await freshProject('resolve');
    const stack = new UndoStack({ filePath: join(projectPath, 'undo.json'), projectPath });
    await stack.load();

    const file = 'src/shared.js';
    await mkdir(join(projectPath, 'src'), { recursive: true });
    await writeFile(join(projectPath, file), 'v0', 'utf8');
    const u1 = await stack.snapshot(file, 'v0');
    await writeFile(join(projectPath, file), 'v1', 'utf8'); // t1 wrote
    const u2 = await stack.snapshot(file, 'v1');
    await writeFile(join(projectPath, file), 'v2', 'utf8'); // t2 wrote on top

    const manager = makeManager({ projectPath, plan: { todos: [] } });
    manager._recordWrite('t1', file, u1);
    manager._recordWrite('t2', file, u2);

    // default = last write wins
    expect(await manager.resolveOverlaps({ undoStack: stack })).toEqual([
      { file, action: 'kept-later', todoId: 't2' }
    ]);
    expect(await readFile(join(projectPath, file), 'utf8')).toBe('v2');

    // keep-first rolls the later writer's edit back
    expect(await manager.resolveOverlaps({ undoStack: stack, decisions: { [file]: 'keep-first' } })).toEqual([
      { file, action: 'rolled-back', todoId: 't2' }
    ]);
    expect(await readFile(join(projectPath, file), 'utf8')).toBe('v1');
  });

  it('ToolExecutor notifies the writer audit on write_file and edit_file', async () => {
    const projectPath = await freshProject('onwrite');
    const seen = [];
    const tools = new ToolExecutor({
      projectPath,
      todoId: 't1',
      domain: 'backend',
      onWrite: (info) => seen.push(info)
    });

    const w = await tools.write_file({ path: 'src/a.js', content: 'x' });
    expect(w.ok).toBe(true);
    const e = await tools.edit_file({ path: 'src/a.js', old: 'x', new: 'y' });
    expect(e.ok).toBe(true);

    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatchObject({ file: 'src/a.js', todoId: 't1', tool: 'write_file', undoId: null });
    expect(seen[1]).toMatchObject({ file: 'src/a.js', todoId: 't1', tool: 'edit_file' });
  });

  it('classifies lock timeouts as FILE_LOCK_TIMEOUT naming the holder', async () => {
    const locks = new FileLockManager();
    await locks.acquireLock('t1', 'shared.ts');

    let err = null;
    try {
      await locks.acquireLock('t2', 'shared.ts', 40);
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.code).toBe('FILE_LOCK_TIMEOUT');
    expect(err.lockedBy).toBe('t1');
    expect(err.filePath).toBe('shared.ts');
  });

  it('flags writing todos that declare no files', async () => {
    const projectPath = await freshProject('emptyfiles');
    const bus = new EventEmitter();
    const plan = {
      summary: 'undeclared writes',
      todos: [
        { id: 't1', title: 'Backend work', description: '', domain: 'backend', dependsOn: [], files: [] }
      ]
    };
    const manager = makeManager({ projectPath, plan, bus });
    vi.spyOn(manager, '_dispatch').mockImplementation(async (todo) => {
      const result = { todoId: todo.id, status: 'done' };
      manager.results.set(todo.id, result);
      return result;
    });

    const toasts = [];
    bus.on(EVENTS.TOAST, (p) => toasts.push(p));
    await manager.runAll();

    expect(manager._emptyFileTodos).toEqual([
      { id: 't1', domain: 'backend', title: 'Backend work' }
    ]);
    expect(toasts.some((t) => String(t.text).includes('planner wrote no files'))).toBe(true);
  });
});

describe('MF-003 dry-run + execute-plan', () => {
  function dryPlan() {
    return {
      summary: 'dry fixture',
      prompt: 'build a thing',
      todos: [
        { id: 't1', title: 'One', description: '', domain: 'backend', dependsOn: [], files: ['a.js'] },
        { id: 't2', title: 'Two', description: '', domain: 'frontend', dependsOn: ['t1'], files: ['b.js'] }
      ]
    };
  }

  it('persists the previewed plan atomically and reads it back', async () => {
    const file = await writeDryRunPlan('dryproj01', { prompt: 'build a thing', plan: dryPlan() });
    expect(file).toContain('plan.json');

    const saved = await readDryRunPlan('dryproj01');
    expect(saved.dryRun).toBe(true);
    expect(saved.plan.todos).toHaveLength(2);
    expect(typeof saved.savedAt).toBe('string');

    // corrupt → null (caller fails loudly, never executes garbage)
    await writeFile(file, '{ not json', 'utf8');
    expect(await readDryRunPlan('dryproj01')).toBeNull();
  });

  it('renders a plan as grouped waves with files and deps', () => {
    const text = renderPlan(dryPlan());
    expect(text).toContain('2 todos');
    expect(text).toContain('wave 1:');
    expect(text).toContain('t1 [backend] One');
    expect(text).toContain('files: a.js');
    expect(text).toContain('deps: t1');
    expect(text).toContain('nothing dispatched');
  });

  it('dry-run never dispatches and saves the plan for --execute-plan', async () => {
    const projectPath = await freshProject('dryrun');
    const orchestrator = new Orchestrator({ projectPath, config: { ...DEFAULT_CONFIG } });
    orchestrator.sessionId = 'dryrunproj1';
    orchestrator.plan = async () => dryPlan();

    const runPlan = vi.spyOn(orchestrator, 'runPlan');
    const summary = await orchestrator.runGod('build a thing', { dryRun: true });

    expect(runPlan).not.toHaveBeenCalled(); // zero dispatch, zero subagents
    expect(summary.dryRun).toBe(true);
    expect(summary.todos).toBe(2);
    expect(summary.waves).toBe(2);

    const saved = await readDryRunPlan('dryrunproj1');
    expect(saved.plan.todos.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('execute-plan runs the saved DAG without re-planning', async () => {
    const projectPath = await freshProject('execplan');
    const orchestrator = new Orchestrator({ projectPath, config: { ...DEFAULT_CONFIG } });
    orchestrator.sessionId = 'execproj001';
    await writeDryRunPlan('execproj001', { prompt: 'build a thing', plan: dryPlan() });

    orchestrator.plan = async () => {
      throw new Error('planner must not run for --execute-plan');
    };
    const seen = [];
    orchestrator.runPlan = async (plan, opts) => {
      seen.push({ plan, opts });
      return {
        total: plan.todos.length,
        done: plan.todos.length,
        failed: 0,
        needsReview: 0,
        todos: plan.todos.map((t) => ({ ...t, status: 'done' }))
      };
    };

    const summary = await orchestrator.runGod(null, { executePlan: true });

    expect(seen).toHaveLength(1);
    expect(seen[0].plan.todos.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(summary.total).toBe(2);
    expect(summary.done).toBe(2);
  });

  it('execute-plan fails loudly when no dry-run plan exists', async () => {
    const projectPath = await freshProject('execnone');
    const orchestrator = new Orchestrator({ projectPath, config: { ...DEFAULT_CONFIG } });
    orchestrator.sessionId = 'execnone001';
    orchestrator.plan = async () => {
      throw new Error('planner must not run');
    };
    orchestrator.runPlan = async () => {
      throw new Error('runPlan must not run');
    };

    await expect(orchestrator.runGod(null, { executePlan: true })).rejects.toThrow(
      /no saved dry-run plan/
    );
  });
});
