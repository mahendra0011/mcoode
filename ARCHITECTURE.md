# mcode Architecture

```
┌──────────┐   /live (Socket.IO)    ┌───────────┐
│ CLI/TUI  │◄──────────────────────►│ Backend   │
│ god mode │   CLI_SHARED_SECRET    │ Express   │
│ subagents│   (emitter auth)       │ + Socket  │
└────┬─────┘                        └─────┬─────┘
     │ ToolExecutor                       │  /api/v1/*
     │ (allowlist shell,                  │  auth → JWT (access+refresh rotation)
     │  protected files, undo)            │  workspaces under ~/.mcode/workspaces
     ▼                                    ▼
┌──────────────────────────────────────────────┐
│ @mcode/shared: EVENTS, SOCKET,               │
│ EVENT_TO_SOCKET, TASK_DOMAINS, plan DAG,     │
│ CostLedger, provider base                    │
└──────────────────────────────────────────────┘
     ▲                                    ▲
     │ Next.js dashboard (web/)           │
     │ Redux=chat · Zustand=UI chrome     │
     └────────────────────────────────────┘
```

## Key flows

- **God mode**: `Orchestrator.runGod` → `Planner` (strict `validatePlan`) → `SubagentManager` wave DAG (`planWaves`, file-conflict chaining, per-file locks) → integration tests → bugfix rounds → single `BUILD_COMPLETE`.
- **Watch**: `WatchDaemon` (chokidar + interval sweep) → ESLint → static checks → related tests → AI fix with verify → undo stack.
- **Model routing**: `ModelRouter.pick(domain)` — 5-layer score (static 20%, history 50%, fingerprint 20%, override 10%, live escalation) over `isConfigured()` providers; `CostLedger` persists RPM/TPM (`~/.mcode/ledger.json`).
- **Realtime**: bus `EVENTS.*` → `EVENT_TO_SOCKET` → `/live`; CLI emitters present `CLI_SHARED_SECRET`; web uses `useChatSocket` (singleton, reconnect + offline toasts).
- **Secrets**: CLI vault (`~/.mcode/vault.json.enc`, AES-256-GCM, machine-id + `MCODE_VAULT_PASSWORD`); backend provider keys AES-256-GCM in Mongo (`secret-enc.js`).

## Module map

| Path | Role |
|---|---|
| `packages/cli/src/core/{orchestrator,subagent-manager,subagent,planner}.js` | god-mode pipeline |
| `packages/cli/src/core/{tools,subagent-manager → UndoStack}.js` | sandboxed tools + undo |
| `packages/cli/src/providers/` | ~100 remote + local adapters, `MODEL_DEFS` registry |
| `packages/cli/bin/{mcode.js,mcode.mjs,node-resolve.mjs}` | entries + shared FFI prelude |
| `packages/backend/src/{server,sockets}.js` | HTTP + realtime |
| `packages/backend/src/routes/` | REST (auth, workspaces, keys, github, pair, extensions, search, clean, …) |
| `packages/web/src/{hooks/useChatSocket,store,components}` | dashboard |
