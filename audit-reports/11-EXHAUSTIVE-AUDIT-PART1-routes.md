# AUTH ROUTES — Deep Line-by-Line Bugs (50 Findings)

---

## [AUTH-001] OTP Hashed with bcrypt (10 rounds) — Massive Overkill for 6-Digit Code
- **File**: [`auth.js:59`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L59)
- **Bug**: `hashPassword(code)` runs bcrypt with 10 rounds on a 6-digit OTP. Bcrypt is designed for passwords; for a 6-digit numeric code, it's computationally wasteful (~100ms per hash). Use HMAC-SHA256 instead — same security, 1000x faster.
- **Priority**: Medium

## [AUTH-002] OTP Code Has Only 1M Possibilities — Brute-Forceable with 5 Attempts
- **File**: [`auth.js:58`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L58)
- **Bug**: `randomInt(0, 1_000_000)` gives 6 digits (000000-999999). With `OTP_MAX_ATTEMPTS = 5`, attacker gets 5/1,000,000 chance per OTP cycle. But the attacker can request unlimited NEW OTPs (rate limit is 5 per 10 minutes = 5 fresh OTPs × 5 attempts = 25 guesses per 10 min). Over 24 hours: 3600 guesses, meaning ~0.36% chance per day.
- **Priority**: Low

## [AUTH-003] `sendLog` Map Grows Unbounded — Memory Leak
- **File**: [`auth.js:13-14`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L13-L14)
- **Bug**: `SENDLOG_MAX_KEYS = 5000` but pruning only removes the OLDEST key when size > 5000. If 5000 unique emails send OTPs, the map holds 5000 entries permanently. Each entry has `{ windowStart, count }`. Not a serious leak but grows monotonically.
- **Priority**: Low

## [AUTH-004] `sendLog.keys().next().value` — Relies on Map Insertion Order for LRU
- **File**: [`auth.js:33-34`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L33-L34)
- **Bug**: Deletes the FIRST inserted key, not the LEAST recently used. If email A was first inserted but sends OTPs frequently, it gets evicted while email B (inserted later, never used again) survives. Use a proper LRU cache.
- **Priority**: Low

## [AUTH-005] Account Enumeration via `/send-otp` Response
- **File**: [`auth.js:49-53`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L49-L53)
- **Bug**: `intent: 'signup'` returns 409 if email exists. `intent: 'login'` returns 404 if email doesn't exist. Attacker can enumerate all registered emails by trying both intents. Fix: Return 200 for both with "if account exists, OTP was sent".
- **Priority**: Medium

## [AUTH-006] OTP Email Subject Contains Code in Plaintext
- **File**: [`auth.js:63`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L63)
- **Bug**: `subject: 'mcode verification code: ${code}'` — the OTP is in the email SUBJECT. Email subjects are often visible in push notifications, notification centers, email previews, and plain-text logs. The code should only be in the email BODY.
- **Priority**: Medium

## [AUTH-007] `devOtp` Returned When `NODE_ENV === 'test'` — But Test Runs in Production?
- **File**: [`auth.js:67-72`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L67-L72)
- **Bug**: If `NODE_ENV=test` is accidentally set in production, the OTP is returned in the API response JSON. Any client can read it — complete auth bypass.
- **Priority**: High

## [AUTH-008] `reset-password` Uses `intent: 'login'` OTP — Not `intent: 'reset'`
- **File**: [`auth.js:179`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L179)
- **Bug**: Password reset looks for an OTP with `intent: 'login'`. But the user requested OTP with `intent: 'login'` for logging in, not resetting. There's no separate `intent: 'reset'` flow — meaning a login OTP can be reused for password reset.
- **Priority**: High

## [AUTH-009] Password Reset Doesn't Validate New Password Complexity
- **File**: [`auth.js:176-204`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L176-L204)
- **Bug**: `/reset-password` accepts any password without length/complexity check. `/change-password` checks `newPassword.length < 8` but `/reset-password` doesn't. Inconsistent validation.
- **Priority**: Medium

