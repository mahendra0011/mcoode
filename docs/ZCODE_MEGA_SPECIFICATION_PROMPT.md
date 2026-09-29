yrr mane na z code ke smart engine , icons , tootls etc add kiye the isme so tu dekh na working he ya nhi 100% sab and md file bana  de na agar tujhe kuch missing laga choti se choti mane jo details di he usse alag laga working nhi laga bugs mile jo usne fully working hone se rok rahe he ya kuch bhi ho uske liye md file bana dena detsils is and abhi cli ka nhi kerna he bas web ka kerna he poora code base ko deeply analysis kerna and md file me sab include kerna or alag folder me bnna md files jitni issues ho add kerna md file me 500 ho ya 1000 ya 10000 bhi no of line of md file ke limmit bhi nhi he koi jitni kerna chahe no of lines ke ho sakti he ec2, playwright, Unit Testing jo kerna ho ker mujeh starting to end tak 100% working chiye he agar nhi mila to me teri gaand faad dunga samjh gya na ?? ak ak cheej ke lye test likh verify ker sab working he ya nhi todos bana and kaam start ker

 # ZCode UX Animations — From Actual App Source

> ✅ Extracted directly from `ZCode/resources/app-extracted/out/renderer/assets/styles-BxSv8qTx.css` (Tailwind CSS v4.2.2 build). This documents **actual** animations ZCode uses — verified from the real app package.

---

## Data Attribute Animation Triggers

ZCode controls animations via data attributes on elements. Here are the actual selectors and their definitions:

### Stream Text Animation

```css
[data-zcode-tool-stream-animate=true],
[data-zcode-chat-loading-animate=true] {
  will-change: opacity;
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) both zcode-stream-text-in;
}

@keyframes zcode-stream-text-in {
  0% { opacity: 0; }
  /* fadeIn for streamed text — 900ms duration, easeOut cubic-bezier(.16, 1, .3, 1) */
}
```

**When it's active:** `data-zcode-stream-animate=true` also triggers the same animation
**When it's disabled:** `animation: none` is applied (for already-animated content)

### Stream Marker Animation

```css
[data-zcode-stream-marker-animate=true]::marker {
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--zcode-stream-animation-delay, 0s) both zcode-stream-marker-in;
}

@keyframes zcode-stream-marker-in {
  0% { color: #0000; }
  /* text color transition — 900ms with configurable delay via CSS variable */
}
```

### Collapsible Animation

```css
[data-zcode-collapsible-animate-close=true][data-state=closed] {
  animation: 0.3s ease-in-out forwards zcode-collapsible-up !important;
}

[data-zcode-collapsible-animate-close=true][data-state=closed] > * {
  animation: 0.3s ease-in-out forwards zcode-collapsible-fade-out !important;
}

@keyframes zcode-collapsible-up {
  0% { height: var(--radix-collapsible-content-height); }
  to { height: 0; }
}

@keyframes zcode-collapsible-fade-out {
  0% { opacity: 1; }
  to { opacity: 0; }
}
```

### Update Charge Sweep

```css
[data-slot=progress-indicator]:after {
  animation: 1.15s cubic-bezier(0.65, 0, 0.35, 1) infinite zcode-update-charge-sweep;
  transform: translate(-120%);
}

@keyframes zcode-update-charge-sweep {
  0% {
    opacity: 0.35;
    transform: translate(-120%);
  }
  /* charge sweep animation for update progress banners */
}
```

---

## Task Interaction Countdown

```css
.zcode-task-interaction-countdown-fill {
  animation: zcode-task-interaction-countdown var(--zcode-interaction-remaining-ms, 240s) linear forwards;
  transform: scaleX(var(--zcode-interaction-progress, 1));
}

@keyframes zcode-task-interaction-countdown {
  0% { transform: scaleX(var(--zcode-interaction-progress, 1)); }
  /* progress bar fill animation — uses CSS variables for dynamic control */
  /* --zcode-interaction-progress: 0-1 for fill percentage */
  /* --zcode-interaction-remaining-ms: duration in ms (default 240s) */
}
```

---

## Reaction Burst

```css
.zcode-reaction-burst {
  display: inline-flex;
  position: relative;
}

@keyframes zcode-reaction-particles {
  0% {
    opacity: 0;
    box-shadow: 7.7px 2.1px, 2.1px 7.7px, -5.7px 5.7px,
                -7.7px -2.1px, -2.1px -7.7px, 5.7px -5.7px;
  }
  /* 6 particles explosion from center, 7.7px radius */
}

@keyframes zcode-reaction-pop {
  0% { transform: scale(0); }
  /* pop-in scale animation for emoji reactions */
}
```

---

## Highlight Animations

### Task Search Result Highlight

```css
.task-search-result-highlight {
  animation: 1.2s ease-out both;
}

@keyframes task-search-result-highlight {
  0% {
    background-color: color-mix(in oklab, var(--color-brand) 20%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 28%, transparent);
  }
  /* brand color highlight that fades out over 1.2s */
}
```

### Workspace Remote Connecting

```css
.workspace-remote-connecting-breathe {
  /* Applied via animation */
}

@keyframes workspace-remote-connecting-breathe {
  0%, to {
    background-color: color-mix(in oklab, var(--color-brand) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 10%, transparent);
  }
  /* breathing pulse — brand color 10% tint, infinite loop */
}
```

### Browser Operation Breathe

```css
@keyframes browser-use-operation-breathe {
  0%, to {
    opacity: 0.5;
    transform: scale(0.9);
  }
  /* scale down to 90% + 50% opacity — subtle breathing for browser operations */
}
```

---

## Standard Tailwind Animations in ZCode

```css
.animate-spin     { animation: spin; }           /* 360° rotation */
.animate-ping     { animation: ping; }           /* scale up + fade */
.animate-pulse    { animation: pulse; }          /* opacity 50% at 50% */
.animate-in       { animation: enter; }          /* custom enter animation */
```

---

## Animation Timing Values (from CSS/JS)

| Animation | Duration | Easing/Curve | Variables |
|-----------|----------|--------------|-----------|
| Stream text in | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `--zcode-stream-animation-delay` |
| Stream marker | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `--zcode-stream-animation-delay` |
| Collapsible close | 300ms | `ease-in-out` | `forwards` |
| Task highlight | 1.2s | `ease-out` | `both` |
| Update sweep | 1.15s | `cubic-bezier(0.65, 0, 0.35, 1)` | `infinite` |
| Interaction countdown | Configurable | `linear` | `--zcode-interaction-remaining-ms` (240s default), `--zcode-interaction-progress` (0-1) |

---

## Framer Motion Patterns (from JS bundles)

ZCode uses Framer Motion for React-level animations:
- **Message appearance**: `initial={{ opacity: 0, y: 6 }}` → `animate={{ opacity: 1, y: 0 }}`
- **Duration**: 0.25s with `ease: [0.4, 0, 0.2, 1]` (standard easing)
- **Stagger**: `staggerChildren: 0.04` or `0.08` for lists
- **Hover**: `whileHover={{ scale: 1.02 }}` or `scale: 1.05`
- **Tap**: `whileTap={{ scale: 0.92 }}` or `scale: 0.98`
- **Spring pop**: `stiffness: 500, damping: 20` for checkmarks/reactions

---

## Startup Animation (from index.html)

```css
#root {
  opacity: 0;
  transition: opacity 0.16s ease;
}
body.zcode-startup-ready #root {
  opacity: 1;
}
#loading {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  transition: opacity 0.16s ease;
}
body.zcode-startup-ready #loading {
  pointer-events: none;
  opacity: 0;
}
```

- Root fade-in: 160ms ease
- Loading screen: fades out, removed after 500ms
- Logo shell animate: waits for `animationend` or 1000ms timeout

---

## Color Variables

```css
:root {
  --color-brand: #3b82f6;          /* Tailwind blue-500 */
  --zcode-interaction-progress: 1;
  --zcode-interaction-remaining-ms: 240000; /* 240 seconds */
  --zcode-stream-animation-delay: 0s;
}
```

---

## Animation Summary by UI Area

### Chat / IDE
- **Stream text**: `data-zcode-tool-stream-animate=true` → 900ms fade-in
- **Stream markers**: `::marker` with `data-zcode-stream-marker-animate=true` → 900ms with delay
- **Message appearance**: Framer Motion opacity+y slide, 250ms ease

### Tool Cards
- **Collapsible open/close**: 300ms ease-in-out, data attribute controlled
- **Search highlight**: 1.2s brand color tint fade
- **Task countdown**: Progress bar via CSS variable scaleX

### Updates
- **Progress indicator sweep**: 1.15s infinite cubic-bezier sweep
- **Reaction pop**: Spring from scale(0) to scale(1)

### Browser/Remote
- **Connecting breathe**: Infinite pulse with brand tint
- **Operation breathe**: Scale 0.9 + opacity 50%

### Startup
- **App logo/shell animation**: Waits for animationend or 1s timeout
- **Root fade-in**: 160ms ease transition
- **Loading overlay removal**: Fades out, removed after 500ms # ZCode Tools & Dependencies — From Actual App Source

> ✅ Extracted from `ZCode/resources/app-extracted/node_modules/` — actual installed packages in the ZCode Electron app.

---

## Core Frameworks & Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.x | UI rendering engine |
| `framer-motion` | 11.x | Animation library (primary) |
| `react-redux` | 9.x | State management |
| `redux` | 4.x | Redux store |
| `redux-thunk` | 3.x | Async Redux middleware |
| `zustand` | 5.x | Alternative lightweight state |
| `tailwindcss` | 4.2.2 | CSS framework |
| `@radix-ui` | latest | Headless UI primitives |
| `radix-ui` | latest | Headless UI primitives |

---

## UI Components & Styling

| Package | Purpose |
|---------|---------|
| `lucide-react` | Icon library (all icons used) |
| `tailwind-merge` | Tailwind class deduplication |
| `tailwind-scrollbar-hide` | Custom scrollbar hiding |
| `tw-animate-css` | Tailwind animation utilities |
| `class-variance-authority` | Component variant management |
| `clsx` | Conditional classnames |
| `motion` / `motion-dom` / `motion-utils` | Framer Motion internals |
| `shdncn` | ShadCN UI components (modified) |

---

## Code Editing & Display

| Package | Purpose |
|---------|---------|
| `lexical` | Rich text editor (Chat input formatting) |
| `react-resizable-panels` | Split-view pane resizing |
| `react-remove-scroll` | Scroll lock when modals open |
| `react-style-singleton` | CSS-in-JS style injection |
| `@xterm/xterm` | Terminal component |
| `highlight.js` | Syntax highlighting |
| `shiki` | Text-based syntax highlighting |
| `katex` | Math/LaTeX rendering |
| `mermaid` | Diagram generation |
| `echarts` | Chart visualization |
| `recharts` | React charting library |
| `zrender` | Canvas rendering for charts |

---

## Markdown & Content

| Package | Purpose |
|---------|---------|
| `remark-parse` | Markdown parser |
| `remark-rehype` | Markdown → HTML |
| `rehype-katex` | Math rendering |
| `rehype-raw` | Raw HTML in markdown |
| `rehype-sanitize` | XSS sanitization |
| `rehype-stringify` | HTML stringification |
| `remark-gfm` | GitHub Flavored Markdown |
| `remark-math` | Math in markdown |
| `mdast-util-*` | Markdown AST utilities |
| `hast-util-*` | HTML AST utilities |

---

## Terminal & Shell

| Package | Purpose |
|---------|---------|
| `node-pty` | Pseudo-terminal for shells |
| `xterm` | Terminal frontend |
| `ansi-to-react` | ANSI escape code parsing |
| `anser` | ANSI rendering |
| `cli-spinners` | Spinner animations |
| `cli-cursor` | Cursor utilities |

---

## File Operations & Git

| Package | Purpose |
|---------|---------|
| `fs-extra` | Enhanced file system |
| `node-fetch` | HTTP fetching |
| `axios` | HTTP client |
| `form-data` | FormData handling |

---

## Authentication & Security

| Package | Purpose |
|---------|---------|
| `jose` | JWT handling |
| `pkce-challenge` | OAuth PKCE |
| `bcrypt-pbkdf` | Password hashing |
| `cookie-signature` | Cookie signing |

---

## Visualization & Media

| Package | Purpose |
|---------|---------|
| `pdfjs-dist` | PDF rendering |
| `react-pdf` | React PDF component |
| `docx-preview` | DOCX preview |
| `qrcode` | QR code generation |
| `jszip` | ZIP file handling |
| `fflate` | Compression |
| `pngjs` | PNG manipulation |
| `utif` | TIFF/Flate support |
| `yazl` | ZIP creation |

---

## Remote & Connection

| Package | Purpose |
|---------|---------|
| `ws` | WebSocket (primary) |
| `socket.io-client` | Socket.IO |
| `xhr2` | XMLHttpRequest polyfill |
| `follow-redirects` | HTTP redirect following |
| `https-proxy-agent` | HTTPS proxy |
| `http-errors` | HTTP error utilities |
| `sshto` / `ssh2` | SSH connections |
| `is-docker` | Docker detection |

---

## Data Processing & Utilities

| Package | Purpose |
|---------|---------|
| `d3-*` | Data visualization toolkit |
| `lodash.*` | Utility functions |
| `fuzzysort` | Fuzzy search |
| `escape-html` | HTML escaping |
| `json5` | JSON5 parsing |
| `yaml` | YAML parsing |
| `csv-parse` | CSV parsing |

---

## AI & Agent Tools

| Package | Purpose |
|---------|---------|
| `ai` | AI SDK for LLM integration |
| `json-schema-typed` | Schema validation |
| `zod` | TypeScript validation |
| `zod-to-json-schema` | Schema conversion |

---

## Animation Libraries Used Together

ZCode uses a multi-layer animation approach:

1. **Framer Motion** — Primary animation library
   - Message appearing: `initial={{ opacity: 0, y: 6 }} → animate={{ opacity: 1, y: 0 }}`
   - Stagger children: `0.04s` delay per item
   - Hover effects: `whileHover={{ scale: 1.02 }}`
   - Tap effects: `whileTap={{ scale: 0.92 }}`

2. **CSS Animations** — For streaming and loading
   - `zcode-stream-text-in` — 900ms fade-in for stream chunks
   - `zcode-stream-marker-in` — 900ms marker animation
   - `zcode-collapsible-up` — 300ms collapse
   - `zcode-update-charge-sweep` — 1.15s infinite loop

3. **Tailwind Animations** — Utility classes
   - `animate-spin` — Loading spinner
   - `animate-pulse` — Loading placeholders
   - `animate-ping` — Notification pings

4. **Custom easing functions** (verified in CSS):
   - `cubic-bezier(0.16, 1, 0.3, 1)` — Apple-style "easeOut" (primary)
   - `cubic-bezier(0.4, 0, 0.2, 1)` — Standard easing
   - `cubic-bezier(0.65, 0, 0.35, 1)` — Update sweep animation
   - `spring(stiffness: 500, damping: 20)` — Pop-in effects

# ZCode UI Elements — From Actual App Source

> ✅ Extracted from `ZCode/resources/app-extracted/out/renderer/assets/styles-BxSv8qTx.css` and verified against installed packages.

---

## Platform-Specific Classes

```css
.platform-mac-desktop    { /* macOS specific styling */ }
.platform-windows-desktop { /* Windows specific styling */ }
.platform-linux-desktop  { /* Linux specific styling */ }
```

Applied to `document.documentElement` based on `navigator.userAgent`.

---

## Theme System

```css
.theme-zai-light  { /* Light theme */ }
.theme-zai-dark   { /* Dark theme — default */ }
.dark             { /* Tailwind dark mode class */ }
```

Theme switching controlled via:
- `localStorage.getItem('zcode-theme')` → `'system' | 'light' | 'dark' | 'zai-light' | 'zai-dark'`

---

## Core UI Element Classes

### Accent Body

```css
.accent-body {
  /* Base body wrapper with accent styling */
}
```

### Browser View Components

```css
.browser-use-viewport {
  /* Container for web preview/browser interactions */
}

.browser-use-operation-breathe {
  animation: 0.9s cubic-bezier(.16,1,.3,1) both browser-use-operation-breathe;
}

@keyframes browser-use-operation-breathe {
  0%, to {
    opacity: .5;
    transform: scale(.9);
  }
}
```

### Task Elements

```css
.task-search-result-highlight {
  animation: 1.2s ease-out both task-search-result-highlight;
}

@keyframes task-search-result-highlight {
  0% {
    background-color: color-mix(in oklab, var(--color-brand) 20%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 28%, transparent);
  }
}

.task-title-marquee-track {
  will-change: transform;
}
```

### Workspace Elements

```css
.workspace-remote-connecting-breathe {
  /* Applied via animation */
}

@keyframes workspace-remote-connecting-breathe {
  0%, to {
    background-color: color-mix(in oklab, var(--color-brand) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 10%, transparent);
  }
}
```

### Update Elements

```css
.zcode-update-charge-progress {
  /* Progress bar for update downloads */
}

[data-slot=progress-indicator]:after {
  animation: 1.15s cubic-bezier(.65,0,.35,1) infinite zcode-update-charge-sweep;
  transform: translate(-120%);
}
```

### Terminal Elements

```css
.terminal-xterm-shell {
  /* Terminal container */
}

.xterm, .xterm-*, .xterm-screen {
  /* xterm.js terminal styling — using @xterm/xterm package */
}
```

### Markdown Rendering

```css
.prose, .prose-sm {
  /* Tailwind Typography for markdown content */
}

.katex, .katex-display {
  /* Math/LaTeX rendering */
}
```

---

## Data Attributes for UI Control

```css
/* PPTX rendering surface */
[data-zcode-pptx-render-surface] {
  scrollbar-width: none;
}
[data-zcode-pptx-render-surface] ::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

/* Stream animations — text fade-in */
[data-zcode-stream-animate=true],
[data-zcode-tool-stream-animate=true],
[data-zcode-chat-loading-animate=true] {
  will-change: opacity;
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) both zcode-stream-text-in;
}

/* Stream marker animation */
[data-zcode-stream-marker-animate=true]::marker {
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--zcode-stream-animation-delay, 0s) both zcode-stream-marker-in;
}

/* Collapsible animations */
[data-zcode-collapsible-animate-close=true][data-state=closed] {
  animation: 0.3s ease-in-out forwards zcode-collapsible-up !important;
}
[data-zcode-collapsible-animate-close=true][data-state=closed] > * {
  animation: 0.3s ease-in-out forwards zcode-collapsible-fade-out !important;
}

/* Reset animations when already applied */
[data-zcode-stream-animate=true],
[data-zcode-tool-stream-animate=true],
[data-zcode-chat-loading-animate=true],
[data-zcode-collapsible-animate-close=true][data-state=closed],
[data-zcode-collapsible-animate-close=true][data-state=closed] > * {
  animation: none;
}
[data-zcode-stream-marker-animate=true]::marker {
  animation: none;
}
```

---

## Layout Components

### Scrollbar Styling

```css
.scrollbar-hide {
  /* Custom scrollbar hiding */
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### Split View Panes

Using `react-resizable-panels` for:
- Left sidebar (workspace explorer)
- Main content area
- Right panel (AI chat / tool results)
- Bottom terminal

---

## Animation Duration & Timing Reference

| Element | Animation | Duration | Easing | Trigger |
|---------|-----------|----------|--------|---------|
| Stream text | `zcode-stream-text-in` | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `data-zcode-stream-animate` |
| Stream marker | `zcode-stream-marker-in` | 900ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `data-zcode-stream-marker-animate` |
| Collapsible close | `zcode-collapsible-up` | 300ms | `ease-in-out` | `data-zcode-collapsible-animate-close` |
| Collapsible child | `zcode-collapsible-fade-out` | 300ms | `ease-in-out` | Child of collapsible |
| Update sweep | `zcode-update-charge-sweep` | 1.15s | `cubic-bezier(0.65, 0, 0.35, 1)` | `infinite` |
| Task highlight | `task-search-result-highlight` | 1.2s | `ease-out` | Search results |
| Browser breathe | `browser-use-operation-breathe` | 0.9s | `ease-in-out` | Browser operations |
| Connecting pulse | `workspace-remote-connecting-breathe` | Infinite | — | Remote workspace |
| Startup fade | `#root` opacity | 160ms | `ease` | App startup |

---

## Framer Motion Component Animations

### Message Appearance

```jsx
// ChatMessage component
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1],
    delay: idx * 0.02
  }}
/>
```

### Button Interactions

```jsx
<motion.button
  whileHover={{ scale: 1.02 }}  // Subtle hover
  whileTap={{ scale: 0.98 }}    // Press down
/>
```

### Tab Navigation

```jsx
<motion.button
  whileHover={{ scale: activeTab === tab ? 1 : 1.05 }}  // Larger hover for inactive
  whileTap={{ scale: 0.95 }}
/>
```

### Step/Stagger Animations

```jsx
// Parent container
<motion.div
  variants={{
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } }
  }}
  initial="hidden"
  animate="show"
>
  {/* Children use: initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} */}
</motion.div>
```

---

## Startup Loading Animation

From `index.html`:

```css
#root {
  opacity: 0;
  transition: opacity 0.16s ease;
}
body.zcode-startup-ready #root {
  opacity: 1;
}
#loading {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.16s ease;
}
body.zcode-startup-ready #loading {
  pointer-events: none;
  opacity: 0;
}
```

### Logo Shell Animation

```css
.startup-logo-shell {
  position: relative;
  display: flex;
  width: 96px;
  height: 96px;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(180deg, #000000 0%, #151718 100%);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2);
}
```

Startup sequence:
1. Logo shell animation plays
2. On `animationend` OR after 1000ms timeout → shows app
3. After 500ms → removes loading overlay

---

## UI Element Color Variables

```css
:root {
  --color-brand: #3b82f6;     /* Primary brand color (Tailwind blue-500) */
  --color-bg: #0d0e12;        /* Main background */
  --color-panel: #16171d;     /* Panel background */
  --color-border: #26272f;    /* Border color */
  --color-text: #e6e6ea;      /* Primary text */
  --color-text-dim: #8b8d98;  /* Dimmed text */
  --color-green: #3ecf8e;     /* Success/green */
  --color-red: #ff6b6b;       /* Error/red */
  --color-yellow: #f5c451;    /* Warning/yellow */
}
```
# ZCode — Exact UI/Animation/Color Spec (Source of Truth)

This document is the single source of truth for how the chat "processing" UI
(thinking indicator, tool-call cards, status sequence) and its colors/icons
must behave. Every component listed under "Files to audit" must be checked
against this spec — anything that doesn't match is a bug, not a stylistic
choice.

---

## 1. Core principle: NEVER fabricate progress

The #1 rule that was being violated before this fix:

> The UI must only ever display a status/phase that reflects something the
> backend actually told it, via a real socket event. It must never invent a
> phase on a local timer (e.g. "show X after 2.2s, Y after 4.8s") because
> that drifts out of sync with what's actually happening and looks broken
> the moment a response is faster or slower than the hardcoded timing.

Concretely:
- `AgentActionSequence` (`components/chat/AgentActionSequence.tsx`) shows
  ONLY: a pulse dot, brain icon, the word "Thinking" (or a real
  `statusLabel` if one is passed in from actual backend state), a spinner,
  and an elapsed-time counter. Nothing else. It disappears the instant a
  real message (stream chunk, tool call, done) arrives.
- Real progress (file read, file write, shell run, web search, todo plan)
  is rendered ONLY by components that are driven directly by a socket
  event payload: `ToolCallCard`, `SearchResultBlock`, todo-plan UI. These
  must never be duplicated or paraphrased by `AgentActionSequence`.

## 2. Status/processing pipeline (what should visually appear, in order)

