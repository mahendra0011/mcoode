# ZCode Smart Engine — Complete Architecture Documentation

> **Folder**: `C:\Users\mahen\.zcode` (project root: `packages/`)
> **Last updated**: 2026-09-10

---

## Table of Contents

1. Overview
2. Architecture Layers
3. Smart Engine Processing Flow
4. Phase 1: Tech Stack Detection
5. Phase 2: Plan Generation
6. Phase 3: Wave-Based Parallel Execution
7. Phase 4: Subagent Execution
8. Integration Tests + Bugfix Rounds
9. Watch Mode Daemon
10. Turn Machine Phases
11. Model Router / Scoring System
12. Special Modes
13. Hooks System
14. Animation System
15. IDE Event Bridge
16. Todo Lifecycle
17. Chat vs Agent vs God Mode
18. File Lock Manager
19. Undo Stack
20. Cost Tracking
21. Auto-Search
22. Error Recovery

---

## 1. Overview

The ZCode Smart Engine is a multi-agent orchestration system that takes a natural-language task prompt and executes it end-to-end across a codebase. It operates in two primary modes:

- **God Mode** (CLI `runGod()` / web `chat:send` with mode=`god`): Full pipeline — plan → parallel subagents → tests → bugfix → watch
- **Chat/Agent Mode** (CLI `chat()` / web `chat:send` with mode=`chat`/`agent`): Single agent with optional planning

The engine lives in three packages:
- **`packages/cli/src/core/`** — orchestration logic (`orchestrator.js`, `subagent-manager.js`, `subagent.js`, `planner.js`, `router.js`, `chat-agent.js`, `watch-daemon.js`)
- **`packages/backend/src/`** — Socket.IO bridge (`sockets.js`, `chat-session.js`) relaying CLI events to the IDE
- **`packages/shared/src/`** — shared contracts (`plan.js`, `domains.js`, `events.js`)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   IDE/Web    │────▶│  Backend     │────▶│   CLI Core   │
│  (React+TS)  │     │ (Node+Socket)│     │ (Node ESM)   │
│              │     │              │     │              │
│ useChatSocket │────▶│ chat-sessions│────▶│ Orchestrator │
│ Redux store   │◀───▶│ events → CLI │◀───▶│ SubagentMngr │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Architecture Layers

| Layer | Package | Files | Responsibility |
|-------|---------|-------|----------------|
| **Planning** | `cli/src/core/` | `planner.js` | Generates dependency-ordered todo plan via LLM |
| **Orchestration** | `cli/src/core/` | `orchestrator.js` | Coordinates plan → subagents → tests → watch |
| **Subagent** | `cli/src/core/` | `subagent-manager.js`, `subagent.js` | Individual agent loop (think → tool → repeat) |
| **Model Routing** | `cli/src/core/` | `router.js` | 5-layer weighted scoring per domain |
| **Tools** | `cli/src/core/` | `tools.js` | File/shell/git/browser/web tool implementations |
| **Watch** | `cli/src/core/` | `watch-daemon.js` | File watching, lint fixing, auto-commit |
| **Backend Bridge** | `backend/src/` | `chat-session.js`, `sockets.js` | Socket.IO ↔ CLI event forwarding |
| **Frontend State** | `web/src/` | `chatSlice.ts`, `useChatSocket.ts` | Redux state for all UI rendering |
| **Shared Contracts** | `shared/src/` | `plan.js`, `domains.js`, `events.js` | Plan normalization, domain constants |

---

## 3. Smart Engine Processing Flow

### God Mode — Full Pipeline

```
User prompt → Orchestrator.runGod()
  1. Tech stack detection (detectTechStack)
  2. Repo context compilation (README, package.json, file tree)
  3. Planner.plan() → LLM generates JSON plan with todos
  4. SubagentManager.runAll()
     ├── preBuild hook
     ├── planWaves() → topological sort into dependency waves
     ├── FOR each wave:
     │   ├── preWave hook
     │   ├── WAVE_START event emitted
     │   ├── Queue ready todos → _schedule() → _spawn()
     │   │   ├── preAgent hook (per subagent)
     │   │   ├── Subagent.run() — think → tool → repeat loop
     │   │   ├── SUBAGENT_CREATED/STARTED/STEP/DONE events
     │   │   └── postAgent hook (per subagent)
     │   ├── Wait for all running + queued to finish
     │   ├── WAVE_COMPLETE event emitted
     │   └── postWave hook
     ├── _integrationPass() — runs `npm test`
     ├── _bugfixRounds() → up to 3 rounds of auto-fix subagents
     ├── mergeResults() → final summary
     └── postBuild hook
  5. BUILD_COMPLETE event emitted (with summary, cost, tokens, models)
  6. (Optional) startWatch() → WatchDaemon
```

### Chat/Agent Mode — Single Agent Loop

```
User prompt → ChatSession.sendMessage()
  ├── promptNeedsPlanning() check (skip if < 50 chars or trivial)
  ├── (Agent mode only) Planner.plan() → plan with todos
  ├── router.pick('build') → select model
  └── ChatAgent.run(prompt)
      ├── Stream LLM response (chat:stream chunks)
      ├── Parse tool calls from LLM output (JSON or XML)
      ├── Emit chat:tool_call STARTED event
      ├── Execute tool (read_file, write_file, edit_file, run_shell, ...)
      │   ├── Permission gate for shell/write commands
      │   └── Auto-search for web_search/web_fetch tools
      ├── Emit chat:tool_call DONE event with results
      ├── Update todo status (in agent mode)
      ├── Repeat for next turn (max 12-15 turns)
      └── chat:done event emitted
```

---

## 4. Phase 1: Tech Stack Detection

**File**: `packages/cli/src/core/techstack.js`

Before planning, the engine detects the project's tech stack to inject context into the planner:

