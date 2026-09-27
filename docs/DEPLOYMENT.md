# Deployment Guide

## Docker (recommended)

```bash
cp .env.example .env        # fill JWT_SECRET, MONGODB_URI, CLI_SHARED_SECRET
docker compose up --build
```

- `backend` on `:3100` (health: `GET /health`), `piston` sandbox on `:2000`.
- Data: MongoDB Atlas (or set `MONGODB_URI` to a local mongo service and add
  it to `docker-compose.yml`).

## Manual

```bash
npm install                 # Node >= 20 (TUI needs 26.4+ w/ --experimental-ffi)
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
npm run dev:backend & npm run dev:web
```

## Production notes

- Terminate TLS at the ingress (backend speaks HTTP); keep HSTS on.
- `NODE_ENV=production`: localhost CORS wildcards off, error messages
  generic, secure cookies on.
- Set `ALLOWED_ORIGINS` to the dashboard origin(s) only.
- Resource guards already server-side: 30s default socket timeout (10min
  uploads route only), 300 req/min global + 60 req/min auth rate limits,
  200 files/50MB per upload, 1GB workspace export cap.
- Back up MongoDB; `~/.mcode/` holds vault, undo, watch and ledger state.