This is driven end-to-end by real socket events. The correct sequence a
user should see for an **agent-mode** turn that needs tools:

| Step | Trigger (real backend event) | UI shown |
|---|---|---|
| 1 | User sends message (`chat:send` emitted) | `AgentActionSequence`: "Thinking" + spinner + 0s→Ns timer |
| 2 | `chat:todo_plan` (only if `promptNeedsPlanning`) | Todo/plan list renders above the thinking indicator |
| 3 | `chat:tool_call` (status: running) | A new `ToolCallCard` appears (icon per tool type, see §4), thinking indicator stays visible below it |
| 4 | `chat:tool_call` (status: done) for same `replaceKey` | That `ToolCallCard` flips to its "done" visual state in place (no duplicate card) |
| 5 | `chat:stream` (first chunk) | Thinking indicator is removed; streamed assistant text begins rendering |
| 6 | `chat:done` | Streaming cursor removed, `isStreaming=false`, file-tree refresh event fires |

For a **plain chat-mode** turn with no tools needed: only steps 1, 5, 6 occur —
the thinking indicator must disappear the instant the first stream chunk
arrives. It must never persist alongside streamed text.

### Known failure modes this fixes
- **"Ruk jaata hai" (looks stuck):** happened when the local timer inside
  `AgentActionSequence` kept counting/rendering an invented phase
  independent of whether `chat:done`/`chat:stream` had already fired.
  Fixed by removing invented phases entirely — the component is now a pure
  function of elapsed time + optional real label, and `showThinkingIndicator`
  (in `AIChatPage.tsx`) is the only thing controlling whether it renders at
  all.
- **"Order galat aata hai":** happened because "Analyzing workspace" was
  hardcoded to appear at exactly 2.2s regardless of whether workspace
  analysis was actually happening at that moment. Fixed by never claiming a
  specific activity unless it's echoing a real event.

## 3. Color tokens — single source of truth

Defined in `packages/web/src/styles/index.css` (`:root`):

| Token | Value | Meaning | Use for |
|---|---|---|---|
| `--mcode-bg` | `#0d0e12` | App background | Page/panel backgrounds |
| `--mcode-panel` | `#16171d` | Elevated surface | Cards, modals |
| `--mcode-border` | `#26272f` | Hairline border | Card/panel borders |
| `--mcode-text` | `#e6e6ea` | Primary text | Body text |
| `--mcode-text-dim` | `#8b8d98` | Secondary text | Captions, timestamps |
| `--mcode-accent` | `#6c8cff` | Info/link accent (blue) | Links, informational highlights only |
| `--mcode-green` | `#3ecf8e` | **Primary action/success accent** | Spinners, active state, success, brain icon, pulse dot, all "processing" UI |
| `--mcode-red` | `#ff6b6b` | Error/danger | Errors, destructive actions, failed tool calls |
| `--mcode-yellow` | `#f5c451` | Warning | Warnings, pending/needs-review states |

### Rule for the chat "processing" surface specifically
Everything under `components/chat/*` that represents **live agent
processing** (spinner, pulse, brain icon, tool-call running state) MUST use
`--mcode-green` / `text-emerald-400` (Tailwind emerald-400/500 map to this
token). Do not introduce blue/purple/cyan/amber into the live-processing
path — those are reserved for:
- `--mcode-accent` (blue) → informational, non-agent UI (links, badges)
- `--mcode-red` → errors/failures only
- `--mcode-yellow` → warnings/pending only
- Purple/cyan/other Tailwind colors seen in `components/ide/*` and
  `components/mcode/*` dashboard tabs → these are **settings/dashboard**
  screens, not the live chat pipeline, and may keep category-specific
  accent colors (e.g. security = red/amber, tests = purple) as long as
  they don't bleed into the chat processing indicator itself.

**Action item:** any `text-blue-400`, `text-purple-400`, `text-amber-400`,
`text-cyan-400` etc. found specifically inside `components/chat/*` files
that render live agent-processing state (not error/warning states) should
be replaced with `text-emerald-400` / `var(--mcode-green)`.

## 4. Icon mapping (must match exactly — `mcodeUX.tsx`)

```
ICONS = {
  explored: FolderSearch,   // read_file, list_files, search_code, default
  searched: Search,         // web_search, web_fetch
  ran: Terminal,            // run_shell, run_tests
  wrote: FileText,          // write_file
  updated: Pencil,          // edit_file
}
```
Fallback: unknown tool type → `FolderSearch`.

All icons in this map render at `size={14}` with `className="text-emerald-400"`
inside `ToolCallCard`. Do not vary this per tool — the icon color is constant
(emerald); only the icon shape changes per tool type.

### Other fixed icon/color pairs
| Component | Icon | Color | Notes |
|---|---|---|---|
| `AgentActionSequence` brain icon | `BrainCircuit` | emerald (`var(--mcode-green)`) | size 15 |
| `StepPulse` | CSS dot | emerald | 6×6px, 1.1s ease-in-out infinite pulse |
| `SpinnerBlock` (processing context) | `● ◐ ◓ ◑ ◒` | emerald | 80ms frame interval — do not change rate |
| User avatar (agent mode) | `M` text badge | emerald text on emerald/10 bg | 6×6 circle |
| Assistant avatar | `M` text badge | white/60 text, white/10 border | 5×5 circle |
| Streaming cursor | inline block | emerald bg | 1.5×3.5px, blinking |

## 5. Animation timing (must match exactly)

| Animation | Duration/Rate | Easing |
|---|---|---|
| Spinner frame rotation | 80ms per frame (5 frames) | linear (interval-based) |
| StepPulse dot | 1.1s | ease-in-out, infinite |
| Message/phase enter | 0.2–0.25s | `[0.4, 0, 0.2, 1]` (cubic-bezier) |
| Stream text fade-in (`mcode-stream-text-in`) | 0.9s | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Collapsible open/close | 0.3s | ease-in-out |
| Reaction burst pop | 250ms | CSS keyframe |
| Reaction particle radiate | 500ms | 60° stagger |

Do not introduce new arbitrary durations — reuse these exact values so every
part of the app feels like one consistent system, not a patchwork.

## 6. Files to audit against this spec (chat live-processing path only)

Priority order — audit and fix in this sequence, one file at a time, testing
visually after each (`npm run dev`) before moving to the next:

1. `components/chat/AgentActionSequence.tsx` — ✅ fixed (this session)
2. `components/chat/mcodeUX.tsx` (`ToolCallCard`, `StepPulse`) — verified emerald-consistent already
3. `components/chat/SpinnerBlock.tsx` — component itself is fine (parameterized); audit *callers* to ensure processing-context calls pass `color="emerald"`
4. `components/chat/ThinkingIndicator.tsx` — legacy component; confirm it's unused in the Chat tab (per `docs/zcode-icons-reference.md`) or remove if dead code
5. `components/chat/ThoughtBlock.tsx`
6. `components/chat/MessageContent.tsx` — contains off-spec blue/purple; check which are legitimate (code syntax highlighting, links) vs. processing-state leakage
7. `components/chat/CleanupReport.tsx`
8. `components/ide/WaveProgress.tsx` — used by God Mode wave visualization; confirm colors intentional (multi-agent = ok to differentiate) vs accidental

Everything under `components/mcode/*` (Mcode**Tab.tsx files) is the
**settings/dashboard** UI, not the live chat pipeline — lower priority,
audit only if user reports those screens specifically look inconsistent.

## 7. Non-web scope note

Per explicit instruction: **CLI is out of scope for this pass.** Only
`packages/web` is being audited/fixed. `packages/cli` animations
(terminal ticker, `blocks.jsx` spinner) are a separate, later pass.
# ZCode Icons Reference

Complete documentation of all icons used in the ZCode application, including tool type mappings, key component icons, icon color variables, and where each icon renders in the UI.

---

## 📁 Icon Source

All icons come from the `lucide-react` library (v0.469.0). Custom ZCode-specific icons (like the app logo) are rendered as text or inline SVG.

```typescript
// Standard import pattern
import { BrainCircuit, Sparkles } from 'lucide-react';

// Aliased imports (for same-named icons from different libraries)
import { Terminal as TerminalIcon } from 'lucide-react';
```

---

## 🎯 Tool Type Icon Mapping (mcodeUX.tsx)

The `ICONS` object in `packages/web/src/components/chat/mcodeUX.tsx` maps tool execution types to their Lucide icons. This is used by `ToolCallCard` to display the appropriate icon next to each tool name:

| Tool Type Key | Lucide Icon | Used For |
|---------------|-------------|----------|
| `explored` | `FolderSearch` | `read_file`, `list_files`, `search_code`, default tool type |
| `searched` | `Search` | `web_search`, `web_fetch` |
| `ran` | `Terminal` | `run_shell`, `run_tests` |
| `wrote` | `FileText` | `write_file` |
| `updated` | `Pencil` | `edit_file` |

**Fallback**: If a tool type is not found in the `ICONS` map, `FolderSearch` is used as the default.

### Component Usage

```typescript
// In ToolCallCard (mcodeUX.tsx)
const Icon = (ICONS[type as IconKey] ?? FolderSearch);
// Renders as: <Icon size={14} className="text-emerald-400" />
```

```typescript
// In StepCard (StepCards.tsx), the type is derived from the tool:
// read_file → type='explored' → FolderSearch
// web_search → rendered via WebSearchAnimation (bypasses StepCard)
// web_fetch → rendered via WebFetchAnimation (bypasses StepCard)
// write_file → type='wrote' → FileText
// edit_file → type='updated' → Pencil
// run_shell → type='ran' → Terminal
// list_files/search_code → type='searched' → Search
```

---

## 🧠 Key Component Icons

### ThinkingIndicator / AgentActionSequence

| Component | Icon | Color | Size | Purpose |
|-----------|------|-------|------|---------|
| `ThinkingIndicator` | `BrainCircuit` | `text-white/40` (Tailwind class) | `w-4 h-4` | Brain icon next to "Thinking..." gradient text |
| `AgentActionSequence` | `BrainCircuit` | `var(--mcode-green, #3ecf8e)` | `size={14}` | Brain icon next to "Working for Xs" timer |
| `AgentActionSequence` | `StepPulse` (custom) | `var(--mcode-green, #3ecf8e)` | 6×6px circle | Emerald pulsing dot (CSS animation: 1.1s ease-in-out infinite) |

**Note:** The Chat tab uses `AgentActionSequence` (which includes `BrainCircuit` in emerald green). The `ThinkingIndicator` component still exists (`components/chat/ThinkingIndicator.tsx`) but was replaced by `AgentActionSequence` in the Chat tab.

### SpinnerBlock

| Element | Icon/Symbol | Color | Animation | Purpose |
|---------|-------------|-------|-----------|---------|
| Spinner frame | `● ◐ ◓ ◑ ◒` | `text-emerald-400` | 80ms interval rotation | IDE spinner (5 frames at 80ms intervals) |
| Label | Text | Same as spinner | — | "Running…" (tool) or "Ready…" (empty state) |

### ReactionBurst

| Element | Icon/Symbol | Color | Animation | Purpose |
|---------|-------------|-------|-----------|---------|
| Pop icon | Dynamic (`✓`, `✗`) | `text-emerald-400` | CSS `mcode-reaction-pop` keyframe (250ms) | Primary burst emoji |
| 6 particles | 1×1px circles | `bg-emerald-400` | Stagger + radiate (500ms, 60° separation) | Particle explosion ring |

### ChatMessage

| Context | Icon | Color | Size | Purpose |
|---------|------|-------|------|---------|
| User avatar | `M` (text badge) | `text-emerald-400` bg `bg-emerald-500/10` | 6×6 circle | User message avatar in agent mode |
| Assistant avatar | `M` (text badge) | `text-white/60` bg `border-white/10` | 5×5 circle | Assistant message avatar |
| Streaming cursor | Inline block | `bg-emerald-400` | 1.5×3.5px | Blinking cursor at end of streaming text |
| Tool accordion | `Cpu` or `Wrench` | `text-emerald-400` or `text-white/50` | `w-3.5 h-3.5` | Running status indicator in ToolCallAccordion |

---

## 🎨 Icon Color Variables

Icons in the ZCode app use CSS custom properties defined in `styles/index.css`:

| Variable | Value | Used For |
|----------|-------|----------|
| `--mcode-green` | `#3ecf8e` | StepPulse, BrainCircuit in AgentActionSequence, spinner color, accent elements |
| `--mcode-text-dim` | `#8b8d98` | Dim secondary text and icons (less prominent) |
| `--mcode-accent` | `#6c8cff` | Primary accent (links, active states) |
| `--mcode-text` | `#e6e6ea` | Primary text |
| `--mcode-border` | `#26272f` | Border colors |

### Tailwind Color Overrides

| Tailwind Class | Hex | Usage |
|----------------|-----|-------|
| `text-emerald-400` | `#38b383` | Icons, spinner text, success states |
| `text-emerald-500` | `#10b981` | Active toggles, success accents |
| `text-emerald-300` | `#6ee7b7` | Active toggle text |
| `text-emerald-500/10` | rgba(16, 185, 129, 0.1) | Avatar backgrounds |
| `text-blue-400` | `#60a5fa` | Blue context info |
| `text-purple-400` | `#a78bfa` | Purple context info |
| `text-amber-400` | `#fbbf24` | Amber context info |
| `text-red-400` | `#f87171` | Error states |

---

## 📋 Full Icon Inventory (All Icons Used in Codebase)

### Sidebar / Navigation
| Icon | Component | Purpose |
|------|-----------|---------|
| `Settings` | SettingsPage, SIDEBAR_SECTIONS | Settings page navigation |
| `Database` | SettingsPage | Data & Statistics section |
| `Users` | SettingsPage | Agent Capabilities section |
| `GitBranch` | SettingsPage, AIChatPage | Plugins & MCP section, branch dropdown |
| `Key` | SettingsPage, McodeMcpTab | API Keys / model providers |
| `Globe` | SettingsPage | Network & System section |
| `BarChart3` | SettingsPage | Usage stats |
| `Shield` | McodeMcpTab, McodeSettingsTab | Permissions / security |
| `Layers` | McodeArchitectureTab, AIChatPage | Architecture / view layers |
| `Activity` | McodeSettingsTab, AIChatPage | Activity/waves indicator |
| `Cpu` | McodeDependenciesTab, AIChatPage | CPU/tools indicator |
| `Terminal` | McodeDependenciesTab, StepPulse | Terminal / shell |
| `FileText` | McodeDependenciesTab | File/document type |
| `Cloud` | McodeMcpTab | Cloud/remote |
| `Server` | McodeMcpTab | Server configuration |
| `Plug` | McodePluginsTab | Plugin connection |

### Chat & AI
| Icon | Component | Purpose |
|------|-----------|---------|
| `BrainCircuit` | ThinkingIndicator, AgentActionSequence, ThoughtBlock | Brain/thinking indicator |
| `CircleDashed` | ThoughtBlock | Collapsed thought state |
| `ChevronRight` | ThoughtBlock, StepCards | Expand/collapse chevron |
| `ChevronDown` | AIChatPage, SettingsPage | Dropdown indicators |
| `Sparkles` | AIChatPage | AI/sparkle effects |
| `Play` | SparkleButton, WaveProgress | Play/watch mode |
| `Pause` | SparkleButton | Pause watch mode |
| `Send` | AIChatPage, mcodeUX | Send message button |
| `Paperclip` | mcodeUX | Attach file |
| `ShieldCheck` | mcodeUX | Shield/permission |
| `Search` | AIChatPage, StepCards | Search functionality |
| `Copy` | MessageContent, StepPulse | Copy to clipboard |
| `Check` | MessageContent | Copied confirmation |
| `Loader2` | AIChatPage | Loading spinner (upload, etc.) |
| `ArrowUpRight` | StepPulse | Flow/indicator |
| `ArrowDownRight` | StepPulse | Flow/indicator |
| `MousePointerClick` | AIChatPage | Computer use click |
| `Workflow` | AIChatPage | Workflow/god mode |
| `Zap` | AIChatPage, McodeGitToolsTab | God mode activation |
| `Rocket` | AIChatPage | Launch/deploy |
| `Clock` | AIChatPage, StepPulse | Time/duration |
| `CheckCircle` | StepPulse, AIChatPage | Success state |
| `CheckCircle2` | StepPulse | Success state (alt) |
| `AlertCircle` | AIChatPage | Warning/error |
| `AlertTriangle` | AIChatPage | Alert |
| `X` | AIChatPage, SettingsPage | Close/clear |
| `XCircle` | StepPulse | Error state |
| `Eye` / `EyeOff` | SettingsPage | Show/hide password |
| `Trash2` | SettingsPage | Delete |
| `Edit2` | SettingsPage | Edit |
| `Plus` | AIChatPage | Add |
| `Box` | AIChatPage | Settings box |
| `RefreshCw` | SettingsPage, AIChatPage | Refresh/reload |
| `ExternalLink` | McodeMcpTab | External link |
| `UploadCloud` | AIChatPage | Upload folder |
| `FolderUp` | AIChatPage | Folder upload |
| `Monitor` | AIChatPage | Monitor/system |
| `Mail` | SettingsPage | Email/account |
| `CalendarCheck` | StepPulse | Calendar/checked |
| `Users` | StepPulse | Users |
| `ToggleLeft` / `ToggleRight` | McodeSettingsTab | Toggle switches |
| `Code` | StepPulse | Code |
| `Image` | McodeMcpTab | Image |
| `FileCode` | StepPulse | File code |
| `FileJson` | StepPulse | JSON file |
| `File` / `FileIcon` | StepPulse | Generic file |
| `FileType2` | StepPulse | File type |
| `Wifi` | McodeMcpTab | Network |
| `Circle` | StepPulse | Status indicator |

---

## 📍 Icon Locations Summary

| Icon | Primary Location | Secondary Locations |
|------|------------------|----------------------|
| `BrainCircuit` | `AgentActionSequence.tsx:37` | `ThinkingIndicator.tsx:46`, `ThoughtBlock.tsx:42` |
| `FolderSearch` | `ToolCallCard` (via ICONS map) | `StepCard` for read/list/search tools |
| `Search` | `ICONS` map (web_search) | `AIChatPage` search button |
| `Terminal` | `ICONS` map (shell commands) | `BottomPanel`, `RunDebugPanel` |
| `FileText` | `ICONS` map (write_file) | `StepCard` file results |
| `Pencil` | `ICONS` map (edit_file) | `StepCard` edit results |
| `Loader2` | `AIChatPage` upload button | `SettingsPage` saving state |
| `Sparkles` | `SparkleButton.tsx` | `AIChatPage` mode toggle |
| `Zap` | `AIChatPage` god mode toggle | `McodeGitToolsTab` |
| `Activity` | `WaveProgress` | `AIChatPage` god mode waves |
| `ChevronDown` | `AIChatPage` dropdown | `SettingsPage` select |
| `Send` | `mcodeUX.tsx` AgentInputBar | Not used (AgentInputBar is dead code) |
| `Paperclip` | `mcodeUX.tsx` AgentInputBar | Not used (AgentInputBar is dead code) |

---

## 📂 Icon File Sources

| Component File | Icons Imported | Status |
|----------------|----------------|--------|
| `chat/ThinkingIndicator.tsx` | `BrainCircuit` | Orphaned (not imported) |
| `chat/AgentActionSequence.tsx` | `BrainCircuit` | ✅ Live in AIChatPage |
| `chat/mcodeUX.tsx` | `Search, Terminal, FileText, Pencil, FolderSearch, Send, Paperclip, ShieldCheck, ChevronDown` | `Send` + `Paperclip` only used in `AgentInputBar` (dead code) |
| `chat/SpinnerBlock.tsx` | None | ✅ Live |
| `chat/ReactionBurst.tsx` | None | ✅ Live |
| `ide/StepCards.tsx` | None (imports from mcodeUX) | ✅ Live |
| `mcode/McodeAnimationsTab.tsx` | `Layers, Zap, Sparkles, Code, BarChart3, CheckCircle, Terminal, GitBranch, Activity, Timer, ChevronDown, Play, Pause, Square, MousePointerClick` | Dead code (not routed) |
| `mcode/McodeArchitectureTab.tsx` | `Server, Globe, Database, Shield, Zap, GitBranch, Package, Users, HardDrive, Cpu, Layers, Network, FileCode` | Dead code |
| `mcode/McodeConfigTab.tsx` | `Database, Shield, Key, Settings, Layers, FileText, ChevronDown, Server, Cloud, ToggleLeft, Zap, Activity, Terminal, Wifi` | Dead code |
| `mcode/McodeMcpTab.tsx` | `Server, Shield, Zap, AlertTriangle, Image, Database, Wifi, Settings, ChevronDown, ExternalLink` | Dead code |
| `mcode/McodePluginsTab.tsx` | `Package, Users, Download, Upload, Settings, ExternalLink, Shield, Zap` | Dead code |
| `mcode/McodeSettingsTab.tsx` | `Settings, ToggleLeft, ToggleRight, Sliders, Globe, Shield, Clock, Database, Terminal, Save, RefreshCw, Info, AlertTriangle, CheckCircle2` | Dead code |
| `mcode/McodeTestsTab.tsx` | `BarChart3, CheckCircle, XCircle, Clock, Play, Pause` | Dead code |
| `mcode/McodeTurnMachineTab.tsx` | `Layers, ChevronDown, Activity` | Dead code |
| `pages/AIChatPage.tsx` | All main icons | ✅ Live |
| `pages/SettingsPage.tsx` | `Shield, Key, BarChart3, Palette, Globe, Radar, Zap, User, Github, Settings, Cpu, Brain, Database, Terminal, Network` | ✅ Live |
# ZCode Settings Reference

