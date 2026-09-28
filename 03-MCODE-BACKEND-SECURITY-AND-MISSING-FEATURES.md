# 03 — Backend Security & Missing Features

> [!IMPORTANT]
> **Verification note (2026-09-28):** Every finding in this file was re-verified line-by-line against the
> current repository — HEAD `8ab5d11` **and** the working tree (`d:\projects\mcoode`) — before being
> documented. Claims that turned out to be **already fixed** or **inaccurate** are listed first in the
> corrections table below, with file:line evidence. Nothing in this file is copied from an earlier report
> without re-checking the code.

---

## 📋 Verification of earlier claims (corrections first)

| Earlier claim | Verdict | Evidence (verified) |
|---|---|---|
| 🔴 `routes/pair.js` decrypts API keys with **no auth** | ❌ **Stale — already fixed** | `pair.js:2` imports `authMiddleware`; `pair.js:330-332` `router.use(authMiddleware({ secret }))`. Inline guard for `POST /api/v1/pair-suggest` at `server.js:209`. Present at HEAD. |
| 🔴 "5 backend routes have no auth middleware" | ❌ **4/5 fixed; 1 public-by-design** | `pair.js:332` ✓, `clean.js:11` ✓, `android.js:25` ✓, `extensions.js:149` ✓ (all verified in `git show HEAD:…`). Only `languages.js` has no auth — read-only, documented as public (`docs/API.md:75`). Residual *pattern* risk documented as **BSEC-002**. |
| 🔴 `clean.js` path traversal (`req.body.projectPath` direct) | ❌ **Fixed** | `clean.js:11` auth + `resolveTargetPath()` (`clean.js:86-123`, tags CLN-001/SEC-029) accepts a path **only** if it exists and sits inside one of the caller's own workspace `diskPath`s; otherwise `400 projectPath is not inside one of your workspaces`. |
| 🟠 `doctor.js` hardcoded version `2.4.6` | ✅ **Confirmed** | `doctor.js:20` — plus the same hardcoding in `index.js:12` (`.version('2.4.6')`). → **MF-006** |
| 🔴 "Cost/token usage tracking missing" | ⚠️ **Partly wrong** | `CostLedger` exists (`shared/src/index.js:15-125`) and CLI persists it to `~/.mcode/ledger.json` (`router.js:262-266`). Real gaps: attribution call sites + CLI exposure + budget enforcement. → **MF-002** |
| 🟠 "Config schema validation missing" | ⚠️ **Partly wrong** | zod `ConfigSchema` + `validateConfig()` exist (`core/config-schema.js:37-74`). Real bug: `store.js:40-46` **silently swallows** validation errors → empty config. → **MF-007** |
| 🔴 CLI vault: weak default key (hostname+username) | ❌ **Already fixed (SEC-003)** | `vault.js:52-64` `requirePassphrase()` fails closed; random per-vault salt in header (`vault.js:177-179`); weak mode only via explicit `MCODE_VAULT_ALLOW_WEAK=1` with stderr warning. |
| 🔴 `run_shell`: denylist bypass | ❌ **Already fixed (SEC-004)** | `tools.js:30-49` default-deny `SHELL_ALLOWLIST`; `shell:false` for allowlisted commands (`tools.js:761`); pipes/redirection/substitution blocked (`tools.js:752-754`); network binaries governed by egress policy (`tools.js:744-749`). |
| 🟠 Session resume/continue missing | ✅ **Confirmed** | No `resume`/`--continue` anywhere in CLI source; history *is* written but never re-read for continuation. → **MF-001** |
| 🟠 `mcode god --dry-run` missing | ✅ **Confirmed** | `index.js:82-107` — god options are `-y/--yes, --stack, --deploy, --no-tests, -c/--concurrency, --watch-after, -m/--model, --verbose`. No plan-only mode. → **MF-003** |
| 🟠 Parallel-subagent write conflict resolution missing | ⚠️ **Locks exist; observability/UX missing** | `FileLockManager` (`subagent-manager.js:27+`) + `resolveFileConflicts()` (`plan.js:152+`) + `findCycle()` (`plan.js:115+`) already serialize/order shared-file todos. Missing: surfacing lock-timeouts, per-file writer audit, resolution UI. → **MF-004** |
| 🟠 Remote plugin registry missing | ✅ **Confirmed** | `mcode add` reads the **static in-repo** `PLUGIN_REGISTRY` (`commands/add.js:3,6` → `shared/src/plugins.js:7`). No remote fetch path. → **MF-005** |
| 🔴 JWT secret reused as encryption-key input | ✅ **Confirmed at HEAD → ✅ fixed in working tree** | `secret-enc.js:9-11` `deriveMasterKey(secret, userId)` where `secret` = `JWT_SECRET` (`server.js:62-71`). All 4 decrypt/encrypt call sites (`keys.js`, `github.js`, `workspaces.js`, `chat-session.js`) derived from it at HEAD — now migrated to `keyManagerFromEnv()` with a dedicated `API_KEY_ENCRYPTION_SECRET` (v2 envelope). → **BSEC-001** |

**Bottom line:** the genuinely *new* critical finding was **BSEC-001** (encryption-key management) — now **fixed in the working tree** (v2 envelope encryption + dedicated `API_KEY_ENCRYPTION_SECRET`, see the status banner). The route-auth findings are stale; what remains there is a **fail-open pattern** (BSEC-002, still open). The missing
features are all confirmed as real. Cost tracking is an *unexposed + unattributed* feature, not a missing
one.

---

# 🔐 Part A — Backend Security Findings

## [BSEC-001] JWT Secret Reused as API-Key Encryption Key Input — No Dedicated/Rotatable Secret

> **✅ Status (2026-09-28, working tree): FIXED — implemented + tested.**
> `secret-enc.js` now provides v2 envelope encryption (`MCCODEK2:` + `keyId` + random salt + owner-bound
> GCM AAD) via `createKeyManager()` / `keyManagerFromEnv()`; new writes use the dedicated
> `API_KEY_ENCRYPTION_SECRET` (keyId `ek1`), while legacy v1 (`MCCODEKEY:`) and `jwt1` fallback blobs stay
> readable. **All call sites migrated:** `routes/keys.js` (writes v2, lazily re-encrypts on GET, logs
> `KEY_DECRYPT_FAILED`/`KEY_ROTATION_FAILED`), `routes/github.js` (connect + login callbacks, repos read),
> `routes/workspaces.js` (git push), `chat-session.js` (socket sessions, `env` plumbed through
> `sockets.js`), `routes/pair.js` (router cache). `server.js` warns at startup when the secret is
> missing/short; `config/envValidator.js` warns and **fail-closes in production when
> `API_KEY_ENCRYPTION_SECRET === JWT_SECRET`**; `.env.example` documents generation + rotation
> (`API_KEY_ENCRYPTION_SECRET_PREVIOUS` dual-read). Tests: 10 new BSEC-001 cases in
> `packages/backend/tests/pair.test.js` (round-trip, legacy compat, AAD binding, jwt1 fallback, rotation
> keyring, unknown-keyId, env precedence, masking, tamper rejection, v1 byte-compat) — all passing.
> Remaining ops TODOs: set the secret in deployments, freeze `JWT_SECRET` rotation until lazy re-encrypt
> completes. **Migration script + runbook now done:** `packages/backend/scripts/migrate-key-encryption.js`
> (two-pass: collect+verify → backup → write; `npm run migrate:key-enc` dry-run / `--apply`; 7 tests in
> `tests/migrate-key-enc.test.js`) + rotation runbooks in `SECURITY.md`.

