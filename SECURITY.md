# Security Policy

## Supported versions

Latest `main` only. Pin dependencies via the root `package-lock.json`.

## Report a vulnerability

Email the maintainer privately (do not open a public issue for
exploitable bugs). Include: affected version/commit, reproduction steps,
and impact. Expect acknowledgement within 7 days.

## Built-in protections (audited)

- JWT access (15m) + rotating refresh (30d, reuse revokes all sessions);
  httpOnly cookies, `SameSite=Lax`, cookie-CSRF Origin check on mutations.
- Bcrypt (async, cost 10) for passwords; OTPs are HMAC-SHA256, 3 attempts,
  single-purpose intents (`signup`/`login`/`reset`).
- CLI→backend socket emitters require `CLI_SHARED_SECRET` when configured.
- Tool sandbox: shell allowlist, no `shell:true` for agents, protected
  files (`.env`, lockfiles, `.git/*`, CI), path-traversal-safe joins.
- Uploads: zip-only gate, 50MB/file, zip-bomb caps, atomic registry writes.
-at-rest: CLI vault (AES-256-GCM) and backend provider keys (AES-256-GCM).

## Operator checklist

1. Never commit `.env` (pre-commit hook installed via postinstall blocks it).
2. Rotate `JWT_SECRET`, MongoDB password, Brevo key if ever exposed.
3. Set `CLI_SHARED_SECRET` (same value CLI + backend) in production.
4. Set `MCODE_VAULT_PASSWORD` on shared machines.
5. Serve the backend behind TLS-terminating ingress (HSTS preloaded via
   helmet); keep `ALLOWED_ORIGINS` tight in production.
