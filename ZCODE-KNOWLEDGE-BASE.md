# ZCode — Complete Knowledge Base: Architecture, Flow, Animations, Components & Tests

> **Comprehensive reference** — Everything about ZCode from startup to shutdown, covering the CLI runtime, Electron desktop app, plugin system, MCP servers, skills, animation systems (both web/desktop and terminal CLI), and the full test suite.
>
> **Last updated:** 2026-08-13
> **Sources:** `C:\Users\mahen\.zcode\` (v2 config, plugin cache), `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\` (desktop app), `D:\projects\mcoode\` (project-level docs and tests)

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Configuration System](#2-configuration-system)
3. [Electron Desktop App](#3-electron-desktop-app)
4. [Startup Animation Flow](#4-startup-animation-flow)
5. [Process Architecture](#5-process-architecture)
6. [CLI Runtime](#6-cli-runtime)
7. [Agent Protocol & Turn Machine](#7-agent-protocol--turn-machine)
8. [Hooks System](#8-hooks-system)
9. [Plugin System](#9-plugin-system)
10. [MCP Servers](#10-mcp-servers)
11. [Skills Catalog (All 15)](#11-skills-catalog-all-15)
12. [Model Providers & Catalog](#12-model-providers--catalog)
13. [Animation Systems](#13-animation-systems)
14. [Web UI Components](#14-web-ui-components)
15. [Terminal CLI Animations](#15-terminal-cli-animations)
16. [Test Suite](#16-test-suite)
17. [mcoode Project](#17-mcoode-project)
18. [Appendices](#appendices)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZCode Desktop App (v3.7.6)                   │
│                    ┌─────────────────────────┐                 │
│                    │   Main Process          │                 │
│                    │   (index.js, 1043KB)    │                 │
│                    │   • App lifecycle       │                 │
│                    │   • BrowserWindow       │                 │
│                    │   • IPC handlers        │                 │
│                    │   • Spawns host+schedu  │                 │
│                    └────────┬───────┬────────┘                │
│                             │       │                         │
│                             ▼       ▼                         │
│                    ┌────────────┐ ┌────────────┐              │
│                    │  Renderer  │ │  Host Prc  │              │
│                    │ (React 19) │ │ (1.5MB)    │              │
│                    │ assets/    │ │ 37 services│              │
│                    │ 757 JS+2   │ │ ChannelSrv │              │
│                    │ index.html │ └────────────┘              │
│                    │ startup    │                             │
│                    │ anim       │                             │
│                    └────────────┘                             │
│                            │                                  │
│                    ┌───────┴───────┐                          │
│                    │  Scheduler    │                          │
│                    │ (SQLite cron) │                          │
│                    └───────────────┘                          │
│                                                               │
│                    ┌─────────────────────────────────────────┐│
│                    │        Preload (contextBridge)          ││
│                    │        index.cjs (ARMS bridge)          ││
│                    └─────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐  ┌──────────────────────┐
│         ZCode CLI (v0.16.3)      │  │   Plugins (7 active) │
│         zcode.cjs (3641 lines)   │  │   @ .zcode/cli/plugins│
└───────────────────────────────────┘  └──────────────────────┘
          │  │                              │
          ▼  ▼                              ▼
┌──────────────┐ ┌──────────────────────┐  ┌──────────────────┐
│ Commands:    │ │ Agent Protocol (JSON)│  │ android-emulator │
│ help, login, │ │ RPC over stdin/std   │  │ browser-use      │
│ logout, cmd, │ │ turn machine (Si)    │  │ document-skills  │
│ plugins, skls│ │ hooks, features      │  │ ios-simulator    │
│ TUI          │ │ workflow sandbox     │  │ restore-legacy-s │
└──────────────┘ └──────────────────────┘  │ skill-creator    │
                                           │ zcode-guide        │
                                           └──────────────────┘
```

### Key Paths

| Component | Path |
|-----------|------|
| Desktop app | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\app-extracted\out\` |
| CLI bundle | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\glm\zcode.cjs` (3,641 lines) |
| Model catalog | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\model-providers\*.json` |
| Plugins cache | `C:\Users\mahen\.zcode\cli\plugins\cache\zcode-plugins-official\` |
| v2 config | `C:\Users\mahen\.zcode\v2\` (config.json, setting.json, etc.) |
| Project docs | `D:\projects\mcoode\docs\cli/`, `docs\web\` |

---

## 2. Configuration System

### V2 Config Files (`C:\Users\mahen\.zcode\v2\`)

```
v2/
├── config.json              # Model provider configurations (9.8 KB, 8 providers)
├── setting.json             # User settings/preferences (1.9 KB, 33 keys)
├── credentials.json         # Encrypted OAuth credentials
├── telemetry-state.json     # Device ID + last active date
├── bot-state.v2.json        # Bot state (empty: {"version":2,"bots":{}})
├── coding-plan-cache.json   # Coding plan entry status (4 providers)
├── tasks-index.sqlite       # SQLite task database (1MB + WAL)
├── certs/                   # CA key/cert for TLS interception
├── crash/                   # Crash dumps (live + archive)
└── logs/                    # Daily log files (2026-08-01 through 2026-08-13)
```

### config.json — Model Providers

| Provider ID | Name | Kind | Enabled | Notes |
|-------------|------|------|---------|-------|
| `builtin:bigmodel-coding-plan` | BigModel - Coding Plan | anthropic | No | `oauth_provider_inactive` |
| `builtin:bigmodel-start-plan` | BigModel- Coding Plan | anthropic | No | `oauth_provider_inactive` |
| `builtin:zai-coding-plan` | Z.ai - Coding Plan | anthropic | No | `coding_plan_not_entitled` (API key present) |
| `builtin:zai-start-plan` | Z.ai - Coding Plan | anthropic | No | `coding_plan_not_entitled` (JWT present) |
| `builtin:bigmodel` | BigModel - API Key | anthropic | No | `oauth_provider_inactive` |
| `builtin:zai` | Z.ai - API Key | anthropic | **Yes** | Active, no API key |
| `73b59c4c-...` | Poolside | anthropic | **Yes** | Active (`poolside/laguna-s-2.1`) |
| `8378c166-...` | OpenRouter Free | openai-compatible | Yes | No models configured |
| `8655f5b1-...` | opencode zen | openai-compatible | Yes | Uses `deepseek-v4-flash-free` |

**Active provider:** `73b59c4c-eeda-4b71-937a-66ad2a4dd4c9` ("Poolside") with model `poolside/laguna-s-2.1`

### setting.json — Key Settings

```json
{
  "locale": "en-US",
  "terminalInheritSystemProfile": true,
  "taskAutoArchiveEnabled": false,
  "closeToTrayOnWindows": true,
  "zcodeInteractionBehavior": "queue",
  "askUserQuestionAutoResolutionEnabled": true,
  "enabledBuiltinAgentCliProviders": ["glm"],
  "repoSnapshotIndexingEnabled": false,
  "instantGrepIndexingEnabled": false,
  "nativeSearchEnhancementsEnabled": true,
  "memoryEnabled": false
}
```

### CLI Config Schema (from `zcode.cjs`)

**Default config (`qi` in CLI bundle):**

| Key | Default | Description |
|-----|---------|-------------|
| `permission.mode` | `"build"` | Permission mode: plan\|build\|edit\|yolo |
| `permission.autoApproveHighRisk` | `false` | Auto-approve high-risk tools |
| `storage.dir` | `"~/.zcode"` | Persistent storage directory |
| `storage.sessionDbPath` | `"~/.zcode/cli/db/db.sqlite"` | Session database path |
| `network.timeout` | `180000` | 3-minute timeout |
| `features.compact` | `true` | Conversation compaction |
| `features.rewind` | `true` | Workspace checkpoints |
| `features.subagent` | `true` | Subagent spawning |
| `features.memory` | `true` | Project memory system |
| `features.skill` | `true` | Skills loading |
| `features.mcp` | `true` | MCP server support |
| `hooks.enabled` | `false` | Hooks disabled by default |
| `hooks.timeoutMs` | `60000` | 60s hook timeout |
| `hooks.maxOutputBytes` | `32768` | 32KB max hook output |
| `logging.level` | `"info"` | Log level |
| `logging.format` | `"text"` | Log format |
| `toolConcurrency.maxConcurrency` | `10` | Max concurrent tool calls |
| `ui.locale` | `"en-US"` | Default locale |
| `ui.theme` | `"auto"` | Default theme |

**Config merge order (scope priority):** System(0) < User(10) < Project(20) < Session(30) < Env(40) < Cli(50)

---

## 3. Electron Desktop App

### Directory Structure (`app-extracted/out/`)

```
out/
├── main/
│   ├── index.js              (1043 KB — Electron main process)
│   ├── chunk-FQMTTDFW.js     (logging/tracing)
│   ├── chunk-FEYUN5KX.js     (core utilities)
│   ├── chunk-LQDBAECE.js     (fs ops, child_process)
│   └── chunk-YJ3457FW.js     (SSH, more core)
├── renderer/
│   ├── index.html            (7.3 KB — startup animation)
│   ├── index-BxSv8qTx.css    (366 KB — Tailwind + app CSS)
│   ├── assets/
│   │   ├── index-ABImDspU.js (37 services, startup animation JS)
│   │   ├── styles-CdEGpc2x.js (4.5 MB — main renderer)
│   │   └── [755 more JS files]
│   └── (757 total JS + 2 CSS files)
├── host/
│   └── index.js              (1.5 MB, 1503 lines — host process)
├── scheduler/
│   └── index.js              (945 KB, 523 lines — task scheduler + Zod)
└── preload/
    ├── index.cjs             (40 lines — ARMS telemetry bridge)
    ├── processMonitor.cjs
    └── embeddedBrowserJavaScriptDialog.cjs
