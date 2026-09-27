# BLD-001: containerize backend + CLI (Node 20+; TUI extras need 26.4+).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/cli/package.json ./packages/cli/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@mcode/backend --workspace=mcode-cli --workspace=@mcode/shared --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20-alpine AS app
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
COPY packages/cli ./packages/cli
COPY package.json ./
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3100/health || exit 1
CMD ["node", "packages/backend/src/main.js"]
