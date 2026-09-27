# Scaling Guide

## What already scales

- Stateless API: any number of backend replicas behind a load balancer,
  **except** these local-state pieces (see below).
- Rate limits: 300 req/min global, 60 req/min auth, socket per-key budgets.
- Bounded queries: usage stats (5000), PDF (≤200), CSV (5001), uploads
  (200 files / 50MB), exports (1GB), zips (500MB / 20k entries).

## What pins you to one replica (today)

| Local state | Fix when scaling out |
|---|---|
| OTP `sendLog` Map | Set `REDIS_URI` — throttle becomes Redis-backed automatically |
| Socket rooms/emitters (`chatSessions`, buckets) | Sticky sessions (Engine.IO) or Redis adapter |
| `pendingLogins` (OAuth codes) | Redis with 60s TTL |
| Filesystem workspaces (`~/.mcode/workspaces`) | Shared volume (NFS/EFS) or object storage |
| Extension registry JSON | Already mutex-serialized per replica; needs a DB table for multi-replica |
| CostLedger file | Per-replica files are fine (accounting); rate windows are per-process |

## DB

- MongoDB Atlas (M2+ for prod). Unique index on `user.email` carries the
  signup race. `refreshToken.jti` is unique (rotation safety).
- Redis (optional): caching + job queue + OTP throttle. Without it the
  backend runs pass-through/in-memory (single-replica mode).

## Sizing

- 1 replica (1 CPU / 512MB): ~50 concurrent dashboard users for chat +
  light tool use. Docker runners are separately capped (512MB/1 CPU each).
- Piston sandbox: separate host/container; never co-locate untrusted
  execution with the API on tiny boxes.
