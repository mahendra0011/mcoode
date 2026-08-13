# ZCode CLI UI Elements & Terminal Animations

> ✅ Based on analysis of `ZCode/resources/app-extracted/` — terminal services, node-pty integration, and CSS animations.

---

## Terminal Implementation

ZCode uses `@xterm/xterm` with `@xterm/addon-fit` for terminal rendering. The terminal is embedded in the Electron renderer process via web view.

### Terminal CSS

```css
.terminal-xterm-shell {
  /* Terminal container styling */
}
.xterm {
  /* Base terminal styles */
  font-family: monospace;
}
.xterm-screen {
  /* Screen container */
}
.xterm-decoration {
  /* Decorations (links, etc.) */
}
.xterm-overline {
  /* Overline text support */
}
```

### Terminal Theme (Dark Mode)

```css
.xterm {
  background: #0a0a0a;  /* Black background */
  color: #f4f4f5;       /* Primary text */
  --xterm-color-0: #0a0a0a;   /* Black */
  --xterm-color-1: #f871f1;   /* Red */
  --xterm-color-2: #10b981;   /* Green */
  --xterm-color-3: #eab308;   /* Yellow */
  --xterm-color-4: #3b82f6;   /* Blue */
  --xterm-color-5: #a855f7;   /* Magenta */
  --xterm-color-6: #2dd677;   /* Cyan */
  --xterm-color-7: #e5e5e5;   /* White */
  --xterm-color-8: #27272a;   /* Bright Black */
  --xterm-color-9: #fb6b6b;   /* Bright Red */
  --xterm-color-10: #2dd677;  /* Bright Green */
  --xterm-color-11: #fbbf24;  /* Bright Yellow */
  --xterm-color-12: #60a5fa;   /* Bright Blue */
  --xterm-color-13: #c084fc;  /* Bright Magenta */
  --xterm-color-14: #4feda8;  /* Bright Cyan */
  --xterm-color-15: #f4f4f5;  /* Bright White */
}
```

---

## Terminal CLI Elements

### Prompt & Command Line

ZCode's terminal uses a standard shell prompt (`$`) with:
- **Prompt prefix**: `$` in emerald/green
- **Command echo**: User's command displayed after prompt
- **Output rendering**: ANSI escape codes parsed via `ansi-to-react`

### ANSI Rendering Stack

1. `node-pty` — PTY process management (spawns shell)
2. `xterm` — Terminal frontend rendering
3. `ansi-to-react` — ANSI → React component
4. `anser` — ANSI escape sequence rendering
5. `cli-spinners` — Spinner animations for long operations

---

## CLI Animation Elements

### Spinner Animations

From `cli-spinners` package — ZCode uses custom spinner configurations:

```javascript
// Standard spinner (used during long operations)
{
  interval: 130,        // ms between frames
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
}

// Loading/progress spinner
{
  interval: 100,
  frames: ['🌍', '🌎', '🌏', '🌐']
}
```

### Progress Bar Animation

ZCode uses `progress` package for terminal-style progress bars:

```javascript
// Progress bar with stream markers
// Width: 20 chars
// Format: [:bar] :percent :etas
// Uses zcode-stream-text-in for fade effect
```

---

## Terminal Output Styling

### Command Output

```css
/* Command echo */
[class*="xterm"] .xterm-foreground {
  color: var(--color-text, #e6e6ea);
}

/* Error output (stderr) */
[class*="xterm"] .xterm-error {
  color: var(--color-red, #ff6b6b);
}

/* Success output */
[class*="xterm"] .xterm-success {
  color: var(--color-green, #3ecf8e);
}
```

### ANSI Color Mapping

| ANSI Code | Color | Usage |
|-----------|-------|-------|
| `\x1b[31m` | Red | Errors, deletions |
| `\x1b[32m` | Green | Success, additions |
| `\x1b[33m` | Yellow | Warnings |
| `\x1b[34m` | Blue | Info, commands |
| `\x1b[35m` | Magenta | Debug |
| `\x1b[36m` | Cyan | System messages |

---

## Agent Mode CLI Interface

### Command Input

```jsx
// Uses Cmdk (cmdk package) for command palette
<input placeholder="Type a command..." />
<kbd>⌘</kbd> + <kbd>K</kbd>  /* Global command palette */
<kbd>/</kbd>                    /* Slash commands in chat */
```

### Slash Commands

Available via `/` prefix:
- `/agent` — Switch AI agent type
- `/mode` — Change interaction mode
- `/ui-mode` — Toggle special UI modes
- `/watch` — Toggle file watcher
- `/bugfix` — Start bugfix workflow
- `/record` — Start macro recording
- `/clear` — Clear chat history

### Command Palette Actions

Accessed via `⌘ + K`:
- New chat / workspace
- File operations (open, save, export)
- Git operations (commit, push, branch)
- Settings & preferences
- Theme toggle (light/dark/zai-dark)

---

## Terminal Animation Triggers

### Live Output Streaming

```css
[data-zcode-stream-animate=true],
[data-zcode-tool-stream-animate=true] {
  will-change: opacity;
  animation: 0.9s cubic-bezier(0.16, 1, 0.3, 1) both zcode-stream-text-in;
}
```

Terminal output streams with fade-in animation:
- Each chunk fades in over 900ms
- Uses Apple-style `cubic-bezier(0.16, 1, 0.3, 1)` easing
- Staggers chunks for smooth typing effect

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + K` | Command palette |
| `⌘ + Enter` | Send message |
| `Shift + Enter` | New line in prompt |
| `Esc` | Close/clear |
| `Tab` | Autocomplete |
| `Arrow Up/Down` | Command history |
| `Ctrl/Cmd + /` | Toggle sidebar |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `F11` | Fullscreen toggle |

---

## Terminal Command Execution Flow

1. User types command in terminal input
2. `node-pty` spawns shell process
3. Command output streamed back via PTY
4. ANSI codes parsed by `ansi-to-react`
5. Rendered in xterm.js terminal
6. Live streaming with fade-in animation (`zcode-stream-text-in`)

---

## Agent CLI Animation Patterns

### Agent Mode Toggle

```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="...border..."
>
  <Settings className="w-3.5 h-3.5" /> Advanced Mode
</motion.button>
```

### Agent Message Appearance

```jsx
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
/>
```

### Step Cards (Agent Steps)

```jsx
// Staggered appearance
<motion.div
  variants={{
    show: {
      transition: { staggerChildren: 0.04 }
    }
  }}
  initial="hidden"
  animate="show"
>
  // Each step: initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
</motion.div>
```

### God Mode Toggle

```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="...gradient..."
>
  <Zap className="w-3.5 h-3.5" /> God
</motion.button>
```

When toggled:
1. Button gets purple gradient background
2. Shadow glow activates
3. God mode components fade in:
   - WaveProgress panel
   - Subagent status cards
   - Build summary overlay
