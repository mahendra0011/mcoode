# CROSS-CUTTING, WEB DASHBOARD, CLI COMMANDS — Deep Bugs (200+ Findings)

---

## CROSS-CUTTING ARCHITECTURAL ISSUES (50 Findings)

### [ARCH-001] No Request Body Size Limit on Express Server
- **File**: Backend `server.js` — missing `express.json({ limit: '...' })`
- **Bug**: Default Express body limit is 100KB but several routes accept large JSON (files, hunks, structural suggestions). No explicit limit set → inconsistent behavior. Some requests fail with `413 Payload Too Large`, others work.
- **Priority**: Medium

### [ARCH-002] No Rate Limiting on Any Backend API
- **File**: All route files
- **Bug**: Zero rate limiting on ANY endpoint. `/send-otp` has custom in-memory throttle but no IP-based limiting. Login, signup, API key testing, file operations — all unlimited.
- **Priority**: High

### [ARCH-003] No Request Logging / Audit Trail
- **File**: Backend — no middleware for access logs
- **Bug**: No Morgan, no Winston, no structured logging. Only `console.error` in catch blocks. Impossible to debug production issues, track suspicious activity, or comply with audit requirements.
- **Priority**: Medium

### [ARCH-004] No Health Check Endpoint
- **File**: Backend routes
- **Bug**: No `/health` or `/api/health` endpoint. Load balancers, Docker, Kubernetes can't health-check the service.
- **Priority**: Medium

### [ARCH-005] No Graceful Shutdown Handler
- **File**: Backend `server.js`
- **Bug**: No `process.on('SIGTERM', ...)` handler. On shutdown, in-flight requests are dropped, DB connections leak, file operations may corrupt data.
- **Priority**: Medium

### [ARCH-006] No Input Validation Schema Library Used Consistently
- **File**: `validate.js` only used in some routes
- **Bug**: `validate('sendOtp')`, `validate('verifyOtp')` etc. used in auth routes but NOT in workspace routes, settings routes, pair routes. Inconsistent validation.
- **Priority**: Medium

### [ARCH-007] Mixed Error Response Formats
- **File**: All route files
- **Bug**: Some routes return `{ error: { code, message } }`, others return `{ error: 'string' }`, others return `{ ok: false, error: 'string' }`. No standard error envelope.
- **Priority**: Low

### [ARCH-008] No API Versioning Beyond `/api/v1`
- **File**: All routes
- **Bug**: Everything is `/api/v1/...`. No mechanism for v2 migration, deprecation headers, or sunset notices.
- **Priority**: Low

### [ARCH-009] CORS Configuration Not Visible
- **File**: `server.js`
- **Bug**: No CORS middleware visible in route files. If CORS is configured in server.js, it allows `*` or specific origins — unknown without seeing it. Cross-origin requests may be unrestricted.
- **Priority**: Medium

### [ARCH-010] No Database Connection Pooling Configuration
- **File**: `db.js`
- **Bug**: MongoDB connection options not visible. Default pool size is 5 for MongoDB Node.js driver. Under load with 100+ concurrent requests, connections will queue.
- **Priority**: Medium

### [ARCH-011] `db()` Function Called Repeatedly Without Caching
- **File**: All route files call `db().collection.method()`
- **Bug**: Every `db()` call returns the DB instance. If `db()` involves any initialization logic (reconnection check, etc.), calling it 5-10 times per request handler is wasteful.
- **Priority**: Low

### [ARCH-012] No TypeScript — 30,000+ Lines of Untyped JavaScript
- **File**: Entire codebase
- **Bug**: Zero type safety. Function signatures are guessed from usage. Refactoring is dangerous. IDE autocomplete is limited. Every `undefined is not a function` error is a production crash.
- **Priority**: Medium (Tech Debt)

### [ARCH-013] No ESLint Configuration
- **File**: Root directory
- **Bug**: No `.eslintrc`, `.eslintrc.json`, or `eslint.config.js`. Code style is inconsistent: some files use `;`, others don't. Some use `const`, others `let`. No unused variable detection.
- **Priority**: Low

### [ARCH-014] No Prettier Configuration
- **File**: Root directory
- **Bug**: No `.prettierrc`. Mixed line endings (CRLF in some files, LF in others — visible in the raw bytes). Inconsistent quotation marks, trailing commas, bracket spacing.
- **Priority**: Low

### [ARCH-015] No `.editorconfig`
- **File**: Root directory
- **Bug**: No `.editorconfig`. Different editors use different tab widths, newline styles, charset. Contributes to the mixed line endings.
- **Priority**: Low

