#!/bin/sh
# Reproduce the `npm ci` failure inside a clean node:24-alpine container,
# using only the manifests the Dockerfile copies. Used to find a working
# install strategy for the Docker build.
#
# Usage (from repo root):
#   docker run --rm -v %CD%:/src node:24-alpine sh /src/scripts/docker-ci-probe.sh <mode>
set -e
apk add --no-cache python3 make g++ >/dev/null 2>&1

rm -rf /w && mkdir -p /w/packages /w/scripts
for p in backend cli shared web; do
  mkdir -p "/w/packages/$p"
  cp "/src/packages/$p/package.json" "/w/packages/$p/package.json"
done
cp /src/package.json /src/package-lock.json /w/
cp /src/scripts/bootstrap.js /src/scripts/install-hooks.mjs /w/scripts/
cd /w

MODE="${1:-ci}"
echo "=== node: $(node --version)  npm: $(npm --version)  mode: $MODE ==="

if [ "$MODE" = "ci-legacy" ]; then
  npm ci --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -4
elif [ "$MODE" = "ci" ]; then
  npm ci --no-audit --no-fund 2>&1 | tail -4
elif [ "$MODE" = "install-legacy" ]; then
  npm install --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -4
elif [ "$MODE" = "install" ]; then
  npm install --no-audit --no-fund 2>&1 | tail -4
fi

echo "=== node-pty native binary ==="
if ls node_modules/node-pty/build/Release/pty.node >/dev/null 2>&1; then echo PTY_OK; else echo PTY_MISSING; fi
echo "=== cpu-features ==="
if ls -d node_modules/cpu-features >/dev/null 2>&1; then echo CPUFEAT_OK; else echo CPUFEAT_MISSING; fi
echo "DONE_$MODE"
