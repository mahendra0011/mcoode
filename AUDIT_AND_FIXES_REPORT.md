# MCODE IDE & AI Engine: Browser E2E Audit & Fixes Report

> **Audit Date:** October 31, 2026  
> **Environment:** Real Google Chrome (Windows Desktop / CDP Playwright)  
> **Target Applications:** Next.js Web App (`http://localhost:3000`), Backend API & Socket Engine (`http://localhost:3100`), MongoDB (`mcode-mongo`), Redis (`mcode-redis`)  
> **Test Status:** **Initial E2E Suite: 14/14 Passed** · **MERN Stack E2E Suite: 8/8 Passed** · **Total: 22/22 Passed (100% Success, 0 Failures)**  

---

## 1. Executive Summary

This comprehensive audit was conducted in response to reported issues regarding:
1. **Chat Scrolling Rubber-Banding:** Chat jumps back up/down when scrolling up to read conversation history while streaming.
2. **Language Click Project Creation:** Clicking a language tile opened a raw file without asking the user for a project folder name, and folder/file creation threw 404/not found errors in the file tree.
3. **UI Visual Anomaly:** An unstyled black interface appeared showing only `v1.0.0` and a vertical column of return-arrow glyphs (`↵`).
4. **End-to-End Mode & Animation Verification:** Comprehensive browser testing of AI Chat, AI Code Assistant, and AI Code Editor across small and large projects.

All issues have been identified, fixed, and verified using automated headless Chrome tests with screenshots captured at every step.

---

## 2. Issues Identified & Resolutions

### Issue 1: Chat Scrolling Rubber-Banding & Snapping
* **Symptom:** When a user scrolls up to read earlier messages in chat while the AI is responding, the chat window violently jerks or snaps back to the top/bottom.
* **Root Cause Analysis:** `VirtualChatMessages.tsx` previously utilized `VariableSizeList` from `react-window` with an estimated row height of `140px`. Whenever a rendered message item mounted, a `ResizeObserver` reported its real rendered height and invoked:
  ```ts
  listRef.current?.resetAfterIndex(Math.max(0, index - 1), true);
  ```
  In `react-window`, `resetAfterIndex` clears the item offset cache, causing the scroll container's `scrollTop` to be recomputed and jerked to 0 or snap back down. In addition, token streaming updates unconditionally invoked:
  ```ts
  listRef.current?.scrollToItem(messages.length - 1, "end");
  ```
  regardless of whether the user was intentionally reading earlier messages.
