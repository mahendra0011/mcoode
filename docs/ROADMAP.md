# Roadmap

Status legend: ✅ done · 🚧 next · 💡 proposed.

## Shipped (audit 01–20 remediation)

- ✅ Auth hardening (HMAC OTP, 8-digit codes, reset intent, uniform responses)
- ✅ Sandbox (allowlist, no shell injection, protected files, undo safety)
- ✅ Real bugcheck tiers, workspace-scoped clean, global rate limits
- ✅ Provider hygiene (key gating, curated OpenRouter list, colon refs)
- ✅ Dashboard resilience (offline toasts, backoff, ErrorBoundary, CSP)
- ✅ Infra (Dockerfile, compose, CI, TLS-optional, graceful shutdown)

## Next (🚧)

- 🚧 Full TypeScript migration (shared package is JSDoc-gated via
  `npm run typecheck`; CLI/backend follow file-by-file)
- 🚧 Single state library for the dashboard (Redux chat ↔ Zustand UI
  boundary is documented; migration needs UI test coverage first)
- 🚧 Responsive mobile layouts per panel (viewport + auto-collapse done)
- 🚧 Per-package changelogs (root CHANGELOG is source of truth today)
- 🚧 Argon2 password hashing (async bcrypt already fixed event-loop blocking)

## Proposed (💡)

- 💡 Remote model-score distribution (`modelScoresUrl` client support done)
- 💡 SSE stream resumption for hour-long generations
- 💡 Plugin sandboxing (VM isolation for third-party plugin code)
- 💡 SSO/SAML for teams
