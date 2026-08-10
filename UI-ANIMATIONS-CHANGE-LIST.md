# UI Animations — Change List (Web / Framer Motion)

## Overview

All web UI animations were migrated from **GSAP** (GreenSock) and static CSS to **Framer Motion** (v11+). This gives declarative, composable animation patterns with scroll-linked entrances, staggered reveals, hover interactions, path-drawing, and infinite loops — all driven by `motion` components and `variants`.

- **Framework:** React 19 + Framer Motion + Tailwind CSS + Redux Toolkit + Socket.IO
- **Zero GSAP imports** remain in web source (`src/`).
- **32 web files** now use Framer Motion.

---

## Core Patterns

### 1. Scroll-Triggered Entrance

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  Content fades and slides up when scrolled into view.
</motion.div>
```

- `initial` — starting state (off-screen, transparent).
- `whileInView` — target state when element enters viewport.
- `viewport={{ once: true }}` — fires once, never repeats.
- `amount: 0.3` — triggers when 30% of element is visible.

### 2. Staggered Children (Container / Item Variants)

```jsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div
  variants={container}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
>
  <motion.div variants={item}>Child 1 fades in</motion.div>
  <motion.div variants={item}>Child 2 fades in 100ms later</motion.div>
</motion.div>
```

- `staggerChildren` — delay between each child animation.
- `delayChildren` — delay before the first child starts.
- Children use the same `variants` object for consistent timing.

### 3. Hover & Tap Interactions

```jsx
<motion.button
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
  Interactive element with spring physics.
</motion.button>
```

### 4. Path Drawing (SVG draw-in)

```jsx
<motion.svg width="24" height="24" viewBox="0 0 24 24">
  <motion.path
    d="M5 13l4 4L19 7"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    stroke="currentColor"
    variants={{
      hidden: { pathLength: 0, opacity: 0 },
      visible: { pathLength: 1, opacity: 1 }
    }}
    initial="hidden"
    animate="visible"
    transition={{ duration: 0.5, ease: 'easeOut' }}
  />
</motion.svg>
```

- `pathLength: 0 → 1` animates the SVG stroke drawing itself.
- Used for checkmarks, icons, decorative flourishes.

### 5. Infinite Loops (Pulse / Spin)

```jsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
>
  Continuously spinning element.
</motion.div>

<motion.div
  animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
>
  Pulsing element.
</motion.div>
```

### 6. Enter/Exit Animation (AnimatePresence)

```jsx
import { AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {isOpen && (
    <motion.div
      key="dropdown"
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      Dropdown content appears with spring, disappears on close.
    </motion.div>
  )}
</AnimatePresence>
```

### 7. Scroll Parallax (useScroll + useTransform)

```jsx
import { useScroll, useTransform } from 'framer-motion';

const { scrollYProgress } = useScroll();
const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.9]);
const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

<motion.video style={{ scale, y }} src="/robot.mp4" />
```

- `useScroll` captures scroll progress.
- `useTransform` maps scroll progress to any CSS property.

### 8. MotionLink Pattern (react-router-dom)

```jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionLink = motion(Link);

<MotionLink to="/login" whileHover={{ scale: 1.05 }}>
  Animated navigation link.