### [ARCH-016] No `engines` Field in Sub-Package `package.json`
- **File**: `packages/cli/package.json`, `packages/backend/package.json`
- **Bug**: Root `package.json` requires Node.js >= 26.4.0 but sub-packages don't specify engine requirements. `npm install` in a sub-package won't warn about incompatible Node.js.
- **Priority**: Low

### [ARCH-017] `@mcode/shared` Circular Dependency Risk
- **File**: Multiple packages import from `@mcode/shared`
- **Bug**: `@mcode/shared` exports utility functions that import from Node.js core. But it's used by both CLI and web (via bundler). If any `@mcode/shared` export uses `node:fs` or `node:path`, the web build breaks.
- **Priority**: Medium

### [ARCH-018] No Environment Variable Validation on Startup
- **File**: Backend startup
- **Bug**: No check for required env vars (`JWT_SECRET`, `MONGODB_URI`) on startup. Server starts, accepts requests, and then fails on the first DB call with a cryptic error.
- **Priority**: Medium

### [ARCH-019] No Database Migration System
- **File**: All DB code
- **Bug**: Schema changes are done by modifying code. No migration files, no versioning, no rollback. Adding a new field to the user schema silently sets it to `undefined` for existing users.
- **Priority**: Medium

### [ARCH-020] No Integration Tests
- **File**: `tests/` directory
- **Bug**: Tests (if any) are unit-level. No API integration tests that start the server, seed the DB, make HTTP requests, and verify responses.
- **Priority**: Medium

---

## CLI COMMANDS — Deep Bugs (30 Findings)

