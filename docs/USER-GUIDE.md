# mcode User Guide (condensed)

## First run

```bash
npm install
cp .env.example .env            # fill JWT_SECRET, MONGODB_URI
mcode api-key                   # add at least one provider key
mcode doctor                    # verify everything is green
```

## Daily use

| Goal | Command |
|---|---|
| Chat | `mcode` (TUI) or dashboard `/ai/chat` |
| Autonomous build | `mcode god "build …" --yes` |
| Watch a project | `mcode watch` (stop: `mcode watch-stop`) |
| Review diff | `mcode review` |
| Ship | `mcode ship --skip-tests` to skip verify |
| Secrets | `mcode env add KEY value` (vault) / `--plain` (CI `.env`) |

## Auth quickstart

1. `POST /send-otp {email, intent: signup|login|reset}` → 8-digit code.
2. `POST /verify-otp` → `{access, refresh}` (+ httpOnly cookies).
3. Access lives 15m; `POST /refresh` rotates (reuse revokes all sessions).
4. GitHub users: set a password later via `POST /change-password {otp, newPassword}`
   (get the OTP with `intent: login`), or use Forgot Password (`intent: reset`).

## Safety rails you should know

- Shell tool: allowlisted binaries, no pipes/redirects without `--allow-shell-all`.
- Protected files (`.env`, lockfiles, `.git/*`, CI) always need approval.
- Destructive container/host commands are blocked with a message.
- `mcode undo` reverts the last AI write; unknown undo-ids return "not found".

See `docs/API.md` (endpoints), `docs/DEPLOYMENT.md` (prod),
`docs/TROUBLESHOOTING.md` (errors), `ARCHITECTURE.md` (internals).
