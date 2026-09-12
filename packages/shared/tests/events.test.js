import { describe, it, expect } from 'vitest';
import {
  EVENTS,
  SUBAGENT_STATUS,
  SESSION_MODES,
  SOCKET,
  WATCH_OUTCOMES
} from '../src/events.js';

describe('EVENTS', () => {
  it('is a frozen object with string values', () => {
    expect(Object.isFrozen(EVENTS)).toBe(true);
    for (const [key, val] of Object.entries(EVENTS)) {
      expect(typeof val).toBe('string');
      expect(val).toBe(key); // EVENTS keys equal their values
    }
  });

  it('contains all documented event names', () => {
    const expected = [
      'USER_PROMPT', 'PLAN_GENERATED', 'PLAN_APPROVED',
      'SUBAGENT_CREATED', 'SUBAGENT_ASSIGNED', 'SUBAGENT_STARTED',
      'SUBAGENT_STEP', 'SUBAGENT_FILE', 'SUBAGENT_TOOL_CALL',
      'SUBAGENT_TOOL_RESULT', 'SUBAGENT_DONE', 'SUBAGENT_FAILED',
      'SUBAGENT_NEEDS_REVIEW', 'WAVE_START', 'WAVE_COMPLETE',
      'INTEGRATION_PASS', 'BUILD_COMPLETE', 'TOAST', 'MESSAGE',
      'PERMISSION_ANSWER', 'WATCH_SCAN', 'WATCH_CHANGE', 'WATCH_FIX',
      'WATCH_STATUS', 'UNDO', 'HOOK_EXECUTED', 'SUBAGENT_SHELL_OUTPUT'
    ];
    for (const name of expected) {
      expect(EVENTS).toHaveProperty(name);
    }
  });

  it('cannot be mutated', () => {
    expect(() => { EVENTS.NEW_EVENT = 'test'; }).toThrow();
  });
});

describe('SUBAGENT_STATUS', () => {
  it('is frozen with 5 status values', () => {
    expect(Object.isFrozen(SUBAGENT_STATUS)).toBe(true);
    expect(SUBAGENT_STATUS.PENDING).toBe('pending');
    expect(SUBAGENT_STATUS.RUNNING).toBe('running');
    expect(SUBAGENT_STATUS.DONE).toBe('done');
    expect(SUBAGENT_STATUS.FAILED).toBe('failed');
    expect(SUBAGENT_STATUS.NEEDS_REVIEW).toBe('needs_review');
    expect(Object.keys(SUBAGENT_STATUS)).toHaveLength(5);
  });
});

describe('SESSION_MODES', () => {
  it('is frozen and contains expected modes', () => {
    expect(Object.isFrozen(SESSION_MODES)).toBe(true);
    expect(SESSION_MODES.GOD).toBe('god');
    expect(SESSION_MODES.CHAT).toBe('chat');
    expect(SESSION_MODES.AGENT).toBe('agent');
    expect(SESSION_MODES.INIT).toBe('init');
    expect(SESSION_MODES.RUN).toBe('run');
    expect(SESSION_MODES.WATCH).toBe('watch');
    expect(SESSION_MODES.MANUAL).toBe('manual');
  });
});

describe('WATCH_OUTCOMES', () => {
  it('is frozen with 3 outcome values', () => {
    expect(Object.isFrozen(WATCH_OUTCOMES)).toBe(true);
    expect(WATCH_OUTCOMES.AUTO_FIXED).toBe('auto-fixed');
    expect(WATCH_OUTCOMES.NO_ISSUES).toBe('no-issues');
    expect(WATCH_OUTCOMES.NEEDS_REVIEW).toBe('needs-review');
    expect(Object.keys(WATCH_OUTCOMES)).toHaveLength(3);
  });
});

describe('SOCKET', () => {
  it('defines the /live namespace', () => {
    expect(SOCKET.NS).toBe('/live');
  });

  it('has CLIENT_TO_SERVER events', () => {
    expect(SOCKET.CLIENT_TO_SERVER).toBeDefined();
    expect(SOCKET.CLIENT_TO_SERVER.CHAT_START).toBe('chat:start');
    expect(SOCKET.CLIENT_TO_SERVER.CHAT_SEND).toBe('chat:send');
    expect(SOCKET.CLIENT_TO_SERVER.CHAT_PERMISSION_ANSWER).toBe('chat:permission_answer');
    expect(SOCKET.CLIENT_TO_SERVER.CHAT_INTERRUPT).toBe('chat:interrupt');
    expect(SOCKET.CLIENT_TO_SERVER.CHAT_UNDO).toBe('chat:undo');
  });

  it('has SERVER_TO_CLIENT events', () => {
    expect(SOCKET.SERVER_TO_CLIENT).toBeDefined();
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_READY).toBe('chat:ready');
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_STREAM).toBe('chat:stream');
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_MESSAGE).toBe('chat:message');
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_TOOL_CALL).toBe('chat:tool_call');
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_DONE).toBe('chat:done');
    expect(SOCKET.SERVER_TO_CLIENT.CHAT_ERROR).toBe('chat:error');
    expect(SOCKET.SERVER_TO_CLIENT.SUBAGENT_CREATED).toBe('subagent:created');
    expect(SOCKET.SERVER_TO_CLIENT.SUBAGENT_DONE).toBe('subagent:done');
    expect(SOCKET.SERVER_TO_CLIENT.WAVE_START).toBe('wave:start');
    expect(SOCKET.SERVER_TO_CLIENT.WAVE_COMPLETE).toBe('wave:complete');
    expect(SOCKET.SERVER_TO_CLIENT.INTEGRATION_PASS).toBe('integration:pass');
    expect(SOCKET.SERVER_TO_CLIENT.BUILD_COMPLETE).toBe('build:complete');
    expect(SOCKET.SERVER_TO_CLIENT.TOAST).toBe('toast');
  });

  it('is frozen at the top level', () => {
    expect(Object.isFrozen(SOCKET)).toBe(true);
    // Object.freeze is shallow — nested objects are plain objects
    expect(SOCKET.CLIENT_TO_SERVER).toBeDefined();
    expect(SOCKET.SERVER_TO_CLIENT).toBeDefined();
  });
});
