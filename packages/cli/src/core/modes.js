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

/** Metadata for each mode — display name and description. */
export const MODE_META = Object.freeze({
  [SPECIAL_MODES.LEARNING]: {
    label: 'Learning',
    description: 'Step-by-step walkthrough with explanations',
    icon: '📖',
    affects: ['narration', 'verbosity'],
  },
  [SPECIAL_MODES.COMPETITION]: {
    label: 'Competition',
    description: 'Time trials — race against the clock',
    icon: '\u23f1',
    affects: ['timer', 'score'],
  },
  [SPECIAL_MODES.ZEN]: {
    label: 'Zen',
    description: 'Minimal UI — just the essentials',
    icon: '🧘',
    affects: ['ui', 'notifications'],
  },
  [SPECIAL_MODES.FOCUS]: {
    label: 'Focus',
    description: 'Hide distractions, show only the task',
    icon: '🔒',
    affects: ['ui', 'panels'],
  },
  [SPECIAL_MODES.PRESENTATION]: {
    label: 'Presentation',
    description: 'Large text, clean layout for demos',
    icon: '📽',
    affects: ['fontSize', 'layout'],
  },
  [SPECIAL_MODES.DEBUG]: {
    label: 'Debug',
    description: 'Verbose output and event inspector',
    icon: '🐛',
    affects: ['logging', 'events'],
  },
  [SPECIAL_MODES.SILENT]: {
    label: 'Silent',
    description: 'Minimal output — only errors shown',
    icon: '🔕',
    affects: ['output', 'verbosity'],
  },
  [SPECIAL_MODES.BATCH]: {
    label: 'Batch',
    description: 'Automated runs with no interactive prompts',
    icon: '\u2696',
    affects: ['prompts', 'watch'],
  },
  [SPECIAL_MODES.DAEMON]: {
    label: 'Daemon',
    description: 'Background processing — minimal foreground output',
    icon: '\u273d',
    affects: ['background', 'output'],
  },
  [SPECIAL_MODES.SERVICE]: {
    label: 'Service',
    description: 'Runs as a system service — log to files only',
    icon: '\u2699',
    affects: ['logging', 'service'],
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
