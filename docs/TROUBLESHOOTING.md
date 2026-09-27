# Troubleshooting

## Backend won't start (EADDRINUSE)

Port 3100 is taken — the server retries 5× then exits. Free it or set
`PORT`. (`mcode serve -p 3100`.)

## Dashboard shows "Backend disconnected"

Start it: `mcode serve` (or `npm run dev:backend`). The banner retries
automatically with backoff; a "reconnected" toast confirms recovery.

## 401 on every request after idle

Access token expired and refresh failed (revoked?). Log in again. Reused
refresh tokens revoke ALL sessions by design (theft response).

## Password reset code rejected

Request the code with intent `reset` (Forgot Password page does this).
Login/signup codes are single-purpose and rejected by `/reset-password`.

## GitHub-only account, no password

Send a login OTP, then `POST /change-password` with `{ otp, newPassword }`
— or use Forgot Password. Delete-account also accepts the password afterwards.

## OAuth login expired immediately

Login codes live 60s and burn on first read. Slow redirects (or double
form submission) exhaust them — retry the GitHub button once.

## Watch daemon won't stop / EBUSY on uninstall

`mcode watch-stop` (taskkill on Windows). Uninstall reports paths it
couldn't remove — stop daemons, retry.

## Undo history lost after crash

Undo stacks persist atomically; a corrupt file is backed up to
`*.bak.<timestamp>` next to the original instead of being wiped.

## TUI garbled after crash

The REPL restores the terminal on SIGINT/SIGTERM and on renderer failure
(`\x1b[?1049l`). If still broken: `reset` + reopen the terminal.

## Model calls 404 / no models

`mcode doctor` shows provider reachability. Removed entries (azure,
bedrock, vertex, databricks, cloudflare workers/gateway, gitlab, oci)
never worked over Bearer auth — use OpenRouter (`OPENROUTER_API_KEY`) or
a compatible gateway instead.

## npm test hangs in ship

`mcode ship --skip-tests` bypasses the verify stage (with confirmation).
