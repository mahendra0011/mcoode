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
- **Loading overlay removal**: Fades out, removed after 500ms
