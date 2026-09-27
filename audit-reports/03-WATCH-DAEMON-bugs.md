# Watch Daemon — Bugs & Issues

---

## [WTH-001] ESLint Binary Detection Only Checks Once — Never Retries After npm Install

- **Description**: `_getEslintBin()` sets `this._eslintChecked = true` on the FIRST call and never checks again. If ESLint is installed after the daemon starts (e.g., `npm install` by a subagent), the daemon will never discover it.
- **Current vs Expected Behavior**: Starting watch → npm install eslint → daemon still reports "no eslint". Expected: Re-detect periodically.
- **Flow**: `mcode watch` → `_getEslintBin()` returns null → subagent runs `npm install` → ESLint now exists → daemon still uses null → no lint checks
- **Root Cause / Logic**: [watch-daemon.js L182-192](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L182-L192) — `_eslintChecked` flag is permanent.
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Re-check every N scans (e.g., every 10th scan) or on `node_modules` change detection
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add periodic ESLint binary re-detection
  - [ ] Trigger re-check when node_modules changes

---

## [WTH-002] `_lintFiles` Batch Mode Ignores Individual File Errors

- **Description**: `_lintFiles()` runs ESLint on ALL pending files in one `execa` call. If ESLint crashes (e.g., config parse error), the entire batch fails silently and ALL files are marked as `{ ok: true }`.
- **Current vs Expected Behavior**: One bad `.eslintrc` file causes ALL lint checks to report "ok", including files with real syntax errors. Expected: Fallback to per-file linting on batch failure.
- **Flow**: `.eslintrc` has syntax error → batch ESLint crashes → all files get `{ ok: true }` → broken code passes
- **Root Cause / Logic**: [watch-daemon.js L194-218](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L194-L218) — the catch block silently returns the pre-set `{ ok: true }` map.
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: On batch failure, fall back to per-file `_lintFile()` calls
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add fallback to per-file linting
  - [ ] Log batch lint failures

---

## [WTH-003] TypeScript Static Check Runs `tsc --noEmit` On EVERY Change — Extremely Slow

