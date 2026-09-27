# Backend Server — Bugs & Issues

---

## [BKD-001] `bugcheck:start` Handler Uses Hardcoded Timeouts to Simulate Real Analysis

- **Description**: The `bugcheck:start` socket handler emits fake tier progression events using nested `setTimeout` calls with hardcoded delays (100ms, 300ms, 400ms). It reports 0 findings regardless of actual project state. This is purely simulated — no real analysis runs.
- **Current vs Expected Behavior**: Dashboard shows a beautiful animated tier progression with "Syntax & Type Errors ✓", "Known Crash Patterns ✓", etc., but it's ALL fake. Zero actual analysis happens. Expected: Real static analysis pipeline.
- **Flow**: User clicks "Bug Check" → socket emits `bugcheck:start` → server runs setTimeout cascade → emits "all clear" → user thinks code is safe
- **Root Cause / Logic**: [sockets.js L249-323](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L249-L323) — entire bugcheck flow is simulated with setTimeout
- **Affected Files**: [`packages/backend/src/sockets.js`](file:///d:/projects/mcoode/packages/backend/src/sockets.js)
- **UI/Frontend Impact**: Dashboard displays false "0 findings" reports, creating a false sense of code quality
- **Suggested Fix**: Replace fake implementation with real static analysis: run ESLint, `npm audit`, `tsc --noEmit`, dependency vulnerability scanning
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement real Tier 1 (ESLint/tsc)
  - [ ] Implement real Tier 2 (crash pattern detection)
  - [ ] Implement real Tier 3 (npm audit)
  - [ ] Implement real Tier 4 (AI analysis)

---

## [BKD-002] Express App Not Mounted on httpServer Until After Socket.IO

- **Description**: The server creates `httpServer` without the Express app. It calls `attachSockets(httpServer)` first, then `httpServer.on('request', app)` later. This means Socket.IO gets the raw HTTP server, and Express is added as a listener after. This works but means Socket.IO requests go through `normalizeLiveUrl` → Express chain, creating potential ordering issues.
- **Current vs Expected Behavior**: Works correctly in practice, but the architecture is fragile. If any Express middleware takes too long, Socket.IO polling requests can be delayed.
- **Flow**: HTTP request → normalizeLiveUrl listener → if `/live/*`, Socket.IO handles → else Express handles
- **Root Cause / Logic**: [server.js L195-215](file:///d:/projects/mcoode/packages/backend/src/server.js#L195-L215) — `createServer()` without app, then `httpServer.on('request', app)` after socket setup
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: Use `createServer(app)` or document the intentional ordering clearly
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add architecture comment explaining ordering
  - [ ] Consider using createServer(app)

---

## [BKD-003] EADDRINUSE Retry Logic Doesn't Close httpServer Before Retrying

- **Description**: When port is in use, the error handler retries `httpServer.listen(port)` after 1 second. But it doesn't call `httpServer.close()` first, which means the old listener is still attached, potentially causing double-listen errors on success.
- **Current vs Expected Behavior**: If the port becomes available during retry, the second `listen()` call succeeds but the failed listener state may linger.
- **Flow**: Port 3100 in use → error → retry after 1s → port freed → listen succeeds → but prior error state not cleaned
- **Root Cause / Logic**: [server.js L243-258](file:///d:/projects/mcoode/packages/backend/src/server.js#L243-L258) — no `httpServer.close()` before retry
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: Call `httpServer.close()` before each retry attempt
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add httpServer.close() before retry

---

## [BKD-004] Piston Auto-Start Runs `--privileged` Container — Security Risk

- **Description**: The Piston container auto-start command uses `--privileged` flag, giving the container full host capabilities (access to all devices, ability to mount filesystems, disable security features).
- **Current vs Expected Behavior**: Piston container has root-equivalent access to the host system. A compromise of the Piston container gives full host control.
- **Flow**: Backend starts → Docker detected → Piston not running → auto-starts with `--privileged` → sandbox is ironic
- **Root Cause / Logic**: [server.js L289](file:///d:/projects/mcoode/packages/backend/src/server.js#L289) — `--privileged` flag in docker run
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Security Risk**: **HIGH** — Privileged container can escape to host
- **Suggested Fix**: Remove `--privileged`; Piston works without it in most setups; add specific capabilities if needed: `--cap-add SYS_ADMIN`
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove --privileged from Piston container
  - [ ] Add minimal required capabilities

---

## [BKD-005] `httpServer._connections` Deprecated — Metrics Endpoint May Return null

- **Description**: The `/metrics` endpoint accesses `httpServer._connections` which is a deprecated internal property. It returns `null` on modern Node.js versions.
- **Current vs Expected Behavior**: `GET /metrics` returns `{ activeConnections: null }` — useless metric.
- **Flow**: Dashboard calls `/metrics` → `activeConnections: null` → monitoring shows no data
- **Root Cause / Logic**: [server.js L222](file:///d:/projects/mcoode/packages/backend/src/server.js#L222)
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: Use `httpServer.getConnections()` (callback-based) or track connections manually
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Replace with httpServer.getConnections()

---

## [BKD-006] Socket Rate Limiting Uses Per-Socket Buckets — No Global Protection

- **Description**: Rate limiting in sockets.js is PER-SOCKET (per connection). An attacker can open multiple socket connections and each gets its own rate limit bucket.
- **Current vs Expected Behavior**: One connection: 20 chat:send/min. 100 connections: 2000 chat:send/min. No global cap.
- **Flow**: Attacker opens 50 socket connections → 50 × 20 = 1000 chat:send/min → server overloaded
- **Root Cause / Logic**: [sockets.js L131-158](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L131-L158) — `buckets` is per-socket
- **Affected Files**: [`packages/backend/src/sockets.js`](file:///d:/projects/mcoode/packages/backend/src/sockets.js)
- **Suggested Fix**: Add global rate limiting per userId (or IP for unauthenticated); limit connections per IP
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add global per-user rate limiting
  - [ ] Limit connections per IP

---

## [BKD-007] `db().session.create()` Called Without Await — Silent Data Loss

- **Description**: Build results are persisted via `db().session.create({...}).catch(() => {})` without `await`. If the process exits shortly after, the database write may not complete.
- **Current vs Expected Behavior**: Build completion event is emitted, process may exit, database write races against process shutdown. Build history may be lost.
- **Flow**: God build completes → BUILD_COMPLETE emitted → `db().session.create()` starts → process.exit → write cancelled
- **Root Cause / Logic**: [sockets.js L183-191](file:///d:/projects/mcoode/packages/backend/src/sockets.js#L183-L191) — fire-and-forget without await
- **Affected Files**: [`packages/backend/src/sockets.js`](file:///d:/projects/mcoode/packages/backend/src/sockets.js)
- **Suggested Fix**: Use `await` in an async handler; add process shutdown hooks to flush pending writes
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Await database writes for important events
  - [ ] Add graceful shutdown with pending write flush

---

## [BKD-008] Server Timeout Set to 10 Minutes for ALL Requests

- **Description**: `requestTimeout`, `headersTimeout`, and `keepAliveTimeout` are all set to 10 minutes. This was intended for "large project ZIP uploads" but applies to ALL requests.
- **Current vs Expected Behavior**: ANY request can take up to 10 minutes before timeout. A slow-loris attack can hold connections open for 10 minutes each, exhausting server resources.
- **Flow**: Attacker sends partial request → connection held open for 10 minutes → repeat with many connections → DoS
- **Root Cause / Logic**: [server.js L196-199](file:///d:/projects/mcoode/packages/backend/src/server.js#L196-L199) — blanket timeout for all routes
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: Set default timeout to 30 seconds; use per-route middleware for upload endpoints to extend timeout
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Set default timeout to 30s
  - [ ] Per-route timeout override for uploads

---

## [BKD-009] Error Handler Doesn't Strip Internal Details in Production

- **Description**: The global error handler returns `err.message` directly to the client. In production, internal error messages may leak implementation details (file paths, database queries, stack traces).
- **Current vs Expected Behavior**: `500 { error: { message: "Cannot read properties of undefined (reading 'userId')" } }` — leaks internal code structure. Expected: Generic "internal error" message in production.
- **Flow**: Internal error → `err.message` sent to client → attacker learns code structure
- **Root Cause / Logic**: [server.js L187-193](file:///d:/projects/mcoode/packages/backend/src/server.js#L187-L193)
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: In production, return generic "internal error"; log full error server-side only
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Strip error details in production
  - [ ] Return generic message to clients

---

## [BKD-010] `version` Endpoint Uses `createRequire` for Package.json — Fragile Path Resolution

- **Description**: The `/api/v1/version` endpoint uses `require('../package.json')` and falls back to `require('../../package.json')`. This is fragile and will break if the file structure changes.
- **Current vs Expected Behavior**: Works in development but may fail in production builds where directory structure differs.
- **Flow**: Production deployment → `require('../package.json')` fails → `require('../../package.json')` fails → returns `0.1.0`
- **Root Cause / Logic**: [server.js L167-174](file:///d:/projects/mcoode/packages/backend/src/server.js#L167-L174) — try-catch chain for relative paths
- **Affected Files**: [`packages/backend/src/server.js`](file:///d:/projects/mcoode/packages/backend/src/server.js)
- **Suggested Fix**: Use `import.meta.resolve` or read package.json with `readFile` relative to `__dirname`
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Fix version endpoint path resolution
