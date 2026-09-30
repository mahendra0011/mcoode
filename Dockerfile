# syntax=docker/dockerfile:1
#
# mcode monorepo — multi-stage image for the backend API and the web frontend.
#
# Why this is a multi-stage build (the old single-stage one could never work):
#
#   1. node-pty / cpu-features / ssh2 are NATIVE modules. The Windows host's
#      node_modules cannot be reused in a Linux container — the win32 .node
#      binaries fail to load and the backend dies on boot. So `npm ci` runs
#      INSIDE the image, against Alpine's musl, with a real toolchain.
#   2. The toolchain (python3/make/g++) is needed to COMPILE, never to RUN.
#      Keeping it in the final stage bloated the runtime image for nothing.
#   3. The web app needs `next build` output plus devDependencies. The
#      backend does not. One image serving both meant shipping both sets.
#
# Result: build stage has the toolchain and runs next build; the runtime
# stage is a clean production image with no compilers.

# ─── Base ─────────────────────────────────────────────────────────────────────
# Node 24 matches the local dev runtime (node v24.16.0).
FROM node:24-alpine AS base
WORKDIR /app
# ── The critical setting for native modules in Docker ─────────────────────────
# node-gyp normally DOWNLOADS Node headers from nodejs.org before compiling a
# native addon. In this environment registry.npmjs.org is reachable but
# unofficial-builds.nodejs.org TIMES OUT, so every native build (node-pty,
# cpu-features) fails with:
#
#   gyp http GET https://unofficial-builds.nodejs.org/download/release/...headers.tar.gz
#   gyp ERR! AggregateError [ETIMEDOUT]
#
# The official node images already ship those headers at /usr/local/include/node.
# Pointing node-gyp at the local copy (npm_config_nodedir) removes the download
# entirely — this is the single change that makes native modules build in Docker.
ENV npm_config_nodedir=/usr/local \
    npm_config_fund=false \
    npm_config_audit=false \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Tell node-gyp exactly where Python is instead of letting it search — the
# search intermittently reports "Python is not set" when the apk layer that
# installs python3 and the npm layer that needs it build concurrently.
ENV PYTHON=/usr/bin/python3
# BusyBox wget backs the HEALTHCHECK below — no curl needed in the image.
RUN apk add --no-cache wget

# ─── deps: install the monorepo dependency tree ───────────────────────────────
FROM base AS deps
# Native modules compile from source on musl, so we need a toolchain HERE.
RUN apk add --no-cache python3 make g++ \
    && ln -sf /usr/bin/python3 /usr/local/bin/python \
    && ln -sf /usr/bin/python3 /usr/local/bin/python3

# Copy ONLY manifests first. This layer is cached until a package.json or the
# lockfile changes, so day-to-day source edits skip the whole install.
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/cli/package.json     packages/cli/
COPY packages/shared/package.json   packages/shared/
COPY packages/web/package.json     packages/web/
# `scripts/` must exist BEFORE npm ci: the root package.json declares a
# `postinstall` (scripts/bootstrap.js), and a failing lifecycle script makes
# the whole `npm ci` — and therefore the build — fail.
COPY scripts/bootstrap.js    scripts/bootstrap.js
COPY scripts/install-hooks.mjs scripts/install-hooks.mjs

# `npm ci` (not `npm install`) for a reproducible, lockfile-exact tree.
# --ignore-scripts is deliberately NOT used: it would skip the node-gyp
# compiles for node-pty/ssh2 and produce an image that cannot boot.
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set in `base` — playwright is a
# dependency of both backend and cli, and downloading ~500MB of browsers
# would triple the build time for nothing the server needs.
#
# NOTE: package-lock.json was previously missing the `search-insights` entry
# required by the optional @docsearch/react peer (pulled in by vitepress), so
# `npm ci` aborted with "Missing: search-insights@2.17.3 from lock file" in any
# clean environment. The lockfile has been regenerated to include it.
RUN npm ci --no-fund --no-audit

