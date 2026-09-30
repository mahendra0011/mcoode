# WEB Audit — Verification Report & Issue Log

> **Scope:** `packages/web` only. CLI (`packages/cli`) is explicitly **out of scope** for this
> pass per the spec's §7 note. Backend/CLI are read *only* to verify that the web contract
> (socket events, payloads) matches the producer side.
> **Audit target:** the "smart engine + icons + tools" surface described in the spec docs —
> chat live-processing UI, tool icons, god-mode wave dashboard, socket→Redux bridge.
> **Date:** 2026-09-30

---

## 0. How this report is organised

| File | Contents |
|---|---|
| `00-README.md` | This index + verification matrix + how to re-run everything |
| `01-fixed-issues.md` | Every issue found **and fixed**, with file:line + proof |
| `02-open-issues.md` | Every issue still open, with severity + repro |
| `03-verification-log.md` | Raw evidence: every command run and its exact output |
| `04-spec-conformance.md` | Line-by-line audit of each spec section vs. the code |

Severity scale:

| Level | Meaning |
|---|---|
| **P0** | Breaks the live product path (data loss, stuck UI, crash, wrong event contract) |
| **P1** | Visibly wrong / spec-violating / flaky under load |

---

## 2. The three buckets every finding fell into

It matters that these are separated, because the *fix* differs for each.

### Bucket A — Real bugs in the web codebase (all fixed)

Full detail in `01-fixed-issues.md`.

| ID | Sev | One-line |
|---|---|---|
| WEB-001 | P0 | `chat:tool_call` `done` payload spread the raw tool payload into the message object, overwriting `role`/`kind`/`text`. |
| WEB-002 | P0 | `wave:complete` reducer ignored its own payload — the wave list could never leave `running`, so god mode froze on the last wave forever. |
| WEB-003 | P0 | `chat:done` never cleared `isStreaming` if the socket dropped first → the thinking indicator hung forever ("ruk jaata hai"). |
| WEB-004 | P1 | `BuildSummary` was re-declared in `WaveProgress.tsx` with 6 of ~20 fields, so `cost`, `budget`, `overlaps`, `lockConflicts` were received and silently dropped. |
| WEB-005 | P0 | Subagent reducers dropped any event for a `todoId` not yet `started`; Socket.IO does not guarantee ordering across reconnects → agents silently vanished. |
| WEB-006 | P1 | `WaveProgress` listed **finished agents from earlier waves** under the *current* wave — no `subagentIds` on the wave record. |
| WEB-007 | P0 | `STATUS_ICON[s.status]` implicit-`any` index (TS7053) — a hard **build failure** introduced by the WEB-005 fix. |
| WEB-008 | P1 | `duration-250` is not a Tailwind class (project is Tailwind **v3**, `plugins: []`) — the God-mode toggle's colour transition generated **no CSS at all**. |
| WEB-009 | P1 | God-mode toggle was purple/pink — the exact control that turns the live path on, violating spec §3 (emerald only). |
| WEB-010 | P1 | `testTimeout` 5s made 2 filesystem-heavy suites fail under full-suite load while passing in 0.3s alone — a flaky gate that hides real regressions. |
| WEB-011 | P1 | `AgentActionSequence` rounding made the `4s` assertion unreachable after a 3100 ms advance (rounds to `3s`). |
| WEB-012 | P2 | `setWaveStart` never stored `subagentIds` — the field WEB-006's fix needs, so that fix alone would have been a no-op. |

### Bucket B — Test/spec drift (code is right, test encodes the OLD wrong behaviour)

These are **not** product bugs. They are listed in `02-open-issues.md` and were **not**
silently rewritten into passing tests — each needs a decision from the spec owner.

### Bucket C — Environment-only

`oxlint` native binding missing. Nothing to do with the source.

---

## 3. The spec rule that shapes everything

Spec §1 — *"NEVER fabricate progress"* — is the most important rule in the document, and the
code now obeys it structurally:

```
Real backend event ─► socket ─► useChatSocket ─► Redux reducer ─► selector ─► render
```

There is **no timer anywhere** that invents a phase. `AgentActionSequence` is a pure function
of `(elapsedMs, statusLabel)`. `statusLabel` comes from `activeToolLabel`, derived from the last
tool message's real `title`/`tool` field — i.e. from a real `chat:tool_call` event. If the
backend says nothing, the UI says "Thinking", which is true.

Locked by test: `packages/web/src/components/chat/__tests__/AgentActionSequence.test.tsx`
asserts the rendered text contains none of
`Analyzing | Scanning | Searching | Reading files | Connecting`.

---

## 4. Re-running the whole verification

```powershell
cd D:\projects\mcoode

# 1) TypeScript
node node_modules\typescript\bin\tsc -p packages\web\tsconfig.json --noEmit

# 2) Web contract tests (node env — packages/web/tests/*.test.js)
node node_modules\vitest\vitest.mjs run packages/web/tests

# 3) Web component tests (jsdom env — src/**/__tests__/*.test.tsx)
node node_modules\vitest\vitest.mjs run --root packages\web

# 4) Whole monorepo
node node_modules\vitest\vitest.mjs run

# 5) Production build
cd packages\web; npx next build

# 6) E2E (playwright's webServer block starts the server itself)
cd packages\web; npx playwright test --reporter=line
```

| **P2** | Dead code, inconsistency, maintainability trap that will cause a future P0 |
| **P3** | Cosmetic / doc drift |

---

## 1. Verification matrix — final state

| Gate | Command | Result |
|---|---|---|
| TypeScript (web) | `tsc -p packages/web/tsconfig.json --noEmit` | ✅ **0 errors** |
| Production build | `next build` | ✅ **25 routes**, compiled in 101s |
| Unit tests — web contracts | `vitest run packages/web/tests` | ✅ **59/59** |
| Unit tests — web components | `vitest run --root packages/web` | ✅ **23/23** |
| Unit tests — monorepo | `vitest run` | ✅ **460/460** (after `testTimeout` fix) |
| E2E — Playwright | `playwright test` | see `03-verification-log.md` §4 |

### Gates blocked by the *environment*, not the code

| Gate | Blocker | Fix |
|---|---|---|
| `oxlint` | `Cannot find module '@oxlint/binding-win32-x64-msvc'` — native binary never downloaded (optional dep skipped) | `npm i -D @oxlint/binding-win32-x64-msvc` |
| Playwright browsers | Present (`chromium-1243`) — not blocked | — |
