# Plan: Remove the Design tab + all design-feature code (keep Chat & AI code Agent only)

## Goal
Remove the "Design" tab from the chat UI and delete every piece of design-related code across the frontend and backend, leaving only the two tabs: **Chat** and **AI code Agent**. All deletions are covered by git (reversible).

## Scope decision (flagged)
You said "uska code vagera sab" (all its code). I'm including the **backend** by default. If you'd rather keep the `/api/v1/design` API for any external client, just say so and I'll stop at the frontend. Otherwise this whole plan stands as the default.

## Files & exact changes

### Frontend (4 files)

**1. `packages/web/src/pages/AIChatPage.jsx`** (the UI tab surface)
- Remove `import { DesignTab } from '../components/ide/DesignTab'` (line 24).
- Tab switcher (line 596): `['Design', 'Chat', 'AI code Agent']` → `['Chat', 'AI code Agent']`.
- Active-pill `style` (lines 592–593): drop the `Design` branches and recompute positions for two tabs (Chat left=2, Agent left=62; widths 56/116).
- Button `style` width (line 603): drop the `Design` branch.
- Conditional render (lines 875–878): flatten `{activeTab === 'Design' ? <DesignTab/> : activeTab === 'Chat' && messages.length === 0 ? (empty) : (ide)}` to `{activeTab === 'Chat' && messages.length === 0 ? (empty) : (ide)}`. The agent tab correctly falls through to the IDE view.

**2. `packages/web/src/components/ide/DesignTab.jsx`** → **delete** (490 lines, only imported by AIChatPage).

**3. `packages/web/src/store/chatSlice.js`** (redux state)
- `initialState`: drop `designs: []`, `designStatus: 'idle'`, `designError: null` (lines 21–24).
- reducers: drop `setDesigns`, `removeDesign`, `setCurrentDesign`, `setDesignStreaming`, `setDesignStream`, `setDesignDone`, `setDesignError`, `clearDesign` (lines 234–278).
- `extraReducers`/exports: drop the 8 design action exports (lines 423–430).

**4. `packages/web/src/hooks/useChatSocket.js`** (socket + design API handlers)
- Remove design action imports (lines 21–27).
- Remove the `design:stream` / `design:done` socket listeners and their dispatchers, plus the `generateDesign` API call / socket-emit handler (the block around lines 222–233 and 415–472).

### Backend (4 files + delete)

**5. `packages/backend/src/routes/design.js`** → **delete**.

**6. `packages/backend/src/server.js`** — remove `import { designRoutes } from './routes/design.js'` (line 23) and `app.use('/api/v1/design', designRoutes({ secret }))` (line 114).

**7. `packages/backend/src/models.js`** — remove `designSchema` + `export const Design = mongoose.model('Design', designSchema)` (lines 154–205).

**8. `packages/backend/src/db.js`** — remove the `design: 'Design'` collection handle (line 91).

**9. `packages/backend/src/sockets.js`** — remove the `design:generate` handler and its comments (lines 62–70).

## What stays
- The web_search / web_fetch animation components, the SearchAnimation barrel, and the chatSlice `toolCallStarted` fix for auto-search — untouched.
- All Chat/Agent (IDE) tab logic, model selector, god-mode, export/push, etc. — untouched.

## Verification (after edits)
1. `npx vite build` (frontend) — must build with 0 errors.
2. `grep -rn "[Dd]esign" packages/web/src packages/backend/src` — confirm no dangling references (expecting zero in the removed areas).
3. Brief backend sanity check that `server.js` still imports/starts (no leftover identifiers).

## Out of scope
- No new features, no rework of the animation components, no backend feature changes.
- The pre-existing `isStreaming` memo lint hint in `MessageContent.jsx` is unrelated; I'll leave it.