```

### Package Info

- **Package:** `@zcode/desktop` v3.7.6
- **Framework:** Electron + React 19 + Vite
- **Build tool:** Vite (ESBuild bundling)
- **486 node_modules packages** (third-party deps only; no `@zcode/*` source in node_modules)

---

## 4. Startup Animation Flow

### Complete Flow Diagram

```
1. Electron app starts → app.whenReady()
   │
   ├─── Sets up protocol handlers
   ├─── Spawns scheduler process (fork)
   ├─── Configures auto-updater
   ├─── Applies network policy (desktop CA)
   ├─── Sets up tray, deep links, single-instance lock
   │
2. ensurePrimaryWindow("app-ready") → createWindow()
   │   new BrowserWindow({ width: 1200, height: 800 })
   │   loads index.html immediately (no show:false)
   │
3. Renderer: index.html loads
   │   │
   │   ├── #loading overlay visible (z-index: 2147483647)
   │   ├── CSS: .startup-logo-shell plays startup-logo-pop (0.72s)
   │   ├── index-ABImDspU.js starts executing
   │   │
   │   ├── Checks: windowKind === "update-status"? → skip all
   │   ├── Checks: prefers-reduced-motion? → skip animation
   │   ├── Listens for: animationend event (1s fallback timer)
   │   └── Listens for: zcode-react-startup-ready event (3s fallback)
   │
4. React mounts → $() component dispatches "zcode-react-startup-ready"
   │   → P = true → checks: N && P → F() fires
   │
5. F() — Transition gate:
   │   if (M || !N || !P) return;  // wait for BOTH flags
   │   M = true
   │   document.body.classList.add("zcode-startup-ready")
   │   setTimeout(() => loadingEl.remove(), 500)
   │
6. Main process: dom-ready handler
   │   ├── process.platform === "win32" → window.show() + window.focus()
   │   ├── Spawns host process (fork with runtimeProcessEnvPatch)
   │   ├── Creates MessagePort pair
   │   └── webContents.postMessage("zcode:service-port", null, [port])
   │
7. Renderer: service-port handler
   │   ├── Receives MessagePort from main
   │   ├── Creates service bridge (ChannelClient)
   │   ├── Initializes all 37 services on port
   │   └── createRoot(document.getElementById("root")).render(...)
   │       → React app renders → dispatches zcode-react-startup-ready
   │
8. Host process: InitLocal message received
    ├── tY() creates local services (37 services)
    ├── Ym() exposes services via ChannelServer on MessagePort
    └── Posts "local services ready" back
```

### Startup Animation CSS (from `index.html`)

```css
#root { opacity: 0; transition: opacity 0.16s ease; }
body.zcode-startup-ready #root { opacity: 1; }
#loading { position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center; transition: opacity 0.16s ease; }
body.zcode-startup-ready #loading { pointer-events: none; opacity: 0; }

.startup-logo-shell {
  width: 96px; height: 96px; border-radius: 24px;
  background: linear-gradient(180deg, #000 0%, #151718 100%);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
  transform: scale(0.72); opacity: 0;
  animation: startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform-origin: center;
}
.startup-logo-shell::before {
  position: absolute; inset: 0; pointer-events: none; content: "";
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: inherit;
}

@keyframes startup-logo-pop {
  0%   { opacity: 0; transform: scale(0.72); }
  38%  { opacity: 1; transform: scale(1.045); }
  58%  { transform: scale(0.985); }
  76%  { transform: scale(1.008); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .startup-logo-shell { opacity: 1; transform: scale(1); animation: none; }
}
```

### Startup Animation JS (from `index-ABImDspU.js`)

```javascript
var k = document.querySelector(".startup-logo-shell"),
    A = document.getElementById("loading"),
    j = new URLSearchParams(window.location.search).get("windowKind") === "update-status",
    ke = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    M = false,  // transition fired
    N = false,  // logo animation complete
    P = false;  // React ready

F = () => { M || !N || !P || (M = true,
  document.body.classList.add("zcode-startup-ready"),
  window.setTimeout(() => A?.remove(), 500) ); };
I = () => { N = true; F() };     // animationend handler
L = () => { P = true; F() };     // react-ready handler

j ? (M = true, document.body.classList.add("zcode-startup-ready"), A?.remove())
  : window.addEventListener("zcode-react-startup-ready", L, {once: true});

j || ke || !k ? I()
  : (k.addEventListener("animationend", I, {once: true}),
     window.setTimeout(I, 1000));

j || window.setTimeout(L, 3000);
```

### Startup Animation Timing Summary

| Phase | Duration | Easing/Curve | Fallback |
|-------|----------|-------------|----------|
| Logo `startup-logo-pop` | 720ms | `cubic-bezier(0.22, 1, 0.36, 1)` | N/A |
| Logo `animationend` listener | — | — | 1000ms `setTimeout(I, 1e3)` |
| React startup ready | — | — | 3000ms `setTimeout(L, 3e3)` |
| `#loading` fade-out | 160ms | `ease` | — |
| `#root` fade-in | 160ms | `ease` | — |
| Loading element removal | — | — | 500ms after `zcode-startup-ready` |

### React Startup Ready Dispatch (`$()` component)

```javascript
function $() {
  return (0, Ae.useEffect)(() => {
    window.__ZCODE_REACT_COMMIT_AT__ = Date.now();
    window.dispatchEvent(new Event("zcode-react-startup-ready"));
  }, []), null;
}
```

---

## 5. Process Architecture

### Four Processes

1. **Main Process** (`out/main/index.js`, 1043 KB): Electron main process
   - App lifecycle (`app.whenReady`, `app.on("activate", ...)`)
   - BrowserWindow creation and management
   - IPC handlers (file dialogs, remote control, etc.)
   - Protocol handlers
   - Spawns scheduler and host processes
   - Crash reporting (`crashReporter`)

2. **Renderer Process** (`out/renderer/`): React 19 UI
   - Entry: `index.html` → `assets/index-ABImDspU.js` (37 services via React context)
   - Main bundle: `assets/styles-CdEGpc2x.js` (4.5 MB)
   - CSS: `assets/styles-BxSv8qTx.css` (366 KB, Tailwind)
   - 757 JS asset files (charts, KaTeX, Mermaid, Office viewers)

3. **Host Process** (`out/host/index.js`, 1.5 MB): Service orchestrator
   - 37 ZCode services injected via ESM context
   - ChannelServer for service communication over MessagePort
   - Task scheduling and execution
   - File operations, git, search, terminal, model providers

4. **Scheduler Process** (`out/scheduler/index.js`, 945 KB): Background automation
   - SQLite `DatabaseSync` for automations table
   - Cron-based scheduling via `CronCreate`/`CronDelete`/`CronList`/`CronUpdate`
   - Hash computation and file system operations

### Host Process — 37 Services (`tY` function)

```
settingService, credentialService, oauthCredentialRepo,
modelProviderService, apiClient, gitService, fileService,
zcodeAgentService, zcodeTaskService,
usageStatsService, searchService, shellService,
telemetryService, pluginService, hookService, skillService,
mcpService, sessionService, toolService,
webSearchService, webFetchService,
terminalService, processMonitorService, workspaceService,
authService, conversationService, taskService,
projectMemoryService, rewindService, compactService,
forkService, expertService, workflowService,
localeService, localePreferenceService,
themeService, notificationService,
downloadService, updateService, configService,
agentRuntimeService, mcpGatewayService,
documentPreviewService, processManagerService
```

### Preload (`out/preload/index.cjs`)

```javascript
contextBridge.exposeInMainWorld("zcode", {
  connectRemote, cancelPendingRemoteConnection,
  startWebRemoteControl, stopWebRemoteControl,
  log, selectDirectory, selectFile, selectFiles, saveFile,
  printPageToPdf, getPathForFile, createTempTextAttachment,
  onRemoteConnectionLog, onRemoteSessionClosed, onBotRemoteWorkspaceReconnected,
  // ... many more IPC methods
});
contextBridge.exposeInMainWorld("__ZCODE_DEVICE_ID__", deviceId);
contextBridge.exposeInMainWorld("__zcodeFinalArmsCustomEventsE2E", ...);
```

---

## 6. CLI Runtime

### Main Commands (dispatch at line 3637 of `zcode.cjs`)

```javascript
switch(command) {
  case "help":      return showHelp();           // K3e
  case "version":   return stdout.write(version); // PE
  case "app-server":
  case "agent-server": return runZCodeProtocolAgent(); // Jya
  case "doctor":    return runDiagnostics();    // Kya
  case "login":     return loginOAuth();        // z3e
  case "logout":    return removeCredentials(); // N3e
  case "commands":  return manageCommands();    // uHn
  case "plugins":   return managePlugins();     // OKn
  case "skills":    return manageSkills();      // W3e
  case "tui":       return startTUI();          // SJn
  default:          return stderr.write(`Unknown command`);
}
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--prompt/-p` | Inline prompt (runs agent loop) |
| `--attach` | Attach to existing session |
| `--cwd` | Working directory |
| `--browser-use=headless` | Browser use mode |
| `--max-turns` | Maximum conversation turns |
| `--allowed-tools` | Allowed tool list |
| `--disallowed-tools` | Disallowed tool list |
| `--mode` | Permission mode: build\|edit\|plan\|yolo |
| `--locale` | UI locale |
| `--settings` | Settings file path |
| `--resume` | Resume session ID |
| `--target` | Target URL (web remote) |
| `--target-replace` | Replace target |
| `--continue/-c` | Continue latest session |
| `--force/-f` | Force operation |
| `--force-mcs` | Force mobile client simulation |
| `--json` | JSON output mode |
| `--no-browser` | Don't open browser |
| `--no-color` | Disable colors |
| `--verbose` | Verbose logging |
| `--print` | Print only (no execution) |

### Agent Protocol Flow (`runZCodeProtocolAgent` / `VWn`)

```javascript
// 1. Telemetry setup: D3e() → device MID collection
// 2. Session store: aUn() → SQLite-based kC
// 3. MCP lease: aln() → only if config.features.mcp !== false
// 4. ZCode app: f9t() wrapped in $3e (protocol surface)
// 5. Browser broker: fRe() → if MCP enabled
// 6. Protocol transport: O3e() → stdin/stdout JSON-RPC bridge
// 7. Process resource sampler: qWn() → emits processResourceSample events

// Cleanup (finally block, 1500ms timeout per step, Fga):
// - stop sampler, close browser broker, close MCP lease,
//   close session store, shutdown telemetry
```

---

## 7. Agent Protocol & Turn Machine

### Turn Machine (`Si` class — `TurnMachineImpl`)

**Turn phases (`fn` enum):**

| Phase | Value |
|-------|-------|
| Idle | `"idle"` |
| ProcessingInput | `"processing_input"` |
| AwaitingModelResponse | `"awaiting_model_response"` |
| Streaming | `"streaming"` |
| SchedulingTools | `"scheduling_tools"` |
| ExecutingTools | `"executing_tools"` |
| AggregatingResults | `"aggregating_results"` |
| AwaitingPermission | `"awaiting_permission"` |
| Completing | `"completing"` |
| Error | `"error"` |

### State Transitions

```
Idle → ProcessingInput → AwaitingModelResponse → Streaming
  → SchedulingTools → ExecutingTools → AggregatingResults
    (→ AwaitingModelResponse) (loop back for next tool round)
    → SchedulingTools (schedule new tools)
    → Completing
    → Error

Streaming → Completing
Streaming → Error
Streaming → AggregatingResults
```

### Turn State Fields (`createTurnState`)

```javascript
{
  id: string,           // turn UUID
  sessionId: string,    // parent session ID
  turnNumber: number,   // 0-based turn index
  phase: TurnPhase,     // current phase
  traceId: string,      // distributed tracing ID
  input: InputData,     // user prompt + attachments
  streamingContent: [], // accumulating model output
  toolCalls: [],        // model tool call specs
  toolResults: [],      // resolved tool call results
  scheduledTools: [],   // queued for execution
  pendingInputs: [],    // inputs queued during tool execution
  pendingPermissions: [],
  resolvedPermissions: [],
  resultType: string,   // "stop" | "tool_calls" | "recursion" | etc.
  startedAt: Date,      // ISO timestamp
}
```

### Key Turn Machine Methods

| Method | Description |
|--------|-------------|
| `create()` | Initialize new turn state |
| `transition(phase)` | Move to new phase (validates transitions) |
| `startModelRequest()` | Begin awaiting model response |
| `receiveModelResponse()` | Model sent response |
| `addStreamingContent(text)` | Append delta to accumulating content |
| `scheduleTools(calls)` | Queue tool calls for execution |
| `startToolExecution()` | Begin running tools |
| `completeTool(result)` | One tool finished |
| `requestPermission(toolCall)` | Request user approval |
| `resolvePermission(approved)` | Resolve permission request |
| `aggregateResults()` | Collect all tool results |
| `complete()` | Finalize turn |
| `fail(error)` | Error state |
| `getNextPhase()` | Determine next valid phase |
| `isComplete()` | Check if turn is done |

---

## 8. Hooks System

### Hook Event Types (`Jr` enum)

```javascript
const HookEvent = {
  SessionStart: "SessionStart",
  UserPromptSubmit: "UserPromptSubmit",
  PreToolUse: "PreToolUse",
  PermissionRequest: "PermissionRequest",
  PostToolUse: "PostToolUse",
  PostToolUseFailure: "PostToolUseFailure",
  Stop: "Stop"
};
```

### Hook Outcomes (`ek` enum)

```javascript
{ Success: "success", Blocked: "blocked", Failed: "failed", 
  Cancelled: "cancelled", TimedOut: "timed_out" }
```

### Hook Execution Points

| Event | When | Context |
|-------|------|---------|
| `SessionStart` | Session begins | `{session, workspace, model}` |
| `UserPromptSubmit` | User submits prompt | `{userPrompt, messages, model}` |
| `PreToolUse` | Before tool execution | `{toolName, toolInput, riskLevel, sideEffectScope, actorKind}` |
| `PermissionRequest` | Tool needs approval | `{toolName, toolInput, permissionDecision}` |
| `PostToolUse` | Tool succeeded | `{toolName, toolInput, toolResponse, toolResultPreview}` |
| `PostToolUseFailure` | Tool failed | `{toolName, toolInput, error, isInterrupt}` |
| `Stop` | Session stopped | `{responseText, responsePreview, toolCallCount, stopHookActive}` |

### Hook Config Schema

```javascript
{
  enabled: boolean,
  timeoutMs: number,           // default 60000
  maxOutputBytes: number,      // default 32768
  events: {
    SessionStart: [{ matcher, hooks }],
    UserPromptSubmit: [{ matcher, hooks }],
    PreToolUse: [{ matcher, hooks }],
    PermissionRequest: [{ matcher, hooks }],
    PostToolUse: [{ matcher, hooks }],
    PostToolUseFailure: [{ matcher, hooks }],
    Stop: [{ matcher, hooks }]
  }
}
```

### Hook Types

1. **Process hook** — Runs a command/script: `{ "type": "process", "command": "string", "timeout": "number" }`
2. **Command hook** — Runs a built-in command: `{ "type": "command", "command": "string", "timeout": "number" }`

### In-Memory Hook Runner

```javascript
class InMemoryHookRunner {
  async run(event, context = {}) {
    const hooks = this.hooks.filter(h =>
      h.event === event.hookEventName && matcherMatches(context, h.matcher)
    );
    const outputs = { additionalContexts: [] };
    for (const [i, hook] of hooks.entries()) {
      const runId = crypto.randomUUID();
      if (hook.async) { this.runBackgroundHook(...); continue; }
      try {
        const result = await this.runCallbackWithTimeout(hook, event, i, context.signal);
        const output = processHookOutput(event.hookEventName, result);
        mergeHookOutput(outputs, output);
        if (output.permissionBehavior === "deny" || output.preventContinuation) { /* blocked */ }
      } catch (error) {
        const outcome = resolveHookFailureOutcome(error);
        // emit HookRunFailed
      }
    }
    return outputs;
  }
}
```

---

## 9. Plugin System

### Plugin Inventory (7 Active)

| # | Plugin | Version | Category | Lang | Components |
|---|--------|---------|----------|------|------------|
| 1 | android-emulator | 0.1.0 | developer-tools | TS | skills, commands, MCP(23 tools), userConfig(7), hooks |
| 2 | browser-use | 0.2.1 | developer-tools | TS/ESM | skills, node_repl MCP(3 tools) |
| 3 | document-skills | 0.1.0 | productivity | TS+Python | skills (docx, pdf, pptx) + Python scripts |
| 4 | ios-simulator | 0.1.0 | developer-tools | TS | skills, commands, MCP(20 tools), userConfig(2), hooks |
| 5 | restore-legacy-sessions | 0.1.0 | utilities | JS | skills, commands |
| 6 | skill-creator | 0.1.0 | developer-tools | TS | skill-creator skill |
| 7 | zcode-guide | 0.1.0 | guides | TS | 6 diagnosing/guide skills |

### Plugin Cache Structure

```
.zcode/cli/plugins/cache/zcode-plugins-official/
├── android-emulator/0.1.0/
│   ├── .zcode-plugin/plugin.json   # MCP, commands, userConfig manifest
│   ├── dist/mcp/server.js          # 41K lines bundled MCP server
│   ├── dist/lib/result.js          # content helpers
│   ├── dist/lib/run.js             # child-process spawn
│   ├── dist/lib/path.js            # data-dir resolution
│   ├── scripts/build-mcp.mjs       # esbuild bundling
│   ├── skills/android-dev/SKILL.md
│   ├── commands/android-dev.md
│   ├── hooks/hooks.json            # {"hooks": {}}
│   └── .mcp.json
├── browser-use/0.2.1/              # (0.1.0, 0.1.2 also cached, stale)
│   ├── dist/mcp/server.js          # 139K lines node_repl MCP
│   ├── scripts/browser-client.mjs   # browser runtime entry
│   ├── skills/control-browser/SKILL.md
│   └── skills/web-gui-tester/SKILL.md
├── document-skills/0.1.0/
│   ├── skills/
│   │   ├── docx/ (SKILL.md, scripts/postcheck.py, scripts/utilities.py)
│   │   ├── pdf/ (SKILL.md 919 lines, scripts/pdf.py, scripts/design_engine.py)
│   │   └── pptx/ (SKILL.md, scripts/pptx_reference.py, tests/test_pptx_reference.py)
├── ios-simulator/0.1.0/            # same structure as android-emulator
├── restore-legacy-sessions/0.1.0/
│   ├── scripts/restore-conversation.mjs  # readable JS source (sqLite)
│   ├── scripts/scan-legacy-sessions.mjs
│   └── skills/restore-legacy-sessions/SKILL.md
├── skill-creator/0.1.0/
└── zcode-guide/0.1.0/
    ├── skills/zcode-configuration-guide/SKILL.md
    ├── skills/diagnosing-commands/SKILL.md
    ├── skills/diagnosing-hooks/SKILL.md
    ├── skills/diagnosing-mcp/SKILL.md
    ├── skills/diagnosing-plugins/SKILL.md
    └── skills/diagnosing-skills/SKILL.md