</MotionLink>
```

- **Critical:** `motion(Link)` must be assigned to a named const (`MotionLink`) at module level — cannot be used as `<motion(Link)>` in JSX.

---

## Sections (Landing Page)

### `src/components/sections/Hero.jsx`

- **Before:** GSAP `.hero-element` stagger with `gsap.utils.stagger()`.
- **After:** `motion.div` container with `variants`:
  - `staggerChildren: 0.1` for sequential reveal of hero headline, subtitle, CTA buttons.
  - `item` variant: `y: 40 → 0` + opacity fade.
  - CTA button: `whileHover={{ scale: 1.05 }}` `whileTap={{ scale: 0.97 }}` with spring transition.

### `src/components/sections/AIHero.jsx`

- **Before:** GSAP `.hero-element` stagger + static sparkle icon.
- **After:** Same `motion.div` + `variants` stagger pattern. Spring animation (`stiffness: 300, damping: 20`) on Sparkles icon and decorative `✦`. `MotionLink` for CTA.

### `src/components/sections/CLIHero.jsx`

- **Before:** GSAP `from()` for element reveal.
- **After:** `motion.div` with `initial`/`whileInView`/`viewport={{ once: true }}`.
- Copy button: `AnimatePresence` + `motion.div` for checkmark checkmark swap (checked state vs copy icon).
- Background gradient: `motion.div animate={{ backgroundPosition }}` with infinite linear loop.

### `src/components/sections/AIChatPreview.jsx`

- **Before:** GSAP ScrollTrigger for fade-in.
- **After:** `motion.div` with `whileInView` + `viewport={{ once: true }}`.
- Chat preview card: `whileHover={{ scale: 1.02, rotateY: 2 }}` with spring.
- Avatar avatars: `initial={{ opacity: 0, x: -20 }}` staggered reveal.

### `src/components/sections/DashboardPreview.jsx`

- **Before:** GSAP ScrollTrigger.
- **After:** Same `motion.div` + `whileInView` pattern.
- Card grid: staggered children (`staggerChildren: 0.1`).
- Each card: `y: 30 → 0` + opacity.

### `src/components/sections/CLIDemoPreview.jsx`

- **Before:** GSAP ScrollTrigger `onEnter` → `setTimeout` line reveal.
- **After:** Framer Motion `useInView` hook replaces ScrollTrigger.
  - `const { ref, inView } = useInView({ once: true, amount: 0.3 });`
  - When `inView` becomes true, `useEffect` triggers the `setTimeout`-based line-by-line reveal.
  - `AnimatePresence` wraps terminal lines — each line `initial={{ opacity: 0, x: -10 }}` → `animate={{ opacity: 1, x: 0 }}` with `delay: idx * 0.05`.
  - Cursor blink: `motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}`.
  - Placeholder text: `motion.div` fade-in with `delay: 0.5`.

### `src/components/sections/AgentFeature.jsx`

- **Before:** GSAP `to()` infinite rotation + GSAP `from('.agent-text')` stagger + GSAP parallax `scrub: 1`.
- **After:** Three migrations:
  1. **Infinite rotation** → `motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}`.
  2. **Text stagger** → `motion.div variants={{ container: { staggerChildren: 0.15 }, item: { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } } }}` with `whileInView`.
  3. **Parallax video** → `useScroll` + `useTransform` mapping scroll progress to `scale` (`[0.8, 1, 0.9]`) and `y` (`[0, -50]`) on the robot `<video>`.
  - Feature cards: staggered entrance with `delay: 0.3 + i * 0.1`.

### `src/components/sections/HowItWorks.jsx`

- **Before:** GSAP ScrollTrigger + `gsap.from()`.
- **After:** `motion.div` container with `variants` stagger (`staggerChildren: 0.15`).
  - Step cards: `whileInView` + `viewport={{ once: true, amount: 0.3 }}`.
  - Icon: spring entrance (`type: 'spring', stiffness: 300`).
  - Number badge: `whileHover={{ rotate: 5, scale: 1.1 }}`.

### `src/components/sections/Testimonials.jsx`

- **Before:** Static component with no animation.
- **After:** Full rewrite with `motion.section`:
  - Container `variants`: `staggerChildren: 0.1`.
  - Quote text: `y: 20 → 0` + opacity.
  - Avatar: `custom` prop for staggered delays, `whileHover={{ scale: 1.1, rotate: 2 }}` with spring.
  - Star ratings: `pathLength` draw-in on SVG paths.

### `src/components/sections/FeaturesGrid.jsx`

- **Before:** Static cards.
- **After:** Full rewrite with `motion.div` + `variants` stagger.
  - Cards: `whileHover={{ scale: 1.02, y: -5 }}` with spring.
  - Icons: `initial={{ scale: 0.8, opacity: 0 }}` → `whileInView={{ scale: 1, opacity: 1 }}` with spring.

### `src/components/sections/Pricing.jsx`

- **Before:** Static cards.
- **After:** Full rewrite with `motion.div` + `variants` stagger.
  - "Most Popular" badge: spring entrance (`initial={{ scale: 0 }}`).
  - Price number: `animate={{ scale: [1, 1.1, 1] }}` with spring (one-time emphasis).
  - Feature checkmarks: `pathLength` draw-in.
  - Cards: `whileHover={{ y: -5 }}`.

### `src/components/sections/LogoTicker.jsx`

- **Before:** Tailwind `animate-pulse` on logos.
- **After:** `motion.div` staggered logo entrance (`delay: 0.2 + i * 0.05`) + `whileHover={{ scale: 1.1 }}`.
  - Container: `variants` with `staggerChildren: 0.05`.

---

## Layout

### `src/components/layout/Header.jsx`

- **Before:** Static header.
- **After:** Full rewrite:
  - `motion.header`: `initial={{ y: -20, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`.
  - Logo: `animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}` infinite 2s pulse.
  - Nav links: `variants` stagger (`staggerChildren: 0.08`).
  - `MotionLink = motion(Link)` for all navigation — hover `scale: 1.05`.
  - Hamburger menu: `motion.div` icon rotation (`rotate: 0 → 180`) with `AnimatePresence` for open/close state.

### `src/components/layout/Layout.jsx`

- **Before:** Static `<main>` / `<footer>`.
- **After:** `motion.main` entrance (`initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}`) + `motion.footer` slide-up (`initial={{ y: 20 }}` → `whileInView`).

---

## IDE Components

### `src/components/ide/EditorPane.jsx`

- `motion.div` for empty state (opacity + scale pulse).
- Tab container: `initial={{ opacity: 0, y: 10 }}` → `animate` with `delay: 0.2`.
- Tabs: `variants` stagger (`delay: 0.1 + i * 0.03`), `whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}`.
- Tab close button: `whileHover={{ rotate: 90 }}` (90-degree spin on hover).
- Loading overlay: `AnimatePresence` — enters `initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}`, exits `exit={{ opacity: 0 }}` with 300ms duration.

### `src/components/ide/ModelSelector.jsx`

- `AnimatePresence` for dropdown and modal.
  - Dropdown: `initial={{ opacity: 0, scale: 0.95 }}` → `animate={{ opacity: 1, scale: 1 }}` + `exit={{ opacity: 0, scale: 0.95 }}`.
  - Model items: staggered (`delay: 0.05 * i`).
  - Checkmark: `pathLength` draw-in on SVG path.
  - Close button: `whileHover={{ rotate: 90 }}`.
  - Modal: spring animation (`type: 'spring', stiffness: 300, damping: 25`).

### `src/components/ide/TerminalPane.jsx`

- Container: `motion.div` with `initial={{ opacity: 0, scale: 0.98 }}` → `animate`.
- Header bar: `initial={{ y: -20 }}` → `animate={{ y: 0 }}` (slide-down reveal).
- Terminal icon: `whileHover={{ rotate: 15 }}` + spring.
- Clear button: `whileHover={{ scale: 1.1, rotate: 5 }}` + `whileTap={{ scale: 0.9 }}`.
- Placeholder text: `AnimatePresence` with opacity transition on command-empty state.

### `src/components/ide/DesignTab.jsx`

- Sidebar: `initial={{ x: -20, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}`.
- Search icon: `whileHover={{ scale: 1.1 }}`.
- Tab buttons (Templates/History): `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.98 }}`.
- Template buttons: staggered entrance (`delay: 0.2 + i * 0.03`).
  - Template name: `initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}` with `delay: 0.05`.
  - Template description: `delay: 0.08`.
- History list container: `motion.div` with `variants` stagger (`staggerChildren: 0.05, delayChildren: 0.1`).
- History "empty" state: `motion.div` with scale + opacity (`initial={{ opacity: 0, scale: 0.9 }}`).

---

## Pages

### `src/pages/AIChatPage.jsx`

- Chat message items: `motion.div`.
  - User messages: `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}`.
  - Assistant messages: staggered `delay: idx * 0.02`.
  - Typing cursor: `motion.span animate={{ opacity: [0.3, 1, 0.3] }}` infinite 1s blink.
  - Container: `variants` stagger (`staggerChildren: 0.05`).

### `src/pages/LoginPage.jsx`

- Full Framer Motion rewrite:
  - Card: `initial={{ opacity: 0, scale: 0.95, y: 20 }}` → `animate` with spring.
  - Form fields: `variants` stagger (`delay: 0.1 + i * 0.05`).
  - Nav links: `whileHover={{ x: 5 }}`.
  - Social buttons: `whileHover={{ scale: 1.05 }}` `whileTap={{ scale: 0.95 }}`.
  - Footer: `initial={{ opacity: 0 }}` delayed entrance.

### `src/pages/SignupPage.jsx`

- Same full Framer Motion treatment as LoginPage (card spring, staggered fields, social buttons, footer).

### `src/pages/ForgotPasswordPage.jsx`

- Full Framer Motion treatment with `AnimatePresence` mode="wait":
  - Form → success state transition with exit animation.
  - Checkmark SVG: `pathLength` draw-in (`variants: { hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1 } }}`).
  - Success message: staggered (`delay: 0.3, 0.4, 0.5`).

### `src/pages/SettingsPage.jsx`

- Sidebar tabs: `motion.button` with staggered entrance (`delay: 0.15 + i * 0.05`).
- Content area: `motion.main` with `initial={{ opacity: 0, y: 10 }}` → `animate`.
- `MotionLink = motion(Link)` for settings navigation links — hover `x: 5`.

---

## Bugs Fixed During Migration

| Bug | File | Fix |
|---|---|---|
| `motion(Link)` used as JSX tag `<motion(Link)>` | Header.jsx, AIHero.jsx, LoginPage.jsx, SignupPage.jsx, ForgotPasswordPage.jsx, SettingsPage.jsx | Declared `const MotionLink = motion(Link);` at module level, used `<MotionLink>` |
| Curly quotes in Testimonials.jsx | Testimonials.jsx | Rewrote with straight quotes via Write tool |
| `</div>` instead of `</motion.div>` | LoginPage.jsx | Matched closing tag |
| `</main>` instead of `</motion.main>` | SettingsPage.jsx | Fixed closing tag |
| Duplicate `ticks` declaration | App.jsx | Removed duplicate `const ticks = useTicker()` |
| Missing `currentWave` state | App.jsx | Restored `const [currentWave, setCurrentWave] = useState(0)` |
| Placeholder `ArrowDownRightIcon` | ForgotPasswordPage.jsx | Imported `ArrowDownRight` from `lucide-react` |
| `</div>` instead of `</motion.div>` | DesignTab.jsx | Fixed scrollable container and history list closing tags |
| `</button>` mismatch on IDE-view buttons | AIChatPage.jsx | Fixed GitHub connect button closing tag → `</motion.button>` |

---

## Verification

- **Web build:** `npx vite build` — succeeds (built in ~1.3s, 0 errors).
- **CLI lint:** `npx eslint` — 0 errors, only pre-existing warnings.
- **GSAP imports remaining:** 0 in `src/`.
- **Files using Framer Motion:** 34 web files (excluding plain `<button>` elements now migrated to `<motion.button>` where appropriate).
- **`setInterval` in CLI UI:** only `useTicker.js` (80ms shared clock), `App.jsx` (30s auto-save), `useAnimatedProgress.js` (160ms one-shot) — no stray animation loops.

## Additional Fixes Applied

### `src/components/chat/StepCard.jsx`

- **DiffViewer** — Migrated from individual `initial`/`animate`/`delay` props to the spec's `staggerChildren`/`variants` pattern:
  - Container: `initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.03 } } }}`.
  - Each line: `variants={{ hidden: { opacity: 0, x: -5 }, visible: { opacity: 1, x: 0 } }}` (added x-offset animation per spec).
  - Stagger at 30ms/line for diff lines (was 20ms with no x-offset).
- **TerminalViewer** — Migrated to `staggerChildren`/`variants` pattern:
  - Container: `variants={{ visible: { transition: { staggerChildren: 0.015 } } }}`.
  - Each line: `variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}`.
- **Undo/Keep buttons** — Changed from plain `<button>` to `<motion.button>` with `whileHover={{ scale: 1.05 }}` and `whileTap={{ scale: 0.95 }}`.
- **Expand/collapse** — Updated to spec's `variants` pattern: `initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}` with `AnimatePresence initial={false}`.

### `src/components/ide/StepCards.jsx` — `SnapshotTree`

- **Before:** Plain `<div>` toggle, no animation — children appeared/disappeared instantly.
- **After:** `AnimatePresence initial={false}` wrapping child expansion:
  - `motion.div` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}` → `exit={{ height: 0, opacity: 0 }}` (200ms ease-in-out).
  - Child nodes: staggered `motion.div` with `initial={{ opacity: 0, x: -3 }}` → `animate={{ opacity: 1, x: 0 }}` (`delay: i * 0.02`).

