/**
 * God-mode event parity (audit WEB-032 / WEB-034).
 *
 * `ChatSession.runGod` (packages/backend/src/chat-session.js) is the producer
 * behind the web's own god mode (`chat:send {mode:'god'}`). It forwards CLI bus
 * events under two maps:
 *
 *   godEventMap  → subagent:* / wave:* / integration:* / build:* / toast
 *   testEventMap → test:*
 *
 * If the web subscribes to fewer names than the session forwards, the
 * dashboard silently loses that slice of state — exactly what happened when
 * WEB-001 deleted every `subagent:*` listener. This test reads both sides from
 * source and fails on any gap.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOCKET_EVENTS } from '../src/lib/socketEvents';
import chatReducer, { initialState } from '../src/store/chatSlice';
import {
  setSubagentStarted,
  setSubagentStep,
  setSubagentDone,
  setSubagentFailed,
  setSubagentFile,
} from '../src/store/chatSlice';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const sessionPath = join(repoRoot, 'packages', 'backend', 'src', 'chat-session.js');
const hookPath = join(here, '..', 'src', 'hooks', 'useChatSocket.ts');

/** `S2C.SOME_CONST` references in chat-session.js's forwarding maps. */
function forwardedS2C() {
  const src = readFileSync(sessionPath, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/S2C\.([A-Z0-9_]+)/g)) names.add(m[1]);
  return names;
}

/** Every socket name the hook subscribes to, resolving SOCKET_EVENTS.X. */
function subscribedNames() {
  const src = readFileSync(hookPath, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/socket\.on\(\s*'([^']+)'/g)) names.add(m[1]);
  for (const m of src.matchAll(/socket\.on\(SOCKET_EVENTS\.([A-Z0-9_]+)/g)) {
    const value = SOCKET_EVENTS[m[1]];
    if (value) names.add(value);
  }
  return names;
}

describe('ChatSession god-mode forwarding ⇄ web listeners (WEB-032)', () => {
  it('has a web listener for every S2C constant the session forwards', () => {
    const forwarded = forwardedS2C();
    // `S2C` is aliased in chat-session.js (`SERVER_TO_CLIENT`); the constant
    // names are the keys of that map in packages/shared/src/events.js.
    const values = new Map(
      Object.entries(SOCKET_EVENTS).map(([k, v]) => [k, v])
    );
    const subscribed = subscribedNames();

    // Constants the session references that are NOT god/test forwarding
    // (chat turn plumbing) — the web must still listen to all of them.
    const missing = [];
    for (const constName of forwarded) {
      const wire = values.get(constName);
      if (!wire) continue; // constant exists only on the backend side
      if (!subscribed.has(wire)) missing.push(`${constName} → ${wire}`);
    }
    expect(
      missing,
      `chat-session.js can forward these events but useChatSocket never listens:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  it('subscribes to the legacy subagent vocabulary that the session forwards', () => {
    const subscribed = subscribedNames();
    for (const name of [
      'subagent:created',
      'subagent:assigned',
      'subagent:started',
      'subagent:step',
      'subagent:done',
      'subagent:failed',
      'subagent:file',
      'subagent:needs_review',
      'subagent:tool_call',
      'subagent:tool_result',
    ]) {
      expect(subscribed.has(name), `missing listener for ${name}`).toBe(true);
    }
  });

  it('keeps the env-vector test-mode events subscribed too', () => {
    const subscribed = subscribedNames();
    for (const name of [
      'test:started',
      'test:inventory',
      'test:feature:start',
      'test:step',
      'test:step:failed',
      'test:diagnosis',
      'test:feature:done',
      'test:traditional',
      'test:done',
    ]) {
      expect(subscribed.has(name), `missing listener for ${name}`).toBe(true);
    }
  });
});

describe('subagent reducers survive out-of-order / replayed events (WEB-034)', () => {
  const fresh = () => structuredClone(initialState);

  it('creates the row when `step` arrives before `started`', () => {
    const state = chatReducer(
      fresh(),
      setSubagentStep({ todoId: 't9', domain: 'backend', message: 'thinking (step 1/12)' })
    );
    expect(state.subagents.t9).toBeTruthy();
    expect(state.subagents.t9.message).toBe('thinking (step 1/12)');
    expect(state.subagents.t9.status).toBe('pending');
  });

  it('records done/failed/file even without a prior started event', () => {
    let state = chatReducer(fresh(), setSubagentFile({ todoId: 't1', file: 'src/a.ts' }));
    expect(state.subagents.t1.lastFile).toBe('src/a.ts');
    state = chatReducer(state, setSubagentDone({ todoId: 't1' }));
    expect(state.subagents.t1.status).toBe('done');
    state = chatReducer(state, setSubagentFailed({ todoId: 't2', error: 'boom' }));
    expect(state.subagents.t2.status).toBe('failed');
    expect(state.subagents.t2.error).toBe('boom');
  });

  it('keeps the real wire shape: started carries tokens as { in, out }', () => {
    const state = chatReducer(
      fresh(),
      setSubagentStarted({
        todoId: 't3',
        model: 'poolside/laguna-s-2.1',
        title: 'Build UI',
        domain: 'frontend',
        wave: 1,
        tokens: { in: 0, out: 0 },
        latency: 0,
      })
    );
    expect(state.subagents.t3.status).toBe('running');
    expect(state.subagents.t3.tokens).toEqual({ in: 0, out: 0 });
    expect(state.subagents.t3.model).toBe('poolside/laguna-s-2.1');
    expect(state.subagents.t3.domain).toBe('frontend');
  });

  it('ignores payloads without a todoId instead of creating a ghost row', () => {
    const state = chatReducer(fresh(), setSubagentStep({ message: 'no id' }));
    expect(Object.keys(state.subagents)).toHaveLength(0);
  });
});