```js
function detectTechStack(projectPath) {
  const stack = {
    frontend: [], backend: [], databases: [],
    testFrameworks: [], buildTools: [], languages: [],
    packageManager: 'npm', rawDeps: []
  };

  // 1. Read package.json
  const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json')));
  for (const dep of Object.keys(pkg.dependencies || {})) {
    stack.rawDeps.push(dep);
    // Framework detection
    if (dep.includes('react')) stack.frontend.push('React');
    if (dep.includes('next')) stack.frontend.push('Next.js');
    if (dep.includes('vue')) stack.frontend.push('Vue');
    if (dep.includes('svelte')) stack.frontend.push('Svelte');
    if (dep.includes('express')) stack.backend.push('Express');
    // Test framework detection
    if (dep.includes('jest')) stack.testFrameworks.push('Jest');
    if (dep.includes('vitest')) stack.testFrameworks.push('Vitest');
    if (dep.includes('cypress')) stack.testFrameworks.push('Cypress');
  }

  // 2. Top-level files
  const topFiles = readdirSync(projectPath);
  if (topFiles.includes('go.mod')) stack.languages.push('Go');
  if (topFiles.includes('Cargo.toml')) stack.languages.push('Rust');
  if (topFiles.includes('tsconfig.json')) stack.languages.push('TypeScript');
  if (topFiles.includes('requirements.txt')) {
    stack.languages.push('Python');
    stack.packageManager = 'pip';
  }

  // 3. Recursive source file extension scan (up to 3 levels deep)
  const exts = scanExtensions(projectPath, 3);
  if (exts.has('.py')) stack.languages.push('Python');
  if (exts.has('.go')) stack.languages.push('Go');
  if (exts.has('.rs')) stack.languages.push('Rust');
  if (exts.has('.java')) stack.languages.push('Java');
  if (exts.has('.csproj')) stack.languages.push('C#');
}

function smartDefaults(stack) {
  return {
    testCommand: stack.testFrameworks.includes('Vitest') ? 'npx vitest run'
               : stack.testFrameworks.includes('Jest') ? 'npx jest'
               : stack.testFrameworks.includes('Cypress') ? 'npx cypress run'
               : 'npm test',
    buildCommand: stack.buildTools.includes('Vite') ? 'npm run build'
                : stack.frontend.includes('Next.js') ? 'npm run build'
                : 'npm run build',
    devPort: 3000,
    domains: stack.frontend.length > 0 ? ['frontend', 'backend'] : ['backend'],
  };
}
```

Detection sources:
1. package.json dependencies
2. Top-level files (go.mod, Cargo.toml, tsconfig.json, etc.)
3. Recursive source file extension scan (up to 3 levels deep)

This context is compiled into a `repoContext` string and injected into the planner's system prompt under `PROJECT CONTEXT (existing code to extend)`.

---

## 5. Phase 2: Plan Generation

**File**: `packages/cli/src/core/planner.js`

The Planner sends a system prompt to an LLM (selected via `router.pick('planning')`) asking it to output a JSON plan:

```json
{
  "summary": "one-line summary of the build",
  "todos": [
    {
      "id": "t1",
      "title": "Set up project structure",
      "description": "Create basic files and directories",
      "domain": "backend",
      "dependsOn": [],
      "files": ["src/index.ts", "package.json"]
    }
  ]
}
```

### Rules enforced by the planner:
- Domain must be one of: `frontend | backend | db | devops | test | docs | bugfix | planning`
- No two todos should touch the same file (dependency chain enforced)
- 4-14 granular todos per plan (each doable by one agent)
- Always includes a test todo depending on core implementation
- Titles kept under 8 words

### Plan normalization (`packages/shared/src/plan.js`)

```js
const MAX_TODOS = 14;

function normalizeTodo(raw, index) {
  return {
    id: raw.id || `t${index}`,
    title: raw.title,
    description: raw.description || raw.title,
    domain: raw.domain || 'backend',
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
    files: Array.isArray(raw.files) ? raw.files : [],
    status: 'pending',
    assignedModel: null,
    wave: null,
    startedAt: null,
    finishedAt: null,
    error: null,
    completedFiles: new Set(),
  };
}

function normalizePlan(raw) {
  let todos = (raw.todos || []).map(normalizeTodo);
  if (todos.length > MAX_TODOS) todos = todos.slice(0, MAX_TODOS);
  // Filter invalid dependencies (non-existent todo IDs)
  const validIds = new Set(todos.map(t => t.id));
  todos.forEach(t => t.dependsOn = t.dependsOn.filter(id => validIds.has(id)));
  // Resolve file conflicts
  resolveFileConflicts(todos);
  // Check for cycles
  if (findCycle(todos)) throw new Error('Dependency cycle detected');
  return { summary: raw.summary || 'Auto-generated plan', todos };
}

function findCycle(todos) {
  const visited = new Set();
  const visiting = new Set();
  function dfs(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const todo = todos.find(t => t.id === id);
    if (todo) {
      for (const dep of todo.dependsOn) {
        if (dfs(dep)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  for (const todo of todos) {
    if (dfs(todo.id)) return todo.id;
  }
  return null;
}

function resolveFileConflicts(todos) {
  const fileToTodo = new Map();
  for (const todo of todos) {
    for (const file of todo.files) {
      if (fileToTodo.has(file)) {
        if (!todo.dependsOn.includes(fileToTodo.get(file))) {
          todo.dependsOn.push(fileToTodo.get(file));
        }
      } else {
        fileToTodo.set(file, todo.id);
      }
    }
  }
}

function planWaves(plan) {
  const waves = [];
  const remaining = [...plan.todos];
  const completed = new Set();
  while (remaining.length > 0) {
    const wave = remaining.filter(t =>
      t.dependsOn.every(dep => completed.has(dep))
    );
    if (wave.length === 0) wave.push(...remaining);
    wave.forEach(t => { t.wave = waves.length + 1; completed.add(t.id); });
    remaining = remaining.filter(t => !completed.has(t.id));
    waves.push(wave);
  }
  return waves;
}

function isEligible(todo, statusById) {
  return todo.dependsOn.every(dep => statusById[dep] === 'done');
}
```

---
## 6. Phase 3: Wave-Based Parallel Execution

**File**: `packages/cli/src/core/subagent-manager.js`

`SubagentManager.runAll()` orchestrates the entire build through dependency-ordered waves:

### Wave Dispatch

1. **`planWaves(plan)`** splits todos into topological sort waves
2. For each wave:
   - Set `todo.wave = idx + 1`
   - Emit `WAVE_START` event with wave number, total, and todo list
   - Filter to `ready` todos (all dependencies done) via `isEligible()`
   - Push to queue → `_schedule()` → `_spawn()` (concurrent, up to `concurrency` cap)
   - `await sleep(100)` loop until queue empty and all running complete
   - Emit `WAVE_COMPLETE` event

### Concurrency Control

```js
this.concurrency = Math.max(1, Number(config.concurrency || options.maxAgents || 5));
// Default: 5 subagents running in parallel
```

The default concurrency of 5 is controlled by `MAX_AGENTS` constant in the orchestrator config. Each spawned subagent gets its own LLM context window and file system working directory within the project path.

### Wave Event Flow

For each wave (1 to totalWaves):
1. Emit `WAVE_START` with `{ wave, totalWaves, todos: waveTodos, projectPath }`
2. Call `preWave` hook with `{ wave, totalWaves, todos, projectPath }`
3. For each todo in wave:
   - Check `isEligible(todo, statusById)` — all `dependsOn` must be `done`
   - If eligible: emit `SUBAGENT_CREATED`, call `_spawn(todo)` which:
     - Call `preAgent` hook
     - Set todo status to `running`
     - Select model via `router.pick(todo.domain)`
     - Instantiate `new Subagent(todo, model, projectPath)`
     - Call `subagent.run()` (async, not awaited yet)
     - Emit `SUBAGENT_ASSIGNED` with `{ model, domain }`
   - After `subagent.run()` completes:
     - Call `postAgent` hook
     - Emit `SUBAGENT_DONE`/`SUBAGENT_FAILED`/`SUBAGENT_NEEDS_REVIEW`
     - Update todo status and `finishedAt`
     - Call `router.recordAssignment(ref, domain, success)`
     - Emit `chat:todo_update` socket event