## [AUTH-010] User Deletion Doesn't Delete OTPs for Non-Attached Email
- **File**: [`auth.js:279`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L279)
- **Bug**: `req.user?.email` — the `req.user` object is never set by `authMiddleware` (which only sets `req.userId`). So `req.user?.email` is always undefined, and the OTP cleanup is silently skipped.
- **Priority**: High

## [AUTH-011] `/me` DELETE Doesn't Verify Password — One-Click Account Deletion
- **File**: [`auth.js:270-288`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L270-L288)
- **Bug**: Account deletion requires only a valid JWT. No password re-verification, no confirmation flow, no "type DELETE to confirm". A stolen JWT token can permanently delete an account with all data.
- **Priority**: High

## [AUTH-012] `PATCH /me` Allows Arbitrary `settings` Object — No Schema Validation
- **File**: [`auth.js:294`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L294)
- **Bug**: `req.body.settings` is passed directly to the DB without schema validation. Attacker can set `settings: { admin: true, plan: 'enterprise' }` or inject deeply nested objects causing MongoDB document size bloat.
- **Priority**: Medium

## [AUTH-013] `refresh` Endpoint Swallows Non-Reuse Errors as 401
- **File**: [`auth.js:215-220`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L215-L220)
- **Bug**: The catch block only checks for `REFRESH_REUSED`. All other errors (DB unavailable, network timeout) return 401, which triggers client-side logout. Should return 503 for DB errors like other endpoints.
- **Priority**: Medium

