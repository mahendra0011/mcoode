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
| `mcode` | Interactive TUI session (OpenTUI; `/god`, `/bugfix`, `/agents`, `/connect`, `/models`, `/init`, `/hooks`, `/help`, `/exit`, …) |
| `mcode init [name] --template <t>` | Scaffold from `express`, `fastify`, `react-vite`, `full-stack` templates |
| `mcode god "<prompt>" [--auto-approve] [--model <ref>] [--verbose] [--watch-after]` | God Mode: plan → parallel subagents → integration pass |
| `mcode run <script>` · `mcode test [--types unit,integration] [--target <url>]` | Run scripts / autonomous self-healing test agent |
| `mcode env add\|remove\|list KEY [value]` | Encrypted secrets vault; `--plain` for CI `.env` |
| `mcode connect [--provider <id> --key <k>]` | Connect a provider (wizard, or flags for CI) |
| `mcode add <plugin>` | Install registry plugins (eslint, prettier, deploy-*) |
| `mcode ship [--env prod]` | Build + verify + tag + deploy hook (targets: netlify, vercel, docker, railway, flyio, cloudflare-pages, gh-pages) |
| `mcode model list\|show\|set <domain> <provider:model>` | Inspect / pin the model catalog |
| `mcode watch [--background]` · `watch-stop` · `watch-status` | Scan + auto-fix daemon |
| `mcode serve [-p 3100]` | Local backend (Express + Socket.IO) for the dashboard (monorepo; global installs print a fallback hint) |
| `mcode doctor` | Full environment diagnosis (Node 20+, TUI needs 26.4+, config, vault, providers) |
| `mcode history [--clear]` | Session history files |
| `mcode security-check` · `audit [--pdf]` · `review` · `explain` · `migrate` · `clean` | Power commands: security scan, health audit, diff review, walkthrough, migration, dead-code clean |

Deploy targets (`ship` stage 4/4): `netlify`, `vercel`, `docker` (local build), `railway`, `flyio`, `cloudflare-pages`, `gh-pages` run locally; `render` and `aws-ecs` are git-push / manual-config flows and print guidance instead of deploying.

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

7 provider adapters supporting 100+ models via OpenRouter, Groq, Ollama, and direct APIs — auto-detected by the presence of their env key
(top: OpenRouter, OpenCode Zen, OpenAI, Anthropic, Gemini, Groq, Together,
Mistral, DeepSeek, xAI, Fireworks, Perplexity, Cerebras, Novita, HuggingFace,
Qwen, Moonshot, Poolside, Ollama (local), LM Studio (local), **mock**).
Run `mcode connect` (wizard) or `mcode doctor` to see the full list.

Routing preference per task type lives in `@mcode/shared` (`DEFAULT_ROUTING`); override
with `mcode model set <domain> <ref>` or `~/.mcode/config.json` → `routing`.

## Web dashboard

```bash
mcode serve            # backend on :3100 (needs the monorepo or @mcode/backend)
npm run dev:dashboard  # next dev (proxies /api and /live → BACKEND_URL|:3100)
```

- Landing + AI chat + CLI reference + extensions + settings pages
- Live subagent events (Socket.IO `/live`, JWT-authed) + watch activity feed
- Sessions + transcripts, usage stats, plugin registry
- JWT auth (access 15m / refresh 30d, silent refresh in the dashboard)

## Architecture

```
packages/
  shared/    events, task domains + colors, plan/todo math, provider contracts, rate-limit ledger (RPM/TPM)
  cli/       commander app + OpenTUI TUI, god mode, watch daemon, providers, templates, vault
  backend/   Express + Socket.IO: auth, sessions, plugins, watch, usage, uploads
  web/       Next.js + React + Tailwind + Zustand + React Query + Monaco + xterm
```

CLI distribution: esbuild bundles the CLI into a single ESM file (`dist/mcode.mjs`,
OpenTUI is bundled; the package also ships the watch daemon entry + templates). The CLI
stays a self-healing dev entry: `bin/mcode.js` rebuilds the bundle on demand (needs Node 20+).

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

## Security notes for operators

- **Network egress is open by default.** `networkWhitelist` in `~/.mcode/config.json`
  is `null` (allow all) on a fresh install — the CLI prints a one-time stderr
  warning in that case. To contain agent web access, set e.g.
  `"networkWhitelist": ["*.example.com", "registry.npmjs.org"]` (supports
  `*.glob`); `web_fetch`/`web_search` and shell network binaries are then
  restricted to those destinations.
- JWT auth (access 15m / refresh 30d, rotation with reuse detection); set a
  strong `JWT_SECRET` and `CLI_SHARED_SECRET` in production — tokenless sockets
  are rejected unless the CLI secret matches.
- Never commit `.env` (pre-commit hook blocks it); rotate any secret that was
  ever committed.

## License

MIT