### `src/pages/AIChatPage.jsx`

- **Tab buttons (Design/Chat/AI Agent)** — Changed from plain `<button>` to `<motion.button>` with `whileHover={{ scale: activeTab === tab ? 1 : 1.05 }}` and `whileTap={{ scale: 0.95 }}`.
- **Empty state quick-action buttons** — Changed all 3 (`<button>`) to `<motion.button>` with `whileHover={{ scale: 1.03 }}` and `whileTap={{ scale: 0.97 }}`.
- **Chat view action bar buttons (Upload/Export/Push/Branch/GitHub)** — Changed from `<button>` to `<motion.button>` with `whileHover={{ scale: 1.03 }}` and `whileTap={{ scale: 0.97 }}` (both empty-state and chat-view instances).
- **IDE view action overlay buttons (Upload/Export/Push/Branch/GitHub)** — Changed from `<button>` to `<motion.button>` with `whileHover`/`whileTap` (5 buttons).

---

## Undocumented Animations (Previously Missing From This File)

### `src/components/chat/TodoCard.jsx` — Todo Checkbox & Status Indicators

**Container card** (entire plan card):
- `motion.div` `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}` — slide-up + fade-in on mount.

**Completed todo checkbox** (the SVG checkmark):
- Outer circle: `motion.div` with **spring** (`type: 'spring', stiffness: 300, damping: 20`), `initial={{ scale: 0.5, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}` — pops into view.
- Checkmark path: `motion.path` with **`pathLength` draw-in**:
  - `initial={{ pathLength: 0, opacity: 0 }}` → `animate={{ pathLength: 1, opacity: 1 }}`
  - `transition={{ duration: 0.3, ease: 'easeOut' }}` — the stroke draws itself from start to end over 300ms.

