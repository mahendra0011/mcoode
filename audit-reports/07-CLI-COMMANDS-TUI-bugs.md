# CLI Commands & TUI/REPL — Bugs & Issues

---

## [CLI-001] REPL `while(true)` Loop Only Exits on `process.exit(0)` — No Graceful Shutdown

- **Description**: The main TUI loop in `startRepl()` runs `while (true)` and only exits via `process.exit(0)` at the end. If the renderer fails to destroy properly, the loop continues forever or the process hangs.
- **Current vs Expected Behavior**: If `renderer.destroy()` throws or the alternate screen mode can't be exited, the terminal is left in raw mode with no way to recover except killing the process.
- **Flow**: Exit TUI → `renderer.destroy()` throws → `process.exit(0)` runs → but terminal raw mode not cleared → terminal broken
- **Root Cause / Logic**: [repl.js L120-203](file:///d:/projects/mcoode/packages/cli/src/repl.js#L120-L203) — `while(true)` with only `process.exit(0)` as escape
- **Affected Files**: [`packages/cli/src/repl.js`](file:///d:/projects/mcoode/packages/cli/src/repl.js)
- **Suggested Fix**: Add try-catch around renderer.destroy(); reset terminal manually on failure; add SIGINT handler to clear terminal state
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add terminal state cleanup on error
  - [ ] Add SIGINT handler for graceful TUI exit

---

## [CLI-002] Onboarding `apiCall` Uses Full URL Instead of Relative Path

- **Description**: The `apiCall` helper in `startRepl()` receives `path` as the URL parameter, but callers pass full URLs like `${base}/api/v1/auth/send-otp`. The `fetch(path, ...)` call works, but the variable name `path` is misleading and the error message references `base` correctly.
- **Current vs Expected Behavior**: Works correctly but confusing naming. Not a bug, but a code quality issue.
- **Flow**: `apiCall('POST', 'http://localhost:3100/api/v1/auth/send-otp', ...)` — works fine
- **Root Cause / Logic**: [repl.js L52-77](file:///d:/projects/mcoode/packages/cli/src/repl.js#L52-L77) — parameter named `path` but receives full URL
- **Affected Files**: [`packages/cli/src/repl.js`](file:///d:/projects/mcoode/packages/cli/src/repl.js)
- **Suggested Fix**: Rename parameter from `path` to `url`
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Rename apiCall parameter for clarity

---

## [CLI-003] `shipCommand` Blindly Runs `npm test` Without Checking Exit Code Properly

- **Description**: `shipCommand` runs `npm test` via `execa` with `stdio: 'inherit'`. If tests fail, `execa` throws an error, but the error is not caught — it propagates and kills the entire ship process.
- **Current vs Expected Behavior**: Test failure aborts the ship flow with an uncaught exception and a raw error dump instead of a clean "tests failed — aborting ship" message. Expected: Catch test failure, show friendly message, ask if user wants to ship anyway.
- **Flow**: `mcode ship` → build succeeds → tests fail → `execa` throws → stack trace dump → process exits
- **Root Cause / Logic**: [ship.js L46-49](file:///d:/projects/mcoode/packages/cli/src/commands/ship.js#L46-L49) — no try-catch around test execution
- **Affected Files**: [`packages/cli/src/commands/ship.js`](file:///d:/projects/mcoode/packages/cli/src/commands/ship.js)
- **Suggested Fix**: Wrap test execution in try-catch; show clean error; offer to skip tests with `--skip-tests` flag
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add try-catch around npm test
  - [ ] Add --skip-tests flag
  - [ ] Show friendly error message on test failure

---

## [CLI-004] `shipCommand` Does `git add -A` Before Commit — May Stage Unintended Files

- **Description**: Before tagging, the ship command runs `git.add(['-A'])` which stages ALL changes in the working directory, including untracked files, build artifacts, node_modules changes, etc.
- **Current vs Expected Behavior**: `mcode ship` stages everything — including files the user explicitly didn't `git add`. This can commit secrets, debugging files, or large binary artifacts.
- **Flow**: User has unstaged `.env.local` with secrets → `mcode ship` → `git add -A` → `.env.local` staged and committed → secrets in git history
- **Root Cause / Logic**: [ship.js L59](file:///d:/projects/mcoode/packages/cli/src/commands/ship.js#L59)
- **Affected Files**: [`packages/cli/src/commands/ship.js`](file:///d:/projects/mcoode/packages/cli/src/commands/ship.js)
- **Security Risk**: **HIGH** — May commit secrets or sensitive files
- **Suggested Fix**: Only stage files already tracked by git; or show diff summary and ask for confirmation before staging
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Replace `git add -A` with explicit file staging
  - [ ] Show diff summary before commit
  - [ ] Warn about untracked files being staged

---

## [CLI-005] `envCommand` Writes to `.env` in Plaintext Mode Without Gitignore Check

- **Description**: `mcode env add KEY value --plain` writes the key directly to `.env` in plaintext. It doesn't check if `.env` is in `.gitignore`, potentially enabling accidental secret commits.
- **Current vs Expected Behavior**: User runs `mcode env add OPENAI_API_KEY sk-xxx --plain` → API key written to `.env` in plaintext → if `.env` not in `.gitignore` → committed to git
- **Flow**: `--plain` mode → write to `.env` → no `.gitignore` check
- **Root Cause / Logic**: [env.js L18-32](file:///d:/projects/mcoode/packages/cli/src/commands/env.js#L18-L32)
- **Affected Files**: [`packages/cli/src/commands/env.js`](file:///d:/projects/mcoode/packages/cli/src/commands/env.js)
- **Suggested Fix**: Check if `.env` is in `.gitignore`; warn if not; suggest adding it
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add .gitignore check before plaintext .env write
  - [ ] Warn user if .env not ignored

---

## [CLI-006] Watch Daemon Background Script Path Resolution Is Brittle

- **Description**: `watchCommand` in background mode searches for the watch script in two hardcoded candidate paths. If the project structure changes (e.g., after a build tool migration), the script won't be found.
- **Current vs Expected Behavior**: `mcode watch --background` → script not found if paths change → error → no daemon started
- **Flow**: User runs `mcode watch --background` → candidate paths don't match → `fail()` → exit
- **Root Cause / Logic**: [watch.js L20-31](file:///d:/projects/mcoode/packages/cli/src/commands/watch.js#L20-L31) — hardcoded relative paths
- **Affected Files**: [`packages/cli/src/commands/watch.js`](file:///d:/projects/mcoode/packages/cli/src/commands/watch.js)
- **Suggested Fix**: Use `import.meta.resolve` or a package.json `bin` entry for the watch process
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Use import.meta.resolve for script path

---

## [CLI-007] `persistState` `setInterval` Never Cleared — Keeps Running After Watch Stop

- **Description**: `persistState` creates a `setInterval` that writes daemon state every 5 seconds. When the daemon stops via SIGINT, the interval is never cleared — it keeps trying to write state (which fails because the daemon object is stopped).
- **Current vs Expected Behavior**: After `Ctrl+C`, the setInterval keeps firing for 5 more seconds until `process.exit(0)` kills it. Not a real bug since exit kills it, but if the shutdown handler is slow, it may write incorrect state.
- **Flow**: `Ctrl+C` → shutdown handler starts → setInterval fires → writes "stopped" state → exit
- **Root Cause / Logic**: [watch.js L133-139](file:///d:/projects/mcoode/packages/cli/src/commands/watch.js#L133-L139) — interval not stored for cleanup
- **Affected Files**: [`packages/cli/src/commands/watch.js`](file:///d:/projects/mcoode/packages/cli/src/commands/watch.js)
- **Suggested Fix**: Store interval reference; clear in shutdown handler
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Store and clear persistState interval

---

## [CLI-008] `bin/mcode.mjs` vs `bin/mcode.js` — Inconsistent Bin Entry

- **Description**: `package.json` declares `"bin": { "mcode": "bin/mcode.mjs" }` but the root package.json scripts reference `packages/cli/bin/mcode.js`. Two different entry points exist.
- **Current vs Expected Behavior**: `npm link` installs `mcode.mjs` as the binary, but `npm run mcode` runs `mcode.js`. They may diverge in behavior.
- **Flow**: `npm link` → `mcode` command uses `mcode.mjs` → `npm run mcode` uses `mcode.js` → potential differences
- **Root Cause / Logic**: [cli/package.json L30-31](file:///d:/projects/mcoode/packages/cli/package.json#L30-L31) vs [root/package.json L14](file:///d:/projects/mcoode/package.json#L14)
- **Affected Files**: [`packages/cli/package.json`](file:///d:/projects/mcoode/packages/cli/package.json), [`package.json`](file:///d:/projects/mcoode/package.json)
- **Suggested Fix**: Unify to a single entry point; make `.mjs` the canonical one and have `.js` re-export
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Unify bin entry points
