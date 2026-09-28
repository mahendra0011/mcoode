import { describe, it, expect, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { EventEmitter } from 'node:events';

// MF-001: checkpoints must never touch the developer's real ~/.mcode.
const home = await mkdtemp(join(tmpdir(), 'mcode-resume-home-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const { MockProvider } = await import('../src/providers/mock.js');
const { SubagentManager } = await import('../src/core/subagent-manager.js');
const { Orchestrator } = await import('../src/core/orchestrator.js');
const { CostLedger, DEFAULT_CONFIG } = await import('@mcode/shared');
const { UndoStack } = await import('../src/core/tools.js');
const { getProjectId } = await import('../src/core/store.js');
const {
  SESSIONS_DIR,
  STATE_VERSION,
  statePathFor,
  writeSessionState,
  readSessionState,
  listSessionStates,
  summarizeTodoStatus,
  interruptedTodos,
  revertInterruptedFiles,
  loadResumableState,
  deleteSessionState
} = await import('../src/core/session-state.js');

const mock = new MockProvider();
const fakeRouter = {
  reasoning: null,
  pick: async () => ({ provider: mock, model: (await mock.listModels())[0], ref: 'mock:mock' })
};

function twoTodoPlan() {
  return {
    summary: 'resume fixture',
    prompt: 'add billing',
    todos: [
      { id: 't1', title: 'Write readme', description: '', domain: 'docs', dependsOn: [], files: ['MOCK_readme.md'] },
      { id: 't2', title: 'Write notes', description: '', domain: 'docs', dependsOn: ['t1'], files: ['MOCK_notes.md'] }
    ]
  };
}

async function freshProject(tag = 'proj') {
  return mkdtemp(join(tmpdir(), `mcode-resume-${tag}-`));
}

function makeManager({ projectPath, plan, resumeState = null, session = null }) {
  return new SubagentManager({
    plan,
    router: fakeRouter,
    projectPath,
    config: { concurrency: 2, maxTurnsPerSubagent: 6 },
    bus: new EventEmitter(),
    options: {
      ledger: new CostLedger(),
      skipIntegrationTests: true,
      resumeState,
      ...(session ? { session } : {})
    }
  });
}

/** Replace dispatch with a stub so "was this todo re-run?" is directly observable. */
function stubDispatch(manager) {
  const dispatched = [];
  vi.spyOn(manager, '_dispatch').mockImplementation(async (todo) => {
    dispatched.push(todo.id);
    const result = { todoId: todo.id, status: 'done' };
    manager.results.set(todo.id, result);
    return result;
  });
  return dispatched;
}

afterAll(async () => {
  await rm(home, { recursive: true, force: true }).catch(() => {});
});

describe('MF-001 checkpoint + resume (mock provider)', () => {
  it('checkpoints at every wave boundary and ends with status=completed', async () => {
    const projectPath = await freshProject('waves');
    const manager = makeManager({
      projectPath,
      plan: twoTodoPlan(),
      session: { prompt: 'add billing' }
    });

    const merged = await manager.runAll();
    expect(merged.done).toBe(2);

    const state = await readSessionState(await getProjectId(projectPath));
    expect(state.status).toBe('completed');
    expect(state.prompt).toBe('add billing');
    expect(state.projectPath).toBe(projectPath);
    expect(state.todoStatus).toEqual({ t1: 'done', t2: 'done' });
    expect(state.totalWaves).toBe(2);
    expect(state.waveIndex).toBe(2);
    expect(state.inflight).toEqual({});
  }, 120000);

  it('a fresh run dispatches every todo (baseline for the resume comparison)', async () => {
    const projectPath = await freshProject('fresh');
    const manager = makeManager({ projectPath, plan: twoTodoPlan() });
    const dispatched = stubDispatch(manager);
    await manager.runAll();
    expect(dispatched).toEqual(['t1', 't2']);
  });

  it('resume re-attaches DONE todos without dispatching them again', async () => {
    const projectPath = await freshProject('skip');
    const projectId = await getProjectId(projectPath);
    const plan = twoTodoPlan();
    await writeSessionState(projectId, {
      prompt: 'add billing',
      status: 'interrupted',
      projectPath,
      projectName: basename(projectPath),
      plan,
      todoStatus: { t1: 'done', t2: 'pending' },
      inflight: {},
      waveIndex: 1,
      totalWaves: 2
    });

    const manager = makeManager({
      projectPath,
      plan,
      resumeState: await readSessionState(projectId)
    });
    const dispatched = stubDispatch(manager);
    const merged = await manager.runAll();

    expect(dispatched).toEqual(['t2']); // t1 is never re-dispatched → no double spend
    expect(merged.done).toBe(2); // …but it still counts towards the summary
    expect(merged.total).toBe(2);
    expect(manager.results.get('t1')?.resumed).toBe(true);
  }, 60000);

  it('a resumed run only writes the remaining todos (real subagents)', async () => {
    const projectPath = await freshProject('e2e');
    const projectId = await getProjectId(projectPath);
    const plan = twoTodoPlan();
    await writeSessionState(projectId, {
      prompt: 'add billing',
      status: 'interrupted',
      projectPath,
      plan,
      todoStatus: { t1: 'done', t2: 'pending' },
      inflight: {},
      waveIndex: 1,
      totalWaves: 2
    });

    const manager = makeManager({
      projectPath,
      plan,
      resumeState: await readSessionState(projectId)
    });
    const merged = await manager.runAll();
    expect(merged.done).toBe(2);

    const files = await readdir(projectPath);
    expect(files.some((f) => f.includes('notes'))).toBe(true); // t2 was re-dispatched
    expect(files.some((f) => f.includes('readme'))).toBe(false); // t1's file was never rewritten
  }, 120000);
});

describe('MF-001 session checkpoint store', () => {
  it('writes a versioned state atomically and reads it back', async () => {
    const projectPath = await freshProject('store');
    const projectId = await getProjectId(projectPath);
    await writeSessionState(projectId, {
      prompt: 'add billing',
      plan: { todos: [] },
      todoStatus: {},
      waveIndex: 0,
      totalWaves: 2
    });

    const state = await readSessionState(projectId);
    expect(state.v).toBe(STATE_VERSION);
    expect(state.projectId).toBe(projectId);
    expect(state.sessionId).toBe(projectId);
    expect(state.prompt).toBe('add billing');
    expect(typeof state.updatedAt).toBe('string');

    // atomic write: no tmp turds left behind for the next resume to trip over
    const left = (await readdir(join(SESSIONS_DIR, projectId))).filter((f) => f.includes('.tmp'));
    expect(left).toEqual([]);

    await deleteSessionState(projectId);
    expect(await readSessionState(projectId)).toBeNull();
  });

  it('treats a corrupt state file as "no session" instead of crashing', async () => {
    const id = 'corruptfix';
    await mkdir(join(SESSIONS_DIR, id), { recursive: true });
    await writeFile(statePathFor(id), '{ not json', 'utf8');
    expect(await readSessionState(id)).toBeNull();
    expect((await listSessionStates()).some((s) => s.projectId === id)).toBe(false);
  });

  it('refuses a state written by a newer CLI without breaking the listing', async () => {
    const id = 'futurefix';
    await mkdir(join(SESSIONS_DIR, id), { recursive: true });
    await writeFile(statePathFor(id), JSON.stringify({ v: 99, prompt: 'from the future' }), 'utf8');
    await expect(readSessionState(id)).rejects.toMatchObject({ code: 'SESSION_STATE_TOO_NEW' });
    expect((await listSessionStates()).some((s) => s.projectId === id)).toBe(false);
  });

  it('summarizes todo status counters', () => {
    const counts = summarizeTodoStatus({
      a: 'done',
      b: 'failed',
      c: 'needs_review',
      d: 'running',
      e: 'pending',
      f: 'done'
    });
    expect(counts).toEqual({ total: 6, done: 2, failed: 1, needsReview: 1, running: 1, pending: 1 });
  });

  it('lists sessions newest first', async () => {
    const first = await freshProject('list-a');
    const second = await freshProject('list-b');
    const firstId = await getProjectId(first);
    const secondId = await getProjectId(second);
    await writeSessionState(firstId, { prompt: 'older', plan: { todos: [] }, todoStatus: { t1: 'done' } });
    await new Promise((r) => setTimeout(r, 10));
    await writeSessionState(secondId, { prompt: 'newer', plan: { todos: [] }, todoStatus: { t1: 'pending' } });

    const list = await listSessionStates();
    const ids = list.map((s) => s.projectId);
    expect(ids).toContain(firstId);
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId));
  });

  it('resolves resume targets by id, unique prefix, path and current project', async () => {
    const projectPath = await freshProject('resolve');
    const projectId = await getProjectId(projectPath);
    await writeSessionState(projectId, {
      prompt: 'resolve me',
      status: 'interrupted',
      projectPath,
      projectName: basename(projectPath),
      plan: { todos: [] },
      todoStatus: {}
    });

    expect((await loadResumableState(projectId)).prompt).toBe('resolve me');
    expect((await loadResumableState(projectId.slice(0, 6))).prompt).toBe('resolve me');
    expect((await loadResumableState(projectPath)).prompt).toBe('resolve me');
    expect((await loadResumableState(null, { projectPath })).prompt).toBe('resolve me');
    expect((await loadResumableState(basename(projectPath))).prompt).toBe('resolve me');

    await expect(loadResumableState('no-such-session')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND'
    });
    await expect(loadResumableState(true, { projectPath: await freshProject('empty') })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND'
    });
  });

  it('reverts the files an interrupted subagent wrote', async () => {
    const projectPath = await freshProject('revert');
    const stack = new UndoStack({ filePath: join(projectPath, 'undo.json'), projectPath });
    await writeFile(join(projectPath, 'src.js'), 'before', 'utf8');
    await stack.snapshot('src.js', 'before');
    await writeFile(join(projectPath, 'src.js'), 'after', 'utf8'); // the interrupted write

    const state = {
      plan: { todos: [{ id: 't1', domain: 'backend', title: 'Edit src', files: ['src.js'] }] },
      todoStatus: { t1: 'running' },
      inflight: { t1: { files: ['src.js'], startedAt: new Date().toISOString() } }
    };

    const interrupted = interruptedTodos(state);
    expect(interrupted).toHaveLength(1);
    expect(interrupted[0]).toMatchObject({ id: 't1', files: ['src.js'] });

    const { reverted, missing } = await revertInterruptedFiles({ state, undoStack: stack });
    expect(reverted).toEqual(['src.js']);
    expect(missing).toEqual([]);
    expect(await readFile(join(projectPath, 'src.js'), 'utf8')).toBe('before');
  });

  it('reports files that were written without an undo snapshot', async () => {
    const projectPath = await freshProject('revert-missing');
    const stack = new UndoStack({ filePath: join(projectPath, 'undo.json'), projectPath });
    const state = {
      plan: { todos: [{ id: 't1', files: ['untracked.js'] }] },
      todoStatus: { t1: 'running' },
      inflight: { t1: { files: ['untracked.js'], startedAt: new Date().toISOString() } }
    };
    const { reverted, missing } = await revertInterruptedFiles({ state, undoStack: stack });
    expect(reverted).toEqual([]);
    expect(missing).toEqual(['untracked.js']);
  });
});

