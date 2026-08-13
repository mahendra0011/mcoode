# God Mode — Complete Architecture & Flow

> Parallel subagent execution at scale. 100-300 agents → same-codebase safety.

---

## 1. Overview

God Mode = `mcode god "<prompt>"` or toggle in web UI. Creates a project-wide plan, launches 50-300 domain-specialized subagents in parallel waves, runs integration tests, auto-fixes failures, and verifies completion.

```
User Prompt → Planner (AI) → Task DAG → File Ownership Map → 
  Wave 1 (independent todos) → 100 subagents parallel
    → Wave 2 (depend on wave 1) → more subagents
    → N waves → Integration Tests → Bugfix Rounds → Build Complete
```

---

## 2. Complete Flow — Start to End

### Phase 1: Project Scan + Model Warmup
1. **Scan codebase** — reads package.json, README, git status, file tree
2. **Warm up models** — `ModelRouter.warmUp()` fetches best model for each domain in parallel (50ms/model)
3. **Load hooks** — `.mcode/hooks.js` for `preBuild`, `preWave`, `preAgent`, `postAgent`, `postWave`, `postTest`, `postBuild`
4. **Initialize undo stack** — `undo.json` persists all file writes for rollback

### Phase 2: Planning (AI)
```
User prompt + codebase context → Planner (ChatAgent)
→ Generates plan: { summary, todos: [{ id, domain, title, description, files, dependsOn, maxTurns }] }
→ resolveFileConflicts(plan) — chains same-file todos into dependency order
→ planWaves(plan) — topological sort into waves
```

### Phase 3: Wave Execution (Parallel Subagents)
Each wave runs independently; subagents in the same wave never touch the same file.

```
for each wave:
  1. Filter ready todos (isEligible — all deps DONE)
  2. Dispatch up to `concurrency` subagents (default: CPU count × 2)
  3. Each subagent gets domain-specific model assignment from ModelRouter
  4. Subagent runs with JSON tool protocol: {tool, args} → file edits, test runs, shell commands
  5. Results collected → merged into undo stack
  6. Wait for all wave subagents to complete
  7. preWave/preAgent/postAgent hooks fire
```

### Phase 4: Integration Tests
```
npm test → if fail → _bugfixRounds()
→ One bugfix subagent per FAILED todo
→ Re-run tests
→ Up to 3 rounds
```

### Phase 5: Watch Mode (if enabled)
Background subagent monitors file changes + test results, auto-fixes new issues while user continues working.

### Phase 6: Completion
```
BUILD_COMPLETE event → summary with:
- done/failed/needsReview counts
- elapsed time, token usage, cost estimate
- models used per domain
- file changes (undo stack count)
```

---

## 3. Layered Model Scoring System

Model selection uses 5-layer weighted scoring. Higher score = preferred.

### Layer 1: Static Benchmark (20% weight)
```js
// Per-domain benchmark scores from public eval (SWE-bench, HumanEval, etc.)
const STATIC_BENCHMARK = {
  'claude-3-5-sonnet':  { planning: 0.92, frontend: 0.88, backend: 0.91, db: 0.85, test: 0.87, bugfix: 0.90 },
  'gpt-4o':             { planning: 0.85, frontend: 0.92, backend: 0.88, db: 0.83, test: 0.91, fixup: 0.86 },
  'gemini-2.0-flash':   { planning: 0.80, frontend: 0.85, backend: 0.89, db: 0.81, test: 0.88, fixup: 0.83 },
};
```

### Layer 2: Historical Success Rate (50% weight)
```js
// Per-model, per-domain, per-project-stack success tracking
// Stored in ~/.mcode/scores/{projectId}/model-scores.json
{
  "claude-3-5-sonnet:frontend": {
    success: 42,      // tasks passed (tests passed on first try)
    total: 50,        // total tasks dispatched
    avgFixups: 0.12,  // avg bugfix rounds per task (lower = better)
    avgLatency: 4.2,  // avg seconds per 1K tokens (lower = better)
    avgCost: 0.002    // avg $ per 1K tokens (lower = better)
  }
}
```

**Scoring formula:**
```
historical_score = 
  (success / total) * 100          // success rate (0-100)
  - (avgFixups * 15)               // penalty per fixup round
  - (avgLatency > 5 ? 5 : 0)       // slow model penalty
  - (avgCost > 0.01 ? 10 : 0)      // expensive model penalty
```

