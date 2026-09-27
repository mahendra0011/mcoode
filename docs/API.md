# mcode Backend API (DOC-001)

Base URL: `http://localhost:3100`. Auth: `Authorization: Bearer <access>` or
`mcode_access` cookie, unless marked public. Error envelope:
`{ error: { code, message } }`. State-changing cookie requests are CSRF-gated
(Origin must match). Generated from `packages/backend/src/routes/*.js` +
`server.js` — regenerate the table when routes change.

## System

| Method & Path | Auth | Notes |
|---|---|---|
| GET `/health` | public | Atlas/storage/cache/queue + execution capabilities |
| GET `/metrics` | public | uptime, memory, connections, version |
| GET `/api/v1/version` | public | package version |

## Auth — `/api/v1/auth` (60 req/min/IP)

| Method & Path | Auth | Notes |
|---|---|---|
| POST `/send-otp` | public | `{email, intent: signup\|login\|reset}`, 5 sends/10min |
| POST `/verify-otp` | public | signup/login only; 3 attempts then code destroyed |
| POST `/signup` | public | |
| POST `/login` | public | |
| POST `/reset-password` | public | needs `reset`-intent OTP; min 8 chars |
| POST `/refresh` | public | rotation; reuse revokes all sessions |
| GET `/sessions` | JWT | list refresh sessions |
| DELETE `/sessions/:jti` | JWT | revoke one session |
| DELETE `/sessions` | JWT | revoke all sessions |
| GET `/me` | JWT | profile |
| DELETE `/me` | JWT | requires `currentPassword` (or email OTP via change-password first for OAuth accounts); wipes user data + workspace dirs |
| PATCH `/me` | JWT | name/settings (sanitized, 10KB cap) |
| POST `/change-password` | JWT | `currentPassword` **or** login-intent `otp` |

## GitHub OAuth

| Method & Path | Auth | Notes |
|---|---|---|
| GET `/api/v1/auth/github/login` | public | starts login (signed state) |
| GET `/api/v1/auth/github` | public | connect flow (needs `?token=` access JWT) |
| GET `/api/v1/auth/github/callback` | public | verifies signed state, no `state=login` bypass |
| POST `/api/v1/auth/github/exchange` | public | single-use `code` → tokens (60s TTL) |
| GET `/api/v1/github/status` | JWT | |
| POST `/api/v1/github/disconnect` | JWT | |
| GET `/api/v1/github/repos` | JWT | `?page=&per_page=` (max 100) |

## Workspaces — `/api/v1/workspaces` (JWT)

`GET /`, `POST /` (zip|git|duplicate ≤1000 files/100MB), `GET /:id/files`,
`GET /:id/search`, `GET /:id/file`, `POST /:id/file`, `POST /:id/folder`,
`PUT /:id/file`, `DELETE /:id/file` (never the workspace root),
`POST /:id/rename-file` (409 if target exists), `GET /:id/ports/:port/check`,
`GET /:id/export` (413 over 1GB), `GET /:id/branches`,
`POST /:id/checkout` (fetches first), `GET /:id/diff`, `POST /:id/hunks`,
`POST /:id/push` (header auth, tracked-only staging),
`POST /:id/upload` (≤200 files, 50MB/file).

## Keys — `/api/v1/keys` (JWT)

`GET /`, `POST /` (200 update / 201 create), `DELETE /:id`,
`GET /models` (60s cache), `POST /test` (one-shot, never stored/logged).

## Misc (all JWT unless noted)

| Prefix | Endpoints |
|---|---|
| `/api/v1/sessions` | paginated list, CRUD, `/:id/replay` |
| `/api/v1/plugins` | `GET /`, `GET /:name` public; `POST /` auth + semver + SSRF-checked manifestUrl |
| `/api/v1/watch` | `:projectId/status\|start\|stop` (idempotent start), `:projectId/activity` (paginated) |
| `/api/v1/usage` | `/quotas`, `/compliance`, `/`, `/stats` (5000-cap), `/report.pdf` (`?limit=` ≤200), `/export.csv`, `/coverage` |
| `/api/v1/uploads` | `POST /project` (zip-only, 10-min socket timeout) |
| `/api/v1/settings` | `/providers` public (no secrets); `/`, `/permissions`, `/models` (timeout clamped 1s–10min) |
| `/api/v1/search` | `POST /` (router pick fallback, never placeholder text) |
| `/api/v1/extensions` | `/search`, `/installed`, `/install` (100MB cap, async writes, atomic registry), `/uninstall/:id` (strict id) |
| `/api/v1/languages` | public runtimes list |
| `/api/v1/android` | `/devices`, `/devices/:id/start\|stop` (tracked emulator PIDs) |
| `/api/v1/pair` | `/suggest`, `/structural` |
| `/api/v1/prompt` | `/library` CRUD, `/enhance` |
| `/api/v1/clean` | `/scan`, `/execute` (projectPath scoped to caller workspaces) |
| `/api/v1/pair-suggest` | legacy alias |

## Realtime (`/live`, Socket.IO)

Auth: Bearer token (`listener`) or `CLI_SHARED_SECRET` (`emitter`, else
broadcasts dropped). Per-socket + global rate limits, 20 conn/IP cap.
Events: `session:*`, `plan:*`, `agent:*`, `wave:*`, `integration:*`,
`build:*`, `toast`, `watch:*`, `bugcheck:*` (real tiers 1–3), `security:*`,
`review:*`, `test:*`, `clean:*`, `chat:*`, `terminal:*`, `debug:*`,
`project:*`, `ssh:*`, `pair:*`, `audit:*`, `migrate:*`.