```

### Plugin Manifest Format

```json
{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "...",
  "author": {"name": "Z.ai"},
  "license": "MIT",
  "skills": "skills",
  "commands": "commands",
  "mcpServers": { ... },      // optional
  "userConfig": { ... },      // optional
  "hooks": "hooks",           // optional
  "agents": "agents"          // optional
}
```

### Seed Files (`.zcode-plugin-seed.json`)

```json
{"version": 1, "source": "filesystem", 
  "hash": "sha256:...", "marketplace": "zcode-plugins-official",
  "plugin": "plugin-name", "pluginVersion": "0.1.0"}
```

### Marketplaces (`known_marketplaces.json`)

| Marketplace | Source | URL |
|-------------|--------|-----|
| `zcode-plugins-official` | URL | `https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json` |
| `claude-plugins-official` | GitHub | `anthropics/claude-plugins-official` |

### Plugin Build Setup

```json
{
  "type": "module",
  "main": "./dist/mcp/server.js",
  "scripts": {
    "build": "tsc && node scripts/build-mcp.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run test",
    "lint": "oxlint src"
  }
}
```

---

## 10. MCP Servers

### 3 MCP Servers with Tools

#### 1. node_repl (`browser-use/0.2.1`)

**3 tools:**

| Tool | Required Input | Optional | Description |
|------|---------------|----------|-------------|
| `js` | `code` (string), `title` (string 1–120) | `timeout_ms` (1–120000) | Run JS in fresh Node kernel for browser control |
| `js_add_node_module_dir` | `path` OR `dir` (string) | — | Add node_modules directory to search roots |
| `js_reset` | — | — | Compatibility barrier (kernel already fresh) |

**Security:** `js` has `riskLevel: high`, `needsApproval: true`, `sideEffectScope: "system"`

**Image constants:**
- `MCP_IMAGE_INLINE_BASE64_BYTES = 200*1024`
- `MCP_IMAGE_INLINE_RAW_BYTES = 150*1024`
- `HOST_NODE_REPL_IMAGE_MAX_DIMENSION = 2048`
- `HOST_NODE_REPL_MODEL_IMAGE_MAX_DIMENSION = 2000`

**Browser backend types:** `iab` (in-app browser), `extension` (Chrome ext), `cdp` (managed Chromium)

**Key functions:**
- `emitImage(image)` — Collect screenshots as `{base64, mimeType}`
- `toMcpRunResult(run)` — Convert to MCP format, handles `_meta` with screenshot indices
- `isBrowserSurfaceSideEffect(cmd)` — Returns true for navigate/click/fill/type/press/etc.
- `isAutoScreenshotTriggerCommand(cmd)` — Returns true for ALL except: capabilities/list/listUserTabs/browserVisibilityGet/cancelRequest/closeSession/finalizeTabs/nameSession/turnEnded
- `persistBrowserScreenshotPaths(run, ctx)` — Persist to artifact store
- `tryCompressHostNodeReplImage` — Compress oversized images (2000px max dimension)

#### 2. android-emulator (`android-emulator/0.1.0`)

**23 tools** (shared `target` schema: `{ serial?, avd?, timeoutMs? }`):

| # | Tool Name | Input | Description |
|---|-----------|-------|-------------|
| 1 | `android_preflight` | `{}` | Check SDK, adb, emulator, AVDs, Java, Gradle |
| 2 | `android_discover_project` | `{}` | Find Gradle root, modules, manifest |
| 3 | `android_create_app` | `{name, packageName?, dir?, minSdk?, compileSdk?, overwrite?}` | Create Kotlin/Compose app |
| 4 | `android_build_app` | `build2` | Build Gradle project |
| 5 | `android_build_and_run` | `build2 + launchActivity?` | Build, install, launch |
| 6 | `android_list_devices` | `{}` | List adb devices |
| 7 | `android_list_avds` | `{}` | List AVDs |
| 8 | `android_start_emulator` | `{avd?, timeoutMs?}` | Start GUI emulator |
| 9 | `android_stop_emulator` | `{serial (req)}` | Stop emulator |
| 10 | `android_create_avd` | `{name?, packageId?, device?, force?}` | Create AVD |
| 11 | `android_install_app` | `target + {apkPath}` | Install APK |
| 12 | `android_launch_app` | `target + {applicationId, activity?}` | Launch app |
| 13 | `android_terminate_app` | `target + {applicationId}` | Force-stop |
| 14 | `android_open_url` | `target + {url}` | Open URL |
| 15 | `android_screenshot` | `target + {path?}` | PNG screenshot |
| 16 | `android_logs` | `target + {applicationId?, lines?, limit?}` | Read logcat |
| 17 | `android_ui_status` | `{}` | Report UI backend |
| 18 | `android_ui_describe` | `target` | UI Automator tree |
| 19 | `android_ui_resolve` | `target + {query}` | Resolve to coords |
| 20 | `android_ui_tap` | `target + {x, y}` | Tap coordinates |
| 21 | `android_ui_swipe` | `target + {x1,y1,x2,y2, durationMs?}` | Swipe |
| 22 | `android_ui_type_text` | `target + {text}` | Enter text |
| 23 | `android_ui_keyevent` | `target + {key}` | Press key (BACK/HOME/ENTER/APP_SWITCH/MENU/SEARCH) |

#### 3. ios-simulator (`ios-simulator/0.1.0`)

**20 tools** (shared `target2` schema: `{ udid?, device?, runtime? }`):

| # | Tool Name | Input | Description |
|---|-----------|-------|-------------|
| 1 | `ios_preflight` | `{}` | Check macOS, Xcode, simctl |
| 2 | `ios_list_simulators` | `{}` | List simulators |
| 3 | `ios_boot_simulator` | `target2 + {openSimulator?}` | Boot simulator |
| 4 | `ios_show_simulator` | `{udid?}` | Open Simulator app |
| 5 | `ios_discover_project` | `{}` | Find .xcodeproj/.xcworkspace |
| 6 | `ios_create_app` | `{name, bundleId?, dir?, deployment?, overwrite?}` | Create SwiftUI app |
| 7 | `ios_build_app` | `build2` | Build via xcodebuild |
| 8 | `ios_build_and_run` | `build2 + {launchArgs?}` | Build, install, launch |
| 9 | `ios_install_app` | `target2 + {appPath}` | Install .app (auto-boots) |
| 10 | `ios_launch_app` | `target2 + {bundleId, launchArgs?}` | Launch (auto-boots) |
| 11 | `ios_terminate_app` | `target2 + {bundleId}` | Terminate |
| 12 | `ios_open_url` | `target2 + {url}` | Open URL (auto-boots) |
| 13 | `ios_screenshot` | `target2 + {path?, openSimulator?}` | PNG (auto-boots) |
| 14 | `ios_logs` | `target2 + {bundleId?, seconds?, limit?}` | Read logs |
| 15 | `ios_ui_status` | `{}` | Report UI backend (idb) |
| 16 | `ios_ui_tap` | `target2 + {x, y, duration?}` | Tap coordinates |
| 17 | `ios_ui_swipe` | `target2 + {x1,y1,x2,y2,delta?}` | Swipe |
| 18 | `ios_ui_type_text` | `target2 + {text}` | Enter text |
| 19 | `ios_ui_button` | `target2 + {button, duration?}` | Press hardware button |
| 20 | `ios_ui_describe` | `target2` | Accessibility info via idb |

---

## 11. Skills Catalog (All 15)

### ZCode Guide Skills (6)

#### zcode-configuration-guide
*Use when configuring MCP servers, slash commands, skills, hooks, plugins, or AGENTS.md.*

**Scopes and Configuration Files:**
- **User scope:** `~/.zcode/cli/config.json` — MCP servers, hooks, plugin enable/disable, skill/command overrides
- **Workspace scope:** `.zcode/config.json` in project root
- **AGENTS.md:** workspace root or `~/.zcode/AGENTS.md`

**Skill discovery order (highest priority first):**
1. Explicit skill/command plugin roots (from config)
2. User `~/.zcode/skills`
3. User `~/.agents/skills`
4. Workspace `.zcode/skills` (walks up to repo root)
5. Workspace `.agents/skills`
6. Enabled plugin roots (lowest priority)

#### diagnosing-commands
*Use when a slash command is missing, overridden, has parse error, or is dropped.*

**Root causes:**
1. Command not in command list — not in config
2. Higher-precedence override — another plugin shadows it
3. Frontmatter parse error — SKILL.md YAML malformed
4. Dropped for unknown command — name doesn't match pattern

#### diagnosing-hooks
*Use when a hook doesn't trigger, event name wrong, matcher doesn't match, script not executable.*

**Root causes:**
1. Wrong event name — must be: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop
2. Matcher doesn't match — regex/string against tool name or event context
3. Script not executable — needs `chmod +x` or valid shebang
4. Template variables not expanded — available: `{user_prompt}`, `{tool_name}`, `{tool_input}`, `{session_id}`

#### diagnosing-mcp
*Use when an MCP server won't connect, tools don't appear, server shows disabled/failed.*

**Root causes:**
1. Server not in config — missing from `mcp.servers`
2. Startup failure — server crashes on launch (check stderr)
3. Connection timeout — server too slow
4. Tool registration failure
5. Transport mismatch — stdin vs stdio vs http

#### diagnosing-plugins
*Use when a plugin is not listed, installing fails, enabled but skills/commands missing.*

**Root causes:**
1. Cache directory corrupted or missing
2. Download or extraction error
3. Skills path missing in manifest
4. Plugin in `suppressedBuiltins` list

#### diagnosing-skills
*Use when a skill is not discovered, installed but doesn't trigger, shadowed, disabled, or frontmatter parse error.*

---

### Developer Tools Skills (4)

#### android-dev
*Build, run, inspect, and lightly automate Android apps.*

**Default Workflow:**
1. `mcp__android_emulator__android_preflight` — check environment
2. `mcp__android_emulator__android_discover_project`
3. `mcp__android_emulator__android_create_app` if needed
4. Edit Kotlin/Compose files
5. Build with `android_build_app` or `android_build_and_run`

**Rules:** Don't accept SDK licenses, enter passwords, wipe emulator data, or delete AVDs without asking. Only `overwrite: true` after explicit user confirmation.

#### control-browser
*Main-agent-only Browser Use. Open, navigate, inspect, test, click, type, fill, screenshot.*

**Core workflow:**
1. Bootstrap every `js` call: resolve `ZCODE_PLUGIN_ROOT`, import `browser-client.mjs`, call `setupBrowserRuntime`
2. Select backend: `iab`, `extension`, or `cdp` via `agent.browsers.get/list/getDefault/getForUrl`
3. Tab management: always `browser.tabs.list()` before acting
4. Navigation: `tab.goto(url)` → `waitForLoadState({state: "domcontentloaded"})`
5. Read: `tab.playwright.domSnapshot()` — primary page reading
6. Act: build locators from snapshot facts only, never guess
7. Observe: cheapest observation that answers next question
8. Persist tabs — don't close unless needed

**Rules:**
- `domSnapshot()` is primary — screenshots only when vision matters
- Every `screenshot()` must be in same cell as `nodeRepl.emitImage(await tab.screenshot())`
- Never use `networkidle` — use `domcontentloaded`
- Navigation: `http:`, `https:`, `about:blank` only
- Never guess selectors, labels, or URL patterns
- Locator uniqueness: check `count()` when not obvious

#### web-gui-tester
*Test web frontends via GUI black-box testing with screenshots + DOM verification.*

**4-phase methodology:**
1. **Scenario Assessment** — Complete info → skip; Partial → lightweight plan; Insufficient → complete plan (P0-P3)
2. **Test Environment Preparation** — Start servers, seed data (no black-box restrictions during setup)
3. **Test Execution** — Action → Observation loop (code + visual verification)
4. **Output Conclusions** — Summarize pass/fail/blocked with screenshots

**Constraints:** Pure GUI black-box, screenshots mandatory for visual verification, separate testing from fixing, before/after screenshots in same call for transient states.

#### ios-dev
*Build, run, inspect iOS SwiftUI apps.*

**Default Workflow:**
1. `mcp__ios_simulator__ios_preflight` — checks macOS, Xcode, simctl
2. `mcp__ios_simulator__ios_boot_simulator`
3. `mcp__ios_simulator__ios_discover_project`
4. `mcp__ios_simulator__ios_create_app` if needed
5. Build with `ios_build_app` or `ios_build_and_run`

**Rules:** Auto-boots simulator for install/launch/screenshot. Never modify source through ad-hoc means.

#### skill-creator
*Create, edit, and iterate local ZCode skills.*

**Core loop:** Draft → Test (2-3 prompts) → Review → Improve → Repeat

**Discovery roots (priority order):**
1. `<project>/.zcode/skills/<name>/`
2. `<project>/.agents/skills/<name>/`
3. `~/.zcode/skills/<name>/`
4. `~/.agents/skills/<name>/` ← default for new skills

**SKILL.md format:**
```
my-skill/
├── SKILL.md          (required: name + description frontmatter)
├── references/       (optional - extra docs on demand)
├── scripts/          (optional - helper scripts)
└── assets/           (optional - templates, fixtures)
```

---

### Document Skills (3)

#### docx
*DOCX creation, editing, analysis with revisions, comments, formatting.*

**Key features:** Tracked changes, comments, formatting preservation, text extraction
**Analysis (postcheck.py):** 15-point quality checker (blank pages, line spacing, table margins, image overflow, font fallback, CJK indentation, heading continuity, TOC quality)

#### pdf
*Professional PDF toolkit — 4 production workflows: reports, creative, academic LaTeX, process.*

**Triaging:**
| Weight | Triggers | Load |
|--------|----------|------|
| Light | Format conversion, form fill, extract, merge/split | SKILL.md + `briefs/process.md` |
| Standard | Report/poster/paper/resume | SKILL.md + matched brief |

**Brief routing:**

```
User Request → existing PDF? → extract/merge/split/convert → briefs/process.md
            → Report/proposal/contract → briefs/report.md (ReportLab)
            → Poster/infographic → briefs/creative.md (Playwright)
            → Academic/LaTeX → briefs/academic.md (Tectonic)
            → Resume → report.md / creative.md / academic.md