### Layer 3: Task Fingerprint Match (20% weight)
```js
// Matches model → framework/language → task type
{
  "claude-3-5-sonnet": {
    frameworks: { react: 0.95, vue: 0.80, svelte: 0.60 },
    languages:  { js: 1.0, ts: 0.95, python: 0.90 },
    taskTypes:  { "code-gen": 0.92, "bug-fix": 0.88, "refactor": 0.85, "test": 0.91 }
  }
}
```

### Layer 4: User Override (10% weight — highest priority)
```js
// From ~/.mcode/config.json → routing preferences
{
  "roles": {
    "frontend": { "preferredModels": ["gemini-2.0-flash"] },  // pinned by user
    "backend":  { "preferredModels": ["claude-3-5-sonnet"] }
  }
}
```
User overrides bypass scoring entirely for that domain.

### Layer 5: Live Fallback/Escalation (auto-trigger)
If a model fails 3 consecutive times for a todo type:
```
escalated_models[domain] = otherModels
  .filter(m => historical_score[m][domain] > threshold)
  .sortDescending()
  .slice(0, N)
```
Switches to next-best model automatically for that domain.

### Final Formula
```
final_score(model, domain, task) =
  0.20 × static_benchmark_score(model, domain) +
  0.50 × historical_success_rate(model, domain) +
  0.20 × fingerprint_match(model, task.framework, task.language) +
  0.10 × user_override_priority(model, domain)
  + live_escalation_adjustment(model, domain)
```

---

## 4. File Ownership Map + Lock Queue

### Static Resolution (`resolveFileConflicts` in shared/plan.js)
Before any execution, todos that touch the same file are chained:
```js
// If todoA writes to src/App.jsx and todoB also writes to src/App.jsx:
// → todoB.dependsOn includes todoA (sequential, not parallel)
```

### Runtime Lock Queue (enhanced `SubagentManager`)
Additional layer: when shared files (constants, types, configs) need cross-todo edits:

```
Agent A → requests lock on "src/types.ts"   → ✅ Granted
Agent B → requests lock on "src/types.ts"   → ⏳ Queued (runs independent work meanwhile)
Agent A → finishes edit + commits          → lock released
Agent C → requests lock on "src/types.ts"   → ✅ Granted (next in queue)
```

**Lock API:**
```js
class FileLockManager {
  async acquireLock(agentId, filePath, timeout = 30000) { ... }
  releaseLock(agentId, filePath) { ... }
  // Integration agent batches queued shared-file requests
}
```

### Shared File Detection Heuristics
Files classified as **shared** (need locks, not just dependency chains):
- Path patterns: `src/types*`, `src/config*`, `src/constants*`, `**/schema.*`, `**/types.*`
- File extensions: `.schema.js`, `.types.ts`
- Cross-domain usage: tracked via previous wave file access logs

Files classified as **exclusive** (safe to parallelize):
- Component files: `*.component.*`, `*.jsx`, `*.tsx`
- Domain-specific files: `frontend/**`, `backend/routes/**`, `db/migrations/**`

---

## 5. Watch Mode Flow

### A. During God Mode
Watch mode **auto-enabled** when god mode starts. A background "watchdog" subagent:
- Monitors file writes via git diff every 5s
- Runs `npm test` in 30s intervals
- Scans for import errors / syntax errors
- Detects new bugs introduced by parallel agents
- Auto-dispatches bugfix subagents for new issues

### B. Standalone Watch Mode (`/watch on`)
```
/watch on → starts detached daemon process
  → watches file changes
  → on each change:
    1. Detect changed files
    2. Determine affected domains (frontend/backend/db)
    3. Dispatch 1 bugfix subagent (best model for bugs/errors domain)
    4. Run tests
    5. Notify user via toast
  → survives terminal close (detached process)
  → /watch off | status | logs | undo to control
```

The watchdog auto-selects models using the scoring system — bugs/errors/testing domain models get priority.

---

## 6. Watch Mode + Normal Build Mode

| Feature | Normal Build | Watch Mode |
|---------|-------------|------------|
| File scanning | Once at start | Continuous (5s interval) |
| Test running | Integration pass at end | Every 30s continuously |
| Bug detection | Post-test bugfix rounds | Real-time during development |
| Agent dispatch | Wave-based parallel | On-demand bugfix agents |
| Model selection | Scoring system | Bugs/errors domain models prioritized |
| Process lifecycle | Completes + exits | Daemon, survives terminal close |
| User interaction | Wait for completion | Live (user keeps working) |

---

## 7. Completion Verification Loop

