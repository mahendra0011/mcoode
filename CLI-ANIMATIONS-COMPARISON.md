# CLI Animations — Z-Code Style Comparison

## Overview

All CLI terminal animations were migrated to use a **shared global clock** (`useTicker`) instead of per-component `setInterval` timers. This synchronises every animation frame across the entire UI for smooth, consistent motion.

## Global Clock System

### `useTicker` Hook (`src/ui/useTicker.js`)

- **Mechanism:** A single `useState` + `setInterval` running at **80ms** (≈12.5 ticks/second), broadcast via a shared `TickerContext`.
- **Why 80ms?** Balances smoothness (80ms ≈ 12.5 FPS) with React-for-terminal redraw cost. Every component reading `useTicker()` gets the same `ticks` value each cycle, so animations stay perfectly in phase.
- **Migration pattern:** Replace `setInterval(() => setTick(t => t + 1), N)` + `tick` state with `const ticks = useTicker()`.

### Animation Hooks

| Hook | File | Purpose |
|---|---|---|
| `useTicker` | `src/ui/useTicker.js` | Shared global tick counter (80ms) |
| `useEntrance` | `src/ui/useEntrance.js` | Progressive reveal — reveals N items over time using shared ticker |
| `useAnimatedProgress` | `src/ui/useAnimatedProgress.js` | Smooth `% → visual fill` interpolation; animates progress bar changes over ~250ms instead of snapping |
| `useFlashOnMount` | `src/ui/blocks.jsx` (line 10) | 400ms boolean flash on mount/unmount for highlight effects |

### Spinner

```
SPIN_FRAMES = ['\u25CF', '\u25D0', '\u25DC', '\u25D7', '\u25C7'];
// ●  ◐  ◓  ◑  ◒   — 5-frame cycle, full rotation every 5 ticks (400ms)
```

Used in: `RunningToolBlock`, `TodoBlock` (running status).

---

## Files Migrated (useTicker)

### 1. `src/ui/Logo.jsx`

**Before (old):**
```js
const [tick, setTick] = useState(0);
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 60);
  return () => clearInterval(id);
}, []);
```

**After (new):**
```js
import { useTicker } from './useTicker.js';
const ticks = useTicker();
const wave = Math.floor(ticks / 2); // color wave — advances one column every 160ms
```

- Replaced private `setInterval` (60ms) + `useState` with shared `useTicker()`.
- Color wave: `ticks / 2` indexes through palette for the gradient shimmer effect.
- Removed `useState` import for tick, kept for other state.

### 2. `src/ui/OnboardingScreen.jsx`

**Before (old):**
```js
const [dots, setDots] = useState(0);
useEffect(() => {
  const id = setInterval(() => setDots(d => (d + 1) % 4), 300);
  return () => clearInterval(id);
}, []);
```

**After (new):**
```js
import { useTicker } from './useTicker.js';
const ticks = useTicker();
const dotsLength = Math.floor(ticks / 5) % 4; // 400ms per dot step (5 ticks × 80ms)
```

- Loading dots: `·`, `· ·`, `· · ·`, `· · · ·` cycle — advances every 5 ticks (400ms).
- Uses shared clock so dots stay in sync with any other running animation.

### 3. `src/ui/App.jsx`

**Before (old):**
```js
const [elapsed, setElapsed] = useState(0);
useEffect(() => {
  const id = setInterval(() => setElapsed(e => e + 1), 1000);
  return () => clearInterval(id);
}, []);
```
(Two separate 1-second elapsed timers for build duration and session timer.)

**After (new):**
```js
import { useTicker } from './useTicker.js';
const ticks = useTicker();
const elapsedSec = Math.floor(ticks / 12.5); // one tick-count per second
```

- Both elapsed timers now derive from the shared `useTicker()` clock.
- `12.5` ticks per second: `Math.floor(ticks / 12.5)` gives seconds.
- **Preserved:** The 30-second auto-save `setInterval` in the `useEffect` — intentionally left as a persistence timer (not an animation).

### 4. `src/ui/MainPane.jsx`

**Before (old):**
```js
const [genSecs, setGenSecs] = useState(0);
useEffect(() => {
  const id = setInterval(() => setGenSecs(s => s + 0.1), 100);
  return () => clearInterval(id);
}, []);
```

**After (new):**
```js
const ticks = useTicker(); // already imported
const genSecs = (ticks / 12.5).toFixed(1); // 0.1s resolution from shared clock
```

- Generator elapsed time: `ticks / 12.5` gives sub-second precision (12.5 ticks/sec).
- Also added `RunningToolBlock` rendering — previously running tools rendered as `null` (no output at all). Now shows spinner + args preview.

### 5. `src/ui/blocks.jsx` — `RunningToolBlock`

