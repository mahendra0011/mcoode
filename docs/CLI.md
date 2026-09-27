# mcode CLI Reference

Generated from `packages/cli/src/index.js` (commander). Global: `mcode`
(TUI when no command), `--json`, `--non-interactive`.

| Command | Purpose |
|---|---|
| `mcode god <prompt>` | Plan → parallel subagents → tests → bugfix (`--yes`, `--model`, `--watch-after`, `--concurrency`) |
| `mcode run <script>` | Run a package.json script (auto pm: npm/pnpm/yarn/bun) |
| `mcode test` | Project tests or autonomous self-healing agent |
| `mcode gen <thing> <name>` | Scaffold route/component/controller (`--dry-run`, `--force`) |
| `mcode env add <key> [v]` | Vault store (`--plain`, `--file`) |
| `mcode env remove <key>` / `list` | Vault management |
| `mcode model list\|show\|set\|reset\|modes\|benchmark` | Catalog, pin `provider:model`, live benchmark |
| `mcode api-key` / `connect` | Provider keys (wizard or `--provider/--key`) |
| `mcode add <plugin>` | Registry plugin install |
| `mcode ship` | Build+test+tag+deploy (`--env`, `--yes`, `--skip-tests`) |
| `mcode watch [--background] [--scan ms]` | Auto-fix daemon (`watch-stop`, `watch-status`) |
| `mcode review` / `explain` / `migrate` / `audit` / `clean` | Power modes |
| `mcode history [--limit n]` / `--clear` / `--json` | Session history |
| `mcode doctor` | Environment diagnosis |
| `mcode init [name]` | Scaffold project |
| `mcode serve [-p]` | Local backend |
| `mcode uninstall` / `install` | Remove / reinstall local data |

Exit codes: `0` ok, `1` failure (migrate/test failures set it without
killing chained scripts abruptly — check `echo $?`).