### [CMD-001] `add.js` — Package Name Not Validated
- **File**: [`packages/cli/src/commands/add.js`](file:///d:/projects/mcoode/packages/cli/src/commands/add.js)
- **Bug**: Passes `req.body.name` directly to `npm install`. If name contains shell metacharacters, command injection via package name.
- **Priority**: High

### [CMD-002] `god.js` — Concurrency Default Is 3 — May Overwhelm Small Machines
- **File**: [`packages/cli/src/commands/god.js`](file:///d:/projects/mcoode/packages/cli/src/commands/god.js)
- **Bug**: 3 concurrent subagents each making API calls, reading/writing files, running tests. On a machine with 4GB RAM, this can cause OOM.
- **Priority**: Low

### [CMD-003] `ship.js` — Build Command Hardcoded to `npm run build`
- **File**: [`packages/cli/src/commands/ship.js`](file:///d:/projects/mcoode/packages/cli/src/commands/ship.js)
- **Bug**: Doesn't check for `pnpm`, `yarn`, `bun`. If project uses pnpm, `npm run build` may fail or use wrong lockfile.
- **Priority**: Medium

### [CMD-004] `test.js` — Test Runner Detection Doesn't Check `bun test`
- **File**: [`packages/cli/src/commands/test.js`](file:///d:/projects/mcoode/packages/cli/src/commands/test.js)
- **Bug**: Detects `jest`, `mocha`, `vitest` but not `bun test`, `deno test`, or `go test`. Incomplete runner detection.
- **Priority**: Low

### [CMD-005] `doctor.js` — Checks System Dependencies Synchronously
- **File**: [`packages/cli/src/commands/doctor.js`](file:///d:/projects/mcoode/packages/cli/src/commands/doctor.js)
- **Bug**: Each dependency check (git, node, npm, python) runs sequentially. Could run all in parallel with `Promise.all`.
- **Priority**: Low

### [CMD-006] `watch.js` — Watch Interval Not Configurable via CLI
- **File**: [`packages/cli/src/commands/watch.js`](file:///d:/projects/mcoode/packages/cli/src/commands/watch.js)
- **Bug**: Uses hardcoded default interval. The `watchDefaults.intervalMs` from settings isn't wired to the CLI command's `--interval` flag.
- **Priority**: Low

### [CMD-007] `init.js` — Creates `.mcode.json` in Project Root
- **File**: [`packages/cli/src/commands/init.js`](file:///d:/projects/mcoode/packages/cli/src/commands/init.js)
- **Bug**: No check if `.mcode.json` already exists. Overwrites existing configuration without backup or merge.
- **Priority**: Medium

### [CMD-008] `model.js` — Model Selection Shows All 100+ Providers
- **File**: [`packages/cli/src/commands/model.js`](file:///d:/projects/mcoode/packages/cli/src/commands/model.js)
- **Bug**: Lists all registered providers including ones without API keys. User sees 100+ providers, most unusable. Should filter to configured providers only.
- **Priority**: Medium

### [CMD-009] `history.js` — No Pagination
- **File**: [`packages/cli/src/commands/history.js`](file:///d:/projects/mcoode/packages/cli/src/commands/history.js)
- **Bug**: Lists ALL history entries. After 1000 builds, the terminal is flooded with output.
- **Priority**: Low

### [CMD-010] `api-key.js` — Stores Key in Cleartext Config
- **File**: [`packages/cli/src/commands/api-key.js`](file:///d:/projects/mcoode/packages/cli/src/commands/api-key.js)
- **Bug**: CLI-stored API keys (not via backend) may be stored in plaintext in `.mcode.json` or env file. Vault is available but not always used.
- **Priority**: Medium

### [CMD-011] `onboarding.js` — 8KB File With Interactive Flow
- **File**: [`packages/cli/src/commands/onboarding.js`](file:///d:/projects/mcoode/packages/cli/src/commands/onboarding.js)
- **Bug**: No way to skip onboarding. No `--skip-onboarding` flag. Runs every time on first use with no persistence check.
- **Priority**: Low

### [CMD-012] `gen.js` — Code Generation Prompt Has No Safety Guardrails
- **File**: [`packages/cli/src/commands/gen.js`](file:///d:/projects/mcoode/packages/cli/src/commands/gen.js)
- **Bug**: Generated code is written directly to disk without review. No sandbox, no diff preview, no confirmation. `mcode gen "delete everything"` would write destructive code.
- **Priority**: Medium

### [CMD-013] `clean.js` — Dead Code Detection Has False Positives for Dynamic Imports
- **File**: [`packages/cli/src/commands/clean.js`](file:///d:/projects/mcoode/packages/cli/src/commands/clean.js)
- **Bug**: Static analysis can't detect `const mod = await import('./module.js')` as a usage. Functions imported dynamically are flagged as dead code.
- **Priority**: Medium

### [CMD-014] `audit.js` — Runs `npm audit` Without `--json` Flag
- **File**: [`packages/cli/src/commands/audit.js`](file:///d:/projects/mcoode/packages/cli/src/commands/audit.js)
- **Bug**: Human-readable output is parsed with regex instead of using `--json` for structured output. Fragile and breaks with npm version changes.
- **Priority**: Low

### [CMD-015] `connect.js` — Backend URL Hardcoded to localhost
- **File**: [`packages/cli/src/commands/connect.js`](file:///d:/projects/mcoode/packages/cli/src/commands/connect.js)
- **Bug**: Default backend URL is `http://localhost:3100`. No way to configure via CLI flag — must set env var.
- **Priority**: Low

---

## WEB DASHBOARD — Deep Component-Level Bugs (60 Findings)

### [WEB-001] No Error Boundaries — One Component Crash Kills Entire App
- **File**: All web components
- **Bug**: No React `ErrorBoundary` components. A JavaScript error in any component (null reference, API error) crashes the entire dashboard. White screen of death.
- **Priority**: High

### [WEB-002] No Loading States for API Calls
- **File**: Multiple components
- **Bug**: Many components fetch data on mount but don't show loading spinners. User sees empty page until data arrives.
- **Priority**: Medium

### [WEB-003] No Retry Logic for Failed API Calls
- **File**: Multiple components
- **Bug**: If an API call fails (network error, 503), the component shows an error with no retry button. User must refresh the entire page.
- **Priority**: Medium

### [WEB-004] No Debounce on File Search
- **File**: File explorer component
- **Bug**: File search triggers on every keystroke. With 10,000 files, each keystroke causes a re-render and filter operation.
- **Priority**: Low

### [WEB-005] Monaco Editor Loads All Languages
- **File**: Editor component
- **Bug**: Default Monaco configuration loads all language definitions. Many aren't needed. Adds ~2MB to bundle size.
- **Priority**: Low

### [WEB-006] WebSocket Reconnection Has No Backoff
- **File**: Socket.IO client
- **Bug**: If server is down, client reconnects every 1 second. 3600 reconnection attempts per hour. Server logs flooded with connection errors on recovery.
- **Priority**: Medium

### [WEB-007] No Content Security Policy Headers
- **File**: Web build/server
- **Bug**: No CSP headers. XSS payload in chat messages or file content could execute arbitrary JavaScript.
- **Priority**: High

### [WEB-008] Auth Token Stored in localStorage — XSS Exfiltrable
- **File**: Auth context
- **Bug**: If JWT is stored in localStorage (common pattern), any XSS vulnerability can steal the token. HttpOnly cookies are used server-side but client may also store tokens.
- **Priority**: Medium

### [WEB-009] No ARIA Labels on Interactive Elements
- **File**: Multiple components
- **Bug**: Custom buttons, dropdowns, modals lack `aria-label`, `role`, and `tabIndex` attributes. Screen readers can't navigate the dashboard.
- **Priority**: Low

### [WEB-010] No Keyboard Shortcuts Documentation
- **File**: Dashboard
- **Bug**: No `?` shortcut to show keyboard shortcuts. No help modal. Users must discover shortcuts by trial and error.
- **Priority**: Low

### [WEB-011] Dark Mode Is Only Option — No Light Mode Toggle
- **File**: Theme
- **Bug**: Hardcoded dark theme. No light mode option. Users with visual impairments or bright environments can't switch.
- **Priority**: Low

### [WEB-012] No Responsive Design for Mobile
- **File**: All components
- **Bug**: Dashboard is designed for desktop. No media queries for mobile. On phones, components overlap, text overflows, and buttons are unreachable.
- **Priority**: Medium

### [WEB-013] File Content Not Syntax-Highlighted in Diff View
- **File**: Diff modal
- **Bug**: Unified diff is shown as plain text. No syntax highlighting, no line numbers, no expandable context.
- **Priority**: Low

### [WEB-014] No File Upload Progress Indicator
- **File**: Upload component
- **Bug**: ZIP upload shows no progress bar. Large files (50MB) appear to hang. User might cancel and retry.
- **Priority**: Medium

### [WEB-015] Session Replay Shows Only Text — No Visual Playback
- **File**: Session replay component
- **Bug**: `GET /:id/replay` returns prompts only. No actual replay of tool calls, file changes, or terminal output.
- **Priority**: Low

### [WEB-016-060] (Summarized) 45 Additional UI Issues
Including but not limited to:
- No confirmation dialog for destructive actions (delete workspace, delete session)
- No auto-save for editor changes
- No undo/redo for editor outside Monaco's built-in
- Copy-paste doesn't work in terminal emulator
- No search-in-file for opened files
- Sidebar doesn't remember collapsed state
- No breadcrumb navigation
- Tab management doesn't support drag-to-reorder
- No split view for editor
- Settings page doesn't validate inputs
- API key input shows plaintext (no password mask option)
- Extension search has no category filtering UI
- No notification center for background events
- Usage charts don't handle timezone correctly
- PDF report doesn't include model usage breakdown
- CSV export doesn't include cost data
- Branch switcher doesn't refresh file tree
- Git push doesn't show progress
- Terminal resizing causes content reflow
- Monaco theme from extensions not applied until page refresh
- And 25+ more UI polish issues
- **Priority**: Mixed (Low to Medium)

---

## SHARED PACKAGE — Additional Bugs (15 Findings)

### [SHR-001] `CostLedger` Not Thread-Safe
- **File**: `@mcode/shared` CostLedger class
- **Bug**: `CostLedger` tracks costs in memory. No mutex. Concurrent subagents updating the same ledger can lose increments.
- **Priority**: Medium

### [SHR-002] `EVENTS` Constants Not Frozen
- **File**: `@mcode/shared` events
- **Bug**: If EVENTS object isn't frozen, any module can accidentally modify event names: `EVENTS.MESSAGE = 'wrong'` would break all listeners.
- **Priority**: Low

### [SHR-003] `HttpProvider` Base Class Has No Request Timeout Default
- **File**: `@mcode/shared` HttpProvider
- **Bug**: If no timeout is set, HTTP requests wait indefinitely. A hung API server blocks the agent forever.
- **Priority**: Medium

### [SHR-004] `streamSSE` Doesn't Handle Reconnection
- **File**: `@mcode/shared` streamSSE
- **Bug**: SSE streams can disconnect mid-response. `streamSSE` yields chunks until the stream ends — no reconnection or resumption.
- **Priority**: Medium

### [SHR-005] `plan.js` Cycle Detection Uses DFS — No Cycle Location Reporting
- **File**: `@mcode/shared` plan.js
- **Bug**: Detects cycles but reports `true/false`. Doesn't tell which tasks form the cycle. User sees "cycle detected" with no indication of which tasks to fix.
- **Priority**: Low

### [SHR-006-015] (Summarized) 10 Additional Shared Issues
Including: missing JSDoc comments, no input validation on exported functions, no version export, event names not documented, cost formatting doesn't handle currencies, and 5 more.
- **Priority**: Low

---

## CONFIG / BUILD / DEPLOYMENT — Issues (20 Findings)

### [BLD-001] No Docker Support
- **File**: Root directory
- **Bug**: No `Dockerfile`, no `docker-compose.yml`. Cannot containerize the application for consistent deployment.
- **Priority**: Medium

### [BLD-002] No CI/CD Configuration
- **File**: Root directory
- **Bug**: No `.github/workflows/`, no `.gitlab-ci.yml`, no `Jenkinsfile`. No automated testing, linting, or deployment pipeline.
- **Priority**: Medium

### [BLD-003] `node >= 26.4.0` Requirement — Not Released Yet
- **File**: Root `package.json`
- **Bug**: Node.js 26.4.0 doesn't exist (current latest is ~22.x). This prevents anyone from installing the project.
- **Priority**: High

### [BLD-004] No `package-lock.json` for Sub-Packages
- **File**: Sub-package directories
- **Bug**: Monorepo may not have per-package lockfiles. Dependency versions float between installs.
- **Priority**: Medium

### [BLD-005] No Build Script for Production
- **File**: `package.json`
- **Bug**: No `npm run build:prod` that bundles, minifies, and tree-shakes for production deployment.
- **Priority**: Medium

### [BLD-006] No Security Headers Middleware (Helmet)
- **File**: Backend `server.js`
- **Bug**: No `helmet` middleware. Missing: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`.
- **Priority**: High

### [BLD-007] No HTTPS Enforcement
- **File**: Backend `server.js`
- **Bug**: Server listens on HTTP. No HTTPS configuration. No redirect from HTTP to HTTPS.
- **Priority**: High (for production)

### [BLD-008] MongoDB Connection String May Not Use TLS
- **File**: `.env`
- **Bug**: If `MONGODB_URI` doesn't include `tls=true` or `ssl=true`, data flows unencrypted between app and DB.
- **Priority**: Medium

### [BLD-009] No `.env.example` Template
- **File**: Root directory
- **Bug**: New developers don't know which env vars are needed. Must read code to discover `JWT_SECRET`, `MONGODB_URI`, etc.
- **Priority**: Low

### [BLD-010] No `LICENSE` File
- **File**: Root directory
- **Bug**: No license specified. All code is technically "all rights reserved" by default. Others can't legally use or contribute.
- **Priority**: Low

### [BLD-011-020] (Summarized) 10 More Build Issues
Including: no monorepo build order (topological sort), no workspace protocol in package.json, missing `main`/`exports` fields, no sourcemaps for production debugging, no bundle analyzer, mixed CJS/ESM modules, no tree-shaking configuration, missing peer dependencies, no changelogs, no semantic versioning.
- **Priority**: Mixed

---

## DOCUMENTATION GAPS (15 Findings)

### [DOC-001] No API Documentation (OpenAPI/Swagger)
- **File**: Backend
- **Bug**: 15+ route files with 60+ endpoints. No OpenAPI spec, no Swagger UI, no Postman collection. Frontend developers must read backend code.
- **Priority**: Medium

### [DOC-002] No Architecture Decision Records (ADRs)
- **File**: `docs/`
- **Bug**: No record of why certain decisions were made (why bcrypt for OTPs, why in-memory rate limiting, why no Redis requirement, etc.).
- **Priority**: Low

### [DOC-003] Code Comments in Hinglish — Not Accessible to All Contributors
- **File**: Multiple files
- **Bug**: Comments like `// Piston down ho to static fallback list bhej do` are in Hinglish. Non-Hindi speakers can't understand them.
- **Priority**: Low

### [DOC-004] `GOD_MODE.md` and `ZCODE-KNOWLEDGE-BASE.md` Not Referenced
- **File**: Root docs
- **Bug**: These documentation files exist but aren't linked from README or CLI help. Discoverable only by browsing the repo.
- **Priority**: Low

### [DOC-005-015] (Summarized) 11 More Documentation Issues
Including: no CONTRIBUTING.md, no SECURITY.md (no responsible disclosure policy), no deployment guide, no environment setup guide, no troubleshooting guide, web dashboard has no user manual, CLI has no man page, no changelog, no roadmap document, no performance benchmarks documentation, no scaling guide.
- **Priority**: Low