Complete documentation of all ZCode `setting.json` keys, CLI config schema, and credential storage, sourced from the actual settings file at `C:\Users\mahen\.zcode\v2\` and cross-referenced with `McodeSettingsTab.tsx` documentation.

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `C:\Users\mahen\.zcode\v2\setting.json` | User-level settings/preferences (~33 keys) |
| `C:\Users\mahen\.zcode\v2\config.json` | Model provider configuration (API keys, base URLs, model metadata) |
| `C:\Users\mahen\.zcode\v2\credentials.json` | Encrypted OAuth tokens (AES-256-GCM) |
| `C:\Users\mahen\.zcode\v2\bot-state.v2.json` | Bot state (conversations, memory) |
| `C:\Users\mahen\.zcode\v2\telemetry-state.json` | Telemetry opt-in/opt-out state |
| `C:\Users\mahen\.zcode\v2\tasks-index.sqlite` | Tasks database |

---

## 🔧 setting.json — User Settings (33+ keys)

### Application Behavior

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `closeToTrayOnWindows` | boolean | `true` | `true` | When true, closes to system tray on Windows instead of exiting. Window closes but process keeps running in background. |
| `closeToTrayOnWindowsMigrationInitialized` | boolean | `true` | `true` | Migration flag — prevents re-showing the close-to-tray migration prompt after first run. |

### Terminal & System

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `terminalInheritSystemProfile` | boolean | `true` | `true` | When launching the built-in terminal, inherits login shell environment, proxy, Kubernetes variables, and local terminal font. |
| `embeddedBrowserAllowInsecureCertificates` | boolean | `false` | `false` | Allows invalid/self-signed TLS certificates in the embedded browser used for Browser Use automation. |
| `embeddedBrowserViewportPreference` | object | `{ mode: "normal", viewport: { width: 393, height: 852 }, zoom: "fit" }` | Same | Controls the embedded browser's viewport for Browser Use automation. `normal` = native, `mobile` = 393×852 iPhone-style, `custom` = user-defined. |
| `desktopWindowSize` | object | `{ width: 1200, height: 800, maximized: true }` | Same | Window dimensions and maximized state on app startup. |
| `desktopChromiumHardwareAccelerationEnabled` | boolean | `true` | `true` | Enables GPU hardware acceleration for Chromium. Disable if you encounter blank windows or rendering issues. |
| `keepAwakeWhileRunning` | boolean | — | `false` | Prevents the system from sleeping while ZCode operations are active. |

### Indexing & Search

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `repoSnapshotIndexingEnabled` | boolean | `false` | `false` | Takes a full snapshot of the repository for indexing (memory-intensive but enables instant search across entire repo). |
| `instantGrepIndexingEnabled` | boolean | `false` | `false` | Enables instant grep file indexing — fast code search within workspaces. |
| `nativeSearchEnhancementsEnabled` | boolean | `true` | `true` | Uses native OS search APIs (Spotlight on macOS, etc.) for enhanced file indexing. |

### Agent Behavior

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `messageStreamShowReasoning` | boolean | `true` | `true` | Shows full reasoning/thinking blocks from the model in the chat stream. |
| `messageStreamShowReasoningMigrationInitialized` | boolean | `true` | `true` | Migration flag for the reasoning display setting. Prevents re-prompting after upgrade. |
| `messageStreamShowTodos` | boolean | — | `false` | Renders interactive TodoWrite tool cards inside the message stream. |
| `toolGroupingExploreEnabled` | boolean | `true` | `true` | Groups consecutive file reads and code searches into a single "Explore" section. |
| `toolGroupingTerminalEnabled` | boolean | `true` | `true` | Groups consecutive shell commands into a "Terminal" section. |
| `toolGroupingChangesEnabled` | boolean | `false` | `false` | Groups consecutive Write, Edit, and ApplyPatch calls into a "Changes" section. |
| `zcodeInteractionBehavior` | string | `"queue"` | `"queue"` | How follow-up questions are handled: `queue` (append to queue), `inline` (allow immediate reply), `modal` (modal dialog). |
| `askUserQuestionAutoResolutionEnabled` | boolean | `true` | `true` | Automatically resolves user question prompts after a timeout without waiting for input. |
| `modelIoFullRetentionEnabled` | boolean | `false` | `false` | Keeps complete model requests and responses without compression (higher token usage). |
| `optimizeAgentExperienceEnabled` | boolean | `false` | `false` | Enables agent experience optimizations (experimental). |
| `optimizeAgentExperienceMigrationInitialized` | boolean | `true` | `true` | Migration flag for agent experience optimization. |

### Memory & Sessions

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `memoryEnabled` | boolean | `false` | `false` | Enables the project memory system — saves long-term context to workspaces for recall in future sessions. |
| `taskAutoArchiveEnabled` | boolean | `false` | `false` | Automatically archives completed tasks after the retention window. |
| `taskAutoArchiveOlderThanDays` | number | `7` | `7` | Task age threshold (in days) for auto-archiving completed sessions. |
| `lastWorkspaceSession` | array | — | `[{...mediCore...}, {...mcoode...}, {...default...}]` | Recency-ordered list of recent workspaces with path and purpose (project/conversation). |
| `lastActiveTabIndex` | number | — | `1` | Last active tab index in workspace (used to restore workspace state on startup). |

### Model Providers

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `enabledBuiltinAgentCliProviders` | array | — | `["glm"]` | List of enabled built-in agent CLI providers (e.g., `glm` for GLM CLI integration). |
| `modelProviderFamilyModes` | object | — | `{ "zai": "oauth" }` | Per-provider-family authentication mode (oauth, api_key, etc.). |
| `modelProviderFamilySelectedKeys` | object | — | `{ "zai": "coding-plan:builtin:zai-coding-plan" }` | Per-provider-family selected API key/coding plan identifier. |
| `providerFamilyDomain` | string | — | `"zai"` | Active provider family domain (determines which model family is primary). |
| `providerFamilyDomainUpdatedAt` | number | — | `1785945015192` | Unix timestamp of last provider family domain change. |
| `providerFamilyDomainMigrated` | boolean | — | `true` | Migration flag indicating provider family domain has been migrated to v2. |

### Updates & Notifications

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `receivePreviewUpdates` | boolean | `false` | `false` | Opt in to receive preview/early-access updates before general release. |
| `autoDownloadAndInstallUpdates` | boolean | `false` | `false` | Automatically downloads and installs updates when found (without asking). |
| `skippedElectronUpdateVersions` | object | `{}` | `{}` | Records Electron update versions that were skipped to prevent re-prompting. |
| `desktopTaskNotifications` | boolean | — | (Not in setting.json) | Sends desktop notifications when a task completes, fails, or needs approval. |
| `notificationSound` | boolean | — | (Not in setting.json) | Plays notification sound for desktop notifications (can be muted separately). |

### UI & Localization

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `locale` | string | `"en-US"` | `"en-US"` | Display language for the ZCode UI. Options: `en-US`, `en-GB`, `ja`, `ko`, `zh-CN`, `zh-TW`. |
| `localePreference` | string | `"en-US"` | `"en-US"` | Preferred locale for content and formatting (may differ from UI locale). |

### Sync & Migration

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `settingsSyncFirstRunPromptHandled` | boolean | `true` | `true` | Indicates the settings sync first-run prompt has been shown (prevents re-showing). |

---

## ⚙️ CLI Config Schema (from config.json / McodeConfigTab)

The CLI config schema defines configuration groups with scope-based merge priority. The merge order (lowest → highest) is:

```
System → User → Project → Session → Env → CLI
```

### `permission` Group
| Key | Default | Description |
|-----|---------|-------------|
| `mode` | `"build"` | Permission mode: `plan` (ask for everything), `build` (ask for risky), `edit` (auto-edit but ask for dangerous), `yolo` (approve all). |
| `autoApproveHighRisk` | `false` | Auto-approve high-risk tools (file deletes, system commands) without prompting. |

### `storage` Group
| Key | Default | Description |
|-----|---------|-------------|
| `dir` | `"~/.mcode"` | Persistent storage directory for all ZCode data. |
| `sessionDbPath` | `"~/.mcode/cli/db/db.sqlite"` | Path to the session database (SQLite) storing conversation history. |

### `network` Group
| Key | Default | Description |
|-----|---------|-------------|
| `timeout` | `180000` | Default network timeout in milliseconds (3 minutes). |

### `features` Group
| Key | Default | Description |
|-----|---------|-------------|
| `compact` | `true` | Enable conversation compaction (reduces context window usage for long chats). |
| `rewind` | `true` | Enable workspace checkpoints (undo/redo file changes, restore workspace state). |
| `subagent` | `true` | Enable subagent spawning (parallel agent execution in god mode). |
| `memory` | `true` | Enable project memory system (saves context between sessions). |
| `skill` | `true` | Enable skills loading (custom slash commands and behaviors from skills registry). |
| `mcp` | `true` | Enable MCP (Model Context Protocol) server support. |

### `hooks` Group
| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable hooks system (custom scripts triggered on events). Disabled by default. |
| `timeoutMs` | `60000` | Maximum execution time for a hook before it's killed (60 seconds). |
| `maxOutputBytes` | `32768` | Maximum output size from hooks (32 KB) to prevent oversized payloads. |

### `logging` Group
| Key | Default | Description |
|-----|---------|-------------|
| `level` | `"info"` | Log verbosity: `debug`, `info`, `warn`, `error`. |
| `format` | `"text"` | Log output format: `text`, `json`, `jsonl`. |

### `toolConcurrency` Group
| Key | Default | Description |
|-----|---------|-------------|
| `maxConcurrency` | `10` | Maximum number of concurrent tool calls (parallel function execution limit). |

### `ui` Group
| Key | Default | Description |
|-----|---------|-------------|
| `locale` | `"en-US"` | Default UI locale for the CLI. |
| `theme` | `"auto"` | UI theme: `auto` (system), `light`, `dark`. |

---

## 🔐 Credential Security

### `credentials.json`
| Key | Encryption | Description |
|-----|------------|-------------|
| `oauth:zai:access_token` | AES-256-GCM | Z.ai OAuth access token (encrypted with per-install key) |
| `oauth:zai:user_info` | AES-256-GCM | Z.ai OAuth user info (encrypted) |
| `oauth:active_provider` | AES-256-GCM | Currently active OAuth provider identifier |

**Security properties:**
- All credentials are AES-256-GCM encrypted with a per-install key
- Never stored in plaintext
- JWT_SECRET validation: weak secrets (< 32 chars) trigger warnings

### Certificate Storage
| Path | Purpose |
|------|---------|
| `certs/` | CA key/cert for TLS interception (Desktop CA certificate for HTTPS traffic inspection) |

---

## 📊 Config Merge Order (Scope Priority)

```
System (priority 0)
  ↓
User (priority 10)
  ↓
Project (priority 20)
  ↓
Session (priority 30)
  ↓
Env (priority 40)
  ↓
