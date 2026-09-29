/**
 * Socket contract guard (audit finding WEB-001).
 *
 * WEB-001 was a P0 that 60+ Playwright specs could not catch: `useChatSocket`
 * subscribed to `subagent:*` while the CLI→backend relay only ever emits
 * `agent:*`, so ten handlers, ten reducers and the whole god-mode progress UI
 * were unreachable. The names *looked* right because `packages/shared/src/events.js`
 * also declares an unused `subagent:*` family under `SOCKET.CLIENT_TO_SERVER`.
 *
 * This test makes that class of drift fail CI instead:
 *   1. every `socket.on('<name>')` / `socket.off('<name>')` literal in
 *      packages/web/src must be a name the backend can actually emit;
 *   2. the web's own SOCKET_EVENTS map must be exactly the set the relay maps
 *      god-mode events to (`EVENT_TO_SOCKET`), so a rename in shared breaks here.
 *
 * Run with the repo root: `npx vitest run packages/web/tests/socket-contract.test.js`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENT_TO_SOCKET } from '../../shared/src/events.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const webSrc = join(here, '..', 'src');
const webRoot = join(here, '..');

/**
 * Names the backend can actually put on the wire. Three sources, in order:
 *   1. `EVENT_TO_SOCKET` — the CLI→backend relay (`packages/shared/src/events.js`).
 *   2. every `emit('<name>' …)` literal in `packages/backend/src`.
 *   3. socket.io's own connection events.
 * Anything the web subscribes to that is in none of these can never fire.
 */
const repoRoot = join(here, '..', '..', '..');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Every string literal passed to socket.on(...) / socket.off(...) in the web app. */
function socketLiterals() {
  const found = new Map(); // name -> Set of "file:line"
  for (const file of walk(webSrc)) {
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      const m = line.match(/socket\.(?:on|off|once)\(\s*'([^']+)'/);
      if (m) {
        if (!found.has(m[1])) found.set(m[1], new Set());
        found.get(m[1]).add(`${relative(webRoot, file)}:${i + 1}`);
      }
    });
  }
  return found;
}

/**
 * Every event name the backend can put on the wire:
 *  - `emit('<name>', …)` literals, and
 *  - the explicit `for (const event of [ … ])` relay allow-lists in sockets.js
 *    (these are forwarded verbatim with `io.emit(event, payload)`).
 */
function backendEmits() {
  const names = new Set();
  for (const file of walk(join(repoRoot, 'packages', 'backend', 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\.emit\(\s*'([^']+)'/g)) names.add(m[1]);
    for (const block of src.matchAll(/for\s*\(\s*const\s+\w+\s+of\s*\[([^\]]+)\]/g)) {
      for (const m of block[1].matchAll(/'([^']+)'/g)) names.add(m[1]);
    }
  }
  return names;
}

/**
 * Every event name declared anywhere in the shared contract
 * (`packages/shared/src/events.js`) — the registry (`SOCKET`), the server→client
 * map (`S2C`/`SERVER_TO_CLIENT`), the relay table, etc. The backend forwards
 * these constants to the socket layer, so they are the names a client can
 * legitimately receive. (WEB-001's dead `subagent:*` family is declared there
 * too, which is exactly why test #2 exists as a separate, stricter assertion.)
 */
function sharedRegistry() {
  const src = readFileSync(join(repoRoot, 'packages', 'shared', 'src', 'events.js'), 'utf8');
  return new Set([...src.matchAll(/'([a-z][a-z0-9]*(?::[a-z0-9_-]+)+)'/g)].map((m) => m[1]));
}

/** Names the web legitimately subscribes to but that are not app events. */
const SOCKET_BUILTINS = new Set(['connect', 'disconnect', 'connect_error', 'reconnect', 'error']);

/**
 * KNOWN-UNWIRED events — audit finding WEB-031.
 *
 * These 12 listeners exist in the web app but **nothing anywhere in the repo
 * emits them**: not the backend relay allow-lists in `sockets.js`, not
 * `packages/shared/src/events.js`, not the CLI, not the docs. They are the whole
 * "Web God Mode (Phases 0-11)" surface — prompt enhancement, clarify questions,
 * codebase reading, role assignment, model comparison, the Playwright audit and
 * `tests:generated`. Every reducer, panel and badge behind them is unreachable.
 *
 * They are listed here (rather than deleted) because the reducers/panels are
 * substantial and may be about to be wired up. The list is self-maintaining:
 * wire one up → the "still unwired" assertion below fails → remove it from here.
 * Add a new dead name without adding it here → the drift test fails.
 */
const KNOWN_UNWIRED = new Set([
  'tests:generated',
  'prompt:enhancing',
  'prompt:enhanced',
  'clarify:ask',
  'codebase:reading',
  'codebase:read-complete',
  'roles:assigned',
  'comparison:update',
  'playwright:start',
  'playwright:issue',
  'playwright:pass-complete',
  'playwright:done',
]);

describe('web ⇄ backend socket contract', () => {
  const emitted = new Set(Object.values(EVENT_TO_SOCKET));
  const canArrive = new Set([...emitted, ...sharedRegistry(), ...backendEmits(), ...SOCKET_BUILTINS]);

  it('subscribes only to events the backend can emit', () => {
    const unknown = [];
    for (const [name, sites] of socketLiterals()) {
      if (canArrive.has(name) || KNOWN_UNWIRED.has(name)) continue;
      unknown.push(`${name}  (${[...sites].join(', ')})`);
    }
    expect(unknown, `unreachable socket subscriptions:\n${unknown.join('\n')}`).toEqual([]);
  });

  it('still reports every KNOWN_UNWIRED event as unwired (WEB-031)', () => {
    const nowWired = [...KNOWN_UNWIRED].filter((n) => canArrive.has(n));
    expect(
      nowWired,
      `these are wired up now — remove them from KNOWN_UNWIRED in this file:\n${nowWired.join('\n')}`
    ).toEqual([]);
  });

  it('lists every unreachable subscription in KNOWN_UNWIRED', () => {
    const actuallyUnwired = [...socketLiterals().keys()].filter(
      (n) => !canArrive.has(n) && !SOCKET_BUILTINS.has(n)
    );
    const undeclared = actuallyUnwired.filter((n) => !KNOWN_UNWIRED.has(n));
    expect(
      undeclared,
      `newly dead listeners — add them to KNOWN_UNWIRED (and to the WEB-031 doc) or wire them:\n${undeclared.join('\n')}`
    ).toEqual([]);
  });

  it('never subscribes to the dead `subagent:*` namespace', () => {
    const dead = [...socketLiterals().keys()].filter((n) => n.startsWith('subagent:'));
    expect(dead, 'nothing emits `subagent:*` — use the canonical `agent:*` names').toEqual([]);
  });

  it('uses exactly the relay god-mode event names', () => {
    const web = readFileSync(join(webSrc, 'lib', 'socketEvents.ts'), 'utf8');
    const godMode = [...emitted].filter((n) => /^(agent|wave|integration|build):/.test(n)).sort();
    for (const name of godMode) {
      expect(web, `${name} is emitted by the relay but missing from lib/socketEvents.ts`).toContain(
        `'${name}'`
      );
    }
    // …and every god-mode name the web declares must really be emitted.
    for (const m of web.matchAll(/^\s*(AGENT|WAVE|INTEGRATION|BUILD)_\w+:\s*'([^']+)'/gm)) {
      expect(emitted.has(m[2]), `lib/socketEvents.ts declares ${m[2]}, which the relay never emits`).toBe(true);
    }
  });
});