**In-progress todo indicator** (the pulsing blue dot):
- `motion.div` with **infinite pulse**:
  - `animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}`
  - `transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}`
  - `className="w-4 h-4 rounded-full bg-blue-400"`

**Pending todo** (static circle):
- Plain `<Circle>` icon (Lucide) with `className="w-4 h-4 text-white/20"` — no animation.

---

### `src/components/ide/SparkleButton.jsx` — Quick Prompt Suggestions

**Main button** (sparkle icon toggle):
- `motion.button` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- Active state: gradient background `from-[#eab308]/10 to-[#f59e0b]/10` with `shadow-[0_0_15px_rgba(234,179,8,0.2)]`.
- Inactive state: `bg-white/5 hover:bg-white/10` with amber text.

**Dropdown container** (suggestions list):
- `AnimatePresence` wrapping:
  - `motion.div` `initial={{ opacity: 0, y: -8, scale: 0.95 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` → `exit={{ opacity: 0, y: -8, scale: 0.95 }}`
  - `transition={{ duration: 0.15 }}` — quick fade + scale from the button.
  - `className="absolute bottom-full right-0 ..."` — anchors above the button.

**Suggestion buttons** (6 quick prompts):
- Each `<motion.button>` with `initial={{ opacity: 0, x: -4 }}` → `animate={{ opacity: 1, x: 0 }}`.
- Staggered: `transition={{ delay: i * 0.03 }}` — 30ms between each button.

