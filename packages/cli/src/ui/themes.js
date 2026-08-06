/** Theme definitions for mcode.
 * Each theme is a flat object of color tokens consumed by UI components via the
 * imported `theme` proxy from `theme.js`. */

export const themes = {
  dark: {
    // ── Backgrounds ─────────────────────
    bg: '#0a0a0a',
    panel: '#141414',
    userBg: '#1a1b22',
    surface: '#1a1b22',
    surfaceHover: '#23242b',
    divider: '#3c3c3c',

    // ── Accent / Brand ──────────────────
    accent: '#4ADE80',
    accentDim: '#2a5a3a',

    // ── Semantic ──────────────────────
    green: '#4ADE80',
    greenBright: '#4ADE80',
    blue: '#5c9cf5',
    purple: '#9d7cd8',
    amber: '#f5a742',
    orange: '#f5a742',
    red: '#e06c75',
    teal: '#56b6c2',

    // ── Text ──────────────────────────
    text: '#eeeeee',
    textBright: '#ffffff',
    dim: '#808080',
    meta: '#808080',
    gray: '#7a7d85',
    muted: '#52555e',

    // ── Diff ──────────────────────────
    diffRed: '#e06c75',
    diffRedBg: '#3a1f24',
    diffGreen: '#5fb87a',
    diffGreenBg: '#1f3a24',

    // ── UI Characters ─────────────────
    circle: '\u25cf',
    latency: '#808080',
  },

  light: {
    // ── Backgrounds ─────────────────────
    bg: '#fafafa',
    panel: '#f0f0f0',
    userBg: '#f5f5f5',
    surface: '#f5f5f5',
    surfaceHover: '#e8e8e8',
    divider: '#d0d0d0',

    // ── Accent / Brand ──────────────────
    accent: '#16a34a',
    accentDim: '#dcfce7',

    // ── Semantic ──────────────────────
    green: '#16a34a',
    greenBright: '#16a34a',
    blue: '#2563eb',
    purple: '#7c3aed',
    amber: '#ea580c',
    orange: '#ea580c',
    red: '#dc2626',
    teal: '#0d9488',

    // ── Text ──────────────────────────
    text: '#1a1a1a',
    textBright: '#000000',
    dim: '#666666',
    meta: '#666666',
    gray: '#888888',
    muted: '#888888',

    // ── Diff ──────────────────────────
    diffRed: '#dc2626',
    diffRedBg: '#fee2e2',
    diffGreen: '#16a34a',
    diffGreenBg: '#dcfce7',

    // ── UI Characters ─────────────────
    circle: '\u25cf',
    latency: '#666666',
  },

  // OpenCode-inspired dark theme
  opencode: {
    // ── Backgrounds ─────────────────────
    bg: '#09090b',
    panel: '#111114',
    userBg: '#18181c',
    surface: '#18181c',
    surfaceHover: '#1f1f25',
    divider: '#27272f',

    // ── Accent / Brand ──────────────────
    accent: '#86efac',
    accentDim: '#1a4020',

    // ── Semantic ──────────────────────
    green: '#86efac',
    greenBright: '#86efac',
    blue: '#93c5fd',
    purple: '#c084fc',
    amber: '#fbbf24',
    orange: '#fbbf24',
    red: '#fca5a5',
    teal: '#5eead4',

    // ── Text ──────────────────────────
    text: '#e4e4e7',
    textBright: '#fafafa',
    dim: '#52525b',
    meta: '#52525b',
    gray: '#71717a',
    muted: '#3f3f4a',

    // ── Diff ──────────────────────────
    diffRed: '#fca5a5',
    diffRedBg: '#450a0a',
    diffGreen: '#86efac',
    diffGreenBg: '#142d1a',

    // ── UI Characters ─────────────────
    circle: '\u25cf',
    latency: '#52525b',
  },
};

export const THEME_NAMES = Object.keys(themes);

export function getTheme(name) {
  return themes[name] || themes.dark;
}