CLI (priority 50, Highest)
```

Each scope overrides the previous. CLI flags have the highest priority, environment variables override session settings, and project-level settings override user-level settings.

---

## 💻 Code Examples

### Sample `setting.json` (Actual Format)

```json
{
  "recentProjects": [
    "D:\\projects\\mediCore",
    "D:\\projects\\mcoode"
  ],
  "locale": "en-US",
  "localePreference": "en-US",
  "terminalInheritSystemProfile": true,
  "embeddedBrowserAllowInsecureCertificates": false,
  "embeddedBrowserViewportPreference": {
    "mode": "normal",
    "viewport": { "width": 393, "height": 852 },
    "zoom": "fit"
  },
  "desktopWindowSize": { "width": 1200, "height": 800, "maximized": true },
  "desktopChromiumHardwareAccelerationEnabled": true,
  "messageStreamShowReasoning": true,
  "messageStreamShowReasoningMigrationInitialized": true,
  "messageStreamShowTodos": false,
  "toolGroupingExploreEnabled": true,
  "toolGroupingTerminalEnabled": true,
  "toolGroupingChangesEnabled": false,
  "zcodeInteractionBehavior": "queue",
  "askUserQuestionAutoResolutionEnabled": true,
  "modelIoFullRetentionEnabled": false,
  "optimizeAgentExperienceEnabled": false,
  "optimizeAgentExperienceMigrationInitialized": true,
  "enabledBuiltinAgentCliProviders": ["glm"],
  "modelProviderFamilyModes": { "zai": "oauth" },
  "modelProviderFamilySelectedKeys": { "zai": "coding-plan:builtin:zai-coding-plan" },
  "providerFamilyDomain": "zai",
  "repoSnapshotIndexingEnabled": false,
  "instantGrepIndexingEnabled": false,
  "nativeSearchEnhancementsEnabled": true,
  "memoryEnabled": false,
  "taskAutoArchiveEnabled": false,
  "taskAutoArchiveOlderThanDays": 7,
  "closeToTrayOnWindows": true,
  "closeToTrayOnWindowsMigrationInitialized": true,
  "keepAwakeWhileRunning": false,
  "receivePreviewUpdates": false,
  "autoDownloadAndInstallUpdates": false,
  "desktopTaskNotifications": true,
  "notificationSound": false,
  "settingsSyncFirstRunPromptHandled": true
}
```

### Sample `config.json` (Model Provider Configuration)

```json
{
  "provider": {
    "builtin:zai": {
      "name": "Z.ai - API Key",
      "kind": "anthropic",
      "options": {
        "apiKey": "",
        "baseURL": "https://api.z.ai/api/anthropic",
        "apiKeyRequired": true
      },
      "source": "custom",
      "models": {
        "GLM-5.3": {
          "reasoning": { "enabled": true, "variants": ["low", "max", "high"], "defaultVariant": "max" },
          "limit": { "context": 1000000, "output": 128000 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "GLM-5.3-Flash": {
          "reasoning": { "enabled": true, "variants": ["low", "max", "high"], "defaultVariant": "max" },
          "limit": { "context": 1000000, "output": 128000 },
          "modalities": { "input": ["text", "image", "video"], "output": ["text"] }
        }
      }
    },
    "73b59c4c-eeda-4b71-937a-66ad2a4dd4c9": {
      "name": "Poolside",
      "kind": "anthropic",
      "options": {
        "apiKey": "sky_5nf3ZfVR.363IPYb4um4bmDN6frPCxBD3P250tfc0",
        "baseURL": "https://inference.poolside.ai/v1",
        "apiKeyRequired": true
      },
      "source": "custom",
      "models": {
        "poolside/laguna-s-2.1": {
          "limit": { "context": 262144 },
          "modalities": { "input": ["text"], "output": ["text"] }
        }
      }
    }
  }
}
```

### Accessing Settings in the Frontend (React/ZCode Web)

```typescript
// Via ZCode's settings store (zustand)
import { useSettingsStore } from '../../store/settingsStore';

const plugins = useSettingsStore((s) => s.plugins);
const togglePlugin = useSettingsStore((s) => s.togglePlugin);
togglePlugin('compliance-kit'); // Toggle a plugin on/off

// Via API endpoint
import api from '../../lib/axios';

// Fetch all user settings
const res = await api.get('/api/v1/settings', { timeout: 5000 });
const settings = res.data?.settings; // Record<string, any>

// Update a setting
const patch = { keepAwakeWhileRunning: true };
await api.post('/api/v1/settings', patch);
```

### Accessing Settings in the CLI (Node.js)

```typescript
// From ZCode CLI config module
import { getConfig } from '@zcode/cli/lib/config';

// Read a CLI config key with scope-based merge resolution
const mode = getConfig('permission.mode');          // "build"
const timeout = getConfig('network.timeout');      // 180000
const compact = getConfig('features.compact');     // true

// Override at runtime via CLI flag
// zcode --permission.mode=yolo --network.timeout=300000
//   (CLI scope has highest priority, overrides all other scopes)
```

### Settings UI Component Pattern

```tsx
// SettingToggle component (used in SettingsPage)
function SettingToggle({ name, defaultVal, desc }) {
  const [enabled, setEnabled] = useState(defaultVal);
  return (
    <motion.label className="flex items-center justify-between">
      <div>
        <code className="text-xs text-white/60 font-mono">{name}</code>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <motion.div
        animate={{ backgroundColor: enabled ? '#10b981' : '#374151' }}
        className="relative w-10 h-6 rounded-full"
        onClick={() => setEnabled(!enabled)}
      >
        <motion.div
          animate={{ x: enabled ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
        />
      </motion.div>
    </motion.label>
  );
}

// Usage in a settings tab
<SettingToggle
  name="closeToTrayOnWindows"
  defaultVal={true}
  desc="Keep app in system tray on Windows"
/>
```

### Model Provider Registration Pattern

```typescript
// config.json provider structure
interface ModelProvider {
  name: string;           // Display name (e.g., "Z.ai - API Key")
  kind: 'anthropic' | 'openai' | 'openai-compatible';
  options: {
    apiKey: string;       // Actual or empty (uses OAuth)
    baseURL: string;       // API endpoint
    apiKeyRequired?: boolean;
  };
  source: 'builtin' | 'custom';
  models: Record<string, ModelMetadata>;
  systemDisabledReason?: string;  // Why a provider is disabled
  enabled: boolean;
  zcode?: {
    modified?: boolean;
    priority?: number;
    deletedModels?: string[];
  };
}

interface ModelMetadata {
  limit: { context: number; output: number };
  modalities: { input: string[]; output: string[] };
  reasoning?: { enabled: boolean; variants: string[]; defaultVariant: string };
  name?: string;
}
```
# ZCode Smart Engine — Complete Architecture Documentation

> **Folder**: `C:\Users\mahen\.zcode` (project root: `packages/`)
> **Last updated**: 2026-09-10

---

## Table of Contents

1. Overview
2. Architecture Layers
3. Smart Engine Processing Flow
4. Phase 1: Tech Stack Detection
5. Phase 2: Plan Generation
6. Phase 3: Wave-Based Parallel Execution
7. Phase 4: Subagent Execution
8. Integration Tests + Bugfix Rounds
9. Watch Mode Daemon
10. Turn Machine Phases
11. Model Router / Scoring System
12. Special Modes
13. Hooks System
14. Animation System
15. IDE Event Bridge
16. Todo Lifecycle
17. Chat vs Agent vs God Mode
18. File Lock Manager
19. Undo Stack
20. Cost Tracking
21. Auto-Search
22. Error Recovery

---

## 1. Overview

The ZCode Smart Engine is a multi-agent orchestration system that takes a natural-language task prompt and executes it end-to-end across a codebase. It operates in two primary modes:

- **God Mode** (CLI `runGod()` / web `chat:send` with mode=`god`): Full pipeline — plan → parallel subagents → tests → bugfix → watch
- **Chat/Agent Mode** (CLI `chat()` / web `chat:send` with mode=`chat`/`agent`): Single agent with optional planning

The engine lives in three packages:
- **`packages/cli/src/core/`** — orchestration logic (`orchestrator.js`, `subagent-manager.js`, `subagent.js`, `planner.js`, `router.js`, `chat-agent.js`, `watch-daemon.js`)
- **`packages/backend/src/`** — Socket.IO bridge (`sockets.js`, `chat-session.js`) relaying CLI events to the IDE
- **`packages/shared/src/`** — shared contracts (`plan.js`, `domains.js`, `events.js`)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   IDE/Web    │────▶│  Backend     │────▶│   CLI Core   │
│  (React+TS)  │     │ (Node+Socket)│     │ (Node ESM)   │
│              │     │              │     │              │
│ useChatSocket │────▶│ chat-sessions│────▶│ Orchestrator │
│ Redux store   │◀───▶│ events → CLI │◀───▶│ SubagentMngr │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Architecture Layers

| Layer | Package | Files | Responsibility |
|-------|---------|-------|----------------|
| **Planning** | `cli/src/core/` | `planner.js` | Generates dependency-ordered todo plan via LLM |
| **Orchestration** | `cli/src/core/` | `orchestrator.js` | Coordinates plan → subagents → tests → watch |
| **Subagent** | `cli/src/core/` | `subagent-manager.js`, `subagent.js` | Individual agent loop (think → tool → repeat) |
| **Model Routing** | `cli/src/core/` | `router.js` | 5-layer weighted scoring per domain |
| **Tools** | `cli/src/core/` | `tools.js` | File/shell/git/browser/web tool implementations |
| **Watch** | `cli/src/core/` | `watch-daemon.js` | File watching, lint fixing, auto-commit |
| **Backend Bridge** | `backend/src/` | `chat-session.js`, `sockets.js` | Socket.IO ↔ CLI event forwarding |
| **Frontend State** | `web/src/` | `chatSlice.ts`, `useChatSocket.ts` | Redux state for all UI rendering |
| **Shared Contracts** | `shared/src/` | `plan.js`, `domains.js`, `events.js` | Plan normalization, domain constants |

---

## 3. Smart Engine Processing Flow

### God Mode — Full Pipeline

```
User prompt → Orchestrator.runGod()
  1. Tech stack detection (detectTechStack)
  2. Repo context compilation (README, package.json, file tree)
  3. Planner.plan() → LLM generates JSON plan with todos
  4. SubagentManager.runAll()
     ├── preBuild hook
     ├── planWaves() → topological sort into dependency waves
     ├── FOR each wave:
     │   ├── preWave hook
     │   ├── WAVE_START event emitted
     │   ├── Queue ready todos → _schedule() → _spawn()
     │   │   ├── preAgent hook (per subagent)
     │   │   ├── Subagent.run() — think → tool → repeat loop
     │   │   ├── SUBAGENT_CREATED/STARTED/STEP/DONE events
     │   │   └── postAgent hook (per subagent)
     │   ├── Wait for all running + queued to finish
     │   ├── WAVE_COMPLETE event emitted
     │   └── postWave hook
     ├── _integrationPass() — runs `npm test`
     ├── _bugfixRounds() → up to 3 rounds of auto-fix subagents
     ├── mergeResults() → final summary
     └── postBuild hook
  5. BUILD_COMPLETE event emitted (with summary, cost, tokens, models)
  6. (Optional) startWatch() → WatchDaemon
```

### Chat/Agent Mode — Single Agent Loop

```
User prompt → ChatSession.sendMessage()
  ├── promptNeedsPlanning() check (skip if < 50 chars or trivial)
  ├── (Agent mode only) Planner.plan() → plan with todos
  ├── router.pick('build') → select model
  └── ChatAgent.run(prompt)
      ├── Stream LLM response (chat:stream chunks)
      ├── Parse tool calls from LLM output (JSON or XML)
      ├── Emit chat:tool_call STARTED event
      ├── Execute tool (read_file, write_file, edit_file, run_shell, ...)
      │   ├── Permission gate for shell/write commands
      │   └── Auto-search for web_search/web_fetch tools
      ├── Emit chat:tool_call DONE event with results
      ├── Update todo status (in agent mode)
      ├── Repeat for next turn (max 12-15 turns)
      └── chat:done event emitted
```

---

## 4. Phase 1: Tech Stack Detection

**File**: `packages/cli/src/core/techstack.js`

Before planning, the engine detects the project's tech stack to inject context into the planner:

```js
function detectTechStack(projectPath) {
  const stack = {
    frontend: [], backend: [], databases: [],
    testFrameworks: [], buildTools: [], languages: [],
    packageManager: 'npm', rawDeps: []
  };

  // 1. Read package.json
  const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json')));
  for (const dep of Object.keys(pkg.dependencies || {})) {
    stack.rawDeps.push(dep);
    // Framework detection
    if (dep.includes('react')) stack.frontend.push('React');
    if (dep.includes('next')) stack.frontend.push('Next.js');
    if (dep.includes('vue')) stack.frontend.push('Vue');
    if (dep.includes('svelte')) stack.frontend.push('Svelte');
    if (dep.includes('express')) stack.backend.push('Express');
    // Test framework detection
    if (dep.includes('jest')) stack.testFrameworks.push('Jest');
    if (dep.includes('vitest')) stack.testFrameworks.push('Vitest');
    if (dep.includes('cypress')) stack.testFrameworks.push('Cypress');
  }

  // 2. Top-level files
  const topFiles = readdirSync(projectPath);
  if (topFiles.includes('go.mod')) stack.languages.push('Go');
  if (topFiles.includes('Cargo.toml')) stack.languages.push('Rust');
  if (topFiles.includes('tsconfig.json')) stack.languages.push('TypeScript');
  if (topFiles.includes('requirements.txt')) {
    stack.languages.push('Python');
    stack.packageManager = 'pip';
  }

  // 3. Recursive source file extension scan (up to 3 levels deep)
  const exts = scanExtensions(projectPath, 3);
  if (exts.has('.py')) stack.languages.push('Python');
  if (exts.has('.go')) stack.languages.push('Go');
  if (exts.has('.rs')) stack.languages.push('Rust');
  if (exts.has('.java')) stack.languages.push('Java');
  if (exts.has('.csproj')) stack.languages.push('C#');
}

function smartDefaults(stack) {
  return {
    testCommand: stack.testFrameworks.includes('Vitest') ? 'npx vitest run'
               : stack.testFrameworks.includes('Jest') ? 'npx jest'
               : stack.testFrameworks.includes('Cypress') ? 'npx cypress run'
               : 'npm test',
    buildCommand: stack.buildTools.includes('Vite') ? 'npm run build'
                : stack.frontend.includes('Next.js') ? 'npm run build'
                : 'npm run build',
    devPort: 3000,
    domains: stack.frontend.length > 0 ? ['frontend', 'backend'] : ['backend'],
  };
}
```

Detection sources:
1. package.json dependencies
2. Top-level files (go.mod, Cargo.toml, tsconfig.json, etc.)
3. Recursive source file extension scan (up to 3 levels deep)

This context is compiled into a `repoContext` string and injected into the planner's system prompt under `PROJECT CONTEXT (existing code to extend)`.

---

## 5. Phase 2: Plan Generation

**File**: `packages/cli/src/core/planner.js`

The Planner sends a system prompt to an LLM (selected via `router.pick('planning')`) asking it to output a JSON plan:

```json
{
  "summary": "one-line summary of the build",
  "todos": [
    {
      "id": "t1",
      "title": "Set up project structure",
      "description": "Create basic files and directories",
      "domain": "backend",
      "dependsOn": [],
      "files": ["src/index.ts", "package.json"]
    }
  ]
}
```

### Rules enforced by the planner:
- Domain must be one of: `frontend | backend | db | devops | test | docs | bugfix | planning`
- No two todos should touch the same file (dependency chain enforced)
- 4-14 granular todos per plan (each doable by one agent)
- Always includes a test todo depending on core implementation
- Titles kept under 8 words

### Plan normalization (`packages/shared/src/plan.js`)

```js
const MAX_TODOS = 14;

function normalizeTodo(raw, index) {
  return {
    id: raw.id || `t${index}`,
    title: raw.title,
    description: raw.description || raw.title,
    domain: raw.domain || 'backend',
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
    files: Array.isArray(raw.files) ? raw.files : [],
    status: 'pending',
    assignedModel: null,
    wave: null,
    startedAt: null,
    finishedAt: null,
    error: null,
    completedFiles: new Set(),
  };
}

function normalizePlan(raw) {
  let todos = (raw.todos || []).map(normalizeTodo);
  if (todos.length > MAX_TODOS) todos = todos.slice(0, MAX_TODOS);
  // Filter invalid dependencies (non-existent todo IDs)
  const validIds = new Set(todos.map(t => t.id));
  todos.forEach(t => t.dependsOn = t.dependsOn.filter(id => validIds.has(id)));
  // Resolve file conflicts
  resolveFileConflicts(todos);
  // Check for cycles
  if (findCycle(todos)) throw new Error('Dependency cycle detected');
  return { summary: raw.summary || 'Auto-generated plan', todos };
}

function findCycle(todos) {
  const visited = new Set();
  const visiting = new Set();
  function dfs(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const todo = todos.find(t => t.id === id);
    if (todo) {
      for (const dep of todo.dependsOn) {
        if (dfs(dep)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  for (const todo of todos) {
    if (dfs(todo.id)) return todo.id;
  }
  return null;
}

function resolveFileConflicts(todos) {
  const fileToTodo = new Map();
  for (const todo of todos) {
    for (const file of todo.files) {
      if (fileToTodo.has(file)) {
        if (!todo.dependsOn.includes(fileToTodo.get(file))) {
          todo.dependsOn.push(fileToTodo.get(file));
        }
      } else {
        fileToTodo.set(file, todo.id);
      }
    }
  }
}

function planWaves(plan) {
  const waves = [];
  const remaining = [...plan.todos];
  const completed = new Set();
  while (remaining.length > 0) {
    const wave = remaining.filter(t =>
      t.dependsOn.every(dep => completed.has(dep))
    );
    if (wave.length === 0) wave.push(...remaining);
    wave.forEach(t => { t.wave = waves.length + 1; completed.add(t.id); });
    remaining = remaining.filter(t => !completed.has(t.id));
    waves.push(wave);
  }
  return waves;
}

function isEligible(todo, statusById) {
  return todo.dependsOn.every(dep => statusById[dep] === 'done');
}
```

---
## 6. Phase 3: Wave-Based Parallel Execution

**File**: `packages/cli/src/core/subagent-manager.js`

`SubagentManager.runAll()` orchestrates the entire build through dependency-ordered waves:

### Wave Dispatch

1. **`planWaves(plan)`** splits todos into topological sort waves
2. For each wave:
   - Set `todo.wave = idx + 1`
   - Emit `WAVE_START` event with wave number, total, and todo list
   - Filter to `ready` todos (all dependencies done) via `isEligible()`
   - Push to queue → `_schedule()` → `_spawn()` (concurrent, up to `concurrency` cap)
   - `await sleep(100)` loop until queue empty and all running complete
   - Emit `WAVE_COMPLETE` event

### Concurrency Control

```js
this.concurrency = Math.max(1, Number(config.concurrency || options.maxAgents || 5));
// Default: 5 subagents running in parallel
```

The default concurrency of 5 is controlled by `MAX_AGENTS` constant in the orchestrator config. Each spawned subagent gets its own LLM context window and file system working directory within the project path.

### Wave Event Flow

For each wave (1 to totalWaves):
1. Emit `WAVE_START` with `{ wave, totalWaves, todos: waveTodos, projectPath }`
2. Call `preWave` hook with `{ wave, totalWaves, todos, projectPath }`
3. For each todo in wave:
   - Check `isEligible(todo, statusById)` — all `dependsOn` must be `done`
   - If eligible: emit `SUBAGENT_CREATED`, call `_spawn(todo)` which:
     - Call `preAgent` hook
     - Set todo status to `running`
     - Select model via `router.pick(todo.domain)`
     - Instantiate `new Subagent(todo, model, projectPath)`
     - Call `subagent.run()` (async, not awaited yet)
     - Emit `SUBAGENT_ASSIGNED` with `{ model, domain }`
   - After `subagent.run()` completes:
     - Call `postAgent` hook
     - Emit `SUBAGENT_DONE`/`SUBAGENT_FAILED`/`SUBAGENT_NEEDS_REVIEW`
     - Update todo status and `finishedAt`
     - Call `router.recordAssignment(ref, domain, success)`
     - Emit `chat:todo_update` socket event
4. Wait for all subagents in wave to complete (`await Promise.all(running)`)
5. Emit `WAVE_COMPLETE` with `{ wave, results }`
6. Call `postWave` hook

### Subagent Scheduling (_schedule and _spawn)

```js
async _schedule(todo) {
  this.queue.push(todo);
  // Drain queue respecting concurrency cap
  while (this.queue.length > 0 && this.running.size < this.concurrency) {
    const next = this.queue.shift();
    if (next && isEligible(next, this.statusById)) {
      this._spawn(next);
    } else if (next) {
      // Not eligible yet, put back
      this.queue.unshift(next);
      break;
    }
  }
}

_spawn(todo) {
  this.statusById[todo.id] = 'running';
  this.running.add(todo.id);

  const model = this.router.pick(todo.domain);
  const subagent = new Subagent(todo, model, this.projectPath);

  emit(SUBAGENT_CREATED, { todoId: todo.id, title: todo.title, domain: todo.domain });

  const result = subagent.run().finally(() => {
    this.running.delete(todo.id);
    this.statusById[todo.id] = result.status;
    // Schedule any dependents that are now eligible
    this._scheduleDependents(todo.id);
    // Drain queue again
    this._schedule(null);
  });

  return result;
}
```

---

## 7. Phase 4: Subagent Execution

**File**: `packages/cli/src/core/subagent.js`

Each subagent runs a single todo. The agent loop implements a think → tool → repeat cycle:

```js
export class Subagent {
  constructor(todo, model, projectPath) {
    this.todo = todo;
    this.model = model;
    this.projectPath = projectPath;
    this.maxTurns = 12;
    this.blockedCount = 0;
    this.status = SUBAGENT_STATUS.PENDING;
  }

  async run() {
    this.status = SUBAGENT_STATUS.RUNNING;
    emit(SUBAGENT_ASSIGNED, { model: this.model.id, domain: this.todo.domain });
    emit(SUBAGENT_STARTED, {
      model: this.model.id, title: this.todo.title, domain: this.todo.domain,
      wave: this.todo.wave, tokens: 0, latency: 0
    });

    // Start the timer for tick events (1s interval)
    const timer = setInterval(() => {
      emit(SUBAGENT_STEP, {
        step: this.turns, total: this.maxTurns,
        message: 'Working...', tokens: this.tokenCount
      });
    }, 1000);

    try {
      const messages = this._buildContext();
      const tools = this._loadTools();

      for (let turn = 0; turn < this.maxTurns; turn++) {
        this.turns = turn + 1;

        emit(SUBAGENT_STEP, {
          step: turn + 1, total: this.maxTurns,
          message: 'Thinking...', tokens: this.tokenCount
        });

        const res = await this.provider.complete(this.model.id, {
          messages, temperature: 0.3,
          reasoning: MODE_REASONING[this.mode],
        });

        const action = parseAction(res.text, { tools });

        if (action.done) {
          emit(SUBAGENT_DONE, {
            summary: action.done.summary, model: this.model.id,
            result: action.done.result, tokens: this.tokenCount, latency: Date.now() - startTime
          });
          this.status = SUBAGENT_STATUS.DONE;
          return { status: 'done', summary: action.done.summary };
        }

        if (action.blocked) {
          this.blockedCount++;
          if (this.blockedCount >= 3) {
            this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
            emit(SUBAGENT_NEEDS_REVIEW, { reason: action.reason });
            return { status: 'needs_review', reason: action.reason };
          }
          // Inject hint and continue
          messages.push({ role: 'user', content: `Hint: ${action.blocked.hint}` });
          continue;
        }

        if (action.tool) {
          emit(SUBAGENT_TOOL_CALL, {
            tool: action.tool.name, args: action.tool.args,
            risk: this._assessRisk(action.tool.name)
          });

          // Permission gate for high-risk tools
          if (this._requiresPermission(action.tool.name)) {
            const approved = await this._requestPermission(action.tool.name, action.tool.args);
            if (!approved) {
              messages.push({ role: 'user', content: 'TOOL REJECTED by user permission.' });
              continue;
            }
          }

          const toolResult = await tools.run(action.tool.name, action.tool.args);
          emit(SUBAGENT_TOOL_RESULT, {
            tool: action.tool.name, ms: toolResult.ms,
            risk: this._assessRisk(action.tool.name),
            truncated: toolResult.truncated
          });

          // Emit file write event if applicable
          if (action.tool.name === 'write_file' || action.tool.name === 'edit_file') {
            emit(SUBAGENT_FILE, {
              todoId: this.todo.id, file: action.tool.args.file,
              content: action.tool.args.content,
              language: this._detectLanguage(action.tool.args.file),
              timestamp: Date.now()
            });
          }

          messages.push({ role: 'user', content: `TOOL RESULT: ${JSON.stringify(toolResult)}` });
        }
      }

      // Turn budget exhausted
      this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
      emit(SUBAGENT_NEEDS_REVIEW, { reason: 'turn budget exhausted' });
      return { status: 'needs_review', reason: 'turn budget exhausted' };

    } catch (error) {
      this.status = SUBAGENT_STATUS.FAILED;
      emit(SUBAGENT_FAILED, { error: error.message, todoId: this.todo.id });
      return { status: 'failed', error: error.message };
    } finally {
      clearInterval(timer);
    }
  }

  _buildContext() {
    const messages = [];

    // System prompt
    messages.push({ role: 'system', content: `You are an autonomous coding agent working on a single task...

TASK: ${this.todo.title}
DESCRIPTION: ${this.todo.description}
DOMAIN: ${this.todo.domain}
FILES TO WORK WITH: ${JSON.stringify(this.todo.files)}

You have access to these tools: ${Object.keys(this._loadTools()).join(', ')}

When done, output ONLY this format: {"done": true, "summary": "brief summary"}` });
    messages.push({ role: 'user', content: this.todo.description });
    return messages;
  }
}
```

### Subagent Status Values

```
PENDING → RUNNING → DONE
                → FAILED
                → NEEDS_REVIEW
```

---

## 8. Integration Tests + Bugfix Rounds

After all waves complete, the engine runs integration tests:

```js
async _integrationPass() {
  const results = { ran: false, status: 'unknown', exitCode: -1, tail: '' };

  const hasTestScript = this.pkg.scripts && this.pkg.scripts.test;
  if (!hasTestScript) {
    results.ran = false;
    results.status = 'skipped';
    emit(INTEGRATION_PASS, { ran: false, status: 'skipped' });
    return results;
  }

  results.ran = true;
  const proc = await execa('npm', ['test', '--silent'], {
    cwd: this.projectPath,
    timeout: 300_000,
    reject: false,
    encoding: 'utf-8',
  });

  results.exitCode = proc.exitCode;
  results.status = proc.exitCode === 0 ? 'passed' : 'failed';
  results.tail = proc.stdout.split('\n').slice(-6).join('\n');

  emit(INTEGRATION_PASS, results);
  return results;
}
```

### Bugfix Rounds

Up to 3 rounds of auto-fixing:

```
Round 1: Uses existing test failure tail (no duplicate test run)
Round 2+: Re-runs tests, then dispatches bugfix subagents for failed todos

Each round:
  1. Check for broken todos (FAILED or NEEDS_REVIEW)
  2. Dispatch one bugfix subagent per broken todo
  3. Re-run integration tests (from round 2+)
  4. If all pass → break
  5. If still failing → continue to next round
```

```js
async _bugfixRounds(integrationResult) {
  if (integrationResult.status !== 'failed') return { fixed: true };

  let round = 0;
  const maxRounds = 3;

  while (round < maxRounds) {
    round++;
    console.log(`Bugfix round ${round}/${maxRounds}`);

    const brokenTodos = this.plan.todos.filter(
      t => t.status === 'failed' || t.status === 'needs_review'
    );

    if (brokenTodos.length === 0 && integrationResult.status === 'passed') {
      return { fixed: true, rounds: round };
    }

    // Dispatch bugfix subagents
    const bugfixPlan = {
      summary: `Fix failing tests (round ${round})`,
      todos: brokenTodos.map(t => ({
        id: `bf-${t.id}`,
        title: `Fix: ${t.title}`,
        description: `Fix failures in ${t.title}. Test output: ${integrationResult.tail}`,
        domain: t.domain,
        dependsOn: [],
        files: t.files,
      })),
    };

    const waveManager = new SubagentManager(bugfixPlan, this.router, this.projectPath);
    const results = await waveManager.runAll();

    // Re-run tests (from round 2+)
    if (round >= 1) {
      integrationResult = await this._integrationPass();
      if (integrationResult.status === 'passed') {
        return { fixed: true, rounds: round };
      }
    }
  }

  return { fixed: false, rounds: maxRounds };
}
```

### Scoring Feedback Loop

```js
// After each subagent completes:
await this.router.recordAssignment(assignment.ref, todo.domain, success);
// Persists to ~/.mcode/scores/{projectId}/model-scores.json
// Updates the 50% historical success rate layer in the scoring system
```

---

## 9. Phase 6: Watch Mode Daemon

**File**: `packages/cli/src/core/watch-daemon.js`

After a successful god-mode build, the WatchDaemon can be activated for continuous monitoring:

```js
const config = {
  scanIntervalMs: 30_000,    // scan every 30s
  debounceMs: 400,            // debounce rapid changes
  maxFixesPerHour: 60,        // rate limit auto-fixes
  autoCommit: false,          // commit fixes to git
  maxAttemptsPerFix: 3        // retry limit per file
};
```

### Watch Process

1. **chokidar** file watcher monitors `projectPath` (excludes: node_modules, .git, dist, build, coverage, .mcodeignore)
2. On file change → debounce (400ms) → queue for processing
3. Process queue: read file, run ESLint/static analysis, if errors → auto-fix subagent
4. Emit `WATCH_SCAN`, `WATCH_CHANGE`, `WATCH_FIX` events

```js
class WatchDaemon {
  start() {
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('change', path => this.handleChange('change', path))
      .on('unlink', path => this.handleChange('unlink', path));

    this.scanInterval = setInterval(() => this.scan(), this.config.scanIntervalMs);
    emit(WATCH_STATUS, { status: 'active' });
  }

  async processFile(filePath) {
    this.cleanupFixBuffer();
    if (this.fixesThisHour >= this.config.maxFixesPerHour) {
      emit(WATCH_FIX, { filePath, outcome: 'RATE_LIMITED' });
      return;
    }

    const eslint = new ESLint();
    const results = await eslint.lintFiles([filePath]);

    if (results[0]?.errorCount > 0) {
      const fixResults = await eslint.lintFiles([filePath], { fix: true });
      if (fixResults[0]?.errorCount === 0) {
        await eslint.outputFixes(fixResults[0]);
        this.fixesThisHour++;
        emit(WATCH_FIX, { filePath, outcome: 'AUTO_FIXED' });
      } else {
        await this.dispatchFixSubagent(filePath, results[0]);
      }
    } else {
      emit(WATCH_FIX, { filePath, outcome: 'NO_ISSUES' });
    }
  }
}
```

### Watch Outcomes

| Outcome | Value |
|---------|-------|
| `AUTO_FIXED` | ESLint fix or subagent fix succeeded |
| `NO_ISSUES` | File is clean |
| `NEEDS_REVIEW` | Fix failed, needs human review |

### Watch Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `WATCH_SCAN` | Periodic scan | `{ scanned, autoFixed, needsReview, errors }` |
| `WATCH_CHANGE` | File change detected | `{ projectId, file, action }` |
| `WATCH_FIX` | Fix attempted | `{ projectId, file, outcome, detail }` |
| `WATCH_STATUS` | Start/stop/change | `'active'` / `'stopped'` |

---
## 10. Turn Machine Phases

The ZCode Turn Machine defines 10 phases that govern how the engine transitions through processing:

```
┌──────────────────────────────────────────────────────────────────┐
│                STATE MACHINE TRANSITIONS                         │
├─────────────┬──────────────┬────────────────┬───────────────────┤
│ FROM        │ TO           │ TRIGGER        │ SIDE EFFECTS      │
├─────────────┼──────────────┼────────────────┼───────────────────┤
│ Idle        │ Processing   │ User prompt    │ Emit chat:start   │
│ Processing  │ Awaiting     │ router.pick()  │ Emit chat:ready   │
│ Awaiting    │ Streaming    │ provider       │ Emit chat:stream  │
│ Streaming   │ Scheduling   │ done token     │ Flush buffer      │
│ Scheduling  │ Executing    │ tool call      │ Permission gate   │
│ Executing   │ Aggregating  │ tool result    │ Feedback loop     │
│ Aggregating │ Awaiting     │ next turn      │ SUBAGENT_STEP     │
│ Executing   │ AwaitingPerm │ approval       │ Dialog shown      │
│ Awaiting    │ Completing   │ done=true      │ DONE event        │
│ Any         │ Error        │ exception      │ Error event       │
│ Any         │ Idle         │ session end    │ Save undo stack   │
└─────────────┴──────────────┴────────────────┴───────────────────┘
```

| Phase | Description | Key Code Location |
|-------|-------------|-------------------|
| **Idle** | No active session, awaiting user input. Initial state of ChatSession and Orchestrator. | `ChatSession` constructor, `Orchestrator` initial state |
| **ProcessingInput** | User prompt received, pre-routing checks. Slash command parsing, token validation, workspace selection. | `ChatSession.sendMessage()`, `orchestrator.chat()` |
| **AwaitingModelResponse** | LLM is generating response. Could be streaming or complete response. Model selected via router.pick(). | `provider.complete()` in subagent.js, chat-agent.js |
| **Streaming** | LLM response chunks arrive. In chat mode, streamed text is batched (16ms flush) and forwarded via chat:stream socket events. | `streamText()` in chat-agent.js, `onChatStream` in useChatSocket.ts |
| **SchedulingTools** | Tool calls parsed from LLM output. Tools queued for execution. In God Mode, subagent scheduling happens here. | `extractActions()` in chat-agent.js, `SubagentManager._schedule()` |
| **ExecutingTools** | Tools are executing (file writes, shell commands, etc.). Permission gate for shell/write operations. | `ToolExecutor.run()`, `Subagent._dispatch()` |
| **AggregatingResults** | Tool results fed back to model as next-turn context. Message history updated with tool result role. | `messages.push({role: 'user', content: TOOL_RESULT})` |
| **AwaitingPermission** | A tool requires user approval (shell, write, edit). Modal dialog shown in IDE, CLI waits on stdin. | `ToolExecutor._askPermission()`, `EVENTS.PERMISSION_ANSWER` |
| **Completing** | Todo/build finished, emitting final events. Undo stack persisted. | End of `Subagent.run()`, `SubagentManager.mergeResults()` |
| **Error** | Exception caught. Error state entered. Subagent marked FAILED, model scoring updated. | `SUBAGENT_FAILED`, `CHAT_ERROR`, error handlers |

---

## 11. Model Router / Scoring System

**File**: `packages/cli/src/core/router.js`, `packages/cli/src/core/modes.js`

### Quality/Speed Dial (MODES)

Six levels control reasoning budget and model selection preferences:

| Mode | Description | Reasoning Effort | Thinking Budget |
|------|-------------|-----------------|-----------------|
| `low` | cheap & fast | `low` | 1,000 tokens |
| `medium` | balanced | `medium` | 2,000 tokens |
| `high` | strong | `high` | 4,000 tokens |
| `extra` | powerful | `high` | 8,000 tokens |
| `max` | frontier | `high` | 16,000 tokens |
| `god` | absolute best | `high` | 32,000 tokens |

### 5-Layer Weighted Model Scoring

```js
final_score = 0.20 × static_benchmark
            + 0.50 × historical_success_rate
            + 0.20 × fingerprint_match
            + 0.10 × user_override_priority
            + live_escalation_penalty
```

| Layer | Weight | Source | Persistence |
|-------|--------|--------|-------------|
| Static Benchmark | 20% | `STATIC_BENCHMARK` — public model eval scores per domain | Hardcoded in `router.js` |
| Historical Success | 50% | `scoreModel()` / `recordResult()` — per-user, per-domain rolling average | `~/.mcode/scores/{projectId}/model-scores.json` |
| Fingerprint Match | 20% | `FINGERPRINT_MATCH` — framework/language/task-type alignment | Hardcoded in `router.js` |
| User Override | 10% | User's routing preference list position | `config.json` |
| Live Escalation | 0% base | Consecutive failure streak (3+ → -0.3 penalty) | In-memory |

### Model Selection (router.pick)

1. Check explicit user preference (`config.roles.{domain}`)
2. Score all available models via `_cacheAllRefs()`
   - Exclude rate-limited providers
   - Exclude models with 3+ consecutive failures
   - Pick highest weighted score
3. Fallback: routing preference list order
4. Return null if nothing usable

### Warm-up

At session init, prefetch model assignments for all 8 domains:
```js
['planning', 'frontend', 'backend', 'db', 'devops', 'test', 'docs', 'bugfix']
```

### Rate Limiting

```js
maxRpm = 60       // max 60 requests per minute per provider
maxTpm = 120_000  // max 120K tokens per minute per provider
```

---

## 12. Special Modes

**File**: `packages/cli/src/core/modes.js`

| Mode | Icon | Label | Affects |
|------|------|-------|---------|
| `learning` | `˝` | Learning | Step-by-step walkthrough with explanations |
| `competition` | `‼` | Competition | Timer display, speed focus |
| `zen` | `居` | Zen | Minimal UI, hide sidebar, hide agent strip |
| `focus` | `🔒` | Focus | Hide toasts, hide agent strip, full-width input |
| `presentation` | `Ɔ` | Presentation | Large text, center align, minimal colors |
| `debug` | `⚙` | Debug | Show debug panel, verbose logs, show raw events |
| `silent` | `🔕` | Silent | Suppress info, errors only, quiet mode |
| `batch` | `⚖` | Batch | Auto-approve, no prompts, log to file |
| `daemon` | `†` | Daemon | Background mode, minimal foreground |
| `service` | `⚙` | Service | System service mode, stdout disabled, syslog |

---

## 13. Hooks System

**File**: `packages/cli/src/core/hooks.js`

### Hook Points (7 total)

```
preBuild({ projectPath, plan })
preWave({ wave, totalWaves, todos, projectPath })
postWave({ wave, totalWaves, results, projectPath })
preAgent({ todoId, domain, title })
postAgent({ todoId, domain, title })
postTest({ results, integration, ... })
postBuild({ results, integration, projectPath, cost, elapsedSecs })
```

### Loading

User-defined hooks live at `.mcode/hooks.js`:

```js
export async function preBuild({ projectPath, plan }) {
  console.log(`Building: ${plan.summary} (${plan.todos.length} todos)`);
}
export async function postBuild({ results, cost, elapsedSecs }) {
  console.log(`Build complete: ${results.done}/${results.total} in ${elapsedSecs}s ($${cost})`);
}
```

Hooks are loaded via dynamic `import()` with `pathToFileURL()`. Missing or broken hook files are silently caught. Each hook execution emits `HOOK_EXECUTED` event with `{ hook, ok, error, ms, wave }`.

Each hook returns `{ ok, result, error, ms }` — failures are emitted as `HOOK_EXECUTED` events but don't block the build.

---

## 14. Animation System

### 4-Layer Animation Architecture

#### Layer 1: CLI Terminal UI (useTicker)
**File**: `packages/cli/src/ui/useTicker.js`
```js
const TICK_RATE_MS = 80;  // 1 tick = 80ms
```
A global singleton `setInterval` at 80ms intervals. All CLI components subscribe to the same tick counter:
```js
function useTicker() {
  const [ticks, setTicks] = useState(tickCount);
  useEffect(() => subscribe(setTicks), []);
  return ticks;
}
```
Components using useTicker: SpinnerBlock, RunningToolBlock, ThoughtBlock, Header, AgentStrip.

#### Layer 2: useEntrance (Progressive Reveal)
**File**: `packages/cli/src/ui/useEntrance.js`
Progressive line-by-line reveal using 80ms shared ticker.

#### Layer 3: useAnimatedProgress
**File**: `packages/cli/src/ui/useAnimatedProgress.js`
20ms interval, 8 frames — smooth progress bar interpolation.

#### Layer 4: IDE Web Animations
CSS variables at `:root` in `packages/web/src/styles/index.css`:
```css
:root {
  --mcode-green: #3ecf8e;
  --mcode-text-dim: #8b8d98;
  --mcode-accent: #6c8cff;
  --mcode-bg: #0d0e12;
  --mcode-border: #26272f;
}
```
Framer Motion easing: `[0.4, 0, 0.2, 1]` standard, `[0.16, 1, 0.3, 1]` spring-like.

### SpinnerBlock Unicode Frames

**Source**: `packages/web/src/components/chat/SpinnerBlock.tsx:13`
```js
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];
```
5-frame spinner at 80ms intervals (matching `useTicker.js` `TICK_RATE_MS = 80`).

| Char | Unicode | Name |
|------|---------|------|
| `●` | `\u25CF` | BLACK CIRCLE |
| `◐` | `\u25D0` | CIRCLE WITH LEFT HALF BLACK |
| `◓` | `\u25D2` | CIRCLE WITH LOWER HALF BLACK |
| `◑` | `\u25D3` | CIRCLE WITH RIGHT HALF BLACK |
| `◒` | `\u25D1` | CIRCLE WITH UPPER HALF BLACK |

### Animation Component Inventory

| Component | File | Animation |
|-----------|------|-----------|
| SpinnerBlock | chat/SpinnerBlock.tsx | 80ms frame rotation |
| AgentActionSequence | chat/AgentActionSequence.tsx | Framer Motion fades |
| StepPulse | chat/mcodeUX.tsx | CSS 1.1s infinite pulse |
| ReactionBurst | chat/ReactionBurst.tsx | CSS pop + 6-particle stagger |
| TodoCard | ide/TodoCard.tsx | Spring stiffness:500 damping:20 |
| WaveProgress | ide/WaveProgress.tsx | Width interpolation |
| SearchAnimation | chat/SearchAnimation.tsx | Phase transitions |

### CLI → IDE Color Alignment

| Element | CLI (themes.js) | IDE (CSS vars) |
|---------|-----------------|----------------|
| Primary green | #3ecf8e | --mcode-green: #3ecf8e |
| Dim text | #8b8d98 | --mcode-text-dim: #8b8d98 |
| Accent blue | #6c8cff | --mcode-accent: #6c8cff |

SpinnerBlock in AIChatPage.tsx empty state uses `<SpinnerBlock label="Ready…" size="lg" color="emerald" />`.

---
## 15. IDE Event Bridge

**File**: `packages/web/src/hooks/useChatSocket.ts`, `packages/web/src/store/chatSlice.ts`

### Socket Event Flow

```
IDE (React) → Backend (Node/Socket.IO) → CLI (Node ESM)
     │              │                     │
     │ chat:start   │                     │
     ├──────────────▶│                     │
     │ chat:ready   │◀───── ChatSession ─────│
     │◀─────────────│                     │
     │ chat:send    │                     │
     ├──────────────▶│                     │
     │ stream/text  │◀─── emit(STREAM) ───▶│ emit(MESSAGE)
     │◀─────────────│                     │
     │ tool_call    │◀─── emit(SUBAGENT_TOOL_CALL)
     │◀─────────────│                     │
     │ todo_plan    │◀─── emit(PLAN_GENERATED)
     │◀─────────────│                     │
     │ todo_update  │◀─── emit(SUBAGENT_FILE)
     │◀─────────────│                     │
     │ chat:done    │◀─── emit(SUBAGENT_DONE)
     │◀─────────────│                     │
```

### Event-to-Redux Mapping (23 events)

| Socket Event | Redux Action | State Updated |
|-------------|-------------|---------------|
| `chat:ready` | `chatReady` | `status`, `models`, `selectedModel` |
| `chat:stream` | `streamUpdate` | `messages[].text` (batched 16ms) |
| `chat:message` | `agentMessage` | `messages[]` |
| `chat:tool_call` | `toolCallStarted` | `messages[]` (tool blocks) |
| `chat:permission` | `permissionRequested` | `permissionRequest` |
| `chat:todo_plan` | `setPlan` | `plan` (with todos) |
| `chat:todo_update` | `updateTodo` | `plan.todos[].status` |
| `chat:done` | `chatDone` | `isStreaming: false` |
| `chat:error` | `chatError` | `status: error` |
| `subagent:created` | `setSubagentCreated` | `subagents[todoId]` |
| `subagent:assigned` | `setSubagentAssigned` | `subagents[todoId].model` |
| `subagent:started` | `setSubagentStarted` | `subagents[todoId].status=running` |
| `subagent:step` | `setSubagentStep` | `subagents[..].message/tokens` |
| `subagent:done` | `setSubagentDone` | `subagents[..].status=done` |
| `subagent:failed` | `setSubagentFailed` | `subagents[..].status=failed` |
| `subagent:file` | `setSubagentFile` | `subagents[..].lastFile` |
| `subagent:tool_call` | `setSubagentToolCall` | `subagents[..].lastTool` |
| `subagent:needs_review` | `setSubagentNeedsReview` | `subagents[..].status=needs_review` |
| `wave:start` | `setWaveStart` | `waves[]` |
| `wave:complete` | `setWaveComplete` | `waves[].status=complete` |
| `integration:pass` | `setIntegrationPass` | `buildIntegration` |
| `build:complete` | `setBuildComplete` | `buildSummary`, `godMode: false` |
| `toast` | `addToast` | `toasts[]` (auto-dismiss 5s) |

### Stream Batching

Buffer rapid-fire chunks, flush every 16ms (~60fps) to prevent React thrashing:

```js
const onChatStream = (payload) => {
  if (doneRef.current) return;
  streamBufferRef.current += payload.text;
  if (!streamTimerRef.current) {
    streamTimerRef.current = setTimeout(() => {
      dispatch(streamUpdate(streamBufferRef.current));
      streamBufferRef.current = '';
      streamTimerRef.current = null;
    }, 16);
  }
};
```

### Todo Live Update (Agent Mode)

When write_file/edit_file completes, check if matching todo's files are all done:

```js
for (const todo of plan.todos) {
  if (todo.files.includes(changedFile)) {
    todo.completedFiles.add(changedFile);
    if (todo.completedFiles.size >= todo.files.length) {
      todo.status = 'done';
      socket.emit('chat:todo_update', { id: todo.id, status: 'done' });
    } else {
      todo.status = 'in_progress';
      socket.emit('chat:todo_update', { id: todo.id, status: 'in_progress' });
    }
  }
}
```

---

## 16. Todo Lifecycle

### Todo Data Structure (from plan.js normalizeTodo)

```js
{
  id: "t1",
  title: "Set up project",
  description: "...",
  domain: "backend",
  dependsOn: ["t0"],
  files: ["src/index.ts"],
  status: "pending",       // pending | in_progress | done | failed | needs_review
  assignedModel: null,     // model_id from router.pick()
  wave: null,              // wave number from planWaves()
  startedAt: null,         // ISO timestamp
  finishedAt: null,        // ISO timestamp
  error: null,             // error message if failed
  completedFiles: Set,     // tracks completed file writes
}
```

### Status Transitions

`pending` → `in_progress` (scheduled) → `done` / `failed` / `needs_review`

### File Conflict Resolution

\`resolveFileConflicts(plan)\` — chains todos that touch the same file (later depends on earlier). This prevents parallel subagents from writing to the same file simultaneously.

### Dependency Topological Sort

\`planWaves(plan)\` — returns waves array where wave[0] = no deps, wave[n] = deps in earlier waves. Each wave's todos can run in parallel.

### Eligibility Check

\`isEligible(todo, statusById)\` — returns true when all dependency todos are `done`.

---

## 17. Chat Mode vs Agent Mode vs God Mode

| Aspect | Chat Mode | Agent Mode | God Mode |
|--------|-----------|------------|----------|
| Entry point | runChat() | runAgent() | runGod() |
| Planning | Never | If prompt > 50 chars | Always |
| Subagents | None — single ChatAgent | None — single ChatAgent | Wave-based parallel |
| Tools | Full toolset | Full toolset | Per-todo ToolExecutor |
| Permission | Shell/write require approval | Same | Same |
| History | Full conversation (historyLimit: 0) | Last 20 messages | Each subagent own context |
| Auto-search | Yes | Yes | No (subagents use web_search) |
| File watching | No | No | Yes — WatchDaemon |
| Post-build | N/A | N/A | Tests → Bugfix → Watch |

### Chat Mode (Claude-style)
- Claude-style interaction, no todo planning
- Auto-search for relevant queries (Perplexity-style)
- Full conversation history

### Agent Mode
- Always runs planning if prompt is substantial
- Todo tracking with real-time IDE updates
- Single ChatAgent with limited history (20 messages)

### God Mode
- Full 6-phase pipeline (detect → plan → waves → subagents → tests → watch)
- Up to 5 parallel subagents
- Post-build: integration tests, bugfix rounds (up to 3), optional watch daemon
- File lock manager for shared file contention

---

## 18. File Lock Manager

**File**: `packages/cli/src/core/subagent-manager.js` (`FileLockManager` class)

Prevents write contention when multiple parallel subagents modify the same shared file:

```js
class FileLockManager {
  constructor() {
    this.locks = new Map();  // file → { holder, queue }
    this.TIMEOUT_MS = 30_000;
  }

  acquire(file, subagentId) {
    const existing = this.locks.get(file);
    if (!existing) {
      this.locks.set(file, { holder: subagentId, queue: [] });
      return true;
    }
    // Queue the request (FIFO)
    existing.queue.push(subagentId);
    return this.waitForLock(file, subagentId);
  }

  release(file, subagentId) {
    const lock = this.locks.get(file);
    if (lock && lock.holder === subagentId) {
      const next = lock.queue.shift();
      if (next) {
        lock.holder = next;
      } else {
        this.locks.delete(file);
      }
    }
  }
}
```

### Behavior:
1. First subagent to call write_file/edit_file on a path acquires the lock
2. Subsequent subagents queue (FIFO order)
3. Lock holder gets 30s window — if exceeded, force-released
4. SUBAGENT_TOOL_CALL event includes `resource` showing current lock holder

---

## 19. Undo Stack

**File**: `packages/cli/src/core/tools.js` (`UndoStack` class)

Every file write/edit is snapshotted:

```js
// Location: ~/.mcode/projects/{sessionId}/undo.json
class UndoStack {
  constructor(maxSize = 100) {
    this.stack = [];
    this.maxSize = maxSize;
  }

  push(entry) {
    this.stack.push(entry);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();  // oldest evicted
    }
    this.save();  // persist to disk
  }

  pop() {
    const entry = this.stack.pop();
    if (entry) {
      this.restore(entry);
    }
    return entry;
  }

  restore(entry) {
    if (entry.backup) {
      writeFileSync(entry.file, entry.backup);
    } else if (entry.operation === 'create') {
      unlinkSync(entry.file);
    }
  }
}
```

### Entry Structure:
```js
{
  id: "t1",
  file: "/path/to/file.ts",
  operation: "edit",     // write | edit | create | delete
  content: "new content",
  backup: "original content",
  model: "openai/gpt-4",
  subagentId: "subagent_001",
  timestamp: 1234567890
}
```

### Rollback Protection
If >50% of changes fail in a wave, a toast appears:
> "Multiple failures detected — consider undoing recent changes"

---

## 20. Cost Tracking

**File**: `packages/shared/src/index.js`

### Token Estimation:
```js
estimateTokens(text) = Math.ceil(text.length / 4)
```

### Rate Limiting:
```js
maxRpm = 60       // 60 requests per minute per provider
maxTpm = 120_000  // 120K tokens per minute per provider
```

### CostLedger:
```js
class CostLedger {
  constructor() {
    this.costs = {
      'openai/gpt-4': { input: 0.03, output: 0.06 },
      'anthropic/claude-3': { input: 0.003, output: 0.015 },
    };
  }

  calculateCost(modelId, inputTokens, outputTokens) {
    const rates = this.costs[modelId];
    if (!rates) return 0;
    return (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);
  }

  isRateLimited(providerId) {
    const window = this.providerWindow.get(providerId);
    return window && window.requests.length >= this.maxRpm;
  }
}
```

### Build Summary Cost Report:
```js
// BUILD_COMPLETE payload includes:
{
  cost: "$0.047",
  tokens: { input: 12500, output: 8700, total: 21200 },
  models: {
    "openai/gpt-4": { cost: 0.032, tokens: { input: 8000, output: 6000 } },
    "anthropic/claude-s": { cost: 0.015, tokens: { input: 4500, output: 2700 } }
  }
}
```

---

## 21. Auto-Search (Perplexity-style)

**File**: `packages/backend/src/chat-session.js`

When a chat prompt matches AUTO_SEARCH_RE (product queries, "how to", "latest", "vs", "who is", etc.):

```js
const AUTO_SEARCH_RE = /\b(price|how to|latest|vs|versus|who is|what is|when was|where is|compare|review|best |top )\b/i;

async autoSearch(query) {
  const results = await webSearch(query);
  socket.emit('chat:search_start', { query });
  for (const chunk of results) {
    socket.emit('chat:search_progress', { chunk });
  }
  socket.emit('chat:search_done', { results });
  return formatSearchContext(results);
}
```

### SearchAnimation States:

| State | Animation | CSS Classes |
|-------|-----------|-------------|
| Searching | Wave pulse on dots | `mcode-search-dot` keyframes |
| Reading | Page-turn animation | `mcode-read-progress` |
| Done | Fade + scale pop | `mcode-search-complete` |

Search animation uses cubic-bezier(0.16, 1, 0.3, 1) easing.

---

## 22. Error Recovery & Fallbacks

### Planner Fallback
If planning LLM fails → falls back to MockProvider. Build continues with mock plan.

### Subagent Retry with Fallback Models
Max 2 retries (3 total attempts) with model exclusion:
- Attempt 1: Highest-scoring model
- Attempt 2: Next-best (excludes attempt 1's model)
- Attempt 3: Last resort (excludes attempts 1 & 2's models)

```js
// router.js recordAssignment():
if (!success) {
  consecutiveFailures.get(ref)?.push(domain);
  if (failures.size >= 3) {
    this.excludeModel(ref);  // exclude for 30s rolling window
    consecutiveFailures.delete(ref);
  }
}
```

### Permission Timeout
```js
permissionTimeoutMs = Math.max(5_000, config.permissionTimeoutMs || 120_000);
// Default: 120 seconds — auto-denies and continues
```

### Rate-Limited Model Exclusion
```js
if (this.ledger.isRateLimited(provider.id)) continue;
```

### Live Escalation
- After 3 consecutive failures: -0.3 penalty (auto-switch)
- After 1-2 failures: -0.1 per failure penalty

### IDE Error Display

| Error Type | IDE Display |
|-----------|-------------|
| Subagent failed | TodoCard red border + error on hover |
| Todo needs_review | TodoCard amber border + badge |
| Wave partial failure | WaveProgress orange partial bar |
| Complete wave failure | Toast + retry button |
| Integration test failure | setIntegrationPass with status: 'failed' |
| WatchDaemon exceeded | WATCH_STATUS: 'stopped' + toast |

---

## Appendix A: File Inventory

### CLI Core (`packages/cli/src/core/`)

| File | Key Functions |
|------|---------------|
| orchestrator.js | runGod(), chat(), _integrationPass(), _bugfixRounds(), _schedule(), _spawn() |
| subagent-manager.js | runAll(), _schedule(), _spawn(), FileLockManager class |
| subagent.js | Subagent class, run(), parseAction() |
| planner.js | PLAN_SYSTEM prompt, Planner.plan(), parsePlanOutput() |
| router.js | ModelRouter, pick(), scoreModel(), recordResult(), warmUp() |
| chat-agent.js | ChatAgent, run(), streamText(), extractActions(), autoSearch() |
| tools.js | 19 ToolExecutor methods, UndoStack class |
| watch-daemon.js | WatchDaemon class |
| modes.js | SPECIAL_MODES, MODE_META, MODE_REASONING, MODES quality levels |
| techstack.js | detectTechStack(), smartDefaults() |

### Shared Contracts (`packages/shared/src/`)

| File | Exports |
|------|---------|
| plan.js | normalizeTodo, normalizePlan, planWaves, findCycle, resolveFileConflicts, isEligible |
| events.js | EVENTS, SUBAGENT_STATUS, SESSION_MODES, SOCKET, WATCH_OUTCOMES |
| domains.js | TASK_DOMAINS, DOMAIN_COLORS, DEFAULT_CONFIG, DEFAULT_ROUTING |
| index.js | CostLedger, estimateTokens |
| provider.js | ModelProvider, HttpProvider, streamSSE, fetchWithRetry, sleep |
| plugins.js | Plugin loading logic |

### Backend Bridge (`packages/backend/src/`)

| File | Functions |
|------|-----------|
| chat-session.js | runGod(), runChat(), runAgent(), autoSearch(), updateTodos() |
| sockets.js | Socket.IO event routing, session map |

### Frontend (`packages/web/src/`)

| File | Key Exports |
|------|-------------|
| hooks/useChatSocket.ts | 24 socket event handlers with Redux dispatch |
| store/chatSlice.ts | Redux slice with 40+ reducers for chat/god-mode state |
| components/chat/SpinnerBlock.tsx | SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'], 80ms tick rate |
| components/chat/AgentActionSequence.tsx | Combined thinking indicator (StepPulse + timer + ToolCallCard) |
| components/chat/ReactionBurst.tsx | Pop + 6-particle explosion (CSS keyframes) |
| components/chat/SearchAnimation.tsx | Search states: searching → reading → done |
| components/chat/StepPulse.tsx | CSS 1.1s pulse animation for mcode thinking label |
| components/ide/WaveProgress.tsx | God-mode wave dashboard with Framer Motion |
| components/ide/TodoCard.tsx | Todo display with spring animations |
| components/ide/StepCards.tsx | Tool result cards (uses SpinnerBlock) |
| components/pages/AIChatPage.tsx | Main page (Chat + AI Code Editor + IDE tabs) — 1720+ lines |

### CLI UI (`packages/cli/src/ui/`)

| File | Exports |
|------|---------|
| blocks.jsx | SpinnerBlock, ThoughtBlock, RunningToolBlock, SPIN_FRAMES |
| useTicker.js | TICK_RATE_MS = 80, global singleton ticker |
| useEntrance.js | Progressive line reveal hook |
| useAnimatedProgress.js | 8-frame percentage interpolation (20ms interval) |
| themes.js | Theme colors (green: #3ecf8e, dim: #8b8d98, accent: #6c8cff) |

---

## Appendix B: CSS Color Variables

**File**: `packages/web/src/styles/index.css`

```css
:root {
  --mcode-green: #3ecf8e;           /* primary emerald accent */
  --mcode-text-dim: #8b8d98;        /* secondary text */
  --mcode-accent: #6c8cff;          /* blue accent */
  --mcode-bg: #0d0e12;              /* background */
  --mcode-border: #26272f;          /* border color */
}
```

### CLI ↔ IDE Theme Alignment

| Element | CLI (themes.js) | IDE (index.css) |
|---------|-----------------|-----------------|
| Primary green | `#3ecf8e` | `--mcode-green: #3ecf8e` |
| Dim text | `#8b8d98` | `--mcode-text-dim: #8b8d98` |
| Accent blue | `#6c8cff` | `--mcode-accent: #6c8cff` |

### Animation Easing Constants

| Purpose | CSS/JS Value |
|---------|-------------|
| Framer Motion standard | `[0.4, 0, 0.2, 1]` |
| Framer Motion spring-like | `[0.16, 1, 0.3, 1]` |
| Framer Motion spring | `stiffness: 500, damping: 20` |
| CSS mcode-input-glow-spin | `linear infinite` (4s) |
| CSS mcode-stream-text-in | `cubic-bezier(.16, 1, .3, 1)` |

### Background Animation CSS Classes

```css
/* mcode input border glow — conic sweep animation */
.mcode-input-glow {
  animation: mcode-input-glow-spin 4s linear infinite;
  background: conic-gradient(from 0deg, transparent 0%, #3b82f6 30%, transparent 50%, #10b981 80%, transparent 100%);
}

@keyframes mcode-input-glow-spin {
  to { transform: rotate(360deg); }
}
```

---

*End of ZCode Smart Engine Documentation*
# God Mode — Complete Architecture & Flow

> Parallel subagent execution in dependency-sorted waves (default 5
> concurrent, `--concurrency` to tune) with undo-safe file writes.

---

## 1. Overview

God Mode = `mcode god "<prompt>"` or toggle in web UI. Creates a project-wide plan, launches domain-specialized subagents in parallel waves (one subagent per todo, default 5 concurrent), runs integration tests, auto-fixes failures, and verifies completion.

```
User Prompt → Planner (AI) → Task DAG → File Ownership Map → 
  Wave 1 (independent todos) → up to 5 subagents parallel
    → Wave 2 (depend on wave 1) → more subagents
    → N waves → Integration Tests → Bugfix Rounds → Build Complete
```

---

## 2. Complete Flow — Start to End

### Phase 1: Project Scan + Model Warmup
1. **Scan codebase** — reads package.json, README, git status, file tree
2. **Warm up models** — `ModelRouter.warmUp()` fetches best model for each domain in parallel (50ms/model)
3. **Load hooks** — `.mcode/hooks.js` for `preBuild`, `preWave`, `preAgent`, `postAgent`, `postWave`, `postTest`, `postBuild`
4. **Initialize undo stack** — `undo.json` persists all file writes for rollback

### Phase 2: Planning (AI)
```
User prompt + codebase context → Planner (ChatAgent)
→ Generates plan: { summary, todos: [{ id, domain, title, description, files, dependsOn, maxTurns }] }
→ resolveFileConflicts(plan) — chains same-file todos into dependency order
→ planWaves(plan) — topological sort into waves
```

### Phase 3: Wave Execution (Parallel Subagents)
Each wave runs independently; subagents in the same wave never touch the same file.

```
for each wave:
  1. Filter ready todos (isEligible — all deps DONE)
  2. Dispatch up to `concurrency` subagents (default: 5, configurable via --concurrency)
  3. Each subagent gets domain-specific model assignment from ModelRouter
  4. Subagent runs with JSON tool protocol: {tool, args} → file edits, test runs, shell commands
  5. Results collected → merged into undo stack
  6. Wait for all wave subagents to complete
  7. preWave/preAgent/postAgent hooks fire
```

### Phase 4: Integration Tests
```
npm test → if fail → _bugfixRounds()
→ One bugfix subagent per FAILED todo
→ Re-run tests
→ Up to 3 rounds
```

### Phase 5: Watch Mode (if enabled)
Background subagent monitors file changes + test results, auto-fixes new issues while user continues working.

### Phase 6: Completion
```
BUILD_COMPLETE event → summary with:
- done/failed/needsReview counts
- elapsed time, token usage, cost estimate
- models used per domain
- file changes (undo stack count)
```

---

## 3. Layered Model Scoring System

Model selection uses 5-layer weighted scoring. Higher score = preferred.

### Layer 1: Static Benchmark (20% weight)
```js
// Per-domain benchmark scores from public eval (SWE-bench, HumanEval, etc.)
const STATIC_BENCHMARK = {
  'claude-3-5-sonnet':  { planning: 0.92, frontend: 0.88, backend: 0.91, db: 0.85, test: 0.87, bugfix: 0.90 },
  'gpt-4o':             { planning: 0.85, frontend: 0.92, backend: 0.88, db: 0.83, test: 0.91, bugfix: 0.86 },
  'gemini-2.0-flash':   { planning: 0.80, frontend: 0.85, backend: 0.89, db: 0.81, test: 0.88, bugfix: 0.83 },
};
```

### Layer 2: Historical Success Rate (50% weight)
```js
// Per-model, per-domain, per-project-stack success tracking
// Stored in ~/.mcode/scores/{projectId}/model-scores.json
{
  "claude-3-5-sonnet:frontend": {
    success: 42,      // tasks passed (tests passed on first try)
    total: 50,        // total tasks dispatched
    avgFixups: 0.12,  // avg bugfix rounds per task (lower = better)
    avgLatency: 4.2,  // avg seconds per 1K tokens (lower = better)
    avgCost: 0.002    // avg $ per 1K tokens (lower = better)
  }
}
```

**Scoring formula:**
```
historical_score = 
  (success / total) * 100          // success rate (0-100)
  - (avgFixups * 15)               // penalty per fixup round
  - (avgLatency > 5 ? 5 : 0)       // slow model penalty
  - (avgCost > 0.01 ? 10 : 0)      // expensive model penalty
```

### Layer 3: Task Fingerprint Match (20% weight)
```js
// Matches model → framework/language → task type
{
  "claude-3-5-sonnet": {
    frameworks: { react: 0.95, vue: 0.80, svelte: 0.60 },
    languages:  { js: 1.0, ts: 0.95, python: 0.90 },
    taskTypes:  { "code-gen": 0.92, "bug-fix": 0.88, "refactor": 0.85, "test": 0.91 }
  }
}
```

### Layer 4: User Override (10% weight — highest priority)
```js
// From ~/.mcode/config.json → routing preferences
{
  "roles": {
    "frontend": { "preferredModels": ["gemini-2.0-flash"] },  // pinned by user
    "backend":  { "preferredModels": ["claude-3-5-sonnet"] }
  }
}
```
User overrides bypass scoring entirely for that domain.

### Layer 5: Live Fallback/Escalation (auto-trigger)
If a model fails 3 consecutive times for a todo type:
```
escalated_models[domain] = otherModels
  .filter(m => historical_score[m][domain] > threshold)
  .sortDescending()
  .slice(0, N)
```
Switches to next-best model automatically for that domain.

### Final Formula
```
final_score(model, domain, task) =
  0.20 × static_benchmark_score(model, domain) +
  0.50 × historical_success_rate(model, domain) +
  0.20 × fingerprint_match(model, task.framework, task.language) +
  0.10 × user_override_priority(model, domain)
  + live_escalation_adjustment(model, domain)
```

---

## 4. File Ownership Map + Lock Queue

### Static Resolution (`resolveFileConflicts` in shared/plan.js)
Before any execution, todos that touch the same file are chained:
```js
// If todoA writes to src/App.jsx and todoB also writes to src/App.jsx:
// → todoB.dependsOn includes todoA (sequential, not parallel)
```

### Runtime Lock Queue (enhanced `SubagentManager`)
Additional layer: when shared files (constants, types, configs) need cross-todo edits:

```
Agent A → requests lock on "src/types.ts"   → ✅ Granted
Agent B → requests lock on "src/types.ts"   → ⏳ Queued (runs independent work meanwhile)
Agent A → finishes edit + commits          → lock released
Agent C → requests lock on "src/types.ts"   → ✅ Granted (next in queue)
```

**Lock API:**
```js
class FileLockManager {
  async acquireLock(agentId, filePath, timeout = 30000) { ... }
  releaseLock(agentId, filePath) { ... }
  // Integration agent batches queued shared-file requests
}
```

### Shared File Detection Heuristics
Files classified as **shared** (need locks, not just dependency chains):
- Path patterns: `src/types*`, `src/config*`, `src/constants*`, `**/schema.*`, `**/types.*`
- File extensions: `.schema.js`, `.types.ts`
- Cross-domain usage: tracked via previous wave file access logs

Files classified as **exclusive** (safe to parallelize):
- Component files: `*.component.*`, `*.jsx`, `*.tsx`
- Domain-specific files: `frontend/**`, `backend/routes/**`, `db/migrations/**`

---

## 5. Watch Mode Flow

### A. During God Mode
Watch mode **auto-enabled** when god mode starts. A background "watchdog" subagent:
- Monitors file writes via git diff every 5s
- Runs `npm test` in 30s intervals
- Scans for import errors / syntax errors
- Detects new bugs introduced by parallel agents
- Auto-dispatches bugfix subagents for new issues

### B. Standalone Watch Mode (`/watch on`)
```
/watch on → starts detached daemon process
  → watches file changes
  → on each change:
    1. Detect changed files
    2. Determine affected domains (frontend/backend/db)
    3. Dispatch 1 bugfix subagent (best model for bugs/errors domain)
    4. Run tests
    5. Notify user via toast
  → survives terminal close (detached process)
  → /watch off | status | logs | undo to control
```

The watchdog auto-selects models using the scoring system — bugs/errors/testing domain models get priority.

---

## 6. Watch Mode + Normal Build Mode

| Feature | Normal Build | Watch Mode |
|---------|-------------|------------|
| File scanning | Once at start | Continuous (5s interval) |
| Test running | Integration pass at end | Every 30s continuously |
| Bug detection | Post-test bugfix rounds | Real-time during development |
| Agent dispatch | Wave-based parallel | On-demand bugfix agents |
| Model selection | Scoring system | Bugs/errors domain models prioritized |
| Process lifecycle | Completes + exits | Daemon, survives terminal close |
| User interaction | Wait for completion | Live (user keeps working) |

---

## 7. Completion Verification Loop

After all waves + bugfix rounds, the system re-reads the user's prompt to verify:

```
User prompt: "Create a login page with OTP"
→ After build: AI agent re-reads prompt
→ Checks: LoginPage.jsx exists ✓, OTP flow works ✓, tests pass ✓
→ If any requirement unmet → restart with adjusted plan (max 2 re-reads)
→ If all met → mark complete
```

Each completed todo gets a checkmark in the plan. When all todos are checked → build summary.

---

## 8. CLI UI Integration

### God Mode State in App.jsx
```js
// Triggers ProcessingScreen overlay
{ kind: 'system', message: { mode: 'god', projectPath, status: 'in_progress' } }

// Build elapsed timer (via useTicker, 1s granularity)
const elapsed = Math.floor(ticks / 12.5);

// Wave start/complete events → AgentStrip + StatusBar updates
WAVE_START → emit to AgentStrip
WAVE_COMPLETE → emit to StatusBar
BUILD_COMPLETE → emit final summary
```

### ProcessingScreen (CLI)
```
╭─ Build in progress ──────────────────╮
│ Wave 3/7 • 12/45 agents running      │
│                                       │
│ [██████░░░░░░░░░░] 32% │ 2:45 elapsed │
│ frontend: 8/10 done                    │
│ backend:  4/12 done                    │
│ db:       0/5 done                     │
│ test:     0/3 done                     │
│                                       │
│ 🔴 SubAgent [backend] Fixing Express  │
│ ⚙️  SubAgent [frontend] Building Comp │
│ ⚙️  SubAgent [frontend] Writing tests │
╰───────────────────────────────────────╯
```

### Web AI ChatPage (God Mode)
- Topbar God Mode toggle: purple-pink gradient glow
- WaveProgress component: animated progress bars (width 0→pct%)
- Chat messages: size="sm" (compact IDE style)
- ThinkingIndicator: compact (no avatar)
- PermissionModal: height expand (0→auto, 150ms)

---

## 9. Event Flow (Backend → Frontend)

### CLI Events → Socket.IO → Web
```
EVENTS.MESSAGE (stream) → socket.emit('chat:stream', {text: chunk})
EVENTS.SUBAGENT_CREATED → socket.emit('subagent:created', {todoId, domain})
EVENTS.SUBAGENT_STARTED → socket.emit('subagent:started', {todoId, model})
EVENTS.SUBAGENT_STEP   → socket.emit('subagent:step', {todoId, message})
EVENTS.SUBAGENT_DONE   → socket.emit('subagent:done', {todoId, summary})
EVENTS.SUBAGENT_FAILED → socket.emit('subagent:failed', {todoId, error})
EVENTS.WAVE_START      → socket.emit('wave:start', {wave, total, todos})
EVENTS.WAVE_COMPLETE   → socket.emit('wave:complete', {wave, total, results})
EVENTS.INTEGRATION_PASS → socket.emit('integration:pass', {ran, status, exitCode})
EVENTS.BUILD_COMPLETE  → socket.emit('build:complete', {done, total, failed, cost, tokens, models})
EVENTS.TOAST           → socket.emit('toast', {kind, text})
EVENTS.PERMISSION_ANSWER → socket.emit('chat:permission', {requestId, tool, args})
```

### Web Events → Socket.IO → CLI
```
session:start → orchest.sessionStart()
plan:generated → orchest.receivePlan()
agent:started/stopped → orchest.setAgentStatus()
chat:send → orchest.chat()
chat:interrupt → orchest.interrupt()
chat:permission_answer → orchest.permissionAnswer()
terminal:command → orchest.runShellCommand()
```

---

## 10. Completion Criteria

A god-mode build is "complete" when:
1. ✅ All waves executed
2. ✅ All todos done OR failed (with max 3 bugfix retries)
3. ✅ Integration tests passing (or failures documented)
4. ✅ User prompt requirements verified by re-read
5. ✅ Undo stack has all file changes recorded
6. ✅ BUILD_COMPLETE event emitted with summary

When complete:
- CLI: ProcessingScreen → final summary card (tokens, cost, time)
- Web: WaveProgress → build summary, chat returns to normal
- Files: `git diff` shows all changes, `undo.json` enables `/undo`

---

## 11. Watch Mode Completion

Watch mode has no "completion" — it's a daemon:
- Runs until `/watch off` or process killed
- Auto-fixes bugs continuously
- Stats available via `/watch status` or `/watch logs`
- Undo via `/undo` (works alongside watch)

# ZCode — Complete Knowledge Base: Architecture, Flow, Animations, Components & Tests

> **Scope note (2026-09-26):** this file documents the ZCode Electron desktop
> app + CLI (v2/v3.x) as observed on 2026-08-13 — a **different product** from
> the `mcode` monorepo in this repo (`packages/cli` v2.4.6, OpenTUI).
> God-mode capacity below refers to ZCode; mcode runs max 5 concurrent
> subagents per wave (`--concurrency`).
>
> **Comprehensive reference** — Everything about ZCode from startup to shutdown, covering the CLI runtime, Electron desktop app, plugin system, MCP servers, skills, animation systems (both web/desktop and terminal CLI), and the full test suite.
>
> **Last updated:** 2026-08-13
> **Sources:** `C:\Users\mahen\.zcode\` (v2 config, plugin cache), `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\` (desktop app), `D:\projects\mcoode\` (project-level docs and tests)

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Configuration System](#2-configuration-system)
3. [Electron Desktop App](#3-electron-desktop-app)
4. [Startup Animation Flow](#4-startup-animation-flow)
5. [Process Architecture](#5-process-architecture)
6. [CLI Runtime](#6-cli-runtime)
7. [Agent Protocol & Turn Machine](#7-agent-protocol--turn-machine)
8. [Hooks System](#8-hooks-system)
9. [Plugin System](#9-plugin-system)
10. [MCP Servers](#10-mcp-servers)
11. [Skills Catalog (All 15)](#11-skills-catalog-all-15)
12. [Model Providers & Catalog](#12-model-providers--catalog)
13. [Animation Systems](#13-animation-systems)
14. [Web UI Components](#14-web-ui-components)
15. [Terminal CLI Animations](#15-terminal-cli-animations)
16. [Test Suite](#16-test-suite)
17. [mcoode Project](#17-mcoode-project)
18. [Appendices](#appendices)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZCode Desktop App (v3.7.6)                   │
│                    ┌─────────────────────────┐                 │
│                    │   Main Process          │                 │
│                    │   (index.js, 1043KB)    │                 │
│                    │   • App lifecycle       │                 │
│                    │   • BrowserWindow       │                 │
│                    │   • IPC handlers        │                 │
│                    │   • Spawns host+schedu  │                 │
│                    └────────┬───────┬────────┘                │
│                             │       │                         │
│                             ▼       ▼                         │
│                    ┌────────────┐ ┌────────────┐              │
│                    │  Renderer  │ │  Host Prc  │              │
│                    │ (React 19) │ │ (1.5MB)    │              │
│                    │ assets/    │ │ 37 services│              │
│                    │ 757 JS+2   │ │ ChannelSrv │              │
│                    │ index.html │ └────────────┘              │
│                    │ startup    │                             │
│                    │ anim       │                             │
│                    └────────────┘                             │
│                            │                                  │
│                    ┌───────┴───────┐                          │
│                    │  Scheduler    │                          │
│                    │ (SQLite cron) │                          │
│                    └───────────────┘                          │
│                                                               │
│                    ┌─────────────────────────────────────────┐│
│                    │        Preload (contextBridge)          ││
│                    │        index.cjs (ARMS bridge)          ││
│                    └─────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐  ┌──────────────────────┐
│         ZCode CLI (v0.16.3)      │  │   Plugins (7 active) │
│         zcode.cjs (3641 lines)   │  │   @ .zcode/cli/plugins│
└───────────────────────────────────┘  └──────────────────────┘
          │  │                              │
          ▼  ▼                              ▼
┌──────────────┐ ┌──────────────────────┐  ┌──────────────────┐
│ Commands:    │ │ Agent Protocol (JSON)│  │ android-emulator │
│ help, login, │ │ RPC over stdin/std   │  │ browser-use      │
│ logout, cmd, │ │ turn machine (Si)    │  │ document-skills  │
│ plugins, skls│ │ hooks, features      │  │ ios-simulator    │
│ TUI          │ │ workflow sandbox     │  │ restore-legacy-s │
└──────────────┘ └──────────────────────┘  │ skill-creator    │
                                           │ zcode-guide        │
                                           └──────────────────┘
```

### Key Paths

| Component | Path |
|-----------|------|
| Desktop app | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\app-extracted\out\` |
| CLI bundle | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\glm\zcode.cjs` (3,641 lines) |
| Model catalog | `C:\Users\mahen\AppData\Local\Programs\ZCode\resources\model-providers\*.json` |
| Plugins cache | `C:\Users\mahen\.zcode\cli\plugins\cache\zcode-plugins-official\` |
| v2 config | `C:\Users\mahen\.zcode\v2\` (config.json, setting.json, etc.) |
| Project docs | `D:\projects\mcoode\docs\cli/`, `docs\web\` |

---

## 2. Configuration System

### V2 Config Files (`C:\Users\mahen\.zcode\v2\`)

```
v2/
├── config.json              # Model provider configurations (9.8 KB, 8 providers)
├── setting.json             # User settings/preferences (1.9 KB, 33 keys)
├── credentials.json         # Encrypted OAuth credentials
├── telemetry-state.json     # Device ID + last active date
├── bot-state.v2.json        # Bot state (empty: {"version":2,"bots":{}})
├── coding-plan-cache.json   # Coding plan entry status (4 providers)
├── tasks-index.sqlite       # SQLite task database (1MB + WAL)
├── certs/                   # CA key/cert for TLS interception
├── crash/                   # Crash dumps (live + archive)
└── logs/                    # Daily log files (2026-08-01 through 2026-08-13)
```

### config.json — Model Providers

| Provider ID | Name | Kind | Enabled | Notes |
|-------------|------|------|---------|-------|
| `builtin:bigmodel-coding-plan` | BigModel - Coding Plan | anthropic | No | `oauth_provider_inactive` |
| `builtin:bigmodel-start-plan` | BigModel- Coding Plan | anthropic | No | `oauth_provider_inactive` |
| `builtin:zai-coding-plan` | Z.ai - Coding Plan | anthropic | No | `coding_plan_not_entitled` (API key present) |
| `builtin:zai-start-plan` | Z.ai - Coding Plan | anthropic | No | `coding_plan_not_entitled` (JWT present) |
| `builtin:bigmodel` | BigModel - API Key | anthropic | No | `oauth_provider_inactive` |
| `builtin:zai` | Z.ai - API Key | anthropic | **Yes** | Active, no API key |
| `73b59c4c-...` | Poolside | anthropic | **Yes** | Active (`poolside/laguna-s-2.1`) |
| `8378c166-...` | OpenRouter Free | openai-compatible | Yes | No models configured |
| `8655f5b1-...` | opencode zen | openai-compatible | Yes | Uses `deepseek-v4-flash-free` |

**Active provider:** `73b59c4c-eeda-4b71-937a-66ad2a4dd4c9` ("Poolside") with model `poolside/laguna-s-2.1`

### setting.json — Key Settings

```json
{
  "locale": "en-US",
  "terminalInheritSystemProfile": true,
  "taskAutoArchiveEnabled": false,
  "closeToTrayOnWindows": true,
  "zcodeInteractionBehavior": "queue",
  "askUserQuestionAutoResolutionEnabled": true,
  "enabledBuiltinAgentCliProviders": ["glm"],
  "repoSnapshotIndexingEnabled": false,
  "instantGrepIndexingEnabled": false,
  "nativeSearchEnhancementsEnabled": true,
  "memoryEnabled": false
}
```

### CLI Config Schema (from `zcode.cjs`)

**Default config (`qi` in CLI bundle):**

| Key | Default | Description |
|-----|---------|-------------|
| `permission.mode` | `"build"` | Permission mode: plan\|build\|edit\|yolo |
| `permission.autoApproveHighRisk` | `false` | Auto-approve high-risk tools |
| `storage.dir` | `"~/.zcode"` | Persistent storage directory |
| `storage.sessionDbPath` | `"~/.zcode/cli/db/db.sqlite"` | Session database path |
| `network.timeout` | `180000` | 3-minute timeout |
| `features.compact` | `true` | Conversation compaction |
| `features.rewind` | `true` | Workspace checkpoints |
| `features.subagent` | `true` | Subagent spawning |
| `features.memory` | `true` | Project memory system |
| `features.skill` | `true` | Skills loading |
| `features.mcp` | `true` | MCP server support |
| `hooks.enabled` | `false` | Hooks disabled by default |
| `hooks.timeoutMs` | `60000` | 60s hook timeout |
| `hooks.maxOutputBytes` | `32768` | 32KB max hook output |
| `logging.level` | `"info"` | Log level |
| `logging.format` | `"text"` | Log format |
| `toolConcurrency.maxConcurrency` | `10` | Max concurrent tool calls |
| `ui.locale` | `"en-US"` | Default locale |
| `ui.theme` | `"auto"` | Default theme |

**Config merge order (scope priority):** System(0) < User(10) < Project(20) < Session(30) < Env(40) < Cli(50)

---

## 3. Electron Desktop App

### Directory Structure (`app-extracted/out/`)

```
out/
├── main/
│   ├── index.js              (1043 KB — Electron main process)
│   ├── chunk-FQMTTDFW.js     (logging/tracing)
│   ├── chunk-FEYUN5KX.js     (core utilities)
│   ├── chunk-LQDBAECE.js     (fs ops, child_process)
│   └── chunk-YJ3457FW.js     (SSH, more core)
├── renderer/
│   ├── index.html            (7.3 KB — startup animation)
│   ├── index-BxSv8qTx.css    (366 KB — Tailwind + app CSS)
│   ├── assets/
│   │   ├── index-ABImDspU.js (37 services, startup animation JS)
│   │   ├── styles-CdEGpc2x.js (4.5 MB — main renderer)
│   │   └── [755 more JS files]
│   └── (757 total JS + 2 CSS files)
├── host/
│   └── index.js              (1.5 MB, 1503 lines — host process)
├── scheduler/
│   └── index.js              (945 KB, 523 lines — task scheduler + Zod)
└── preload/
    ├── index.cjs             (40 lines — ARMS telemetry bridge)
    ├── processMonitor.cjs
    └── embeddedBrowserJavaScriptDialog.cjs
```

### Package Info

- **Package:** `@zcode/desktop` v3.7.6
- **Framework:** Electron + React 19 + Vite
- **Build tool:** Vite (ESBuild bundling)
- **486 node_modules packages** (third-party deps only; no `@zcode/*` source in node_modules)

---

## 4. Startup Animation Flow

### Complete Flow Diagram

```
1. Electron app starts → app.whenReady()
   │
   ├─── Sets up protocol handlers
   ├─── Spawns scheduler process (fork)
   ├─── Configures auto-updater
   ├─── Applies network policy (desktop CA)
   ├─── Sets up tray, deep links, single-instance lock
   │
2. ensurePrimaryWindow("app-ready") → createWindow()
   │   new BrowserWindow({ width: 1200, height: 800 })
   │   loads index.html immediately (no show:false)
   │
3. Renderer: index.html loads
   │   │
   │   ├── #loading overlay visible (z-index: 2147483647)
   │   ├── CSS: .startup-logo-shell plays startup-logo-pop (0.72s)
   │   ├── index-ABImDspU.js starts executing
   │   │
   │   ├── Checks: windowKind === "update-status"? → skip all
   │   ├── Checks: prefers-reduced-motion? → skip animation
   │   ├── Listens for: animationend event (1s fallback timer)
   │   └── Listens for: zcode-react-startup-ready event (3s fallback)
   │
4. React mounts → $() component dispatches "zcode-react-startup-ready"
   │   → P = true → checks: N && P → F() fires
   │
5. F() — Transition gate:
   │   if (M || !N || !P) return;  // wait for BOTH flags
   │   M = true
   │   document.body.classList.add("zcode-startup-ready")
   │   setTimeout(() => loadingEl.remove(), 500)
   │
6. Main process: dom-ready handler
   │   ├── process.platform === "win32" → window.show() + window.focus()
   │   ├── Spawns host process (fork with runtimeProcessEnvPatch)
   │   ├── Creates MessagePort pair
   │   └── webContents.postMessage("zcode:service-port", null, [port])
   │
7. Renderer: service-port handler
   │   ├── Receives MessagePort from main
   │   ├── Creates service bridge (ChannelClient)
   │   ├── Initializes all 37 services on port
   │   └── createRoot(document.getElementById("root")).render(...)
   │       → React app renders → dispatches zcode-react-startup-ready
   │
8. Host process: InitLocal message received
    ├── tY() creates local services (37 services)
    ├── Ym() exposes services via ChannelServer on MessagePort
    └── Posts "local services ready" back
```

### Startup Animation CSS (from `index.html`)

```css
#root { opacity: 0; transition: opacity 0.16s ease; }
body.zcode-startup-ready #root { opacity: 1; }
#loading { position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center; transition: opacity 0.16s ease; }
body.zcode-startup-ready #loading { pointer-events: none; opacity: 0; }

.startup-logo-shell {
  width: 96px; height: 96px; border-radius: 24px;
  background: linear-gradient(180deg, #000 0%, #151718 100%);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
  transform: scale(0.72); opacity: 0;
  animation: startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform-origin: center;
}
.startup-logo-shell::before {
  position: absolute; inset: 0; pointer-events: none; content: "";
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: inherit;
}

@keyframes startup-logo-pop {
  0%   { opacity: 0; transform: scale(0.72); }
  38%  { opacity: 1; transform: scale(1.045); }
  58%  { transform: scale(0.985); }
  76%  { transform: scale(1.008); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .startup-logo-shell { opacity: 1; transform: scale(1); animation: none; }
}
```

### Startup Animation JS (from `index-ABImDspU.js`)

```javascript
var k = document.querySelector(".startup-logo-shell"),
    A = document.getElementById("loading"),
    j = new URLSearchParams(window.location.search).get("windowKind") === "update-status",
    ke = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    M = false,  // transition fired
    N = false,  // logo animation complete
    P = false;  // React ready

F = () => { M || !N || !P || (M = true,
  document.body.classList.add("zcode-startup-ready"),
  window.setTimeout(() => A?.remove(), 500) ); };
I = () => { N = true; F() };     // animationend handler
L = () => { P = true; F() };     // react-ready handler

j ? (M = true, document.body.classList.add("zcode-startup-ready"), A?.remove())
  : window.addEventListener("zcode-react-startup-ready", L, {once: true});

j || ke || !k ? I()
  : (k.addEventListener("animationend", I, {once: true}),
     window.setTimeout(I, 1000));

j || window.setTimeout(L, 3000);
```

### Startup Animation Timing Summary

| Phase | Duration | Easing/Curve | Fallback |
|-------|----------|-------------|----------|
| Logo `startup-logo-pop` | 720ms | `cubic-bezier(0.22, 1, 0.36, 1)` | N/A |
| Logo `animationend` listener | — | — | 1000ms `setTimeout(I, 1e3)` |
| React startup ready | — | — | 3000ms `setTimeout(L, 3e3)` |
| `#loading` fade-out | 160ms | `ease` | — |
| `#root` fade-in | 160ms | `ease` | — |
| Loading element removal | — | — | 500ms after `zcode-startup-ready` |

### React Startup Ready Dispatch (`$()` component)

```javascript
function $() {
  return (0, Ae.useEffect)(() => {
    window.__ZCODE_REACT_COMMIT_AT__ = Date.now();
    window.dispatchEvent(new Event("zcode-react-startup-ready"));
  }, []), null;
}
```

---

## 5. Process Architecture

### Four Processes

1. **Main Process** (`out/main/index.js`, 1043 KB): Electron main process
   - App lifecycle (`app.whenReady`, `app.on("activate", ...)`)
   - BrowserWindow creation and management
   - IPC handlers (file dialogs, remote control, etc.)
   - Protocol handlers
   - Spawns scheduler and host processes
   - Crash reporting (`crashReporter`)

2. **Renderer Process** (`out/renderer/`): React 19 UI
   - Entry: `index.html` → `assets/index-ABImDspU.js` (37 services via React context)
   - Main bundle: `assets/styles-CdEGpc2x.js` (4.5 MB)
   - CSS: `assets/styles-BxSv8qTx.css` (366 KB, Tailwind)
   - 757 JS asset files (charts, KaTeX, Mermaid, Office viewers)

3. **Host Process** (`out/host/index.js`, 1.5 MB): Service orchestrator
   - 37 ZCode services injected via ESM context
   - ChannelServer for service communication over MessagePort
   - Task scheduling and execution
   - File operations, git, search, terminal, model providers

4. **Scheduler Process** (`out/scheduler/index.js`, 945 KB): Background automation
   - SQLite `DatabaseSync` for automations table
   - Cron-based scheduling via `CronCreate`/`CronDelete`/`CronList`/`CronUpdate`
   - Hash computation and file system operations

### Host Process — 37 Services (`tY` function)

```
settingService, credentialService, oauthCredentialRepo,
modelProviderService, apiClient, gitService, fileService,
zcodeAgentService, zcodeTaskService,
usageStatsService, searchService, shellService,
telemetryService, pluginService, hookService, skillService,
mcpService, sessionService, toolService,
webSearchService, webFetchService,
terminalService, processMonitorService, workspaceService,
authService, conversationService, taskService,
projectMemoryService, rewindService, compactService,
forkService, expertService, workflowService,
localeService, localePreferenceService,
themeService, notificationService,
downloadService, updateService, configService,
agentRuntimeService, mcpGatewayService,
documentPreviewService, processManagerService
```

### Preload (`out/preload/index.cjs`)

```javascript
contextBridge.exposeInMainWorld("zcode", {
  connectRemote, cancelPendingRemoteConnection,
  startWebRemoteControl, stopWebRemoteControl,
  log, selectDirectory, selectFile, selectFiles, saveFile,
  printPageToPdf, getPathForFile, createTempTextAttachment,
  onRemoteConnectionLog, onRemoteSessionClosed, onBotRemoteWorkspaceReconnected,
  // ... many more IPC methods
});
contextBridge.exposeInMainWorld("__ZCODE_DEVICE_ID__", deviceId);
contextBridge.exposeInMainWorld("__zcodeFinalArmsCustomEventsE2E", ...);
```

---

## 6. CLI Runtime

### Main Commands (dispatch at line 3637 of `zcode.cjs`)

```javascript
switch(command) {
  case "help":      return showHelp();           // K3e
  case "version":   return stdout.write(version); // PE
  case "app-server":
  case "agent-server": return runZCodeProtocolAgent(); // Jya
  case "doctor":    return runDiagnostics();    // Kya
  case "login":     return loginOAuth();        // z3e
  case "logout":    return removeCredentials(); // N3e
  case "commands":  return manageCommands();    // uHn
  case "plugins":   return managePlugins();     // OKn
  case "skills":    return manageSkills();      // W3e
  case "tui":       return startTUI();          // SJn
  default:          return stderr.write(`Unknown command`);
}
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--prompt/-p` | Inline prompt (runs agent loop) |
| `--attach` | Attach to existing session |
| `--cwd` | Working directory |
| `--browser-use=headless` | Browser use mode |
| `--max-turns` | Maximum conversation turns |
| `--allowed-tools` | Allowed tool list |
| `--disallowed-tools` | Disallowed tool list |
| `--mode` | Permission mode: build\|edit\|plan\|yolo |
| `--locale` | UI locale |
| `--settings` | Settings file path |
| `--resume` | Resume session ID |
| `--target` | Target URL (web remote) |
| `--target-replace` | Replace target |
| `--continue/-c` | Continue latest session |
| `--force/-f` | Force operation |
| `--force-mcs` | Force mobile client simulation |
| `--json` | JSON output mode |
| `--no-browser` | Don't open browser |
| `--no-color` | Disable colors |
| `--verbose` | Verbose logging |
| `--print` | Print only (no execution) |

### Agent Protocol Flow (`runZCodeProtocolAgent` / `VWn`)

```javascript
// 1. Telemetry setup: D3e() → device MID collection
// 2. Session store: aUn() → SQLite-based kC
// 3. MCP lease: aln() → only if config.features.mcp !== false
// 4. ZCode app: f9t() wrapped in $3e (protocol surface)
// 5. Browser broker: fRe() → if MCP enabled
// 6. Protocol transport: O3e() → stdin/stdout JSON-RPC bridge
// 7. Process resource sampler: qWn() → emits processResourceSample events

// Cleanup (finally block, 1500ms timeout per step, Fga):
// - stop sampler, close browser broker, close MCP lease,
//   close session store, shutdown telemetry
```

---

## 7. Agent Protocol & Turn Machine

### Turn Machine (`Si` class — `TurnMachineImpl`)

**Turn phases (`fn` enum):**

| Phase | Value |
|-------|-------|
| Idle | `"idle"` |
| ProcessingInput | `"processing_input"` |
| AwaitingModelResponse | `"awaiting_model_response"` |
| Streaming | `"streaming"` |
| SchedulingTools | `"scheduling_tools"` |
| ExecutingTools | `"executing_tools"` |
| AggregatingResults | `"aggregating_results"` |
| AwaitingPermission | `"awaiting_permission"` |
| Completing | `"completing"` |
| Error | `"error"` |

### State Transitions

```
Idle → ProcessingInput → AwaitingModelResponse → Streaming
  → SchedulingTools → ExecutingTools → AggregatingResults
    (→ AwaitingModelResponse) (loop back for next tool round)
    → SchedulingTools (schedule new tools)
    → Completing
    → Error

Streaming → Completing
Streaming → Error
Streaming → AggregatingResults
```

### Turn State Fields (`createTurnState`)

```javascript
{
  id: string,           // turn UUID
  sessionId: string,    // parent session ID
  turnNumber: number,   // 0-based turn index
  phase: TurnPhase,     // current phase
  traceId: string,      // distributed tracing ID
  input: InputData,     // user prompt + attachments
  streamingContent: [], // accumulating model output
  toolCalls: [],        // model tool call specs
  toolResults: [],      // resolved tool call results
  scheduledTools: [],   // queued for execution
  pendingInputs: [],    // inputs queued during tool execution
  pendingPermissions: [],
  resolvedPermissions: [],
  resultType: string,   // "stop" | "tool_calls" | "recursion" | etc.
  startedAt: Date,      // ISO timestamp
}
```

### Key Turn Machine Methods

| Method | Description |
|--------|-------------|
| `create()` | Initialize new turn state |
| `transition(phase)` | Move to new phase (validates transitions) |
| `startModelRequest()` | Begin awaiting model response |
| `receiveModelResponse()` | Model sent response |
| `addStreamingContent(text)` | Append delta to accumulating content |
| `scheduleTools(calls)` | Queue tool calls for execution |
| `startToolExecution()` | Begin running tools |
| `completeTool(result)` | One tool finished |
| `requestPermission(toolCall)` | Request user approval |
| `resolvePermission(approved)` | Resolve permission request |
| `aggregateResults()` | Collect all tool results |
| `complete()` | Finalize turn |
| `fail(error)` | Error state |
| `getNextPhase()` | Determine next valid phase |
| `isComplete()` | Check if turn is done |

---

## 8. Hooks System

### Hook Event Types (`Jr` enum)

```javascript
const HookEvent = {
  SessionStart: "SessionStart",
  UserPromptSubmit: "UserPromptSubmit",
  PreToolUse: "PreToolUse",
  PermissionRequest: "PermissionRequest",
  PostToolUse: "PostToolUse",
  PostToolUseFailure: "PostToolUseFailure",
  Stop: "Stop"
};
```

### Hook Outcomes (`ek` enum)

```javascript
{ Success: "success", Blocked: "blocked", Failed: "failed", 
  Cancelled: "cancelled", TimedOut: "timed_out" }
```

### Hook Execution Points

| Event | When | Context |
|-------|------|---------|
| `SessionStart` | Session begins | `{session, workspace, model}` |
| `UserPromptSubmit` | User submits prompt | `{userPrompt, messages, model}` |
| `PreToolUse` | Before tool execution | `{toolName, toolInput, riskLevel, sideEffectScope, actorKind}` |
| `PermissionRequest` | Tool needs approval | `{toolName, toolInput, permissionDecision}` |
| `PostToolUse` | Tool succeeded | `{toolName, toolInput, toolResponse, toolResultPreview}` |
| `PostToolUseFailure` | Tool failed | `{toolName, toolInput, error, isInterrupt}` |
| `Stop` | Session stopped | `{responseText, responsePreview, toolCallCount, stopHookActive}` |

### Hook Config Schema

```javascript
{
  enabled: boolean,
  timeoutMs: number,           // default 60000
  maxOutputBytes: number,      // default 32768
  events: {
    SessionStart: [{ matcher, hooks }],
    UserPromptSubmit: [{ matcher, hooks }],
    PreToolUse: [{ matcher, hooks }],
    PermissionRequest: [{ matcher, hooks }],
    PostToolUse: [{ matcher, hooks }],
    PostToolUseFailure: [{ matcher, hooks }],
    Stop: [{ matcher, hooks }]
  }
}
```

### Hook Types

1. **Process hook** — Runs a command/script: `{ "type": "process", "command": "string", "timeout": "number" }`
2. **Command hook** — Runs a built-in command: `{ "type": "command", "command": "string", "timeout": "number" }`

### In-Memory Hook Runner

```javascript
class InMemoryHookRunner {
  async run(event, context = {}) {
    const hooks = this.hooks.filter(h =>
      h.event === event.hookEventName && matcherMatches(context, h.matcher)
    );
    const outputs = { additionalContexts: [] };
    for (const [i, hook] of hooks.entries()) {
      const runId = crypto.randomUUID();
      if (hook.async) { this.runBackgroundHook(...); continue; }
      try {
        const result = await this.runCallbackWithTimeout(hook, event, i, context.signal);
        const output = processHookOutput(event.hookEventName, result);
        mergeHookOutput(outputs, output);
        if (output.permissionBehavior === "deny" || output.preventContinuation) { /* blocked */ }
      } catch (error) {
        const outcome = resolveHookFailureOutcome(error);
        // emit HookRunFailed
      }
    }
    return outputs;
  }
}
```

---

## 9. Plugin System

### Plugin Inventory (7 Active)

| # | Plugin | Version | Category | Lang | Components |
|---|--------|---------|----------|------|------------|
| 1 | android-emulator | 0.1.0 | developer-tools | TS | skills, commands, MCP(23 tools), userConfig(7), hooks |
| 2 | browser-use | 0.2.1 | developer-tools | TS/ESM | skills, node_repl MCP(3 tools) |
| 3 | document-skills | 0.1.0 | productivity | TS+Python | skills (docx, pdf, pptx) + Python scripts |
| 4 | ios-simulator | 0.1.0 | developer-tools | TS | skills, commands, MCP(20 tools), userConfig(2), hooks |
| 5 | restore-legacy-sessions | 0.1.0 | utilities | JS | skills, commands |
| 6 | skill-creator | 0.1.0 | developer-tools | TS | skill-creator skill |
| 7 | zcode-guide | 0.1.0 | guides | TS | 6 diagnosing/guide skills |

### Plugin Cache Structure

```
.zcode/cli/plugins/cache/zcode-plugins-official/
├── android-emulator/0.1.0/
│   ├── .zcode-plugin/plugin.json   # MCP, commands, userConfig manifest
│   ├── dist/mcp/server.js          # 41K lines bundled MCP server
│   ├── dist/lib/result.js          # content helpers
│   ├── dist/lib/run.js             # child-process spawn
│   ├── dist/lib/path.js            # data-dir resolution
│   ├── scripts/build-mcp.mjs       # esbuild bundling
│   ├── skills/android-dev/SKILL.md
│   ├── commands/android-dev.md
│   ├── hooks/hooks.json            # {"hooks": {}}
│   └── .mcp.json
├── browser-use/0.2.1/              # (0.1.0, 0.1.2 also cached, stale)
│   ├── dist/mcp/server.js          # 139K lines node_repl MCP
│   ├── scripts/browser-client.mjs   # browser runtime entry
│   ├── skills/control-browser/SKILL.md
│   └── skills/web-gui-tester/SKILL.md
├── document-skills/0.1.0/
│   ├── skills/
│   │   ├── docx/ (SKILL.md, scripts/postcheck.py, scripts/utilities.py)
│   │   ├── pdf/ (SKILL.md 919 lines, scripts/pdf.py, scripts/design_engine.py)
│   │   └── pptx/ (SKILL.md, scripts/pptx_reference.py, tests/test_pptx_reference.py)
├── ios-simulator/0.1.0/            # same structure as android-emulator
├── restore-legacy-sessions/0.1.0/
│   ├── scripts/restore-conversation.mjs  # readable JS source (sqLite)
│   ├── scripts/scan-legacy-sessions.mjs
│   └── skills/restore-legacy-sessions/SKILL.md
├── skill-creator/0.1.0/
└── zcode-guide/0.1.0/
    ├── skills/zcode-configuration-guide/SKILL.md
    ├── skills/diagnosing-commands/SKILL.md
    ├── skills/diagnosing-hooks/SKILL.md
    ├── skills/diagnosing-mcp/SKILL.md
    ├── skills/diagnosing-plugins/SKILL.md
    └── skills/diagnosing-skills/SKILL.md
```

### Plugin Manifest Format

```json
{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "...",
  "author": {"name": "Z.ai"},
  "license": "MIT",
  "skills": "skills",
  "commands": "commands",
  "mcpServers": { ... },      // optional
  "userConfig": { ... },      // optional
  "hooks": "hooks",           // optional
  "agents": "agents"          // optional
}
```

### Seed Files (`.zcode-plugin-seed.json`)

```json
{"version": 1, "source": "filesystem", 
  "hash": "sha256:...", "marketplace": "zcode-plugins-official",
  "plugin": "plugin-name", "pluginVersion": "0.1.0"}
```

### Marketplaces (`known_marketplaces.json`)

| Marketplace | Source | URL |
|-------------|--------|-----|
| `zcode-plugins-official` | URL | `https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json` |
| `claude-plugins-official` | GitHub | `anthropics/claude-plugins-official` |

### Plugin Build Setup

```json
{
  "type": "module",
  "main": "./dist/mcp/server.js",
  "scripts": {
    "build": "tsc && node scripts/build-mcp.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run test",
    "lint": "oxlint src"
  }
}
```

---

## 10. MCP Servers

### 3 MCP Servers with Tools

#### 1. node_repl (`browser-use/0.2.1`)

**3 tools:**

| Tool | Required Input | Optional | Description |
|------|---------------|----------|-------------|
| `js` | `code` (string), `title` (string 1–120) | `timeout_ms` (1–120000) | Run JS in fresh Node kernel for browser control |
| `js_add_node_module_dir` | `path` OR `dir` (string) | — | Add node_modules directory to search roots |
| `js_reset` | — | — | Compatibility barrier (kernel already fresh) |

**Security:** `js` has `riskLevel: high`, `needsApproval: true`, `sideEffectScope: "system"`

**Image constants:**
- `MCP_IMAGE_INLINE_BASE64_BYTES = 200*1024`
- `MCP_IMAGE_INLINE_RAW_BYTES = 150*1024`
- `HOST_NODE_REPL_IMAGE_MAX_DIMENSION = 2048`
- `HOST_NODE_REPL_MODEL_IMAGE_MAX_DIMENSION = 2000`

**Browser backend types:** `iab` (in-app browser), `extension` (Chrome ext), `cdp` (managed Chromium)

**Key functions:**
- `emitImage(image)` — Collect screenshots as `{base64, mimeType}`
- `toMcpRunResult(run)` — Convert to MCP format, handles `_meta` with screenshot indices
- `isBrowserSurfaceSideEffect(cmd)` — Returns true for navigate/click/fill/type/press/etc.
- `isAutoScreenshotTriggerCommand(cmd)` — Returns true for ALL except: capabilities/list/listUserTabs/browserVisibilityGet/cancelRequest/closeSession/finalizeTabs/nameSession/turnEnded
- `persistBrowserScreenshotPaths(run, ctx)` — Persist to artifact store
- `tryCompressHostNodeReplImage` — Compress oversized images (2000px max dimension)

#### 2. android-emulator (`android-emulator/0.1.0`)

**23 tools** (shared `target` schema: `{ serial?, avd?, timeoutMs? }`):

| # | Tool Name | Input | Description |
|---|-----------|-------|-------------|
| 1 | `android_preflight` | `{}` | Check SDK, adb, emulator, AVDs, Java, Gradle |
| 2 | `android_discover_project` | `{}` | Find Gradle root, modules, manifest |
| 3 | `android_create_app` | `{name, packageName?, dir?, minSdk?, compileSdk?, overwrite?}` | Create Kotlin/Compose app |
| 4 | `android_build_app` | `build2` | Build Gradle project |
| 5 | `android_build_and_run` | `build2 + launchActivity?` | Build, install, launch |
| 6 | `android_list_devices` | `{}` | List adb devices |
| 7 | `android_list_avds` | `{}` | List AVDs |
| 8 | `android_start_emulator` | `{avd?, timeoutMs?}` | Start GUI emulator |
| 9 | `android_stop_emulator` | `{serial (req)}` | Stop emulator |
| 10 | `android_create_avd` | `{name?, packageId?, device?, force?}` | Create AVD |
| 11 | `android_install_app` | `target + {apkPath}` | Install APK |
| 12 | `android_launch_app` | `target + {applicationId, activity?}` | Launch app |
| 13 | `android_terminate_app` | `target + {applicationId}` | Force-stop |
| 14 | `android_open_url` | `target + {url}` | Open URL |
| 15 | `android_screenshot` | `target + {path?}` | PNG screenshot |
| 16 | `android_logs` | `target + {applicationId?, lines?, limit?}` | Read logcat |
| 17 | `android_ui_status` | `{}` | Report UI backend |
| 18 | `android_ui_describe` | `target` | UI Automator tree |
| 19 | `android_ui_resolve` | `target + {query}` | Resolve to coords |
| 20 | `android_ui_tap` | `target + {x, y}` | Tap coordinates |
| 21 | `android_ui_swipe` | `target + {x1,y1,x2,y2, durationMs?}` | Swipe |
| 22 | `android_ui_type_text` | `target + {text}` | Enter text |
| 23 | `android_ui_keyevent` | `target + {key}` | Press key (BACK/HOME/ENTER/APP_SWITCH/MENU/SEARCH) |

#### 3. ios-simulator (`ios-simulator/0.1.0`)

**20 tools** (shared `target2` schema: `{ udid?, device?, runtime? }`):

| # | Tool Name | Input | Description |
|---|-----------|-------|-------------|
| 1 | `ios_preflight` | `{}` | Check macOS, Xcode, simctl |
| 2 | `ios_list_simulators` | `{}` | List simulators |
| 3 | `ios_boot_simulator` | `target2 + {openSimulator?}` | Boot simulator |
| 4 | `ios_show_simulator` | `{udid?}` | Open Simulator app |
| 5 | `ios_discover_project` | `{}` | Find .xcodeproj/.xcworkspace |
| 6 | `ios_create_app` | `{name, bundleId?, dir?, deployment?, overwrite?}` | Create SwiftUI app |
| 7 | `ios_build_app` | `build2` | Build via xcodebuild |
| 8 | `ios_build_and_run` | `build2 + {launchArgs?}` | Build, install, launch |
| 9 | `ios_install_app` | `target2 + {appPath}` | Install .app (auto-boots) |
| 10 | `ios_launch_app` | `target2 + {bundleId, launchArgs?}` | Launch (auto-boots) |
| 11 | `ios_terminate_app` | `target2 + {bundleId}` | Terminate |
| 12 | `ios_open_url` | `target2 + {url}` | Open URL (auto-boots) |
| 13 | `ios_screenshot` | `target2 + {path?, openSimulator?}` | PNG (auto-boots) |
| 14 | `ios_logs` | `target2 + {bundleId?, seconds?, limit?}` | Read logs |
| 15 | `ios_ui_status` | `{}` | Report UI backend (idb) |
| 16 | `ios_ui_tap` | `target2 + {x, y, duration?}` | Tap coordinates |
| 17 | `ios_ui_swipe` | `target2 + {x1,y1,x2,y2,delta?}` | Swipe |
| 18 | `ios_ui_type_text` | `target2 + {text}` | Enter text |
| 19 | `ios_ui_button` | `target2 + {button, duration?}` | Press hardware button |
| 20 | `ios_ui_describe` | `target2` | Accessibility info via idb |

---

## 11. Skills Catalog (All 15)

### ZCode Guide Skills (6)

#### zcode-configuration-guide
*Use when configuring MCP servers, slash commands, skills, hooks, plugins, or AGENTS.md.*

**Scopes and Configuration Files:**
- **User scope:** `~/.zcode/cli/config.json` — MCP servers, hooks, plugin enable/disable, skill/command overrides
- **Workspace scope:** `.zcode/config.json` in project root
- **AGENTS.md:** workspace root or `~/.zcode/AGENTS.md`

**Skill discovery order (highest priority first):**
1. Explicit skill/command plugin roots (from config)
2. User `~/.zcode/skills`
3. User `~/.agents/skills`
4. Workspace `.zcode/skills` (walks up to repo root)
5. Workspace `.agents/skills`
6. Enabled plugin roots (lowest priority)

#### diagnosing-commands
*Use when a slash command is missing, overridden, has parse error, or is dropped.*

**Root causes:**
1. Command not in command list — not in config
2. Higher-precedence override — another plugin shadows it
3. Frontmatter parse error — SKILL.md YAML malformed
4. Dropped for unknown command — name doesn't match pattern

#### diagnosing-hooks
*Use when a hook doesn't trigger, event name wrong, matcher doesn't match, script not executable.*

**Root causes:**
1. Wrong event name — must be: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop
2. Matcher doesn't match — regex/string against tool name or event context
3. Script not executable — needs `chmod +x` or valid shebang
4. Template variables not expanded — available: `{user_prompt}`, `{tool_name}`, `{tool_input}`, `{session_id}`

#### diagnosing-mcp
*Use when an MCP server won't connect, tools don't appear, server shows disabled/failed.*

**Root causes:**
1. Server not in config — missing from `mcp.servers`
2. Startup failure — server crashes on launch (check stderr)
3. Connection timeout — server too slow
4. Tool registration failure
5. Transport mismatch — stdin vs stdio vs http

#### diagnosing-plugins
*Use when a plugin is not listed, installing fails, enabled but skills/commands missing.*

**Root causes:**
1. Cache directory corrupted or missing
2. Download or extraction error
3. Skills path missing in manifest
4. Plugin in `suppressedBuiltins` list

#### diagnosing-skills
*Use when a skill is not discovered, installed but doesn't trigger, shadowed, disabled, or frontmatter parse error.*

---

### Developer Tools Skills (4)

#### android-dev
*Build, run, inspect, and lightly automate Android apps.*

**Default Workflow:**
1. `mcp__android_emulator__android_preflight` — check environment
2. `mcp__android_emulator__android_discover_project`
3. `mcp__android_emulator__android_create_app` if needed
4. Edit Kotlin/Compose files
5. Build with `android_build_app` or `android_build_and_run`

**Rules:** Don't accept SDK licenses, enter passwords, wipe emulator data, or delete AVDs without asking. Only `overwrite: true` after explicit user confirmation.

#### control-browser
*Main-agent-only Browser Use. Open, navigate, inspect, test, click, type, fill, screenshot.*

**Core workflow:**
1. Bootstrap every `js` call: resolve `ZCODE_PLUGIN_ROOT`, import `browser-client.mjs`, call `setupBrowserRuntime`
2. Select backend: `iab`, `extension`, or `cdp` via `agent.browsers.get/list/getDefault/getForUrl`
3. Tab management: always `browser.tabs.list()` before acting
4. Navigation: `tab.goto(url)` → `waitForLoadState({state: "domcontentloaded"})`
5. Read: `tab.playwright.domSnapshot()` — primary page reading
6. Act: build locators from snapshot facts only, never guess
7. Observe: cheapest observation that answers next question
8. Persist tabs — don't close unless needed

**Rules:**
- `domSnapshot()` is primary — screenshots only when vision matters
- Every `screenshot()` must be in same cell as `nodeRepl.emitImage(await tab.screenshot())`
- Never use `networkidle` — use `domcontentloaded`
- Navigation: `http:`, `https:`, `about:blank` only
- Never guess selectors, labels, or URL patterns
- Locator uniqueness: check `count()` when not obvious

#### web-gui-tester
*Test web frontends via GUI black-box testing with screenshots + DOM verification.*

**4-phase methodology:**
1. **Scenario Assessment** — Complete info → skip; Partial → lightweight plan; Insufficient → complete plan (P0-P3)
2. **Test Environment Preparation** — Start servers, seed data (no black-box restrictions during setup)
3. **Test Execution** — Action → Observation loop (code + visual verification)
4. **Output Conclusions** — Summarize pass/fail/blocked with screenshots

**Constraints:** Pure GUI black-box, screenshots mandatory for visual verification, separate testing from fixing, before/after screenshots in same call for transient states.

#### ios-dev
*Build, run, inspect iOS SwiftUI apps.*

**Default Workflow:**
1. `mcp__ios_simulator__ios_preflight` — checks macOS, Xcode, simctl
2. `mcp__ios_simulator__ios_boot_simulator`
3. `mcp__ios_simulator__ios_discover_project`
4. `mcp__ios_simulator__ios_create_app` if needed
5. Build with `ios_build_app` or `ios_build_and_run`

**Rules:** Auto-boots simulator for install/launch/screenshot. Never modify source through ad-hoc means.

#### skill-creator
*Create, edit, and iterate local ZCode skills.*

**Core loop:** Draft → Test (2-3 prompts) → Review → Improve → Repeat

**Discovery roots (priority order):**
1. `<project>/.zcode/skills/<name>/`
2. `<project>/.agents/skills/<name>/`
3. `~/.zcode/skills/<name>/`
4. `~/.agents/skills/<name>/` ← default for new skills

**SKILL.md format:**
```
my-skill/
├── SKILL.md          (required: name + description frontmatter)
├── references/       (optional - extra docs on demand)
├── scripts/          (optional - helper scripts)
└── assets/           (optional - templates, fixtures)
```

---

### Document Skills (3)

#### docx
*DOCX creation, editing, analysis with revisions, comments, formatting.*

**Key features:** Tracked changes, comments, formatting preservation, text extraction
**Analysis (postcheck.py):** 15-point quality checker (blank pages, line spacing, table margins, image overflow, font fallback, CJK indentation, heading continuity, TOC quality)

#### pdf
*Professional PDF toolkit — 4 production workflows: reports, creative, academic LaTeX, process.*

**Triaging:**
| Weight | Triggers | Load |
|--------|----------|------|
| Light | Format conversion, form fill, extract, merge/split | SKILL.md + `briefs/process.md` |
| Standard | Report/poster/paper/resume | SKILL.md + matched brief |

**Brief routing:**

```
User Request → existing PDF? → extract/merge/split/convert → briefs/process.md
            → Report/proposal/contract → briefs/report.md (ReportLab)
            → Poster/infographic → briefs/creative.md (Playwright)
            → Academic/LaTeX → briefs/academic.md (Tectonic)
            → Resume → report.md / creative.md / academic.md
```

**Pre-routing checks:** Emoji → Creative; CJK → font coverage; Non-standard size → Creative; Character safety.

**Engines:** ReportLab (reports), Playwright (creative/posters), Tectonic (academic).

**Two HTML→PDF scripts:**
- `html2poster.js` — Single-page long-image (posters, covers)
- `html2pdf-next.js` — Multi-page documents

**Iron rules:** `page.pdf()` (vector) not screenshot; figures are block-level; `@page { margin: 0 }` mandatory; body bg = canvas bg; pre-run `poster_validate.py`.

**CLI subcommands:** `env.check`, `env.fix`, `convert.*`, `extract.*`, `pages.merge/split/rotate/crop/clean`, `form.fill`, `meta.set`

#### pptx
*Inspect and narrowly update PPTX elements using fingerprint-checked OOXML references.*

**Required workflow:** Read reference JSON → `inspect` → apply comment to exact element → `update-text`/`update-texts` → atomic replace.

**Safety:** sourceFingerprint (file sha256), textFingerprint, atomic temp+validate, ZIP bomb protection, path traversal/NUL detection. Exit codes: 2=stale reference, 1=file error.

### Utilities

#### restore-legacy-sessions
*Restore legacy ACP-era ZCode sessi

---

## 13. Animation Systems

ZCode uses **four layers** of animation working together:

### Layer 1: CSS Keyframe Animations

#### Stream Text Animation (`zcode-stream-text-in`)

```css
[data-zcode-stream-animate=true],
[data-zcode-tool-stream-animate=true],
[data-zcode-chat-loading-animate=true] {
  will-change: opacity;
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) both zcode-stream-text-in;
}
@keyframes zcode-stream-text-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