After all waves + bugfix rounds, the system re-reads the user's prompt to verify:

```
User prompt: "Create a login page with OTP"
→ After build: AI agent re-reads prompt
→ Checks: LoginPage.jsx exists ✓, OTP flow works ✓, tests pass ✓
→ If any requirement unmet → restart with adjusted plan (max 2 re-reads)
→ If all met → mark complete
```

Each completed todo gets a checkmark in the plan. When all todos are checked → build summary.

---

## 8. CLI UI Integration

### God Mode State in App.jsx
```js
// Triggers ProcessingScreen overlay
{ kind: 'system', message: { mode: 'god', projectPath, status: 'in_progress' } }

// Build elapsed timer (via useTicker, 1s granularity)
const elapsed = Math.floor(ticks / 12.5);

// Wave start/complete events → AgentStrip + StatusBar updates
WAVE_START → emit to AgentStrip
WAVE_COMPLETE → emit to StatusBar
BUILD_COMPLETE → emit final summary
```

### ProcessingScreen (CLI)
```
╭─ Build in progress ──────────────────╮
│ Wave 3/7 • 12/45 agents running      │
│                                       │
│ [██████░░░░░░░░░░] 32% │ 2:45 elapsed │
│ frontend: 8/10 done                    │
│ backend:  4/12 done                    │
│ db:       0/5 done                     │
│ test:     0/3 done                     │
│                                       │
│ 🔴 SubAgent [backend] Fixing Express  │
│ ⚙️  SubAgent [frontend] Building Comp │
│ ⚙️  SubAgent [frontend] Writing tests │
╰───────────────────────────────────────╯
```

### Web AI ChatPage (God Mode)
- Topbar God Mode toggle: purple-pink gradient glow
- WaveProgress component: animated progress bars (width 0→pct%)
- Chat messages: size="sm" (compact IDE style)
- ThinkingIndicator: compact (no avatar)
- PermissionModal: height expand (0→auto, 150ms)

---

## 9. Event Flow (Backend → Frontend)

### CLI Events → Socket.IO → Web
```
EVENTS.MESSAGE (stream) → socket.emit('chat:stream', {text: chunk})
EVENTS.SUBAGENT_CREATED → socket.emit('subagent:created', {todoId, domain})
EVENTS.SUBAGENT_STARTED → socket.emit('subagent:started', {todoId, model})
EVENTS.SUBAGENT_STEP   → socket.emit('subagent:step', {todoId, message})
EVENTS.SUBAGENT_DONE   → socket.emit('subagent:done', {todoId, summary})
EVENTS.SUBAGENT_FAILED → socket.emit('subagent:failed', {todoId, error})
EVENTS.WAVE_START      → socket.emit('wave:start', {wave, total, todos})
EVENTS.WAVE_COMPLETE   → socket.emit('wave:complete', {wave, total, results})
EVENTS.INTEGRATION_PASS → socket.emit('integration:pass', {ran, status, exitCode})
EVENTS.BUILD_COMPLETE  → socket.emit('build:complete', {done, total, failed, cost, tokens, models})
EVENTS.TOAST           → socket.emit('toast', {kind, text})
EVENTS.PERMISSION_ANSWER → socket.emit('chat:permission', {requestId, tool, args})
```

### Web Events → Socket.IO → CLI
```
session:start → orchest.sessionStart()
plan:generated → orchest.receivePlan()
agent:started/stopped → orchest.setAgentStatus()
chat:send → orchest.chat()
chat:interrupt → orchest.interrupt()
chat:permission_answer → orchest.permissionAnswer()
terminal:command → orchest.runShellCommand()
```

---

## 10. Completion Criteria

A god-mode build is "complete" when:
1. ✅ All waves executed
2. ✅ All todos done OR failed (with max 3 bugfix retries)
3. ✅ Integration tests passing (or failures documented)
4. ✅ User prompt requirements verified by re-read
5. ✅ Undo stack has all file changes recorded
6. ✅ BUILD_COMPLETE event emitted with summary

When complete:
- CLI: ProcessingScreen → final summary card (tokens, cost, time)
- Web: WaveProgress → build summary, chat returns to normal
- Files: `git diff` shows all changes, `undo.json` enables `/undo`

---

## 11. Watch Mode Completion

Watch mode has no "completion" — it's a daemon:
- Runs until `/watch off` or process killed
- Auto-fixes bugs continuously
- Stats available via `/watch status` or `/watch logs`
- Undo via `/undo` (works alongside watch)