```

**Pre-routing checks:** Emoji → Creative; CJK → font coverage; Non-standard size → Creative; Character safety.

**Engines:** ReportLab (reports), Playwright (creative/posters), Tectonic (academic).

**Two HTML→PDF scripts:**
- `html2poster.js` — Single-page long-image (posters, covers)
- `html2pdf-next.js` — Multi-page documents

**Iron rules:** `page.pdf()` (vector) not screenshot; figures are block-level; `@page { margin: 0 }` mandatory; body bg = canvas bg; pre-run `poster_validate.py`.

**CLI subcommands:** `env.check`, `env.fix`, `convert.*`, `extract.*`, `pages.merge/split/rotate/crop/clean`, `form.fill`, `meta.set`

#### pptx
*Inspect and narrowly update PPTX elements using fingerprint-checked OOXML references.*

**Required workflow:** Read reference JSON → `inspect` → apply comment to exact element → `update-text`/`update-texts` → atomic replace.

**Safety:** sourceFingerprint (file sha256), textFingerprint, atomic temp+validate, ZIP bomb protection, path traversal/NUL detection. Exit codes: 2=stale reference, 1=file error.

### Utilities

#### restore-legacy-sessions
*Restore legacy ACP-era ZCode sessi

---

## 13. Animation Systems

ZCode uses **four layers** of animation working together:

### Layer 1: CSS Keyframe Animations

#### Stream Text Animation (`zcode-stream-text-in`)

```css
[data-zcode-stream-animate=true],
[data-zcode-tool-stream-animate=true],
[data-zcode-chat-loading-animate=true] {
  will-change: opacity;
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) both zcode-stream-text-in;
}
@keyframes zcode-stream-text-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