export default themes.dark;

/** Color scheme variants — accent color palettes that can be mixed with any theme. */
export const COLOR_SCHEMES = {
  default: { accent: '#4ADE80', blue: '#5c9cf5', purple: '#9d7cd8', amber: '#f5a742' },
  blue: { accent: '#5c9cf5', blue: '#5c9cf5', purple: '#c084fc', amber: '#fbbf24' },
  purple: { accent: '#c084fc', blue: '#93c5fd', purple: '#c084fc', amber: '#fcd34d' },
  amber: { accent: '#fbbf24', blue: '#5c9cf5', purple: '#9d7cd8', amber: '#fbbf24' },
  red: { accent: '#e06c75', blue: '#5c9cf5', purple: '#9d7cd8', amber: '#f5a742' },
  teal: { accent: '#56b6c2', blue: '#56b6c2', purple: '#9d7cd8', amber: '#f5a742' },
  mono: { accent: '#aaaaaa', blue: '#999999', purple: '#aaaaaa', amber: '#cccccc' },
};

export const COLOR_SCHEME_NAMES = Object.keys(COLOR_SCHEMES);

/** Get merged theme+scheme colors for a given theme name and color scheme.
 * Returns a copy of the theme with the scheme colors overlaid.
 */
export function getThemedColors(themeName, schemeName) {
  const theme = themes[themeName] || themes.dark;
  const scheme = COLOR_SCHEMES[schemeName];
  if (!scheme) return { ...theme };
  return { ...theme, ...scheme };
}

/** Icon sets — different visual styles for UI glyphs and icons. */
export const ICON_SETS = {
  unicode: {
    check: '\u2713',
    cross: '\u2717',
    circle: '\u25cf',
    warning: '\u26a0',
    info: '\u2139',
    success: '\u2705',
    error: '\u274c',
    arrow: '\u25b8',
    spinner: ['\u2024', '\u00b7', '\u2024', '\u00b7'],
    expandMore: '\u25bc',
    expandLess: '\u25b2',
  },
  ascii: {
    check: '[ok]',
    cross: '[x]',
    circle: '[o]',
    warning: '[!]',
    info: '[i]',
    success: '[+]',
    error: '[-]',
    arrow: '>',
    spinner: ['|', '/', '-', '\\'],
    expandMore: 'v',
    expandLess: '^',
  },
  nerd: {
    check: '\uf00c',
    cross: '\uf00d',
    circle: '\uf111',
    warning: '\uf071',
    info: '\uf05a',
    success: '\uf00c',
    error: '\uf00d',
    arrow: '\uf0da',
    spinner: ['\uf1ce', '\uf1d0', '\uf1da', '\uf1d1'],
    expandMore: '\uf078',
    expandLess: '\uf077',
  },
};

export const ICON_SET_NAMES = Object.keys(ICON_SETS);

export function getIcons(name) {
  return ICON_SETS[name] || ICON_SETS.unicode;
}

/** Font size presets — scale factors applied to terminal text. */
export const FONT_SIZES = {
  compact: { scale: 0.85, lineHeight: 1 },
  normal: { scale: 1.0, lineHeight: 1 },
  large: { scale: 1.25, lineHeight: 1.3 },
  xlarge: { scale: 1.5, lineHeight: 1.5 },
};

export const FONT_SIZE_NAMES = Object.keys(FONT_SIZES);

/** Layout presets — spacing and component arrangement preferences. */
export const LAYOUT_PRESETS = {
  compact: { padding: 0, compact: true, denseLists: true, thinDividers: true },
  balanced: { padding: 1, compact: false, denseLists: false, thinDividers: false },
  spacious: { padding: 2, compact: false, denseLists: false, thinDividers: false, extraSpacing: true },
};

export const LAYOUT_PRESET_NAMES = Object.keys(LAYOUT_PRESETS);

/** Custom CSS injection — for users who want to override specific styles. */
export const CUSTOM_CSS = { custom: '' };