- **Description**: `secret-enc.js` derives the AES-256-GCM master key for **every user's stored provider API keys** from `scryptSync('mcode-apikey:${userId}:${secret}', 'mcode', 32)` where `secret` is the **server JWT signing secret**. The same value signs auth tokens and encrypts secrets at rest. The code comment itself states the intent: *"Key is derived from the server JWT secret + user ID, so each user's keys are encrypted with a unique key — DB leak alone is not enough."* That property only holds for the isolated-DB-leak scenario and breaks the moment `JWT_SECRET` is exposed.
- **Current vs Expected Behavior**:
  - **Current**: one shared server secret is dual-purpose (auth signing **and** data-encryption KDF input). `userId` is not a secret (it is a database value). Nothing in `.env.example` defines a separate encryption secret — verified: only `JWT_SECRET` exists (`.env.example:5`). The scrypt salt is the **fixed string `'mcode'`**, and the derived key has no version/`keyId` in the encrypted blob (`secret-enc.js:26`), so rotation is impossible without data loss. *(This described the HEAD state; the working tree now has `.env.example` entries for `API_KEY_ENCRYPTION_*` and `keyId`-versioned v2 blobs — see status banner.)*
  - **Expected**: encryption keys derived from a **dedicated** secret (`API_KEY_ENCRYPTION_SECRET`, independent of JWT), with per-user random salts, key-version metadata in the blob, and independent rotation runbooks for (a) JWT signing and (b) at-rest encryption.