4. Wait for all subagents in wave to complete (`await Promise.all(running)`)
5. Emit `WAVE_COMPLETE` with `{ wave, results }`
6. Call `postWave` hook

### Subagent Scheduling (_schedule and _spawn)

```js
async _schedule(todo) {
  this.queue.push(todo);
  // Drain queue respecting concurrency cap
  while (this.queue.length > 0 && this.running.size < this.concurrency) {
    const next = this.queue.shift();
    if (next && isEligible(next, this.statusById)) {
      this._spawn(next);
    } else if (next) {
      // Not eligible yet, put back
      this.queue.unshift(next);
      break;
    }
  }
}

_spawn(todo) {
  this.statusById[todo.id] = 'running';
  this.running.add(todo.id);

  const model = this.router.pick(todo.domain);
  const subagent = new Subagent(todo, model, this.projectPath);

  emit(SUBAGENT_CREATED, { todoId: todo.id, title: todo.title, domain: todo.domain });

  const result = subagent.run().finally(() => {
    this.running.delete(todo.id);
    this.statusById[todo.id] = result.status;
    // Schedule any dependents that are now eligible
    this._scheduleDependents(todo.id);
    // Drain queue again
    this._schedule(null);
  });

  return result;
}
```

---

## 7. Phase 4: Subagent Execution

**File**: `packages/cli/src/core/subagent.js`

Each subagent runs a single todo. The agent loop implements a think → tool → repeat cycle:

```js
export class Subagent {
  constructor(todo, model, projectPath) {
    this.todo = todo;
    this.model = model;
    this.projectPath = projectPath;
    this.maxTurns = 12;
    this.blockedCount = 0;
    this.status = SUBAGENT_STATUS.PENDING;
  }

  async run() {
    this.status = SUBAGENT_STATUS.RUNNING;
    emit(SUBAGENT_ASSIGNED, { model: this.model.id, domain: this.todo.domain });
    emit(SUBAGENT_STARTED, {
      model: this.model.id, title: this.todo.title, domain: this.todo.domain,
      wave: this.todo.wave, tokens: 0, latency: 0
    });

    // Start the timer for tick events (1s interval)
    const timer = setInterval(() => {
      emit(SUBAGENT_STEP, {
        step: this.turns, total: this.maxTurns,
        message: 'Working...', tokens: this.tokenCount
      });
    }, 1000);

    try {
      const messages = this._buildContext();
      const tools = this._loadTools();

      for (let turn = 0; turn < this.maxTurns; turn++) {
        this.turns = turn + 1;

        emit(SUBAGENT_STEP, {
          step: turn + 1, total: this.maxTurns,
          message: 'Thinking...', tokens: this.tokenCount
        });

        const res = await this.provider.complete(this.model.id, {
          messages, temperature: 0.3,
          reasoning: MODE_REASONING[this.mode],
        });

        const action = parseAction(res.text, { tools });

        if (action.done) {
          emit(SUBAGENT_DONE, {
            summary: action.done.summary, model: this.model.id,
            result: action.done.result, tokens: this.tokenCount, latency: Date.now() - startTime
          });
          this.status = SUBAGENT_STATUS.DONE;
          return { status: 'done', summary: action.done.summary };
        }

        if (action.blocked) {
          this.blockedCount++;
          if (this.blockedCount >= 3) {
            this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
            emit(SUBAGENT_NEEDS_REVIEW, { reason: action.reason });
            return { status: 'needs_review', reason: action.reason };
          }
          // Inject hint and continue
          messages.push({ role: 'user', content: `Hint: ${action.blocked.hint}` });
          continue;
        }

        if (action.tool) {
          emit(SUBAGENT_TOOL_CALL, {
            tool: action.tool.name, args: action.tool.args,
            risk: this._assessRisk(action.tool.name)
          });

          // Permission gate for high-risk tools
          if (this._requiresPermission(action.tool.name)) {
            const approved = await this._requestPermission(action.tool.name, action.tool.args);
            if (!approved) {
              messages.push({ role: 'user', content: 'TOOL REJECTED by user permission.' });
              continue;
            }
          }

          const toolResult = await tools.run(action.tool.name, action.tool.args);
          emit(SUBAGENT_TOOL_RESULT, {
            tool: action.tool.name, ms: toolResult.ms,
            risk: this._assessRisk(action.tool.name),
            truncated: toolResult.truncated
          });

          // Emit file write event if applicable
          if (action.tool.name === 'write_file' || action.tool.name === 'edit_file') {
            emit(SUBAGENT_FILE, {
              todoId: this.todo.id, file: action.tool.args.file,
              content: action.tool.args.content,
              language: this._detectLanguage(action.tool.args.file),
              timestamp: Date.now()
            });
          }

          messages.push({ role: 'user', content: `TOOL RESULT: ${JSON.stringify(toolResult)}` });
        }
      }

      // Turn budget exhausted
      this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
      emit(SUBAGENT_NEEDS_REVIEW, { reason: 'turn budget exhausted' });
      return { status: 'needs_review', reason: 'turn budget exhausted' };

    } catch (error) {
      this.status = SUBAGENT_STATUS.FAILED;
      emit(SUBAGENT_FAILED, { error: error.message, todoId: this.todo.id });
      return { status: 'failed', error: error.message };
    } finally {
      clearInterval(timer);
    }
  }

  _buildContext() {
    const messages = [];

    // System prompt
    messages.push({ role: 'system', content: `You are an autonomous coding agent working on a single task...

TASK: ${this.todo.title}
DESCRIPTION: ${this.todo.description}
DOMAIN: ${this.todo.domain}
FILES TO WORK WITH: ${JSON.stringify(this.todo.files)}

You have access to these tools: ${Object.keys(this._loadTools()).join(', ')}

When done, output ONLY this format: {"done": true, "summary": "brief summary"}` });
    messages.push({ role: 'user', content: this.todo.description });
    return messages;
  }
}
```

### Subagent Status Values

```
PENDING → RUNNING → DONE
                → FAILED
                → NEEDS_REVIEW
```

---

## 8. Integration Tests + Bugfix Rounds

After all waves complete, the engine runs integration tests:

```js
async _integrationPass() {
  const results = { ran: false, status: 'unknown', exitCode: -1, tail: '' };

  const hasTestScript = this.pkg.scripts && this.pkg.scripts.test;
  if (!hasTestScript) {
    results.ran = false;
    results.status = 'skipped';
    emit(INTEGRATION_PASS, { ran: false, status: 'skipped' });
    return results;
  }

  results.ran = true;
  const proc = await execa('npm', ['test', '--silent'], {
    cwd: this.projectPath,
    timeout: 300_000,
    reject: false,
    encoding: 'utf-8',
  });

  results.exitCode = proc.exitCode;
  results.status = proc.exitCode === 0 ? 'passed' : 'failed';
  results.tail = proc.stdout.split('\n').slice(-6).join('\n');

  emit(INTEGRATION_PASS, results);
  return results;
}
```

