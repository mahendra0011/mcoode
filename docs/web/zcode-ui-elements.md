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