#### Stream Marker Animation (`zcode-stream-marker-in`)

```css
[data-zcode-stream-marker-animate=true]::marker {
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) 
    var(--zcode-stream-animation-delay, 0s) both zcode-stream-marker-in;
}
@keyframes zcode-stream-marker-in {
  0% { color: #0000; }
  100% { color: inherit; }
}
```

#### Collapsible Animation

```css
[data-zcode-collapsible-animate-close=true][data-state=closed] {
  animation: 0.3s ease-in-out forwards zcode-collapsible-up !important;
}
[data-zcode-collapsible-animate-close=true][data-state=closed] > * {
  animation: 0.3s ease-in-out forwards zcode-collapsible-fade-out !important;
}
@keyframes zcode-collapsible-up {
  0% { height: var(--radix-collapsible-content-height); }
  to { height: 0; }
}
@keyframes zcode-collapsible-fade-out {
  0% { opacity: 1; }
  to { opacity: 0; }
}
/* Reset when already applied:
[data-zcode-stream-animate=true], ... { animation: none; }
*/
```

#### Update Charge Sweep

```css
[data-slot=progress-indicator]:after {
  animation: 1.15s cubic-bezier(0.65, 0, 0.35, 1) infinite zcode-update-charge-sweep;
  transform: translate(-120%);
}
@keyframes zcode-update-charge-sweep {
  0% { opacity: 0.35; transform: translate(-120%); }
  100% { /* charge sweep animation */ }
}
```

