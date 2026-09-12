import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../src/core/orchestrator.js';

describe('Orchestrator constructor', () => {
  it('initializes with default values', () => {
    const orch = new Orchestrator({});
    expect(orch.projectPath).toBe(process.cwd());
    expect(orch.mode).toBe('medium');
    expect(orch.chatHistory).toEqual([]);
    expect(orch.chatAgentEnabled).toBe(true);
    expect(orch.connectedToBackend).toBe(false);
    expect(orch.socket).toBeNull();
    expect(orch.router).toBeNull();
    expect(orch.undoStack).toBeNull();
    expect(orch.watchDaemon).toBeNull();
  });

  it('accepts custom projectPath', () => {
    const orch = new Orchestrator({ projectPath: '/custom/path' });
    expect(orch.projectPath).toBe('/custom/path');
  });

  it('accepts valid mode from options', () => {
    const orch = new Orchestrator({ options: { mode: 'god' } });
    expect(orch.mode).toBe('god');
  });

  it('falls back to medium for invalid mode', () => {
    const orch = new Orchestrator({ options: { mode: 'invalid' } });
    expect(orch.mode).toBe('medium');
  });

  it('accepts mode from config when options.mode is not set', () => {
    const orch = new Orchestrator({ config: { mode: 'high' } });
    expect(orch.mode).toBe('high');
  });

  it('accepts modelOverride from options', () => {
    const orch = new Orchestrator({ options: { modelOverride: 'openai:gpt-4o' } });
    expect(orch.modelOverride).toBe('openai:gpt-4o');
  });

  it('accepts modelOverride from config', () => {
    const orch = new Orchestrator({ config: { modelOverride: 'anthropic:claude' } });
    expect(orch.modelOverride).toBe('anthropic:claude');
  });

  it('disables chatAgent when config says so', () => {
    const orch = new Orchestrator({ config: { chatAgent: false } });
    expect(orch.chatAgentEnabled).toBe(false);
  });
});

describe('Orchestrator.setChatAgent()', () => {
  it('toggles chatAgentEnabled', () => {
    const orch = new Orchestrator({});
    expect(orch.setChatAgent(false)).toBe(false);
    expect(orch.chatAgentEnabled).toBe(false);
    expect(orch.setChatAgent(true)).toBe(true);
    expect(orch.chatAgentEnabled).toBe(true);
  });
});

describe('Orchestrator.clearChat()', () => {
  it('empties the chat history', () => {
    const orch = new Orchestrator({});
    orch.chatHistory = [{ role: 'user', content: 'hello' }];
    orch.clearChat();
    expect(orch.chatHistory).toEqual([]);
  });
});

describe('Orchestrator.setMode()', () => {
  it('sets mode without router', () => {
    const orch = new Orchestrator({});
    expect(orch.setMode('high')).toBe('high');
    expect(orch.mode).toBe('high');
  });
});

describe('Orchestrator.bus', () => {
  it('emit() triggers EventEmitter listeners', () => {
    const orch = new Orchestrator({});
    const received = [];
    orch.on('TEST_EVENT', (p) => received.push(p));
    orch.bus.emit('TEST_EVENT', { data: 42 });
    expect(received).toEqual([{ data: 42 }]);
  });
});

describe('Orchestrator.watchStatus', () => {
  it('returns off when no daemon', () => {
    const orch = new Orchestrator({});
    expect(orch.watchStatus).toBe('off');
  });
});

describe('Orchestrator.watchMaxPerHour', () => {
  it('returns default 60', () => {
    const orch = new Orchestrator({});
    expect(orch.watchMaxPerHour).toBe(60);
  });
});

describe('Orchestrator.godWatchActive', () => {
  it('returns false when no daemon', () => {
    const orch = new Orchestrator({});
    expect(orch.godWatchActive).toBe(false);
  });
});

describe('Orchestrator.disconnect()', () => {
  it('cleans up without error when no socket', () => {
    const orch = new Orchestrator({});
    expect(() => orch.disconnect()).not.toThrow();
    expect(orch.connectedToBackend).toBe(false);
  });
});

describe('Orchestrator.clearSpecializedAgents()', () => {
  it('clears without error when no agents exist', () => {
    const orch = new Orchestrator({});
    expect(() => orch.clearSpecializedAgents()).not.toThrow();
  });
});

describe('Orchestrator.interrupt()', () => {
  it('does not throw when no active agents', () => {
    const orch = new Orchestrator({});
    expect(() => orch.interrupt()).not.toThrow();
  });
});
