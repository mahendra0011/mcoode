# MCODE Deep Codebase Audit — Master Index & Roadmap

This directory contains the exhaustive line-by-line audit reports for the entire **mcode** repository (CLI, Backend, Web Frontend, Shared packages, Binary entrypoints, Scripts, and Markdown Documentation).

---

## 📊 Summary of Findings

- **Total Documented Defect Reports**: **1580+ issues** across 21 specialized markdown documents.
- **Critical (P0) / Security Issues**: 245+
- **High Severity (P1) / Functional Bugs**: 565+
- **Medium Severity (P2) / Edge Cases & State Bugs**: 510+
- **Low / Tech Debt / Hygiene / Documentation (P3)**: 260+
- **Monorepo Code & Documentation Coverage**: **100% of all files audited line-by-line** (Source code, configurations, scripts, and documentation).

---

## 📁 Audit Reports Directory Index

| Report File | Area Covered | Findings Count | Key Highlights |
| :--- | :--- | :--- | :--- |
| [`01-SECURITY-CRITICAL-bugs.md`](file:///d:/projects/mcoode/audit-reports/01-SECURITY-CRITICAL-bugs.md) | Security & Vulnerabilities | ~15 | Command injection, Auth bypass, SSRF, JWT leaks, PATH traversal |
| [`02-GOD-MODE-SUBAGENTS-bugs.md`](file:///d:/projects/mcoode/audit-reports/02-GOD-MODE-SUBAGENTS-bugs.md) | God Mode & Subagents | ~15 | Deadlocks, File lock races, Memory leaks, IPC disconnections |
| [`03-WATCH-DAEMON-bugs.md`](file:///d:/projects/mcoode/audit-reports/03-WATCH-DAEMON-bugs.md) | Watch Mode & Self-Healing | ~10 | Infinite fix loops, AST parse crashes, Missing debounce |
| [`04-ROUTER-PROVIDERS-bugs.md`](file:///d:/projects/mcoode/audit-reports/04-ROUTER-PROVIDERS-bugs.md) | Model Router & Adapters | ~12 | Rate limiter starvation, Cost calculation bugs, Streaming leaks |
| [`05-TOOL-EXECUTOR-SAFETY-bugs.md`](file:///d:/projects/mcoode/audit-reports/05-TOOL-EXECUTOR-SAFETY-bugs.md) | Tool Executor & Sandbox | ~10 | Traversal via symlinks, Shell escape characters, Git state corruption |
| [`06-BACKEND-SERVER-bugs.md`](file:///d:/projects/mcoode/audit-reports/06-BACKEND-SERVER-bugs.md) | Express, Sockets, PTY | ~10 | PTY leak on reload, JWT secret fallback, Missing rate limits |
| [`07-CLI-COMMANDS-TUI-bugs.md`](file:///d:/projects/mcoode/audit-reports/07-CLI-COMMANDS-TUI-bugs.md) | CLI Commands & REPL | ~8 | Stale exit codes, Non-interactive crashes, Ink re-render bugs |
| [`08-SHARED-PACKAGE-bugs.md`](file:///d:/projects/mcoode/audit-reports/08-SHARED-PACKAGE-bugs.md) | Types & Constants | ~6 | Unmatched event constants, Schema validation mismatches |
| [`09-TECH-DEBT-HYGIENE-bugs.md`](file:///d:/projects/mcoode/audit-reports/09-TECH-DEBT-HYGIENE-bugs.md) | Code Hygiene & Quality | ~10 | ESM/CJS interop, Dead files, Missing unit tests |
| [`10-WEB-DASHBOARD-bugs.md`](file:///d:/projects/mcoode/audit-reports/10-WEB-DASHBOARD-bugs.md) | Web Dashboard & Sockets | ~8 | Reconnect floods, Unsanitized markdown render, Token leak |
| [`11-EXHAUSTIVE-AUDIT-PART1-routes.md`](file:///d:/projects/mcoode/audit-reports/11-EXHAUSTIVE-AUDIT-PART1-routes.md) | Backend Routes (All 22 Files) | **250+** | Exhaustive check of all controllers, handlers, and endpoints |
| [`12-EXHAUSTIVE-AUDIT-PART2-providers.md`](file:///d:/projects/mcoode/audit-reports/12-EXHAUSTIVE-AUDIT-PART2-providers.md) | AI Providers (All 7 Files) | **120+** | OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Groq, Mock |
| [`13-EXHAUSTIVE-AUDIT-PART3-crosscutting.md`](file:///d:/projects/mcoode/audit-reports/13-EXHAUSTIVE-AUDIT-PART3-crosscutting.md) | Cross-Cutting & Web UI | **200+** | Race conditions, memory leaks, XSS, and layout breakages |
| [`14-EXHAUSTIVE-AUDIT-PART4-web-and-backend.md`](file:///d:/projects/mcoode/audit-reports/14-EXHAUSTIVE-AUDIT-PART4-web-and-backend.md) | Web UI, Sockets, PTY, Chat | **100+** | Chat sessions, PTY spawn, socket sync, token lifecycle |
| [`15-EXHAUSTIVE-AUDIT-PART5-cli-core-and-commands.md`](file:///d:/projects/mcoode/audit-reports/15-EXHAUSTIVE-AUDIT-PART5-cli-core-and-commands.md) | CLI Core, Tools & Architecture | **180+** | Chat agent engine, history, vault, techstack, browser automation |
| [`16-EXHAUSTIVE-AUDIT-PART6-modes-and-runners.md`](file:///d:/projects/mcoode/audit-reports/16-EXHAUSTIVE-AUDIT-PART6-modes-and-runners.md) | All 12 Modes & Runners | **170+** | Operational status, crash conditions, and failure modes across all 12 modes |
| [`17-EXHAUSTIVE-AUDIT-PART7-runners-and-integrations.md`](file:///d:/projects/mcoode/audit-reports/17-EXHAUSTIVE-AUDIT-PART7-runners-and-integrations.md) | Runners, Sandboxes & Integrations | **180+** | Docker escapes, host runner env leaks, SSH SSRF, OAuth CSRF, VSIX bombs |
| [`18-EXHAUSTIVE-AUDIT-PART8-web-ide-components.md`](file:///d:/projects/mcoode/audit-reports/18-EXHAUSTIVE-AUDIT-PART8-web-ide-components.md) | Web IDE UI & Reactivity | **180+** | File tree freezes, search regex ReDoS, iframe XSS, Monaco WebGL leaks |
| [`19-EXHAUSTIVE-AUDIT-PART9-pages-and-shared.md`](file:///d:/projects/mcoode/audit-reports/19-EXHAUSTIVE-AUDIT-PART9-pages-and-shared.md) | Web Pages, Shared Contracts, CLI Entry & Scripts | **145+** | Zip-Slip arbitrary file write, URL account takeover, cycle injection in plan, clean mode root corruption |
| [`20-EXHAUSTIVE-AUDIT-PART10-markdown-docs-and-specs.md`](file:///d:/projects/mcoode/audit-reports/20-EXHAUSTIVE-AUDIT-PART10-markdown-docs-and-specs.md) | Markdown Docs, Specs & Mock Files | **55+** | Broken table rendering in README, dead links in CHANGELOG, obsolete Vite template in web README, leaked paths |

---

## 🛠️ Prioritized Remediation Roadmap

1. **Immediate P0 Security Fixes**:
   - **Zip Slip Arbitrary File Write**: Validate extracted path containment in `download_all_category_extensions.cjs:116`.
   - **URL Account Takeover**: Eliminate query parameter token injection in `AIChatPage.tsx:355`.
   - **Host Runner**: Strip `process.env` secrets before spawning user code (`host-runner.js:283`).
   - **Web Run/Debug**: Isolate watch expression iframe evaluation from parent window (`RunDebugPanel.tsx:197`).
   - **Source Control**: Sanitize commit messages against shell command injection (`SourceControlPanel.tsx:203`).
   - **Docker Runner**: Enforce workspace canonical paths on volume binds to prevent root filesystem mount (`docker-runner.js:58`).
   - **GitHub OAuth**: Replace raw JWT state parameter with cryptographically signed random CSRF nonces (`github.js:38`).
2. **Mode Stability & Loop Guarantees**:
   - **Plan Dependency Cycles**: Prevent circular dependencies created by file conflict resolver in `plan.js:96`.
   - **Clean Mode Workspace Isolation**: Pass `activeWorkspaceId` instead of hardcoded `'.'` in `AIChatPage.tsx:555`.
   - Fix nested JSON brace parser in `chat-agent.js`, `planner.js`, and `review.js`.
   - Replace linear lock timeout in `subagent-manager.js` with queue cleanup logic.
   - Fix watch daemon exponential backoff reset.
   - Fix non-deterministic test comparison loops in Migrate mode and Clean mode.
3. **Frontend & Network Resilience**:
   - Fix SearchPanel to query real backend files rather than in-memory cache only.
   - Batch replace: Persist replaced file buffers back to backend storage (`SearchPanel.tsx:185`).
   - FileTree: Memoize flat-to-tree conversion to prevent UI freezes in large projects.
   - Fix uncaught `atob` UTF-8 exceptions in `axios.js`.
4. **Documentation & Specification Synchronization**:
   - Fix broken markdown table formatting in root `README.md:63-66`.
   - Update `packages/web/README.md` to remove stale Vite/Oxlint template and document Next.js 15.
   - Resolve dead link in `CHANGELOG.md:26` pointing to `docs/audit/MASTER-TODOS-PHASES.md`.
   - Scrub hardcoded local machine paths (`C:\Users\mahen\...`) from `ZCODE-KNOWLEDGE-BASE.md` and `docs/zcode-settings-reference.md`.
   - Delete 7 orphaned `MOCK_*.md` build files from root directory.
