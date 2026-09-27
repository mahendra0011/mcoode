# God Mode & Subagents — Bugs & Issues

---

## [GOD-001] Planner Falls Back to Mock on ANY Error — Silent Degradation

- **Description**: When the planning model fails (network error, rate limit, malformed response), the planner silently falls back to `MockProvider` which returns a fake plan. The user gets a mock plan executed against their real codebase.
- **Current vs Expected Behavior**: Currently, a network hiccup during planning causes a mock plan (probably "create a todo app" boilerplate) to be executed and real files written. Expected: Planning failure should abort the god run with a clear error, or at least require explicit user confirmation.
- **Flow**: `mcode god "build auth system"` → planning API call fails → mock plan returned → subagents execute mock plan → random files written to real project
- **Root Cause / Logic**: [planner.js L76-82](file:///d:/projects/mcoode/packages/cli/src/core/planner.js#L76-L82) — catch block creates a MockProvider and uses its output.
- **Affected Files**: [`packages/cli/src/core/planner.js`](file:///d:/projects/mcoode/packages/cli/src/core/planner.js)
- **Steps to Reproduce**: Disconnect network, run `mcode god "build API"` — mock plan will execute
- **Suggested Fix**: Remove mock fallback from planner; throw error on planning failure; let orchestrator handle retry or abort
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove MockProvider fallback in planner
  - [ ] Add explicit error propagation
  - [ ] Show clear error message to user

---

## [GOD-002] No JSON Schema Validation on Planner Output

- **Description**: The planner expects a specific JSON shape `{summary, todos: [{id, title, domain, dependsOn, files}]}` but `parsePlanOutput()` only checks that JSON can be parsed — it doesn't validate the schema. Missing fields, wrong types, or extra fields pass through.
- **Current vs Expected Behavior**: A plan with `{todos: [{id: 123, domain: "invalid"}]}` would pass validation. `normalizePlan` provides defaults but doesn't validate types strictly.
- **Flow**: Planning model outputs malformed JSON → parsed successfully → `normalizePlan` silently fixes some fields → subagents get confusing/incomplete instructions
- **Root Cause / Logic**: [planner.js L26-39](file:///d:/projects/mcoode/packages/cli/src/core/planner.js#L26-L39) only does JSON parsing; [plan.js L38-53](file:///d:/projects/mcoode/packages/shared/src/plan.js#L38-L53) normalizes but doesn't reject invalid input.
- **Affected Files**: [`packages/cli/src/core/planner.js`](file:///d:/projects/mcoode/packages/cli/src/core/planner.js), [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Add Joi/Zod schema validation after parsing; reject plans with missing required fields
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add JSON schema validation for plan output
  - [ ] Validate todo.id uniqueness
  - [ ] Validate domain values against TASK_DOMAINS

---

## [GOD-003] `isEligible` Only Checks for DONE Status — Failed Dependencies Block Forever

- **Description**: `isEligible()` requires ALL dependencies to be `DONE`. If a dependency fails (status `FAILED`), the dependent todo never becomes eligible and silently never runs.
- **Current vs Expected Behavior**: If todo `t1` fails and `t2` depends on `t1`, then `t2` is stuck forever in pending. The wave loop eventually ends but `t2` is never attempted. Expected: Failed dependencies should either skip the dependent todo with a clear message or allow retry.
- **Flow**: `t1` (backend) fails → `t2` (test, depends on t1) never runs → shows as "pending" in results
- **Root Cause / Logic**: [plan.js L127-129](file:///d:/projects/mcoode/packages/shared/src/plan.js#L127-L129) — `isEligible` only checks for `DONE`, not `FAILED`.
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js), [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Allow dependent todos to run if dependency is DONE or FAILED (with context about failure); or explicitly mark dependents as SKIPPED
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add SKIPPED status for todos whose dependencies failed
  - [ ] Emit clear event when todo is skipped due to failed dependency
  - [ ] Include skipped count in build summary

---

## [GOD-004] Cost Calculation Is Wildly Inaccurate — Double/Triple Counting

- **Description**: `_emitBuildComplete` in SubagentManager calculates cost incorrectly. It uses TOTAL `tokensIn`/`tokensOut` (accumulated across ALL subagents) multiplied by per-model count, leading to massive overcounting.
- **Current vs Expected Behavior**: If 3 models are used with 10k tokens each, the cost formula applies the total 30k tokens to each model's rate multiplied by count, resulting in ~3x the actual cost.
- **Flow**: God run completes → "est. $12.50" shown → actual cost was ~$4
- **Root Cause / Logic**: [subagent-manager.js L708-719](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L708-L719) — `tokensIn` and `tokensOut` are the GRAND TOTAL across all subagents, but they're multiplied by each model's count in the inner loop.
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Track tokens per-model (not just grand total); calculate cost per-model with that model's token usage
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Track tokens per provider:model in _models map
  - [ ] Calculate cost using per-model token counts

---

## [GOD-005] Subagent `ledger()` Method Shadows Constructor Property

- **Description**: `Subagent` class defines both a `ledger` property (set from `this.assignment.ledger`) via `this.ledger?.(res)` call on line 164 AND a `ledger(res)` method on line 254. The method shadows the property, but the call on line 164 uses `this.ledger?.(res)` which invokes the METHOD, not the assignment's ledger callback.
- **Current vs Expected Behavior**: Token usage is never recorded to the CostLedger because `this.ledger` refers to the method definition (line 254) which calls `this.assignment.ledger?.(res)` — but the method is invoked with `this.ledger?.(res)` on line 164, creating a recursive-like pattern that works by coincidence.
- **Flow**: Subagent runs → `this.ledger?.(res)` → calls the method → calls `this.assignment.ledger?.(res)` — works but is confusing
- **Root Cause / Logic**: [subagent.js L164](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js#L164) + [L254-256](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js#L254-L256) — method and call look identical but work differently than intended
- **Affected Files**: [`packages/cli/src/core/subagent.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js)
- **Suggested Fix**: Rename method to `recordUsage()` or similar to avoid confusion
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Rename ledger method to avoid shadowing

---

## [GOD-006] 25-Turn Cap Not Configurable Per-Todo — Config Mismatch

- **Description**: The SUBAGENT_SYSTEM prompt says `Maximum ${todo.maxTurns || 25} tool actions` but `todo.maxTurns` is set from `config.maxTurnsPerSubagent` (in SubagentManager dispatch) while the Subagent constructor reads `config.maxTurnsPerSubagent` independently. These can diverge.
- **Current vs Expected Behavior**: The system prompt may say "25 turns" while the actual loop cap is set to a different value from config, confusing the AI model.
- **Flow**: Config sets `maxTurnsPerSubagent: 15` → prompt says 15 → but Subagent uses `config.maxTurnsPerSubagent || 25` → matches. However, `todo.maxTurns` overrides in SubagentManager but not in the prompt.
- **Root Cause / Logic**: [subagent.js L87](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js#L87) uses `config.maxTurnsPerSubagent || 25` while [subagent-manager.js L282](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L282) sets `todo.maxTurns = config.maxTurnsPerSubagent`
- **Affected Files**: [`packages/cli/src/core/subagent.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js), [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Single source of truth for maxTurns; pass it through the todo object consistently
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Consolidate maxTurns source

---

## [GOD-007] Wave Loop Uses Polling (sleep 100ms) — Wastes CPU

- **Description**: The wave execution loop in `runAll()` uses `while (this.running > 0 || this.queue.length > 0) { await sleep(100); }` — a busy-wait polling loop.
- **Current vs Expected Behavior**: CPU cycles wasted on 10 checks/second while waiting for subagents to complete. Expected: Use Promise-based signaling (e.g., resolve a promise when running count reaches 0).
- **Flow**: Wave dispatches 5 subagents → loop polls 10x/sec for ~60 seconds → 600 unnecessary iterations
- **Root Cause / Logic**: [subagent-manager.js L484-487](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L484-L487)
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Use a `Promise` + resolver pattern; resolve when `this.running` reaches 0
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Replace polling with Promise-based wait

---

## [GOD-008] `resolveFileConflicts` Doesn't Handle Transitive Dependencies

- **Description**: `resolveFileConflicts()` chains todos that share a file, but only creates direct dependencies. If `t1→file.js`, `t2→file.js`, `t3→file.js`, only `t2` depends on `t1` and `t3` depends on `t2` (chain). But the order depends on iteration order, not any semantic priority.
- **Current vs Expected Behavior**: Works correctly for chaining but doesn't consider which todo SHOULD go first (e.g., schema before implementation).
- **Flow**: Three todos touch the same config file → arbitrary ordering based on array position
- **Root Cause / Logic**: [plan.js L88-105](file:///d:/projects/mcoode/packages/shared/src/plan.js#L88-L105) — `seen.set(norm, todo.id)` overwrites with latest, creating a chain based on array order
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Consider domain priority (db before backend before frontend) when ordering shared-file chains
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add domain-priority-based ordering for shared file chains

---

## [GOD-009] BUILD_COMPLETE Emitted Twice in God Mode

- **Description**: `_emitBuildComplete()` in SubagentManager emits `BUILD_COMPLETE` at the end of `runAll()`. Then `runGod()` in Orchestrator also emits `BUILD_COMPLETE` via `this.bus.emit(EVENTS.BUILD_COMPLETE, summary)`.
- **Current vs Expected Behavior**: Dashboard receives two `BUILD_COMPLETE` events per god run. The second one may have slightly different data shape (includes `provider`, `deployTarget`, `projectName`).
- **Flow**: God run completes → SubagentManager emits BUILD_COMPLETE → Orchestrator emits BUILD_COMPLETE → dashboard processes both
- **Root Cause / Logic**: [subagent-manager.js L534](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L534) + [orchestrator.js L396](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js#L396)
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js), [`packages/cli/src/core/orchestrator.js`](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js)
- **UI/Frontend Impact**: Dashboard may show duplicate build completion notifications or update state twice
- **Suggested Fix**: Remove the SubagentManager emission; let Orchestrator be the single source of BUILD_COMPLETE
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Remove duplicate BUILD_COMPLETE emission

---

## [GOD-010] Orchestrator `_tryConnectBackend` Sets `reconnection: false`

- **Description**: The Socket.IO client connecting to the backend has `reconnection: false`. If the backend restarts or connection drops during a long god run, the CLI silently loses the dashboard connection with no recovery.
- **Current vs Expected Behavior**: A 30-minute god run loses dashboard visibility if the backend hiccups for even 1 second. Expected: Automatic reconnection with exponential backoff.
- **Flow**: Backend restart during god run → socket disconnects → no reconnection → dashboard shows stale data
- **Root Cause / Logic**: [orchestrator.js L178](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js#L178) — `reconnection: false`
- **Affected Files**: [`packages/cli/src/core/orchestrator.js`](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js)
- **UI/Frontend Impact**: Dashboard goes dark during long runs after any transient network issue
- **Suggested Fix**: Enable reconnection with reasonable limits: `reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000`
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Enable Socket.IO reconnection
  - [ ] Emit reconnection events for UI feedback

---

## [GOD-011] MAX_TODOS Hardcoded to 14 — May Truncate Complex Projects

- **Description**: `normalizePlan` silently truncates plans to 14 todos maximum. No warning is emitted.
- **Current vs Expected Behavior**: A complex build request that the planner decomposes into 20 todos silently loses the last 6. The user gets an incomplete build with no indication.
- **Flow**: `mcode god "build a full SaaS app"` → planner generates 18 todos → 4 silently dropped → missing features
- **Root Cause / Logic**: [plan.js L36](file:///d:/projects/mcoode/packages/shared/src/plan.js#L36) — `MAX_TODOS = 14`
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Make configurable; warn user when truncation occurs; ask planner to consolidate if over limit
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Make MAX_TODOS configurable
  - [ ] Emit warning when plan is truncated

---

## [GOD-012] Bugfix Round Doesn't Check if Tests Actually Exist Before Retrying

- **Description**: `_bugfixRounds` always tries `npm test` even if `_integrationPass` already determined there's no test script. This leads to wasted bugfix agent work.
- **Current vs Expected Behavior**: If no test script exists, bugfix rounds still run (dispatching bugfix agents for "broken" todos) even though there's no test to verify the fix.
- **Flow**: No test script → integration pass returns `{ ran: false }` → needsReview > 0 → bugfix rounds triggered → agents fix "broken" todos with no verification
- **Root Cause / Logic**: [subagent-manager.js L517-532](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L517-L532) — bugfix rounds check `needsReviewCount` independent of whether integration tests ran
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Only trigger bugfix rounds if integration tests actually ran and failed
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Check integration.ran before triggering bugfix rounds

---

## [GOD-013] Recursive _dispatch on Retry Creates Unbounded Stack Depth

- **Description**: When a subagent fails and needs retry, `_dispatch()` calls itself recursively via `await this._dispatch(todo)`. With 2 retries max, this creates a call stack 3 deep, which is fine. But if `retries.length < 2` check has an off-by-one, it could recurse more.
- **Current vs Expected Behavior**: Works correctly with current limits but is fragile. Iterative retry would be safer.
- **Flow**: Subagent fails → recursive _dispatch → fails again → recursive _dispatch → 3rd try
- **Root Cause / Logic**: [subagent-manager.js L339-350](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L339-L350)
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Convert to iterative retry loop
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Refactor recursive dispatch to iterative loop

---

## [GOD-014] FileLockManager Waiter Resolution Race Condition

- **Description**: When releasing a lock, the `releaseLock` method calls `next.resolve()` which sets the new ownerId. But the `resolve` callback also calls `this.locks.set(filePath, ...)`. If two waiters resolve simultaneously (e.g., two releases in rapid succession), the `locks.set` calls can interleave.
- **Current vs Expected Behavior**: In rare concurrent release scenarios, lock ownership could become inconsistent.
- **Flow**: Multiple subagents finishing simultaneously → lock release race → potential double-ownership
- **Root Cause / Logic**: [subagent-manager.js L63-78](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L63-L78) — the resolve callback does a `this.locks.set()` that may conflict with `releaseLock`'s own `entry.ownerId = next.agentId` on line 92.
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js)
- **Suggested Fix**: Remove the `this.locks.set()` from the resolve callback; `releaseLock` already handles ownership transfer
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Fix lock ownership transfer to be atomic