#### Task Interaction Countdown

```css
.zcode-task-interaction-countdown-fill {
  animation: zcode-task-interaction-countdown 
    var(--zcode-interaction-remaining-ms, 240000ms) linear forwards;
  transform: scaleX(var(--zcode-interaction-progress, 1));
}
```

#### Reaction Burst (Particles + Pop)

```css
@keyframes zcode-reaction-particles {
  0% {
    opacity: 0;
    box-shadow: 7.7px 2.1px, 2.1px 7.7px, -5.7px 5.7px,
                -7.7px -2.1px, -2.1px -7.7px, 5.7px -5.7px;
  } /* 6 particles from center */
}
@keyframes zcode-reaction-pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
```

#### Browser Operation Breathe

```css
@keyframes browser-use-operation-breathe {
  0%, to { opacity: 0.5; transform: scale(0.9); }
}
```

#### Workspace Remote Connecting Breathe

```css
@keyframes workspace-remote-connecting-breathe {
  0%, to {
    background-color: color-mix(in oklab, var(--color-brand) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 10%, transparent);
  }
}
```

#### Task Search Result Highlight

```css
.task-search-result-highlight {
  animation: 1.2s ease-out both;
}
@keyframes task-search-result-highlight {
  0% {
    background-color: color-mix(in oklab, var(--color-brand) 20%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-brand) 28%, transparent);
  }
}
```