#### Stream Marker Animation (`zcode-stream-marker-in`)

```css
[data-zcode-stream-marker-animate=true]::marker {
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) 
    var(--zcode-stream-animation-delay, 0s) both zcode-stream-marker-in;
}
@keyframes zcode-stream-marker-in {
  0% { color: #0000; }
  100% { color: inherit; }
}
```

#### Collapsible Animation

```css
[data-zcode-collapsible-animate-close=true][data-state=closed] {
  animation: 0.3s ease-in-out forwards zcode-collapsible-up !important;
}
[data-zcode-collapsible-animate-close=true][data-state=closed] > * {
  animation: 0.3s ease-in-out forwards zcode-collapsible-fade-out !important;
}
@keyframes zcode-collapsible-up {
  0% { height: var(--radix-collapsible-content-height); }
  to { height: 0; }
}
@keyframes zcode-collapsible-fade-out {
  0% { opacity: 1; }
  to { opacity: 0; }
}
/* Reset when already applied:
[data-zcode-stream-animate=true], ... { animation: none; }
*/
```

#### Update Charge Sweep

```css
[data-slot=progress-indicator]:after {
  animation: 1.15s cubic-bezier(0.65, 0, 0.35, 1) infinite zcode-update-charge-sweep;
  transform: translate(-120%);
}
@keyframes zcode-update-charge-sweep {
  0% { opacity: 0.35; transform: translate(-120%); }
  100% { /* charge sweep animation */ }
}
```