- **Flow (failure scenario)**: server compromise / leaked `.env` + DB dump (the two artifacts most commonly exfiltrated together: misconfigured backup, committed `.env`, cloud storage misconfig) → attacker has `JWT_SECRET` + all `userId`s → runs `scryptSync('mcode-apikey:'+userId+':'+secret, 'mcode', 32)` offline for each user → decrypts **every** stored provider key with `decryptKey()` → direct spend on every user's own API accounts. The per-user uniqueness is cosmetic once the shared secret leaks.
- **Flow (rotation scenario)**: operator rotates `JWT_SECRET` as a security hygiene step → every blob written under the old secret fails `decipher.final()` → call sites swallow the throw (`keys.js:30` `catch { /* skip */ }`, similar `try/catch` in `github.js`) → stored keys silently become unusable; users must manually re-enter every provider key. There is **no migration/dual-read path and no key versioning** to rotate without breaking at-rest data.
- **Root Cause / Logic**: [`secret-enc.js:9-11`](file:///d:/projects/mcoode/packages/backend/src/secret-enc.js#L9-L11) — `deriveMasterKey(secret, userId)`; `secret` originates from [`server.js:62-71`](file:///d:/projects/mcoode/packages/backend/src/server.js#L62-L71) (`env.JWT_SECRET`, or a randomly generated dev secret that **also changes on every restart**, making dev-env blobs unreadable across restarts). Consumer call sites: [`keys.js:27,90,152`](file:///d:/projects/mcoode/packages/backend/src/routes/keys.js#L27), [`github.js:123`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L123), [`workspaces.js`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js), [`chat-session.js:6-7`](file:///d:/projects/mcoode/packages/backend/src/chat-session.js#L6-L7), [`pair.js:4`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L4).
- **Affected Files**: [`packages/backend/src/secret-enc.js`](file:///d:/projects/mcoode/packages/backend/src/secret-enc.js), [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js), [`packages/backend/src/routes/keys.js`](file:///d:/projects/mcoode/packages/backend/src/routes/keys.js), [`packages/backend/src/routes/github.js`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js), [`packages/backend/src/routes/workspaces.js`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js), [`packages/backend/src/chat-session.js`](file:///d:/projects/mcoode/packages/backend/src/chat-session.js), [`.env.example`](file:///d:/projects/mcoode/.env.example)
- **Security Risk**: **CRITICAL (key-management class)** — single-secret compromise converts the "DB leak alone is not enough" design into full plaintext exposure of every stored provider key. Secret rotation is coupled: rotating JWT invalidates all at-rest ciphertexts. Secondary observations: (a) `scryptSync` is a **synchronous, blocking** KDF invoked per key operation (event-loop stall under load — the 5-minute `routerCache` in `pair.js:8-10` only partially mitigates); (b) no AAD binds the blob to the owning `userId`, so a DB-level blob swap between users is not cryptographically detected.

- **Steps to Reproduce (offline, no live server needed)**:
  1. Take any blob from a user's `encryptedKey` field and that user's `userId`.
  2. With the server's `JWT_SECRET`: `deriveMasterKey(secret, userId)` → `decryptKey(blob, masterKey)` → plaintext key. This is exactly the happy path demonstrated in `scripts/e2e-chat-test.mjs:13-15`.
- **Suggested Fix / Implementation Plan**:
  1. Introduce `API_KEY_ENCRYPTION_SECRET` (32+ random bytes) as a **separate** env var; keep `JWT_SECRET` for tokens only. Add it to `.env.example`; fail fast in production if missing (mirror the `JWT_SECRET` guard at `server.js:64-66`).
  2. Move to **envelope encryption**: generate a random per-user Data Encryption Key (DEK) at first key write; wrap it with a Key-Encryption-Key derived from the dedicated secret via scrypt with a **per-user random salt**; store `{ v, keyId, salt, wrappedDek }`. Remove the fixed `'mcode'` salt.
  3. Add `v`/`keyId` to the blob header (`secret-enc.js:13-16`) plus a keyring map, so **rotation = write new keyId, dual-read old keyId, lazy re-encrypt on next write** — no user re-entry.
  4. Decouple rotations: separate runbooks for JWT rotation (safe, no data impact) and encryption-key rotation (dual-read window, then re-wrap).
  5. Make decrypt failures **visible**: replace silent `catch { /* skip */ }` (`keys.js:30`) with a structured warning event (`{ code: 'KEY_DECRYPT_FAILED', keyId }`) so silent key loss becomes impossible.
  6. Optional hardening: async `scrypt` (or per-session DEK cache) to unblock the event loop; bind blobs to `userId` via GCM AAD.
  7. Migration script (`scripts/migrate-key-encryption.mjs`): read each blob with the legacy derivation, re-write in v2 envelope format, verify round-trip, keep backups until verified.
- **Priority**: High
- **Phase**: Phase 1 (EMERGENCY — freeze `JWT_SECRET` rotation until the migration ships; rotating the JWT before migration destroys all stored keys)
- **TODOs**:
  - [x] Add `API_KEY_ENCRYPTION_SECRET` env + production fail-fast guard + `.env.example` entry
  - [x] Implement v2 envelope encryption (per-user random salt, wrapped DEK, `v`/`keyId` header)
  - [x] Add dual-read keyring + lazy re-encrypt on write
  - [x] Migration script with round-trip verification + backups
  - [x] Replace silent decrypt-failure catches with structured warnings
  - [x] Tests: distinct-secret isolation, rotation dual-read, blob-swap rejection (AAD)
  - [x] Docs: SECURITY.md rotation runbooks (JWT vs encryption key, independent)

---

## [BSEC-002] Fail-Open Route-Auth Pattern — No Central "Protected-by-Default" Guard

- **Description**: The earlier "5 routes have no auth" claim is **stale** (verified: `pair.js`, `clean.js`, `android.js`, `extensions.js` are all protected at HEAD — see the corrections table). What genuinely remains:
  1. **Fail-open mounting pattern**: `android.js:25` and `extensions.js:149` apply auth only `if (secret) router.use(authMiddleware({ secret }))`. If `secret` is ever falsy at mount time (future refactor, test harness, a caller that forgets to pass it), the routes silently become **fully public** — no error, no log. `server.js` currently always sets `secret` (`server.js:62-71`), so today this is latent, but it is the wrong failure direction for security middleware.
  2. **No central policy**: 18 routers are mounted individually (`server.js:193-211`); a new route file added without `router.use(authMiddleware(...))` gets **no protection and no warning**. There is no startup assertion that every non-public router has auth.
  3. **`languages.js` is the only unauthenticated API router** (`server.js:206` mounts it with no secret; `languages.js:6-22` has no middleware). It is intentionally public and read-only per `docs/API.md:75` ("public runtimes list") — acceptable by design, but it should be **explicitly allowlisted as public** rather than "just another file that happens to lack auth".
  4. `pair.js` exposes `POST /api/v1/pair-suggest` twice: as an inline-guarded route (`server.js:209`) — correct, but the dual mounting (router + inline) is fragile.
- **Current vs Expected Behavior**: Currently, security coverage depends on each route file remembering to opt **in**; a missed opt-in fails **open**. Expected: routers are protected **by default** — a single mount-time helper (e.g. `mountProtected(app, path, factory, { secret })`) or a post-mount audit that enumerates registered `/api/v1/*` routers and asserts middleware presence, with an explicit `PUBLIC_ROUTES` allowlist (`auth`, `/auth/github` callbacks, `languages`, `/live` socket handshake, `/health`, `/metrics`, `/api/docs`).
- **Flow**: New route file `routes/foo.js` created without auth → mounted in `server.js` → endpoint is public in production → no test or startup check catches it → data-exposing endpoint ships.
- **Root Cause / Logic**: [`server.js:192-211`](file:///d:/projects/mcoode/packages/backend/src/server.js#L192-L211) mounts each router manually; auth is applied inside each factory (`pair.js:332`, `clean.js:11`, `keys.js:21`, …) — opt-in, not enforced. Conditional guard pattern at [`android.js:25`](file:///d:/projects/mcoode/packages/backend/src/routes/android.js#L25) and [`extensions.js:149`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L149).
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js), [`packages/backend/src/routes/android.js`](file:///d:/projects/mcoode/packages/backend/src/routes/android.js), [`packages/backend/src/routes/extensions.js`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js), [`packages/backend/src/routes/languages.js`](file:///d:/projects/mcoode/packages/backend/src/routes/languages.js), [`packages/backend/src/routes/pair.js`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js)
- **Security Risk**: **MEDIUM (latent, defense-in-depth)** — no currently-exploitable hole found in the working tree; the risk is the fail-open failure mode and the missing central invariant. A future refactor that drops `{ secret }` from a mount call silently un-protects that router. Note: `android.js` `POST /devices/:id/start` spawns detached emulator processes (`android.js:44-65`) — if ever unprotected it becomes a resource-exhaustion vector; keep the AVD-id regex validation (`android.js:47`) as the second line of defense.

- **Steps to Reproduce (pattern demonstration)**: Temporarily mount any protected router as `app.use('/api/v1/x', cleanRoutes({}))` (no secret) → observe that `if (secret)` guards silently skip auth, i.e. the failure mode is silent un-protection rather than a startup error.
- **Suggested Fix / Implementation Plan**:
  1. Replace `if (secret) router.use(...)` with an unconditional `router.use(authMiddleware({ secret }))` and make `authMiddleware` **throw at construction time** when `secret` is missing (fail fast, not fail open).
  2. Add a `mountProtected()` helper (or a `ROUTE_POLICY` table: `{ path, factory, public: boolean }`) in `server.js`; mount everything through it and log a startup summary: `N protected routers, M public routers`.
  3. Add a unit test that enumerates the policy table and asserts every non-public mount applies `authMiddleware` (e.g. by checking the router's `stack` for the middleware handler).
  4. Document the public allowlist in `docs/API.md` next to each public endpoint (already partially done for `languages`).
  5. Remove the duplicate `pair-suggest` inline mount or make it the single source (avoid two code paths for one endpoint).
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Unconditional auth + fail-fast `secret` validation in `authMiddleware`
  - [ ] Central mount policy table with explicit public allowlist
  - [ ] Startup log line: protected vs public router counts
  - [ ] Test asserting all non-public mounts carry auth middleware
  - [ ] Consolidate duplicate `pair-suggest` mounts

---

# 🧩 Part B — Missing Features

## [MF-001] Session Resume / Continue — No Way to Recover a Crashed or Cap-Hit God Run

- **Description**: There is **no `--resume`/`--continue` anywhere in the CLI** (verified: no `resume` token in `packages/cli/src` outside unrelated UI hints like `replay`). If a god run hits the 25-turn subagent cap, the process crashes, or the terminal closes mid-wave, the user must re-run the whole task from scratch — already-DONE todos get re-planned and re-dispatched, re-spending the user's own API budget and re-writing files. Ironically, the **data needed for resume is already persisted**: `god.js:70-80` saves `{ plan, results, projectPath, status }` to `~/.mcode/history/*.json`, and `subagent-manager.js:824-839` `persistSession()` saves the same shape — but nothing ever **reads it back** to continue.
- **Current vs Expected Behavior**:
  - **Current**: `mcode history` lists past runs read-only (`commands/history.js:4-36`). A re-run starts from planning again; `plan()` is called fresh and `runAll()` dispatches every todo. Wave state, per-todo status, and the undo stack exist only in memory.
  - **Expected**: `mcode god --resume [sessionId]` (default: most recent session for this `projectPath`) loads the saved plan, marks already-DONE todos complete without re-dispatch, re-runs only `PENDING`/`FAILED`/`NEEDS_REVIEW` todos, and re-establishes file-lock/undo context. `mcode god --list-sessions` shows resumable runs with todo counts + status.
- **Flow (today)**: wave 3 of 5 crashes → user re-runs `mcode god "<same prompt>"` → planner produces a *slightly different* plan (non-deterministic LLM output) → DONE todos are redone (double spend, possible conflicts with already-applied edits) → risk of semantic regressions from re-applying edits over existing ones.
- **Root Cause / Logic**: Persistence exists but is **write-only and post-completion**: [`history.js:7-16`](file:///d:/projects/mcoode/packages/cli/src/core/history.js#L7-L16) `saveHistory()` has no counterpart state-loader; [`god.js:70-80`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js#L70-L80) writes the entry only **after** the run finishes (a mid-run crash saves nothing); [`subagent-manager.js:824-839`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L824-L839) likewise. No checkpointing happens between waves.
- **Affected Files**: [`packages/cli/src/commands/god.js`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js), [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js), [`packages/cli/src/core/history.js`](file:///d:/projects/mcoode/packages/cli/src/core/history.js), [`packages/cli/src/index.js`](file:///d:/projects/mcoode/packages/cli/src/index.js), [`packages/cli/src/core/orchestrator.js`](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js)
- **Impact**: **High** — direct money loss (duplicate provider spend on the user's own keys), duplicated work, and correctness risk (re-applying edits on an already-modified tree). This is the highest-value UX gap for long god runs.

- **Suggested Fix / Implementation Plan**:
  1. **Checkpoint after every wave** (inside `runAll()`’s wave loop, next to the existing per-wave hooks): write `~/.mcode/sessions/<projectId>/state.json` with `{ v: 1, sessionId, prompt, stackHint, plan, todoStatus: {id→status}, waveIndex, startedAt, updatedAt }` using the same atomic `tmp + rename` pattern already used by `CostLedger.save()` (`shared/src/index.js:77-96`) and `store.js:58-60`.
  2. Add CLI flags `--resume [sessionId]` and `--list-sessions` to the god command (`index.js:82-107`, mirroring the existing option style). On resume: load state, re-validate `plan` via `normalizePlan`/`validatePlan` (`shared/plan.js`), skip DONE todos, recompute waves with `planWaves()`/`isEligible()`.
  3. **Handle the crashed-mid-subagent case**: a todo that was `in_progress` at crash time is treated as `PENDING` on resume, but files already written by that subagent must be reconciled — reuse the existing undo stack/diff recording to show "these N changes from the interrupted subagent are already on disk: keep or revert?".
  4. Make checkpointing **crash-safe by construction**: write on wave boundaries + flush on `SIGINT` via the existing crash hooks (`core/crash-reporter.js`).
  5. Optionally let `mcode history` offer the same entry point (`mcode history --resume <file>`), but keep the primary surface on the `god` command.
  6. Tests: simulated crash mid-wave (kill after wave 2) → resume → assert only non-DONE todos dispatched and no duplicate writes to DONE todos' files.
- **Priority**: High
- **Phase**: Phase 2 (pairs naturally with MF-002 budget-abort: an aborted run should be resumable)
- **TODOs**:
  - [ ] Wave-boundary checkpoint writer (atomic, versioned `~/.mcode/sessions/<projectId>/state.json`)
  - [ ] `--resume [sessionId]` + `--list-sessions` flags in `index.js` + `godCommand`
  - [ ] Resume path in `subagent-manager.runAll()`: skip DONE, re-plan waves, re-acquire locks
  - [ ] Interrupted-subagent reconciliation prompt (keep/revert already-written changes)
  - [ ] SIGINT/crash-hook checkpoint flush
  - [ ] Tests: mid-wave crash → resume; schema-version mismatch handling
  - [ ] Docs: USER-GUIDE.md + CLI.md resume workflow

---

## [MF-002] Cost / Token Usage — Ledger Exists, But Attribution and CLI Exposure Are Missing

- **Description**: Correcting the earlier claim: `CostLedger` **does exist** (`shared/src/index.js:15-125`) and the CLI already persists it (`router.js:262-266`: `new CostLedger({ filePath: ~/.mcode/ledger.json })`, 30s autosave at `router.js:320-324`). What is missing is everything between "tokens were spent" and "the user can see and limit what they spent":
  1. **Attribution gap (bug)**: both `ledger.record()` call sites in the god pipeline — `subagent-manager.js:322-325` (normal dispatch) and `subagent-manager.js:730-733` (bugfix dispatch) — pass only `{ inputTokens, outputTokens }`. The `mode` and `cost` parameters exist in the API (`shared/src/index.js:23-41`) but are **never passed**, so the `modes` map is never populated and `spendByMode()` (`shared/src/index.js:44-46`) always returns `{}` for god runs. The per-mode cost infrastructure is effectively dead code today.
  2. **Exposure gap**: `mcode history` prints FILE/MODE/PROJECT/STATUS/STARTED only (`commands/history.js:18-36`) — no cost/tokens columns, even though saved entries already contain `results.cost`, `results.tokensIn`, `results.tokensOut` (written by `god.js:70-80` from the orchestrator summary, which spreads `metrics` from `BUILD_COMPLETE`; cost is computed at `subagent-manager.js:767-779`). `mcode doctor` shows no lifetime spend (`doctor.js` never reads the ledger).
  3. **Terminal-summary gap**: god’s end-of-run output prints `build complete — X/Y todos · duration` (`god.js:63`) with **no cost/tokens line**, even though `summary.cost`/`tokensIn`/`tokensOut` are available. (The TUI `ProcessingScreen.jsx:328-330` does show a live Cost label, and the web `WaveProgress.tsx:89` accepts per-model cost — so data exists, surface does not.)
  4. **Budget gap**: `cost.budgetPerRunUsd` defaults to `2.0` in both `DEFAULT_CONFIG` (`domains.js:141-142`) and zod `CostSchema` (`config-schema.js:16-19`), but **no code reads it** — verified by repo-wide search: the only hits are the schema/default declarations. A run never stops on budget; the setting is decorative. There is no `--max-cost` flag either (`index.js:82-107`).
- **Current vs Expected Behavior**: Currently a user on their own API keys cannot answer "kitna kharcha hua?" from the CLI without subscribing to a provider dashboard, per-tool. Expected: per-run and lifetime spend visible in `history`/`doctor`, cost line in the god summary, and an enforced budget ceiling that aborts cleanly (and — combined with MF-001 — leaves a resumable checkpoint).

- **Flow (today)**: `mcode god "..." --model openai:gpt-4o` with 12 todos × several turns each → provider bills the user's key → `ledger.json` contains only RPM/TPM rate windows (`providers` map) → `modes` stays `{}` → `mcode history` shows no cost → `mcode doctor` shows nothing → user has no idea 12 todos cost $3.80 until they open the OpenAI/OpenRouter billing page.
- **Root Cause / Logic**: attribution call sites omit the fields the ledger supports ([`subagent-manager.js:322-325`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L322-L325), [`730-733`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L730-L733)); cost is computed **only once, at the end**, from the static `RATES` table in `_emitBuildComplete` ([`subagent-manager.js:767-779`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L767-L779)) and never fed back into the ledger; display code never reads the ledger ([`commands/history.js`](file:///d:/projects/mcoode/packages/cli/src/commands/history.js), [`commands/doctor.js`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js)); budget config has no consumer ([`config-schema.js:16-19`](file:///d:/projects/mcoode/packages/cli/src/core/config-schema.js#L16-L19), [`domains.js:141-142`](file:///d:/projects/mcoode/packages/shared/src/domains.js#L141-L142)).
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js), [`packages/cli/src/core/router.js`](file:///d:/projects/mcoode/packages/cli/src/core/router.js), [`packages/shared/src/index.js`](file:///d:/projects/mcoode/packages/shared/src/index.js), [`packages/cli/src/commands/history.js`](file:///d:/projects/mcoode/packages/cli/src/commands/history.js), [`packages/cli/src/commands/doctor.js`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js), [`packages/cli/src/commands/god.js`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js), [`packages/cli/src/index.js`](file:///d:/projects/mcoode/packages/cli/src/index.js)
- **Impact**: **High for a BYO-key multi-provider CLI** — users are blind to their own spend inside the tool; no ceiling means a runaway god run can burn budget unchecked. Data needed to fix it is already captured at runtime (`res.usage` per call; verified `ledger.record` receives `res.usage.inputTokens/outputTokens` and providers already parse `usage`).
- **Suggested Fix / Implementation Plan**:
  1. **Attribution**: pass `mode` (god/wave domain) and `cost` at both call sites. Cost per call = `(inTokens/1e6)·rateIn + (outTokens/1e6)·rateOut` using the model's pricing where available (`assignment.model.costPer1kIn/Out`, populated from provider catalogs e.g. `openai-compatible.js:59-60`) and the existing `RATES` fallback table. Prefer a tiny shared helper `estimateCallCost(model, usage)` in `@mcode/shared` so CLI and backend compute identically.
  2. **`mcode history`**: add `COST` and `TOKENS` columns for god entries (read `results.cost`, `results.tokensIn/out`); add `--cost` breakdown flag that loads `~/.mcode/ledger.json` via `CostLedger.load()` + `spendByMode()` for per-mode totals. Keep `--json` shape backward compatible (additive fields only).
  3. **`mcode doctor`**: add a "Spend" section — lifetime tokens/cost, per-provider and per-mode rows from the ledger (respect the existing warn/ok status column style).
  4. **God end-of-run line**: print `cost: $X.XX · tokens: in/out` in `god.js` next to the existing duration line (suppressed by `--quiet`/`--json`, consistent with the rest of the CLI).
  5. **Budget enforcement**: `--max-cost <usd>` CLI flag (overrides config) + `cost.budgetPerRunUsd` config. Check after each completed subagent/wave in `runAll()`; when exceeded → stop dispatching new todos, mark remaining as `pending` (not failed), emit a clear toast, write the MF-001 checkpoint, exit non-zero with a "resume with `--resume`" hint. Also re-check before the integration/bugfix passes (they spend tokens too).
  6. Tests: ledger attribution per mode; budget abort mid-wave (remaining todos untouched); history cost column rendering incl. missing-cost legacy entries; `--max-cost` override precedence.
- **Priority**: High
- **Phase**: Phase 2 (enforcement) / Phase 3 (reporting polish)
- **TODOs**:
  - [ ] Pass `mode` + `cost` at `subagent-manager.js:322` and `:730` call sites
  - [ ] Shared `estimateCallCost(model, usage)` helper (prefer catalog pricing, `RATES` fallback)
  - [ ] `mcode history`: COST + TOKENS columns; `--cost` per-mode breakdown from ledger
  - [ ] `mcode doctor`: lifetime spend section (per-provider, per-mode)
  - [ ] God summary: print cost/tokens line
  - [ ] `--max-cost` flag + enforce `cost.budgetPerRunUsd` in wave loop (graceful abort)
  - [ ] Tests: attribution, budget abort, legacy history without cost, flag precedence
  - [ ] Docs: CLI.md flags + USER-GUIDE "where does my money go" section

---

## [MF-003] `mcode god --dry-run` — Plan Preview Without Any File Writes / Subagent Dispatch

- **Description**: God mode goes straight from planning to dispatching write-capable subagents. There is no non-interactive "show me the plan, touch nothing" mode. Verified options list (`index.js:82-107`): `-y/--yes`, `--stack`, `--deploy`, `--no-tests`, `-c/--concurrency`, `--watch-after`, `-m/--model`, `--verbose` — no dry-run. The interactive `confirmFn` (`god.js:36-42`) does display the plan table and asks a single approve/deny, which is a partial mitigation, but: (a) it is skipped entirely with `-y/--yes` (the CI/automation path), (b) denying throws the plan away — no way to save it, review it, edit it, and then execute, and (c) nothing in the current flow writes the plan to a file before dispatch. Precedent exists: `mcode gen --dry-run` (`index.js:140`) prints without writing.
- **Current vs Expected Behavior**:
  - **Current**: `mcode god "task" ` → plan → confirm (unless `-y`) → subagents immediately begin writing files. `mcode god "task" -y` in CI → no review at all.
  - **Expected**: `mcode god "task" --dry-run` → planner runs → **prints the todo DAG** (id, domain, title, dependsOn, files, wave assignment via `planWaves()`) + summary + estimated scope ("N todos, M files, K domains") → **writes state to the MF-001 session file** → exits 0 without dispatching any subagent or touching any file. Then `mcode god --execute-plan <sessionId|file>` (or `--resume <id>`, reusing MF-001) runs it after the user reviews/edits the plan JSON.
- **Flow (target)**: `mcode god "add billing" --dry-run` → review JSON at `~/.mcode/sessions/<projectId>/state.json` → optionally edit todos → `mcode god --resume <sessionId>` → dispatch.
- **Root Cause / Logic**: `runGod()` unconditionally proceeds from `plan()` to `runPlan()` ([`orchestrator.js:371-383`](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js#L371-L383)); no branch exists to stop after planning. `god.js` has no `dryRun` parameter ([`god.js:7`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js#L7)).
- **Affected Files**: [`packages/cli/src/index.js`](file:///d:/projects/mcoode/packages/cli/src/index.js), [`packages/cli/src/commands/god.js`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js), [`packages/cli/src/core/orchestrator.js`](file:///d:/projects/mcoode/packages/cli/src/core/orchestrator.js)
- **Impact**: **Medium (safety/trust)** — lets users validate scope and cost expectations before any write, and gives CI a plan-artifact step (`--json` + exit 0). Strongly complements MF-001 (the dry-run artifact *is* the resume checkpoint) and MF-002 (planner cost is small; execution cost is where money goes).
- **Suggested Fix / Implementation Plan**:
  1. `god --dry-run` flag → call `orchestrator.plan()` only, then render via the existing table code (factor the plan-table renderer out of the `confirmFn` in `god.js:37-40` so both paths share it), print `--json` payload `{ plan, waves, estimatedFiles }`.
  2. Persist the plan as a v1 session state file (same writer as MF-001) so the next step is just `--resume`.
  3. Add `--execute-plan <file|sessionId>` as an alias for the resume path (same loader).
  4. Guard rail: `--dry-run` must assert no `write_file`/`run_shell` tool instance is ever constructed (test: spy on `SubagentManager.runAll` to assert it is never called).
  5. Tests: dry-run performs zero dispatch and zero fs writes; plan file round-trips; edited plan is honored on resume (schema re-validated).
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] `--dry-run` flag in `index.js` + `godCommand`
  - [ ] Stop-after-planning branch in `orchestrator.runGod()`; shared plan renderer
  - [ ] Print waves via `planWaves()` + files/domains estimate; `--json` payload
  - [ ] Persist plan to session state (MF-001 writer); `--execute-plan` alias
  - [ ] Test: no subagent dispatch / no fs writes in dry-run
  - [ ] Docs: CLI.md + GOD_MODE.md dry-run workflow

---

## [MF-004] Parallel-Subagent Write Conflicts — Detection Exists, Resolution/Observability Missing

- **Description**: Correcting/refining the earlier claim: two protection layers **do exist** and were verified:
  1. **Plan-level prevention** — `resolveFileConflicts()` (`shared/plan.js:152+`) detects todos that share a target file (normalized path) and inserts `dependsOn` edges (ordering by `domainRank`), and `findCycle()` (`shared/plan.js:115+`) guards against the dependency graph it produces; `planWaves()`/`isEligible()` then keep shared-file todos out of the same wave.
  2. **Runtime serialization** — `FileLockManager` (`subagent-manager.js:27+`) implements per-file locks with an owner, a FIFO waiter queue, and a **30 s timeout** (`acquireLock` at `:41`, timeout reject at `:55-64`), plus `releaseAllFor()` on stop (`:809`).
  What is genuinely missing is the **user-facing layer**: when two agents *do* collide (plan under-specified the files, an agent writes a file outside its declared `todo.files`, or a lock timeout occurs), the failure surfaces only as a generic subagent failure/timeout with no explanation of *what* collided, *who* else touched the file, or how to resolve it — unlike a git merge-conflict UX.
- **Current vs Expected Behavior**:
  - **Current**: lock timeout → `lock timeout: could not acquire <file> for <agent> after 30000ms` (`subagent-manager.js:63`) → subagent ends `needs_review`/`failed` → summary counts it, nothing links it back to the competing writer. Two writers that serialize successfully still produce **last-writer-wins file content** with no trace that a second agent modified an already-modified file. Nothing in `mcode history`/BUILD_COMPLETE lists "file X was written by agents A and B".
  - **Expected**: (a) per-file **writer audit** in the run result (`{file → [agentId, todoId, timestamp, changeId/undoRef]}`); (b) exceptions/needs-review cards for a file touched by 2+ agents, with the diff between their versions (the undo stack already records changes, so the data exists); (c) actionable messages for lock-timeout failures ("file `src/x.js` was locked by `t2`; retry after it, or run with `--concurrency 1`"); (d) an optional interactive resolve prompt (keep A / keep B / keep both as sequential edits) for interactive runs.
- **Flow (collision example)**: planner lists `todo.files` incompletely → `t1` (frontend) and `t3` (backend) both legitimately edit `src/shared/config.ts` in the same wave → `FileLockManager` serializes them (fine) → second edit silently **overwrites** the first agent's changes to that file → integration tests may catch it, but the *cause* (a lost update) is invisible to the user; the bugfix round then "fixes" a symptom.
- **Root Cause / Logic**: audit/trace information is produced (undo stack entries, lock events) but never aggregated into a per-file conflict report; lock-timeout errors are not classified as *conflict* failures. See [`subagent-manager.js:27-64`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js#L27-L64) (locks), [`plan.js:152-180`](file:///d:/projects/mcoode/packages/shared/src/plan.js#L152-L180) (plan-level ordering), [`plan.js:115-130`](file:///d:/projects/mcoode/packages/shared/src/plan.js#L115-L130) (cycle guard).
- **Affected Files**: [`packages/cli/src/core/subagent-manager.js`](file:///d:/projects/mcoode/packages/cli/src/core/subagent-manager.js), [`packages/shared/src/plan.js`](file:///d:/projects/mcoode/packages/shared/src/plan.js), [`packages/cli/src/commands/god.js`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js), [`packages/web/src/components/ide/WaveProgress.tsx`](file:///d:/projects/mcoode/packages/web/src/components/ide/WaveProgress.tsx)

- **Impact**: **Medium-High (data correctness)** — silent lost updates destroy trust in parallel execution; the fix is mostly *surfacing* data already recorded, plus a small classification change for lock-timeout failures.
- **Suggested Fix / Implementation Plan**:
  1. **Writer audit map** in `SubagentManager`: record `{ file → [{agentId, todoId, ts, undoRef}] }` at every successful `write_file`/`edit_file` (the undo stack hooks already fire per change — piggyback there, don't duplicate). Include it in the BUILD_COMPLETE payload and `mcode history` entry.
  2. **Conflict report**: after each wave, flag files with 2+ distinct writers; render an "overlapping writes" section in the god summary (and as `TOAST` events for the live dashboard). Where undo refs exist, show a compact diff (reuse the existing diff formatter used by `/undo`).
  3. **Classify lock timeouts as conflicts**: in `FileLockManager.acquireLock` timeout rejection, include `{ lockedBy, filePath }` (the map already stores `ownerId` at `:44-51`) and surface a dedicated error kind so `git`-style guidance can follow ("serialized by `t2`; use `--concurrency 1` or add the file to the todo's `files` to force ordering").
  4. **Planner hardening (cheap win)**: after `resolveFileConflicts()`, log a warning when a todo declares **no** `files` but its domain typically writes (planner output quality is the root risk; see GOD-002 schema validation in `02-GOD-MODE-SUBAGENTS-bugs.md`).
  5. **Interactive resolution** (optional, Phase 4): when a lost update is detected and undo refs are intact, offer `keep A / keep B / apply A then B`.
  6. Tests: two subagents write the same file in one wave → assert writer-audit map has both and the report flags the file; lock timeout produces a classified conflict error with `lockedBy`.
- **Priority**: Medium-High
- **Phase**: Phase 3 (audit + surfacing) / Phase 4 (interactive resolution)
- **TODOs**:
  - [ ] Per-file writer audit map (piggyback on undo-stack hooks)
  - [ ] Post-wave overlap detection + summary/toast reporting with diffs
  - [ ] Lock-timeout error classification incl. `lockedBy`
  - [ ] Planner warning for todos with empty `files`
  - [ ] Include overlap report in BUILD_COMPLETE + history entries
  - [ ] Tests: same-wave double writer; timeout classification
  - [ ] (Phase 4) interactive keep-A/keep-B/sequential-apply resolution

---

## [MF-005] Remote Plugin Registry — `mcode add` Is Bundled-Only, No Install/Upgrade Path

- **Description**: `mcode add <plugin>` reads the **static, in-repo** `PLUGIN_REGISTRY` (`commands/add.js:3,6` → `shared/src/plugins.js:7`); unknown names are rejected with a list of bundled names. There is no remote fetch, no versioning, no update path. The separate in-memory registry in `core/plugins.js:5-32` (`registerPlugin`/`widgets`/`commands` Maps) is a **programmatic** extension point with no distribution mechanism either. Meanwhile the backend already exposes a publish side (`routes/plugins.js` — public directory + publish with semver and SSRF-checked URL, per `docs/openapi.json:92-95`) and the web UI tells users to `mcode add <name>` (`.tsx` Plugins tab) — so the docs/UX promise an install story the CLI cannot fulfill beyond the bundled list.
- **Current vs Expected Behavior**:
  - **Current**: plugin set is whatever shipped in the installed `mcode-cli` version. Third parties cannot publish; users cannot install; UI hints point at a command that only accepts bundled names.
  - **Expected**: `mcode add <name>[@version]` resolves against a **remote registry** (or `--from <url>` / `--registry <url>` override), verifies integrity, merges its config, and records the source for `mcode plugin upgrade` / `plugin list --installed` to work. Registry entries should carry `{ name, version, category, desc, config, integrity, signature, minCliVersion }`.
- **Flow (target)**: `mcode add db-tools@1.2.0` → fetch `registry.json` (cache TTL) → find entry → download artifact → verify sha256 (+ optional sig) → merge config via existing `addCommand` path (`add.js:11-17`) → validate merged config against `ConfigSchema` (ties into MF-007) → write provenance to `~/.mcode/config.json` (`plugins.<name>.source`) → `ok('installed')`.
- **Root Cause / Logic**: registry is a compile-time constant (`shared/src/plugins.js:7-77`), consumed synchronously by `addCommand` ([`commands/add.js:5-19`](file:///d:/projects/mcoode/packages/cli/src/commands/add.js#L5-L19)); no network module exists in the install path (verified: no fetch in `add.js`). Backend publish route exists but the CLI never talks to it.
- **Affected Files**: [`packages/cli/src/commands/add.js`](file:///d:/projects/mcoode/packages/cli/src/commands/add.js), [`packages/shared/src/plugins.js`](file:///d:/projects/mcoode/packages/shared/src/plugins.js), [`packages/cli/src/core/plugins.js`](file:///d:/projects/mcoode/packages/cli/src/core/plugins.js), [`packages/backend/src/routes/plugins.js`](file:///d:/projects/mcoode/packages/backend/src/routes/plugins.js)
- **Impact**: **Medium (feature gap vs. docs promise)** — `mcode add` works only for the bundled catalog; the marketplace story is backend/web-only. Security note for the implementation: a remote registry is **untrusted input** — plugins today are config merges (lower risk than code execution), so the design should stay config-only, verify integrity, and never auto-execute downloaded code at install time.
- **Suggested Fix / Implementation Plan**:
  1. Define registry schema (`registry.schema.json`) + host a `registry.json` (GitHub raw release asset is enough to start; the backend `/api/v1/plugins` route can serve it later for private/self-hosted registries).
  2. CLI: add `--registry <url>` (config `pluginsRegistryUrl`, default = official URL), 24 h cache in `~/.mcode/cache/registry.json`, offline fallback to bundled list. `mcode add <name>[@range]` resolves semver via a tiny range matcher (avoid a new dep unless already present).
  3. Integrity: require `integrity: sha256-…` in entries; verify bytes before merge; optional detached signature (reuse `docs/CODE-SIGNING.md` conventions if applicable).
  4. Provenance + lifecycle: record `{ source, version, integrity }` under `plugins.<name>` in config; add `plugin upgrade [name]`, `plugin list --installed --json`; keep `remove/disable/enable` as-is (`add.js:21-41`).
  5. Validation: run the merged config through `ConfigSchema` before saving (see MF-007) so a malicious/broken registry entry cannot inject invalid config.
  6. Tests: resolve+install from a mocked registry (offline HTTP fixture), integrity mismatch rejection, semver selection, offline fallback, provenance upgrade flow.
  7. Docs: README/CLI.md "Installing community plugins" + publish guide for third parties (point at the backend publish route).
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Registry schema + official `registry.json` hosting decision (GitHub raw vs backend route)
  - [ ] `--registry` flag + `pluginsRegistryUrl` config + 24 h cache + offline fallback
  - [ ] `mcode add <name>[@range]` semver resolution
  - [ ] sha256 integrity verification (+ optional signature)
  - [ ] Provenance in config + `plugin upgrade` + `list --installed --json`
  - [ ] Validate merged config via `ConfigSchema` before write
  - [ ] Tests with mocked registry (success, integrity fail, offline, upgrade)
  - [ ] Docs: install + publish guides

---

## [MF-006] Hardcoded CLI Version in `doctor.js` (and `index.js`) — Version-Drift Bug

- **Description**: `doctor.js:20` pushes `['mcode version', '2.4.6', 'ok']` — a hardcoded string, and `index.js:12` does the same for `.version('2.4.6')`. Both currently match `packages/cli/package.json` (`"version": "2.4.6"`) and root `package.json` (`2.4.6`), so today the output is correct — but any future version bump that misses these lines makes `mcode doctor` and `mcode --version` **report a stale version**, which directly misleads troubleshooting (users quoting wrong versions in bug reports) and update checks.
- **Current vs Expected Behavior**:
  - **Current**: version is duplicated in 3+ places (2 hardcoded + package.json). The release process relies on remembering to edit source files.
  - **Expected**: single source of truth. The backend already models the fix: `GET /api/v1/version` reads its `package.json` at runtime with a fallback path (`server.js:213-222`). Apply the same pattern CLI-side (safe ESM approach: `createRequire(import.meta.url)('../package.json').version` or `JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))` — avoid relying on import-assertion/attribute syntax whose spelling differs across Node versions).
- **Flow (bug)**: bump `packages/cli/package.json` to `2.5.0` → `npm publish` → `mcode doctor` still prints `mcode version 2.4.6` → user files a bug against the wrong version.
- **Root Cause / Logic**: [`doctor.js:20`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js#L20); [`index.js:12`](file:///d:/projects/mcoode/packages/cli/src/index.js#L12). No test guards the values against `package.json`.
- **Affected Files**: [`packages/cli/src/commands/doctor.js`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js), [`packages/cli/src/index.js`](file:///d:/projects/mcoode/packages/cli/src/index.js), [`packages/cli/package.json`](file:///d:/projects/mcoode/packages/cli/package.json)
- **Suggested Fix / Implementation Plan**:
  1. Add `export const CLI_VERSION` in a small module (e.g. `packages/cli/src/core/version.js`) that reads `packages/cli/package.json` once via `createRequire`, with `'0.0.0-unknown'` fallback + a one-time stderr debug note on failure.
  2. Use it in `doctor.js` and `index.js` (`.version(CLI_VERSION)`).
  3. Add a unit test asserting `CLI_VERSION === require('../../package.json').version` so a mismatch fails CI.
  4. Optional CI guard: grep `src/` for semver literals (allowlist intentional fixtures).
  5. Check `checkForUpdate(currentVersion)` call sites to pass `CLI_VERSION` from the same source (avoid a third copy).
- **Priority**: Low
- **Phase**: Phase 4
- **TODOs**:
  - [ ] `core/version.js` single-source `CLI_VERSION`
  - [ ] Replace hardcoded values in `doctor.js:20` and `index.js:12`
  - [ ] Test: `CLI_VERSION` matches `packages/cli/package.json`
  - [ ] Audit `update-check.js` call sites for a duplicated version argument
  - [ ] Optional CI guard against hardcoded semver literals

---

## [MF-007] Config Validation Errors Are Silently Swallowed — Typo → Entire Config Ignored

> **✅ Status (2026-09-28, working tree): FIXED — implemented + tested.**
> `loadConfig()` now splits parse vs schema failures: invalid JSON → warn + fall back to last-known-good
> cache; schema errors → warn the zod issue list once per process (warn-once, `warnOnce()`/`getLastConfigError()`)
> and **keep the last-known-good config** instead of emptying it. `saveConfig()` validates the merged object
> **before writing** and refuses invalid configs. `mcode doctor` shows a `Config schema` row (valid /
> invalid (N issues) / not checked); `mcode config validate` (subcommand **and** `--validate` flag) exits 1
> on invalid configs for CI/pre-commit. Tests: 5 cases in `packages/cli/tests/config-validation.test.js`
> (schema keep-last-good, parse keep-last-good, save-reject, validate exit codes, doctor row) — all passing;
> CLI rebuilt and smoke-tested end-to-end. Remaining: USER-GUIDE docs section.

- **Description**: Correcting the earlier claim: schema validation **exists** — zod `ConfigSchema` + `validateConfig()` in `core/config-schema.js:37-74`, wired into `loadConfig()` (`store.js:4,42`). The real bug is the failure handling: `store.js:40-46` wraps JSON parsing **and** schema validation in one `try`, and the `catch` sets `cache = {}`. So a schema-invalid config (typo, wrong type, bad enum) is silently replaced by an **empty** config — the user's model pins, `disabledProviders`, `cost.budgetPerRunUsd`, watch settings, `backend.cliSecret`, etc. all silently stop applying, with zero warning. `mcode doctor` reports only `Config: present` (`doctor.js:21`), never "valid/invalid".
- **Current vs Expected Behavior**:
  - **Current**: `{ "cost": { "budgetPerRunUsd": "5usd" }, "concurrency": "many" }` → `validateConfig` throws → `catch { cache = {} }` → CLI silently runs with defaults. Nothing anywhere tells the user their config is broken.
  - **Expected**: JSON parse errors and schema errors are distinguished; schema errors keep the **last-known-good** config and print the zod issue list once to stderr (`cost.budgetPerRunUsd: Expected number, received string`); `mcode doctor` surfaces `Config schema: invalid (2 issues)` with warn status; `saveConfig` validates the merged result before writing.
- **Flow (bug)**: user hand-edits `~/.mcode/config.json` → adds a typo (`"maxTurnsPerSubagent": "twentyfive"`) → every subsequent `mcode god` silently ignores **all** config, including unrelated valid keys → user blames the model/CLI for "not respecting settings".
- **Root Cause / Logic**: [`store.js:40-46`](file:///d:/projects/mcoode/packages/cli/src/core/store.js#L40-L46) — single catch-all swallow; [`doctor.js:21`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js#L21) only checks presence; `saveConfig` (`store.js:51-60`) writes `patch` merged over a possibly already-emptied cache.
- **Affected Files**: [`packages/cli/src/core/store.js`](file:///d:/projects/mcoode/packages/cli/src/core/store.js), [`packages/cli/src/core/config-schema.js`](file:///d:/projects/mcoode/packages/cli/src/core/config-schema.js), [`packages/cli/src/commands/doctor.js`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js), [`packages/cli/src/commands/config.js`](file:///d:/projects/mcoode/packages/cli/src/commands/config.js)
- **Suggested Fix / Implementation Plan**:
  1. Split the `try`: JSON parse failure → loud warning ("config.json is not valid JSON") + fall back to `{}`; `validateConfig` failure → warn the zod issue list (paths + expected/received) and keep the **last cached good** config when available, else `{}`.
  2. Warn **once per process** (avoid spamming every command; `store.js` already tracks `cacheLoadedAt`/`cacheMtimeMs`).
  3. `mcode doctor`: add a `Config schema` row — `valid` / `invalid (N issues)` / `not checked (missing)` — calling `validateConfig` directly; include issue paths in `--json`.
  4. `saveConfig`: validate the merged object before writing (belt-and-braces against bad programmatic writes); add `mcode config validate` (exit 1 on invalid) for CI/pre-commit use.
  5. Tests: invalid type → warning + last-good retained; invalid JSON → warning + `{}`; doctor row reflects both cases; `config validate` exit codes.
- **Priority**: Low-Medium (small fix, high troubleshooting value — silent wrong behavior is the worst failure class)
- **Phase**: Phase 2 (small, high-value)
- **TODOs**:
  - [x] Split parse vs schema error handling in `loadConfig()` (loud warnings, keep last-good)
  - [x] Warn-once-per-process + zod issue formatting
  - [x] `doctor` config-schema row (valid/invalid + issue count; `--json` detail)
  - [x] `mcode config validate` subcommand + `--validate` flag + validate-before-write in `saveConfig`
  - [x] Tests: type error, JSON error, doctor row, exit codes (5 cases in `packages/cli/tests/config-validation.test.js`)
  - [ ] Docs: USER-GUIDE configuration section (what happens on invalid config)

---

# 📊 Priority & Sequencing

## Severity / Priority Summary

| ID | Item | Type | Severity | Phase |
|---|---|---|---|---|
| **BSEC-001** | JWT secret reused as API-key encryption KDF input | Security — key management | **Critical** | 1 (EMERGENCY) |
| **MF-001** | Session resume / continue for god runs | Missing feature | **High** | 2 |
| **MF-002** | Cost attribution + CLI exposure + budget enforcement | Unexposed feature + attribution bug | **High** | 2 (enforce) / 3 (report) |
| **BSEC-002** | Fail-open auth pattern / no central route policy | Security hygiene | Medium | 2 |
| **MF-004** | Parallel-write conflict observability & resolution | Missing UX (locking exists) | Medium-High | 3 (audit) / 4 (UX) |
| **MF-003** | `mcode god --dry-run` | Missing feature | Medium | 3 |
| **MF-005** | Remote plugin registry for `mcode add` | Feature gap vs docs promise | Medium | 3 |
| **MF-007** | Config validation silently swallowed | Bug (silent misbehavior) | Low-Medium | 2 |
| **MF-006** | Hardcoded version in `doctor.js` + `index.js` | Bug (drift) | Low | 4 |

## Dependencies Between Items

- **MF-003 → MF-001**: `--dry-run` writes the same session-state file that `--resume` reads — build the checkpoint writer once (MF-001), then dry-run is a thin branch.
- **MF-002 → MF-001**: budget abort should leave a resumable checkpoint; without MF-001 an aborted run loses the remaining todos.
- **MF-005 → MF-007**: registry-installed plugin config must be schema-validated (MF-007 fix) before merge, else a bad registry entry silently empties the whole config.
- **MF-004 → MF-002**: the overlap report rides in the same BUILD_COMPLETE payload / summary rendering as the cost line — do them in one pass if convenient.
- **BSEC-001 → deployment ordering**: freeze `JWT_SECRET` rotation until the envelope-encryption migration ships (rotating first destroys every stored key).

## Recommended Implementation Order

1. **Phase 1 (immediate)**: BSEC-001 — dedicated encryption secret + envelope encryption + migration script (**code complete** in working tree: v2 envelope, dual-read keyring, env validation, `.env.example`, 17 tests (10 pair.test.js + 7 migrate-key-enc.test.js), migration script + SECURITY.md runbook done; ops remaining: deploy with `API_KEY_ENCRYPTION_SECRET` set + freeze `JWT_SECRET` rotation until lazy re-encrypt/migration runs). Communicate the JWT-rotation freeze.
2. **Phase 2 (foundation)**: MF-007 (small loud-failure fix) → MF-001 (checkpoint + resume) → MF-002 items 1–5 minus reporting polish (attribution + `--max-cost` enforcement, integrated with checkpoints) → BSEC-002 (fail-closed auth + route-policy test).
3. **Phase 3 (visibility)**: MF-002 reporting polish (`history`/`doctor`/god summary) → MF-003 (`--dry-run` + `--execute-plan`) → MF-004 audit + lock-timeout classification → MF-005 registry (MVP: GitHub-hosted JSON + integrity check).
4. **Phase 4 (polish)**: MF-004 interactive conflict resolution → MF-006 version single-sourcing → docs sweep (`CLI.md`, `USER-GUIDE.md`, `GOD_MODE.md`, `SECURITY.md`).

---

# ✅ Consolidated TODO Tracker

> Full per-finding checklists live in each section above; this is the roll-up to work from.

## Phase 1 — Emergency (Security)

- [x] **BSEC-001** Add `API_KEY_ENCRYPTION_SECRET` env + production fail-fast + `.env.example` (envValidator fail-closes on `encSecret === JWT_SECRET` in production + warns when missing/short; startup warn in `server.js`; `.env.example` documents generation + rotation)
- [x] **BSEC-001** v2 envelope encryption (per-user random salt, `keyId` header, AAD=userId) — `MCCODEK2:` format in `secret-enc.js`
- [x] **BSEC-001** Dual-read keyring + lazy re-encrypt (v1 `MCCODEKEY:` + `jwt1` fallback read; lazy re-encrypt on `GET /keys`)
- [x] **BSEC-001** Migration script with round-trip verification + backups (bulk re-encrypt + backup dump before cutover) — `scripts/migrate-key-encryption.js`, two-pass collect→backup→write, 7 tests
- [x] **BSEC-001** Replace silent decrypt-failure catches with structured `KEY_DECRYPT_FAILED` warnings (`keys.js` GET + models paths; `KEY_ROTATION_FAILED` for re-encrypt errors)
- [x] **BSEC-001** Tests: secret isolation, rotation dual-read, blob-swap rejection (10 cases in `packages/backend/tests/pair.test.js`)
- [x] **BSEC-001** Freeze `JWT_SECRET` rotation until migration deployed; document runbooks in SECURITY.md (ops task) — runbooks + ⛔ freeze documented in `SECURITY.md`

## Phase 2 — Foundation (Resume, Cost Enforcement, Fail-Closed, Config)

- [ ] **MF-001** Wave-boundary checkpoint writer (atomic, versioned `~/.mcode/sessions/<projectId>/state.json`)
- [ ] **MF-001** `--resume [sessionId]` + `--list-sessions` flags; skip DONE todos on resume
- [ ] **MF-001** Interrupted-subagent reconciliation (keep/revert already-written changes) + SIGINT flush
- [ ] **MF-001** Tests: mid-wave crash → resume; no duplicate dispatch/writes
- [ ] **MF-002** Pass `mode` + `cost` at `subagent-manager.js:322` & `:730`; shared `estimateCallCost()` helper
- [ ] **MF-002** `--max-cost <usd>` + enforce `cost.budgetPerRunUsd` in wave loop (graceful abort → checkpoint → resume hint)
- [ ] **MF-002** Tests: attribution per mode; budget abort leaves remaining todos pending
- [ ] **BSEC-002** Unconditional auth + fail-fast `secret`; central `ROUTE_POLICY` with public allowlist
- [ ] **BSEC-002** Startup log of protected/public router counts + test asserting non-public mounts carry auth
- [x] **MF-007** Split parse vs schema errors in `loadConfig()` (loud warning, keep last-good, warn-once)
- [x] **MF-007** `doctor` config-schema row + `mcode config validate` + validate-before-write

## Phase 3 — Visibility (Cost reporting, Dry-run, Conflicts, Registry)

- [ ] **MF-002** `mcode history` COST/TOKENS columns + `--cost` per-mode breakdown from `ledger.json`
- [ ] **MF-002** `mcode doctor` lifetime spend section; god summary cost/tokens line
- [ ] **MF-003** `--dry-run`: stop-after-planning branch, shared plan renderer, waves + files/domains estimate
- [ ] **MF-003** Persist previewed plan to session state; `--execute-plan <file|sessionId>`; zero-dispatch test
- [ ] **MF-004** Per-file writer audit map (piggyback undo hooks) + post-wave overlap report with diffs
- [ ] **MF-004** Lock-timeout error classification incl. `lockedBy`; planner warning for empty `todo.files`
- [ ] **MF-005** Registry schema + hosted `registry.json` + `--registry` flag + cache/offline fallback
- [ ] **MF-005** Integrity verification (sha256) + provenance in config + `plugin upgrade`
- [ ] **MF-005** Validate merged plugin config via `ConfigSchema` before write (needs MF-007)

## Phase 4 — Polish (Conflicts UX, Version, Docs)

- [ ] **MF-004** Interactive keep-A / keep-B / sequential-apply resolution for lost updates
- [ ] **MF-006** `core/version.js` single-source `CLI_VERSION`; replace `doctor.js:20` + `index.js:12`
- [ ] **MF-006** Test: `CLI_VERSION === packages/cli/package.json`; optional CI semver-literal guard
- [ ] Docs: `docs/CLI.md` (new flags), `docs/USER-GUIDE.md` (resume/cost/config), `GOD_MODE.md` (dry-run, conflict report), `SECURITY.md` (key rotation runbooks)

---

## Scope Notes

- **Out of scope on purpose**: this file documents only what was verified live in this repository. Items
  already remediated (route auth, vault passphrase, shell allowlist, path sandboxing) are recorded in the
  corrections table as **fixed** — do not re-open them without checking `git log` first.
- **Relationship to `audit-reports/`**: those reports (01–20 + `MASTER_SUMMARY.md`) are the historical
  full-codebase audit. This file is a **delta**: verified current-state security findings + missing
  features, with earlier claims explicitly corrected. Where audits overlap (e.g. GOD-002 planner schema
  validation in `02-GOD-MODE-SUBAGENTS-bugs.md`, GOD-008 file-conflict chaining), findings are referenced
  rather than duplicated.
- **Maintenance**: when an item here is fixed, tick its checkbox **and** update the corrections table so
  this file stays an accurate snapshot instead of accumulating stale claims.
- **Suggested location going forward**: move this file into `audit-reports/` as
  `21-DELTA-backend-security-and-missing-features.md` once the 01/02 companion files land, so the report
  series stays in one folder.

<!-- END OF FILE -->