#### Pulse Caret (Syntax Highlight)

```css
@keyframes pulse-caret {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.pulse-caret {
  animation: pulse-caret 1s step-end infinite;
}
```

---

### Layer 2: Tailwind CSS Animations

```css
/* From styles-BxSv8qTx.css (366KB, Tailwind v4.2.2) */
.animate-spin     { animation: spin; }           /* 360° rotation */
.animate-ping     { animation: ping; }           /* scale up + fade */
.animate-pulse    { animation: pulse; }          /* opacity 50% at 50% */
.animate-in       { animation: enter; }          /* custom enter */
.animate-spin-slow { animation: spin 3s linear infinite; } /* 3s spinner */
```

---

### Layer 3: Framer Motion Patterns

```javascript
// Message appearance (ChatMessage)
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1],
    delay: idx * 0.02  // stagger
  }}
/>

// Stagger lists
<motion.div
  variants={{
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } }
  }}
  initial="hidden"
  animate="show"
>
  {/* Children: initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} */}
</motion.div>

// Button interactions
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.92 }}
/>

// Tab navigation (larger hover for inactive)
whileHover={{ scale: activeTab === tab ? 1 : 1.05 }}

// Spring pop (checkmarks/reactions)
const spring = { type: "spring", stiffness: 500, damping: 20 };

// ThinkingIndicator dots
// y: [0, -4, 0], duration: 0.6, repeat: Infinity, delay: i * 0.12
// Color: emerald-400

// ChatFlowAnimation steps
// initial={{ opacity: 0, x: -10, height: 0 }}
// animate={{ opacity: 1, x: 0, height: "auto" }}
// Timing: 600ms, 1500ms, 3000ms, 4500ms per step
```

