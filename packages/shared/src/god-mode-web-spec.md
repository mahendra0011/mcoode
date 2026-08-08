# Spec: Connect God-Mode Parallel Subagents To Web Chat

## Goal

Bring the CLI's `SubagentManager` (parallel, wave-based, DAG-driven subagent execution) into the web chat flow (`ChatSession.runAgent()`), so the web IDE shows the same multi-agent progress, waves, integration tests, and bugfix rounds that the CLI provides.

## 5 Integration Gaps (verified by parallel subagent investigation)

The investigation identified five compounding gaps between `SubagentManager` and the web socket layer:

### Gap A — SubagentManager never imported/instantiated
`ChatSession.runAgent()` imports only `ChatAgent` and `Planner`. `SubagentManager` appears nowhere in `packages/backend/src/`.

### Gap B — No `mode: 'god'` branch in `chat:send`
`sockets.js:166` destructures `{ prompt, mode = 'chat' }` then dispatches only to `runAgent`/`runChat`. There is no god-mode branch. `SESSION_MODES.GOD` exists in events.js but is never routed to.

### Gap C — Missing dependencies for SubagentManager construction
`ChatSession` needs:
- **`options.ledger`** — created inline at `chat-session.js:62` for `ModelRouter` but never stored on `this`. Must add `this.ledger = new CostLedger()`.
- **`config`** — must merge with `DEFAULT_CONFIG` (like `orchestrator.js:217` does: `{ ...DEFAULT_CONFIG, ...this.config, auditLog })`. Currently `this.config` only has `{ chatAgentTurns, allowShellAll, requireEditApproval }`.
- **`options.undoStack`** — available as `this.undoStack` ✅
- **`options.forceRef`** — available as `this.modelRef` ✅

### Gap D — No bus listeners for subagent events
`ChatSession.start()` (lines 113-145) registers listeners for only `EVENTS.MESSAGE`, `SUBAGENT_SHELL_OUTPUT`, `permission:always_granted`, and `PERMISSION_ANSWER`. It listens for **none** of: `SUBAGENT_CREATED`, `SUBAGENT_ASSIGNED`, `SUBAGENT_STARTED`, `SUBAGENT_STEP`, `SUBAGENT_TOOL_CALL`, `SUBAGENT_TOOL_RESULT`, `SUBAGENT_DONE`, `SUBAGENT_FAILED`, `SUBAGENT_NEEDS_REVIEW`, `WAVE_START`, `WAVE_COMPLETE`, `INTEGRATION_PASS`, `BUILD_COMPLETE`, `TOAST`, `HOOK_EXECUTED`. Events emitted on `this.bus` are silently dropped.

### Gap E — No S2C socket events for parallel-mode progress
`SOCKET.SERVER_TO_CLIENT` has only chat-mode events. The CLI→server forwarding works because the CLI has its own socket.io-client connection emitting C2S events that the backend re-broadcasts via `io.emit`. But web chat runs in-process in the backend — no `forwardToBackend`/`EVENT_TO_SOCKET` translation exists. Need to either add S2C events or emit directly to the authenticated `socket`.

## Implementation Priority (per subagent findings)

## Architecture Overview

```
Current (web) flow:
  ChatSession.runAgent()
    → Planner.plan()                    [single plan]
    → ChatAgent.run(prompt)             [single agent, sequential]
    → emit CHAT_TOOL_CALL/TODO_UPDATE   [frontend renders step cards]

Target (web) flow:
  ChatSession.runAgent()
    → Planner.plan()                    [single plan]
    → if godMode enabled:
        SubagentManager.runAll()        [parallel agents, waves]
        emit SUBAGENT_* events          [frontend renders multi-lane progress]
      else:
        ChatAgent.run(prompt)           [single agent — fallback]
    → emit CHAT_DONE
```

## Implementation Priority (per subagent findings)

1. **Fix `chat-agent.js` `always` permission persistence** (already done ✅ — verified at `chat-agent.js:472-474`)
2. **Gap D first** — Add bus listeners for subagent events (needed before SubagentManager can forward anything)
3. **Gap C** — Store `this.ledger` at init, merge config with `DEFAULT_CONFIG`
4. **Gap A+B** — Import SubagentManager, add `mode: 'god'` branch in `chat:send`
5. **Gap E** — Add S2C socket events for subagent progress
6. **Frontend** — Multi-lane `WaveProgress.jsx` component, god-mode toggle

## Phase 1 — Shared: New Socket Events

**File:** `packages/shared/src/events.js`

Add to `SOCKET.SERVER_TO_CLIENT`:
```js
SUBAGENT_CREATED: 'subagent:created',
SUBAGENT_STATUS: 'subagent:status',       // running/done/failed/needs_review
SUBAGENT_OUTPUT: 'subagent:output',       // shell/tool output stream
SUBAGENT_FILE: 'subagent:file',           // files written
WAVE_START: 'wave:start',
WAVE_COMPLETE: 'wave:complete',
BUILD_SUMMARY: 'build:summary',
```

Add to `SOCKET.CLIENT_TO_SERVER`:
```js
CHAT_SET_MODE: 'chat:set_mode',  // toggle between 'agent' (single) and 'god' (parallel)
```

## Phase 2 — Backend: ChatSession Integration

**File:** `packages/backend/src/chat-session.js`

### 2a. Import SubagentManager

Add to the dynamic imports in `runAgent()`:
```js
const { SubagentManager } = await import('mcode-cli/subagent-manager');
```

### 2b. Read godModeDefaults

The config is already loaded at line 86-88. Add a flag check:
```js
const godModeEnabled = this.config.godModeDefaults?.enabled !== false  // default true
  && this.config.godModeDefaults?.concurrency > 1;
```

### 2c. Branch logic in `runAgent()`

After `planner.plan()` (line 228-233), branch based on god-mode:

```js
if (godModeEnabled) {
  await this.runGodMode(plan, prompt);
} else {
  await this.runSingleAgent(plan, prompt);  // existing ChatAgent path
}
```

### 2d. New method: `runGodMode()`

```js
async runGodMode(plan, prompt) {
  // Emit plan to frontend for todo card population
  this.onEvent(S2C.CHAT_TODO_PLAN, {
    todos: plan.todos,
    summary: plan.summary,
    mode: 'god'  // signals frontend to show wave/multi-agent view
  });

  const manager = new SubagentManager({
    plan,
    router: this.router,
    projectPath: this.workspacePath,
    config: { ...this.config, ...this.config.godModeDefaults },
    bus: this.bus,          // same bus — reuses existing event forwarding
    options: {
      ledger: this.router?.ledger,
      undoStack: this.undoStack,
      forceRef: this.modelRef,
    }
  });

  // Wire SubagentManager events to socket events
  this.bus.on(EVENTS.SUBAGENT_CREATED, (p) =>
    this.onEvent(S2C.SUBAGENT_CREATED, p));
  this.bus.on(EVENTS.SUBAGENT_STARTED, (p) =>
    this.onEvent(S2C.SUBAGENT_STATUS, { ...p, status: 'running' }));
  this.bus.on(EVENTS.SUBAGENT_DONE, (p) =>
    this.onEvent(S2C.SUBAGENT_STATUS, { ...p, status: 'done' }));
  this.bus.on(EVENTS.SUBAGENT_FAILED, (p) =>
    this.onEvent(S2C.SUBAGENT_STATUS, { ...p, status: 'failed' }));
  this.bus.on(EVENTS.SUBAGENT_NEEDS_REVIEW, (p) =>
    this.onEvent(S2C.SUBAGENT_STATUS, { ...p, status: 'needs_review' }));
  this.bus.on(EVENTS.SUBAGENT_TOOL_CALL, (p) =>
    this.onEvent(S2C.SUBAGENT_OUTPUT, p));
  this.bus.on(EVENTS.SUBAGENT_FILE, (p) =>
    this.onEvent(S2C.SUBAGENT_FILE, p));
  this.bus.on(EVENTS.WAVE_START, (p) =>
    this.onEvent(S2C.WAVE_START, p));
  this.bus.on(EVENTS.WAVE_COMPLETE, (p) =>
    this.onEvent(S2C.WAVE_COMPLETE, p));

  // Run all waves to completion
  const results = await manager.runAll();

  // Emit final build summary
  this.onEvent(S2C.BUILD_SUMMARY, results);
  this.onEvent(S2C.CHAT_DONE, {
    text: results.summary,
    turns: 0,  // god-mode doesn't use turns
    mode: 'god',
    results
  });

  // Clean up listeners
  this.bus.removeAllListeners(EVENTS.SUBAGENT_CREATED);
  this.bus.removeAllListeners(EVENTS.SUBAGENT_DONE);
  // ... etc for all wired events
}
```

### 2e. Wire `SUBAGENT_SHELL_OUTPUT`

The orphan listener at line 129 already exists — wire it properly:
```js
this.bus.on('SUBAGENT_SHELL_OUTPUT', (payload) => {
  this.onEvent(S2C.SUBAGENT_OUTPUT, payload);
});
```

## Phase 3 — Frontend: Multi-Lane Subagent UI

**Files:** `packages/web/src/store/chatSlice.js`, `packages/web/src/pages/AIChatPage.jsx`, `packages/web/src/components/ide/`

### 3a. Redux — Extend chatSlice

Add state:
```js
buildMode: 'agent',     // 'agent' | 'god'
waves: [],              // [{ wave: 1, totalWaves: 3, todos: [...] }]
subagents: {},          // { todoId: { status, model, title, domain } }
buildResult: null,
```

Add reducers:
- `setBuildMode('agent' | 'god')`
- `subagentCreated({ todoId, title, domain })`
- `subagentStatus({ todoId, status })`
- `waveStart({ wave, totalWaves, todos })`
- `waveComplete({ wave, totalWaves, todos })`
- `buildSummary(result)`

### 3b. Socket client — Listen for new events

In `useChatSocket.js`, add listeners:
```js
socket.on('subagent:created', (p) => dispatch(chatActions.subagentCreated(p)));
socket.on('subagent:status', (p) => dispatch(chatActions.subagentStatus(p)));
socket.on('wave:start', (p) => dispatch(chatActions.waveStart(p)));
socket.on('wave:complete', (p) => dispatch(chatActions.waveComplete(p)));
socket.on('build:summary', (p) => dispatch(chatActions.buildSummary(p)));
```

### 3c. UI — God-mode toggle in AIChatPage

Add a toggle button in agent mode:
```jsx
<button onClick={() => dispatch(setBuildMode(buildMode === 'agent' ? 'god' : 'agent'))}>
  {buildMode === 'agent' ? '⚡ God Mode' : '⚡ Single Agent'}
</button>
```

### 3d. UI — Multi-lane wave visualization

New component `WaveProgress.jsx`:
- Vertical lane per wave (Wave 1 → Wave 2 → ... → Integration)
- Each lane shows subagent cards horizontally
- Card shows: todo title, domain, assigned model, status badge (pending/running/done/failed)
- Running cards show live shell output
- Completed cards show file diff links

### 3e. Wire TodoCard to subagent statuses

When `buildMode === 'god'`:
- `TodoCard` items use `subagent.status` instead of local `replaceKey` tracking
- Wave header shows "Wave 1/3 — 2 running, 3 done"
- Each todo card can show the subagent's model assignment

## Phase 4 — Planner Intelligence

### 4a. Skip planning for trivial requests

`chat-session.js:228` — add a complexity heuristic:
```js
// If the prompt is clearly a single-file operation, skip the planning LLM call
const isTrivial = prompt.length < 100 && /fix|change|edit|update|typo|rename/i.test(prompt);
if (isTrivial && mode !== 'god') {
  plan = { todos: [{ id: 'quick', title: prompt, description: '', domain: 'backend', files: [] }], summary: prompt };
} else {
  plan = await planner.plan(prompt, { repoContext: '' });
}
```

## Phase 5 — Testing

- **Unit:** Mock `SubagentManager` → verify `S2C.*` events fired in correct sequence
- **Socket:** Emit `chat:send` with `mode: 'god'` → verify `subagent:*` events forwarded
- **Integration:** Full god-mode run in test workspace → verify `build:summary` payload
- **Frontend:** Verify multi-lane UI renders waves correctly
- **Config:** Verify `godModeDefaults.concurrency` from SettingsPage is actually used

## Rollback Plan

If god-mode causes issues, users can:
1. Toggle back to "Single Agent" mode in the UI (falls back to ChatAgent)
2. SettingsPage "God-Mode Build Defaults" → set concurrency to 1 (auto-disables)
3. Backend config override: `GOD_MODE_ENABLED=false` env var

## Files To Touch

| File | Change |
|---|---|
| `packages/shared/src/events.js` | Add S2C/C2S socket events |
| `packages/backend/src/chat-session.js` | Import SubagentManager, add `runGodMode()`, wire events, add planner heuristic |
| `packages/backend/src/sockets.js` | Forward subagent events to connected web clients (optional, if SubagentManager emits on bus) |
| `packages/web/src/store/chatSlice.js` | Add god-mode state + reducers |
| `packages/web/src/hooks/useChatSocket.js` | Add subagent event listeners |
| `packages/web/src/pages/AIChatPage.jsx` | Add god-mode toggle |
| `packages/web/src/components/ide/WaveProgress.jsx` | **New** — multi-lane visualization |
| `packages/web/src/components/ide/TodoCard.jsx` | Wire to subagent status when in god mode |
