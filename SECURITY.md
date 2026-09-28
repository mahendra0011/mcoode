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

## At-rest key encryption (BSEC-001)

Stored provider API keys (`ApiKey.encryptedKey`) and GitHub OAuth tokens
(`GithubAccount.accessToken`) use v2 envelope encryption (`MCCODEK2:` blobs):
per-blob random salt, `keyId` header for rotation, ciphertext bound to the
owning user via GCM AAD. New writes always use the **dedicated**
`API_KEY_ENCRYPTION_SECRET` — never the JWT signing secret.

### ⛔ Freeze: do NOT rotate `JWT_SECRET` alone

Legacy v1 blobs (`MCCODEKEY:`) and `jwt1`-keyId blobs are readable only via the
JWT secret. Rotating `JWT_SECRET` before migrating destroys every stored key
(decrypt throws `KEY_DECRYPT_FAILED`). Order of operations:

1. Set `API_KEY_ENCRYPTION_SECRET` (+ new `API_KEY_ENCRYPTION_KEY_ID` when rotating that).
2. Keep the old encryption secret as `API_KEY_ENCRYPTION_SECRET_PREVIOUS`
   (+ `API_KEY_ENCRYPTION_PREVIOUS_KEY_ID`) until migration finishes.
3. Run the bulk migration (dry-run first, then apply):
   `npm run migrate:key-enc --workspace=@mcode/backend` →
   `node scripts/migrate-key-encryption.js --apply`.
   The script re-reads with the full keyring, verifies
   `decrypt(newBlob) === plain` for every row, writes a JSON backup of the
   original blobs **before** writing, and never deletes.
4. Confirm `rotated=0 skipped=N failed=0` on a second dry-run, then (and only
   then) rotate `JWT_SECRET` if needed.

### Rotating `API_KEY_ENCRYPTION_SECRET` itself

1. Put the new secret in `API_KEY_ENCRYPTION_SECRET` (new `KEY_ID`), move the
   old secret to `API_KEY_ENCRYPTION_SECRET_PREVIOUS` (+ its keyId).
2. Deploy — the keyring dual-reads both; `GET /keys` lazily re-encrypts, or
   run the migration script for bulk cutover.
3. After `needsRotation()` is false everywhere, drop the `_PREVIOUS` vars.

## Operator checklist

1. Never commit `.env` (pre-commit hook installed via postinstall blocks it).
2. Rotate `JWT_SECRET`, MongoDB password, Brevo key if ever exposed.
3. Set `CLI_SHARED_SECRET` (same value CLI + backend) in production.
4. Set `MCODE_VAULT_PASSWORD` on shared machines.
5. Serve the backend behind TLS-terminating ingress (HSTS preloaded via
   helmet); keep `ALLOWED_ORIGINS` tight in production.
