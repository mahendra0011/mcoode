# Tech Debt & Code Hygiene — Issues

---

## [DEBT-001] Stray/Debug Files Left in Root Directory

- **Description**: Multiple stray files exist in the root that appear to be debug artifacts, old copies, or test files:
  - `HELLO.PY` — a Python hello world file in a Node.js project
  - `subscribers/` — 20 JSON files (`subscriber-01.json` to `subscriber-20.json`) with ~215 bytes each — appears to be test seed data left in the wrong place
  - `todos/` — 20 JSON files (`todo-01.json` to `todo-20.json`) — similar test data
  - Possible old/duplicate files in the web package (like `ai_page_old.jsx`)
- **Current vs Expected Behavior**: These files add noise, increase clone size, and create confusion about project structure. Expected: Clean root with only project-essential files.
- **Flow**: `git clone` → user sees HELLO.PY → "is this a Python project?"
- **Root Cause / Logic**: Debug/test files committed during development and never cleaned up
- **Affected Files**: Root `HELLO.PY`, `subscribers/`, `todos/`, various `_old` files in web
- **Suggested Fix**: Delete stray files; move seed data to `scripts/seed/` or `tests/fixtures/`
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Delete HELLO.PY
  - [ ] Move subscribers/ and todos/ to tests/fixtures/ or scripts/seed/
  - [ ] Audit for other stray files

---

## [DEBT-002] Node.js >= 26.4.0 Requirement — Extremely Aggressive