### Bugfix Rounds

Up to 3 rounds of auto-fixing:

```
Round 1: Uses existing test failure tail (no duplicate test run)
Round 2+: Re-runs tests, then dispatches bugfix subagents for failed todos

Each round:
  1. Check for broken todos (FAILED or NEEDS_REVIEW)
  2. Dispatch one bugfix subagent per broken todo
  3. Re-run integration tests (from round 2+)
  4. If all pass → break
  5. If still failing → continue to next round
```

```js
async _bugfixRounds(integrationResult) {
  if (integrationResult.status !== 'failed') return { fixed: true };

  let round = 0;
  const maxRounds = 3;

  while (round < maxRounds) {
    round++;
    console.log(`Bugfix round ${round}/${maxRounds}`);

    const brokenTodos = this.plan.todos.filter(
      t => t.status === 'failed' || t.status === 'needs_review'
    );

    if (brokenTodos.length === 0 && integrationResult.status === 'passed') {
      return { fixed: true, rounds: round };
    }

    // Dispatch bugfix subagents
    const bugfixPlan = {
      summary: `Fix failing tests (round ${round})`,
      todos: brokenTodos.map(t => ({
        id: `bf-${t.id}`,
        title: `Fix: ${t.title}`,
        description: `Fix failures in ${t.title}. Test output: ${integrationResult.tail}`,
        domain: t.domain,
        dependsOn: [],
        files: t.files,
      })),
    };

    const waveManager = new SubagentManager(bugfixPlan, this.router, this.projectPath);
    const results = await waveManager.runAll();

    // Re-run tests (from round 2+)
    if (round >= 1) {
      integrationResult = await this._integrationPass();
      if (integrationResult.status === 'passed') {
        return { fixed: true, rounds: round };
      }
    }
  }

  return { fixed: false, rounds: maxRounds };
}
```

### Scoring Feedback Loop

```js
// After each subagent completes:
await this.router.recordAssignment(assignment.ref, todo.domain, success);
// Persists to ~/.mcode/scores/{projectId}/model-scores.json
// Updates the 50% historical success rate layer in the scoring system
```

---

## 9. Phase 6: Watch Mode Daemon

**File**: `packages/cli/src/core/watch-daemon.js`

After a successful god-mode build, the WatchDaemon can be activated for continuous monitoring:

```js
const config = {
  scanIntervalMs: 30_000,    // scan every 30s
  debounceMs: 400,            // debounce rapid changes
  maxFixesPerHour: 60,        // rate limit auto-fixes
  autoCommit: false,          // commit fixes to git
  maxAttemptsPerFix: 3        // retry limit per file
};
```

### Watch Process

1. **chokidar** file watcher monitors `projectPath` (excludes: node_modules, .git, dist, build, coverage, .mcodeignore)
2. On file change → debounce (400ms) → queue for processing
3. Process queue: read file, run ESLint/static analysis, if errors → auto-fix subagent
4. Emit `WATCH_SCAN`, `WATCH_CHANGE`, `WATCH_FIX` events

```js
class WatchDaemon {
  start() {
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('change', path => this.handleChange('change', path))
      .on('unlink', path => this.handleChange('unlink', path));

    this.scanInterval = setInterval(() => this.scan(), this.config.scanIntervalMs);
    emit(WATCH_STATUS, { status: 'active' });
  }

  async processFile(filePath) {
    this.cleanupFixBuffer();
    if (this.fixesThisHour >= this.config.maxFixesPerHour) {
      emit(WATCH_FIX, { filePath, outcome: 'RATE_LIMITED' });
      return;
    }

    const eslint = new ESLint();
    const results = await eslint.lintFiles([filePath]);

    if (results[0]?.errorCount > 0) {
      const fixResults = await eslint.lintFiles([filePath], { fix: true });
      if (fixResults[0]?.errorCount === 0) {
        await eslint.outputFixes(fixResults[0]);
        this.fixesThisHour++;
        emit(WATCH_FIX, { filePath, outcome: 'AUTO_FIXED' });
      } else {
        await this.dispatchFixSubagent(filePath, results[0]);
      }
    } else {
      emit(WATCH_FIX, { filePath, outcome: 'NO_ISSUES' });
    }
  }
}
```

### Watch Outcomes

| Outcome | Value |
|---------|-------|
| `AUTO_FIXED` | ESLint fix or subagent fix succeeded |
| `NO_ISSUES` | File is clean |
| `NEEDS_REVIEW` | Fix failed, needs human review |

### Watch Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `WATCH_SCAN` | Periodic scan | `{ scanned, autoFixed, needsReview, errors }` |
| `WATCH_CHANGE` | File change detected | `{ projectId, file, action }` |
| `WATCH_FIX` | Fix attempted | `{ projectId, file, outcome, detail }` |
| `WATCH_STATUS` | Start/stop/change | `'active'` / `'stopped'` |

---
## 10. Turn Machine Phases

The ZCode Turn Machine defines 10 phases that govern how the engine transitions through processing:

```
┌──────────────────────────────────────────────────────────────────┐
│                STATE MACHINE TRANSITIONS                         │
├─────────────┬──────────────┬────────────────┬───────────────────┤
│ FROM        │ TO           │ TRIGGER        │ SIDE EFFECTS      │
├─────────────┼──────────────┼────────────────┼───────────────────┤
│ Idle        │ Processing   │ User prompt    │ Emit chat:start   │
│ Processing  │ Awaiting     │ router.pick()  │ Emit chat:ready   │
│ Awaiting    │ Streaming    │ provider       │ Emit chat:stream  │
│ Streaming   │ Scheduling   │ done token     │ Flush buffer      │
│ Scheduling  │ Executing    │ tool call      │ Permission gate   │
│ Executing   │ Aggregating  │ tool result    │ Feedback loop     │
│ Aggregating │ Awaiting     │ next turn      │ SUBAGENT_STEP     │
│ Executing   │ AwaitingPerm │ approval       │ Dialog shown      │
│ Awaiting    │ Completing   │ done=true      │ DONE event        │
│ Any         │ Error        │ exception      │ Error event       │
│ Any         │ Idle         │ session end    │ Save undo stack   │
└─────────────┴──────────────┴────────────────┴───────────────────┘
```

