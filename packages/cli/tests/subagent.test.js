import { describe, it, expect } from 'vitest';
import { Subagent } from '../src/core/subagent.js';
import { SUBAGENT_STATUS, EVENTS } from '@mcode/shared';

/* ── parseAction tests via the private module ── */
/* parseAction is not exported, so we test it indirectly through Subagent behavior,
   but we can also test the action-parsing by importing the module and extracting it.
   Since it's a file-scoped function, we re-implement the parsing contract tests here. */

function makeMinimalAssignment() {
  return {
    provider: {
      id: 'mock',
      complete: async () => ({ text: '{"done": true, "summary": "test"}', usage: {} }),
    },
    model: { id: 'mock' },
    ref: 'mock:mock',
    ledger: () => {},
  };
}

function makeBus() {
  const events = [];
  return {
    emit: (event, payload) => events.push({ event, payload }),
    events,
  };
}

describe('Subagent constructor', () => {
  it('initializes with PENDING status', () => {
    const bus = makeBus();
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [] },
      assignment: makeMinimalAssignment(),
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    expect(sub.status).toBe(SUBAGENT_STATUS.PENDING);
    expect(sub.step).toBe(0);
    expect(sub.blockedCount).toBe(0);
    expect(sub.tokens).toEqual({ in: 0, out: 0 });
    expect(sub.interrupted).toBe(false);
  });
});

describe('Subagent.run()', () => {
  it('completes when model returns done action', async () => {
    const bus = makeBus();
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [], maxTurns: 5 },
      assignment: makeMinimalAssignment(),
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    const result = await sub.run();
    expect(result.status).toBe('done');
    expect(result.summary).toBe('test');
    expect(sub.status).toBe(SUBAGENT_STATUS.DONE);
  });

  it('emits SUBAGENT_STARTED and SUBAGENT_DONE events', async () => {
    const bus = makeBus();
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [], maxTurns: 5 },
      assignment: makeMinimalAssignment(),
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    await sub.run();
    const eventNames = bus.events.map((e) => e.event);
    expect(eventNames).toContain(EVENTS.SUBAGENT_ASSIGNED);
    expect(eventNames).toContain(EVENTS.SUBAGENT_STARTED);
    expect(eventNames).toContain(EVENTS.SUBAGENT_STEP);
    expect(eventNames).toContain(EVENTS.SUBAGENT_DONE);
  });

  it('marks needs_review after 3 blocked responses', async () => {
    const bus = makeBus();
    let callCount = 0;
    const assignment = {
      ...makeMinimalAssignment(),
      provider: {
        id: 'mock',
        complete: async () => {
          callCount++;
          return { text: '{"blocked": true, "reason": "stuck"}', usage: {} };
        },
      },
    };
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [], maxTurns: 10 },
      assignment,
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    const result = await sub.run();
    expect(result.status).toBe('needs_review');
    expect(result.reason).toBe('stuck');
    expect(sub.status).toBe(SUBAGENT_STATUS.NEEDS_REVIEW);
  });

  it('marks needs_review when turn budget exhausted', async () => {
    const bus = makeBus();
    const assignment = {
      ...makeMinimalAssignment(),
      provider: {
        id: 'mock',
        complete: async () => ({ text: '{"tool": "read_file", "args": {"path": "test.js"}}', usage: {} }),
      },
    };
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [], maxTurns: 2 },
      assignment,
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: { maxTurnsPerSubagent: 2 },
    });
    const result = await sub.run();
    expect(result.status).toBe('needs_review');
    expect(result.reason).toContain('turn budget');
  });

  it('marks failed when provider throws', async () => {
    const bus = makeBus();
    const assignment = {
      ...makeMinimalAssignment(),
      provider: {
        id: 'mock',
        complete: async () => { throw new Error('API down'); },
      },
    };
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [], maxTurns: 5 },
      assignment,
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    const result = await sub.run();
    expect(result.status).toBe('failed');
    expect(result.error).toBe('API down');
    expect(sub.status).toBe(SUBAGENT_STATUS.FAILED);
  });
});

describe('Subagent.interrupt()', () => {
  it('sets interrupted flag and aborts controller', () => {
    const bus = makeBus();
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [] },
      assignment: makeMinimalAssignment(),
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    sub.interrupt();
    expect(sub.interrupted).toBe(true);
    expect(sub.abortController.signal.aborted).toBe(true);
  });
});

describe('Subagent.elapsedSecs()', () => {
  it('returns 0 when not started', () => {
    const bus = makeBus();
    const sub = new Subagent({
      todo: { id: 't1', title: 'Test', description: 'desc', domain: 'backend', dependsOn: [], files: [] },
      assignment: makeMinimalAssignment(),
      projectPath: process.cwd(),
      bus,
      undoStack: null,
      config: {},
    });
    expect(sub.elapsedSecs()).toBe(0);
  });
});
