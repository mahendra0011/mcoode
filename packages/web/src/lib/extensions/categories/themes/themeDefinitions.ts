/**
 * Accurate Monaco Editor theme definitions for popular themes.
 */

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export const themes: Record<string, MonacoThemeData> = {
  'one-dark-pro': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editorCursor.foreground': '#528bff',
      'editor.lineHighlightBackground': '#2c313a',
      'editorLineNumber.foreground': '#4b5263',
      'editor.selectionBackground': '#3e4451',
    },
  },

  'dracula': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'bd93f9' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorCursor.foreground': '#f8f8f0',
      'editor.lineHighlightBackground': '#44475a55',
      'editorLineNumber.foreground': '#6272a4',
      'editor.selectionBackground': '#44475a',
    },
  },

  'tokyo-night': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'bb9af7' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'type', foreground: '2ac3de' },
      { token: 'function', foreground: '7aa2f7' },
      { token: 'variable', foreground: 'c0caf5' },
    ],
    colors: {
      'editor.background': '#1a1b26',
      'editor.foreground': '#a9b1d6',
      'editorCursor.foreground': '#c0caf5',
      'editor.lineHighlightBackground': '#24283b',
      'editorLineNumber.foreground': '#363b54',
      'editor.selectionBackground': '#283457',
    },
  },

  'catppuccin-mocha': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cba6f7' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'number', foreground: 'fab387' },
      { token: 'type', foreground: 'f9e2af' },
      { token: 'function', foreground: '89b4fa' },
      { token: 'variable', foreground: 'cdd6f4' },
    ],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'editorCursor.foreground': '#f5e0dc',
      'editor.lineHighlightBackground': '#313244',
      'editorLineNumber.foreground': '#585b70',
      'editor.selectionBackground': '#45475a',
    },
  },

  'catppuccin-latte': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9ca0b0', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8839ef' },
      { token: 'string', foreground: '40a02b' },
      { token: 'number', foreground: 'fe640b' },
      { token: 'type', foreground: 'df8e1d' },
      { token: 'function', foreground: '1e66f5' },
      { token: 'variable', foreground: '4c4f69' },
    ],
    colors: {
      'editor.background': '#eff1f5',
      'editor.foreground': '#4c4f69',
      'editorCursor.foreground': '#dc8a78',
      'editor.lineHighlightBackground': '#e6e9ef',
      'editorLineNumber.foreground': '#9ca0b0',
      'editor.selectionBackground': '#ccd0da',
    },
  },

  'github-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'c9d1d9' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorCursor.foreground': '#58a6ff',
      'editor.lineHighlightBackground': '#161b22',
      'editorLineNumber.foreground': '#6e7681',
      'editor.selectionBackground': '#1f6feb44',
    },
  },

  'github-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e' },
      { token: 'string', foreground: '0a3069' },
      { token: 'number', foreground: '0550ae' },
      { token: 'type', foreground: '953800' },
      { token: 'function', foreground: '8250df' },
      { token: 'variable', foreground: '24292f' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'editorCursor.foreground': '#0969da',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorLineNumber.foreground': '#8c959f',
      'editor.selectionBackground': '#b6e3ff',
    },
  },

  'night-owl': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '637777', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'ecc48d' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'type', foreground: 'addb67' },
      { token: 'function', foreground: '82aaff' },
      { token: 'variable', foreground: 'd6deeb' },
    ],
    colors: {
      'editor.background': '#011627',
      'editor.foreground': '#d6deeb',
      'editorCursor.foreground': '#80a4c2',
      'editor.lineHighlightBackground': '#00101d',
      'editorLineNumber.foreground': '#4b6479',
      'editor.selectionBackground': '#1d3b53',
    },
  },

  'monokai-pro': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '727072', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff6188' },
      { token: 'string', foreground: 'ffd866' },
      { token: 'number', foreground: 'ab9df2' },
      { token: 'type', foreground: '78dce8' },
      { token: 'function', foreground: 'a9dc76' },
      { token: 'variable', foreground: 'fcfcfa' },
    ],
    colors: {
      'editor.background': '#2d2a2e',
      'editor.foreground': '#fcfcfa',
      'editorCursor.foreground': '#ffd866',
      'editor.lineHighlightBackground': '#3a373b',
      'editorLineNumber.foreground': '#727072',
      'editor.selectionBackground': '#403e41',
    },
  },

  'nord': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4c566a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editorCursor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editorLineNumber.foreground': '#4c566a',
      'editor.selectionBackground': '#434c5e',
    },
  },

  'synthwave-84': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '614d85', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fede5d' },
      { token: 'string', foreground: 'ff7edb' },
      { token: 'number', foreground: 'fe4450' },
      { token: 'type', foreground: 'fe4450' },
      { token: 'function', foreground: '36f9f6' },
      { token: 'variable', foreground: 'f92aad' },
    ],
    colors: {
      'editor.background': '#262335',
      'editor.foreground': '#f92aad',
      'editorCursor.foreground': '#ff7edb',
      'editor.lineHighlightBackground': '#2c2540',
      'editorLineNumber.foreground': '#614d85',
      'editor.selectionBackground': '#463465',
    },
  },

  'ayu-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6773', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff8f40' },
      { token: 'string', foreground: 'aad94c' },
      { token: 'number', foreground: 'd2a6ff' },
      { token: 'type', foreground: '59c2ff' },
      { token: 'function', foreground: 'ffb454' },
      { token: 'variable', foreground: 'e6e1cf' },
    ],
    colors: {
      'editor.background': '#0f141c',
      'editor.foreground': '#e6e1cf',
      'editorCursor.foreground': '#e6b450',
      'editor.lineHighlightBackground': '#151b24',
      'editorLineNumber.foreground': '#3e4b59',
      'editor.selectionBackground': '#273747',
    },
  },

  'cobalt2': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '0088ff', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff9d00' },
      { token: 'string', foreground: '3ad900' },
      { token: 'number', foreground: 'ff628c' },
      { token: 'type', foreground: '80ffbb' },
      { token: 'function', foreground: 'ffc600' },
      { token: 'variable', foreground: 'ffffff' },
    ],
    colors: {
      'editor.background': '#193549',
      'editor.foreground': '#ffffff',
      'editorCursor.foreground': '#ffc600',
      'editor.lineHighlightBackground': '#1f4662',
      'editorLineNumber.foreground': '#0088ff',
      'editor.selectionBackground': '#0050a0',
    },
  },

  'gruvbox-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fb4934' },
      { token: 'string', foreground: 'b8bb26' },
      { token: 'number', foreground: 'd3869b' },
      { token: 'type', foreground: 'fabd2f' },
      { token: 'function', foreground: '8ec07c' },
      { token: 'variable', foreground: 'ebdbb2' },
    ],
    colors: {
      'editor.background': '#282828',
      'editor.foreground': '#ebdbb2',
      'editorCursor.foreground': '#ebdbb2',
      'editor.lineHighlightBackground': '#3c3836',
      'editorLineNumber.foreground': '#7c6f64',
      'editor.selectionBackground': '#504945',
    },
  },

  'rose-pine': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e6a86', fontStyle: 'italic' },
      { token: 'keyword', foreground: '31748f' },
      { token: 'string', foreground: 'ebbcba' },
      { token: 'number', foreground: '9ccfd8' },
      { token: 'type', foreground: 'c4a7e7' },
      { token: 'function', foreground: 'eb6f92' },
      { token: 'variable', foreground: 'e0def4' },
    ],
    colors: {
      'editor.background': '#191724',
      'editor.foreground': '#e0def4',
      'editorCursor.foreground': '#56526e',
      'editor.lineHighlightBackground': '#211f30',
      'editorLineNumber.foreground': '#524f67',
      'editor.selectionBackground': '#2a283e',
    },
  },

  'shades-of-purple': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'b362ff', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff9d00' },
      { token: 'string', foreground: 'a5ff90' },
      { token: 'number', foreground: 'ff628c' },
      { token: 'type', foreground: '9effff' },
      { token: 'function', foreground: 'fad000' },
      { token: 'variable', foreground: 'ffffff' },
    ],
    colors: {
      'editor.background': '#2d2b55',
      'editor.foreground': '#ffffff',
      'editorCursor.foreground': '#fad000',
      'editor.lineHighlightBackground': '#1e1e3f',
      'editorLineNumber.foreground': '#a599e9',
      'editor.selectionBackground': '#b362ff44',
    },
  }
};