| Phase | Description | Key Code Location |
|-------|-------------|-------------------|
| **Idle** | No active session, awaiting user input. Initial state of ChatSession and Orchestrator. | `ChatSession` constructor, `Orchestrator` initial state |
| **ProcessingInput** | User prompt received, pre-routing checks. Slash command parsing, token validation, workspace selection. | `ChatSession.sendMessage()`, `orchestrator.chat()` |
| **AwaitingModelResponse** | LLM is generating response. Could be streaming or complete response. Model selected via router.pick(). | `provider.complete()` in subagent.js, chat-agent.js |
| **Streaming** | LLM response chunks arrive. In chat mode, streamed text is batched (16ms flush) and forwarded via chat:stream socket events. | `streamText()` in chat-agent.js, `onChatStream` in useChatSocket.ts |
| **SchedulingTools** | Tool calls parsed from LLM output. Tools queued for execution. In God Mode, subagent scheduling happens here. | `extractActions()` in chat-agent.js, `SubagentManager._schedule()` |
| **ExecutingTools** | Tools are executing (file writes, shell commands, etc.). Permission gate for shell/write operations. | `ToolExecutor.run()`, `Subagent._dispatch()` |
| **AggregatingResults** | Tool results fed back to model as next-turn context. Message history updated with tool result role. | `messages.push({role: 'user', content: TOOL_RESULT})` |
| **AwaitingPermission** | A tool requires user approval (shell, write, edit). Modal dialog shown in IDE, CLI waits on stdin. | `ToolExecutor._askPermission()`, `EVENTS.PERMISSION_ANSWER` |
| **Completing** | Todo/build finished, emitting final events. Undo stack persisted. | End of `Subagent.run()`, `SubagentManager.mergeResults()` |
| **Error** | Exception caught. Error state entered. Subagent marked FAILED, model scoring updated. | `SUBAGENT_FAILED`, `CHAT_ERROR`, error handlers |

---

## 11. Model Router / Scoring System

**File**: `packages/cli/src/core/router.js`, `packages/cli/src/core/modes.js`

### Quality/Speed Dial (MODES)

Six levels control reasoning budget and model selection preferences:

| Mode | Description | Reasoning Effort | Thinking Budget |
|------|-------------|-----------------|-----------------|
| `low` | cheap & fast | `low` | 1,000 tokens |
| `medium` | balanced | `medium` | 2,000 tokens |
| `high` | strong | `high` | 4,000 tokens |
| `extra` | powerful | `high` | 8,000 tokens |
| `max` | frontier | `high` | 16,000 tokens |
| `god` | absolute best | `high` | 32,000 tokens |

### 5-Layer Weighted Model Scoring

```js
final_score = 0.20 × static_benchmark
            + 0.50 × historical_success_rate
            + 0.20 × fingerprint_match
            + 0.10 × user_override_priority
            + live_escalation_penalty
```

| Layer | Weight | Source | Persistence |
|-------|--------|--------|-------------|
| Static Benchmark | 20% | `STATIC_BENCHMARK` — public model eval scores per domain | Hardcoded in `router.js` |
| Historical Success | 50% | `scoreModel()` / `recordResult()` — per-user, per-domain rolling average | `~/.mcode/scores/{projectId}/model-scores.json` |
| Fingerprint Match | 20% | `FINGERPRINT_MATCH` — framework/language/task-type alignment | Hardcoded in `router.js` |
| User Override | 10% | User's routing preference list position | `config.json` |
| Live Escalation | 0% base | Consecutive failure streak (3+ → -0.3 penalty) | In-memory |

### Model Selection (router.pick)

1. Check explicit user preference (`config.roles.{domain}`)
2. Score all available models via `_cacheAllRefs()`
   - Exclude rate-limited providers
   - Exclude models with 3+ consecutive failures
   - Pick highest weighted score
3. Fallback: routing preference list order
4. Return null if nothing usable

### Warm-up

At session init, prefetch model assignments for all 8 domains:
```js
['planning', 'frontend', 'backend', 'db', 'devops', 'test', 'docs', 'bugfix']
```

### Rate Limiting

```js
maxRpm = 60       // max 60 requests per minute per provider
maxTpm = 120_000  // max 120K tokens per minute per provider
```

---

## 12. Special Modes

**File**: `packages/cli/src/core/modes.js`

| Mode | Icon | Label | Affects |
|------|------|-------|---------|
| `learning` | `˝` | Learning | Step-by-step walkthrough with explanations |
| `competition` | `‼` | Competition | Timer display, speed focus |
| `zen` | `居` | Zen | Minimal UI, hide sidebar, hide agent strip |
| `focus` | `🔒` | Focus | Hide toasts, hide agent strip, full-width input |
| `presentation` | `Ɔ` | Presentation | Large text, center align, minimal colors |
| `debug` | `⚙` | Debug | Show debug panel, verbose logs, show raw events |
| `silent` | `🔕` | Silent | Suppress info, errors only, quiet mode |
| `batch` | `⚖` | Batch | Auto-approve, no prompts, log to file |
| `daemon` | `†` | Daemon | Background mode, minimal foreground |
| `service` | `⚙` | Service | System service mode, stdout disabled, syslog |

---

## 13. Hooks System

**File**: `packages/cli/src/core/hooks.js`

### Hook Points (7 total)

```
preBuild({ projectPath, plan })
preWave({ wave, totalWaves, todos, projectPath })
postWave({ wave, totalWaves, results, projectPath })
preAgent({ todoId, domain, title })
postAgent({ todoId, domain, title })
postTest({ results, integration, ... })
postBuild({ results, integration, projectPath, cost, elapsedSecs })
```

### Loading

User-defined hooks live at `.mcode/hooks.js`:

```js
export async function preBuild({ projectPath, plan }) {
  console.log(`Building: ${plan.summary} (${plan.todos.length} todos)`);
}
export async function postBuild({ results, cost, elapsedSecs }) {
  console.log(`Build complete: ${results.done}/${results.total} in ${elapsedSecs}s ($${cost})`);
}
```

Hooks are loaded via dynamic `import()` with `pathToFileURL()`. Missing or broken hook files are silently caught. Each hook execution emits `HOOK_EXECUTED` event with `{ hook, ok, error, ms, wave }`.

Each hook returns `{ ok, result, error, ms }` — failures are emitted as `HOOK_EXECUTED` events but don't block the build.

---

## 14. Animation System

### 4-Layer Animation Architecture

#### Layer 1: CLI Terminal UI (useTicker)
**File**: `packages/cli/src/ui/useTicker.js`
```js
const TICK_RATE_MS = 80;  // 1 tick = 80ms
```
A global singleton `setInterval` at 80ms intervals. All CLI components subscribe to the same tick counter:
```js
function useTicker() {
  const [ticks, setTicks] = useState(tickCount);
  useEffect(() => subscribe(setTicks), []);
  return ticks;
}
```
Components using useTicker: SpinnerBlock, RunningToolBlock, ThoughtBlock, Header, AgentStrip.

#### Layer 2: useEntrance (Progressive Reveal)
**File**: `packages/cli/src/ui/useEntrance.js`
Progressive line-by-line reveal using 80ms shared ticker.

#### Layer 3: useAnimatedProgress
**File**: `packages/cli/src/ui/useAnimatedProgress.js`
20ms interval, 8 frames — smooth progress bar interpolation.