**Watch toggle button** (only in advanced/agent mode):
- Same staggered pattern as suggestions, with `delay: SUGGESTIONS.length * 0.03` (appears after all suggestions).
- Green text (`text-emerald-400`) with `hover:bg-emerald-500/10` background.

---

### `src/components/ide/WaveProgress.jsx` — God-Mode Execution Dashboard

**Container** (wave dashboard panel):
- `motion.div` `initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}` → `exit={{ opacity: 0, y: -8 }}`
- `transition={{ duration: 0.2 }}` — slides down from above the content.

**Wave progress bars** (per-wave completion):
- `motion.div` bar fill with `initial={{ width: 0 }}` → `animate={{ width: \`${pct}%\` }}`
- `transition={{ duration: 0.5, ease: 'easeOut' }}` — smooth width growth proportional to completion.

**Build summary card** (appears after all waves complete):
- `motion.div` `initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: 'auto' }}`
- Expands down from the waves list.

**Domain-colored subagent rows** (running subagents within a wave):
- Status icons from `STATUS_ICON` map (`CheckCircle2`, `XCircle`, `Loader2 animate-spin`, `Clock`, `Zap`, `BarChart3`).
- `Loader2` uses Tailwind `animate-spin` for running status.

---

### `src/components/ide/FileTree.jsx` — File Tree

