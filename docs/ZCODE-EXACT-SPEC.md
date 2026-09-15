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
