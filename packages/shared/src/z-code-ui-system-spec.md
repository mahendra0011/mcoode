# Z Code — Complete UI System Design

> **Monorepo:** npm workspaces — `packages/cli`, `packages/backend`, `packages/web`, `packages/shared`
> **CLI framework:** `@opentui/core` + `@opentui/react` (React-for-terminal, NOT ink.js)
> **Web framework:** React 19 + Framer Motion + Redux Toolkit + Socket.IO
> **Last updated:** 2026-08-09

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [The Workflow Pipeline](#2-the-workflow-pipeline)
   - Read → Edit → Explore → Search → Run → Diff → Review → Context
3. [CLI Terminal UI](#3-cli-terminal-ui)
   - Layout, components, theme system, animation system
4. [Web IDE UI](#4-web-ide-ui)
   - Layout, components, state management, animations
5. [Shared Backend Infrastructure](#5-shared-backend-infrastructure)
   - tools.js, chat-agent.js, chat-session.js, sockets.js
6. [Modes & Execution Engines](#6-modes--execution-engines)
   - Quality modes, special UI modes, agent modes, watch mode
7. [God-Mode Parallel Subagent Architecture](#7-god-mode-parallel-subagent-architecture)
8. [Animation Systems Deep-Dive](#8-animation-systems-deep-dive)
   - CLI: useTicker / useEntrance / useAnimatedProgress
   - Web: Framer Motion
9. [Tool-to-UI Mapping Matrix](#9-tool-to-ui-mapping-matrix)
10. [Watch Mode — File Monitoring Daemon](#10-watch-mode--file-monitoring-daemon)
11. [Security & Risk System](#11-security--risk-system)
12. [Auth & API Key Management](#12-auth--api-key-management)
13. [CLI Commands Reference](#13-cli-commands-reference)
14. [Web Pages & Routes](#14-web-pages--routes)
15. [Remaining Fixes (4 Open Bugs)](#15-remaining-fixes-4-open-bugs)

---

## 1. Architecture Overview

### Monorepo Layout

```
packages/
├── cli/          # Terminal UI (opentui React SSR to terminal), agent CLI, orchestrator
├── backend/      # Express + Socket.IO server, ChatSession bridge, auth, DB, tools
├── web/          # React 19 IDE (browser), Redux store, Socket.IO client
└── shared/       # Shared constants: events, socket names, themes, planning helpers
```

### Dual-Surface Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   CLI (TUI)     │    │   Web (Browser)  │
│  @opentui/react │    │  React 19 + FM   │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         │ Socket.IO            │ Socket.IO
         ▼                      ▼
    ┌─────────────────────────────────┐
    │       Backend (Express)         │
    │  ┌─────────────┐  ┌──────────┐ │
    │  │ ChatSession │  │ auth.js  │ │
    │  │ (bridges)   │  │ (JWT)    │ │
    │  └──────┬──────┘  └──────────┘ │
    │         │                      │
    │  ┌──────┴──────┐               │
    │  │ ChatAgent   │ ◄── imports ─│
    │  │ (CLI core)  │  CLI source   │
    │  └──────┬──────┘               │
    │  ┌──────┴──────┐               │
    │  │ ToolExecutor│               │
    │  │ UndoStack   │               │
    │  └─────────────┘               │
    └─────────────────────────────────┘
```

**Key insight:** The backend doesn't reimplement logic. `ChatSession` in `packages/backend/src/chat-session.js` dynamically imports `ChatAgent`, `ToolExecutor`, `UndoStack`, `ModelRouter`, and `getProviders` from `packages/cli/src/core/` via the `@mcode/shared` alias. The CLI binary and the web both reuse the exact same agent logic.

### Data Flow (Single Tool Call)

```
1. User input  ──►  ChatAgent.run(prompt)
2. LLM returns  ──►  ```mcode-action {tool, args}```
3. extractAction()  ──►  ToolExecutor.run(tool, args)
4. Tool executes    ──►  result {ok, content/diffLines/output/lines/image/...}
5. _blockMeta()     ──►  bus.emit(EVENTS.MESSAGE, {kind:'tool', replaceKey, tool, ...meta})
6. Bus listener     ──►  onEvent(S2C.CHAT_MESSAGE, msg) → socket.emit()
7. Client           ──►  Redux dispatch(agentMessage(msg)) → StepCard renders
```

### Message Kinds (shared across CLI MainPane + Web chatSlice)

| Kind | Description | CLI Render | Web Render |
|------|-------------|------------|------------|
| `user` | User prompt echo | User box with `│` gutter | Right-aligned rounded box |
| `assistant` | LLM text reply (post-tools) | Text + optional thought block + meta footer | Left-aligned text, streaming caret |
| `tool` | Tool result (running → done/failed) | Dispatch by `msg.block` → specific Block component | `<StepCard msg={msg} undo={undo} />` |
| `stream` | Live text streaming chunks | `streamingMessage` text at bottom | Appends to last assistant message, `agentMessage` |
| `todo` | Todo plan list | `<TodoBlock>` | `<TodoCard plan={...} />` |
| `summary` | Change summary (after ≥2 files edited) | `<ChangeSummaryBlock>` | Not rendered as a card (falls through to `msg.text`) |
| `system` | Info/warn messages | Centered `── text ──` | Left-aligned `system` styled |
| `ok` | Success message | `✓ text` green | N/A in web (used as toast) |
| `warn` | Warning message | `⚠ text` amber | N/A |
| `err` | Error message | `✗ text` red | N/A |
| `interrupt` | Generation interrupted | `<InterruptBlock>` | Shown as text |
| `build` | God-mode build summary | `<BuildSummaryCard>` | N/A (god-mode not yet web-connected) |
| `code` | Code snippet output | Expandable `<code>` block | Not explicitly rendered |

---

## 2. The Workflow Pipeline

The Z Code system implements 8 workflow stages. Each maps to a specific tool type, backend handler, and UI component on both surfaces. **This pipeline is identical across all four interaction surfaces** — Chat Mode, Advanced Chat Mode, AI Coding Agent, and CLI. Only the UI presentation changes:
- **Chat Mode:** Terminal output / inline terminal pane
- **Advanced Chat:** VS Code-style split views (FileTree + EditorPane + TerminalPane)
- **AI Coding Agent:** Same as Advanced Chat + god-mode parallel subagents + watch daemon controls
- **CLI:** Native TTY with `@opentui/react` rendering

The underlying ChatAgent → ToolExecutor → bus.emit → Socket.IO → Redux flow is the same everywhere. See Appendix C.5 for the full Surface Interaction Matrix.

### Stage 1: Read (`read_file`)

**Purpose:** Inspect a file before editing it. Enforces "read before write" rule.

```
CLI flow:
  user prompt → ChatAgent.run() → LLM emits ```mcode-action {tool:"read_file"} 
  → ToolExecutor.read_file() → reads file → bus.emit(MESSAGE, {kind:'tool', block:'read'})
  → ChatSession.start() listens → onEvent(CHAT_MESSAGE) → socket to web
  → App.jsx push() updates state → MainPane render dispatches msg.block==='read' → ReadBlock

Web flow:
  user prompt → useChatSocket.send(prompt) → socket.emit('chat:send')
  → sockets.js → session.sendMessage → runAgent → ChatAgent → same backend
  → socket.emit('chat:message') → Redux agentMessage() → add tool message
  → AIChatPage.jsx messages.map() → StepCard with msg.tool==='read_file'
```

**Key parameters:** `path` (required), `line` (optional line range)

**Result format (`_blockMeta` in chat-agent.js:246-256):**
```js
{
  block: 'read',
  path: String,             // absolute path
  lines: String[],          // up to 400 lines, split by \n
  diffLines: [],            // empty for reads
  command: '',              // always empty for reads
  relDir: '',               // always empty for reads
  title: '',                // always empty
  output: ''                // always empty
}
```

**CLI rendering (`MainPane.jsx:166`):**
```jsx
if (msg.block === 'read' || msg.block === 'write') return renderReadWrite(msg, `t${i}`, isFirst);
```
→ `ReadBlock` component (`blocks.jsx:101`)

**Web rendering:** StepCards.jsx:361-363 — included in the `read_file || web_fetch` TerminalViewer condition.

**CLI ReadBlock animation:** Use `useEntrance(display.length, 0.375)` for progressive line reveal (~30ms per line). Flash border (`\u270e` icon green) on mount via `useFlashOnMount()` (400ms timeout).

### Stage 2: Edit (`write_file`, `edit_file`)

**Purpose:** Create or modify files. Every write is bracketed by an `UndoStack.snapshot()`.

```
write_file flow:
  → ToolExecutor.write_file({path, content})   (tools.js:195-227)
  → reads prev content → asks overwrite approval if requireEditApproval
  → undoStack?.snapshot(path, prev)  ← saves prev content for undo
  → writes file
  → emits SUBAGENT_FILE event
  → returns {ok, file, created, diff, diffLines, content}

edit_file flow:
  → ToolExecutor.edit_file({path, old, new})  (tools.js:229-259)
  → reads prev → checks old text exists
  → asks approval if requireEditApproval
  → prev.replace(old, new) → writes
  → undoStack?.snapshot(path, prev)
  → returns {ok, file, diff, diffLines, content}
```

**Tool result (both):**
```js
{
  ok: true,
  file: String (path),
  created: Boolean (write_file only),
  diff: Object (line-diff result),
  diffLines: Array<{kind, oldNo, newNo, text}>,
  content: String (full resulting file content)
}
```

**`_blockMeta` mapping (chat-agent.js:258-283):**
- `write_file` → `block: created ? 'write' : 'edit'`, includes `diffLines`
- `edit_file` → `block: 'edit'`, includes `diffLines`

**⚠️ BUG #18 — Undo reverts wrong file:**
The `undoId` is NOT threaded through. `_blockMeta` for `write_file`/`edit_file` doesn't include `result?.undoId`. `UndoStack.snapshot()` doesn't return an id. `UndoStack.undo()` always pops the last entry. `sockets.js:184` calls `undoStack.undo()` with no args. `useChatSocket.js:287` emits `chat:undo` with no payload.

**Fix chain (8 changes across 5 files):**
1. `tools.js:540` — `snapshot()` generates + returns `id`
2. `tools.js:563` — `undo(id?)` accepts optional id, uses `findIndex` + `splice`
3. `tools.js:214/248` — `write_file`/`edit_file` capture `undoId` from snapshot, include in result
4. `chat-agent.js:258-283` — `_blockMeta` adds `undoId: result?.undoId` to write/edit blocks
5. `StepCards.jsx:404` — `undo?.(msg)` (pass msg with undoId)
6. `useChatSocket.js:287` — `undo(msg)` emits `{undoId: msg?.undoId}`
7. `sockets.js:184` — `undoStack.undo(payload?.undoId)`
8. Backward compatible: CLI callers with no args → LIFO pop

**CLI rendering (`MainPane.jsx:166-167`):**
```jsx
if (msg.block === 'read' || msg.block === 'write') return renderReadWrite(msg, `t${i}`, isFirst);
if (msg.block === 'edit') return renderDiff(msg, `t${i}`, isFirst);
```
→ `WriteBlock` (for write) → `DiffBlock` (for edit)

**Web rendering:** StepCards.jsx:356-368 — DiffViewer for write/edit with `diffLines`, Undo/Keep action bar.

### Stage 3: Explore (`list_files`)

**Purpose:** Glob-based file discovery.

**Parameters:** `glob` (string, default `**/*`)

**Result format (`_blockMeta`): `tools.js:288-296`** — wait, no. Let me re-check. The `_blockMeta` in chat-agent.js:288-314:
```js
if (name === 'list_files') {
  return {
    block: 'command',
    path: '',
    lines: [],
    command: '',
    relDir: '',
    title: `Glob ${JSON.stringify(args.glob ?? '**/*')}`,
    output: String((result?.files || []).join('\n')).slice(0, 3000)
  };
}
```

**CLI rendering:** Dispatches as `renderCommand` since `block === 'command'`.

**Web rendering:** StepCards.jsx:366 — `list_files` is in the TerminalViewer condition.

### Stage 4: Search (`search_code`)

**Purpose:** Grep the codebase for text patterns.

**Parameters:** `query` (string)

**Result format (chat-agent.js:316-322):**
```js
{
  block: 'command',
  path: '',
  lines: [],
  command: '',
  relDir: '',
  title: `Grep ${JSON.stringify(args.query || '')}`,
  output: String((result?.files || []).join('\n')).slice(0, 3000)
}
```

**CLI rendering:** `CommandBlock` with `title` showing `Grep "..."`.

**Web rendering:** StepCards.jsx:366 — `search_code` in TerminalViewer condition (added in fix round 3).

### Stage 5: Run (`run_shell`, `run_tests`)

**Purpose:** Execute shell commands or run test suites.

**Parameters:**
- `run_shell`: `command` (string) — npm scripts, builds, git, etc.
- `run_tests`: `file` (optional string) — run one test file or the full suite

**Permission gate:** When `run_shell` is called and `allowShellAll` is false and `requirePermission` is true, ChatAgent calls `_askPermission(command)` (chat-agent.js:470-497). The user can answer:
- `'yes'` — execute once
- `'always'` — execute + set `allowShellAll = true` (persists via bus event → ChatSession)
- `'no'`/`'aborted'` — skip tool execution, emit blocked result

**`_blockMeta` for `run_shell` (chat-agent.js:285-296):**
```js
{
  block: 'command',
  path: '',
  lines: [],
  command: String(args.command || ''),  // the actual command
  relDir: '',                           // always empty (runs at project root)
  title: '',
  output: String(result?.stdout || '') + (result?.stderr ? `\n${result.stderr}` : '').slice(0, 3000)
}
```

**`_blockMeta` for `run_tests` (chat-agent.js:298-314):**
```js
{
  block: 'command',
  path: '',
  lines: [],
  command: `test${args.file ? ` ${args.file}` : ''}`,
  relDir: '',
  title: args.file ? `Run tests: ${args.file}` : 'Run tests',
  output: String((result?.output || result?.stdout || '').join('\n')).slice(0, 3000),
  // Also includes result.passed, result.summary
}
```

**CLI rendering:** `CommandBlock` — shows green `$ command` header, then output lines.

**Web rendering:** StepCards.jsx:366 — both `run_shell` and `run_tests` in TerminalViewer condition.

### Stage 6: Diff (`edit_file` with `diffLines`)

The edit operation produces a line-level diff (via `lineDiff`). The diff is shown in two ways:

**CLI:** `DiffBlock` (blocks.jsx:205) — shows diff with `+`/`-` prefixes, line numbers (old/new), green/red backgrounds, `[NEW]`/`[EDIT]` badge. Progressive entrance reveal via `useEntrance`, flash on mount.

**Web:** `DiffViewer` (StepCards.jsx:10) — Framer Motion stagger children (0.03s), hidden→visible x-offset animation. Green for additions (`bg-emerald-500/10`), red with line-through for removals (`bg-red-500/10`).

### Stage 7: Review (`permission` block)

**Purpose:** Interactive approval gate for shell commands and edits.

**Flow:**
```
ChatAgent._askPermission(command)
  → requestId = `perm${++this.toolSeq}`
  → emits {kind:'tool', replaceKey:requestId, block:'permission', status:'running', permission:'pending', command}
  → waits for EVENTS.PERMISSION_ANSWER (y/n/always/timeout)
  → on 'always': emits 'permission:always_granted' → ChatSession persists to userSettings
```

**CLI rendering:** `PermissionBlock` (blocks.jsx:422) — shows `? Allow running: <command>` with `(y/n/always)` hint. Also handled via `InputLine` keyboard shortcuts (y/n/a when `pendingPermission` exists).

**Web rendering:** `PermissionModal` component (separate component, rendered unconditionally in AIChatPage.jsx:603). Uses `answerPermission(requestId, answer)` which dispatches `chat:permission_answer` via socket.

### Stage 8: Context (Todo plan → TodoBlock/TodoCard)

**Purpose:** Show the execution plan as a todo list, track completion.

**Flow:**
```
ChatAgent.run() → Planner.plan(prompt) → emits CHAT_TODO_PLAN {todos, summary}
  → web: Redux setPlan() → TodoCard component
  → CLI: pushTodoMsg() → TodoBlock (via replaceKey:'todos' upsert)
```

**`todo.status`** can be: `pending`, `in_progress` (running), `done`, `failed`, `interrupt`, `paused`.

**CLI TodoBlock (blocks.jsx:329):**
- Shows `☰ Todos N/M [████░░░░] P%`
- Each todo: status icon (`✓`/`●`/`✗`/`☐`), id, `[domain]`, title
- Sub-todos have `dependsOn` shown as `(waits: t1, t2)`

**Web TodoCard (TodoCard.jsx:5):**
- Header: `📋 Plan` + summary text
- Each todo: checkbox (draw-in animation on done) or pulsing dot (in_progress) or empty circle (pending)
- **Animation #1:** Checkbox SVG draw-in — `motion.svg` with `pathLength: 0→1`, `duration: 0.3`, `ease: "easeOut"`
- **Animation #2:** In-progress pulsing dot — `motion.div` with `scale: [1, 1.4, 1]`, `opacity: [0.4, 1, 0.4]`, `repeat: Infinity`, `duration: 1.5`

---

## 3. CLI Terminal UI

### 3.1 Layout & Composition

**`App.jsx` render tree (the actual JSX output, `App.jsx:1055`):**

```
<box flexDirection="column" height={rows} bg={theme.bg}>     ← root container
  ├─ hasStarted === false → WelcomeScreen + StatusBar
  └─ hasStarted === true:
     <box flexDirection="row" width="100%" height="100%">
       <box flexDirection="column" flexGrow={1} overflow="hidden">
         ├─ <Header projectName model watching email version agents elapsed />
         ├─ <MainPane messages streamingMessage isGenerating agentMode ... />
         ├─ <Toasts toasts={toasts} />
         ├─ <AgentStrip agents={agents} ... />     ← lazy
         ├─ <InputLine onSubmit ... />
         └─ <StatusBar tokens percent cwd ... />
       </box>
       ├─ activePanelId && <ActivePanel ... />    ← lazy, pinned subagent detail
       ├─ isBuilding && plan && <ProcessingScreen ... />
       ├─ specialMode !== 'zen' && <Sidebar ... />
     </box>
     ├─ activeModal && <ProviderWizard ... />     ← lazy
     ├─ analyticsOpen && <AnalyticsPanel ... />   ← lazy
     ├─ pendingPermission && <PermissionModal ... />  ← lazy
     ├─ paletteOpen && <CommandPalette ... />     ← lazy
     ├─ debugMode && <DebugPanel events ... />
     └─ diffOpen && <DiffViewer ... />
```

### 3.2 Layout Presets (`themes.js`)

The CLI uses `@opentui/react`'s `<box>` layout primitives (flexDirection, flexGrow, flexShrink, width, height, overflow). There are 3 themes (`dark`, `light`, `opencode`), 7 color schemes (`default`, `blue`, `purple`, `amber`, `red`, `teal`, `mono`), 3 icon sets (`unicode`, `ascii`, `nerd`), 4 font sizes, and 3 layout presets.

The `theme` object is a **mutable proxy** (`theme.js:4-20`): `setTheme(name)` deletes all keys from the `theme` object and copies new keys in-place. No context provider needed — every component imports `theme` directly and sees updates on re-render. To force re-render, bump `themeVersion` in `App.jsx:key={themeVersion}`.

### 3.3 Core UI Components

#### App.jsx (52KB — root component)
**State tracking:**
- `messages` — capped at 400 (`cap()` helper), uses `replaceKey` for upsert logic
- `agents` — active subagents (god-mode)
- `plan` / `todos` — from `PLAN_GENERATED` event
- `toasts` — ephemeral notifications (5s TTL)
- `pendingPermission` — current permission gate
- `isBuilding` / `currentWave` / `totalWaves` / `buildWaves` / `completedWaves` — god-mode state
- `tokenIn` / `tokenOut` / `buildCost` / `lastLatency` — telemetry
- `themeName` / `themeVersion` / `specialMode` — UI customization
- `activeModal` / `paletteOpen` / `analyticsOpen` / `diffOpen` / `debugMode` — modal state

**Replace-key upsert pattern (App.jsx:225-233):**
```js
const push = (msg) => setMessages((m) => {
  if (!msg.replaceKey) return cap([...m, msg]);
  const idx = m.findIndex((x) => x.replaceKey === msg.replaceKey);
  if (idx === -1) return cap([...m, msg]);
  const next = m.slice();
  next[idx] = { ...next[idx], ...msg };
  return next;
});
```

**Slash command handling:** `handleSlash(raw)` splits by space, `switch(name)` on first token. 33 commands:
`agents`, `connect`, `customize`, `bugfix`, `clear`, `context`, `diff`, `exit`, `export`, `god`, `help`, `history`, `hooks`, `analytics`, `audit`, `compliance`, `init`, `models`, `mode`, `plan`, `replay`, `record`, `resume`, `scheme`, `security`, `stack`, `theme`, `ui-mode`, `undo`, `rollback`, `watch`, `workspaces`, `quota`

**Event wiring (App.jsx:402-453):** 16 bus listeners:
```
PLAN_GENERATED     → onPlan (setTodos, setBuildWaves, setIsBuilding)
SUBAGENT_STARTED   → onAgentStarted (upsertAgent, setActivePanelId)
SUBAGENT_STEP      → onAgentStep (update message/tokens/latency)
SUBAGENT_DONE      → onAgentDone (complete todo, accumulate tokens, remove agent)
SUBAGENT_FAILED    → onAgentFailed (mark failed, update todo)
SUBAGENT_NEEDS_REVIEW → onNeedsReview
SUBAGENT_FILE      → onAgentFile (add 2 files)
INTEGRATION_PASS   → onIntegration (test results)
TOAST              → onToast
MESSAGE            → onMessage (stream/tool/system/summary/etc.)
BUILD_COMPLETE     → onBuildComplete (persist, saveHistory)
WAVE_START         → onWaveStart
WAVE_COMPLETE      → onWaveComplete (push to completedWaves)
WATCH_STATUS       → onWatchStatus
WATCH_SCAN         → onWatchScan
WATCH_FIX          → onWatchFix
HOOK_EXECUTED      → onHookExecuted
permission:always_granted → onAlwaysGranted (saveConfig)
```

**Debug mode:** Sniffs all `EVENTS` keys, stores in circular buffer (200 items), batches re-renders every 4 events.

#### blocks.jsx (core block components)

**`SPIN_FRAMES`** = `['●', '◐', '◓', '◑', '◒']` — 5-frame spinner cycle

**`TOOL_VERBS`** — maps tool name to "Reading…", "Writing…", "Running…", etc.
**`TOOL_LABELS`** — maps to "Read", "Wrote", "Edit", "Run", "Run tests", "Glob", "Grep", "Git status"

**`SpinnerBlock({label})`** — uses `useTicker()`, displays `SPIN_FRAMES[ticks % 5]` in amber, label in dim. Used for loading states.

**`ThoughtBlock({text, seconds, live, expanded})`** — renders thinking/reasoning:
- Live: `Thinking[...]` with growing dots (4 states, cycle every 5 ticks)
- Completed: `Thought: Nms`
- Markdown bullets (`-`, `*`, `1.`) → converted to `└──>` tree arrows
- Expandable with `▸`/`▾` toggle
- Last line gets a blinking `█` cursor when live

**`ReadBlock({path, lines, expanded, marginTop})`** — file read output:
- Syntax highlights via `cli-highlight` (extension-based: `.js`→javascript, `.py`→python, etc.)
- Progressive entrance reveal: `useEntrance(display.length, 0.375)` — ~30ms per line
- Flash border on mount: `useFlashOnMount()` (400ms green flash + `#062012` background)
- Path breadcrumbs: `/` → ` › `
- Line numbers right-aligned with `│` separator
- Truncation indicator: `… N more lines (Tab → Enter to expand)`

**`WriteBlock`** — similar to ReadBlock but with ✎ icon, green color, same entrance/flash animations

**`DiffBlock({path, lines, expanded, marginTop})`** — file edit diff:
- Line-diff with `{kind: 'add'|'remove'|'context', oldNo, newNo, text}` entries
- Progressive entrance: `useEntrance(display.length, 0.375)`
- Flash on mount, `[NEW]`/`[EDIT]` badge
- Color-coded: green for adds (with background `diffGreenBg`), red for removes
- Old/new line numbers: `${oldNo} │ ${newNo} │`
- Syntax highlight via `cli-highlight`

**`CommandBlock({title, relDir, command, output, expanded, marginTop})`** — shell/test/search/list output:
- `▸` title prefix (purple) or "Running in {relDir}"
- `$ command` green header (bold)
- Output lines dimmed
- Progressive entrance, flash on mount
- Truncation: 10 lines max (`CMD_MAX`), expand with Tab

**`TodoBlock({items, marginTop})`** — plan/todo list:
- Progress bar: `█`×20 chars with `░` fill
- Status icons: `✓` (done/green), `●` (running/green), `✗` (failed/red), `☐` (pending/muted)
- `domain` shown as `[backend]`
- Sub-todos: `└──> ` prefix, `(waits: t1, t2)` for dependencies

**`InterruptBlock`** — simple `✗ Interrupted by user`

**`ErrorBlock({reason})`** — `✗ Something went wrong: {reason}`, `r` to retry

**`PermissionBlock({pending, approved, command})`** —
- Pending: `? Allow running: {command}` with `(y/n/always)`
- Approved: `✓ Approved`
- Denied: `✗ Denied`

**`ChangeSummaryBlock({files})`** — `✓ Changed N files`, lists paths with `+added/-removed`, totals

**`useFlashOnMount()`** — 400ms boolean flash state, used by ReadBlock/WriteBlock/DiffBlock/CommandBlock for border color change

### 3.4 Animation System (CLI)

Three custom hooks power all animations. They're all in `packages/cli/src/ui/`:

#### useTicker.js — Global shared clock
```
TICK_RATE_MS = 80ms (12.5 FPS)
subscribers = Set() of callback functions
tickCount starts at 0
```
- First subscriber starts `setInterval(tick, 80)`
- Last subscriber clears the interval (auto stop)
- New subscribers get instant sync: `fn(tickCount)` called immediately on subscribe
- **Used by:** SpinnerBlock (5-frame cycle), ThoughtBlock (dot animation + spinner), ProcessingScreen (wave spin frame), AgentStrip, CommandPalette (cursor blink), StatusBar (if any)

#### useEntrance.js — Progressive reveal
```
useEntrance(totalItems, ticksPerItem=1, resetKey=null) → visibleCount
```
- Uses `useTicker()` internally for the tick count
- Starts animation on mount (sets `startTick = ticks`)
- Resets when `totalItems` changes or `resetKey` changes
- Returns `Math.min(totalItems, floor((ticks - startTick) / ticksPerItem))`
- **Default:** `0.375` ticksPerItem → ~30ms per item (faster than 1 tick)
- **Used by:** ReadBlock, WriteBlock, DiffBlock, CommandBlock for line-by-line reveal
- **ActivePanel.jsx:** 14ms interval for file content reveal (independent, doesn't use useTicker)

#### useAnimatedProgress.js — Smooth percentage animation
```
useAnimatedProgress(targetPct, frames=8, intervalMs=20) → displayPct
```
- Interpolates from current `displayPct` to `targetPct` over 8 frames at 20ms
- Linear interpolation: `start + delta * (frame / frames)`
- **Used by:** StatusBar (context bar), TodoBlock (progress bar), ProcessingScreen (wave progress + TodoRow progress)
- **NOT** used by TodoCard (web) — TodoCard uses Framer Motion instead

#### useFlashOnMount.js — Mount flash
- Boolean state: `true` for 400ms on mount, then `false`
- Used for border color + background flash effect on newly rendered blocks

### 3.5 ProcessingScreen.jsx — God-Mode Wave DAG

Activated when `isBuilding && plan` (App.jsx:1121). Full-screen overlay replacing the chat:

**Layout:**
```
<box position="absolute" height={height} bg={theme.bg}>
  ├─ Header: "◀ God Mode" + "building your project" + "esc to cancel"
  ├─ Wave DAG (flexGrow, overflow="hidden"):
  │   ├─ For each wave (1..totalWaves):
  │   │   ├─ Wave header: "●/✓/○ Wave N/T" + progress bar + "done/total"
  │   │   └─ If active wave: TodoRow[] (full detail)
  │   └─ If all complete: Integration/verification section
  └─ Footer: Context tokens / Cost / Time / ETA / done/total / failed
```

**TodoRow component:**
- Renders as `├──` / `└──` tree with dependency tree drawing
- Status icon cycles through `SPIN_FRAMES` when running
- Progress bar (12 chars wide) using `useAnimatedProgress`
- Label: `step N/M` when running, `done` when complete, `queued` when pending
- **Flash-then-settle:** When transitioning to `done`, background flashes green (`theme.green`) for 400ms
- Dependency annotation: `│ depends on: t1, t2`

**Wave logic:**
- `currentWave` tracks active wave; only the active wave shows full TodoRow details
- `completedWaves` array tracks finished waves; past waves show simplified view
- `useAnimatedProgress` on wave completion percentage
- Integration phase shows after all waves complete: `Thinking running... integration tests`

**Event handlers (wired in App.jsx):**
- `onWaveStart` — increments `currentWave`
- `onWaveComplete` — pushes to `completedWaves`
- `onIntegration` — shows test pass/fail with output tail

### 3.6 StatusBar.jsx — Responsive terminal status bar

```
StatusBar({tokens, percent, cwd, isGenerating, branch, gitDirty,
           mode, agentMode, watching, agentsRunning, agentsTotal,
           elapsed, cost, tokenIn, tokenOut, providers, latency,
           modelLabel, specialMode})
```

**Responsive tiers (based on `termWidth`):**
- `termWidth < 100`: Single `|` separator, minimal info (mode + model + context bar)
- `termWidth >= 90`: Adds providers count, agents count, elapsed time
- `termWidth >= 100`: Adds cwd (full if ≥140, basename if <140), branch, git dirty indicator
- `termWidth >= 120`: Adds cost ($X.XX), latency (Xs), token in/out split
- `termWidth >= 140`: Full cwd path

**Context bar:** 8-char `████░░░░` bar with animated percentage via `useAnimatedProgress`

**Generating state:** Shows `·· ████ esc interrupt` instead of normal info

### 3.7 Header.jsx — Top bar

```
<box border round borderColor={theme.divider} bg={theme.panel}>
  ├─ Logo (mini)
  ├─ Left column: "mcode CLI v2.4.6" + project name (with ◻ prefix)
  ├─ Center column: email + model label
  └─ Right column: ○ status + "Working"/"Ready" + agents count + elapsed
```

**Status indicators:**
- `theme.circle` (●) when watching (amber), green when ready
- Agents: `N/M agents` when watching
- Elapsed: timer formatted as `M:SS`

### 3.8 ActivePanel.jsx — Subagent detail inspector

Activated when `activePanelId` is set (user clicks a subagent in AgentStrip or presses digit key):

**4 tabs:** `files`, `diff`, `logs`, `metrics`

- **files tab:** Progressive reveal of file content at 14ms intervals (independent interval, not useTicker). Shows last 2 files per agent (sliced(-2)).
- **diff tab:** File-level diff display
- **logs tab:** Step-by-step logs (step/message/status)
- **metrics tab:** Domain, model, status info

**Animation:** `setReveal(0)` resets on file key change, increments by 1 every 14ms. `setTick` increments by 1 every 140ms for spinner effects.

**Pin:** `panelPinned` boolean — when true, panel stays open after agent completes. Toggle with `p` key (App.jsx:123).

### 3.9 AgentStrip.jsx — Horizontal subagent strip

Shows active subagents as a horizontal strip at the bottom (below MainPane, above InputLine). Only visible when `specialMode !== 'zen'`.

### 3.10 CommandPalette.jsx — Ctrl+P fuzzy command palette

- Fuzzy search over `SLASH_COMMANDS` array (33 entries)
- Scoring: consecutive chars = 10 points, non-consecutive = 1 point, exact substring = +50 bonus
- `useEntrance` staggered reveal of results
- Keyboard navigation (up/down/Enter/Esc) + mouse selection
- Scrollbar visualization

### 3.11 InputLine.jsx — Prompt input with slash autocomplete

**Features:**
- Slash autocomplete: when input starts with `/`, filters `SLASH_COMMANDS` and shows dropdown
- History navigation: up/down arrows (max 100 entries)
- Cursor blink: 530ms interval using `useTicker`
- Permission shortcuts: `y`/`n`/`a` when `pendingPermission` is active
- Quick-action shortcuts: shift+1-4 for welcome screen suggestions
- Multi-line support: shift+Enter for new line, Enter to submit

**SLASH_COMMANDS array** (sorted alphabetically): `agents`, `connect`, `customize`, `bugfix`, `clear`, `context`, `diff`, `exit`, `export`, `god`, `help`, `history`, `hooks`, `analytics`, `audit`, `compliance`, `init`, `models`, `mode`, `plan`, `replay`, `record`, `resume`, `scheme`, `security`, `stack`, `theme`, `ui-mode`, `undo`, `rollback`, `watch`, `workspaces`, `quota`

### 3.12 WelcomeScreen.jsx — Initial screen

Shown when `hasStarted === false`:
- Logo animation (rotating gradient lines)
- "What do you want to build?" heading
- Quick action buttons: "Create a website", "Build a mobile app", "Design a dashboard"
- InputLine in `variant="welcome"` mode

### 3.13 Misc CLI Components
- **BgBox.jsx** — Background box with theme-aware borders
- **VirtualList.jsx** — Virtualized list for large message sets
- **Logo.jsx** — SVG gradient logo (mini/full variants)
- **ProviderWizard.jsx** — API key setup flow
- **PermissionModal.jsx** — Modal version of permission block (web-style for CLI)
- **SummaryCard.jsx** — Build summary card (`BuildSummaryCard` import in MainPane)
- **DiffViewer.jsx** — Standalone diff viewer (lazy, triggered by `/diff`)
- **AnalyticsPanel.jsx** — Build analytics web view
- **DebugPanel.jsx** — Event inspector (debug mode)

---

## 4. Web IDE UI

### 4.1 Layout & Composition

**`AIChatPage.jsx` render tree:**

```
<div className="flex flex-col h-screen w-screen bg-[#0a0a0a]">
  ├─ <input type="file" multiple />     ← hidden file upload
  ├─ <header className="h-[56px]">      ← topbar
  │   ├─ Logo + "Codient" link
  │   ├─ Workspace selector dropdown
  │   ├─ Segmented control: [Design | Chat | AI code Agent]
  │   └─ Right actions: user avatar, Invite button
  ├─ <main className="flex-1 overflow-hidden">
  │   ├─ Active tab === 'Design': <DesignTab />
  │   ├─ Active tab === 'Chat':
  │   │   ├─ Empty state (spinner + "What do you want to build?" + quick actions)
  │   │   │   OR
  │   │   ├─ Messages: TodoCard + PermissionModal + message loop (user bubbles / tool StepCards)
  │   │   └─ Chat input (textarea + action bar)
  │   └─ Active tab === 'AI code Agent':
  │       ├─ Left sidebar (14px wide icons: Folder, Puzzle, GitHub)
  │       ├─ File explorer pane (64px) with FileTree
  │       ├─ EditorPane + TerminalPane (split center)
  │       └─ Right AI panel (400px) with TodoCard + StepCards + messages
  └─ (toasts rendered as overlay)
```

### 4.2 State Management (chatSlice.js)

**Redux store** (`packages/web/src/store/chatSlice.js`):

```
initialState = {
  status: 'idle' | 'connecting' | 'ready' | 'error',
  keysError: null,
  mode: 'chat' | 'agent',           ← advanced mode toggle
  messages: [],                      ← {id, role, kind, text, blocks, replaceKey}
  plan: {summary, todos},           ← from CHAT_TODO_PLAN
  permissionRequest: null,           ← from CHAT_PERMISSION
  lastUndoResult: null,              ← from CHAT_UNDO_RESULT
  isStreaming: false,                ← true while streaming
  models: [],                        ← from REST /api/v1/keys/models
  selectedModel: null,               ← ref string like "poolside:..."
  designs: [],                       ← design tab
  currentDesign: null,               ← active design (html, version, _id)
  designStatus: 'idle' | 'generating' | 'ready' | 'error',
  designError: null
}
```

**Key reducers:**
- `chatReady(models)` — handles both provider objects (from socket) and model objects (from REST); auto-selects poolside model
- `streamUpdate(text)` — appends to last assistant stream message, creates new if none
- `agentMessage(msg)` — upsert by `replaceKey` if found, else push (this is how tool results map to StepCards)
- `toolCallStarted(payload)` — creates running placeholder, dedupes by replaceKey
- `chatDone()` — sets isStreaming = false
- `setPlan(payload)` — stores {todos, summary}
- `updateTodo({id, status})` — updates todo status in plan
- Design-related: `setDesignStreaming`, `setDesignStream`, `setDesignDone`, `setDesignError`

### 4.3 AIChatPage.jsx State

**UI state (React component-level):**
- `workspaces` / `activeWorkspaceId` — fetched from `/api/v1/workspaces`
- `activeTab` — 'Design' | 'Chat' | 'AI code Agent'
- `openFiles` / `activePath` — editor state
- `branches` / `activeBranch` — from `/api/v1/workspaces/{id}/branches`
- `isUploading` / `watchMode` — file upload / watch toggle
- `toasts` — local toast state (3.5s TTL)
- `isStreaming` — derived from Redux `isStreaming`

**Auth guard:** `getTokens()` checks URL params first (for dev/testing), then localStorage `mcode_tokens`. Redirects to `/login` if no access token.

### 4.4 Web Animation System

The web uses **Framer Motion** (`framer-motion` package). No custom animation hooks — all animation is declarative via `motion.*` components and variants.

#### Message entry
```jsx
<motion.div 
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
  className="w-full bg-[#151515] rounded-xl border border-white/5 overflow-hidden shadow-sm"
>
```
All step cards and assistant messages use this 0.2s fade-up entrance.

#### Status icon transitions (StepCard.jsx:295-309)
```jsx
<AnimatePresence mode="wait">
  {isRunning ? (
    <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Loader2 className="w-4 h-4 animate-spin" />
    </motion.div>
  ) : isFailed ? (
    <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <XCircle className="w-4 h-4 text-red-400" />
    </motion.div>
  ) : (
    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <CheckCircle2 className={`w-4 h-4 ${color}`} />
    </motion.div>
  )}
</AnimatePresence>
```
`AnimatePresence mode="wait"` ensures smooth cross-fade between running/failed/done states.

#### TodoCard checkbox draw-in animation (TodoCard.jsx:32-50)
```jsx
<motion.div
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
>
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 w-4 h-4">
    <motion.path
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      d="M5 12.5l5 5 9-9"
    />
  </motion.svg>
</motion.div>
```
The SVG uses `stroke-dasharray` + `pathLength` for SVG line drawing animation. The path `M5 12.5l5 5 9-9` draws a checkmark.

#### TodoCard in-progress pulsing dot (TodoCard.jsx:52-63)
```jsx
<motion.div
  animate={{
    scale: [1, 1.4, 1],
    opacity: [0.4, 1, 0.4]
  }}
  transition={{
    duration: 1.5,
    repeat: Infinity,
    ease: "easeInOut"
  }}
  className="w-4 h-4 rounded-full bg-blue-400"
/>
```
Uses `repeat: Infinity` for continuous animation. Blue circle (#3b82f6 equivalent) pulses.

#### TodoCard pending state (TodoCard.jsx:64-66)
```jsx
<Circle className="w-4 h-4 text-white/20" />
```
Static Lucide icon, dimmed.

#### Expand/collapse (StepCard.jsx:334-345)
```jsx
<AnimatePresence initial={false}>
  {expanded && (
    <motion.div
      key="content"
      initial="collapsed"
      animate="open"
      exit="collapsed"
      variants={{
        open: { opacity: 1, height: "auto" },
        collapsed: { opacity: 0, height: 0 }
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
```
Height transitions from 0 to auto. `initial={false}` prevents animation on first mount.

#### TerminalViewer staggered line reveal (StepCards.jsx:64-83)
```jsx
<motion.div 
  className="p-3 overflow-x-auto custom-scrollbar max-h-[300px]"
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.015 } }
  }}
>
  {lines.map((line, i) => (
    <motion.div 
      key={i}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }}
    >
      {line || ' '}
    </motion.div>
  ))}
</motion.div>
```
Stagger children at 15ms intervals — creates a typewriter-style line-by-line reveal.

#### DiffViewer staggered animation (StepCards.jsx:14-53)
```jsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.03 } }
  }}
>
  {diffLines.map((line, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, x: -5 },
        visible: { opacity: 1, x: 0 }
      }}
    >
```
15ms stagger for diffs, x-offset animation, color-coded by kind (green/red).

#### Send/Stop button transition (AIChatPage.jsx:554-581)
```jsx
<AnimatePresence mode="wait">
  {isStreaming ? (
    <motion.button key="stop-btn" ... exit={{ scale: 0.9, opacity: 0 }}>
      <Square />
    </motion.button>
  ) : (
    <motion.button key="send-btn" ... exit={{ scale: 0.9, opacity: 0 }}>
      <ArrowUp />
    </motion.button>
  )}
</AnimatePresence>
```
Scale + opacity transition, 0.15s duration.

#### Streaming caret (AIChatPage.jsx:618, 789)
```jsx
<span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
```
CSS `animate-pulse` (opacity 0↔100) for the cursor blink during streaming.

#### Loading spinners
- `Loader2` with `animate-spin` class — used for uploading files, loading states
- `animate-spin-slow` — the 12-line gradient spinner on empty state (`animation-duration: 20s`)

#### Gradient button hover
```jsx
<button className="... group ... transition-all duration-300 ...">
  <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(...)] opacity-50 group-focus-within:opacity-100"></div>
  <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
</button>
```
Conic gradient rotates continuously, opacity increases on focus.

### 4.5 Web Key Components

#### TodoCard.jsx (5 modified)
- `motion.div` entrance: `initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`
- Header: gradient bar `from-blue-500/10 to-emerald-500/10`, `📋 Plan` + summary
- Each todo: checkbox (done) / pulsing dot (in_progress) / circle (pending) + title + description

#### StepCards.jsx (3 modified)
- Maps 12 tool types to icons (`FileText`, `Pencil`, `Terminal`, `FolderTree`, `Search`, `GitBranch`, `Globe`, `MousePointerClick`, `Camera`, `TreePine`, `AlertCircle`)
- Expanded content renders different viewers based on tool:
  - `write_file`/`edit_file` → `DiffViewer`
  - `read_file`/`web_fetch` → `TerminalViewer`
  - `run_shell`/`run_tests`/`list_files`/`search_code`/`web_search`/`git_status` → `TerminalViewer`
  - `browser_screenshot` → inline `<motion.img>`
  - `browser_snapshot` → `SnapshotTree`
  - `browser_get_console_errors` → `ConsoleErrorList`
  - Fallback → JSON args display
- Undo/Keep action bar for write/edit operations (both done)

#### StepCards.jsx — TerminalViewer
- Staggered line reveal (15ms per line via Framer Motion)
- `custom-scrollbar` + `max-h-[300px]` overflow
- Font: `font-mono text-[11px]`

#### StepCards.jsx — SnapshotTree
- Recursive tree renderer with expand/collapse
- `▼`/`▶` toggles, depth-indented with `marginLeft: depth * 12`
- Shows `name`/`role`/`value` from node objects

#### StepCards.jsx — ConsoleErrorList
- Filters `browser_get_console_errors` result
- Staggered animation (30ms)
- Color-coded by error type: `[error.type]` prefix in red, message in red-300

#### DesignTab.jsx — HTML design generator
- Generates HTML from prompts via `/api/v1/design/generate`
- Streams HTML chunks (Server-Sent Events)
- Device toggle: desktop/mobile

#### EditorPane.jsx — Code editor
- Syntax highlighting, file tabs, auto-refresh on file changes (`file:changed` custom event)
- Connected to StepCard tool results for live updates

#### FileTree.jsx — Project explorer
- Lazy-loaded tree, refresh on file changes
- `triggerRefresh` prop triggers after uploads

#### TerminalPane.jsx — Terminal output display
- Shows streaming messages in terminal-like format

### 4.6 Web components without CLI equivalents
- `SparkleButton.jsx` — Quick prompt suggestions
- `ModelSelector.jsx` — API provider/model dropdown
- `PermissionModal.jsx` — Modal permission dialog (CLI uses inline `PermissionBlock`)
- `WorkspaceModals.jsx` — Upload/clone/export dialogs
- `BranchDropdown` — Git branch switching

---

## 5. Shared Backend Infrastructure

### 5.1 ToolExecutor (`packages/cli/src/core/tools.js`)

**Domain-based tool restriction:**
```js
// 'chat' and 'docs' domains → no write/edit/shell tools
// 'backend' (default) → all tools available
const t = { read_file, list_files, search_code, web_search, web_fetch, git_status };
if (this.domain !== 'chat' && this.domain !== 'docs') {
  t.write_file, t.edit_file, t.run_shell, t.run_tests,
  t.browser_navigate, t.browser_click, t.browser_type,
  t.browser_screenshot, t.browser_snapshot, t.browser_get_console_errors
}
```

**Constructor params:** `{projectPath, bus, undoStack, allowShellAll, requireEditApproval, domain, todoId, cancelSignal, networkWhitelist, auditLog}`

**Key methods (all return `{ok, ...result}`):**

| Tool | Parameters | Returns | Snapshot? |
|------|-----------|---------|-----------|
| `read_file` | `{path, line?}` | `{content, line}` | No |
| `write_file` | `{path, content}` | `{file, created, diff, diffLines, content}` | ✅ Yes |
| `edit_file` | `{path, old, new}` | `{file, diff, diffLines, content}` | ✅ Yes |
| `run_shell` | `{command}` | `{stdout, stderr, exitCode}` | No |
| `run_tests` | `{file?}` | `{passed, output, summary}` | No |
| `list_files` | `{glob}` | `{files: []}` | No |
| `search_code` | `{query}` | `{files: []}` | No |
| `web_search` | `{query}` | `{results: [{title,url,snippet}]}` | No |
| `web_fetch` | `{url}` | `{content, title}` | No |
| `git_status` | `{}` | `{files: []}` | No |

**`_askOverwrite()`:** Prompts for `y`/`n`/`always` on existing files (write_file) or edits. Uses `_askPermissionIfNeeded()` with risk scoring.

**UndoStack snapshot:** Called at `tools.js:214` (write_file) and `tools.js:248` (edit_file). Saves `{at, file, prev}` to in-memory `entries` array and persists to `undo.json` file.

### 5.2 ChatAgent (`packages/cli/src/core/chat-agent.js`)

**Constructor:** `{assignment, projectPath, bus, undoStack, config, reasoning, history, onTool}`

- `maxTurns`: from `config.chatAgentTurns` (default 12)
- `requirePermission`: `config.requirePermission !== false` (default true)
- `allowShellAll`: from config
- `networkWhitelist`: from config
- Creates `ToolExecutor` in `run()` with domain from `config.domain`

**run(prompt) flow:**
```
1. AbortController for cancellation
2. ToolExecutor created with bus + undoStack + config
3. Message array: [system_prompt, ...history, {role:'user', content:prompt}]
4. For each turn (up to maxTurns):
   a. streamText() → LLM response (chunked)
   b. bus.emit(MESSAGE, {kind:'stream', text})  → live streaming to client
   c. extractAction(text) → mcode-action fence or XML format
   d. If no action → narration.push + break (done)
   e. Emit {kind:'tool', replaceKey, tool, args, status:'running'}
   f. onTool callback (web: CHAT_TOOL_CALL)
   g. If run_shell && !allowShellAll && requirePermission:
      → _askPermission(command) → gateway
   h. Execute tool → result
   i. bus.emit(MESSAGE, {kind:'tool', replaceKey, ..._blockMeta(tool, args, result), status:'done'})
   j. Push result to messages + history
5. If aborted → emit interrupt
6. If ≥2 changedFiles → emit summary (ChangeSummaryBlock)
7. Return {text, turns, history, interrupted}
```

**Message protocol:** LLM must end each tool-use turn with:
```
```mcode-action
{"tool":"read_file","args":{"path":"src/foo.js"}}
```
```
OR XML format: `<mcode-action tool="read_file" args="..."/>`

`extractAction()` scans for `ACTION_FENCE` regex first, then `TOOL_CALL_XML`.

### 5.3 ChatSession (`packages/backend/src/chat-session.js`)

**Bridges CLI's ChatAgent to web socket clients.**

**Constructor:** `{userId, secret, workspacePath, modelRef, onEvent}`

**Config (initialized at line 30):**
```js
this.config = {
  chatAgentTurns: 15,
  allowShellAll: false,
  requireEditApproval: false
};
```

After DB load, merges: `allowShellAll`, `requireEditApproval`, `networkWhitelist`, `godModeDefaults`, `watchDefaults`, `userModelOverrides`.

**Lifecycle:**
1. `init()` — loads API keys from DB (decrypted via `deriveMasterKey`), creates `ModelRouter` + `UndoStack`
2. `start()` — creates `bus` (EventEmitter), registers listeners:
   - `EVENTS.MESSAGE` → routes to `CHAT_STREAM` or `CHAT_MESSAGE`, special-cases permission
   - `SUBAGENT_SHELL_OUTPUT` → `CHAT_SHELL_STREAM`
   - `permission:always_granted` → persists `allowShellAll` to DB
3. `sendMessage(prompt, mode)` — dispatches to `runAgent()` or `runChat()`
4. `runChat(prompt)` — ChatAgent with restricted config (read-only domain, `requireEditApproval: true`)
5. `runAgent(prompt)` — ChatAgent with planner, full tools domain, todo tracking via bus events

**Tool call → client flow:**
```
ChatAgent → bus.emit(EVENTS.MESSAGE, msg)
  → ChatSession bus listener (line 113)
  → onEvent(S2C.CHAT_MESSAGE, msg)
  → socket.emit('chat:message')
  → web: onChatMessage → dispatch(agentMessage(msg))
  → chatSlice: upsert by replaceKey, push to messages array
  → AIChatPage: StepCard renders for msg.kind === 'tool'
```

**Tool call start → client flow:**
```
ChatAgent → onTool callback
  → this.onEvent(S2C.CHAT_TOOL_CALL, {tool, args, replaceKey, status:'running'})
  → socket.emit('chat:tool_call')
  → web: onChatToolCall → dispatch(toolCallStarted(payload))
  → chatSlice: creates running placeholder, dedupes by replaceKey
```

### 5.4 Sockets (`packages/backend/src/sockets.js`)

**Two client roles:**
- `socket.role = 'listener'` — authenticated web users with JWT
- `socket.role = 'emitter'` — CLI processes (no token, emit-only)

**Web chat events:**
```
Socket ← 'chat:start' {workspaceId, modelRef}
  → creates ChatSession, calls init() + start(), emits 'chat:ready' {models}

Socket ← 'chat:send' {prompt, mode='chat'}
  → session.sendMessage(prompt, mode)
    → 'chat:stream'   (text chunks)
    → 'chat:message'  (tool results, summaries, system msgs)
    → 'chat:tool_call' (tool start announcements)
    → 'chat:permission' (permission gates)
    → 'chat:todo_plan' (planner output)
    → 'chat:todo_update' (todo status)
    → 'chat:done' (completion)
    → 'chat:error' (errors)

Socket ← 'chat:permission_answer' {requestId, answer}
  → session.handlePermissionAnswer()

Socket ← 'chat:undo'
  → session.undoStack.undo() → 'chat:undo_result' {ok, file/error}

Socket ← 'chat:interrupt'
  → session.interrupt()
```

**CLI → web forwarding (emitter sockets):**
16 events broadcast via `io.emit()`: `session:start`, `plan:generated`, `agent:started`, `agent:step`, `agent:file`, `agent:done`, `agent:failed`, `agent:needs_review`, `integration:pass`, `build:complete`, `toast`, `watch:scan`, `watch:fix`, `watch:status`

**Event name mapping:** Shared constants in `SOCKET.CLIENT_TO_SERVER` and `SOCKET.SERVER_TO_CLIENT` (from `@mcode/shared`).

### 5.5 ModelRouter & CostLedger (`packages/shared/src/`)

- `ModelRouter`: picks model per role (`build`, `general`) based on user config, handles `modelOverride`
- `CostLedger`: tracks token usage and cost per model

### 5.6 Auth (`/api/v1/auth/`)

- JWT access (15min) + refresh (30 day) tokens
- bcrypt password hashing
- bcrypt OTP for email verification
- API keys encrypted with AES-256-GCM (`secret-enc.js`)
- GitHub OAuth with token-as-state pattern
- `authMiddleware` checks Bearer token on all `/api/v1/*` routes

---

## 6. Modes & Execution Engines

The system has three orthogonal mode dimensions: **Quality** (reasoning budget), **Special UI** (rendering behavior), and **Agent** (execution strategy). Modes can be combined — e.g., `/god` runs in Agent mode "Build" at quality "max" with no special UI mode.

### 6.1 Quality Modes

Quality modes control the reasoning token budget and affect which phase of the CLI workflow pipeline is active. Each quality level maps to a token ceiling and visual indicator in the StatusBar.

| Level | Reasoning Budget | Token Ceiling | CLI Indicator | Web Indicator |
|-------|-----------------|---------------|---------------|---------------|
| `low` | 1K tokens | 2K | `⚡` | SparkleButton tag |
| `medium` | 3K tokens | 8K | `⚡⚡` | SparkleButton tag |
| `high` | 8K tokens | 16K | `⚡⚡⚡` | SparkleButton tag |
| `extra` | 16K tokens | 32K | `⚡⚡⚡⚡` | SparkleButton tag |
| `max` | 24K tokens | 48K | `⚡⚡⚡⚡⚡` | SparkleButton tag |
| `god` | 32K tokens | — | `⚡⚡⚡⚡⚡⚡` (wave DAG) | God-mode toggle (see §10.5 Web) |

**Default:** `high` — balances cost and capability. Set via `/quality <level>` or `quality` field in `~/.mcode/config.json`.

**In the pipeline:** Quality mode gates the `Build → Review → Context` phases — higher quality means more iterations in Review before Context is committed.

### 6.2 Special UI Modes

Defined in `packages/cli/src/core/modes.js:5-16` as `SPECIAL_MODES`. Each mode has metadata in `MODE_META` (label, description, icon, `affects` array) that drives conditional rendering across UI components.

```js
// modes.js:5-16 — 10 special modes
LEARNING:       'learning'        // Step-by-step walkthrough with explanations
COMPETITION:    'competition'      // Time trials — race against the clock
ZEN:            'zen'              // Minimal UI — just the essentials
FOCUS:          'focus'            // Hide distractions, show only the task
PRESENTATION:   'presentation'     // Large text, clean layout for demos
DEBUG:          'debug'            // Verbose output and event inspector
SILENT:         'silent'           // Minimal output — only errors shown
BATCH:          'batch'            // Automated runs with no interactive prompts
DAEMON:         'daemon'           // Background processing
SERVICE:        'service'          // Runs as a system service — log to files only
```

**Mode effects (`affects` arrays):**

| Mode | Affects | UI Behavior |
|------|---------|-------------|
| `learning` | `['show-steps', 'verbose-explanation']` | ThoughtBlock shows reasoning traces; explanatory text between blocks |
| `competition` | `['timer-display', 'speed-focus']` | StatusBar shows countdown timer; only essential blocks rendered |
| `zen` | `['minimal-ui', 'hide-sidebar', 'hide-agent-strip']` | Sidebar, AgentStrip, Toasts hidden; full-width content area |
| `focus` | `['hide-toasts', 'hide-agent-strip', 'full-width-input']` | InputLine takes full width; no notification popovers |
| `presentation` | `['large-font', 'center-align', 'minimal-colors']` | Font increased to 16px; content centered; monochrome theme |
| `debug` | `['show-debug-panel', 'verbose-logs', 'show-raw-events']` | DebugPanel visible; all bus events logged; raw JSON shown |
| `silent` | `['suppress-info', 'errors-only', 'quiet-mode', 'hide-toasts']` | Only ErrorBlock and ErrBlock rendered; no spinner/animations |
| `batch` | `['auto-approve', 'no-prompts', 'log-to-file']` | All PermissionBlock auto-approved; no interactive prompts; logs to file |
| `daemon` | `['background-mode', 'minimal-foreground', 'daemon-pid']` | Minimal terminal output; PID file written to `~/.mcode/daemon.pid` |
| `service` | `['service-mode', 'stdout-logs-disabled', 'syslog']` | All stdout suppressed; logs go to syslog or file |

**Setting modes:** `/mode <mode-name>` slash command. Mode persists to `~/.mcode/config.json` under `specialMode`.

### 6.3 Agent Modes

Agent modes determine the execution strategy — whether the agent runs chat-style (one prompt, direct response), god-mode (parallel subagents with planning), or a single focused agent pass.

| Mode | Slug | Entry Point | Planner? | Parallel? | Key Files |
|------|------|-------------|----------|-----------|-----------|
| **Chat** | `chat` | `orchestrator.chat()` → `ChatAgent.run()` | No | No | `chat-agent.js`, `chat-session.js` |
| **Agent** | `agent` | `orchestrator.runAgent()` → `ChatAgent.runAgent()` | Optional (Bug #22) | No | `chat-agent.js`, `chat-session.js` |
| **God** | `god` | `orchestrator.runGod()` → `SubagentManager.runAll()` | Yes (always) | Yes (waves) | `orchestrator.js`, `subagent-manager.js`, `planner.js` |
| **Build** | `build` | `orchestrator.buildProject()` | Yes | Yes (waves) | `orchestrator.js`, `subagent-manager.js` |
| **Edit** | `edit` | `orchestrator.editFile()` | No | No | `chat-agent.js` |
| **Read** | `read` | `orchestrator.readSession()` | No | No | `chat-agent.js` |
| **Notebook** | `notebook` | `orchestrator.notebook()` | No | No | `chat-agent.js` |
| **Architect** | `architect` | `orchestrator.architect()` | Yes (always) | Yes (waves) | `subagent-manager.js` |

**Quality modes → agent modes mapping:**

```
Quality:    low────medium──high──extra──max──god
Agent:      chat   agent    agent   build   god
```

- `chat` mode: Pure conversational — `ChatAgent.run()` with tool execution loop. No planner. Used for Q&A, explanations.
- `agent` mode: Single-agent with tools. Calls `planner.plan()` only if `promptNeedsPlanning()` returns true (Bug #22 fix). Runs `ChatAgent.runAgent()`.
- `god` / `architect` mode: Enters wave-based parallel execution. `planner.plan()` always runs → `Plan {todos, summary}` → `SubagentManager` groups todos into dependency-ordered waves → each wave runs subagents in parallel → integration + build phase.
- `build` mode: Same as god but starts from an existing plan or generates one immediately. Skips chat preamble.
- `edit` / `read` / `notebook` mode: Specialized sessions within the agent loop — edit focuses on a single file, read is inspection-only, notebook is iterative experimentation.

**SESSION_MODES** (from `shared/src/events.js:38-46`):
```js
GOD: 'god', CHAT: 'chat', AGENT: 'agent',
INIT: 'init', RUN: 'run', WATCH: 'watch', MANUAL: 'manual'
```
These are session-level states, separate from quality modes. `watch` and `manual` are set by the WatchDaemon runtime.

### 6.4 Watch Mode Lifecycle

Watch Mode is a persistent background daemon (`packages/cli/src/core/watch-daemon.js:14`) that monitors the project for issues and auto-fixes them. It runs two concurrent detection loops and a multi-stage analysis pipeline per file change.

**Daemon lifecycle:**

```
User: /watch start
  → orchestrator.startWatch() → new WatchDaemon({projectPath, config, bus, router, undoStack})
  → daemon.start()
     ├── A. chokidar event-driven detection (debounced, 400ms)
     │    ├── 'add' → queueChange → _drainQueue
     │    ├── 'change' → queueChange → _drainQueue
     │    └── 'unlink' → queueChange → _drainQueue
     └── B. interval full-repo scan (every scanIntervalMs = 30_000ms)
          ├── setTimeout(scanOnce, 1500ms) — initial sweep
          └── setInterval(scanOnce, 30_000ms) — periodic sweep
```

**Per-file analysis pipeline (`analyzeFile`, watch-daemon.js:237-269):**

```
analyzeFile(rel, lint=null)
  1. Local lint pass (zero model cost)
     → _lintFile() → eslint --fix-dry-run --format json
     → if errors: → _applyFix(rel, lintResult.detail) → return
  2. Static checks
     → _staticCheck(full) — checks:
        • JS/JSX: unresolved imports (extractImports → resolve)
        • TS/TSX: tsc --noEmit (if tsc binary available)
        • HTML: unbalanced tags
        • CSS: unbalanced braces { vs }
     → if issues: → _applyFix(rel, issue) → return
  3. Test impact
     → _runRelatedTests(rel) — finds *.test.js / *.spec.js
        → runs `npm test -- <testfile>` with 120s timeout
     → if failing: → _applyFix(rel, failure) → return
  4. If all pass: emit WATCH_SCAN activity {outcome: 'no-issues'}
```

**Auto-fix flow (`_applyFix`, watch-daemon.js:363-466):**

```
_applyFix(rel, errorContext)
  ├── Rate limit check: fixTimestamps.length >= maxFixesPerHour (60) → pause
  ├── Model assignment: router.pick('bugfix') → assignment
     ├── if no assignment: log 'no bugfix model available'
     ├── if assignment.provider.id === 'mock': skip with note (no fake fixes)
  ├── Retry loop: maxAttemptsPerFix (3 attempts)
  │    ├── provider.complete(model, {system prompt, user: current content})
  │    ├── extractFixedContent(res.text) — accepts plain content or JSON envelope
  │    ├── _verifyFix(full, candidate, source) — verification gates:
  │    │    1. candidate must differ from source (no echo/no-op)
  │    │    2. _staticCheck(candidate temp file) must pass
  │    │    3. eslint --format=json on temp must have 0 errors
  │    └── if !ok: append failure to errorContext, retry
  ├── If verified:
  │    ├── confirmHandler? → user approval gate
  │    ├── undoStack.snapshot(rel, source) — save before-state
  │    ├── writeFile(full, fixed) — apply fix
  │    ├── fixesApplied++, fixTimestamps.push(Date.now())
  │    ├── Post-write verification:
  │    │    • _lintFile(full) + _staticCheck(full)
  │    │    • if still broken: emit WATCH_FIX {outcome: 'needs-review'}
  │    │    • if clean: emit WATCH_FIX {outcome: 'auto-fixed'}
  │    └── if config.autoCommit: _autoCommit(rel) → git add + commit
  └── emitStatus()
```

**Config defaults** (watch-daemon.js:19-27):
```js
scanIntervalMs: 30_000      // full-repo scan every 30s
debounceMs: 400             // chokidar event debounce
maxFixesPerHour: 60         // rate limit (env: MCODE_WATCH_MAX_AUTOFIX_PER_MIN)
autoCommit: false           // git auto-commit on fix
maxAttemptsPerFix: 3        // LLM retry budget per file
confirm: false              // require user confirmation before applying
```

**Ignore patterns** (watch-daemon.js:11):
```
node_modules, .git, dist, build, coverage, .mcodeignore, *.lock, .mcode-fix-*
```
Plus patterns from `.mcodeignore` and `.gitignore` (loaded dynamically).

**Events emitted** (via `this.bus`):

| Event | Payload | When |
|-------|---------|------|
| `WATCH_SCAN` (`watch:scan`) | `{projectId, filesScanned, timestamp}` | Full repo scan completes |
| `WATCH_CHANGE` (`watch:change`) | `{projectId, file, action}` | chokidar detects add/change/unlink |
| `WATCH_FIX` (`watch:fix`) | `{projectId, file, outcome, detail}` | Fix applied (auto-fixed or needs-review) |
| `WATCH_STATUS` (`watch:status`) | `string` ('active' / 'stopped') | Start/stop + periodic |

**WatchDaemon summary()** (watch-daemon.js:513-523):
Returns `{project, status, uptimeSecs, scansRun, filesScanned, fixesApplied, lastActivity[]}` — used by CLI status command and web dashboard.

---

## 7. God-Mode Parallel Subagent Architecture

### 7.1 CLI Flow

```
User types: /god <prompt>
  → App.jsx handleSubmit → orchestrator.runGod(prompt)
  → Orchestrator.runGod()
     → Planner.plan(prompt) → plan {todos, summary}
     → SubagentManager({plan, router, projectPath, config, bus, options})
     → manager.runAll() → returns {sessionFile}
     → Waves: todos with dependsOn grouped into sequential waves
     → Each wave: parallel Subagent instances execute
     → Events: SUBAGENT_CREATED → SUBAGENT_STARTED → SUBAGENT_STEP → 
               SUBAGENT_TOOL_CALL → SUBAGENT_TOOL_RESULT → SUBAGENT_FILE → 
               SUBAGENT_DONE → WAVE_START → WAVE_COMPLETE → INTEGRATION_PASS → 
               BUILD_COMPLETE
```

### 7.2 Event Bus (CLI)

Orchestrator IS the EventEmitter bus (`orchestrator` passed as `bus` to ChatSession). CLI components listen directly:

```
App.jsx:402-453 — 16 direct bus.on() listeners
  PLAN_GENERATED → onPlan (sets todos, buildWaves, setIsBuilding)
  SUBAGENT_STARTED → onAgentStarted (active panel, agent detail)
  SUBAGENT_STEP → onAgentStep (message + token updates)
  SUBAGENT_DONE → onAgentDone (complete, cleanup)
  SUBAGENT_FAILED → onAgentFailed (retry count)
  INTEGRATION_PASS → onIntegration (test results)
  BUILD_COMPLETE → onBuildComplete (persist, saveHistory)
  WAVE_START/WAVE_COMPLETE → wave tracking
```

### 7.3 Web Gap — God-Mode Not Connected

**Gap A:** `SubagentManager` never imported in `chat-session.js:runAgent()`
**Gap B:** No `mode: 'god'` branch in `sockets.js:160` (only `mode = 'chat'`)
**Gap C:** ChatSession config missing `ledger`, incomplete DEFAULT_CONFIG merge, no `SubagentManager` deps
**Gap D:** No bus listeners for `SUBAGENT_*`, `WAVE_*`, `INTEGRATION_*`, `BUILD_COMPLETE` events
**Gap E:** No S2C socket events for web — CLI emits C2S events that backend `io.emit()` broadcasts, but web runs in-process

**Full spec:** See `packages/shared/src/god-mode-web-spec.md`

---

## 8. Animation Systems Deep-Dive

### 8.1 CLI Animation Architecture

The CLI uses a **shared-clock architecture** — one global 80ms interval drives all animations:

```
useTicker.js:
  TICK_RATE_MS = 80
  subscribers = Set()           ← O(1) add/remove
  tickCount = 0
  
  subscribe(fn):
    subscribers.add(fn)
    if (size === 1) start interval   ← auto-start
    fn(tickCount)                    ← instant sync
    
  tick():
    tickCount++
    for (fn of subscribers) fn(tickCount)
    
  unsubscribe(fn):
    subscribers.delete(fn)
    if (size === 0) clearInterval    ← auto-stop
```

**Why shared clock?** Terminal redraw is expensive. A single 80ms tick batches all animations into one render cycle. No component manages its own `setInterval`.

**Animation layers (from bottom to top):**

1. **useTicker** — Global clock (80ms). Every subscriber gets tickCount.
2. **useAnimatedProgress** — Smooth interpolation. Called with a target percentage. Linearly interpolates over 8 frames × 20ms = 160ms. Used for progress bars that need to animate to a specific value.
3. **useEntrance** — Progressive reveal. Takes `totalItems` and `ticksPerItem`. Returns visible count = `floor(elapsed / ticksPerItem)`. Default 0.375 ticks/item ≈ 30ms per line. Creates typewriter effect.
4. **useFlashOnMount** — Boolean flash. `true` for 400ms on mount, then `false`. Used for border/background color change to draw attention to new content.
5. **Direct tick math** — Some components compute frame directly: `SPIN_FRAMES[ticks % 5]`, `dots = '.'.repeat(floor(ticks / 5) % 4)`.

**Animation inventory:**

| Component | Hook | Effect | Timing |
|-----------|------|--------|--------|
| SpinnerBlock | useTicker | 5-frame spinner cycle | 400ms full cycle |
| ThoughtBlock | useTicker | Growing dots (0→3→0) | 400ms cycle |
| ThoughtBlock | useTicker | Spinner frame (live) | 400ms cycle |
| ReadBlock | useEntrance | Line-by-line reveal | 30ms/line |
| ReadBlock | useFlashOnMount | Border green flash | 400ms |
| WriteBlock | useEntrance | Same as ReadBlock | 30ms/line |
| WriteBlock | useFlashOnMount | Green background flash | 400ms |
| DiffBlock | useEntrance | Line-by-line reveal | 30ms/line |
| DiffBlock | useFlashOnMount | Green border flash | 400ms |
| CommandBlock | useEntrance | Line-by-line reveal | 30ms/line |
| CommandBlock | useFlashOnMount | Green border flash | 400ms |
| TodoBlock | direct | Progress bar fill | instant (no animation) |
| TodoBlock | useAnimatedProgress | N/A (uses static bar) | — |
| StatusBar | useAnimatedProgress | Context % bar smooth | 160ms |
| StatusBar | useTerminalDimensions | Responsive layout | on resize |
| ProcessingScreen | useTicker | Wave spin frame | 400ms cycle |
| ProcessingScreen | useAnimatedProgress | Wave progress bars | 160ms |
| TodoRow | useAnimatedProgress | Per-todo progress | 160ms |
| TodoRow | useState/useEffect | Flash-then-settle green bg | 400ms |
| ActivePanel | setInterval(14ms) | File content reveal | 14ms/line |
| ActivePanel | setInterval(140ms) | Spinner tick | 140ms |
| CommandPalette | useEntrance | Staggered command list | 30ms/item |
| CommandPalette | useKeyboard | Cursor blink (via InputLine) | 530ms |
| InputLine | useTicker | Cursor blink | 530ms (via tick math) |
| DebugPanel | buffer | Event batching | every 4 events |

**Cursor blink (InputLine.jsx):** Uses `useTicker()` — `blink = floor(ticks / 6) % 2` (80ms × 6 = 480ms cycle, ~530ms with rounding).

### 8.2 Web Animation Architecture

The web uses **Framer Motion** exclusively — declarative `motion.*` components with variants:

**No custom hooks.** All animation is via:
- `motion.div`, `motion.svg`, `motion.path`, `motion.img`, `motion.button`
- `initial`/`animate`/`exit` props for state transitions
- `variants` + `AnimatePresence` for enter/exit animations
- CSS utility classes: `animate-spin`, `animate-pulse`, `animate-spin-slow`

**Animation inventory:**

| Component | Technique | Effect | Duration |
|-----------|-----------|--------|----------|
| StepCard | motion.div initial/animate | Fade-up entrance | 200ms |
| StepCard status icon | AnimatePresence mode="wait" | Cross-fade between running/failed/done | 0ms (instant cross-fade) |
| StepCard expand | motion.div variants | Height 0↔auto | 200ms ease-in-out |
| StepCard screenshot | layoutId | Shared layout transition | 300ms |
| TodoCard | motion.div spring | Checkbox scale pop | 300ms spring |
| TodoCard checkbox | motion.path pathLength | SVG line draw | 300ms ease-out |
| TodoCard pulsing dot | motion.div keyframes scale/opacity | Continuous pulse | 1500ms repeat |
| TerminalViewer | motion.div staggerChildren | Line-by-line reveal | 15ms/line |
| DiffViewer | motion.div stagger + x | Staggered line entry | 30ms/line |
| ConsoleErrorList | motion.div stagger | Error list reveal | 30ms/error |
| Send/Stop button | AnimatePresence mode="wait" | Scale toggle | 150ms |
| Streaming caret | CSS animate-pulse | Opacity blink | 1s repeat |
| Loading spinners | CSS animate-spin | Rotation | 0.5s repeat linear |
| Empty state spinner | CSS animate-spin-slow | 12-line rotation | 20s repeat |
| Gradient button | CSS animate spin + opacity | Conic rotation | 4s repeat |
| Empty state | animate-in fade-in | Page load | 500ms |
| Chat/IDE transition | animate-in fade-in | Tab switch | 500ms |
| Toast | CSS transition | Opacity fade | auto |

**Key difference from CLI:** The web delegates animation to CSS/hardware acceleration (CSS `animate-*` classes) and Framer Motion (which uses requestAnimationFrame). The CLI uses a manual 80ms tick timer for terminal-friendly batching.

---

## 9. Tool-to-UI Mapping Matrix

| Tool | CLI Block | CLI Component | Web StepCard | Web Viewer | Animation |
|------|-----------|--------------|--------------|------------|------------|
| `read_file` | `read` | `ReadBlock` | ✅ | `TerminalViewer` | useEntrance (30ms/line), useFlashOnMount (400ms) |
| `write_file` | `write` | `WriteBlock` → `DiffBlock` | ✅ | `DiffViewer` | useEntrance, useFlashOnMount, FM stagger |
| `edit_file` | `edit` | `DiffBlock` | ✅ | `DiffViewer` | useEntrance, useFlashOnMount, FM stagger |
| `run_shell` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `run_tests` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `list_files` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `search_code` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `web_search` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `web_fetch` | `read` | `ReadBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `git_status` | `command` | `CommandBlock` | ✅ | `TerminalViewer` | useEntrance, useFlashOnMount, FM stagger |
| `browser_navigate` | `browser-nav` | N/A (no dedicated) | ✅ | N/A | — |
| `browser_click` | `browser-interact` | N/A | ✅ | N/A | — |
| `browser_type` | `browser-interact` | N/A | ✅ | N/A | — |
| `browser_screenshot` | `browser-screenshot` | N/A | ✅ | `motion.img` | layoutId transition |
| `browser_snapshot` | `browser-inspect` | N/A | ✅ | `SnapshotTree` | Recursive tree expand |
| `browser_get_console_errors` | `browser-console` | N/A | ✅ | `ConsoleErrorList` | FM stagger (30ms) |
| `permission` | `permission` | `PermissionBlock` | N/A | `PermissionModal` | — |
| `todo` | `todo` | `TodoBlock` | N/A | `TodoCard` | FM pathLength + pulse scale |
| `summary` | `summary` | `ChangeSummaryBlock` | N/A | N/A (fallback) | — |
| `interrupt` | N/A | `InterruptBlock` | N/A | N/A | — |
| `error` | N/A | `ErrorBlock` | N/A | N/A | — |
| `system` | N/A | centered text | N/A | N/A | — |
| `build` | N/A | `BuildSummaryCard` | N/A | N/A | — |
| `stream` | N/A | inline text | N/A | streaming caret | CSS animate-pulse |

**Legend:** FM = Framer Motion

---

## 10. Watch Mode — File Monitoring Daemon

Watch Mode is a persistent background daemon (`packages/cli/src/core/watch-daemon.js:14`) that monitors the project for issues and auto-fixes them using a multi-layered analysis pipeline. It runs two concurrent detection loops and a three-stage per-file analysis.

### 10.1 Daemon Architecture

```
WatchDaemon(extends EventEmitter)
├── config: {
│    scanIntervalMs: 30_000   // full-repo scan interval
│    debounceMs: 400           // chokidar event debounce
│    maxFixesPerHour: 60       // auto-fix rate limit (env: MCODE_WATCH_MAX_AUTOFIX_PER_MIN)
│    autoCommit: false         // git auto-commit on successful fix
│    maxAttemptsPerFix: 3      // LLM retry budget per file
│    confirm: false            // require user confirmation before applying
│  }
├── watcher: chokidar instance (projectPath)
├── scanTimer: setInterval(scanOnce, scanIntervalMs)
├── _queue: Set (pending file paths)
├── _scanState: Map (path → mtimeMs for full sweep)
└── undoStack: shared with orchestrator for rollback
```

**Two detection loops:**

| Loop | Mechanism | Trigger | Purpose |
|------|-----------|---------|---------|
| **A. Event-driven** | `chokidar.watch(projectPath)` | `add`/`change`/`unlink` fs events | Immediate detection of edits |
| **B. Interval sweep** | `setInterval(scanOnce, 30000ms)` | Every 30s (initial sweep at 1500ms after start) | Catches pre-existing breakage and external edits missed by chokidar |

**Debounce:** Both loops funnel into `_queue` (a `Set`). `_drainQueue()` is debounced by 400ms and processes the batch atomically.

**Ignore patterns** (watch-daemon.js:11):
```
node_modules, .git, dist, build, coverage, .mcodeignore, *.lock, .mcode-fix-*
```
Plus patterns from `.mcodeignore` and `.gitignore` (loaded dynamically via `_loadIgnores()`).

### 10.2 Per-File Analysis Pipeline

```js
// analyzeFile(rel, lint=null) — watch-daemon.js:237-269
async analyzeFile(rel, lint = null) {
  // 0. If file was deleted:
  if (!stat) { emit(WATCH_CHANGE, {action: 'unlink'}); return; }
  
  // 1. Local lint pass — ZERO model cost
  const lintResult = lint || await this._lintFile(full);
  if (!lintResult.ok) {
    await this._applyFix(rel, lintResult.detail);  // → auto-fix
    return;
  }
  
  // 2. Static checks — zero-cost structural validation
  const staticIssues = await this._staticCheck(full);
  if (staticIssues.length > 0) {
    await this._applyFix(rel, staticIssues.join('\n'));
    return;
  }
  
  // 3. Test impact — run related tests
  const testResult = await this._runRelatedTests(rel);
  if (!testResult.passed) {
    await this._applyFix(rel, `failing tests:\n${testResult.output}`);
    return;
  }
  
  // 4. All clear
  emit(WATCH_SCAN, {outcome: 'no-issues', file: rel});
}
```

**Stage 1 — Local lint** (`_lintFile`, watch-daemon.js:271-288):
Runs `eslint <file> --fix-dry-run --format json` if eslint binary found at `node_modules/.bin/eslint(.cmd on Windows)`. Returns `{ok: true}` or `{ok: false, detail: "line:col message\\n..."}` (max 6 errors). Falls back to `{ok: true}` if no local eslint.

**Stage 2 — Static checks** (`_staticCheck`, watch-daemon.js:290-328):

| Extension | Checks | Tools Used |
|-----------|--------|------------|
| `.js` / `.jsx` / `.mjs` / `.cjs` | Unresolved relative imports (`extractImports()` → resolve against `spec`, `spec.js`, `spec/index.js`, `spec/index.jsx`) | `fs.stat` only |
| `.ts` / `.tsx` | TypeScript errors matching `error TS\d` | `tsc --noEmit` (if available) |
| `.html` | Unbalanced tags (count non-void opening vs closing) | Regex only |
| `.css` | Brace balance (`{` count vs `}` count) | Regex only |

**Stage 3 — Test impact** (`_runRelatedTests`, watch-daemon.js:330-361):

```js
// Finds test file by convention, runs npm test
const base = rel.replace(/\.(jsx?|tsx?|mjs)$/, '');
const candidates = [`${base}.test.js`, `${base}.spec.js`, `${base}.test.jsx`, `${base}.spec.jsx`];
const testFile = first existing candidate;
// Checks package.json for "test" script — if missing, skip (treated as pass)
const { stdout, stderr } = await execa('npm', ['test', '--', relativeTestFile], { timeout: 120_000 });
return { passed: !/FAIL|failed|✗|✖|Missing script/i.test(output), output: output.slice(-1200) };
```

### 10.3 AI Auto-Fix Engine

When any stage detects an issue, `_applyFix(rel, errorContext)` is called (watch-daemon.js:363-466):

```js
async _applyFix(rel, errorContext) {
  // Rate limit: max fixes per hour
  if (this.fixTimestamps.length >= this.config.maxFixesPerHour) return;
  
  // Model assignment: router.pick('bugfix') — uses domains.js DEFAULT_ROUTING.bugfix
  const assignment = await this.router?.pick('bugfix');
  if (!assignment) return;  // no model available
  if (assignment.provider.id === 'mock') return;  // skip mock — no real fix possible
  
  const source = await readFile(full, 'utf8');
  let fixed, attempts = 0, verified = false;
  
  while (attempts < 3 && !verified) {
    attempts++;
    const res = await assignment.provider.complete(model.id, {
      messages: [
        { role: 'system', content: `BUGFIX\nFix: ${errorContext}\nFile: ${rel}` },
        { role: 'user', content: `CURRENT CONTENT:\n${source.slice(0, 8000)}` }
      ],
      temperature: 0.1,
      reasoning: this.router?.reasoning || null
    });
    const candidate = extractFixedContent(res.text);  // accepts plain text or JSON envelope
    
    verified = await this._verifyFix(full, candidate, source);
    if (!verified) errorContext += `\nPrevious attempt failed (attempt ${attempts}).`;
    else fixed = candidate;
  }
  
  if (verified) {
    if (this.config.confirm) await this.confirmHandler({file: rel, candidate: fixed});
    await this.undoStack.snapshot(rel, source);  // save before-state
    await writeFile(full, fixed);                 // apply
    this.fixesApplied++;
    
    // Post-write verification
    const postLint = await this._lintFile(full);
    const postStatic = await this._staticCheck(full);
    if (!postLint.ok || postStatic.length > 0) {
      emit(WATCH_FIX, {outcome: 'needs-review', detail: 'still failing after fix'});
    } else {
      emit(WATCH_FIX, {outcome: 'auto-fixed'});
      if (this.config.autoCommit) await this._autoCommit(rel);
    }
  }
}
```

**Verification gates** (`_verifyFix`, watch-daemon.js:468-497) — ALL must pass:

```js
async _verifyFix(full, candidate, source) {
  const tmp = join(tmpdir(), `.mcode-fix-${Date.now()}-${basename(full)}`);
  await writeFile(tmp, candidate);
  try {
    if (candidate.trim() === source.trim()) return false;  // no-op echo
    const issues = await this._staticCheck(tmp);            // structural gate
    if (issues.length > 0) return false;
    if (this._eslintBin) {                                  // lint gate
      const { stdout } = await execa(eslint, [tmp, '--format', 'json']);
      const errors = JSON.parse(stdout).flatMap(r => r.messages.filter(m => m.severity === 2));
      if (errors.length > 0) return false;
    }
    return true;
  } finally {
    await rm(tmp, { force: true });
  }
}
```

### 10.4 Events & Socket Bridge

The WatchDaemon emits events via `this.bus` (the orchestrator EventEmitter, which is also the Socket.IO emitter):

| Client→Server Socket Event | Event Constant | Payload |
|---------------------------|----------------|---------|
| `watch:status` | `WATCH_STATUS` | `'active' \| 'stopped'` |
| `watch:scan` | `WATCH_SCAN` | `{projectId, filesScanned, timestamp}` |
| `watch:change` | `WATCH_CHANGE` | `{projectId, file, action: 'add'\|'change'\|'unlink'}` |
| `watch:fix` | `WATCH_FIX` | `{projectId, file, outcome, detail}` |

**Outcome values** (`WATCH_OUTCOMES`, events.js:48-52):
- `'auto-fixed'` — fix applied and verified clean
- `'no-issues'` — file passed all checks
- `'needs-review'` — fix failed verification, rate-limited, or no model

### 10.5 CLI ↔ Web Watch Integration

**CLI (`App.jsx:680-721`):** `/watch on|off|status|logs|undo` command handler:
- `on` → `orchestrator.startWatch()` — creates WatchDaemon, starts chokidar + interval
- `off` → `orchestrator.stopWatch()` — stops watcher, clears interval
- `status` → reports `watchStatus`, `maxFixesPerHour`, `debounceMs`, `scanIntervalMs`
- `logs` → shows last 20 activity entries from `watchDaemon.activity`
- `undo` → `orchestrator.undoWatch()` — rolls back last watch fix via undoStack

**CLI StatusBar (`StatusBar.jsx`):** Shows `●` spinner (green if active, gray if stopped) + `watching` label when `watchStatus === 'active'`.

**Web:** Currently no watch-mode UI in the web IDE. Watch events (`watch:scan`, `watch:change`, `watch:fix`, `watch:status`) are in the `SOCKET.CLIENT_TO_SERVER` map but no frontend component subscribes. The web would need a `WatchPanel.jsx` and `useChatSocket.js` listeners as part of future implementation.

---

## 11. Security & Risk System

Security is enforced at three layers: **secret redaction** (prevents secrets from appearing in terminal output), **risk scoring** (grades each tool call by danger level), and **audit logging** (persisted chronological record of all operations).

### 11.1 Secret Redaction

Defined in `packages/cli/src/core/security.js` — 10 regex patterns covering common secret formats:

```js
SECRET_PATTERNS = [
  // OpenAI / Claude API keys: sk-..., sk-proj-...
  /\bsk-[A-Za-z0-9-_]{20,}/g,
  /\bsk-proj-[A-Za-z0-9-_]{20,}/g,
  // GitHub tokens: ghp_, gho_, ghs_, ghu_
  /\bg[ghps]p?_?[A-Za-z0-9]{36}/g,
  // AWS access keys: AKIA...
  /\bAKIA[A-Z0-9]{16}/g,
  // Slack tokens: xox[bpoa]-...
  /\bxox[bpoa]-[A-Za-z0-9-]{10,}/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  // URL-embedded credentials: scheme://user:pass@host
  /(https?:\/\/)([^:]+):(.+)@([^/@\s]+)/gi,
  // env-style KEY=value
  /(api[_-]?key|secret|password|passwd|token|access[_-]?key|private[_-]?key)\s*=\s*(['"]?)([^\s'"&;]+)/gi,
  // export VAR=value
  /export\s+(\w+)\s*=\s*(['"]?)([^\s]+)/gi,
]
```

**Redaction behavior** (`redactSecrets`, security.js:27-53):
- For URL credentials: replaces password only, keeps `protocol://user:***REDACTED***@host`
- For env-style `KEY=value`: replaces value only, keeps `KEY=***REDACTED***`
- For export statements: `export VAR=***REDACTED***`
- For simple patterns (API keys, tokens): if match > 16 chars, shows first 8 + `***REDACTED***` + last 8; otherwise fully replaces
- Redaction marker: `***REDACTED***`

**Applied in:** `ToolExecutor` wraps all tool outputs before they reach the UI bus. Both CLI and web surfaces receive pre-redacted output.

### 11.2 Risk Scoring

```js
RISK_LEVELS = { SAFE: 'safe', LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' }

scoreRisk(operation, details) → { score: 0-10, level: RISK_LEVELS }
```

**Shell risk scoring:**

| Command Pattern | Score | Level |
|----------------|-------|-------|
| `rm -rf /` or `rm -rf ..` | 10 | CRITICAL |
| `dd ... /dev/sd` | 10 | CRITICAL |
| `mkfs` | 9 | CRITICAL |
| `format :X` | 9 | CRITICAL |
| `shutdown` / `reboot` / `halt` | 8 | CRITICAL |
| `eval` / `exec` | 6 | HIGH |
| `curl` / `wget` | 4 | MEDIUM |
| `gpg` / `sudo` / `su` | 5 | HIGH |
| `git push` | 3 | LOW |
| `ls` / `cat` / `grep` / `find` | 1 | LOW |
| (other) | 3 | LOW |

**File operation risk:**

| Operation | Path Condition | Score | Level |
|-----------|----------------|-------|-------|
| `edit_file` / `write_file` | `package.json` or `tsconfig` | 4 | MEDIUM |
| `edit_file` / `write_file` | `src/*.js` | 3 | LOW |
| `edit_file` / `write_file` | `config` or `.env` | 6 | HIGH |
| `edit_file` / `write_file` | (other) | 2 | LOW |
| `delete_file` / `rm` | — | 7 | HIGH |
| `read_file` | — | 0 | SAFE |

**Network operations:** `web_search` (score 2, LOW), `web_fetch` (score 3, LOW)

### 11.3 Audit Logging

`AuditLog` class in `packages/cli/src/core/audit.js` — persists a chronological record to `~/.mcode/audit/<projectId>.json` (max 500 entries, FIFO eviction).

```js
class AuditLog {
  constructor({ projectId = 'default', maxEntries = 500 })
  log(entry)              // generic: { type, operation, risk, decision, ...details }
  logToolCall(op, details)   // → calls scoreRisk(), logs {type: 'tool_call', risk, riskScore, ...details}
  logPermission(op, decision, details) // → logs {type: 'permission', decision, ...details}
  logFileChange(action, path, details) // → calls scoreRisk(), logs {type: 'file_change', action, file, risk, ...details}
  recent(n=50)             // returns entries reversed (newest first)
  byRisk(level)            // filters by RISK_LEVELS label
}
```

Each entry has: `id` (timestamp-based), `timestamp` (ISO), `risk` (RISK_LEVELS label), `riskScore` (0-10), plus operation-specific fields.

**CLI usage:** `/audit` command (App.jsx:761-779) fetches `orchestrator.auditLog?.recent(20)` and displays as formatted list:
```
14:23:01 tool_call [low] shell ls -la
14:23:05 file_change [medium] edit_file src/App.jsx
```

### 11.4 Network Whitelist

`isNetworkAllowed(url, whitelist)` (security.js:58-72):
- `whitelist` is an array of domain substrings or glob patterns (`*.example.com`)
- Empty/`null` whitelist = allow all (backward compatible)
- Converts glob `*` to `.*` regex for matching
- Used by `web_search` and `web_fetch` tools to restrict network access

---

## 12. Auth & API Key Management

Authentication spans two surfaces: **CLI** (local `~/.mcode/config.json` with provider API keys) and **Web** (Express server with JWT + bcrypt + AES-256-GCM).

### 12.1 CLI Authentication

CLI auth is configuration-based, not session-based:

```
~/.mcode/config.json:
  {
    mode: "high",
    account: { email: "...", name: "..." },
    providers: { openai: { apiKeyEnvVar: "OPENAI_API_KEY" } },
    apiKeys: {
      "openai": "sk-...",
      "anthropic": "sk-ant-...",
      ...
    }
  }
```

- API keys stored in config file (redacted in display)
- `ProviderWizard.jsx` — guided setup flow: detects installed providers, prompts for keys, validates via `adapter.testKey()`
- Keys are never persisted to the backend from CLI — CLI uses them locally via `getProviders()` factory

### 12.2 Web Backend Authentication

**JWT tokens** (`packages/backend/src/auth.js:1-38`):
```js
signTokens(userId, { secret, accessTtl = '15m', refreshTtl = '30d' })
verifyToken(token, secret)
authMiddleware({ secret })  // Bearer token check on all /api/v1/* routes
```

| Token Type | TTL | Purpose |
|------------|-----|---------|
| Access | 15 min | API requests (sent as Bearer header) |
| Refresh | 30 days | Exchange for new access token at `/api/v1/auth/refresh` |

**Password hashing:** `bcryptjs` with 10 rounds (`hashPassword`, `verifyPassword`)

**OTP flow** (`packages/backend/src/routes/auth.js:26-103`):
```
POST /api/v1/auth/send-otp  → 6-digit code (randomInt 0-999999)
  ├── Rate limited: 5 sends per 10-minute window per email
  ├── Code hashed with bcrypt → stored in `otp` collection with 10-min TTL
  ├── Email sent via nodemailer (dev mode returns code in response)
  └── intent: 'signup' or 'login'

POST /api/v1/auth/verify-otp
  ├── Checks OTP not expired + attempts < 5
  ├── bcrypt.compare(otp, storedHash)
  ├── On success: creates/finds user, deletes OTP, signs JWT tokens
  └── On signup: creates user {email, passwordHash, name, plan: 'free', settings: {...}}
```

**User settings** (MongoDB `userSettings` collection):
```js
{
  allowShellAll: false,        // skip shell permission prompts
  requireEditApproval: true,   // prompt before file edits in agent mode
  networkWhitelist: [],        // empty = allow all
  godModeDefaults: { quality: 'max', mode: 'god' },
  watchDefaults: { maxFixesPerHour: 60, autoCommit: false },
  modelOverrides: {}           // per-provider model overrides
}
```

### 12.3 API Key Encryption (Backend)

API keys are never stored plaintext in MongoDB. `packages/backend/src/secret-enc.js` uses AES-256-GCM:

```js
// Key derivation: unique per user, derived from server secret + user ID
deriveMasterKey(secret, userId)
  → scryptSync(`mcode-apikey:${userId}:${secret}`, 'mcode', 32)

// Encryption: AES-256-GCM with random salt + IV per key
encryptKey(plain, masterKey)
  → salt = randomBytes(16)
  → iv = randomBytes(12)
  → key = scryptSync(masterKey.toString('hex'), salt, 32)
  → cipher = createCipheriv('aes-256-gcm', key, iv)
  → blob = base64(MAGIC + salt + iv + authTag + encrypted)

// Decryption: extracts salt/iv/tag from blob, re-derives key
decryptKey(blob, masterKey)

// Display masking: shows first 4 + •••••••• + last 4
maskSecret(value)
  → "sk-1234••••••••••5678"
```

**Storage format:** `MCCODEKEY:` prefix + base64 blob containing salt(16) + IV(12) + authTag(16) + ciphertext

**API key routes** (`packages/backend/src/routes/keys.js`):

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /keys` | ✅ | List user's saved keys (masked) |
| `POST /keys` | ✅ | Save a new encrypted key |
| `DELETE /keys/:id` | ✅ | Delete a key |
| `GET /keys/models` | ✅ | List all available models from configured providers (uses CLI's `getAllAdapters`) |
| `POST /keys/test` | ✅ | Verify a key against a provider |

### 12.4 GitHub OAuth

The CLI auth route uses a token-as-state pattern:
1. User visits GitHub OAuth URL with `state=<jwt_token>`
2. GitHub redirects to callback with `code`
3. Backend exchanges `code` for GitHub access token
4. The `state` JWT is decoded to identify the user
5. GitHub token stored encrypted alongside API keys

### 12.5 Auth Routes Summary

```
POST /api/v1/auth/send-otp    → sends 6-digit code (5/hour rate limit)
POST /api/v1/auth/verify-otp  → verifies code, creates account or logs in
POST /api/v1/auth/signup      → direct signup (no OTP)
POST /api/v1/auth/login       → direct login (password)
POST /api/v1/auth/refresh     → exchanges refresh token for new access token
GET  /api/v1/auth/me          → user profile + settings
PATCH /api/v1/auth/me         → update name/settings
DELETE /api/v1/auth/me        → delete account + all data
POST /api/v1/auth/change-password → requires currentPassword + newPassword (min 8 chars)
```

---

## 13. CLI Commands Reference

The CLI exposes **33 slash commands** via `handleSlash()` in `App.jsx:540-1034`, with autocomplete defined in `InputLine.jsx:6-42` and fuzzy search in `CommandPalette.jsx`.

### 13.1 Command List (Alphabetical)

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/agents` | — | List active subagents with status, domain, and current message |
| `/analytics` | — | Open build analytics web view (modal) |
| `/audit` | — | Show last 20 audit log entries with risk levels |
| `/bugfix` | — | Toggle watch daemon (alias for `/watch on/off`) |
| `/clear` | — | Clear all chat messages |
| `/compliance` | — | Fetch compliance report from backend (success rate, violations) |
| `/connect` | — | Open provider connection wizard modal |
| `/context` | — | Show current context: model, mode, providers, watch status, root path |
| `/copy` | — | Copy last assistant response to clipboard |
| `/customize` | `icons [set] \| font [size] \| layout [preset]` | Customize icons, font size, or layout |
| `/diff` | — | Show pending file changes modal |
| `/exit` | — | Exit the application |
| `/export` | `markdown \| json` | Export session to `mcode-session-<timestamp>.md` or `.json` |
| `/god` | `<prompt>` | Plan and build — enters god-mode with parallel subagents |
| `/help` | — | List all available commands |
| `/history` | — | Show last 10 commands from session history |
| `/hooks` | — | Show active workflow hooks from `.mcode/hooks.js` |
| `/init` | — | Guided AGENTS.md setup |
| `/logout` | — | Clear local auth token |
| `/models` | — | Open model/provider selection modal |
| `/mode` | `low \| medium \| high \| extra \| max \| god` | Set reasoning quality level |
| `/plan` | — | Show current plan todos with status and domain |
| `/record` | `stop` | Start or stop macro recording |
| `/replay` | `<n>` | Replay recorded macro #n |
| `/resume` | — | Resume last interrupted build session |
| `/rollback` | — | Undo all pending changes |
| `/scheme` | `default \| blue \| purple \| amber \| red \| teal \| mono` | Set color accent scheme |
| `/security` | — | Show network whitelist, secret redaction status, shell sandbox status |
| `/stack` | — | Detect and display tech stack (frontend/backend/db/test/build/langs) |
| `/theme` | — | Cycle color theme (dark → light → opencode) |
| `/ui-mode` | `<mode>` | Set special UI mode (zen/focus/presentation/batch/daemon/service/...) |
| `/undo` | — | Revert last file change via undoStack |
| `/watch` | `on \| off \| status \| logs \| undo` | Watch daemon control: start, stop, status, logs, or undo last fix |
| `/workspaces` | — | List team workspaces from backend |

### 13.2 Quality Modes

From `packages/cli/src/core/router.js:8-31`:

| Mode | Description | Effort | Thinking Budget |
|------|-------------|--------|-----------------|
| `low` | cheap & fast | low | 1,000 |
| `medium` | balanced | medium | 2,000 |
| `high` | strong | high | 4,000 |
| `extra` | powerful | high | 8,000 |
| `max` | frontier | high | 16,000 |
| `god` | absolute best | high | 32,000 |

### 13.3 Special UI Modes

From `packages/cli/src/core/modes.js:5-16`:

| Mode | Icon | Affects |
|------|------|---------|
| `learning` | `゜` | show-steps, verbose-explanation |
| `competition` | `⏱` | timer-display, speed-focus |
| `zen` | `静` | minimal-ui, hide-sidebar, hide-agent-strip |
| `focus` | `🔒` | hide-toasts, hide-agent-strip, full-width-input |
| `presentation` | `ⅎ` | large-font, center-align, minimal-colors |
| `debug` | `⧧` | show-debug-panel, verbose-logs, show-raw-events |
| `silent` | `🔕` | suppress-info, errors-only, quiet-mode, hide-toasts |
| `batch` | `⚖` | auto-approve, no-prompts, log-to-file |
| `daemon` | `※` | background-mode, minimal-foreground, daemon-pid |
| `service` | `⚙` | service-mode, stdout-logs-disabled, syslog |

### 13.4 Theme System

**`packages/cli/src/ui/themes.js`:**
- **3 base themes:** `dark`, `light`, `opencode` (OpenCode-inspired)
- **7 color schemes:** `default`, `blue`, `purple`, `amber`, `red`, `teal`, `mono`
- **3 icon sets:** `unicode` (✓ ✗ ● ⚠), `ascii` ([ok] [x] [o] [!]), `nerd` (nerd-font glyphs)
- **4 font sizes:** `compact` (0.85x), `normal` (1.0x), `large` (1.25x), `xlarge` (1.5x)
- **3 layout presets:** `compact`, `balanced`, `spacious`

**`packages/cli/src/ui/theme.js`:** Mutable theme proxy — components read `theme.text`, `theme.bg`, etc. `setThemeVersion()` triggers re-render. Theme changes are reactive: components reference the live proxy, not a snapshot.

### 13.5 CommandPalette

`packages/cli/src/ui/CommandPalette.jsx` — activated via `Ctrl+P`:
- Fuzzy search over all 33 `SLASH_COMMANDS`
- `useEntrance` staggered reveal (30ms per item)
- `useKeyboard` for navigation (↑/↓/Enter/Esc)
- Shows command name + description
- On select: calls `handleSlash()` with the command

### 13.6 StatusBar Integration

`packages/cli/src/ui/StatusBar.jsx:122` — responsive status bar:

| termWidth | Shows |
|-----------|-------|
| `< 90` | mode + model + context bar |
| `90–99` | + providers count, agents count, elapsed |
| `100–119` | + cwd (basename), branch, git dirty |
| `120–139` | + cost ($X.XX), latency (Xs), token in/out |
| `≥ 140` | + full cwd path |

**Context bar:** 8-char `████░░░░` bar with animated percentage via `useAnimatedProgress` (160ms smooth interpolation).

**Generating state:** Shows `·· ████ esc interrupt` instead of normal info when `isGenerating === true`.

### 13.7 Provider Configuration & Model Routing

**Provider setup:** Users set API keys via environment variables or the CLI's `ProviderWizard.jsx`. Env var names follow the pattern `<PROVIDER>_API_KEY` (uppercase provider ID + `_API_KEY`):

```bash
# Set these in your shell profile (~/.bashrc, ~/.zshrc, etc.)
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENROUTER_API_KEY="sk-or-v1-..."
export GROQ_API_KEY="gsk_..."
export DEEPSEEK_API_KEY="sk-..."
export GOOGLE_API_KEY="AI..."
export MISTRAL_API_KEY="mistral_..."
export COHERE_API_KEY="..."
export VERTEX_CREDENTIALS="..."     # JSON key file path
export BEDROCK_CREDENTIALS="..."    # AWS credentials
```

**CLI authentication:** `ProviderWizard.jsx` (triggered via `/connect`) — detects installed providers, prompts for keys, validates via `adapter.testKey()`, then saves to `~/.mcode/config.json` under `providers`. The keys are read from env vars at runtime via `getProviders()` in `packages/cli/src/providers/`.

**Model routing** (`packages/cli/src/core/router.js:37-50` + `packages/shared/src/domains.js:39-88`):

The `ModelRouter.pick(domain)` method selects the best available provider+model for a task type:

```js
// DEFAULT_ROUTING from domains.js — tries top-down, picks first available
routing = {
  planning:   ['deepseek:deepseek-v4-pro', 'openai:gpt-5.5', 'anthropic:claude-sonnet-5', 'mock:mock'],
  frontend:   ['qwen:qwen-3.8-max', 'openai:gpt-5.6-luna', 'deepseek:deepseek-v4-flash-0731', 'mock:mock'],
  backend:    ['deepseek:deepseek-v4-flash-0731', 'deepseek:deepseek-v4-pro', 'mistral:codestral', 'mock:mock'],
  db:         ['deepseek:deepseek-v4-pro', 'qwen:qwen-3.8-max', 'openai:gpt-5.6-luna', 'mock:mock'],
  devops:     ['groq:llama-3.3-70b-versatile', 'groq:llama-3.1-8b-instant', 'mistral:mistral-medium-3.5', 'mock:mock'],
  test:       ['groq:llama-3.1-8b-instant', 'deepseek:deepseek-v4-flash-0731', 'deepseek:deepseek-v4-pro', 'mock:mock'],
  docs:       ['google:gemini-3.6-flash', 'openai:gpt-5.6-luna', 'qwen:qwen-3.7-flash', 'mock:mock'],
  bugfix:     ['deepseek:deepseek-v4-flash-0731', 'groq:llama-3.3-70b-versatile', 'anthropic:claude-haiku-4-5', 'mock:mock']
}
```

**God-mode model assignment:** In god-mode (`/god <prompt>`), each subagent's todo is assigned a domain. `ModelRouter.pick(todo.domain)` selects the model. This means frontend todos go to `qwen:qwen-3.8-max`, backend todos go to `deepseek:deepseek-v4-flash-0731`, etc. — **different models work on different parts of the stack in parallel.**

**Mode-based model override:** The quality mode (set via `/mode`) maps to reasoning budgets in `router.js:24-31`:
- `god` mode: 32K reasoning budget → uses the highest-scoring model per domain
- `low` mode: 1K reasoning budget → uses cheapest available model

**Provider availability check:** `adapter.isAvailable()` checks if the env var is set + can reach the API. Unavailable providers are skipped. If NO providers are available, the `mock:mock` fallback is used (responds with placeholder text).

**Dynamic model selection with multiple API keys (`ModelRouter.pick`, router.js:83-133):**

When the user has 15+ API keys set, the router selects the best model per domain in 3 stages:

```
pick(domain)
  Stage 1: Explicit override
    → Check config.roles[domain] or config.roles.build for user-specified preferred model
    → If found AND not rate-limited: RETURN immediately (user's explicit choice wins)

  Stage 2: Routing preference list (DEFAULT_ROUTING[domain])
    → Iterate top-down: ['deepseek:deepseek-v4-pro', 'openai:gpt-5.5', ...]
    → For each ref: split into [providerId, modelId]
      → Check provider.isAvailable()  (env var set + API reachable)
      → Check ledger.isRateLimited(providerId)  (skip rate-limited)
      → Check provider.listModels() → find matching modelId
      → RETURN first match (highest preference that's available)

  Stage 3: Fallback — highest-scoring model from ANY provider
    → Iterate ALL available providers
    → For each model: score = entry.scores[domain] ?? 0
    → RETURN model with highest score (model capability ranking)
```

**Key insight for god-mode parallelism:** Each subagent gets its own `ModelRouter.pick(todo.domain)` call. With 15 API keys, a god-mode build with 10 todos might simultaneously use:
- `qwen:qwen-3.8-max` for frontend subagent
- `deepseek:deepseek-v4-flash-0731` for backend subagent
- `groq:llama-3.1-8b-instant` for test subagent
- `anthropic:claude-sonnet-5` for planning subagent

Different models work on different parts of the stack **in parallel**, selected by their `scores[domain]` capability rating.

**Model catalog** (`ModelRouter.catalog`, router.js:136-154): Lists ALL available models across all providers, annotated with `bestDomain` and `bestScore` — used by the `/models` command to show the user what's available.

**User model overrides:** Users can set explicit model preferences in `~/.mcode/config.json`:
```json
{
  "roles": {
    "build": { "preferredModels": ["anthropic:claude-sonnet-5"] },
    "frontend": "qwen:qwen-3.8-max",
    "backend": "deepseek:deepseek-v4-flash-0731"
  }
}
```

**Rate limiting & cost tracking:** `CostLedger` tracks RPM/TPM per provider. `ledger.isRateLimited(providerId)` skips providers that hit their rate limit. `orchestrator.config.cost.budgetPerRunUsd` (default $2.00) stops execution when exceeded.

**Theme note — "opencode zen":** The `opencode` theme (one of 3 base themes in `themes.js:90-131`) is inspired by OpenCode's dark aesthetic — `#09090b` background with `#86efac` (emerald) accents. Combined with the `zen` special UI mode (§6.2), this gives a distraction-free terminal experience.

---

## 14. Web Pages & Routes

The web IDE (`packages/web/`) uses React 19 + React Router v6 with 8 routes:

### 14.1 Route Map

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `LandingPage` | Public landing — hero, features, CTA |
| `/ai` | `AILandingPage` | AI-focused landing — provider features |
| `/ai/chat` | `AIChatPage` | Main IDE — 3-panel design/chat/agent layout |
| `/cli` | `CLIPage` | Terminal emulator demo of CLI |
| `/login` | `LoginPage` | Login with email+password or OTP |
| `/signup` | `SignupPage` | Signup with email+password+name |
| `/forgot-password` | `ForgotPasswordPage` | Password reset via OTP |
| `/settings` | `SettingsPage` | User settings, API keys, provider config |

### 14.2 AIChatPage.jsx — Chat IDE

`packages/web/src/pages/AIChatPage.jsx` — The main IDE page with a 3-tab interface:

```
AIChatPage
├── Redux store (chatSlice) — messages, plan/todos, permission, design state
├── Socket.IO client (useChatSocket) — real-time event bridge
├── Framer Motion animations — staggered children, tab transitions
├── Sidebar (left) — todos, steps, model selector
├── Main content (center) — 3 tabs:
│   ├── DesignTab — HTML design generator with preview
│   ├── Chat messages — scrollable message list
│   └── AI Code Agent — step cards with tool results
└── TerminalPane (bottom) — xterm.js terminal output
```

**Key state in Redux `chatSlice.js`:**
- `messages` — array of `{id, role, content, status, blocks[]}` with `replaceKey` upsert
- `plan` — `{todos: [{id, title, status, domain}], summary}`
- `permission` — `{requestId, operation, details}` for permission modals
- `design` — `{html, css, js}` for DesignTab generator
- `currentModel`, `streaming`, `isProcessing` flags

**Slash command handling (Bug #21):** `handleSubmit(e)` checks for `/` prefix → calls `handleSlashCommand()` → dispatches to Redux or emits socket event. Currently **non-functional** — `/api/v1/slashCommands.js` needs to be created.

### 14.3 IDE Components (React)

#### TodoCard.jsx (`packages/web/src/components/ide/TodoCard.jsx`)

Fixed animations:
```jsx
<motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}}>
  {/* Checkbox — pathLength draw-in animation */}
  <motion.svg><motion.path
    d="M5 9l5 5 5-5"
    initial={{pathLength:0, opacity:0}}
    animate={{pathLength:1, opacity:1}}
    transition={{duration:0.3, ease:"easeOut"}}
  /></motion.svg>

  {/* In-progress pulsing dot */}
  <motion.div
    className="w-2 h-2 rounded-full bg-emerald-400"
    animate={{scale:[1,1.5,1], opacity:[1,0.5,1]}}
    transition={{duration:1.5, repeat:Infinity}}
  />

  {/* Done checkmark with spring pop */}
  <motion.div
    initial={{scale:0}} animate={{scale:1}}
    transition={{type:"spring", stiffness:400, damping:20}}
  >
    <CheckCircle2 />
  </motion.div>
</motion.div>
```

#### StepCards.jsx (`packages/web/src/components/ide/StepCards.jsx`)

Dispatches by `msg.kind` / `msg.tool`:
- `read_file` / `web_fetch` → `TerminalViewer` (renders `msg.output` or `msg.lines`)
- `write_file` / `edit_file` → `DiffViewer` (renders diff hunks)
- `run_shell` / `run_tests` / `list_files` / `search_code` / `web_search` → `TerminalViewer`
- `browser_screenshot` → `motion.img` with `layoutId` transition
- `browser_snapshot` → `SnapshotTree` (recursive tree)
- `browser_get_console_errors` → `ConsoleErrorList` (Framer Motion stagger)

**Fixed:** `search_code`, `web_search`, and `web_fetch` were missing from `TerminalViewer` render conditions — added in StepCards.jsx.

#### EditorPane.jsx

Code editor with syntax highlighting via `react-syntax-highlighter`. Supports:
- Dark theme (`one-dark-pro`)
- Line highlighting for diff context
- Copy to clipboard button

#### TerminalPane.jsx

xterm.js terminal with:
- Custom theme (emerald + blue palette)
- `FitAddon` for responsive sizing
- `disableStdin: true` (output-only display)
- `processedRef` Set to avoid reprocessing messages

#### DesignTab.jsx

HTML design generator:
- Three editable panes: HTML, CSS, JS
- Live preview iframe
- Export to file button

### 14.4 Web Animation System

From `z-code-ui-system-spec.md:1286-1318` — Web uses Framer Motion exclusively:

| Component | Animation | Duration |
|-----------|-----------|----------|
| StepCard | `motion.div` fade-up entrance | 200ms |
| StepCard status icon | `AnimatePresence` cross-fade | instant |
| StepCard expand | height 0↔auto variants | 200ms ease-in-out |
| TodoCard | spring scale pop | 300ms spring |
| TodoCard checkbox | `motion.path pathLength` | 300ms ease-out |
| TodoCard dot | CSS `animate-pulse` | 1s repeat |
| TerminalViewer | `staggerChildren` | 15ms/line |
| DiffViewer | line stagger + x offset | 30ms/line |

### 14.5 useChatSocket.js

`packages/web/src/hooks/useChatSocket.js` — Socket.IO client bridge to Redux:

```
Socket.IO connection (/live namespace)
├── socket.on('chat:ready') → dispatch({type:'chat/ready'})
├── socket.on('chat:stream') → dispatch({type:'chat/stream', text})
├── socket.on('chat:message') → dispatch({type:'chat/message', msg})
├── socket.on('chat:tool_call') → dispatch({type:'chat/toolCall', data})
├── socket.on('chat:permission') → dispatch({type:'chat/setPermission', data})
├── socket.on('chat:todo_plan') → dispatch({type:'chat/setPlan', data})
├── socket.on('chat:todo_update') → dispatch({type:'chat/todoUpdate', data})
├── socket.on('chat:done') → dispatch({type:'chat/done'})
├── socket.on('chat:error') → dispatch({type:'chat/error', msg})
├── socket.on('chat:shell_stream') → dispatch({type:'chat/shellStream', data})
├── socket.on('chat:undo_result') → dispatch({type:'chat/undoResult', data})
├── socket.on('design:stream') → dispatch({type:'chat/designStream', html})
└── socket.on('design:done') → dispatch({type:'chat/designDone'})
```

**Emit events:** `chat:send` (prompt + mode), `chat:permission_answer` (requestId + answer), `chat:interrupt`, `chat:undo`

---

## 15. Remaining Fixes (4 Open Bugs)

### Bug #18 — Undo reverts wrong file
**Status:** ⚠️ Open — 8 changes needed across 5 files

The `undoId` is never threaded from `UndoStack.snapshot()` to the frontend's undo button. `UndoStack.undo()` always `pop()`s the last entry. When multiple StepCards are edited, clicking "Undo" on an older card reverts the most recent change instead.

**Fix chain (full detail in `00-gaps-and-missing-deps.md:268-282`):**
1. `tools.js:snapshot()` → generate + return `id`
2. `tools.js:undo()` → accept optional `id` param
3. `tools.js:write_file()` → capture `undoId` from result
4. `tools.js:edit_file()` → capture `undoId` from result
5. `chat-agent.js:_blockMeta()` → include `undoId: result?.undoId`
6. `StepCards.jsx` → `undo?.(msg)` (pass full msg with undoId)
7. `useChatSocket.js` → emit `{undoId: msg?.undoId}` with `chat:undo`
8. `sockets.js:184` → `session.undoStack.undo(payload?.undoId)`

### Bug #21 — Slash commands button has no onClick
**Status:** ⚠️ Open — 2 files, client-side only

**Web `/api/v1/slashCommands.js`** (new file): Defines `WEB_SLASH_COMMANDS` (subset of CLI's 33 commands) + `handleSlashCommand(cmd, dispatch, socket)`. Covers `/clear`, `/help`, `/model`, `/god`, `/undo`, `/watch`.

**Wire-up in `AIChatPage.jsx`:** `handleSubmit(e)` calls `handleSlashCommand` when prompt starts with `/` before `send()`.

**Button onClick:** Both slash buttons (lines 549 and 680) currently have `className` with `title="Command Palette (/)"` but no `onClick`. Add `onClick={() => setPrompt('/')}` to open the command palette / trigger slash autocomplete.

**CLI equivalent:** App.jsx:540 `handleSlash()` with 33-command switch, InputLine.jsx:6-42 `SLASH_COMMANDS` array with fuzzy autocomplete, CommandPalette.jsx with fuzzy search.

### Bug #22 — Planner runs on every agent-mode message
**Status:** ⚠️ Open — 1 heuristic function + 1 conditional

**Root cause:** `chat-session.js:225-229` — `planner.plan(prompt)` is called unconditionally inside `runAgent()`:
```js
const planner = new Planner({ router: this.router, bus: this.bus });
plan = await planner.plan(prompt, { repoContext: '' });
this.onEvent(S2C.CHAT_TODO_PLAN, { todos: plan.todos, summary: plan.summary });
```

**Fix:** Add `promptNeedsPlanning(prompt)` heuristic — returns false for short prompts (< 50 chars) or prompts matching simple-pattern regex (`/^(fix|update|change|add|remove)/i`). Only run planner if heuristic returns true.

```js
const SIMPLE_PROMPT_RE = /^(fix a typo|update the readme|change the title|add a comment)/i;
function promptNeedsPlanning(prompt) {
  if (!prompt || prompt.length < 50) return false;
  if (SIMPLE_PROMPT_RE.test(prompt)) return false;
  return true;
}
```

**CLI equivalent:** The CLI's `orchestrator.runGod()` always calls Planner. In chat mode (non-god), `handleSubmit` in App.jsx calls `orchestrator.chat(value)` which goes through `ChatAgent.run()` directly — no planner. The web's `sendMessage(prompt, mode='agent')` always runs the planner because `runAgent()` is unconditional.

### Bug #23 — No parallel god-mode in web chat
**Status:** 📐 Spec complete — 5-phase implementation

**5 Gaps (A–E) documented in `packages/shared/src/god-mode-web-spec.md`:**

| Gap | Description | Fix |
|-----|-------------|-----|
| **A** | `SubagentManager` never imported in `chat-session.js:runAgent()` | Add dynamic import: `import('mcode-cli/subagent-manager')` |
| **B** | No `mode: 'god'` branch in `sockets.js:160` | Add case for `'god'` → `session.runGod(prompt)` |
| **C** | ChatSession config incomplete for SubagentManager | `this.ledger = new CostLedger()`, merge `{...DEFAULT_CONFIG, ...this.config, auditLog}`, pass to SubagentManager |
| **D** | No bus listeners for subagent events | Add 16 listeners: `SUBAGENT_STARTED`, `SUBAGENT_DONE`, `WAVE_START`, `WAVE_COMPLETE`, `INTEGRATION_PASS`, `BUILD_COMPLETE`, etc. |
| **E** | No S2C socket events for web | Add `subagent:*`, `wave:*`, `integration:*` events to `SOCKET.SERVER_TO_CLIENT` |

**Phase 1:** Add S2C socket events (subagent_started, subagent_step, subagent_done, subagent_failed, wave_start, wave_complete, integration_pass, build_complete, toast)

**Phase 2:** Backend — ChatSession.runGod() method that imports + constructs SubagentManager with `{plan, router, projectPath, config:{...DEFAULT_CONFIG, ...this.config}, bus, options:{ledger, undoStack, forceRef}}`

**Phase 3:** Backend — Bus listeners on ChatSession for all subagent events, forwarding to S2C events via `onEvent()`

**Phase 4:** Backend — `mode: 'god'` branch in `sockets.js:160` chat:send handler, calling `session.runGod(prompt)`

**Phase 5:** Frontend — New `WaveProgress.jsx` component (multi-lane, mirrors CLI's ProcessingScreen), god-mode toggle in AIChatPage.jsx, socket event listeners in useChatSocket.js

---

## Appendix A: File Inventory

### CLI UI Files (27 files, ~6000 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `App.jsx` | ~1200 | Root component — layout, state, slash commands, event wiring |
| `MainPane.jsx` | ~240 | Message rendering pipeline — dispatches by `msg.kind` |
| `blocks.jsx` | ~490 | Core block components: SpinnerBlock, ThoughtBlock, ReadBlock, WriteBlock, DiffBlock, CommandBlock, TodoBlock, InterruptBlock, ErrorBlock, PermissionBlock, ChangeSummaryBlock |
| `ProcessingScreen.jsx` | ~343 | God-mode wave DAG view with TodoRow |
| `StatusBar.jsx` | ~122 | Responsive status bar with context bar + telemetry |
| `Header.jsx` | ~59 | Top bar — logo, project name, model, status |
| `InputLine.jsx` | ~varies | Prompt input with slash autocomplete, history, shortcuts |
| `CommandPalette.jsx` | ~varies | Ctrl+P fuzzy command palette |
| `ActivePanel.jsx` | ~varies | Subagent detail inspector (4 tabs) |
| `Sidebar.jsx` | ~55 | Context tokens, todos summary, workspace info |
| `Toasts.jsx` | ~40 | Ephemeral notification system |
| `Theme.js` | ~42 | Mutable theme proxy + setTheme() |
| `themes.js` | ~varies | 3 themes, 7 color schemes, 3 icon sets, 4 font sizes, 3 layouts |
| `useTicker.js` | ~30 | Global 80ms shared clock |
| `useEntrance.js` | ~29 | Progressive reveal hook |
| `useAnimatedProgress.js` | ~23 | Smooth percentage animation hook |
| `BgBox.jsx` | — | Background box with theme borders |
| `VirtualList.jsx` | — | Virtualized list for messages |
| `Logo.jsx` | — | SVG gradient logo |
| `WelcomeScreen.jsx` | — | Initial screen with quick actions |
| `ProviderWizard.jsx` | — | API key setup flow |
| `PermissionModal.jsx` | — | Modal permission dialog |
| `SummaryCard.jsx` | — | Build summary card |
| `DiffViewer.jsx` | — | Standalone diff viewer |
| `AnalyticsPanel.jsx` | — | Build analytics web view |
| `DebugPanel.jsx` | — | Event inspector |
| `AgentStrip.jsx` | — | Horizontal subagent strip |

### Web UI Files

All files in `packages/web/src/`. 8 pages + 20 components + 3 hooks + lib.

**Pages (8 routes):**

| File | Purpose |
|------|---------|
| `pages/LandingPage.jsx` | Public landing — hero, features, CTA links |
| `pages/AILandingPage.jsx` | AI-focused landing — provider features, AIHero, AIChatPreview |
| `pages/AIChatPage.jsx` | Main IDE — 3-tab layout (Design/Chat/AI Agent), Redux, Socket.IO |
| `pages/CLIPage.jsx` | Terminal emulator demo of CLI in browser |
| `pages/LoginPage.jsx` | Email+OTP or password login form |
| `pages/SignupPage.jsx` | Signup form (email, name, password) |
| `pages/ForgotPasswordPage.jsx` | Password reset via OTP flow |
| `pages/SettingsPage.jsx` | User settings, API keys, provider config |

**App routing** (`web/src/App.jsx`):
```jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/ai" element={<AILandingPage />} />
    <Route path="/ai/chat" element={<AIChatPage />} />
    <Route path="/cli" element={<CLIPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Routes>
</BrowserRouter>
```

**IDE Components** (`components/ide/`):

| File | Purpose |
|------|---------|
| `components/ide/AIChatPage.jsx` | Root IDE page — 3-tab layout (Design/Chat/AI Agent), Redux, Socket.IO |
| `components/ide/TodoCard.jsx` | Plan/todo display with Framer Motion pathLength + pulse animations |
| `components/ide/StepCards.jsx` | Tool result card — DiffViewer, TerminalViewer, SnapshotTree, ConsoleErrorList |
| `components/ide/EditorPane.jsx` | Code editor with syntax highlighting (react-syntax-highlighter) |
| `components/ide/TerminalPane.jsx` | xterm.js terminal output display |
| `components/ide/DesignTab.jsx` | HTML/CSS/JS design generator with live preview iframe |
| `components/ide/FileTree.jsx` | Project file explorer |
| `components/ide/PermissionModal.jsx` | Permission gate modal for shell/edit approval |
| `components/ide/ModelSelector.jsx` | API provider/model dropdown |
| `components/ide/SparkleButton.jsx` | Quick prompt suggestions |
| `components/ide/WorkspaceModals.jsx` | Upload/clone workspace dialogs |

**Chat Components** (`components/chat/`):

| File | Purpose |
|------|---------|
| `components/chat/StepCard.jsx` | Chat-mode step card (simplified version of IDE StepCard) |
| `components/chat/TodoCard.jsx` | Chat-mode todo card (simplified version of IDE TodoCard) |

**Layout Components** (`components/layout/`):

| File | Purpose |
|------|---------|
| `components/layout/Header.jsx` | Top navigation bar |
| `components/layout/Layout.jsx` | Page wrapper with consistent structure |

**Section Components** (`components/sections/`) — Used on landing pages:

| File | Purpose |
|------|---------|
| `components/sections/Hero.jsx` | Hero section with CTA |
| `components/sections/AIHero.jsx` | AI-specific hero section |
| `components/sections/CLIHero.jsx` | CLI-specific hero section |
| `components/sections/FeaturesGrid.jsx` | Feature display grid |
| `components/sections/HowItWorks.jsx` | 3-step process explanation |
| `components/sections/Testimonials.jsx` | Customer testimonials |
| `components/sections/AIChatPreview.jsx` | AI chat interface preview |
| `components/sections/CLIDemoPreview.jsx` | CLI demo preview |
| `components/sections/DashboardPreview.jsx` | Dashboard/analytics preview |
| `components/sections/LogoTicker.jsx` | Client logo ticker |
| `components/sections/Pricing.jsx` | Pricing plans |
| `components/sections/AgentFeature.jsx` | Agent feature showcase |

**Hooks, Lib & Store:**

| File | Purpose |
|------|---------|
| `hooks/useChatSocket.js` | Socket.IO client + Redux dispatch bridge |
| `lib/api.js` | Auth header helpers + fetchWithAuth |
| `lib/utils.js` | Utility helpers |
| `store/chatSlice.js` | Redux slice — messages, plan, permission, design state |
| `store/index.js` | Redux store configuration |
| `main.jsx` | React 19 entry point |
| `App.jsx` | BrowserRouter with 8 routes |

### Shared Backend Files

| File | Purpose |
|------|---------|
| `backend/src/chat-session.js` | ChatSession — bridges ChatAgent→Socket.IO, runChat vs runAgent |
| `backend/src/sockets.js` | Socket.IO server — web chat + CLI→web forwarding (16 events) |
| `backend/src/server.js` | Express server setup, middleware, route mounting |
| `backend/src/main.js` | Application entry point |
| `backend/src/auth.js` | JWT (15min access/30d refresh), bcrypt, authMiddleware |
| `backend/src/secret-enc.js` | AES-256-GCM encryption (deriveMasterKey, encryptKey, decryptKey, maskSecret) |
| `backend/src/db.js` | MongoDB connection factory |
| `backend/src/models.js` | Mongoose schemas (User, ApiKey, Otp, Session, etc.) |
| `backend/src/validate.js` | Express request body validators |
| `backend/src/mailer.js` | nodemailer SMTP email transport |
| `backend/src/cache.js` | Redis-backed cache layer |
| `backend/src/queue.js` | BullMQ job queue |

**Backend Routes** (`backend/src/routes/`):

| File | Routes | Purpose |
|------|--------|---------|
| `routes/auth.js` | `/send-otp`, `/verify-otp`, `/signup`, `/login`, `/refresh`, `/me`, `/change-password` | Auth flow: 6-digit OTP (5 attempts, 10-min TTL), JWT, bcrypt, account CRUD |
| `routes/keys.js` | `GET /keys`, `POST /keys`, `DELETE /keys/:id`, `GET /keys/models`, `POST /keys/test` | Encrypted API key storage (AES-256-GCM), model listing via CLI provider factory |
| `routes/sessions.js` | `/start`, `/send`, `/interrupt`, `/undo`, `/status` | Chat session lifecycle management |
| `routes/watch.js` | `/status`, `/logs`, `/fix`, `/undo` | Watch daemon control API |
| `routes/usage.js` | `/quotas`, `/compliance` | Usage tracking & compliance reports |
| `routes/workspaces.js` | `/list`, `/create`, `/delete` | Team workspace management |
| `routes/design.js` | `/stream`, `/done` | HTML design generation streaming |
| `routes/uploads.js` | `/upload` | File upload handling |
| `routes/github.js` | `/oauth`, `/callback` | GitHub OAuth flow (token-as-state) |
| `routes/plugins.js` | `/list`, `/install`, `/toggle` | Plugin marketplace API |
| `routes/settings.js` | `GET /settings`, `PATCH /settings` | User settings CRUD |

### Shared Core Files

| File | Purpose |
|------|---------|
| `shared/src/events.js` | 27 EVENTS constants (MESSAGE, PLAN_GENERATED, SUBAGENT_*, WAVE_*, WATCH_*, TOAST, etc.) + SUBAGENT_STATUS + SESSION_MODES + WATCH_OUTCOMES + SOCKET maps |
| `shared/src/domains.js` | 8 TASK_DOMAINS (planning/frontend/backend/db/devops/test/docs/bugfix), DOMAIN_COLORS, DEFAULT_ROUTING, DEFAULT_CONFIG |
| `shared/src/index.js` | CostLedger (rpm/tpm tracking), estimateTokens |
| `shared/src/provider.js` | Provider abstraction, getAllAdapters, adapter test/listModels interface |
| `shared/src/plan.js` | PLAN_JSON schema, validatePlan, parsePlan helpers |
| `shared/src/plugins.js` | Shared plugin types and interfaces |

### CLI Core Engine Files (~3200 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `core/chat-agent.js` | ~varies | ChatAgent — LLM tool loop, extractAction (fence/XML), _blockMeta dispatch |
| `core/tools.js` | ~varies | ToolExecutor with domain restriction + UndoStack (snapshot/undo) — 12 tool methods |
| `core/orchestrator.js` | ~varies | runGod, chat, undo, startWatch — EVENT_TO_SOCKET forwarding |
| `core/subagent-manager.js` | ~varies | Wave-based parallel execution, integration tests, event emission |
| `core/subagent.js` | ~varies | JSON-only agent protocol, parseAction (3 formats), retry logic |
| `core/planner.js` | ~varies | PLAN_JSON system prompt, parsePlanOutput, validatePlan |
| `core/modes.js` | ~98 | SPECIAL_MODES (10 modes) + MODE_META with affects arrays |
| `core/security.js` | ~72 | 10 SECRET_PATTERNS for redaction, RISK_LEVELS scoring (0-10), redactSecrets(), isNetworkAllowed() |
| `core/audit.js` | ~158 | AuditLog with persistence (~/.mcode/audit/<projectId>.json), logToolCall/logPermission/logFileChange |
| `core/router.js` | ~varies | ModelRouter — picks model per role; MODES (6 levels), MODE_DESC, MODE_REASONING (1K-32K budgets) |
| `core/watch-daemon.js` | ~559 | WatchDaemon — chokidar + interval scans, eslint dry-run, _applyFix with maxAttempts, _verifyFix gates |
| `core/store.js` | ~varies | Config at ~/.mcode/config.json, 3s TTL cache, loadConfig/saveConfig |
| `core/git.js` | ~varies | extractImports(), walkTree() — shared between watch-daemon and tools |
| `core/hooks.js` | ~varies | Hook system — HOOK_POINTS definitions, runtime evaluation |
| `core/techstack.js` | ~varies | detectTechStack() — frontend/backend/db/test/build/language detection |
| `core/vault.js` | ~varies | Encrypted credential vault (extends secret-enc) |
| `core/history.js` | ~varies | Session history persistence (~/.mcode/history.json) |
| `core/logger.js` | ~varies | Structured logging with levels |
| `core/cache.js` | ~varies | In-memory result cache with TTL |
| `core/browser-tool.js` | ~varies | Browser automation tools (navigate, click, type, screenshot) |
| `core/analytics.js` | ~varies | Build analytics tracking |
| `core/plugins.js` | ~varies | Plugin loading and lifecycle |
| `core/templates.js` | ~varies | Project scaffolding templates |

### Configuration / Authentication

---

## Appendix B: Design Principles

1. **One agent, two surfaces.** The `ChatAgent` in `packages/cli/src/core/` is the single source of truth for agent behavior. The CLI uses it in-process; the web uses it via `ChatSession` in the backend.

2. **Backend reuses CLI source.** `chat-session.js` dynamically imports from `mcode-cli/*` — no duplication of tool execution, permission gating, or history management.

3. **Event-driven, not call-and-return.** All agent→UI communication goes through `this.bus.emit(EVENTS.MESSAGE, msg)`. UI components (both CLI and web) subscribe to events rather than polling.

4. **Shared clock for terminal animations.** The CLI's `useTicker` pattern avoids the cost of multiple `setInterval` timers and batches redraws into a single frame.

5. **Progressive disclosure.** Content is revealed line-by-line (`useEntrance`) to avoid terminal scroll jumps. The web mirrors this with Framer Motion stagger.

6. **Responsive by default.** The CLI StatusBar adapts to terminal width with 4 tiers. The web uses Tailwind responsive classes and `max-w-4xl mx-auto` centering.

7. **Undo safety net.** Every `write_file` and `edit_file` calls `undoStack.snapshot()` before writing. The undo stack is persisted to `undo.json` for cross-session recovery.

8. **Tool restriction by domain.** The `ToolExecutor` only exposes destructive tools (write_file, run_shell, etc.) when `domain !== 'chat'` and `domain !== 'docs'`. Chat mode is read-only; agent mode has full power.

9. **Permission-first for shell.** In agent mode, `run_shell` always prompts (unless `allowShellAll` is set). The `always` answer persists to user settings for future sessions.

10. **Declarative slash commands.** The CLI's `handleSlash()` switch statement is exhaustive (33 commands) — see §13. The web has ZERO slash command infrastructure — the `/api/v1/slashCommands.js` file needs to be created as part of Bug #21's fix.

11. **Watch-first development.** Watch Mode's three-stage pipeline (lint → static checks → tests) minimizes model calls. Only files that fail zero-cost checks get sent to the AI for fixing (see §10).

12. **Security by default.** Secret redaction (§11.1) and risk scoring (§11.2) are applied on all tool outputs before they reach any UI surface. The `mock` provider is explicitly skipped in WatchDaemon auto-fix to prevent fake fixes.

13. **Defense in depth.** Auth spans JWT (access) + refresh tokens + bcrypt OTP + AES-256-GCM encrypted API keys + per-user key derivation. DB breach alone cannot decrypt keys (see §12).

---

## Appendix C: Technology Stack & Design Decisions

This appendix documents the technology stack choices across all surfaces — **General Chat** (web landing & chat UI), **Advanced Chat** (full IDE with multi-tab interface), **AI Coding Agent** (god-mode parallel execution), and **CLI** (terminal-based agent).

### C.1 Frontend & UI Stack (Web Surfaces: General Chat, Advanced Chat, AI Coding Agent)

The web application serves three interaction modes through a single React 19 SPA:

| Surface | Description | Key Components |
|---------|-------------|----------------|
| **General Chat** | Landing page → simple chat interface | `LandingPage`, `AILandingPage`, `AIChatPage` (chat tab only) |
| **Advanced Chat** | Full IDE with all panels active | `AIChatPage` (all 3 tabs: Design, Chat, AI Agent), `StepCards`, `TodoCard`, `TerminalPane`, `EditorPane`, `FileTree` |
| **AI Coding Agent** | God-mode parallel subagent execution | `AIChatPage` (agent tab), `WaveProgress` (planned — Bug #23), `useChatSocket` event bridge |

| Category | Selected | Rationale |
|---|---|---|
| **Core** | React 19 + Redux Toolkit + React Query | Ecosystem maturity; global state (agent status, task queue) via Redux; server state via React Query |
| **Language** | JavaScript (ES6+) | Same language as CLI (Node.js) — code-sharing possible for types, utils |
| **Styling** | Tailwind CSS | Utility-first; terminal-dark-theme aesthetic matches CLI design; consistent emerald + blue palette |
| **Component Library** | shadcn/ui | Headless + fully customizable; code lives directly in repo (no black-box dependency); Radix UI primitives (accessibility built-in); perfect base for terminal aesthetic |
| **Animations** | Framer Motion | React-friendly & declarative; sidebar slide-in/out, subagent card appear/disappear, TodoCard pathLength draw-in, TodoCard pulsing dot |
| **State Management** | Redux (global: agent status, task queue) + React Query (server cache) | Redux for app-wide state; React Query for model/provider data caching with TTL |
| **HTTP Client** | Axios | Interceptors for auth token injection + error handling; used in `lib/api.js` |
| **Smooth Scroll** | Lenis | Landing pages (`LandingPage`, `AILandingPage`) get premium smooth-scroll feel for anchor navigation |
| **Routing** | React Router v6 | 8 routes: `/`, `/ai`, `/ai/chat`, `/cli`, `/login`, `/signup`, `/forgot-password`, `/settings` |

**Extra UI components:**
- **Radix UI** — shadcn/ui's base; dropdown/modal/tooltip primitives
- **Floating UI** — tooltip/popover positioning (model info hover, agent status hover)
- **ReactBits** — landing page polish animations (hero text effects)
- **xterm.js** — terminal emulation in `TerminalPane.jsx`
- **react-syntax-highlighter** — code display in `EditorPane.jsx`

### C.2 Backend Stack (Supports All Web Surfaces + CLI)

The backend is a Node.js Express server that bridges the CLI's `ChatAgent` to the web via Socket.IO.

| Category | Selected | Rationale |
|---|---|---|
| **Runtime** | Node.js | CLI is also Node.js — enables code-sharing (types, utils, tools.js, chat-agent.js) |
| **Framework** | Express.js | Simple, well-known; dashboard API + webhook endpoints + Socket.IO integration |
| **Real-time Comms** | Socket.IO (`/live` namespace) | Critical — watch daemon fixes, god-mode subagent waves, shell streaming, and permission prompts are pushed live to the web dashboard |
| **API Style** | REST API (HTTP) + Socket.IO (real-time) | REST for CRUD (config, history, sessions, auth); Socket.IO for live agent events |
| **Auth** | JWT (access: 15min) + Refresh (30d) + bcrypt OTP + AES-256-GCM API keys | Stateless JWT for web auth; 6-digit OTP for email verification; encrypted API keys per user |
| **Database** | MongoDB | NoSQL for flexible schemas (User, ApiKey, Otp, Session, SessionHistory); Mongoose ODM |
| **Caching / Rate-limiting** | Redis | Provider RPM/TPM tracking, session cache, rate-limit counters |
| **File Uploads** | Multer | Project upload via dashboard (future feature) |
| **Email** | Nodemailer | OTP delivery + build-complete notifications |
| **PDF Export** | PDFKit | Agent build summaries as downloadable PDF reports (future feature) |
| **Process Management** | execa | Spawns subprocesses (npm test, git, tsc, eslint) with timeout + abort signal |

### C.3 CLI Terminal UI Stack

The CLI is a separate surface — a React SSR terminal application using `@opentui/core` (not a browser).

| Category | Selected | Rationale |
|---|---|---|
| **Framework** | `@opentui/core` + `@opentui/react` | React-for-terminal (NOT ink.js); same React paradigms but renders to terminal |
| **Language** | JavaScript (ES6+) | Consistent with web + backend |
| **Animation** | Custom 80ms shared clock (`useTicker`) + `useEntrance` + `useAnimatedProgress` | Terminal redraw is expensive; single interval batches all animations |
| **Styling** | Terminal-native (8-color + RGB) via `theme.js` proxy | 3 base themes × 7 color schemes × 3 icon sets × 4 font sizes × 3 layouts |
| **Terminal** | Native TTY (opentui) | Full keyboard + mouse support, Ctrl+P command palette |

### C.4 Shared Core Stack

| Category | Selected | Purpose |
|---|---|---|
| **Event Bus** | Node.js `EventEmitter` | Orchestrator serves as the bus; CLI components listen directly; backend forwards to Socket.IO |
| **Config** | `~/.mcode/config.json` (3s TTL cache) | Stores user preferences, provider keys, mode, specialMode |
| **Constants** | `@mcode/shared` (events.js, domains.js, index.js) | 27 EVENTS constants, 8 TASK_DOMAINS, DEFAULT_ROUTING, DEFAULT_CONFIG, SOCKET event maps |

### C.5 Surface Interaction Matrix

The core principle: **Advanced Chat** and **AI Coding Agent** both expose the full toolchain (Read → Edit → Explore → Search → Run → Diff → Review → Context). The difference is UI presentation — Advanced Chat gives VS Code-like split panes (FileTree + EditorPane + TerminalPane), while AI Coding Agent adds god-mode parallel subagents and background watch daemon controls. **General Chat** is conversation-only with minimal tools (chat domain restriction).

| Feature | CLI | Web General Chat | Web Advanced Chat | Web AI Coding Agent |
|---------|-----|-----------------|-------------------|---------------------|
| Chat messaging | ✅ In-process | ✅ Socket.IO | ✅ Socket.IO | ✅ Socket.IO |
| File read/edit | ✅ `read_file`/`edit_file` | ✅ Chat-restricted | ✅ Full `ToolExecutor` | ✅ Full `ToolExecutor` |
| Code preview | ✅ Terminal scrollback | ✅ Inline terminal | ✅ EditorPane + DiffViewer | ✅ EditorPane + DiffViewer |
| Terminal output | ✅ Native TTY | ✅ TerminalPane (limited) | ✅ TerminalPane (xterm.js) | ✅ TerminalPane (xterm.js) |
| Parallel execution | ✅ God-mode waves | ❌ | ❌ (toggle available) | ✅ God-mode waves (Bug #23) |
| Watch daemon | ✅ `/watch on\|off\|status` | ❌ | ✅ Toggle from IDE | ✅ Full watch controls |
| Slash commands | ✅ 33 commands | ✅ Web subset (Bug #21) | ✅ Web subset (Bug #21) | ✅ Web + `/god` (Bug #21) |
| Animation system | Custom 80ms clock | Framer Motion | Framer Motion | Framer Motion |
| Auth | Local config file | ✅ JWT + OTP | ✅ JWT + OTP | ✅ JWT + OTP |
| Export | `/export markdown\|json` | ✅ (future) | ✅ (future) | ✅ (future) |
| Debug panel | `/debug` toggle | ❌ | ✅ Debug mode toggle | ✅ Debug mode toggle |
| File tree | N/A (terminal) | ❌ | ✅ FileTree component | ✅ FileTree component |
| Live shell | ✅ In terminal | ✅ TerminalPane | ✅ TerminalPane | ✅ TerminalPane |
| Permission prompts | ✅ PermissionBlock | ✅ PermissionModal | ✅ PermissionModal | ✅ PermissionModal |
| Todo plan | ✅ TodoBlock | ✅ TodoCard | ✅ TodoCard | ✅ TodoCard + WaveProgress |

**Pipeline consistency:** The Read → Edit → Explore → Search → Run → Diff → Review → Context workflow is identical across all four surfaces. The web modes differ only in UI surface area and which tool permissions are granted (chat = read-only, advanced = edit, agent = full + god-mode parallel).

### C.6 Integration Flow

```
User action (any surface)
  → CLI: handleSubmit() → handleSlash() OR orchestrator.chat()/runGod()
  → Web: handleSubmit() → handleSlashCommand() (Bug #21, planned) → socket.emit('chat:send')
     → Backend: sockets.js chat:send handler → ChatSession.runAgent()/runGod()
        → ChatSession dynamically imports ChatAgent from mcode-cli/*
        → ChatAgent.runAgent() → tool execution loop → bus.emit(EVENTS.MESSAGE, msg)
     ← Backend: Socket.IO io.emit() forwards 16 events to web
  → UI: chatSlice reducer upserts message by replaceKey, triggers re-render
```