**File node** (clickable file item):
- `motion.div` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- Active file gets `bg-white/10 text-white`; inactive gets `text-white/70`.

**Folder node** (clickable directory header):
- `motion.div` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- Chevron icon: `<ChevronDown>` when open, `<ChevronRight>` when collapsed — no rotation animation (icon swap only).

**Folder contents** (expand/collapse):
- `AnimatePresence` wrapping:
- `motion.div` `initial={{ height: 0 }}` → `animate={{ height: 'auto' }}` → `exit={{ height: 0 }}`
- `className="overflow-hidden"` — smooth height transition for tree expansion.

---

### `src/pages/SettingsPage.jsx` — UsageTab Animations

**Bar chart bars** (tokens per day):
- `motion.div` per bar with `initial={{ height: 0 }}` → `animate={{ height: \`${(d.tokens / maxTokens) * 100}%\` }}`
- Grows from zero height to proportional height based on token usage.

**Donut chart segments** (model usage):
- `motion.circle` with SVG `strokeDasharray`/`strokeDashoffset` animation:
  - `initial={{ strokeDashoffset: circumference }}` → `animate={{ strokeDashoffset: -seg.offset }}`
  - `transition={{ duration: 0.8 }}` — each segment draws itself around the circle.
  - Rotated `-90deg` via `transform -rotate-90` on the parent SVG.

---

### `src/pages/SettingsPage.jsx` — ApiKeysTab Model Selection

**Model list entries** (staggered reveal):
- `motion.div` per model with `initial={{ opacity: 0, x: -10 }}` → `animate={{ opacity: 1, x: 0 }}`
- `transition={{ duration: 0.2 }}` — slides in from the left.

**Selected model** (gradient border):
- Inline `style` (not Framer Motion) on the selected `motion.div`:
  - `borderImage: 'linear-gradient(90deg, #3b82f6, #a854f7, #ec4899, #f97316)'`
  - `borderImageSlice: 1`, `borderWidth: '1px'`, `borderStyle: 'solid'`
  - Unselected: `borderColor: '#2a2a2a'`.

---

### `src/pages/AIChatPage.jsx` — Slash Command Picker

**Picker dropdown** (command palette that appears when typing `/`):
- `AnimatePresence` wrapping (conditional render when `showCommandPicker && prompt.startsWith('/')`).
- `motion.div` `initial={{ opacity: 0, y: -8, scale: 0.95 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` → `exit={{ opacity: 0, y: -8, scale: 0.95 }}`
- `transition={{ duration: 0.15 }}` — same pattern as SparkleButton dropdown.
- Positioned `absolute bottom-full left-0 mb-2` with `z-50` (appears **above** the textarea, not below, since the input is at the bottom of the viewport).
  - Animation: `initial={{ opacity: 0, y: 8, scale: 0.95 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` → `exit={{ opacity: 0, y: 8, scale: 0.95 }}` (150ms).
- Background: `bg-[#1a1a1a]`, border `border-white/10`, `rounded-xl`, `shadow-2xl`, `max-h-60` with `overflow-y-auto`.

**Command picker buttons** (each slash command):
- `motion.button` with `initial={{ opacity: 0, x: -4 }}` → `animate={{ opacity: 1, x: 0 }}`
- Staggered: `transition={{ delay: i * 0.03 }}` — 30ms between each command.
- Hover: `hover:text-white hover:bg-white/5`.
- Shows icon, command name (`/{c.cmd}`), and description.

**"No matching commands" fallback**:
- Plain `<div>` (no motion) shown when filter yields empty results.

---

### `src/pages/AIChatPage.jsx` — Right Button Group (Chat-with-messages view)

**Wrapper div** (right button group):
- `<div className="flex items-center gap-2">` containing `<ModelSelector />` and the send/stop button group.