#### Layer 4: IDE Web Animations
CSS variables at `:root` in `packages/web/src/styles/index.css`:
```css
:root {
  --mcode-green: #3ecf8e;
  --mcode-text-dim: #8b8d98;
  --mcode-accent: #6c8cff;
  --mcode-bg: #0d0e12;
  --mcode-border: #26272f;
}
```
Framer Motion easing: `[0.4, 0, 0.2, 1]` standard, `[0.16, 1, 0.3, 1]` spring-like.

### SpinnerBlock Unicode Frames

**Source**: `packages/web/src/components/chat/SpinnerBlock.tsx:13`
```js
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];
```
5-frame spinner at 80ms intervals (matching `useTicker.js` `TICK_RATE_MS = 80`).

| Char | Unicode | Name |
|------|---------|------|
| `●` | `\u25CF` | BLACK CIRCLE |
| `◐` | `\u25D0` | CIRCLE WITH LEFT HALF BLACK |
| `◓` | `\u25D2` | CIRCLE WITH LOWER HALF BLACK |
| `◑` | `\u25D3` | CIRCLE WITH RIGHT HALF BLACK |
| `◒` | `\u25D1` | CIRCLE WITH UPPER HALF BLACK |

### Animation Component Inventory

| Component | File | Animation |
|-----------|------|-----------|
| SpinnerBlock | chat/SpinnerBlock.tsx | 80ms frame rotation |
| AgentActionSequence | chat/AgentActionSequence.tsx | Framer Motion fades |
| StepPulse | chat/mcodeUX.tsx | CSS 1.1s infinite pulse |
| ReactionBurst | chat/ReactionBurst.tsx | CSS pop + 6-particle stagger |
| TodoCard | ide/TodoCard.tsx | Spring stiffness:500 damping:20 |
| WaveProgress | ide/WaveProgress.tsx | Width interpolation |
| SearchAnimation | chat/SearchAnimation.tsx | Phase transitions |

### CLI → IDE Color Alignment

| Element | CLI (themes.js) | IDE (CSS vars) |
|---------|-----------------|----------------|
| Primary green | #3ecf8e | --mcode-green: #3ecf8e |
| Dim text | #8b8d98 | --mcode-text-dim: #8b8d98 |
| Accent blue | #6c8cff | --mcode-accent: #6c8cff |

SpinnerBlock in AIChatPage.tsx empty state uses `<SpinnerBlock label="Ready…" size="lg" color="emerald" />`.

---
## 15. IDE Event Bridge

**File**: `packages/web/src/hooks/useChatSocket.ts`, `packages/web/src/store/chatSlice.ts`

### Socket Event Flow

```
IDE (React) → Backend (Node/Socket.IO) → CLI (Node ESM)
     │              │                     │
     │ chat:start   │                     │
     ├──────────────▶│                     │
     │ chat:ready   │◀───── ChatSession ─────│
     │◀─────────────│                     │
     │ chat:send    │                     │
     ├──────────────▶│                     │
     │ stream/text  │◀─── emit(STREAM) ───▶│ emit(MESSAGE)
     │◀─────────────│                     │
     │ tool_call    │◀─── emit(SUBAGENT_TOOL_CALL)
     │◀─────────────│                     │
     │ todo_plan    │◀─── emit(PLAN_GENERATED)
     │◀─────────────│                     │
     │ todo_update  │◀─── emit(SUBAGENT_FILE)
     │◀─────────────│                     │
     │ chat:done    │◀─── emit(SUBAGENT_DONE)
     │◀─────────────│                     │
```

### Event-to-Redux Mapping (23 events)

| Socket Event | Redux Action | State Updated |
|-------------|-------------|---------------|
| `chat:ready` | `chatReady` | `status`, `models`, `selectedModel` |
| `chat:stream` | `streamUpdate` | `messages[].text` (batched 16ms) |
| `chat:message` | `agentMessage` | `messages[]` |
| `chat:tool_call` | `toolCallStarted` | `messages[]` (tool blocks) |
| `chat:permission` | `permissionRequested` | `permissionRequest` |
| `chat:todo_plan` | `setPlan` | `plan` (with todos) |
| `chat:todo_update` | `updateTodo` | `plan.todos[].status` |
| `chat:done` | `chatDone` | `isStreaming: false` |
| `chat:error` | `chatError` | `status: error` |
| `subagent:created` | `setSubagentCreated` | `subagents[todoId]` |
| `subagent:assigned` | `setSubagentAssigned` | `subagents[todoId].model` |
| `subagent:started` | `setSubagentStarted` | `subagents[todoId].status=running` |
| `subagent:step` | `setSubagentStep` | `subagents[..].message/tokens` |
| `subagent:done` | `setSubagentDone` | `subagents[..].status=done` |
| `subagent:failed` | `setSubagentFailed` | `subagents[..].status=failed` |
| `subagent:file` | `setSubagentFile` | `subagents[..].lastFile` |
| `subagent:tool_call` | `setSubagentToolCall` | `subagents[..].lastTool` |
| `subagent:needs_review` | `setSubagentNeedsReview` | `subagents[..].status=needs_review` |
| `wave:start` | `setWaveStart` | `waves[]` |
| `wave:complete` | `setWaveComplete` | `waves[].status=complete` |
| `integration:pass` | `setIntegrationPass` | `buildIntegration` |
| `build:complete` | `setBuildComplete` | `buildSummary`, `godMode: false` |
| `toast` | `addToast` | `toasts[]` (auto-dismiss 5s) |

### Stream Batching

Buffer rapid-fire chunks, flush every 16ms (~60fps) to prevent React thrashing:

```js
const onChatStream = (payload) => {
  if (doneRef.current) return;
  streamBufferRef.current += payload.text;
  if (!streamTimerRef.current) {
    streamTimerRef.current = setTimeout(() => {
      dispatch(streamUpdate(streamBufferRef.current));
      streamBufferRef.current = '';
      streamTimerRef.current = null;
    }, 16);
  }
};
```

### Todo Live Update (Agent Mode)

When write_file/edit_file completes, check if matching todo's files are all done:

```js
for (const todo of plan.todos) {
  if (todo.files.includes(changedFile)) {
    todo.completedFiles.add(changedFile);
    if (todo.completedFiles.size >= todo.files.length) {
      todo.status = 'done';
      socket.emit('chat:todo_update', { id: todo.id, status: 'done' });
    } else {
      todo.status = 'in_progress';
      socket.emit('chat:todo_update', { id: todo.id, status: 'in_progress' });
    }
  }
}
```

---

## 16. Todo Lifecycle

### Todo Data Structure (from plan.js normalizeTodo)

