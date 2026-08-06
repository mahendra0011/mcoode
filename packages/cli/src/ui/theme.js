import { themes, THEME_NAMES, getTheme } from './themes.js';

/**
 * Mutable theme proxy. All UI components import this single `theme` object.
 * Calling `setTheme(name)` swaps the underlying color properties in-place,
 * so every component sees the new colors on the next React render.
 *
 * To force a re-render after switching themes, bump `themeVersion` in App.jsx.
 */
const theme = { ...themes.dark };

export { theme, themes, THEME_NAMES, getTheme };

let _currentName = 'dark';

export function setTheme(name) {
  const next = themes[name] || themes.dark;
  _currentName = name;

  // Clear old keys
  for (const key of Object.keys(theme)) {
    delete theme[key];
  }
  // Copy new keys
  for (const key of Object.keys(next)) {
    theme[key] = next[key];
  }
}

export function getThemeName() {
  return _currentName;
}

export default theme;
