# Web Dashboard — Bugs & Issues

---

## [WEB-001] Next.js + Vite Dual Build Config Creates Deployment Confusion

- **Description**: The web package has BOTH `next.config.js`/`next.config.mjs` AND `vite.config.js`. The primary dev/build scripts use Next.js but Vite config files remain. Deployment platforms (Vercel, Netlify) auto-detect the framework and may pick the wrong one.
- **Current vs Expected Behavior**: Vercel auto-detects Next.js ✓. But if `vite.config.js` is present, some platforms may try Vite first → build fails. Expected: Single framework config.
- **Flow**: Deploy to platform → auto-detect picks Vite → `vite build` runs → different output → broken deployment
- **Root Cause / Logic**: Migration from Vite to Next.js didn't clean up old config
- **Affected Files**: `packages/web/vite.config.js`, `packages/web/package.json`
- **Suggested Fix**: Remove `vite.config.js` and Vite-related dev scripts/dependencies
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Remove vite.config.js
  - [ ] Remove Vite dev scripts
  - [ ] Remove @vitejs/plugin-react from devDependencies

---

## [WEB-002] Socket.IO Client Connection May Fail Silently Without Error UI

- **Description**: The web dashboard connects to the backend via Socket.IO at `http://localhost:3100`. If the backend isn't running, the connection fails silently. The dashboard loads but shows no live data — no error message, no retry indicator, no "backend offline" toast.
- **Current vs Expected Behavior**: Dashboard loads → no socket connection → no live data → user doesn't know why. Expected: "Backend offline" banner with reconnect button.
- **Flow**: User opens dashboard without backend → socket connection times out → empty dashboard → confusion
- **Root Cause / Logic**: Socket.IO client likely has default `autoConnect: true` with no error handler wired to UI
- **Affected Files**: Socket.IO setup files in `packages/web/src/`
- **Suggested Fix**: Add connection error handler; show "backend offline" banner; auto-retry with visual feedback
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add socket connection error handler
  - [ ] Show backend offline banner
  - [ ] Add reconnection visual feedback

---

## [WEB-003] Playwright Tests But No Vitest/Jest Unit Tests

- **Description**: The web package has Playwright E2E tests but no unit tests (no Vitest or Jest config). Component logic, utility functions, and state management are untested.
- **Current vs Expected Behavior**: Only E2E flows are tested. Individual component behavior, edge cases, and error states are not tested.
- **Flow**: Component renders wrong data → no unit test catches it → only caught if E2E test covers that exact scenario
- **Root Cause / Logic**: Test infrastructure only set up for E2E
- **Affected Files**: `packages/web/`
- **Suggested Fix**: Add Vitest config; write unit tests for state management (Zustand/Redux stores), utility functions, and key component logic
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add Vitest config for web package
  - [ ] Write unit tests for stores
  - [ ] Write unit tests for utility functions

---

## [WEB-004] Web Package Version is `0.0.0` — Not Synced with Monorepo Version

- **Description**: While CLI and backend are at version `2.4.6`, the web package is at `0.0.0`. This creates confusion about which version of the dashboard corresponds to which CLI/backend version.
- **Current vs Expected Behavior**: `mcode --version` shows `2.4.6` but dashboard shows `0.0.0` or nothing. Expected: All packages share the same version number.
- **Flow**: User reports "bug in dashboard v0.0.0" → developer doesn't know which commit to check
- **Root Cause / Logic**: [web/package.json L4](file:///d:/projects/mcoode/packages/web/package.json#L4) — version never updated
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Sync web version with monorepo; use a version script that updates all packages
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Sync web package version with monorepo
  - [ ] Add version sync script

---

## [WEB-005] `prettier` Listed as Regular Dependency Instead of DevDependency

- **Description**: `prettier` is in `dependencies` not `devDependencies`. It's a development-only code formatting tool and shouldn't be shipped to production.
- **Current vs Expected Behavior**: Production build includes Prettier in the dependency tree, potentially increasing `node_modules` size and install time.
- **Flow**: `npm install --production` → installs Prettier → wasted space and bandwidth
- **Root Cause / Logic**: [web/package.json L40](file:///d:/projects/mcoode/packages/web/package.json#L40)
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Move `prettier` to `devDependencies`
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Move prettier to devDependencies

---

## [WEB-006] `lucide-react` in DevDependencies — Should Be in Dependencies

- **Description**: `lucide-react` (icon library) is in `devDependencies` but is used in production components. It should be in `dependencies`.
- **Current vs Expected Behavior**: Works in development (dev deps are installed). Production build may fail if tree-shaking doesn't include dev deps. Next.js bundles it anyway during build, so it works — but semantically incorrect.
- **Flow**: `npm install --production` → lucide-react not installed → but Next.js build already bundled it → works by accident
- **Root Cause / Logic**: [web/package.json L64](file:///d:/projects/mcoode/packages/web/package.json#L64)
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Move `lucide-react` to `dependencies`
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Move lucide-react to dependencies