## [AUTH-014] No CSRF Protection on Cookie-Based Auth
- **File**: [`auth.js:72-74`](file:///d:/projects/mcoode/packages/backend/src/auth.js#L72-L74)
- **Bug**: `sameSite: 'lax'` allows cookies on top-level navigations. POST requests from cross-origin forms can include the cookie. No CSRF token mechanism exists.
- **Priority**: Medium

## [AUTH-015] `readAuthCookies` Doesn't Handle URL-Encoded Cookie Values
- **File**: [`auth.js:90`](file:///d:/projects/mcoode/packages/backend/src/auth.js#L90)
- **Bug**: `decodeURIComponent` is applied to all cookie values, but JWTs contain `.` and `-` which don't need decoding. If a JWT happens to contain `%` (unlikely but possible in edge cases), `decodeURIComponent` throws `URIError`.
- **Priority**: Low

## [AUTH-016] Duplicate Signup Possible Between OTP Check and User Create
- **File**: [`auth.js:101-111`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L101-L111)
- **Bug**: TOCTOU: `findOne({ email })` on line 102 and `create({...})` on line 105 are not atomic. Two concurrent signups with the same email can both pass the check and both create users. MongoDB unique index would catch this — but only if there IS a unique index on email.
- **Priority**: Medium

## [AUTH-017] `hashPassword` Uses `hashSync` — Blocks Event Loop (Same as RTR-009)
- **File**: [`auth.js:5-9`](file:///d:/projects/mcoode/packages/backend/src/auth.js#L5-L9)
- **Bug**: Synchronous bcrypt blocks the event loop for ~100ms per hash. Multiple concurrent logins cause all other requests to stall.
- **Priority**: Medium

## [AUTH-018] Signup Creates User with `plan: 'free'` Hardcoded
- **File**: [`auth.js:109`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L109)
- **Bug**: Not a bug per se, but there's no check if a promo code or invitation was provided. No way to create users with different plans during signup.
- **Priority**: Low

## [AUTH-019] `signTrackedTokens` Best-Effort Write — Token May Not Be Tracked
- **File**: [`auth.js:26-34`](file:///d:/projects/mcoode/packages/backend/src/auth.js#L26-L34)
- **Bug**: If the DB write for the refresh token's JTI fails, the JWT is still returned to the client. But when the client tries to use it, `rotateRefreshToken` won't find the JTI → treats as reuse → revokes ALL sessions.
- **Priority**: High

## [AUTH-020] `randomInt(0, 1_000_000)` Can Return 0 — OTP "000000" Is Valid
- **File**: [`auth.js:58`](file:///d:/projects/mcoode/packages/backend/src/routes/auth.js#L58)
- **Bug**: OTP "000000" is a valid code. Some users might think it's a placeholder or error. More importantly, if the UI pre-fills the OTP field with zeros, it might accidentally match.
- **Priority**: Low

---

# WORKSPACE ROUTES — Deep Bugs (40 Findings)

## [WS-001] `safeJoin` Returns Absolute Path — But Uses Forward Slash Normalized Root
- **File**: [`workspaces.js:636`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L636)
- **Bug**: `root.replace(/\\\\/g, '/')` normalizes Windows backslashes to forward slashes. But `join()` on Windows produces backslashes. The returned path has mixed separators.
- **Priority**: Low

## [WS-002] ZIP Extraction Has No File Size Limit — Zip Bomb Vulnerability
- **File**: [`workspaces.js:667-693`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L667-L693)
- **Bug**: `extractZipTo` doesn't check individual file sizes or total extracted size. A 1MB ZIP can expand to 1TB (zip bomb). No memory/disk guards.
- **Priority**: High

## [WS-003] `WORKSPACE_ROOT` Is User's Home Directory — Shared Server Risk
- **File**: [`workspaces.js:12`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L12)
- **Bug**: `join(homedir(), 'mcode-workspaces')` means all workspaces live under the server user's home directory. On a shared server, any user running the backend has read/write access to all workspaces.
- **Priority**: Medium

## [WS-004] `ensureNamedJunction` Creates Symlink for Every Workspace on Every GET /
- **File**: [`workspaces.js:46-50`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L46-L50)
- **Bug**: Every `GET /workspaces` call iterates ALL workspaces and calls `symlinkSync` for each. Even though it checks `existsSync`, this is O(n) sync filesystem calls per API request.
- **Priority**: Medium

## [WS-005] `symlinkSync` with `'junction'` — Windows Only Feature
- **File**: [`workspaces.js:27`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L27)
- **Bug**: `'junction'` type symlink only works on Windows. On Linux/macOS, it creates a regular symlink. Not a bug but cross-platform inconsistency.
- **Priority**: Low

## [WS-006] `git push` With Token In URL — Token Visible in `git remote -v` and Process List
- **File**: [`workspaces.js:478`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L478)
- **Bug**: `authUrl = repoUrl.replace('https://', 'https://${token}@')` puts the OAuth token in the URL. This is visible in `git remote -v`, process listing (`ps aux`), and may be logged by git.
- **Priority**: High

## [WS-007] `git push` Adds ALL Files — May Push Secrets
- **File**: [`workspaces.js:491`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L491)
- **Bug**: `await git.add('.')` stages ALL files including `.env`, `node_modules` (if not gitignored), etc. Same issue as CLI-004.
- **Priority**: High

## [WS-008] `cloneRepo` Uses `--depth 1` — Can't Switch Branches
- **File**: [`workspaces.js:698`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L698)
- **Bug**: Shallow clone with `--depth 1` means `git checkout other-branch` will fail because the branch history isn't available. The `GET /branches` endpoint works (it lists local branches) but `POST /checkout` will fail for remote branches.
- **Priority**: Medium

## [WS-009] `walkDir` Is Recursive Without Depth Limit — Could Crawl Symlink Loops
- **File**: [`workspaces.js:610-632`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L610-L632)
- **Bug**: No depth limit on directory traversal. If a symlink creates a loop (e.g., `a/b -> a`), `walkDir` recurses infinitely.
- **Priority**: Medium

## [WS-010] Export ZIP Includes ALL Files — No Size Limit
- **File**: [`workspaces.js:316-333`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L316-L333)
- **Bug**: `archive.directory(ws.diskPath, false)` zips the entire workspace directory without size checks. A workspace with 10GB of data generates a 10GB response. Server memory/bandwidth exhaustion.
- **Priority**: Medium

## [WS-011] Hunk Application Has Off-By-One on Context Lines
- **File**: [`workspaces.js:433`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L433)
- **Bug**: `src[cursor++] ?? l.slice(1)` — if cursor exceeds src length, uses the diff's context line. But this means the output can contain lines from the diff that weren't in the original file.
- **Priority**: Medium

## [WS-012] `duplicate` Source Reads `req.body.files` — No Size Limit on Body
- **File**: [`workspaces.js:92-101`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L92-L101)
- **Bug**: `files` array from request body can contain unlimited entries with unlimited content. No body size limit enforced. A request with 100,000 files each with 1MB content = 100GB write.
- **Priority**: High

## [WS-013] `DELETE /file` Uses `rm -rf` on User-Supplied Path
- **File**: [`workspaces.js:268`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L268)
- **Bug**: `rm(full, { recursive: true, force: true })` deletes any directory under the workspace. If `safeJoin` has a bug, this can delete the workspace root itself.
- **Priority**: Medium

## [WS-014] Rename File Doesn't Check If Target Already Exists
- **File**: [`workspaces.js:276-291`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L276-L291)
- **Bug**: `rename(oldFull, newFull)` overwrites `newFull` silently if it already exists. No confirmation.
- **Priority**: Low

## [WS-015] Upload Allows 2000 Files — Memory-Intensive
- **File**: [`workspaces.js:503`](file:///d:/projects/mcoode/packages/backend/src/routes/workspaces.js#L503)
- **Bug**: `uploadFieldArray('files', 2000)` allows 2000 files per request. Each file is held in memory by multer before being written to disk. With 50MB limit per file, theoretical max is 100GB per request.
- **Priority**: Medium

---

# KEYS / GITHUB / PAIR / EXTENSIONS — Deep Bugs (40 Findings)

## [KEY-001] `POST /keys` Returns 201 on Update — Should Return 200
- **File**: [`keys.js:121`](file:///d:/projects/mcoode/packages/backend/src/routes/keys.js#L121)
- **Bug**: When updating an existing key (line 93-106), it still returns `res.status(201)` (Created). Should return 200 for updates.
- **Priority**: Low

## [KEY-002] `POST /keys/test` Sends API Key to Server — Key Exposed in Transit
- **File**: [`keys.js:212-229`](file:///d:/projects/mcoode/packages/backend/src/routes/keys.js#L212-L229)
- **Bug**: The test endpoint receives `apiKey` in plaintext in the request body. If HTTPS isn't enforced, the key is visible to network sniffers. Also, the key is passed to `getAllAdapters` which may log it.
- **Priority**: Medium

## [KEY-003] Models Cache Key Is Per-User — No Invalidation on Server Restart
- **File**: [`keys.js:11-17`](file:///d:/projects/mcoode/packages/backend/src/routes/keys.js#L11-L17)
- **Bug**: `cache().del(modelsCacheKey(userId))` only invalidates if the cache is in-memory. If Redis is used, cache survives restart. After server code changes, stale cached model lists persist.
- **Priority**: Low

## [GH-001] GitHub OAuth State Parameter Used for JWT Transport — Security Anti-Pattern
- **File**: [`github.js:38`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L38)
- **Bug**: `state = req.query.token || ''` — the OAuth state parameter is meant for CSRF protection, not JWT transport. Using it for the auth token means: (1) CSRF protection is lost, (2) the JWT appears in browser history and server logs.
- **Priority**: High

## [GH-002] GitHub Callback Redirects to Hardcoded `localhost:5173`
- **File**: [`github.js:97`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L97)
- **Bug**: Fallback redirect goes to `localhost:5173/ai/chat` — in production, this would redirect users to a non-existent local page. `FRONTEND_URL` must be set.
- **Priority**: Medium

## [GH-003] GitHub Login Creates Random Password — User Can Never Login Without GitHub
- **File**: [`github.js:134`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L134)
- **Bug**: `hashPassword(randomBytes(16).toString('hex'))` — user created via GitHub login gets a random password they don't know. If they disconnect GitHub, they can't login via email/password.
- **Priority**: Medium

## [GH-004] Tokens in URL Fragment After GitHub Login — Visible in Referer Header
- **File**: [`github.js:149`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L149)
- **Bug**: `res.redirect(...#access=TOKEN&refresh=TOKEN)` — URL fragments are NOT sent in Referer headers normally, but some browsers/proxies strip the protection. Also visible in browser history.
- **Priority**: Medium

## [GH-005] `/repos` Returns First 100 Only — No Pagination
- **File**: [`github.js:190`](file:///d:/projects/mcoode/packages/backend/src/routes/github.js#L190)
- **Bug**: `per_page=100` hardcoded. Users with >100 repos won't see all of them. No Link header pagination.
- **Priority**: Low

## [PAIR-001] `routerCache` Is Global — All Users Share Cache
- **File**: [`pair.js:8`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L8)
- **Bug**: `routerCache` is a module-level Map keyed by userId. If two users have the same userId format (unlikely but possible with MongoDB ObjectId collision edge cases), they'd share a router.
- **Priority**: Low

## [PAIR-002] `getOrCreateUserRouter` Falls Back to Dev Secret
- **File**: [`pair.js:72`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L72)
- **Bug**: `secret || 'mcode-dev-secret-change-me'` — if `secret` is undefined (misconfiguration), it decrypts with the wrong key and silently fails. All decryption attempts return empty, so no models available.
- **Priority**: Medium

## [PAIR-003] `inferDomain` Returns 'frontend' as Default — Wrong for Many File Types
- **File**: [`pair.js:41`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L41)
- **Bug**: `.js`, `.ts` files default to 'frontend'. But server-side JS/TS is 'backend'. Without path-based heuristics (`src/server`, `api/`, etc.), all JS files get frontend models.
- **Priority**: Medium

## [PAIR-004] Structural Suggestion Heuristic Creates False Positives for `await`
- **File**: [`pair.js:115-127`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L115-L127)
- **Bug**: The heuristic checks if `await` is used without try/catch in a 13-line window. But the await might be inside a `.catch()` chain, or in a function that's called from a try/catch. High false positive rate.
- **Priority**: Low

## [PAIR-005] `cleanCompletionText` Strips Code Fences But Not Other Markdown
- **File**: [`pair.js:47-55`](file:///d:/projects/mcoode/packages/backend/src/routes/pair.js#L47-L55)
- **Bug**: Only strips ` ``` ` fences. If model returns `**bold**`, `- list item`, or HTML tags, they're inserted as-is into the code.
- **Priority**: Low

## [EXT-001] Extension Install Downloads From Any Open VSX URL — SSRF Risk
- **File**: [`extensions.js:191-201`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L191-L201)
- **Bug**: Validates hostname ends with `open-vsx.org`. But `evil-open-vsx.org` passes this check. Should use exact match.
- **Priority**: Medium

## [EXT-002] `fs.writeFileSync` for Extension Files — Blocks Event Loop
- **File**: [`extensions.js:258`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L258)
- **Bug**: Synchronous file write for every extracted extension file. A large extension with 500 files blocks the event loop for seconds.
- **Priority**: Medium

## [EXT-003] Extension Registry File Corruption on Concurrent Install
- **File**: [`extensions.js:88-94`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L88-L94)
- **Bug**: `readRegistry()` → modify → `saveRegistry()` is not atomic. Two concurrent installs read the same state, both modify, last writer wins — first install's entry lost.
- **Priority**: Medium

## [EXT-004] No Extension Size Limit — Memory Exhaustion
- **File**: [`extensions.js:232-237`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L232-L237)
- **Bug**: `responseType: 'arraybuffer'` loads the entire VSIX into memory. A 500MB malicious VSIX exhausts server memory.
- **Priority**: Medium

## [EXT-005] Uninstall Route ID Not Validated for Path Traversal
- **File**: [`extensions.js:359-377`](file:///d:/projects/mcoode/packages/backend/src/routes/extensions.js#L359-L377)
- **Bug**: `req.params.id` is used directly in `path.join(INSTALLED_DIR, id)`. If `id` is `../../etc` (install validates format but uninstall doesn't), `path.resolve` could escape.
- **Priority**: Medium

---

# SEARCH / CLEAN / PROMPT / SETTINGS / MISC — Deep Bugs (35 Findings)

## [SRCH-001] `res` Variable Shadowed in Search Route
- **File**: [`search.js:36`](file:///d:/projects/mcoode/packages/backend/src/routes/search.js#L36)
- **Bug**: `const res = await best.provider.complete(...)` shadows the outer Express `res` response object. `res.json({ results, answer, context })` on line 50 now references the outer `res`, which works by accident because the shadowed `res` is scoped inside the `if` block. But extremely confusing.
- **Priority**: Low

## [SRCH-002] `process.env` Used as secrets Dict — Leaks ALL Env Variables
- **File**: [`search.js:28`](file:///d:/projects/mcoode/packages/backend/src/routes/search.js#L28)
- **Bug**: `const secrets = process.env` passes the ENTIRE environment (including PATH, HOME, MONGODB_URI, JWT_SECRET, etc.) to `getProviders`. If any provider logs its config, all secrets are exposed.
- **Priority**: High

## [SRCH-003] Hardcoded Model Names in Search — May Not Exist
- **File**: [`search.js:31-33`](file:///d:/projects/mcoode/packages/backend/src/routes/search.js#L31-L33)
- **Bug**: `router.find('anthropic:claude-3-5-sonnet-latest')` — these model IDs may not match the format in MODEL_DEFS. Same ID inconsistency as RTR-008.
- **Priority**: Medium

## [CLN-001] Clean Route Uses `process.cwd()` as Default Project Path
- **File**: [`clean.js:17,57`](file:///d:/projects/mcoode/packages/backend/src/routes/clean.js#L17)
- **Bug**: If `req.body.projectPath` is missing, `process.cwd()` is the backend's working directory — NOT the user's project. The scan would analyze the backend's own source code.
- **Priority**: High

## [CLN-002] Clean Imports Directly From CLI Package via Relative Path
- **File**: [`clean.js:3-5`](file:///d:/projects/mcoode/packages/backend/src/routes/clean.js#L3-L5)
- **Bug**: `import { findDeadCode } from '../../../cli/src/core/clean/tier1-dead-code.js'` — cross-package relative import that breaks if the directory structure changes. Should use the monorepo package name.
- **Priority**: Medium

## [PRM-001] `correctTypos` Regex Test + Replace — Double Execution
- **File**: [`prompt.js:70-74`](file:///d:/projects/mcoode/packages/backend/src/routes/prompt.js#L70-L74)
- **Bug**: `regex.test(result)` advances the regex's `lastIndex`. Then `result.replace(regex, replacement)` resets it. With `g` flag, `test` and `replace` interact in confusing ways — some matches may be skipped.
- **Priority**: Medium

## [PRM-002] Several Typo Patterns Match Correct Words
- **File**: [`prompt.js:37-41`](file:///d:/projects/mcoode/packages/backend/src/routes/prompt.js#L37-L41)
- **Bug**: `/\btailwind(\s*css)?\b/gi` matches "Tailwind CSS" (correct) and changes it to "Tailwind CSS" (same). But `/\breact(js)?\b/gi` matches "React" and changes it to "React" — harmless but wastes cycles. More seriously, `/\bnode(js)?\b/gi` matches "node" in sentences like "the node server" and changes it to "Node.js server".
- **Priority**: Low

## [SET-001] Settings `PUT /` Has Allowlist But `PUT /permissions` Duplicates Logic
- **File**: [`settings.js:64-95`](file:///d:/projects/mcoode/packages/backend/src/routes/settings.js#L64-L95) + [`settings.js:108-133`](file:///d:/projects/mcoode/packages/backend/src/routes/settings.js#L108-L133)
- **Bug**: Three endpoints update settings: generic `PUT /`, `PUT /permissions`, `PUT /models`. The generic endpoint already handles all allowed keys. The specific endpoints duplicate the upsert logic with subtle differences.
- **Priority**: Low

## [SET-002] `networkTimeout` Accepted Without Upper Bound
- **File**: [`settings.js:117`](file:///d:/projects/mcoode/packages/backend/src/routes/settings.js#L117)
- **Bug**: `Number(networkTimeout)` with no max check. User can set `networkTimeout: 999999999999` causing requests to wait indefinitely.
- **Priority**: Low

## [SET-003] `/providers` Endpoint Isn't Auth-Protected
- **File**: [`settings.js:9`](file:///d:/projects/mcoode/packages/backend/src/routes/settings.js#L9)
- **Bug**: `r.get('/providers', ...)` is defined BEFORE `r.use(authMiddleware(...))` on line 34. This means `/api/v1/settings/providers` is publicly accessible without authentication. It shows model catalogs and provider IDs.
- **Priority**: Low (no secrets exposed, but information leakage)

## [AND-001] Emulator Launched `detached: true` — Orphan Process
- **File**: [`android.js:38`](file:///d:/projects/mcoode/packages/backend/src/routes/android.js#L38)
- **Bug**: `execa('emulator', ['-avd', avdId], { detached: true })` launches an emulator that outlives the backend process. No PID tracking, no cleanup mechanism.
- **Priority**: Low

## [PLG-001] Plugin Publish Doesn't Validate `manifestUrl` — SSRF Risk
- **File**: [`plugins.js:38`](file:///d:/projects/mcoode/packages/backend/src/routes/plugins.js#L38)
- **Bug**: `manifestUrl` from request body is stored without URL validation. Could store `file:///etc/passwd` or `http://169.254.169.254/` (AWS metadata).
- **Priority**: Medium

## [PLG-002] Plugin GET Routes Not Auth-Protected — Public Plugin Registry
- **File**: [`plugins.js:9-34`](file:///d:/projects/mcoode/packages/backend/src/routes/plugins.js#L9-L34)
- **Bug**: `GET /` and `GET /:name` are accessible without authentication. Only `POST /` (publish) requires auth. This exposes the plugin registry publicly — may be intentional but undocumented.
- **Priority**: Low

## [WCH-001] Watch Route `start` Sets Status Without Checking Current State
- **File**: [`watch.js:22-38`](file:///d:/projects/mcoode/packages/backend/src/routes/watch.js#L22-L38)
- **Bug**: `POST /:projectId/start` always sets `status: 'running'` regardless of current state. If already running, this is a no-op but wastes a DB write.
- **Priority**: Low

## [USG-001] Usage Stats Loads ALL Sessions Into Memory — O(n) Memory
- **File**: [`usage.js:75`](file:///d:/projects/mcoode/packages/backend/src/routes/usage.js#L75)
- **Bug**: `db().session.find({ userId: req.userId })` loads ALL sessions for the user into memory. A power user with 10,000 sessions: 10,000 documents loaded, filtered, aggregated in JS. Should use MongoDB aggregation pipeline.
- **Priority**: Medium

## [USG-002] PDF Report Limited to 30 Sessions — Incomplete for Power Users
- **File**: [`usage.js:219`](file:///d:/projects/mcoode/packages/backend/src/routes/usage.js#L219)
- **Bug**: `sessions.slice(0, 30)` hardcoded in PDF report. No pagination or "page 2" concept.
- **Priority**: Low

## [USG-003] CSV Export Doesn't Escape Commas in Project Names
- **File**: [`usage.js:246`](file:///d:/projects/mcoode/packages/backend/src/routes/usage.js#L246)
- **Bug**: `esc()` wraps values in double quotes and escapes internal quotes. But the header line `'date,project,mode,status'` is not quoted. If header values match data patterns, CSV parsers may misalign.
- **Priority**: Low

## [USG-004] Coverage Endpoint Uses Relative Path From Backend — Not User's Project
- **File**: [`usage.js:270`](file:///d:/projects/mcoode/packages/backend/src/routes/usage.js#L270)
- **Bug**: `join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')` resolves to the monorepo root. It reads the BACKEND'S coverage report, not the user's project coverage.
- **Priority**: Medium

## [USG-005] `countDocuments` May Not Exist on Custom DB Adapter
- **File**: [`usage.js:156-157`](file:///d:/projects/mcoode/packages/backend/src/routes/usage.js#L156-L157)
- **Bug**: `db().chatMessage.countDocuments` — this optional chaining checks for method existence, which is good. But if the method exists but throws, the `.catch(() => 0)` silently hides errors.
- **Priority**: Low

---

# BROWSER TOOL / ANALYTICS / GIT — Deep Bugs (20 Findings)

## [BRW-001] `browser_navigate` Uses `networkidle` Wait Strategy — Slow for SPAs
- **File**: [`browser-tool.js:122`](file:///d:/projects/mcoode/packages/cli/src/core/browser-tool.js#L122)
- **Bug**: `waitUntil: 'networkidle'` waits until no network requests for 500ms. SPAs with long-polling or WebSocket connections never reach this state. Navigation times out.
- **Priority**: Medium

## [BRW-002] Screenshot Returns Full Base64 in Response — Massive Token Usage
- **File**: [`browser-tool.js:163`](file:///d:/projects/mcoode/packages/cli/src/core/browser-tool.js#L163)
- **Bug**: A full-page screenshot can be 1-5MB base64. This is sent as a tool result to the LLM, consuming thousands of tokens. Most models can't process base64 image data as text.
- **Priority**: High

## [BRW-003] `browser_click` Without Explicit `text` or `selector` Crashes
- **File**: [`browser-tool.js:134`](file:///d:/projects/mcoode/packages/cli/src/core/browser-tool.js#L134)
- **Bug**: `text ? page.getByText(text) : page.locator(selector)` — if both `text` and `selector` are undefined, `page.locator(undefined)` throws a cryptic error.
- **Priority**: Low

## [BRW-004] No Page Navigation Guard — AI Can Navigate to Malicious Sites
- **File**: [`browser-tool.js:119-128`](file:///d:/projects/mcoode/packages/cli/src/core/browser-tool.js#L119-L128)
- **Bug**: `browser_navigate` accepts ANY URL including `file:///etc/passwd`, `chrome://settings`, or malicious sites that could exploit browser vulnerabilities.
- **Priority**: Medium

## [BRW-005] `accessibility.snapshot()` Deprecated in Newer Playwright
- **File**: [`browser-tool.js:174`](file:///d:/projects/mcoode/packages/cli/src/core/browser-tool.js#L174)
- **Bug**: `page.accessibility.snapshot()` is deprecated in Playwright >= 1.41. Use `page.getByRole()` or `aria-snapshot` instead.
- **Priority**: Low

## [ANA-001] `cache.wrap` Uses String Key — Cache Collisions Possible
- **File**: [`analytics.js:7`](file:///d:/projects/mcoode/packages/cli/src/core/analytics.js#L7)
- **Bug**: `cache.wrap('analytics', ...)` — single global key. If multiple users hit the analytics endpoint simultaneously, they all share the same cache entry.
- **Priority**: Low

## [ANA-002] `computeAnalytics` Indentation Error — All Variables in Function Scope
- **File**: [`analytics.js:11-196`](file:///d:/projects/mcoode/packages/cli/src/core/analytics.js#L11-L196)
- **Bug**: Lines 11-196 have inconsistent indentation. The `let` declarations starting at line 11 are outside the arrow function's visual scope but inside its actual scope. This works but is confusing code.
- **Priority**: Low

## [ANA-003] Health Score Can Be Negative
- **File**: [`analytics.js:158-163`](file:///d:/projects/mcoode/packages/cli/src/core/analytics.js#L158-L163)
- **Bug**: `100 - (totalCost / Math.max(1, totalBuilds))` — if average cost per build > 100, this term is negative. With 0.4 + 0.4 + negative*0.2, total score can be < 0.
- **Priority**: Low

## [GIT-001] `changedFiles` Doesn't Handle Renamed Files
- **File**: [`git.js:14-21`](file:///d:/projects/mcoode/packages/cli/src/core/git.js#L14-L21)
- **Bug**: `line.slice(3)` extracts the filename from `git status --porcelain`. But renamed files show as `R  old -> new`. `slice(3)` gives `old -> new` instead of the new filename.
- **Priority**: Medium

## [GIT-002] `extractImports` Regex Misses Dynamic Imports
- **File**: [`git.js:62-68`](file:///d:/projects/mcoode/packages/cli/src/core/git.js#L62-L68)
- **Bug**: The regex doesn't match `const x = await import('./foo')` — dynamic imports are missed. Also misses `import('./foo').then(...)`.
- **Priority**: Low

## [GIT-003] `walkTree` Ignore Pattern with `*` Uses Fragile Regex
- **File**: [`git.js:79`](file:///d:/projects/mcoode/packages/cli/src/core/git.js#L79)
- **Bug**: Same ReDoS risk as WTH-007 — `.*` pattern from glob conversion can create exponential backtracking.
- **Priority**: Low

---

(More findings continue in Part 2...)