#### Task Interaction Countdown

```css
.zcode-task-interaction-countdown-fill {
  animation: zcode-task-interaction-countdown 
    var(--zcode-interaction-remaining-ms, 240000ms) linear forwards;
  transform: scaleX(var(--zcode-interaction-progress, 1));
}
```

#### Reaction Burst (Particles + Pop)

```css
@keyframes zcode-reaction-particles {
  0% {
    opacity: 0;
    box-shadow: 7.7px 2.1px, 2.1px 7.7px, -5.7px 5.7px,
                -7.7px -2.1px, -2.1px -7.7px, 5.7px -5.7px;
  } /* 6 particles from center */
}
@keyframes zcode-reaction-pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
```

#### Browser Operation Breathe

```css
@keyframes browser-use-operation-breathe {
  0%, to { opacity: 0.5; transform: scale(0.9); }
}
```

#### Workspace Remote Connecting Breathe

```css
@keyframes workspace-remote-connecting-breathe {
  0%, to {
    background-color: color-mix(in oklab, var(--color-brand) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 10%, transparent);
  }
}
```

#### Task Search Result Highlight

```css
.task-search-result-highlight {
  animation: 1.2s ease-out both;
}
@keyframes task-search-result-highlight {
  0% {
    background-color: color-mix(in oklab, var(--color-brand) 20%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 28%, transparent);
  }
}
```

#### Pulse Caret (Syntax Highlight)

```css
@keyframes pulse-caret {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.pulse-caret {
  animation: pulse-caret 1s step-end infinite;
}
```

---

### Layer 2: Tailwind CSS Animations

```css
/* From styles-BxSv8qTx.css (366KB, Tailwind v4.2.2) */
.animate-spin     { animation: spin; }           /* 360° rotation */
.animate-ping     { animation: ping; }           /* scale up + fade */
.animate-pulse    { animation: pulse; }          /* opacity 50% at 50% */
.animate-in       { animation: enter; }          /* custom enter */
.animate-spin-slow { animation: spin 3s linear infinite; } /* 3s spinner */
```

---

### Layer 3: Framer Motion Patterns

```javascript
// Message appearance (ChatMessage)
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1],
    delay: idx * 0.02  // stagger
  }}
/>

// Stagger lists
<motion.div
  variants={{
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } }
  }}
  initial="hidden"
  animate="show"
>
  {/* Children: initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} */}
</motion.div>

// Button interactions
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.92 }}
/>

// Tab navigation (larger hover for inactive)
whileHover={{ scale: activeTab === tab ? 1 : 1.05 }}

// Spring pop (checkmarks/reactions)
const spring = { type: "spring", stiffness: 500, damping: 20 };

// ThinkingIndicator dots
// y: [0, -4, 0], duration: 0.6, repeat: Infinity, delay: i * 0.12
// Color: emerald-400

// ChatFlowAnimation steps
// initial={{ opacity: 0, x: -10, height: 0 }}
// animate={{ opacity: 1, x: 0, height: "auto" }}
// Timing: 600ms, 1500ms, 3000ms, 4500ms per step
```

---

### Layer 4: CLI Terminal Animations (Custom Ticker)

All CLI animations driven by a **shared global ticker** at 80ms intervals.

#### Shared Ticker (`useTicker.js`)

```javascript
const TICK_RATE_MS = 80;  // 80ms per tick

const subscribers = new Set();
let tickCount = 0;
let intervalId = null;

function tick() {
  tickCount++;
  for (const fn of subscribers) fn(tickCount);
}

function subscribe(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) {
    intervalId = setInterval(tick, TICK_RATE_MS);  // lazy start
  }
  fn(tickCount);  // immediate sync
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) clearInterval(intervalId);
  };
}
```

#### Animated Progress (`useAnimatedProgress.js`)

```javascript
export function useAnimatedProgress(targetPct, frames = 8, intervalMs = 20) {
  const [displayPct, setDisplayPct] = useState(targetPct);
  useEffect(() => {
    if (displayPct === targetPct) return;
    const start = displayPct;
    const delta = targetPct - start;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      setDisplayPct(start + delta * (frame / frames));
      if (frame >= frames) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [targetPct, displayPct, frames, intervalMs]);
  return displayPct;
}
```

#### Progressive Line Reveal (`useEntrance.js`)

```javascript
export function useEntrance(totalItems, ticksPerItem = 1, resetKey = null) {
  const ticks = useTicker();
  const [startTick, setStartTick] = useState(null);
  useEffect(() => { setStartTick(ticks); }, [totalItems > 0, resetKey]);
  if (startTick === null) return 0;
  const elapsed = ticks - startTick;
  const visible = Math.floor(elapsed / ticksPerItem);
  return Math.min(totalItems, visible);
}
```

#### Flash on Mount (`useFlashOnMount` in blocks.jsx)

```javascript
export function useFlashOnMount() {
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, []);
  return flash;
}
```

#### CLI Block Components (`blocks.jsx`, 661 lines)

```javascript
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];  // 5-frame spinner
const TOOL_VERBS = {
  read_file: 'Reading…', write_file: 'Writing…', edit_file: 'Writing…',
  run_shell: 'Running…', run_tests: 'Running tests…',
  list_files: 'Finding files…', search_code: 'Searching…',
  git_status: 'Checking git…'
};
const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob',
  search_code: 'Grep', git_status: 'Git status'
};
const READ_MAX = 15, CMD_MAX = 10;
```