describe('MF-001 interrupted runs', () => {
  it('retries a todo that was mid-flight at crash time', async () => {
    const projectPath = await freshProject('inflight');
    const projectId = await getProjectId(projectPath);
    const plan = twoTodoPlan();
    await writeSessionState(projectId, {
      prompt: 'add billing',
      status: 'interrupted',
      projectPath,
      plan,
      todoStatus: { t1: 'done', t2: 'running' },
      inflight: { t2: { files: ['MOCK_notes.md'], startedAt: new Date().toISOString() } },
      waveIndex: 1,
      totalWaves: 2
    });

    const resumeState = await readSessionState(projectId);
    const interrupted = interruptedTodos(resumeState);
    expect(interrupted).toHaveLength(1);
    expect(interrupted[0]).toMatchObject({ id: 't2', status: 'running', files: ['MOCK_notes.md'] });

    const manager = makeManager({ projectPath, plan, resumeState });
    const dispatched = stubDispatch(manager);
    await manager.runAll();
    expect(dispatched).toEqual(['t2']); // running → PENDING → retried; t1 stays done
  }, 60000);

  it('stop() flushes an interrupted checkpoint (SIGINT path)', async () => {
    const projectPath = await freshProject('sigint');
    const manager = makeManager({
      projectPath,
      plan: twoTodoPlan(),
      session: { prompt: 'ctrl+c me', startedAt: '2026-01-01T00:00:00.000Z' }
    });

    await manager.flushCheckpoint('running');
    manager.stop();
    await manager.pendingCheckpoint;

    const state = await readSessionState(await getProjectId(projectPath));
    expect(state.status).toBe('interrupted');
    expect(state.prompt).toBe('ctrl+c me');
    expect(state.startedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('MF-001 orchestrator resume', () => {
  it('resume never re-plans and forwards the checkpoint to the manager', async () => {
    const projectPath = await freshProject('orchestrator');
    const orchestrator = new Orchestrator({ projectPath, config: { ...DEFAULT_CONFIG } });

    let plannerCalls = 0;
    orchestrator.plan = async () => {
      plannerCalls += 1;
      return { summary: 'replanned', todos: [] };
    };
    let seen = null;
    orchestrator.runPlan = async (plan, opts) => {
      seen = { plan, opts };
      return { total: plan.todos.length, done: plan.todos.length, failed: 0, needsReview: 0, todos: [] };
    };

    const resumeState = {
      sessionId: 'abc123def456',
      prompt: 'add billing',
      stackHint: 'node',
      startedAt: '2026-01-01T00:00:00.000Z',
      todoStatus: { t1: 'done' },
      plan: { summary: 'from checkpoint', todos: [{ id: 't1', title: 'T', domain: 'docs', dependsOn: [] }] }
    };

    const summary = await orchestrator.runGod(null, { resumeState });

    expect(plannerCalls).toBe(0); // the paid, non-deterministic planner never runs
    expect(seen.opts.resumeState).toBe(resumeState);
    expect(seen.opts.sessionMeta).toMatchObject({
      prompt: 'add billing',
      stackHint: 'node',
      startedAt: '2026-01-01T00:00:00.000Z',
      mode: 'god'
    });
    expect(seen.plan.todos).toHaveLength(1);
    expect(summary.total).toBe(1);
  });
});
