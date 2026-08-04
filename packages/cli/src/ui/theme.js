export const theme = {
  bg: '#0a0e0f',
  panel: '#0d1117',
  green: '#3ecf6e',
  greenBright: '#4ade80',
  blue: '#5b9dff',
  purple: '#b18aff',
  amber: '#f5c04a',
  red: '#ff6b6b',
  teal: '#2dd4bf',
  gray: '#6b7280',
  text: '#e5e7eb',
  dim: '#9ca3af'
};

export const DOMAIN_CHALK = {
  planning: theme.purple,
  frontend: theme.blue,
  backend: theme.purple,
  db: theme.amber,
  devops: theme.gray,
  test: theme.teal,
  docs: theme.green,
  bugfix: theme.red
};

export const STATUS_GLYPH = {
  pending: '\u25cb',
  running: '\u25cf',
  done: '\u2713',
  failed: '\u2717',
  needs_review: '\u25b2'
};