```js
{
  id: "t1",
  title: "Set up project",
  description: "...",
  domain: "backend",
  dependsOn: ["t0"],
  files: ["src/index.ts"],
  status: "pending",       // pending | in_progress | done | failed | needs_review
  assignedModel: null,     // model_id from router.pick()
  wave: null,              // wave number from planWaves()
  startedAt: null,         // ISO timestamp
  finishedAt: null,        // ISO timestamp
  error: null,             // error message if failed
  completedFiles: Set,     // tracks completed file writes
}
```

### Status Transitions

`pending` → `in_progress` (scheduled) → `done` / `failed` / `needs_review`

### File Conflict Resolution

\`resolveFileConflicts(plan)\` — chains todos that touch the same file (later depends on earlier). This prevents parallel subagents from writing to the same file simultaneously.

### Dependency Topological Sort

\`planWaves(plan)\` — returns waves array where wave[0] = no deps, wave[n] = deps in earlier waves. Each wave's todos can run in parallel.

### Eligibility Check

\`isEligible(todo, statusById)\` — returns true when all dependency todos are `done`.

---

## 17. Chat Mode vs Agent Mode vs God Mode

| Aspect | Chat Mode | Agent Mode | God Mode |
|--------|-----------|------------|----------|
| Entry point | runChat() | runAgent() | runGod() |
| Planning | Never | If prompt > 50 chars | Always |
| Subagents | None — single ChatAgent | None — single ChatAgent | Wave-based parallel |
| Tools | Full toolset | Full toolset | Per-todo ToolExecutor |
| Permission | Shell/write require approval | Same | Same |
| History | Full conversation (historyLimit: 0) | Last 20 messages | Each subagent own context |
| Auto-search | Yes | Yes | No (subagents use web_search) |
| File watching | No | No | Yes — WatchDaemon |
| Post-build | N/A | N/A | Tests → Bugfix → Watch |

### Chat Mode (Claude-style)
- Claude-style interaction, no todo planning
- Auto-search for relevant queries (Perplexity-style)
- Full conversation history

### Agent Mode
- Always runs planning if prompt is substantial
- Todo tracking with real-time IDE updates
- Single ChatAgent with limited history (20 messages)

### God Mode
- Full 6-phase pipeline (detect → plan → waves → subagents → tests → watch)
- Up to 5 parallel subagents
- Post-build: integration tests, bugfix rounds (up to 3), optional watch daemon
- File lock manager for shared file contention

---

## 18. File Lock Manager

**File**: `packages/cli/src/core/subagent-manager.js` (`FileLockManager` class)

Prevents write contention when multiple parallel subagents modify the same shared file:

```js
class FileLockManager {
  constructor() {
    this.locks = new Map();  // file → { holder, queue }
    this.TIMEOUT_MS = 30_000;
  }

  acquire(file, subagentId) {
    const existing = this.locks.get(file);
    if (!existing) {
      this.locks.set(file, { holder: subagentId, queue: [] });
      return true;
    }
    // Queue the request (FIFO)
    existing.queue.push(subagentId);
    return this.waitForLock(file, subagentId);
  }

  release(file, subagentId) {
    const lock = this.locks.get(file);
    if (lock && lock.holder === subagentId) {
      const next = lock.queue.shift();
      if (next) {
        lock.holder = next;
      } else {
        this.locks.delete(file);
      }
    }
  }
}
```

### Behavior:
1. First subagent to call write_file/edit_file on a path acquires the lock
2. Subsequent subagents queue (FIFO order)
3. Lock holder gets 30s window — if exceeded, force-released
4. SUBAGENT_TOOL_CALL event includes `resource` showing current lock holder

---

## 19. Undo Stack

**File**: `packages/cli/src/core/tools.js` (`UndoStack` class)

Every file write/edit is snapshotted:

```js
// Location: ~/.mcode/projects/{sessionId}/undo.json
class UndoStack {
  constructor(maxSize = 100) {
    this.stack = [];
    this.maxSize = maxSize;
  }

  push(entry) {
    this.stack.push(entry);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();  // oldest evicted
    }
    this.save();  // persist to disk
  }

  pop() {
    const entry = this.stack.pop();
    if (entry) {
      this.restore(entry);
    }
    return entry;
  }

  restore(entry) {
    if (entry.backup) {
      writeFileSync(entry.file, entry.backup);
    } else if (entry.operation === 'create') {
      unlinkSync(entry.file);
    }
  }
}
```

### Entry Structure:
```js
{
  id: "t1",
  file: "/path/to/file.ts",
  operation: "edit",     // write | edit | create | delete
  content: "new content",
  backup: "original content",
  model: "openai/gpt-4",
  subagentId: "subagent_001",
  timestamp: 1234567890
}
```

### Rollback Protection
If >50% of changes fail in a wave, a toast appears:
> "Multiple failures detected — consider undoing recent changes"

---

## 20. Cost Tracking

**File**: `packages/shared/src/index.js`

### Token Estimation:
```js
estimateTokens(text) = Math.ceil(text.length / 4)
```

### Rate Limiting:
```js
maxRpm = 60       // 60 requests per minute per provider
maxTpm = 120_000  // 120K tokens per minute per provider
```

### CostLedger:
```js
class CostLedger {
  constructor() {
    this.costs = {
      'openai/gpt-4': { input: 0.03, output: 0.06 },
      'anthropic/claude-3': { input: 0.003, output: 0.015 },
    };
  }

  calculateCost(modelId, inputTokens, outputTokens) {
    const rates = this.costs[modelId];
    if (!rates) return 0;
    return (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);
  }

  isRateLimited(providerId) {
    const window = this.providerWindow.get(providerId);
    return window && window.requests.length >= this.maxRpm;
  }
}
```

### Build Summary Cost Report:
```js
// BUILD_COMPLETE payload includes:
{
  cost: "$0.047",
  tokens: { input: 12500, output: 8700, total: 21200 },
  models: {
    "openai/gpt-4": { cost: 0.032, tokens: { input: 8000, output: 6000 } },
    "anthropic/claude-s": { cost: 0.015, tokens: { input: 4500, output: 2700 } }
  }
}
```

---

## 21. Auto-Search (Perplexity-style)

**File**: `packages/backend/src/chat-session.js`

When a chat prompt matches AUTO_SEARCH_RE (product queries, "how to", "latest", "vs", "who is", etc.):

```js
const AUTO_SEARCH_RE = /\b(price|how to|latest|vs|versus|who is|what is|when was|where is|compare|review|best |top )\b/i;