* **Fix Applied:**
  1. Replaced `react-window` in [packages/web/src/components/chat/VirtualChatMessages.tsx](file:///d:/projects/mcoode/packages/web/src/components/chat/VirtualChatMessages.tsx) with a native, GPU-accelerated scroll container (`custom-scrollbar`).
  2. Implemented an `isScrolledUp` latch: if the user's scroll position is greater than `100px` from the bottom (`scrollHeight - scrollTop - clientHeight > 100`), streaming chunks **never** yank or modify the user's scroll position.
  3. Added an animated floating **"Latest"** button (with smooth scroll anchor) that appears only when scrolled up, allowing one-click return to the newest messages.
  4. Auto-scroll only triggers when the user is already near the bottom or submits a new prompt.

---

### Issue 2: Language Selection Project Folder Creation Modal
* **Symptom:** In the Welcome Tab, clicking on a language tile immediately created an ad-hoc starter file without asking the user what project folder name they wanted, and files could not be created cleanly in the tree.
* **Root Cause Analysis:**
  - `WelcomeTab.tsx` and `LanguagesPanel.tsx` lacked a modal prompt for workspace folder naming.
  - In `AIChatPage.tsx`, `handleProjectCreated` called `useIDEStore.getState().setOpenFiles(...)`, which did not exist on `IDEStore`, causing an uncaught `TypeError` that froze the creation modal on screen.
* **Fix Applied:**
  1. Created [packages/web/src/components/ide/CreateProjectModal.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/CreateProjectModal.tsx):
     - Displays selected language branding, extension badge, and starter file boilerplate preview.
     - Provides an interactive input for the project folder name (e.g., `python-small-project`, `react-fullstack-dashboard`).
     - Offers quick-switch pills for popular languages (Python, JS, TS, Go, Rust, C++, Java, HTML, Bash) plus a full 54+ language browser.
  2. Updated [packages/web/src/store/ideStore.ts](file:///d:/projects/mcoode/packages/web/src/store/ideStore.ts):
     - Added `setOpenFiles: (paths: string[]) => void` to both the `IDEStore` interface and implementation.
  3. Wired event bus `mcode:open-create-project` across:
     - [WelcomeTab.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/menu/WelcomeTab.tsx)
     - [LanguagesPanel.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/LanguagesPanel.tsx)
     - [ExplorerPanel.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/ExplorerPanel.tsx)
     - [IDEMenuBar.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/menu/IDEMenuBar.tsx) (File -> "New Project / Folder...")

---

### Issue 3: UI Visual Anomaly (`v1.0.0` Badge with Blank Screen & Glyphs)
* **Symptom:** User encountered a completely pitch-black screen showing only `v1.0.0` on the top-left and a vertical column of return-arrow glyphs (`↵`).
* **Root Cause Analysis:**
  1. **CSP Font Blocking:** The Content Security Policy in `packages/web/src/proxy.ts` previously lacked `https://fonts.googleapis.com` in `style-src` and `https://fonts.gstatic.com` in `font-src`. When Google Fonts (Plus Jakarta Sans, JetBrains Mono) were blocked, fonts failed to load and text collapsed into empty spaces while unicode symbol glyphs remained visible.
  2. **Unstyled Modal / History Stack:** An unmounted modal state rendered empty list items with shortcut badges (`↵`), appearing as a column of return arrows against the dark theme.
* **Fix Applied:**
  1. Updated [packages/web/src/proxy.ts](file:///d:/projects/mcoode/packages/web/src/proxy.ts) CSP headers:
     - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`
     - `font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`
  2. Added fallback font stacks in CSS and ensured all modal overlays have explicit background cards and keys for Framer Motion `<AnimatePresence>`.

---

### Issue 4: Mode Switch Modal Overlay Interception
* **Symptom:** When switching from AI Code Assistant to AI Code Editor, the mode switch modal backdrop remained in the DOM and intercepted pointer events to buttons underneath.
* **Fix Applied:**
  1. Converted the outer backdrop in [AIChatPage.tsx](file:///d:/projects/mcoode/packages/web/src/components/pages/AIChatPage.tsx) from a standard `<div>` to a `<motion.div>` with `exit={{ opacity: 0 }}` and a unique key.
  2. Updated `executeTabSwitch` to immediately dismiss the modal and activate the Welcome Screen or Editor.

---

### Issue 5: Folder Upload Temporal Dead Zone Error (`can't access lexical declaration 'uint8' before initialization`)
* **Symptom:** When uploading a project folder from disk or via drag-and-drop, the upload fails immediately with the error:
  ```
  can't access lexical declaration 'uint8' before initialization
  at zipFilesOffMainThread/</worker.onmessage/< (src/lib/zipInWorker.ts:66:29)
  ```
* **Root Cause Analysis:** In [packages/web/src/workers/zipWorker.js](file:///d:/projects/mcoode/packages/web/src/workers/zipWorker.js), `const uint8 = await zip.generateAsync(...)` was declared with `const`. However, inside the `zip.generateAsync` progress callback `(metadata) => { ... }`, the code checked:
  ```js
  if (metadata.percent === 100 && uint8.byteLength > MAX_ZIP_COMPRESSED_BYTES)
  ```
  Because JSZip executes the progress callback synchronously during the final step of generation **before** `await zip.generateAsync(...)` completes, the variable `uint8` was in the JavaScript **Temporal Dead Zone (TDZ)**. Any read access to `uint8` threw a `ReferenceError`, which was caught by `catch (err)` and forwarded to the main thread as a fatal upload failure.
* **Fix Applied:**
  1. In [packages/web/src/workers/zipWorker.js](file:///d:/projects/mcoode/packages/web/src/workers/zipWorker.js), removed `uint8` from inside the `generateAsync` progress callback. The progress callback now strictly reports `self.postMessage({ type: 'progress', percent: Math.round(metadata.percent) })`.
  2. Moved the compressed size validation (`if (uint8.byteLength > MAX_ZIP_COMPRESSED_BYTES)`) immediately after `await zip.generateAsync(...)`, where `uint8` is fully initialized and in scope.
  3. Added an automatic main-thread JSZip fallback in [packages/web/src/lib/zipInWorker.ts](file:///d:/projects/mcoode/packages/web/src/lib/zipInWorker.ts) so folder uploads never fail even if a worker crashes or encounters an environment error.
  4. Flushed Next.js cache and restarted the web service. Verified via automated browser testing that folder bundling and uploads complete smoothly without errors.

---

### Issue 6: Missing Return-to-Home Navigation from AI Chat & IDE Views
* **Symptom:** When in `/ai/chat` (Chat mode, AI Code Assistant, or AI Code Editor), the user had no way to navigate back to the main Home / Landing page (`/`). The top-left logo was static text, and there was no Home button.
* **Fix Applied:**
  1. **Top Header Logo & Brand:** Wrapped the `M CODE` logo image and brand title in `<Link href="/">` in [packages/web/src/components/pages/AIChatPage.tsx](file:///d:/projects/mcoode/packages/web/src/components/pages/AIChatPage.tsx).
  2. **Dedicated Header "Home" Button:** Added an explicit, styled **"Home"** button with a blue home icon right beside the logo (`<Link href="/">`), allowing one-click return to the landing page from any tab.
  3. **Sidebar Header & Footer Home Links:** Added Home links on the sidebar `MCODE` branding, a quick Home button in the sidebar header, and a Home button in the sidebar footer toolbar.
  4. **IDE Menu Bar:** Added `"Exit to Home Page"` under `File` in [packages/web/src/components/ide/menu/IDEMenuBar.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/menu/IDEMenuBar.tsx).
  5. Verified via automated browser testing (`scripts/test_home_navigation.mjs`) that clicking the Home button navigates directly to `http://localhost:3000/` without errors.

---

## 3. Automated Browser E2E Test Results

The test suite was executed using headless Google Chrome on `http://localhost:3000` via [scripts/comprehensive_test_suite.mjs](file:///d:/projects/mcoode/scripts/comprehensive_test_suite.mjs).

| # | Test Scenario | Mode / Component | Status | Details |
|---|---------------|-------------------|:------:|---------|
| 1 | **Landing Page Rendering** | Landing (`/`) | **PASS** | Title `mcode — terminal-first AI coding`, hero animations, and navigation rendered cleanly. |
| 2 | **Header Tabs Navigation** | Main Layout | **PASS** | `Chat`, `AI Code Assistant`, and `AI Code Editor` segmented controls visible and functional. |
| 3 | **AI Chat Token Streaming** | AI Chat (`/ai/chat`) | **PASS** | Prompt entered via sequential keystrokes, submitted via Enter; assistant response streamed. |
| 4 | **Chat Scroll-Up Stability** | AI Chat | **PASS** | Scrolled to top (`scrollTop: 0`) during streaming; **zero rubber-banding or jumping detected**. |
| 5 | **Model Selector Dropdown** | AI Code Assistant | **PASS** | Model dropdown opens and displays available models (Gemini, Claude, GPT, Llama, Auto). |
| 6 | **Slash Command Picker** | Chat / Assistant Input | **PASS** | Typing `/` triggers the command popover with keyboard navigation and description. |
| 7 | **AI Code Assistant Mode** | Assistant Mode | **PASS** | God Mode toggle, Clean Scan button, and project branch selector verified. |
| 8 | **Language Project Folder Modal** | AI Code Editor | **PASS** | Language tile triggers "Create Python Project" modal with custom folder input. |
| 9 | **Small Project Creation** | Workspace Engine | **PASS** | Project `python-small-project` created on server; Monaco editor loaded with `main.py`. |
| 10 | **Inline Folder Creation** | Explorer FileTree | **PASS** | Subfolder `algorithms` created inside workspace without 404/not found errors. |
| 11 | **Inline File Creation** | Explorer FileTree | **PASS** | File `sieve.py` created in `algorithms` folder and opened in Monaco editor. |
| 12 | **Large Project Creation** | File Menu -> Modal | **PASS** | Large project `react-fullstack-dashboard` created; workspace switched cleanly. |
| 13 | **IDE Menu Bar Functionality** | IDEMenuBar | **PASS** | `File` and `View` menus open smoothly with keyboard shortcuts and submenus. |
| 14 | **Bottom Panel Tabs** | BottomPanel | **PASS** | `Terminal` and `Problems` tabs switched and verified without layout shifts. |

---

## 4. Key Files Modified

1. **[packages/web/src/components/chat/VirtualChatMessages.tsx](file:///d:/projects/mcoode/packages/web/src/components/chat/VirtualChatMessages.tsx)**
   - Replaced buggy `react-window` with native scroll container.
   - Added `isScrolledUp` latch (>100px) and floating "Latest" scroll-to-bottom button.
2. **[packages/web/src/proxy.ts](file:///d:/projects/mcoode/packages/web/src/proxy.ts)**
   - Whitelisted `fonts.googleapis.com` and `fonts.gstatic.com` in Content Security Policy.
3. **[packages/web/src/components/ide/CreateProjectModal.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/CreateProjectModal.tsx)**
   - Created project folder creation modal with language selection, starter files, and error handling.
4. **[packages/web/src/store/ideStore.ts](file:///d:/projects/mcoode/packages/web/src/store/ideStore.ts)**
   - Added `setOpenFiles` to `IDEStore` interface and implementation.
5. **[packages/web/src/components/pages/AIChatPage.tsx](file:///d:/projects/mcoode/packages/web/src/components/pages/AIChatPage.tsx)**
   - Integrated project creation modal and fixed ModeSwitchModal Framer Motion backdrop unmounting.
6. **[packages/web/src/components/ide/menu/WelcomeTab.tsx](file:///d:/projects/mcoode/packages/web/src/components/ide/menu/WelcomeTab.tsx)**
   - Wired language cards to dispatch `mcode:open-create-project`.
7. **[scripts/comprehensive_test_suite.mjs](file:///d:/projects/mcoode/scripts/comprehensive_test_suite.mjs)**
   - Automated 14-step Playwright test runner using local Google Chrome with screenshot captures.

---

## 5. Verification Screenshots

All 16 high-resolution screenshots generated during the automated browser run are saved under:
`C:\Users\mahen\.gemini\antigravity-ide\brain\d009fafb-953e-4c35-98b1-4db21779890d\e2e_screenshots\`

- `01_landing_page.png` — Landing page with hero animations.
- `02_chat_page_initial.png` — AI Chat empty state with glowing input and model selector.
- `03_chat_response_stream.png` — Streaming AI response and scroll-up stability.
- `04_assistant_tab.png` — AI Code Assistant tab with project controls.
- `05_model_selector_open.png` — Model selector dropdown with dynamic providers.
- `05b_slash_command_picker.png` — Slash commands picker popover.
- `06_editor_welcome_tab.png` — Welcome Tab with 54+ languages.
- `07_create_project_modal.png` — "Create Python Project" folder naming modal.
- `08_project_created_monaco.png` — Project initialized in Monaco editor with starter code.
- `09_folder_created_in_tree.png` — New folder created in FileTree.
- `10_file_created_in_tree.png` — New file created in FileTree.
- `11_ide_menu_file_open.png` — IDE File menu dropdown with all options.
- `12_large_project_modal.png` — New project modal for large React dashboard project.
- `13_large_project_loaded.png` — Large React project initialized and active.
- `14_view_menu_open.png` — IDE View menu options.
- `15_terminal_panel.png` — Integrated terminal connected to workspace disk container.
- `16_problems_panel.png` — Problems tab showing diagnostic status.

---

## 6. MERN Stack Project & Modes Verification (Medium-Sized Fullstack Project)

To comprehensively test real-world fullstack development across all platform modes, an automated end-to-end MERN stack audit was executed using real Google Chrome ([scripts/test_mern_project_e2e.mjs](file:///d:/projects/mcoode/scripts/test_mern_project_e2e.mjs)).

### Project Specifications: `mern-taskflow-pro`
- **Backend (Node.js & Express):**
  - `server/server.js`: Express server initialization, middleware, routes mounting, MongoDB connection.
  - `server/models/Task.js`: Mongoose Schema with validation, timestamps, priority enums, and completion toggles.
  - `server/routes/tasks.js`: Async RESTful CRUD endpoints (`GET /`, `POST /`, error handlers).
- **Frontend (React & JSX):**
  - `client/src/App.jsx`: Fullstack TaskFlow stateful React dashboard.
  - `client/src/components/TaskCard.jsx`: Interactive card component with priority chips and completion status.
- **Documentation:**
  - `README.md`: Architecture overview, environment setup, and startup commands.

### All Tested Modes & Visual Themes

| Mode / Feature | Location | Status | Verified Functionality |
|---|---|:---:|---|
| **AI Chat Mode** | Header Nav (`/ai/chat`) | **PASS** | MERN architecture request streamed real-time markdown response without scroll jerking. |
| **AI Code Assistant Mode** | Header Nav (`/ai/chat`) | **PASS** | Agent turns sequence, model selector dropdown, God Mode toggle, prompt enhancer. |
| **AI Code Editor Mode** | Header Nav (`/ai/chat`) | **PASS** | Workspace tree, multi-tab Monaco editor, bottom panels, IDE menu bar. |
| **Project Creation Modal** | IDE Welcome & File Menu | **PASS** | "Create JavaScript Project" modal created `mern-taskflow-pro` workspace on server. |
| **FileTree Multi-Tier Sync** | Explorer Sidebar | **PASS** | Hierarchical creation of `server/models/`, `server/routes/`, `client/src/components/` without 404s. |
| **Monaco Multi-Tab Editing** | Monaco Editor Workspace | **PASS** | Opened `Task.js` (Mongoose) and `App.jsx` (React) simultaneously with accurate syntax highlighting. |
| **AI Assistance: Explain Mode** | Secondary Sidebar | **PASS** | Cyan badge & prompt context for code explanation and logic walkthroughs. |
| **AI Assistance: Agent Mode** | Secondary Sidebar | **PASS** | Emerald badge & prompt context for autonomous multi-step code generation. |
| **Integrated Terminal & Panels** | Bottom Dock | **PASS** | Terminal container attached to `/root/mcode-workspaces/<id>`, Problems panel active. |

### MERN E2E Screenshots
Saved under `C:\Users\mahen\.gemini\antigravity-ide\brain\d009fafb-953e-4c35-98b1-4db21779890d\e2e_screenshots\`:
- `mern_01_chat_architecture.png` — AI Chat Mode streaming full MERN architecture response.
- `mern_02_assistant_agent_mode.png` — AI Code Assistant Mode with model selector and project controls.
- `mern_03_project_created.png` — Project Creation Modal initialized `mern-taskflow-pro` with starter `server.js`.
- `mern_04_filetree_structure.png` — FileTree populated with complete multi-tier MERN stack hierarchy.
- `mern_05_editor_multitab.png` — Monaco Editor displaying multiple tabs with React JSX and Mongoose code.
- `mern_06_explain_mode.png` — Secondary sidebar active in `Explain` mode with cyan styling.
- `mern_07_agent_mode.png` — Secondary sidebar active in `Agent` mode with emerald styling.
- `mern_08_terminal_execution.png` — Integrated terminal and bottom panels connected to project workspace.

---

## 7. 3D Metallic MCODE Emblem Integration in Hero Section

The user requested using the 3D metallic glowing MCODE emblem (`C:\Users\mahen\Music\logo.png`) on the right side of the main landing page Hero section.

### Implementation Details:
- **Asset Deployment:** Copied high-res emblem to [packages/web/public/hero-logo.png](file:///d:/projects/mcoode/packages/web/public/hero-logo.png) and synced into `/app/packages/web/public/` within the Docker container.
- **Two-Column Responsive Layout:** Refactored the Hero section in [packages/web/src/components/pages/LandingPage.tsx](file:///d:/projects/mcoode/packages/web/src/components/pages/LandingPage.tsx):
  - **Left Column (7 cols):** Announcement badge (`mcode v2.4`), bold headline, subtitle, action buttons (`Get Started with CLI`, `Open Web IDE`, `Download Desktop App`), and the quick install command pill (`$ npm install -g mcode`).
  - **Right Column (5 cols):** Premium glassmorphic showcase card containing:
    - Floating micro-animation (`animate={{ y: [0, -6, 0] }}`).
    - Multi-layered glowing neon aura (electric cyan, purple, emerald gradient).
    - Status badges: `v2.4 Swarm Core` (pulsing green dot) and `Multi-Model Orchestration` (sparkles icon).
- **Screenshot:** Saved to `C:\Users\mahen\.gemini\antigravity-ide\brain\d009fafb-953e-4c35-98b1-4db21779890d\e2e_screenshots\18_hero_section_3d_logo.png`.

---

## 8. Vertically Stacked Alternating 3 Core Workspace Modes Showcase

Following user feedback to replace the tabbed switcher with a full vertically-stacked alternating showcase (*"ak ke neeche ak ker tu ak left ak right and ak right phir se and unke baju me text"*), the landing page was updated to render all three modes in high-impact alternating rows:

### Layout Arrangement:
1. **Row 1 — AI Chat (`#mode-section-chat`):**
   - **Left (7 cols):** Screenshot of AI Chat in macOS window frame with ambient emerald glow.
   - **Right (5 cols):** Badge `01 / Conversational Architecture`, title, headline, description, 4 capability cards, and `Launch AI Chat →` button.
2. **Row 2 — AI Code Assistant (`#mode-section-assistant`):**
   - **Left (5 cols):** Badge `02 / Autonomous Workflow`, title, headline, description, 4 capability cards, and `Launch AI Code Assistant →` button.
   - **Right (7 cols):** Screenshot of AI Code Assistant in macOS window frame with ambient purple glow.
3. **Row 3 — AI Code Editor (`#mode-section-editor`):**
   - **Left (5 cols):** Badge `03 / Cloud IDE & Terminal`, title, headline, description, 4 capability cards, and `Launch AI Code Editor →` button.
   - **Right (7 cols):** Screenshot of AI Code Editor in macOS window frame with ambient blue/cyan glow.

### E2E Screenshots Captured:
- `25_row1_chat_left_image.png` — AI Chat row (Image on Left, Text on Right).
- `26_row2_assistant_right_image.png` — AI Code Assistant row (Text on Left, Image on Right).
- `27_row3_editor_right_image.png` — AI Code Editor row (Text on Left, Image on Right).
- `28_modes_overview_stacked.png` — Continuous scroll overview showing the alternating sequence.