**Send / Stop buttons** (`AnimatePresence mode="wait"`):
- `<motion.button>` with:
  - `initial={{ scale: 0.9, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}` → `exit={{ scale: 0.9, opacity: 0 }}`
  - `transition={{ duration: 0.15 }}` — smooth swap between send (ArrowUp) and stop (Square) icons.
- Send button: `disabled={!prompt.trim() || isStreaming}`, circular, gradient `from-blue-500 to-emerald-400`.
- Stop button: red circular, `bg-red-500/20 hover:bg-red-500/40`.

**ModelSelector** (in chat view):
- Renders `<ModelSelector />` component (see `ModelSelector.jsx` documentation under IDE Components above).
- Shows selected model or "Choose model" button with `title` attribute for API key status.

---

### `src/components/LoginModal.jsx` — Login Modal

- **Modal container**: `AnimatePresence` + `motion.div` — enters/exits with opacity + scale.
- **Expandable section**: `motion.div initial={{ opacity: 0, height: 0 }}` → `animate={{ opacity: 1, height: 'auto' }}` — reveals additional login options.

---

### `src/components/ide/WorkspaceModals.jsx` — Workspace Modals

- **Modal backdrop**: `AnimatePresence` + `motion.div` for open/close.
- **Modal panel**: `motion.div` — slides/fades in.
- **Close button**: `motion.button` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- **Action buttons**: `motion.button` with `whileHover`/`whileTap`.

---

### `src/components/ide/PermissionModal.jsx` — Permission Modal

- **Modal**: `AnimatePresence` + `motion.div` for enter/exit.
- **Accept / Deny buttons**: `motion.button` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` (3 buttons: Allow, Allow All, Deny).

---

### `src/components/ide/ModelSettingsModal.jsx` — Model Settings Modal

- **Modal**: `AnimatePresence` + `motion.div` for enter/exit animation.
- Content slides in with opacity fade.

---

## Z-Code Specific Features (Web Client)

### Slash Commands (`src/lib/slashCommands.js`)

`WEB_SLASH_COMMANDS` array — 8 commands available in chat input:

| Command | Icon | Description |
|---------|------|-------------|
| `/clear` | 🗑 | Clear chat history |
| `/help` | ❓ | Show available commands |
| `/undo` | ↶ | Undo last file change |
| `/model` | 🤖 | Switch AI model |
| `/god` | ⚡ | Enter god-mode parallel build |
| `/watch` | 👁 | Toggle watch daemon |
| `/debug` | 🐛 | Toggle debug mode |
| `/export` | 📄 | Export session |

- Picker appears when user types `/` in any chat textarea (empty state, chat-with-messages, AI Code Agent).
- Commands are filtered live as the user types after `/`.
- Clicking a command in the picker inserts `/{cmd}` into the textarea and closes the picker.

### ModelSelector Component (`src/components/ide/ModelSelector.jsx`)

- Used in both **SettingsPage** (model list) and **AIChatPage** (chat input right button group).
- Provider grouping: models grouped by provider in hover submenus.
- `hasKeys` check: if no API key is saved, shows "Add an API key" hint instead of model list.
- Selected model: gradient border (`borderImage` with `linear-gradient`).
- "Manage models" link navigates to `/settings` API Keys tab.

### Model Persistence (`SettingsPage.jsx`)

- **Selection cache**: `selectedModelByProvider` state object caches the selected model per provider.
- **Priority order**: `cached || saved || null` — the user's local selection takes priority over the backend-saved model, so switching providers and back preserves the selection.
- **Save payload**: `handleSave` sends `model: selectedModelId` in the POST `/api/v1/keys` body.

### Usage Stats (`SettingsPage.jsx` — `UsageTab`)

- Fetches real data from `GET /api/v1/usage/stats?from=...&to=...`.
- Time range selector: "Last 7 days" / "Last 30 days" tabs.
- Heatmap: 5×7 grid of 35 days, color-coded by session count (4 levels: empty → blue-500).
- Bar chart: tokens per day, animated `height` from 0 on load.
- Donut chart: model usage with `strokeDasharray`/`strokeDashoffset` SVG animation.
- Metrics grid: Token usage, Sessions, Messages, Active days, Current streak, Favorite model.