# ─── build: compile the CLI bundle and the Next.js production build ───────────
FROM base AS build
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
# npm does NOT hoist everything to the root: packages with platform-specific
# optionalDependencies (the @opentui/* family, needed by the CLI TUI) are
# nested under their own workspace, e.g. packages/cli/node_modules. Copying
# only the root tree made `esbuild` fail with
# "Could not resolve @opentui/react/jsx-runtime".
# COPY merges directory contents, so the manifest-only tree from `deps` is
# kept and the real sources below are overlaid on top of it.
COPY --from=deps /app/packages         ./packages
COPY package.json package-lock.json ./
COPY packages/backend ./packages/backend
COPY packages/cli     ./packages/cli
COPY packages/shared   ./packages/shared
COPY packages/web     ./packages/web
COPY scripts           ./scripts

# NEXT_PUBLIC_* values are inlined at build time, so the browser-side API
# origin has to be baked in here. Default to the published host port; the
# compose file overrides this with the service name for server-side calls.
ARG NEXT_PUBLIC_API_URL=http://localhost:3100
ARG BACKEND_URL=http://backend:3100
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    BACKEND_URL=$BACKEND_URL \
    NEXT_TELEMETRY_DISABLED=1

# esbuild bundles the CLI to a single dist/mcode.mjs.
RUN npm run build:cli
# next build produces .next/ — the artifact the web runtime stage serves.
RUN npm run build:web

# ─── backend: production runtime for the Express + Socket.IO API ──────────────
FROM base AS backend
ENV NODE_ENV=production \
    PORT=3100
# tini reaps orphaned child processes (node-pty spawns shells), so a crashed
# PTY session cannot leave zombies accumulating in the container.
# git  -> simple-git operations against user repos
# python3 -> host-runner language detection; it is a real runtime, not a build
#            tool, so it is safe to keep in production.
# busybox-extras -> `nc`, used by the entrypoint to probe mongo/redis
RUN apk add --no-cache tini git python3 busybox-extras

# Reuse the dependency tree already compiled in the `deps` stage instead of
# running `npm ci` again. A second install would need make/g++ here purely to
# recompile node-pty, which would drag a full compiler toolchain into the
# production image for no runtime benefit.
COPY --from=deps /app/node_modules ./node_modules
# Same reasoning as the build stage: workspace-local node_modules (e.g.
# packages/cli/node_modules/@opentui) must come along or imports fail at boot.
COPY --from=deps /app/packages         ./packages
COPY package.json package-lock.json ./
COPY packages/backend ./packages/backend
COPY packages/cli     ./packages/cli
COPY packages/shared   ./packages/shared
# `mcode-cli`'s package.json points `main` at dist/mcode.mjs, which is a build
# artifact — copy the compiled bundle from the build stage, or the backend
# throws ERR_MODULE_NOT_FOUND on its first import of the CLI.
COPY --from=build /app/packages/cli/dist ./packages/cli/dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3100
# /health reports storage/cache/queue + execution capabilities. Alpine's
# BusyBox wget is already present from `base`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
# main.js (not server.js) — server.js only exports startServer(); main.js is
# what actually calls it. The old CMD pointed at server.js and exited silently.
CMD ["node", "packages/backend/src/main.js"]

# ─── web: production runtime for the Next.js frontend ─────────────────────────
FROM base AS web
ENV NODE_ENV=production \
    PORT=3000
RUN apk add --no-cache tini
COPY --from=build /app/node_modules            ./node_modules
COPY --from=build /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=build /app/packages/web/.next      ./packages/web/.next
COPY --from=build /app/packages/web/public     ./packages/web/public
# src/ MUST ship in the image even for `next start`:
#   - `next dev` (docker-compose.dev.yml) reads it for on-demand compilation,
#     and without it Next exits with "Couldn't find any `pages` or `app`
#     directory";
#   - `next build` traces server components into .next, but the source is still
#     the app's source of truth and is cheap to include.
COPY --from=build /app/packages/web/src         ./packages/web/src
COPY --from=build /app/packages/web/package.json ./packages/web/package.json
COPY --from=build /app/packages/web/next.config.mjs ./packages/web/next.config.mjs
COPY --from=build /app/packages/web/tsconfig.json  ./packages/web/tsconfig.json
COPY --from=build /app/packages/web/postcss.config.js ./packages/web/postcss.config.js
COPY --from=build /app/packages/web/tailwind.config.js ./packages/web/tailwind.config.js

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

WORKDIR /app/packages/web
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "next", "start", "-p", "3000"]