**New component added** (didn't exist before):

```jsx
export function RunningToolBlock({ tool, ... }) {
  const ticks = useTicker();
  const frame = SPIN_FRAMES[ticks % SPIN_FRAMES.length];
  return (
    <box flexDirection="row" ...>
      <text fg={theme.amber}>{frame}</text>
      <text fg={theme.textBright}> {TOOL_VERBS[label] || label} </text>
      <text fg={theme.dim}>{formatArgs(tool.args)}</text>
    </box>
  );
}
```

- Spinner cycles through `SPIN_FRAMES` (5-frame, 400ms cycle).
- `TOOL_VERBS` maps tool names to human-readable action verbs (e.g. `bash` to `"Running"`, `write` to `"Writing"`).
- Args preview: abbreviated list of tool arguments.
- **Previously:** Running tools rendered as `null` — completely invisible during execution.

### 6. `src/ui/blocks.jsx` — `TodoBlock`

**Before:** Done checkmarks showed instantly (check), running items hard-blinked every 2 ticks (`ticks % 2 === 0`).

**After:** Two new animation patterns added:

1. **Checkbox draw-in animation** — Newly-completed todos (`flashDone` set) brighten over ~320ms (4 ticks) before settling to the `diffGreen` color. The `statusIcon` function now takes the todo `id` parameter to check flash state:

   ```js
   const statusIcon = (s, id) => {
     if (s === 'done') {
       if (flashDone.has(id)) {
         const phase = (ticks % 4);
         return '\u2713'; // checkmark revealed with brightening draw-in
       }
       return '\u2713';
     }
     // ...
   };
   ```

   The render line uses `flashDone.has(t.id)` to apply a brightening color during the 400ms flash window (driven by `useFlashOnMount`-style `setTimeout`).

2. **In-progress pulsing dot** — Replaces the hard `ticks % 2 === 0` blink with a smooth 8-step sine-like pulse:

   ```js
   const pulseLevels = [1, 2, 3, 4, 3, 2, 1, 0];
   // In render: pulseLevels[ticks % pulseLevels.length] > 2 ? theme.textBright : statusColor(t.status)
   ```

   - Levels 1 to 4 map to increasing brightness, 3 to 0 back down — creates a smooth pulse rather than an on/off blink.
   - Combined with the `SPIN_FRAMES` spinner for running items: the dot both spins AND pulses.

#### `useAnimatedProgress` (TodoBlock)

Progress bar (`[████░░░░] 75%`) now interpolates smoothly:

```js
const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
const animatedPct = useAnimatedProgress(percent);
```

- When todos complete incrementally, the progress bar fills smoothly instead of jumping in discrete 8% steps.

---

## Summary Table

| File | Old Animation | New Animation | Clock |
|---|---|---|---|
| `Logo.jsx` | `setInterval` 60ms + `useState` | `useTicker` color wave | Shared |
| `OnboardingScreen.jsx` | `setInterval` 300ms + `useState` | `useTicker` dot cycle | Shared |
| `App.jsx` | Two x `setInterval` 1s + `useState` | `useTicker` elapsed seconds | Shared |
| `MainPane.jsx` | `setInterval` 100ms + `useState` | `useTicker` genSecs | Shared |
| `blocks.jsx` (`RunningToolBlock`) | `null` (no output) | `useTicker` + `SPIN_FRAMES` spinner | Shared |
| `blocks.jsx` (`TodoBlock`) | Hard blink `ticks % 2` | 8-step pulse + checkbox draw-in | Shared |
| `blocks.jsx` (`TodoBlock`) | Snap progress bar | `useAnimatedProgress` smooth fill | Smooth |
| `App.jsx` (auto-save) | `setInterval` 30s | Unchanged (persistence, not animation) | Timer |
| `StatusBar.jsx` (watch) | Static `◦` hollow char | `useTicker` + `SPIN_FRAMES` cycling spinner | Shared |
| `PermissionModal.jsx` | Inline `useState` + 150ms `setTimeout` | `useFlashOnMount` hook (400ms) | Hook |
| `InputLine.jsx` (cursor) | `useState` + `useEffect` every tick | Direct `useTicker` computation (no state churn) | Shared |
| `WelcomeScreen.jsx` | — | Gradient cycle + tip char-reveal + staggered stats | Shared |
| `AgentStrip.jsx` | — | `useTicker` + `SPIN_FRAMES` for running subagents | Shared |
| `ProcessingScreen.jsx` | — | `useTicker` wave spin + `useAnimatedProgress` bars | Shared |
| `CommandPalette.jsx` | — | `useEntrance` staggered command list | Shared |
| `Header.jsx` (CLI) | — | `useTicker` + `SPIN_FRAMES` watch spinner | Shared |
| `SpinnerBlock` | — | `useTicker` + `SPIN_FRAMES` amber spinner | Shared |
| `ThoughtBlock` | — | `useTicker` + `useEntrance` line reveal + live cursor | Shared |
| `DiffBlock` | — | `useTicker` staggered reveal (adds faster, removes slower) + `useFlashOnMount` | Shared |
| `ReadBlock` | — | `useEntrance` + `useFlashOnMount` | Shared |
| `WriteBlock` | — | `useEntrance` + `useFlashOnMount` | Shared |
| `CommandBlock` | — | `useEntrance` + `useFlashOnMount` | Shared |
| `PermissionBlock` | — | `useFlashOnMount` | Shared |
| `TodoRow` | — | `useAnimatedProgress` + flash-then-settle | Shared |

### No remaining `setInterval`-based animations

The only `setInterval` left in CLI UI code is the **30-second auto-save** in `App.jsx` — this is a persistence timer, not an animation, and is correct to leave as-is. The `useAnimatedProgress` hook uses a finite internal `setInterval` (8 frames × 20ms = 160ms, auto-clears) which is a one-shot interpolation, not a continuous loop.

The only `setInterval` left in CLI UI code is the **30-second auto-save** in `App.jsx` — this is a persistence timer, not an animation, and is correct to leave as-is.
