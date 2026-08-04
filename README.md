# mcode

Terminal-first, multi-model AI coding CLI. Plan → parallel subagents → watch daemon → ship, with zero mandatory setup.

```bash
npm i -g mcode-cli
mcode
```

> Still works with **no API keys at all** — mcode ships a `mock` provider so every
> feature (planning, subagents, watch/auto-fix) is demoable end-to-end for free.

## What is mcode?

`mcode` turns a single prompt into a complete build:

1. **God Mode** (`mcode god "…"`) plans the work, splits it into a dependency-sorted todo DAG,
   and dispatches **one subagent per todo** in parallel waves (default 5 concurrent).
2. **Subagents** write real files with tool calls, capped budgets, and a shared undo stack.
3. The **watch daemon** (`mcode watch`) stays on: it scans your repo, finds broken code
   (lint + static import checks + related tests), and **auto-fixes** it with a bugfix agent.
4. An optional **web dashboard** (`mcode serve` + dashboard) shows live subagents, watch
   activity, and sessions — all pushed over Socket.IO.

Model routing is per task type: the router picks the best available, non-rate-limited
provider from each domain's preference list, falling back to the highest-scoring model,
then `mock:mock`. Bring your own model (`mcode model set`), run local Ollama/LM Studio,
or use the built-in OpenRouter/OpenCode Zen/Anthropic/OpenAI/Gemini/Groq/… adapters.

## Quickstart

```bash
# environment
mcode doctor                          # check node, config, vault, providers
mcode env add OPENROUTER_API_KEY sk-…  # encrypted local vault (AES-256-GCM)

# build something
mcode init myapp --template react-vite
mcode god "build a full-stack todo app with auth, postgres and a react dashboard"

# keep it green
mcode watch --background               # auto-fix broken code, stays running
mcode watch-stop

# interactive session
mcode                                   # REPL with /god, /bugfix, /plan, /undo…
```

## Commands

| Command | What it does |
| --- | --- |
| `mcode` | Interactive TUI session (slash commands: `/god`, `/bugfix`, `/agents`, `/plan`, `/undo`, `/diff`, `/model`, `/help`, `/exit`) |
| `mcode init [name] --template <t>` | Scaffold from `express`, `fastify`, `react-vite`, `full-stack` templates |
| `mcode god "<prompt>" [--yes] [--model <ref>] [--verbose] [--watch-after]` | God Mode: plan → parallel subagents → integration pass |
| `mcode run <script>` · `mcode test [--changed]` | Run scripts / tests |
| `mcode env add\|remove\|list KEY [value]` | Encrypted secrets vault; `--plain` for CI `.env` |
| `mcode add <plugin>` | Install registry plugins (eslint, prettier, deploy-*) |
| `mcode ship [--env prod]` | Build + verify + tag + deploy hook |
| `mcode model list\|show\|set <domain> <provider:model>` | Inspect / pin the model catalog |
| `mcode watch [--background]` · `watch-stop` · `watch-status` | Scan + auto-fix daemon |
| `mcode serve [-p 3100]` | Local backend (Express + Socket.IO) for the dashboard |
| `mcode doctor` | Full environment diagnosis |
| `mcode history [--clear]` | Session history files |

Global flags: `--json`, `--non-interactive`. `god` flags: `--model <ref>`, `--verbose`,
`--concurrency <n>`, `--watch-after`.

## God Mode

```
mcode god "build a full-stack todo app with auth, postgres and a react dashboard"
```

1. **Planning agent** emits a JSON todo plan (domain, dependsOn) for each task type.
2. The plan is validated (cycles → error), turned into **waves** and confirmed.
3. **Subagent swarm**: one subagent per todo, top-fit model per domain, 25-turn cap,
   tools for `read_file` / `write_file` / `run` / `git diff` with a shared
   undo stack (revert any change with `/undo`).
4. **Integration pass** runs tests; `BUILD_COMPLETE` prints the summary.
5. `--watch-after` leaves the watch daemon running.

## Watch daemon (auto-fix)

- Detects broken code via **chokidar events** (debounced) + a **full-repo scan loop** (30s default).
- Cheap static checks first (eslint + unresolved-import detection); a model is called **only when something is broken**.
- The bugfix agent analyzes impact, writes the fix, and **verifies before applying**
  (temp-file eslint pass); `maxFixesPerHour` (60) caps runaway loops.
- Honors `.mcodeignore` and `.gitignore`; `autoCommit: true` config option available.
- Fixes are pushed live to the dashboard (`watch:fix` events).

## Providers

18 adapters built in — auto-detected by the presence of their env key:

OpenRouter, OpenCode Zen, OpenAI, Anthropic, Gemini, Groq, Together, Mistral, DeepSeek,
xAI, Fireworks, Perplexity, Cerebras, Novita, HuggingFace, **Ollama** (local),
**LM Studio** (local), **mock**.

Routing preference per task type lives in `@mcode/shared` (`DEFAULT_ROUTING`); override
with `mcode model set <domain> <ref>` or `~/.mcode/config.json` → `routing`.

## Web dashboard

```bash
mcode serve          # backend on :3100 (Mongo/Redis optional — memory fallback)
npm run dev:dashboard # vite on :5173 (proxies /api and /live → :3100)
```

- Landing + docs/commands/plugins/changelog pages
- Live subagent monitor (Socket.IO `/live`, JWT-authed, session & project rooms)
- Watch daemon activity, sessions + transcripts, usage + PDF report export
- JWT auth (access 15m / refresh 30d), plugin registry

## Architecture

```
packages/
  shared/    events, task domains + colors, plan/todo math, provider contracts, rate-limit ledger (RPM/TPM)
  cli/       commander app + Ink TUI, god mode, watch daemon, providers, templates, vault
  backend/   Express + Socket.IO: auth, sessions, plugins, watch, usage (PDF), uploads
  dashboard/ React 18 + Vite + Tailwind + Redux Toolkit + React Query + Recharts
```

CLI distribution: esbuild bundles the CLI into a single ESM file (`dist/mcode.mjs`,
Ink is bundled; the package also ships the watch daemon entry + templates). The CLI
stays a self-healing dev entry: `bin/mcode.js` rebuilds the bundle on demand.

Config lives in `~/.mcode/` (`config.json`, encrypted `vault.json.enc`, history, watch state).
Secrets never leave the machine: **keys are stored locally, encrypted** (AES-256-GCM,
machine-bound key).

## Development

```bash
npm install            # workspace bootstrap (shared → cli → backend → dashboard)
npm run build:cli      # rebuild the CLI bundle
npm run build:dashboard
npm test               # vitest: plan/waves/cycles, routing, vault, memory db
npm run mcode -- --version
```

## License

MIT
