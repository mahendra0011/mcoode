# 01 — Fixed Issues

Every entry below was reproduced against the real code, fixed in the real source, and
re-verified. Each has a **Proof** line naming the gate that now proves it.

---

## WEB-001 · P0 · `chat:tool_call` done-payload clobbered the whole message object

**File:** `packages/web/src/store/chatSlice.ts` — reducer reached from `toolCallStarted` /
`agentMessage` (`packages/web/src/hooks/useChatSocket.ts`)

### Symptom
When the CLI emitted `chat:tool_call` with `status: 'done'`, the reducer matched the existing
card by `replaceKey` and replaced it with:

```js
state.messages[i] = { ...state.messages[i], ...sanitizedPayload, id: payload.replaceKey };
```

`...sanitizedPayload` is the **raw socket payload**, typed `any`. Two concrete failure modes:

1. Any key present with an `undefined`/`null` value **overwrote** the good value on the
   message (e.g. a payload carrying `text: undefined` blanked the card's rendered text).
2. Because `useChatSocket` forwards the payload verbatim, a backend field named `role`,
   `kind`, `blocks` or `searchResults` would replace the message's structural fields and the
   card would render as a plain message — no icon, no accordion, no spinner. The tool UI
   simply disappears mid-run.

### Root cause
Structural fields and payload fields were merged into one object with no allow-list and no
type boundary. The socket payload is `any` all the way down.

### Fix
Sanitise args before they reach state (`sanitizeToolArgs`, which already existed) **and**
merge only the fields the message schema actually declares, instead of a blanket spread. The
merge is now explicit, so a new backend field can no longer silently clobber structure.

**Proof:** `packages/web/tests/socket-contract.test.js` (event↔reducer parity),
`packages/web/tests/god-mode-event-parity.test.js`, and `vitest run packages/web/tests` 59/59.

---

## WEB-002 · P0 · `wave:complete` reducer ignored its own payload

**File:** `packages/web/src/store/chatSlice.ts` — `setWaveComplete`

### Symptom
The god-mode wave list never left the `running` state. Every wave kept its `bg-emerald-400`
active bar and its "live subagents" list forever. Combined with WEB-006 (finished agents from
earlier waves still shown), the last wave displayed a permanently spinner-looking row of
already-completed agents.

### Root cause
The reducer took the action payload but re-derived everything from local state and ignored
`wave` / `totalWaves`, so the `status` flip to `'complete'` never reached the specific wave
the payload named.

### Fix
The reducer now resolves the wave by its real `wave` number from the payload and writes the
terminal status onto that entry, instead of assuming "the last one".

**Proof:** `packages/web/tests/wave-payload.test.js` (7 tests) drives `wave:start` →
`wave:complete` through the real reducer and asserts the transition.

---

## WEB-003 · P0 · `chat:done` left `isStreaming` stuck when the socket dropped first

**File:** `packages/web/src/hooks/useChatSocket.ts`

### Symptom
The exact "ruk jaata hai" (looks stuck) failure from the spec. If the socket disconnected
*while a turn was in flight* and `chat:done` never arrived, `isStreaming` stayed `true`
forever, so `showThinkingIndicator` stayed `true` forever — a permanent "Thinking … Ns"
counter under a composer that looked disabled.

### Fix
Two-part:
- A disconnect path that clears the in-flight flags so the UI stops pretending a turn is
  alive, **without** discarding message history.
- A `streamInterrupted` derived flag (`isStreaming && connectionState !== 'connected'`) that
  renders an explicit `StreamInterruptedNotice`, so "the connection dropped" is *shown*
  rather than silently swallowed. This respects spec §1: the UI states what it actually knows.

**Proof:** `packages/web/tests/socket-contract.test.js` asserts the disconnect + `chat:done`
ordering; `StreamInterruptedNotice` is rendered in both the Chat and IDE composers.

---

## WEB-004 · P1 · `BuildSummary` re-declared locally → 14 payload fields silently dropped

**File:** `packages/web/src/components/ide/WaveProgress.tsx`

### Symptom
The CLI's `build:complete` payload carries ~20 fields. `chatSlice.setBuildComplete` stored
them correctly, but `WaveProgress` declared its **own** local `BuildSummary` interface with
6 fields and imported nothing from the store. So `spendUsd`, `budget`, `overlaps`,
`lockConflicts`, `emptyFileTodos` and token counts arrived at the browser and were thrown
away at the type boundary. A build **aborted on budget** rendered exactly like a clean success.

---

## WEB-005 · P0 · Subagent events dropped for `todoId`s not yet seen

**File:** `packages/web/src/store/chatSlice.ts`

### Symptom
Every subagent reducer was guarded like this:

```js
if (p.todoId && state.subagents[p.todoId]) { /* mutate */ }
```

Events arrive in bursts and **can be re-ordered or replayed after a socket reconnect**. If
`subagent:step` / `subagent:done` / `subagent:file` landed before `subagent:started`, the
event was silently discarded. Subagents vanish from the wave dashboard, and a completed agent
can stay stuck in `running` forever.

### Fix
Introduced `ensureSubagent(state, payload)`, which **creates the row on first sight** and
returns `null` only when the payload has no `todoId` at all. Every subagent reducer now goes
through it, so out-of-order delivery is survivable.

**Proof:** `packages/web/tests/god-mode-event-parity.test.js`; the `WaveProgress` union type
now includes `assigned` and `needs_review` because the reducer can genuinely produce them.

---

## WEB-006 · P1 · Wave dashboard listed finished agents from *earlier* waves

**File:** `packages/web/src/components/ide/WaveProgress.tsx`

### Symptom
The "live subagents in this wave" list filtered only on `status === 'running' || 'done'`.
Since `done` agents are kept in the store forever, wave 3's panel listed wave 1 and wave 2's
finished agents as if they belonged to it.

### Fix
Waves now carry `subagentIds` (derived from that wave's real todo list) and the filter is:

```js
const inWave = !w.subagentIds || w.subagentIds.length === 0 ||
               w.subagentIds.includes(String(s.todoId));
return inWave && (s.status === 'running' || s.status === 'done');
```

The `length === 0` escape hatch keeps the panel from going blank if the producer omits the
field (older CLI), rather than hiding everything.

**Proof:** `packages/web/tests/wave-payload.test.js`.

---

## WEB-007 · P0 · `STATUS_ICON[s.status]` — TS7053 hard build failure

**File:** `packages/web/src/components/ide/WaveProgress.tsx:200`

### Symptom
`tsc --noEmit` failed:

```
error TS7053: Element implicitly has an 'any' type because expression of type
'"assigned" | "done" | "failed" | "needs_review" | "pending" | "running"'
can't be used to index type '{ done: Element; failed: Element; running: Element;
pending: Element; needs_review: Element; }'.
  Property 'assigned' does not exist on type ...
```

### Root cause
Direct consequence of WEB-005: making `Subagent['status']` honest added `assigned`, but the
icon map had no key for it. The `?? STATUS_ICON.pending` fallback was there to handle exactly
this, but TypeScript still rejects the index expression — a fallback does not widen a key type.

### Fix
The map is typed against the **full** union and carries an explicit `assigned` entry:

```ts
const STATUS_ICON: Record<Subagent['status'], React.ReactElement> = {
  done, failed, running, pending,
  assigned:     <Clock className="w-3.5 h-3.5 text-white/40" />,
  needs_review: <Clock className="w-3.5 h-3.5 text-amber-400" />,
};
```

Adding a new status to the store is now a **compile error** until the icon exists — the trap
is closed rather than papered over.

**Proof:** `tsc -p packages/web/tsconfig.json --noEmit` → **0 errors**; `next build` → success.

---

## WEB-008 · P1 · `duration-250` generated no CSS at all

**File:** `packages/web/src/components/chat/mcodeUX.tsx` (`GodModeToggle`)

### Symptom
`duration-250` is not in Tailwind's default duration scale (`75/100/150/200/300/500/700/1000`).
The project is Tailwind **v3** with `plugins: []`, so the class emitted **nothing** — the
God-mode toggle's colour transition did not animate at all, it just snapped.

### Fix
Changed to the spec's `duration-200` (0.2 s enter timing).
`packages/web/tests/no-dead-utilities.test.js` now fails CI on any non-default
`duration-*` / `delay-*` token, so this cannot come back.

**Proof:** `no-dead-utilities.test.js` in the 59/59 contract suite; a repo-wide scan for
non-default `duration-*` now returns **zero** hits (only the comment documenting the bug).


### Root cause
Duplicated type declaration. TypeScript could not complain, because both declarations were
individually "correct" — the lie was structural.

### Fix
`BuildSummary` is now declared **once**, in `chatSlice.ts`, and `WaveProgress` does
`export type { BuildSummary } from '../../store/chatSlice'`. A field the CLI sends can no
longer be dropped without breaking the import.

**Proof:** TypeScript compiles clean; the re-export is now the only source of the type.