- **Description**: `_staticCheck` for `.ts`/`.tsx` files runs `tsc --noEmit <file>` which type-checks the ENTIRE project (TypeScript doesn't support single-file checking with `--noEmit`). On a 1000-file project, each file change triggers a full type check.
- **Current vs Expected Behavior**: Each `.ts` change causes a 30-60 second `tsc` invocation. With 400ms debounce and multiple changes, this creates a massive queue backup.
- **Flow**: Save `app.ts` → daemon queues it → `_staticCheck` runs `tsc --noEmit app.ts` → TypeScript checks entire project → 45 seconds → next file in queue → another 45 seconds
- **Root Cause / Logic**: [watch-daemon.js L306-316](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L306-L316) — `tsc --noEmit <file>` still resolves all imports and type-checks dependencies.
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Use `tsc --noEmit --incremental` with a persistent tsconfig; or use a faster checker like `swc` or `esbuild` for syntax-only checking
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Switch to incremental type checking
  - [ ] Or use esbuild for fast syntax-only validation

---

## [WTH-004] `_verifyFix` Creates Temp Files in OS tmpdir — Never Cleaned on Crash

- **Description**: `_verifyFix` writes candidate fix to a temp file for verification. The `finally` block calls `rm()`, but if the daemon crashes (OOM, SIGKILL) mid-verification, temp files accumulate in the system tmpdir with names like `.mcode-fix-*`.
- **Current vs Expected Behavior**: Normal operation cleans up. Abnormal termination leaves orphaned temp files. Over time, these accumulate.
- **Flow**: Daemon crashes during fix verification → temp file left in tmpdir → never cleaned
- **Root Cause / Logic**: [watch-daemon.js L474-500](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L474-L500) — relies on `finally` which doesn't run on process crash
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Add startup cleanup that deletes old `.mcode-fix-*` files from tmpdir; or use a project-local temp directory that's cleaned on restart
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add startup cleanup for orphaned temp files

---

## [WTH-005] Watch Daemon `fixTimestamps` Pruned Twice — Redundant Work

- **Description**: `_applyFix` prunes `fixTimestamps` at the START of the method (L368) and AGAIN after applying the fix (L451). The second pruning is unnecessary since it was just done ~1 second ago.
- **Current vs Expected Behavior**: Cosmetic issue — double pruning wastes a few microseconds per fix.
- **Flow**: Fix applied → prune → push new timestamp → prune again
- **Root Cause / Logic**: [watch-daemon.js L368](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L368) and [L451](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L451) — duplicate filter operations.
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Remove the second pruning on L451
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Remove duplicate fixTimestamps pruning

---

## [WTH-006] `_drainQueue` Can Recurse Infinitely If New Items Added During Processing

- **Description**: At the end of `_drainQueue()`, if `this._queue.size > 0`, it calls `await this._drainQueue()` recursively. If a chokidar event fires during processing and adds to the queue, each drain will trigger another drain, potentially building deep recursion.
- **Current vs Expected Behavior**: With fast file changes (e.g., `git checkout` switching branch — hundreds of files change simultaneously), the recursion can go 100+ deep.
- **Flow**: Branch switch → 500 files change → queue drains → more changes arrive → recursive drain → stack overflow risk
- **Root Cause / Logic**: [watch-daemon.js L236](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L236) — recursive call at end of drain
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Use a `while` loop instead of recursion; `while (this._queue.size > 0) { const batch = [...this._queue]; this._queue.clear(); ... }`
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Replace recursive _drainQueue with iterative loop

---

## [WTH-007] `_ignored` Regex Construction Has ReDoS Risk

- **Description**: The `_ignored` method constructs regex from gitignore/mcodeignore patterns using `replace(/[.+?^${}()|[\\]\\\\]/g, '\\$&').replace(/\\*/g, '.*')`. Complex patterns (e.g., deeply nested `**/*`) can create pathological regexes.
- **Current vs Expected Behavior**: A crafted `.gitignore` pattern like `**/**/**/**/**/test` would create `.*/.*/.*/.*/.*/.*/test` which is exponential on certain inputs.
- **Flow**: User adds pathological gitignore pattern → `_ignored` creates expensive regex → every file check takes seconds → daemon appears frozen
- **Root Cause / Logic**: [watch-daemon.js L73-84](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L73-L84)
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Use a proper glob library (minimatch/micromatch) instead of regex construction; or limit `.*` replacements
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Use minimatch for glob pattern matching

---

## [WTH-008] Watch Scan Failure Counter `_scanFailures` Never Resets to 0

- **Description**: After 3 scan failures, the `scanOnce()` method stops scheduling retries. But the counter resets to 0 on LINE 142 only on SUCCESS. If the scan succeeds after the interval fires, the counter resets. But if the interval fires and scan fails 3 times, it stops. Then the interval fires again (since `setInterval` was never cleared for scan failures) and `scanOnce()` exits because `_scanFailures` is still 3.
- **Current vs Expected Behavior**: Wait — `scanOnce()` doesn't check `_scanFailures >= 3` at entry. It only checks after failure. So the interval would keep calling `scanOnce()` which would keep failing and scheduling redundant retries. The real issue: 3 failures → setTimeout retries → interval ALSO fires → parallel scans possible.
- **Flow**: Scan fails 3 times → 3 setTimeout retries scheduled → main setInterval ALSO fires scanOnce → 2 scans running in parallel
- **Root Cause / Logic**: [watch-daemon.js L171-177](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L171-L177) — failure retry via setTimeout runs alongside the main setInterval
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Add a `_scanning` flag to prevent concurrent scans; clear interval on too many failures
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add _scanning guard
  - [ ] Fix concurrent scan prevention

---

## [WTH-009] `_applyFix` Passes `errorContext` as String or Object Inconsistently

- **Description**: `analyzeFile` calls `_applyFix(rel, lintResult)` where lintResult is `{ ok: false, detail: "..." }` (an object), but also `_applyFix(rel, staticIssues.join('\n'))` (a string). Inside `_applyFix`, it's used as part of a template string for the AI prompt.
- **Current vs Expected Behavior**: When the object form is passed, the AI prompt gets `PROBLEM:\n[object Object]` instead of the actual error details.
- **Flow**: Lint error detected → `_applyFix(rel, { ok: false, detail: "5:1 ..." })` → AI prompt says `[object Object]` → AI can't understand the problem
- **Root Cause / Logic**: [watch-daemon.js L252](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L252) passes the full lintResult object; [L259](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L259) passes a string.
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Normalize: always pass `lintResult.detail || String(lintResult)` as the errorContext
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Fix _applyFix to always receive string errorContext
  - [ ] Extract `.detail` from lintResult before passing

---

## [WTH-010] `_lintFiles` Only Lints `.js`/`.jsx`/`.mjs`/`.cjs` — Ignores `.ts`/`.tsx`

- **Description**: The batch lint filter in `_drainQueue` only includes JS extensions. TypeScript files bypass linting entirely and go straight to `_staticCheck` (which runs the expensive `tsc`).
- **Current vs Expected Behavior**: `.ts` files with simple ESLint-catchable issues (unused vars, missing semicolons) skip linting and trigger the expensive TypeScript compiler instead.
- **Flow**: `app.ts` has unused import → skips batch lint → runs `tsc --noEmit` (slow) → error detected → AI fix invoked for what ESLint could catch in 100ms
- **Root Cause / Logic**: [watch-daemon.js L225](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js#L225) — filter excludes `.ts`/`.tsx`
- **Affected Files**: [`packages/cli/src/core/watch-daemon.js`](file:///d:/projects/mcoode/packages/cli/src/core/watch-daemon.js)
- **Suggested Fix**: Add `.ts`, `.tsx` to the lintable extensions filter
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add TypeScript extensions to batch lint filter