**ThoughtBlock animation:**
```javascript
// Dots cycle: 0 → 1 → 2 → 3 → 0 (400ms per dot)
const dotsLength = Math.floor(ticks / 5) % 4;
const dots = '.'.repeat(dotsLength);
// Label: "Thinking..." or "Thought: 123ms"
// Progressive reveal: useEntrance(lines.length, 1, expanded) — 1 tick/line (80ms)
// Live cursor: █ bloc

---

## 14. Web UI Components

### Component Hierarchy

```
AIChatPage.jsx (1757 lines, /ai/chat)
├── TopBar (Export/Push, GitHub, Tab switcher)
├── Left Sidebar (Brand, New Chat, Recent Chats, Upgrade, Profile)
├── Main Content Area
│   ├── Chat view
│   │   ├── Message list (ChatMessage × N)
│   │   ├── TodoCard
│   │   ├── PermissionModal
│   │   └── Streaming indicators:
│   │       ├── ThinkingIndicator (chat mode, 3 bouncing dots)
│   │       ├── ChatFlowAnimation (chat mode, 5-step flow)
│   │       ├── WorkingHeader (agent mode)
│   │       ├── ThoughtBlock (agent mode)
│   │       └── SearchAnimation / SearchResultBlock
│   └── IDE view (AI Code Agent tab)
│       ├── FileTree (left, Monaco)
│       ├── EditorPane (center)
│       ├── TerminalPane (center, xterm.js)
│       └── AI Assistance chat (right, inline input)
└── Bottom (Prompt input, Send/Stop, Advanced/God Mode toggles)
```

### Animation Components

**ThinkingIndicator** — Framer Motion 3 bouncing dots: `y: [0, -4, 0]`, duration 0.6, repeat Infinite, stagger `i * 0.12`, emerald-400 color.

**ChatFlowAnimation** — 5-step sequential flow:
1. Assembling system context (Database icon) — 600ms
2. Understanding user intent (BrainCircuit) — 1500ms
3. Searching web & executing tools (Globe) — 3000ms
4. Drafting response (Edit3) — 4500ms
5. Updating memory (Save)
Each step: `initial={{ opacity: 0, x: -10, height: 0 }}` → `animate={{ opacity: 1, x: 0, height: "auto" }}` with rotating dashed border + bouncing dots.

**ChatMessage** — `initial={{ opacity: 0, y: 4 }}`, stagger `idx * 0.02`, streaming cursor `opacity: [0.3, 1, 0.3]` blink 1s.

**SearchAnimation** — 5 sub-components: SearchStatusLine, SourcePillRow (stagger `i * 0.05`), SourcesPanel (AnimatePresence), StreamingAnswer (35ms ticks), SearchResultBlock.

**ZCodeUX** — StepPulse, ToolCallCard (collapsible), WroteFile, DiffBlock, TerminalOutput (16ms typewriter), GoalTracker, AgentInputBar.

### Web Component Files

| Component | File | Description |
|-----------|------|-------------|
| DesignTab | `components/ide/DesignTab.jsx` | Template gallery \| preview \| prompt |
| PermissionModal | `components/ide/PermissionModal.jsx` | Allow/Deny/Always Allow |
| ModelSelector | `components/ide/ModelSelector.jsx` | Provider/model dropdown |
| TodoCard | `components/ide/TodoCard.jsx` | Plan with spring checkmarks |
| TerminalPane | `components/ide/TerminalPane.jsx` | xterm.js with fade-in |
| FileTree | `components/ide/FileTree.jsx` | Recursive tree |
| EditorPane | `components/ide/EditorPane.jsx` | Monaco + animated tabs |
| WorkspaceModals | `components/ide/WorkspaceModals.jsx` | ZIP/Git clone |

---

## 15. Terminal CLI Animations

### Block Types (`blocks.jsx`, 661 lines)

```javascript
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];  // 5-frame spinner
const TOOL_VERBS = {
  read_file: 'Reading…', write_file: 'Writing…', edit_file: 'Writing…',
  run_shell: 'Running…', run_tests: 'Running tests…',
  list_files: 'Finding files…', search_code: 'Searching…',
  git_status: 'Checking git…'
};
const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob',
  search_code: 'Grep', git_status: 'Git status'
};
const READ_MAX = 15, CMD_MAX = 10;
```

### CLI UI Hooks

| Hook | File | Ticker | Purpose |
|------|------|--------|---------|
| `useTicker` | `useTicker.js` | 80ms | Global tick counter (lazy setInterval) |
| `useAnimatedProgress` | `useAnimatedProgress.js` | 20ms, 8 frames | Percentage interpolation |
| `useEntrance` | `useEntrance.js` | 80ms ticks | Progressive line reveal |
| `useFlashOnMount` | `blocks.jsx` | 400ms timeout | Green flash for new content |

### CLI Block Animation Details

**SpinnerBlock:** `SPIN_FRAMES[ticks % 5]` at 80ms intervals

**RunningToolBlock:** Spinner + args preview + verb label

**ThoughtBlock:**
- Dot cycle: `Math.floor(ticks / 5) % 4` → 0-3 dots (400ms/dot)
- `useEntrance(lines.length, 1, expanded)` — 1 tick/line (80ms) progressive reveal
- Live cursor: `█` block on last line
- DAG formatting: bullets → `└──›` arrows

**ReadBlock / WriteBlock:**
- `useEntrance(display.length, 0.375)` — ~30ms/line reveal
- `useFlashOnMount()` — 400ms green flash (`#062012` bg, green border)
- Syntax highlighting via `cli-highlight`
- Max 15 lines when collapsed

**DiffBlock:**
- Staggered reveal by kind:
  - `add` lines: 0.2 ticks/line (~16ms) — fastest
  - `context` lines: 0.375 ticks/line (~30ms)
  - `remove` lines: 0.5 ticks/line (~40ms) — slowest
- Background: green (add), red (remove), none (context)

**CommandBlock:**
- `useEntrance(display.length, 0.375)` — progressive output reveal
- Max 10 lines when collapsed
- `$ ` prefix in green, command in bold

**TodoBlock:**
- Progress bar: `useAnimatedProgress(percent)` → 8 frames @ 20ms (160ms)
- Checkbox draw-in: `|` (dim) → `/` (medium) → `✓` (bright green) over 8 ticks (640ms)
- Running spinner: `SPIN_FRAMES[ticks % 5]` + 16-step brightness pulse
- Flash: newly completed todos flash green for 400ms

**PermissionBlock:**
- Flash-on-mount for new permission requests
- Status: `?` (pending, orange), `✓` (approved, green), `✗` (denied, red)

### CLI Terminal Theme

```css
.xterm {
  background: #0a0a0a;
  color: #f4f4f5;
  --xterm-color-0: #0a0a0a;   /* Black (background) */
  --xterm-color-1: #f871f1;   /* Red (errors) */
  --xterm-color-2: #10b981;   /* Green (success/additions) */
  --xterm-color-3: #eab308;   /* Yellow (warnings) */
  --xterm-color-4: #3b82f6;   /* Blue (info/commands) */
  --xterm-color-5: #a855f7;   /* Magenta (debug) */
  --xterm-color-6: #2dd367;   /* Cyan (system) */
  --xterm-color-7: #e5e5e5;   /* White (primary text) */
  --xterm-color-8: #27272a;   /* Bright Black (dimmed) */
  --xterm-color-9: #fb6b6b;   /* Bright Red */
  --xterm-color-10: #2dd677;  /* Bright Green */
  --xterm-color-11: #fbbf24; /* Bright Yellow */
  --xterm-color-12: #60a5fa;  /* Bright Blue */
  --xterm-color-13: #c084fc; /* Bright Magenta */
  --xterm-color-14: #4feda8; /* Bright Cyan */
  --xterm-color-15: #f4f4f5;/* Bright White */
}
```CH15
echo "15 done"
__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/c/Users/mahen/AppData/Local/Temp/zcode-8879d230-2489-406e-b9a8-a2e1f309b2bd-cwd'; fi
exit "$__zcode_status"

---
## 15. Terminal CLI Animations
EOF
echo "checking file state"
wc -l "/d/projects/mcoode/ZCODE-KNOWLEDGE-BASE.md"
__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/c/Users/mahen/AppData/Local/Temp/zcode-c5e8b279-27c1-456d-a607-2805b5be81e6-cwd'; fi
exit "$__zcode_status"


---
## 15. Terminal CLI Animations

### Block Types (blocks.jsx, 661 lines)
SPIN_FRAMES = dot-pattern-spinner, TOOL_VERBS, TOOL_LABELS, READ_MAX=15, CMD_MAX=10

### CLI UI Hooks
- useTicker (80ms): Global tick counter
- useAnimatedProgress (20ms, 8 frames): Percentage interpolation  
- useEntrance (80ms ticks): Progressive line reveal
- useFlashOnMount (400ms): Green flash for new content

### CLI Block Animation Details
ThoughtBlock: dots cycle (400ms/dot), progressive reveal (~30ms/line), DAG arrows
Read/WriteBlock: ~30ms/line reveal, 400ms green flash, syntax highlighting, max 15 lines
DiffBlock: add=16ms/line, context=30ms/line, remove=40ms/line stagger
CommandBlock: ~30ms/line reveal, $ prompt in green, max 10 lines
TodoBlock: 160ms progress bar, 640ms checkbox draw-in, 2560ms running pulse, 400ms flash
PermissionBlock: ? pending, check approved, x denied, flash-on-mount

### Terminal Theme
16-color ANSI palette: black=#0a0a0a, red=#f871f1, green=#10b981, yellow=#eab308,
  blue=#3b82f6, magenta=#a855f7, cyan=#2dd367, white=#e5e5e5


---
## 16. Test Suite

### Test Configuration

