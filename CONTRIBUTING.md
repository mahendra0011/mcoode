# Contributing to mcode

## Setup

- Node.js `>=20` (TUI needs 26.4+ with `--experimental-ffi`; the bins auto-find it).
- `npm install` (postinstall runs `scripts/bootstrap.js` + installs the `.env` pre-commit guard).
- Copy `.env.example` → `.env` (root) and `packages/backend/.env.example` → `packages/backend/.env`. **Never commit `.env`.**

## Workflow

- Monorepo: `packages/cli`, `packages/backend`, `packages/shared`, `packages/web`.
- Shared contracts live in `@mcode/shared` (`EVENTS`, `SOCKET`, `EVENT_TO_SOCKET`, `TASK_DOMAINS`, `plan.js`). Add new realtime events **only** there — the CLI/web bridges pick them up automatically.
- Model refs are canonical `provider:model` (colon). Registry keys in `packages/cli/src/providers/index.js` use the same format.
- Run `npx vitest run` before pushing. Root suite must stay green (currently 290+ tests).
- `npm run lint` for `packages/*/src`. New `catch {}` blocks need a comment (`no-empty`).

## Conventions

- Security-sensitive code paths are marked with their audit ID (`SEC-xxx`, `RTR-xxx`, …). Keep the marker when you touch the line.
- Undoable file writes go through `UndoStack` (atomic persist, mutex-serialized).
- Backend mutating routes require `authMiddleware`; socket emitter events require `CLI_SHARED_SECRET` when configured.
- State: Redux = chat domain, Zustand = UI chrome (`packages/web/src/store/index.ts`). Don't add a third system.