---

### Layer 4: CLI Terminal Animations (Custom Ticker)

All CLI animations driven by a **shared global ticker** at 80ms intervals.

#### Shared Ticker (`useTicker.js`)

```javascript
const TICK_RATE_MS = 80;  // 80ms per tick

const subscribers = new Set();
let tickCount = 0;
let intervalId = null;

function tick() {
  tickCount++;
  for (const fn of subscribers) fn(tickCount);
}

function subscribe(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) {
    intervalId = setInterval(tick, TICK_RATE_MS);  // lazy start
  }
  fn(tickCount);  // immediate sync
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) clearInterval(intervalId);
  };
}
```

#### Animated Progress (`useAnimatedProgress.js`)

```javascript
export function useAnimatedProgress(targetPct, frames = 8, intervalMs = 20) {
  const [displayPct, setDisplayPct] = useState(targetPct);
  useEffect(() => {
    if (displayPct === targetPct) return;
    const start = displayPct;
    const delta = targetPct - start;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      setDisplayPct(start + delta * (frame / frames));
      if (frame >= frames) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [targetPct, displayPct, frames, intervalMs]);
  return displayPct;
}
```

#### Progressive Line Reveal (`useEntrance.js`)

```javascript
export function useEntrance(totalItems, ticksPerItem = 1, resetKey = null) {
  const ticks = useTicker();
  const [startTick, setStartTick] = useState(null);
  useEffect(() => { setStartTick(ticks); }, [totalItems > 0, resetKey]);
  if (startTick === null) return 0;
  const elapsed = ticks - startTick;
  const visible = Math.floor(elapsed / ticksPerItem);
  return Math.min(totalItems, visible);
}
```

#### Flash on Mount (`useFlashOnMount` in blocks.jsx)

```javascript
export function useFlashOnMount() {
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, []);
  return flash;
}
```

#### CLI Block Components (`blocks.jsx`, 661 lines)

```javascript
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];  // 5-frame spinner
const TOOL_VERBS = {
  read_file: 'Reading…', write_file: 'Writing…', edit_file: 'Writing…',
  run_shell: 'Running…', run_tests: 'Running tests…',
  list_files: 'Finding files…', search_code: 'Searching…',
  git_status: 'Checking git…'
};
const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob',
  search_code: 'Grep', git_status: 'Git status'
};
const READ_MAX = 15, CMD_MAX = 10;
```

**ThoughtBlock animation:**
```javascript
// Dots cycle: 0 → 1 → 2 → 3 → 0 (400ms per dot)
const dotsLength = Math.floor(ticks / 5) % 4;
const dots = '.'.repeat(dotsLength);
// Label: "Thinking..." or "Thought: 123ms"
// Progressive reveal: useEntrance(lines.length, 1, expanded) — 1 tick/line (80ms)
// Live cursor: █ bloc

---

## 14. Web UI Components

### Component Hierarchy

```
AIChatPage.jsx (1757 lines, /ai/chat)
├── TopBar (Export/Push, GitHub, Tab switcher)
├── Left Sidebar (Brand, New Chat, Recent Chats, Upgrade, Profile)
├── Main Content Area
│   ├── Chat view
│   │   ├── Message list (ChatMessage × N)
│   │   ├── TodoCard
│   │   ├── PermissionModal
│   │   └── Streaming indicators:
│   │       ├── ThinkingIndicator (chat mode, 3 bouncing dots)
│   │       ├── ChatFlowAnimation (chat mode, 5-step flow)
│   │       ├── WorkingHeader (agent mode)
│   │       ├── ThoughtBlock (agent mode)
│   │       └── SearchAnimation / SearchResultBlock
│   └── IDE view (AI Code Agent tab)
│       ├── FileTree (left, Monaco)
│       ├── EditorPane (center)
│       ├── TerminalPane (center, xterm.js)
│       └── AI Assistance chat (right, inline input)
└── Bottom (Prompt input, Send/Stop, Advanced/God Mode toggles)
```

### Animation Components

**ThinkingIndicator** — Framer Motion 3 bouncing dots: `y: [0, -4, 0]`, duration 0.6, repeat Infinite, stagger `i * 0.12`, emerald-400 color.

**ChatFlowAnimation** — 5-step sequential flow:
1. Assembling system context (Database icon) — 600ms
2. Understanding user intent (BrainCircuit) — 1500ms
3. Searching web & executing tools (Globe) — 3000ms
4. Drafting response (Edit3) — 4500ms
5. Updating memory (Save)
Each step: `initial={{ opacity: 0, x: -10, height: 0 }}` → `animate={{ opacity: 1, x: 0, height: "auto" }}` with rotating dashed border + bouncing dots.

**ChatMessage** — `initial={{ opacity: 0, y: 4 }}`, stagger `idx * 0.02`, streaming cursor `opacity: [0.3, 1, 0.3]` blink 1s.

**SearchAnimation** — 5 sub-components: SearchStatusLine, SourcePillRow (stagger `i * 0.05`), SourcesPanel (AnimatePresence), StreamingAnswer (35ms ticks), SearchResultBlock.

**ZCodeUX** — StepPulse, ToolCallCard (collapsible), WroteFile, DiffBlock, TerminalOutput (16ms typewriter), GoalTracker, AgentInputBar.

### Web Component Files

| Component | File | Description |
|-----------|------|-------------|
| DesignTab | `components/ide/DesignTab.jsx` | Template gallery \| preview \| prompt |
| PermissionModal | `components/ide/PermissionModal.jsx` | Allow/Deny/Always Allow |
| ModelSelector | `components/ide/ModelSelector.jsx` | Provider/model dropdown |
| TodoCard | `components/ide/TodoCard.jsx` | Plan with spring checkmarks |
| TerminalPane | `components/ide/TerminalPane.jsx` | xterm.js with fade-in |
| FileTree | `components/ide/FileTree.jsx` | Recursive tree |
| EditorPane | `components/ide/EditorPane.jsx` | Monaco + animated tabs |
| WorkspaceModals | `components/ide/WorkspaceModals.jsx` | ZIP/Git clone |

---

## 15. Terminal CLI Animations

### Block Types (`blocks.jsx`, 661 lines)

```javascript
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];  // 5-frame spinner
const TOOL_VERBS = {
  read_file: 'Reading…', write_file: 'Writing…', edit_file: 'Writing…',
  run_shell: 'Running…', run_tests: 'Running tests…',
  list_files: 'Finding files…', search_code: 'Searching…',
  git_status: 'Checking git…'
};
const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob',
  search_code: 'Grep', git_status: 'Git status'
};
const READ_MAX = 15, CMD_MAX = 10;
```

### CLI UI Hooks

| Hook | File | Ticker | Purpose |
|------|------|--------|---------|
| `useTicker` | `useTicker.js` | 80ms | Global tick counter (lazy setInterval) |
| `useAnimatedProgress` | `useAnimatedProgress.js` | 20ms, 8 frames | Percentage interpolation |
| `useEntrance` | `useEntrance.js` | 80ms ticks | Progressive line reveal |
| `useFlashOnMount` | `blocks.jsx` | 400ms timeout | Green flash for new content |

### CLI Block Animation Details

**SpinnerBlock:** `SPIN_FRAMES[ticks % 5]` at 80ms intervals

**RunningToolBlock:** Spinner + args preview + verb label

**ThoughtBlock:**
- Dot cycle: `Math.floor(ticks / 5) % 4` → 0-3 dots (400ms/dot)
- `useEntrance(lines.length, 1, expanded)` — 1 tick/line (80ms) progressive reveal
- Live cursor: `█` block on last line
- DAG formatting: bullets → `└──›` arrows

**ReadBlock / WriteBlock:**
- `useEntrance(display.length, 0.375)` — ~30ms/line reveal
- `useFlashOnMount()` — 400ms green flash (`#062012` bg, green border)
- Syntax highlighting via `cli-highlight`
- Max 15 lines when collapsed

**DiffBlock:**
- Staggered reveal by kind:
  - `add` lines: 0.2 ticks/line (~16ms) — fastest
  - `context` lines: 0.375 ticks/line (~30ms)
  - `remove` lines: 0.5 ticks/line (~40ms) — slowest
- Background: green (add), red (remove), none (context)

**CommandBlock:**
- `useEntrance(display.length, 0.375)` — progressive output reveal
- Max 10 lines when collapsed
- `$ ` prefix in green, command in bold

**TodoBlock:**
- Progress bar: `useAnimatedProgress(percent)` → 8 frames @ 20ms (160ms)
- Checkbox draw-in: `|` (dim) → `/` (medium) → `✓` (bright green) over 8 ticks (640ms)
- Running spinner: `SPIN_FRAMES[ticks % 5]` + 16-step brightness pulse
- Flash: newly completed todos flash green for 400ms

**PermissionBlock:**
- Flash-on-mount for new permission requests
- Status: `?` (pending, orange), `✓` (approved, green), `✗` (denied, red)

### CLI Terminal Theme

```css
.xterm {
  background: #0a0a0a;
  color: #f4f4f5;
  --xterm-color-0: #0a0a0a;   /* Black (background) */
  --xterm-color-1: #f871f1;   /* Red (errors) */
  --xterm-color-2: #10b981;   /* Green (success/additions) */
  --xterm-color-3: #eab308;   /* Yellow (warnings) */
  --xterm-color-4: #3b82f6;   /* Blue (info/commands) */
  --xterm-color-5: #a855f7;   /* Magenta (debug) */
  --xterm-color-6: #2dd367;   /* Cyan (system) */
  --xterm-color-7: #e5e5e5;   /* White (primary text) */
  --xterm-color-8: #27272a;   /* Bright Black (dimmed) */
  --xterm-color-9: #fb6b6b;   /* Bright Red */
  --xterm-color-10: #2dd677;  /* Bright Green */
  --xterm-color-11: #fbbf24; /* Bright Yellow */
  --xterm-color-12: #60a5fa;  /* Bright Blue */
  --xterm-color-13: #c084fc; /* Bright Magenta */
  --xterm-color-14: #4feda8; /* Bright Cyan */
  --xterm-color-15: #f4f4f5;/* Bright White */
}
```CH15
echo "15 done"
__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/c/Users/mahen/AppData/Local/Temp/zcode-8879d230-2489-406e-b9a8-a2e1f309b2bd-cwd'; fi
exit "$__zcode_status"

---
## 15. Terminal CLI Animations
EOF
echo "checki
<truncated 10858 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.