async autoSearch(query) {
  const results = await webSearch(query);
  socket.emit('chat:search_start', { query });
  for (const chunk of results) {
    socket.emit('chat:search_progress', { chunk });
  }
  socket.emit('chat:search_done', { results });
  return formatSearchContext(results);
}
```

### SearchAnimation States:

| State | Animation | CSS Classes |
|-------|-----------|-------------|
| Searching | Wave pulse on dots | `mcode-search-dot` keyframes |
| Reading | Page-turn animation | `mcode-read-progress` |
| Done | Fade + scale pop | `mcode-search-complete` |

Search animation uses cubic-bezier(0.16, 1, 0.3, 1) easing.

---

## 22. Error Recovery & Fallbacks

### Planner Fallback
If planning LLM fails → falls back to MockProvider. Build continues with mock plan.

### Subagent Retry with Fallback Models
Max 2 retries (3 total attempts) with model exclusion:
- Attempt 1: Highest-scoring model
- Attempt 2: Next-best (excludes attempt 1's model)
- Attempt 3: Last resort (excludes attempts 1 & 2's models)

```js
// router.js recordAssignment():
if (!success) {
  consecutiveFailures.get(ref)?.push(domain);
  if (failures.size >= 3) {
    this.excludeModel(ref);  // exclude for 30s rolling window
    consecutiveFailures.delete(ref);
  }
}
```

### Permission Timeout
```js
permissionTimeoutMs = Math.max(5_000, config.permissionTimeoutMs || 120_000);
// Default: 120 seconds — auto-denies and continues
```

### Rate-Limited Model Exclusion
```js
if (this.ledger.isRateLimited(provider.id)) continue;
```

### Live Escalation
- After 3 consecutive failures: -0.3 penalty (auto-switch)
- After 1-2 failures: -0.1 per failure penalty

### IDE Error Display

| Error Type | IDE Display |
|-----------|-------------|
| Subagent failed | TodoCard red border + error on hover |
| Todo needs_review | TodoCard amber border + badge |
| Wave partial failure | WaveProgress orange partial bar |
| Complete wave failure | Toast + retry button |
| Integration test failure | setIntegrationPass with status: 'failed' |
| WatchDaemon exceeded | WATCH_STATUS: 'stopped' + toast |

---

## Appendix A: File Inventory

### CLI Core (`packages/cli/src/core/`)

| File | Key Functions |
|------|---------------|
| orchestrator.js | runGod(), chat(), _integrationPass(), _bugfixRounds(), _schedule(), _spawn() |
| subagent-manager.js | runAll(), _schedule(), _spawn(), FileLockManager class |
| subagent.js | Subagent class, run(), parseAction() |
| planner.js | PLAN_SYSTEM prompt, Planner.plan(), parsePlanOutput() |
| router.js | ModelRouter, pick(), scoreModel(), recordResult(), warmUp() |
| chat-agent.js | ChatAgent, run(), streamText(), extractActions(), autoSearch() |
| tools.js | 19 ToolExecutor methods, UndoStack class |
| watch-daemon.js | WatchDaemon class |
| modes.js | SPECIAL_MODES, MODE_META, MODE_REASONING, MODES quality levels |
| techstack.js | detectTechStack(), smartDefaults() |

### Shared Contracts (`packages/shared/src/`)

| File | Exports |
|------|---------|
| plan.js | normalizeTodo, normalizePlan, planWaves, findCycle, resolveFileConflicts, isEligible |
| events.js | EVENTS, SUBAGENT_STATUS, SESSION_MODES, SOCKET, WATCH_OUTCOMES |
| domains.js | TASK_DOMAINS, DOMAIN_COLORS, DEFAULT_CONFIG, DEFAULT_ROUTING |
| index.js | CostLedger, estimateTokens |
| provider.js | ModelProvider, HttpProvider, streamSSE, fetchWithRetry, sleep |
| plugins.js | Plugin loading logic |

### Backend Bridge (`packages/backend/src/`)

| File | Functions |
|------|-----------|
| chat-session.js | runGod(), runChat(), runAgent(), autoSearch(), updateTodos() |
| sockets.js | Socket.IO event routing, session map |

### Frontend (`packages/web/src/`)

| File | Key Exports |
|------|-------------|
| hooks/useChatSocket.ts | 24 socket event handlers with Redux dispatch |
| store/chatSlice.ts | Redux slice with 40+ reducers for chat/god-mode state |
| components/chat/SpinnerBlock.tsx | SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'], 80ms tick rate |
| components/chat/AgentActionSequence.tsx | Combined thinking indicator (StepPulse + timer + ToolCallCard) |
| components/chat/ReactionBurst.tsx | Pop + 6-particle explosion (CSS keyframes) |
| components/chat/SearchAnimation.tsx | Search states: searching → reading → done |
| components/chat/StepPulse.tsx | CSS 1.1s pulse animation for mcode thinking label |
| components/ide/WaveProgress.tsx | God-mode wave dashboard with Framer Motion |
| components/ide/TodoCard.tsx | Todo display with spring animations |
| components/ide/StepCards.tsx | Tool result cards (uses SpinnerBlock) |
| components/pages/AIChatPage.tsx | Main page (Chat + AI Code Editor + IDE tabs) — 1720+ lines |

### CLI UI (`packages/cli/src/ui/`)

| File | Exports |
|------|---------|
| blocks.jsx | SpinnerBlock, ThoughtBlock, RunningToolBlock, SPIN_FRAMES |
| useTicker.js | TICK_RATE_MS = 80, global singleton ticker |
| useEntrance.js | Progressive line reveal hook |
| useAnimatedProgress.js | 8-frame percentage interpolation (20ms interval) |
| themes.js | Theme colors (green: #3ecf8e, dim: #8b8d98, accent: #6c8cff) |

---

## Appendix B: CSS Color Variables

**File**: `packages/web/src/styles/index.css`

```css
:root {
  --mcode-green: #3ecf8e;           /* primary emerald accent */
  --mcode-text-dim: #8b8d98;        /* secondary text */
  --mcode-accent: #6c8cff;          /* blue accent */
  --mcode-bg: #0d0e12;              /* background */
  --mcode-border: #26272f;          /* border color */
}
```

### CLI ↔ IDE Theme Alignment

| Element | CLI (themes.js) | IDE (index.css) |
|---------|-----------------|-----------------|
| Primary green | `#3ecf8e` | `--mcode-green: #3ecf8e` |
| Dim text | `#8b8d98` | `--mcode-text-dim: #8b8d98` |
| Accent blue | `#6c8cff` | `--mcode-accent: #6c8cff` |

### Animation Easing Constants

| Purpose | CSS/JS Value |
|---------|-------------|
| Framer Motion standard | `[0.4, 0, 0.2, 1]` |
| Framer Motion spring-like | `[0.16, 1, 0.3, 1]` |
| Framer Motion spring | `stiffness: 500, damping: 20` |
| CSS mcode-input-glow-spin | `linear infinite` (4s) |
| CSS mcode-stream-text-in | `cubic-bezier(.16, 1, .3, 1)` |

### Background Animation CSS Classes

```css
/* mcode input border glow — conic sweep animation */
.mcode-input-glow {
  animation: mcode-input-glow-spin 4s linear infinite;
  background: conic-gradient(from 0deg, transparent 0%, #3b82f6 30%, transparent 50%, #10b981 80%, transparent 100%);
}

@keyframes mcode-input-glow-spin {
  to { transform: rotate(360deg); }
}
```

---

*End of ZCode Smart Engine Documentation*
