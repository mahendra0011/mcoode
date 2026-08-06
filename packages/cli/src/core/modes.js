/** Special UI modes for mcode CLI.
 * Each mode affects the terminal UI rendering and behavior.
 */

export const SPECIAL_MODES = Object.freeze({
  LEARNING: 'learning',
  COMPETITION: 'competition',
  ZEN: 'zen',
  FOCUS: 'focus',
  PRESENTATION: 'presentation',
  DEBUG: 'debug',
  SILENT: 'silent',
  BATCH: 'batch',
  DAEMON: 'daemon',
  SERVICE: 'service',
});

/** Metadata for each mode — display name, description, and UI effects. */
export const MODE_META = Object.freeze({
  [SPECIAL_MODES.LEARNING]: {
    label: 'Learning',
    description: 'Step-by-step walkthrough with explanations',
    icon: '\u309b',
    affects: ['show-steps', 'verbose-explanation'],
  },
  [SPECIAL_MODES.COMPETITION]: {
    label: 'Competition',
    description: 'Time trials — race against the clock',
    icon: '\u23f1',
    affects: ['timer-display', 'speed-focus'],
  },
  [SPECIAL_MODES.ZEN]: {
    label: 'Zen',
    description: 'Minimal UI — just the essentials',
    icon: '\u5b09',
    affects: ['minimal-ui', 'hide-sidebar', 'hide-agent-strip'],
  },
  [SPECIAL_MODES.FOCUS]: {
    label: 'Focus',
    description: 'Hide distractions, show only the task',
    icon: '\u1f512',
    affects: ['hide-toasts', 'hide-agent-strip', 'full-width-input'],
  },
  [SPECIAL_MODES.PRESENTATION]: {
    label: 'Presentation',
    description: 'Large text, clean layout for demos',
    icon: '\u0196',
    affects: ['large-font', 'center-align', 'minimal-colors'],
  },
  [SPECIAL_MODES.DEBUG]: {
    label: 'Debug',
    description: 'Verbose output and event inspector',
    icon: '\u26a7',
    affects: ['show-debug-panel', 'verbose-logs', 'show-raw-events'],
  },
  [SPECIAL_MODES.SILENT]: {
    label: 'Silent',
    description: 'Minimal output — only errors shown',
    icon: '\u1f515',
    affects: ['suppress-info', 'errors-only', 'quiet-mode', 'hide-toasts'],
  },
  [SPECIAL_MODES.BATCH]: {
    label: 'Batch',
    description: 'Automated runs with no interactive prompts',
    icon: '\u2696',
    affects: ['auto-approve', 'no-prompts', 'log-to-file'],
  },
  [SPECIAL_MODES.DAEMON]: {
    label: 'Daemon',
    description: 'Background processing — minimal foreground output',
    icon: '\u273d',
    affects: ['background-mode', 'minimal-foreground', 'daemon-pid'],
  },
  [SPECIAL_MODES.SERVICE]: {
    label: 'Service',
    description: 'Runs as a system service — log to files only',
    icon: '\u2699',
    affects: ['service-mode', 'stdout-logs-disabled', 'syslog'],
  },
});

/** Get the list of available modes for slash command autocomplete. */
export function getModeList() {
  return Object.values(SPECIAL_MODES);
}

/** Get metadata for a mode by name. */
export function getModeMeta(modeName) {
  return MODE_META[modeName] || null;
}

/** Human-readable description of what a mode does. */
export function describeMode(modeName) {
  const meta = getModeMeta(modeName);
  if (!meta) return `Unknown mode: ${modeName}`;
  return `${meta.icon} ${meta.label} — ${meta.description}`;
}
