# Shared Package — Bugs & Issues

---

## [SHR-001] `mergeResults` Uses Filter Comparison Bug — `SUBAGENT_STATUS.DONE` vs Status String

- **Description**: `mergeResults` filters `byId.get(t.id)?.status === SUBAGENT_STATUS.DONE`. But `byId` is built from `results` array which uses `r.todoId` as key. The results objects store `status` as strings (`'done'`, `'failed'`). If anyone passes the full subagent result (which uses `SUBAGENT_STATUS.DONE === 'done'`), it works. But if results contain raw status strings not matching the enum values, counts will be wrong.
- **Current vs Expected Behavior**: Works correctly as long as all callers use `SUBAGENT_STATUS` enum values. Fragile due to string comparison.
- **Flow**: SubagentManager passes results → `status: 'done'` → `SUBAGENT_STATUS.DONE === 'done'` → match ✓. But no type enforcement.
- **Root Cause / Logic**: [plan.js L132-148](file:///d:/projects/mcoode/packages/shared/src/plan.js#L132-L148) — string comparison without type safety
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Add TypeScript types or runtime validation for status values
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add type safety for status values

---

## [SHR-002] `planWaves` Cycle Guard Pushes ALL Remaining as Final Wave — May Execute Cycles

- **Description**: When `planWaves` detects that no todos become eligible (cycle), it pushes ALL remaining todos as a final wave. These todos have unfulfilled dependencies but get executed anyway.
- **Current vs Expected Behavior**: Cyclic todos are forced to run simultaneously, potentially causing file conflicts and race conditions. Expected: Report the cycle and abort.
- **Flow**: `t1 → t2 → t3 → t1` (cycle) → no wave progress → all 3 pushed as final wave → executed in parallel → file conflicts
- **Root Cause / Logic**: [plan.js L114-117](file:///d:/projects/mcoode/packages/shared/src/plan.js#L114-L117) — cycle guard forces execution instead of rejection
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Throw error on cycle detection in planWaves; use findCycle() to identify the offending todos
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Throw error instead of force-executing cyclic todos
  - [ ] Report cycle details to user

---

## [SHR-003] EVENTS and SOCKET Event Names Are Inconsistently Mapped

- **Description**: `EVENTS.SUBAGENT_STARTED` maps to `'SUBAGENT_STARTED'` (uppercase), while `SOCKET.CLIENT_TO_SERVER.AGENT_STARTED` maps to `'agent:started'` (lowercase, different prefix). The mapping between bus events and socket events happens in the orchestrator/sockets — but it's implicit and error-prone.
- **Current vs Expected Behavior**: Works because the orchestrator manually maps `EVENTS.X` → socket event name. But adding a new event requires updating 3 places: EVENTS, SOCKET, and the mapping code.
- **Flow**: New event added to EVENTS → forgotten in SOCKET → dashboard never receives it
- **Root Cause / Logic**: [events.js L1-134](file:///d:/projects/mcoode/packages/shared/src/events.js#L1-L134) — two parallel enum systems
- **Affected Files**: [`packages/shared/src/events.js`](file:///d:/projects/mcoode/packages/shared/src/events.js)
- **Suggested Fix**: Auto-generate SOCKET from EVENTS with a naming convention; or merge into one event system
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Unify event naming system
  - [ ] Auto-generate socket event names from EVENTS

---

## [SHR-004] `normalizeTodo` Silently Defaults Unknown Domains to 'backend'

- **Description**: If the planning model generates a todo with `domain: "security"` or `domain: "api"`, `normalizeTodo` silently changes it to `'backend'`. No warning is emitted.
- **Current vs Expected Behavior**: User asks for a security audit → planner generates `domain: "security"` → silently becomes "backend" → wrong model selected (backend models, not security-focused ones).
- **Flow**: `domain: "security"` → not in valid list → defaults to 'backend' → backend model assigned
- **Root Cause / Logic**: [plan.js L11-12](file:///d:/projects/mcoode/packages/shared/src/plan.js#L11-L12) — includes check with silent default
- **Affected Files**: [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js)
- **Suggested Fix**: Log warning when domain is normalized; consider adding more domains or a flexible domain system
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Log warning on domain normalization
  - [ ] Consider adding security, api, integration domains

---

## [SHR-005] No TypeScript Types Exported — Consumers Have Zero Type Safety

- **Description**: The shared package is pure JavaScript with no TypeScript types, `.d.ts` files, or JSDoc `@typedef` annotations. All consumers (CLI, backend, web) import from `@mcode/shared` without any type information.
- **Current vs Expected Behavior**: IDE autocomplete doesn't work. Type errors are only caught at runtime. Refactoring is dangerous because there's no compiler check.
- **Flow**: Developer changes `EVENTS.SUBAGENT_STARTED` name → no TypeScript error → runtime crash in 5 different files
- **Root Cause / Logic**: Package is pure JS without type definitions
- **Affected Files**: [`packages/shared/src/index.js`](file:///d:/projects/mcoode/packages/shared/src/index.js) and all shared files
- **Suggested Fix**: Add JSDoc type annotations at minimum; or add TypeScript `.d.ts` files; or migrate to TypeScript
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add JSDoc type annotations to shared package
  - [ ] Consider TypeScript migration

---

## [SHR-006] `CostLedger._trim` Has O(n) Shift Operations — Slow for Large Arrays

- **Description**: `_trim` uses `while (arr.length && arr[0] < cutoff) arr.shift()` which is O(n²) for large arrays because `shift()` is O(n) (moves all elements). With high-frequency providers, the arrays can grow large.
- **Current vs Expected Behavior**: With 1000 RPM, the rpm array has 1000 entries. Each `_trim` call does up to 1000 shifts, each O(1000). Total: O(1M) per trim call.
- **Flow**: High-frequency API calls → rpm array grows → _trim becomes slow → router.pick() latency increases
- **Root Cause / Logic**: [shared/index.js L31-39](file:///d:/projects/mcoode/packages/shared/src/index.js#L31-L39) — `arr.shift()` in loop
- **Affected Files**: [`packages/shared/src/index.js`](file:///d:/projects/mcoode/packages/shared/src/index.js)
- **Suggested Fix**: Use binary search to find cutoff index, then `arr.splice(0, cutoffIdx)` (single O(n) operation); or use a circular buffer
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Optimize _trim with binary search + splice
  - [ ] Or use circular buffer

---

## [SHR-007] `plugins.js` Export Not Analyzed — Potential Dead Code

- **Description**: `index.js` exports from `./plugins.js` but the plugins system is imported across packages without clear documentation of its API contract.
- **Current vs Expected Behavior**: Plugin system exists but its interface is unclear. May contain dead code or unexported utilities.
- **Flow**: Plugin features referenced in backend/sockets but unclear if fully wired
- **Root Cause / Logic**: [shared/index.js L5](file:///d:/projects/mcoode/packages/shared/src/index.js#L5)
- **Affected Files**: [`packages/shared/src/plugins.js`](file:///d:/projects/mcoode/packages/shared/src/plugins.js)
- **Suggested Fix**: Audit plugins.js for dead code; document plugin API contract
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Audit plugins.js
  - [ ] Document plugin system API

---

## [SHR-008] `provider.js` Export Referenced but Provider Base Class Not in Shared

- **Description**: `index.js` exports from `./provider.js` but the actual provider implementations are in `packages/cli/src/providers/`. The shared `provider.js` likely contains interfaces/types but the relationship is unclear without TypeScript.
- **Current vs Expected Behavior**: Provider contract is implicitly defined (duck typing) rather than explicitly enforced.
- **Flow**: New provider added → developer must guess the required method signatures by reading existing providers
- **Root Cause / Logic**: [shared/index.js L4](file:///d:/projects/mcoode/packages/shared/src/index.js#L4)
- **Affected Files**: [`packages/shared/src/provider.js`](file:///d:/projects/mcoode/packages/shared/src/provider.js)
- **Suggested Fix**: Document provider interface; add JSDoc or `.d.ts` for provider contract
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Document provider interface
  - [ ] Add type definitions for provider contract