#### Vitest (root-level, vitest.config.js)
Runs Node-environment unit tests from packages/**/tests/**/*.test.js.
Uses forks pool with v8 coverage scoped to packages/shared/src/**. Global globals enabled.
Root script: npm test -> vitest run

#### Playwright (packages/web/playwright.config.ts)
- webServer: npx vite --port 5175 (auto-starts/stops)
- project: chromium (Desktop Chrome)
- reporter: HTML
- retries: 1 (CI: 2)
- trace: on-first-retry, screenshot: only-on-failure, video: retain-on-failure
- timeout: 60s per test
- Web script: npm test -> playwright test

### Playwright E2E Tests (13 Spec Files)

| # | File | Focus |
|---|------|-------|
| 1 | animations.spec.js | Framer Motion usage, motion.button not plain button, fieldVariants, no GSAP |
| 2 | chat-animations.spec.js | ThinkingIndicator, ChatMessage, MessageContent, react-markdown, 3-view consistency |
| 3 | chat-flow.spec.js | Slash commands (/), /help, /clear, /god, /undo, /model, /watch, /debug, /export |
| 4 | chat-mode.spec.js | Empty state (12-line SVG spinner 3s), ThinkingIndicator, cursor blink, stagger delays |
| 5 | ai-chat.spec.js | AIChatPage render, sidebar, tabs, God Mode toggle, file upload |
| 6 | advanced-mode.spec.js | Mode toggle styling, God Mode, AI Code Agent IDE layout |
| 7 | components.spec.js | Header animations, FeaturesGrid, Testimonials, IDE components |
| 8 | landing.spec.js | h1, CTA (motion.button), hero, features, footer, nav links >=3 |
| 9 | auth.spec.js | LoginPage, SignupPage, Google OAuth, OTP flow (6 inputs + dev code) |
| 10 | chat-search-real.spec.js | Real login + web search -> SearchResultBlock, SourcePillRow, SourcesPanel |
| 11 | settings.spec.js | SettingsPage tabs >=4, God-Mode tab, motion buttons, toggle switches |
| 12 | settings-models.spec.js | ApiKeysTab (providers search, static catalog, gradient border), UsageTab (real data, heatmap >=10 cells, tokens chart) |
| 13 | terminal-check.spec.ts | terminal:write events -> xterm, content + dimensions |

### Unit Tests (Vitest)

#### CLI Tests (packages/cli/tests/)
| File | Tests | Focus |
|------|-------|-------|
| router.test.js | 4 | ModelRouter: mock:mock for all domains, rate-limiting (61 reqs->null), excludes, routing overrides |
| undo-thread.test.js | 8 | Undo ID threading: write_file/edit_file return undoId, read_file does NOT, LIFO fallback |
| vault.test.js | 7 | AES-256-GCM, legacy pre-salt vaults, corrupt backup, maskSecret |

#### Shared Tests (packages/shared/tests/)
| File | Tests | Focus |
|------|-------|-------|
| domains.test.js | 3 | Routing table, ends with mock:mock, domain colors |
| plan.test.js | 7 | normalizeTodo/Plan, validatePlan, findCycle (DAG), planWaves, isEligible, mergeResults |
| plugins.test.js | 5 | Registry >=40 plugins, category/description/config validation, listPlugins filter |

#### Backend Tests (packages/backend/tests/)
| File | Tests | Focus |
|------|-------|-------|
| auth-otp.test.js | 8 | OTP flow: send-otp, signup/duplicate, verify, wrong OTP, login intent |
| db.test.js | 3 | Memory storage: CRUD, ///sorting, isolation per model |
| sockets.test.js | 4 | Socket.IO: CLI->web forwarding, build:complete, watch:fix, token rejection |

#### Plugin Tests
| File | Tests | Focus |
|------|-------|-------|
| test_pptx_reference.py | 23 (22 active + 1 Windows-skipped) | Fingerprint validation, archive security, text updates, CLI contracts |

### Test Categories Summary
| Category | Files | Test Cases |
|----------|-------|------------|
| E2E (Playwright) | 13 spec files | 60+ assertions |
| Unit (Vitest) | 9 test files | 34 cases |
| Plugin (Python) | 1 file | 23 methods |
| **Total** | **23 files** | **~97+ cases** |

### Test Run Results
| Suite | Status | Details |
|-------|--------|---------|
| Root (npm test) | Failed | 33 failed tests |
| Web (.last-run.json) | Passed | 0 failures |
| Chat flow e2e | Some failed | Error context files exist |

### PPTX Test Details (test_pptx_reference.py, 467 lines)

**23 test methods across 6 categories:**

**Fingerprint validation (5 tests):**
- test_inspects_shape_by_fingerprint_slide_part_and_node_id
- test_updates_shape_text_through_validated_temporary_output
- test_updates_exact_table_cell
- test_updates_multiple_references_from_one_source_revision
- test_user_context_does_not_change_full_text_fingerprint_guards
- test_inspect_resolves_the_same_bytes_that_were_fingerprinted
- test_batch_updates_the_same_bytes_that_were_fingerprinted

**Archive security (6 tests):**
- test_fails_closed_on_changed_source_without_output
- test_fails_closed_on_ambiguous_node_id
- test_fails_closed_on_text_or_cell_coordinate_conflict
- test_rejects_non_pptx_source_and_output_paths
- test_rejects_archive_before_reading_when_compressed_source_exceeds_limit
- test_rejects_entry_count_single_entry_total_and_media_limits
- test_rejects_high_compression_ratio
- test_rejects_duplicate_and_abnormal_entry_names
- test_rejects_nul_in_raw_entry_name

**Temporary file safety (3 tests):**
- test_limit_failure_does_not_create_output_or_leave_temporary_file
- test_copy_failure_removes_temporary_file
- test_atomic_replace_preserves_existing_output_permissions (skipped on Windows)

**CLI/output contract (4 tests):**
- test_cli_json_contract_is_serializable
- test_cli_reports_stable_zip_limit_reason
- test_cli_reports_stable_invalid_zip_entry_reason

**Bounded read safety (1 test):**
- test_update_streams_zip_entries_without_unbounded_reads

### Error Types Referenced in Tests
- PptxArchiveLimitError (reasons: archive bytes, entries, entry bytes, total uncompressed, media bytes, compression ratio)
- PptxInvalidArchiveError (duplicate entries, path traversal, absolute paths, backslashes, NUL bytes)
- PptxReferenceConflict (fingerprint, ambiguous, text fingerprint, coordinate)

### ZIP Limit Constants
- max_archive_bytes
- max_entries
- max_entry_uncompressed_bytes
- max_total_uncompressed_bytes
- max_media_bytes
- max_compression_ratio


---
## 17. mcoode Project

### Project Structure

```
D:\projects\mcoode\
├── package.json
├── package-lock.json (388KB)
├── vitest.config.js
├── docs\
│   ├── cli\
│   │   └── zcode-cli-animations.md
│   └── web\
│       ├── zcode-animations.md
│       ├── zcode-ui-elements.md
│       └── zcode-tools.md
├── scripts\
├── .zcode\
│   └── plans\
│       ├── plan-sess_07583c46...md  (Chat/Agent dashboard impl)
│       ├── plan-sess_bd91e3c3...md  (Fast streaming fix)
│       └── plan-sess_d2533d63...md  (OpenTUI migration)
├── packages\
│   ├── cli\
│   │   ├── src\ui\blocks.jsx (661 lines)
│   │   ├── src\ui\useAnimatedProgress.js
│   │   ├── src\ui\useEntrance.js
│   │   ├── src\ui\useTicker.js
│   │   └── tests\
│   │       ├── router.test.js
│   │       ├── undo-thread.test.js
│   │       └── vault.test.js
│   ├── web\
│   │   ├── src\pages\AIChatPage.jsx (1757 lines, /ai/chat)
│   │   ├── src\components\chat\
│   │   │   ├── ThinkingIndicator.jsx
│   │   │   ├── ChatFlowAnimation.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── MessageContent.jsx
│   │   │   ├── SearchAnimation.jsx
│   │   │   ├── ThoughtBlock.jsx
│   │   │   ├── WorkingHeader.jsx
│   │   │   ├── ZCodeUX.jsx
│   │   │   └── AgentActionSequence.jsx
│   │   ├── src\components\ide\
│   │   │   ├── WaveProgress.jsx, SparkleButton.jsx
│   │   │   ├── DesignTab.jsx, PermissionModal.jsx
│   │   │   ├── ModelSelector.jsx, TodoCard.jsx
│   │   │   ├── TerminalPane.jsx, FileTree.jsx
│   │   │   ├── EditorPane.jsx, WorkspaceModals.jsx
│   │   ├── src\store\chatSlice.js, index.js
│   │   ├── src\hooks\useChatSocket.js
│   │   ├── src\index.css
│   │   ├── e2e\ (13 Playwright spec files)
│   │   └── playwright.config.ts
│   ├── backend\  (src + tests: auth-otp, db, sockets)
│   └── shared\  (src: events.js, domains.js, models.js, plugins.js + tests)
└── test-results\
