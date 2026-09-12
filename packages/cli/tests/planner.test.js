import { describe, it, expect } from 'vitest';
import { parsePlanOutput, Planner } from '../src/core/planner.js';

describe('parsePlanOutput', () => {
  it('parses raw JSON', () => {
    const plan = parsePlanOutput('{"summary": "test", "todos": [{"id": "t1", "title": "Hello"}]}');
    expect(plan.summary).toBe('test');
    expect(plan.todos).toHaveLength(1);
    expect(plan.todos[0].id).toBe('t1');
    expect(plan.todos[0].title).toBe('Hello');
  });

  it('parses fenced JSON', () => {
    const input = '```json\n{"summary": "fenced", "todos": [{"title": "x"}]}\n```';
    const plan = parsePlanOutput(input);
    expect(plan.summary).toBe('fenced');
    expect(plan.todos).toHaveLength(1);
  });

  it('extracts JSON from prose', () => {
    const input = 'Here is the plan:\n{"summary": "embedded", "todos": [{"title": "a"}, {"title": "b"}]}\nDone.';
    const plan = parsePlanOutput(input);
    expect(plan.summary).toBe('embedded');
    expect(plan.todos).toHaveLength(2);
  });

  it('throws on no JSON', () => {
    expect(() => parsePlanOutput('no json here')).toThrow('no JSON object found');
  });

  it('throws on malformed JSON', () => {
    expect(() => parsePlanOutput('{broken')).toThrow();
  });

  it('normalizes todos via normalizePlan', () => {
    const plan = parsePlanOutput('{"todos": [{"title": "x", "domain": "invalid"}]}');
    expect(plan.todos[0].domain).toBe('backend'); // invalid domain defaults to backend
    expect(plan.todos[0].status).toBe('pending');
  });
});

describe('Planner', () => {
  it('constructs with defaults', () => {
    const planner = new Planner({});
    expect(planner.modelDomain).toBe('planning');
  });

  it('plan() with a mock assignment succeeds', async () => {
    const mockAssignment = {
      provider: {
        id: 'mock',
        complete: async () => ({
          text: '{"summary": "mock plan", "todos": [{"id": "t1", "title": "Setup", "domain": "backend", "files": ["index.js"]}]}'
        }),
      },
      model: { id: 'mock' },
      ref: 'mock:mock',
    };
    const events = [];
    const planner = new Planner({
      router: { pick: async () => mockAssignment, reasoning: null },
      bus: { emit: (e, p) => events.push({ e, p }) },
    });
    const plan = await planner.plan('build a server');
    expect(plan.summary).toBe('mock plan');
    expect(plan.todos).toHaveLength(1);
    expect(plan.prompt).toBe('build a server');
    expect(plan.model).toBe('mock:mock');
  });

  it('plan() throws when no model available', async () => {
    const planner = new Planner({
      router: { pick: async () => null },
      bus: { emit: () => {} },
    });
    await expect(planner.plan('test')).rejects.toThrow('no planning model');
  });

  it('plan() includes repo context when provided', async () => {
    let capturedMessages = null;
    const mockAssignment = {
      provider: {
        id: 'mock',
        complete: async (_model, opts) => {
          capturedMessages = opts.messages;
          return {
            text: '{"summary": "with context", "todos": [{"title": "x"}]}'
          };
        },
      },
      model: { id: 'mock' },
      ref: 'mock:mock',
    };
    const planner = new Planner({
      router: { pick: async () => mockAssignment, reasoning: null },
      bus: { emit: () => {} },
    });
    await planner.plan('test', { repoContext: 'has package.json with express' });
    expect(capturedMessages[1].content).toContain('PROJECT CONTEXT');
    expect(capturedMessages[1].content).toContain('has package.json with express');
  });

  it('plan() detects and rejects cycles', async () => {
    const mockAssignment = {
      provider: {
        id: 'mock',
        complete: async () => ({
          text: '{"summary": "cycle", "todos": [{"id": "a", "title": "1", "dependsOn": ["b"]}, {"id": "b", "title": "2", "dependsOn": ["a"]}]}'
        }),
      },
      model: { id: 'mock' },
      ref: 'mock:mock',
    };
    const planner = new Planner({
      router: { pick: async () => mockAssignment, reasoning: null },
      bus: { emit: () => {} },
    });
    await expect(planner.plan('test')).rejects.toThrow('cycle');
  });
});
