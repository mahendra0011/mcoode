#!/bin/sh
# mcode container entrypoint.
#
# The old version ran `npm rebuild` on every boot, which recompiled the whole
# dependency tree (~60s of node-gyp) on each restart and still crashed, because
# the native modules it was rebuilding had been copied in from Windows.
# Dependencies are now installed inside the image, so there is nothing to
# rebuild — this script only waits for infrastructure and then execs.

set -e

log() { echo "[entrypoint] $*"; }

cd /app

# ─── Wait for MongoDB ────────────────────────────────────────────────────────
# connectDb() calls process.exit(1) when the URI is unreachable, so waiting
# here is what keeps `restart: unless-stopped` from boot-looping.
if [ -n "$MONGODB_URI" ]; then
  # Parse host:port out of the URI without needing a URI library.
  # Handles both mongodb://host:port/db and mongodb+srv://... (srv -> no port).
  case "$MONGODB_URI" in
    mongodb+srv://*) log "MONGODB_URI uses an SRV host; skipping host probe (Atlas resolves DNS at connect time)." ;;
    *)
      MONGO_TARGET=$(printf '%s' "$MONGODB_URI" | sed -n 's|^mongodb://\([^/?]*\).*|\1|p')
      MONGO_HOST=${MONGO_TARGET%%:*}
      MONGO_PORT=${MONGO_TARGET##*:}
      [ "$MONGO_HOST" = "$MONGO_PORT" ] && MONGO_PORT=27017
      log "Waiting for MongoDB at $MONGO_HOST:$MONGO_PORT ..."
      i=0
      until nc -z "$MONGO_HOST" "$MONGO_PORT" 2>/dev/null; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
          log "WARN: MongoDB not reachable after 60s — starting anyway; the server will exit(1) if it truly cannot connect."
          break
        fi
        sleep 1
      done
      [ "$i" -lt 60 ] && log "MongoDB is up."
      ;;
  esac
fi

# ─── Wait for Redis ──────────────────────────────────────────────────────────
# cache.js degrades to pass-through and queue.js to a no-op, so this one is
# non-fatal — but waiting avoids a cold first request on a cold queue.
if [ -n "$REDIS_URI" ]; then
  REDIS_TARGET=$(printf '%s' "$REDIS_URI" | sed -n 's|^redis[s]\?://\([^/?]*\).*|\1|p')
  REDIS_HOST=${REDIS_TARGET%%:*}
  REDIS_PORT=${REDIS_TARGET##*:}
  [ "$REDIS_HOST" = "$REDIS_PORT" ] && REDIS_PORT=6379
  log "Waiting for Redis at $REDIS_HOST:$REDIS_PORT ..."
  i=0
  until nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      log "WARN: Redis not reachable after 30s — continuing; cache falls back to pass-through."
      break
    fi
    sleep 1
  done
  [ "$i" -lt 30 ] && log "Redis is up."
fi

# ─── Sanity-check the native modules that used to break the boot ─────────────
# node-pty is the one that actually crashes the process when its binary is
# wrong, so fail loudly with an actionable message instead of a stack trace.
if node -e "require('/app/node_modules/node-pty')" 2>/dev/null; then
  log "node-pty native module OK"
else
  log "WARN: node-pty failed to load — terminal sessions will be unavailable."
  log "      This image must be REBUILT (not reused); its .node binary is platform-specific."
fi

log "Starting: $*"
exec "$@"