- **Description**: `engines.node` requires `>=26.4.0` (for `--experimental-ffi` used by OpenTUI). As of this analysis, Node.js 26 requires LTS users to be on the absolute latest version. Most CI/CD systems and hosting platforms don't support Node 26 yet.
- **Current vs Expected Behavior**: `npm install` on Node 20 LTS → `engines` check fails → can't install. Expected: Support at least Node 20 LTS for non-TUI features (CLI, backend).
- **Flow**: User on Node 20 → `npm install` → "unsupported engine" warning → installs anyway → TUI fails but CLI commands may work
- **Root Cause / Logic**: [package.json L11](file:///d:/projects/mcoode/package.json#L11) — `"node": ">=26.4.0"`
- **Affected Files**: [`package.json`](file:///d:/projects/mcoode/package.json), [`packages/cli/package.json`](file:///d:/projects/mcoode/packages/cli/package.json)
- **Suggested Fix**: Lower engines to `>=20.0.0`; gracefully degrade TUI features on older Node; only require 26+ for OpenTUI
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Lower engine requirement to Node 20+
  - [ ] Make OpenTUI/TUI optional with graceful fallback

---

## [DEBT-003] No `.eslintrc`/`eslint.config.js` in CLI or Backend — Lint Command May Fail

- **Description**: The root `package.json` has a `lint` script but there's no ESLint config file visible in the project root or packages. The `eslint` command may use default rules or fail.
- **Current vs Expected Behavior**: `npm run lint` may fail with "no config found" or use very permissive defaults that catch nothing.
- **Flow**: `npm run lint` → ESLint searches for config → not found → error or default rules
- **Root Cause / Logic**: Missing ESLint configuration file
- **Affected Files**: Root directory, `packages/cli/`, `packages/backend/`
- **Suggested Fix**: Add `eslint.config.js` with appropriate rules for Node.js + React
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add ESLint config
  - [ ] Configure for Node.js backend and React frontend

---

## [DEBT-004] Web Package Has Both Next.js AND Vite Scripts — Dual Build System

- **Description**: `packages/web/package.json` has scripts for BOTH Next.js (`next dev`, `next build`) AND Vite (`vite build`, `vite`). Having two build systems is confusing and increases maintenance burden.
- **Current vs Expected Behavior**: `npm run dev` uses Next.js, but `npm run dev:vite` uses Vite. The web app apparently migrated from Vite to Next.js but old scripts remain.
- **Flow**: New developer runs `npm run dev:vite` → different dev server → different behavior → confusion
- **Root Cause / Logic**: [web/package.json L6-17](file:///d:/projects/mcoode/packages/web/package.json#L6-L17) — both Next.js and Vite scripts present
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Remove Vite scripts and `@vitejs/plugin-react` dependency if Next.js is the canonical build system
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Remove Vite scripts
  - [ ] Remove Vite dev dependency
  - [ ] Document Next.js as canonical

---

## [DEBT-005] Web Package Has `react-router-dom` AND Next.js Routing — Conflicting Routing

- **Description**: The web package imports both `react-router-dom` (client-side routing) and uses Next.js App Router (`app/` directory structure). These are fundamentally different routing paradigms.
- **Current vs Expected Behavior**: Next.js App Router handles server-side routing, but `react-router-dom` may be used for client-side sub-navigation. This creates routing conflicts and SEO issues.
- **Flow**: Next.js handles page routing → react-router-dom handles sub-page navigation → URL mismatches possible
- **Root Cause / Logic**: [web/package.json L49](file:///d:/projects/mcoode/packages/web/package.json#L49) — `react-router-dom` dependency with Next.js
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Migrate all routing to Next.js App Router; remove `react-router-dom`
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Audit react-router-dom usage
  - [ ] Migrate to Next.js routing
  - [ ] Remove react-router-dom dependency

---

## [DEBT-006] Test Coverage Is Moderate But Missing Critical Path Tests

- **Description**: 20 test files exist in `packages/cli/tests/` covering orchestrator, planner, router, subagent, vault, etc. However, there are NO tests for: the watch daemon fix pipeline, the security module, the ship command, the env command, or the complete god-mode end-to-end flow.
- **Current vs Expected Behavior**: Core logic (planner, router) is tested. Critical paths (god-mode E2E, watch auto-fix, security) have zero test coverage.
- **Flow**: Ship command has a critical bug → no test catches it → broken release pushed
- **Root Cause / Logic**: Tests were added incrementally for some modules but not systematically
- **Affected Files**: `packages/cli/tests/`
- **Suggested Fix**: Add integration test for god-mode flow; add watch daemon fix pipeline tests; add ship command tests
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add god-mode E2E test
  - [ ] Add watch daemon test
  - [ ] Add ship command test
  - [ ] Add env command test

---

## [DEBT-007] `@mcode/shared` Has No `package.json` `main`/`exports` Field

- **Description**: The shared package is referenced as `"@mcode/shared": "*"` in dependencies but may lack proper `main` or `exports` field configuration for module resolution.
- **Current vs Expected Behavior**: Works in the monorepo via workspace resolution, but would break if published to npm independently.
- **Flow**: `import { EVENTS } from '@mcode/shared'` → workspace resolution → works. npm publish → no `main` → import fails.
- **Root Cause / Logic**: Package not configured for standalone use
- **Affected Files**: [`packages/shared/package.json`](file:///d:/projects/mcoode/packages/shared/package.json)
- **Suggested Fix**: Add proper `main`, `exports`, and `files` fields to shared package.json
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add proper package.json exports

---

## [DEBT-008] Web Package Mixes Redux Toolkit AND Zustand — Two State Management Libraries

- **Description**: `packages/web/package.json` includes both `@reduxjs/toolkit` + `react-redux` AND `zustand`. Having two state management libraries is confusing and increases bundle size.
- **Current vs Expected Behavior**: Some components use Redux, others use Zustand. State can't be easily shared between the two systems.
- **Flow**: Redux store has auth state → Zustand store has UI state → component needs both → two hooks, two patterns
- **Root Cause / Logic**: [web/package.json L26-27](file:///d:/projects/mcoode/packages/web/package.json#L26-L27) and [L56](file:///d:/projects/mcoode/packages/web/package.json#L56)
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Migrate to one state management solution (Zustand recommended for simplicity)
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Audit Redux vs Zustand usage
  - [ ] Migrate to single state management library

---

## [DEBT-009] `eslint-linter-browserify` in Web Dependencies — Unusual Package

- **Description**: `eslint-linter-browserify` is listed as a regular dependency (not dev). This is the ESLint linter compiled for browser use. It's likely used for the in-browser code editor linting feature but significantly increases the bundle size.
- **Current vs Expected Behavior**: ESLint's entire linting engine is shipped to the client browser, adding ~2MB+ to the JS bundle.
- **Flow**: User loads dashboard → downloads 2MB+ of ESLint → slow initial load
- **Root Cause / Logic**: [web/package.json L35](file:///d:/projects/mcoode/packages/web/package.json#L35)
- **Affected Files**: [`packages/web/package.json`](file:///d:/projects/mcoode/packages/web/package.json)
- **Suggested Fix**: Lazy-load ESLint linter only when the code editor is opened; use dynamic import
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Lazy-load eslint-linter-browserify
  - [ ] Measure bundle size impact

---

## [DEBT-010] No Changelog, Contributing Guide, or Architecture Documentation

- **Description**: The project has `GOD_MODE.md` and `ZCODE-KNOWLEDGE-BASE.md` but lacks standard OSS files: CHANGELOG.md, CONTRIBUTING.md, ARCHITECTURE.md.
- **Current vs Expected Behavior**: New contributors have no guide. Version history is unclear. Architecture decisions are undocumented.
- **Flow**: New developer wants to contribute → no guide → reads source code → makes wrong assumptions → PR rejected
- **Root Cause / Logic**: Documentation was not prioritized during development
- **Affected Files**: Root directory
- **Suggested Fix**: Add CHANGELOG.md (use conventional commits); CONTRIBUTING.md; ARCHITECTURE.md with module diagrams
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Create CHANGELOG.md
  - [ ] Create CONTRIBUTING.md
  - [ ] Create ARCHITECTURE.md with diagrams
