# Changelog

All notable changes to mcode are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.4.6] — 2026-09-26
### Security
- CORS allowlist (`ALLOWED_ORIGINS`); Socket.IO exec handlers require auth;
  workspace IDOR fallbacks removed; `safeJoin` fail-closed; upload policy
  unified (zip-only gate, no absolute-path leaks).
### Fixed
- `GET /api/v1/version` ESM crash; `/live` Express hang; double Redis
  connection; `CostLedger` TPM accounting + persistence; plan `Set`
  serialization; watch budget deadlock; `god --yes` inversion; `--concurrency`
  parsing; `doctor` model counts; memory-DB `$set` support; workspace `push`
  decrypt; OTP rate-log cap; account delete cascade.
### Added
- `mcode connect` (CI-capable provider wizard); `plugin remove/disable/enable`;
  `gen --dry-run/--force` + `page/api/hook/test` generators; refresh-token
  rotation with reuse detection + session revoke API; usage CSV export;
  password reset via OTP; web JWT proactive refresh.

## [Unreleased]
### Planned
- `/docs`, `/commands`, `/live` monitor, `/sessions` web pages (in progress).
- See `audit-reports/MASTER_SUMMARY.md` for the full phase plan.
