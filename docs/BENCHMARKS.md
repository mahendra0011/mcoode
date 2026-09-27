# Benchmarks

## Unit suite (vitest, this repo)

- 296 tests / 36 files, ~20s on a dev laptop (`npx vitest run`).
- Watch-daemon ignore matcher: 1000 pathological-glob checks < 5s
  (`watch-daemon-unit.test.js`).
- Shell sandbox enforcement covered in `shell-sandbox.test.js`.

## Live model benchmark

```bash
mcode model benchmark
```

Times a tiny completion per configured model (`REF | STATUS | MS`) so
static routing scores can be sanity-checked against reality. Providers
without keys report as skipped.

## Load targets (design, not yet load-tested — see ROADMAP)

- API p95 < 300ms for CRUD routes (single replica, warm cache).
- Socket fan-out: 20 conn/IP cap, 5x global event budgets.
- ZIP ingest: 500MB / 20k entries / 32-concurrency streaming.

To add a benchmark: `docs/` PR with command + hardware + numbers table.
