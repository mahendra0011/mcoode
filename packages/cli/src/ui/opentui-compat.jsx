/**
 * OpenTUI compatibility layer.
 *
 * Bridges Ink’s API surface to OpenTUI React so that existing JSX components
 * keep working with minimal changes.  Ink is completely removed – these
 * helpers translate props and events into OpenTUI equivalents.
 *
 * Key mappings:
 *   <Text color={c}>  →  <text fg={c}>        (via Text wrapper)
 *   <Text bold>       →  attributes={BOLD}    (via Text wrapper)
 *   useInput(cb, opt) →  useKeyboard(e)       (via useInput hook)
 *   key.upArrow       →  e.name === 'up'      (via useInput hook)
 *   render(<App/>)    →  createRoot(r).render (handled in repl.js)
 */
import { useState, useEffect, useRef } from 'react';
import { useKeyboard, useRenderer, useTerminalDimensions, useOnResize, useAppContext } from '@opentui/react';
import { TextAttributes } from '@opentui/core';

// ── Text wrapper: Ink-style props → OpenTUI <text> ──────────────────────────

const INK_ATTR_MAP = {
  bold: TextAttributes.BOLD,
  italic: TextAttributes.ITALIC,
  underline: TextAttributes.UNDERLINE,
  dim: TextAttributes.DIM,
  blink: TextAttributes.BLINK,
  inverse: TextAttributes.INVERSE,
  strikethrough: TextAttributes.STRIKETHROUGH,
};

/**
 * Drop-in replacement for Ink's <Text> that accepts the same colour / weight
 * props and forwards them to OpenTUI's <text> element.
 */
export function Text({ color, bg, backgroundColor, attributes, bold, italic, underline, dim, blink, inverse, strikethrough, children, ...rest }) {
  let attrs = attributes || 0;
  for (const [key, bit] of Object.entries(INK_ATTR_MAP)) {
    if ({ bold, italic, underline, dim, blink, inverse, strikethrough }[key]) attrs |= bit;
  }
  delete rest.bold; delete rest.italic; delete rest.underline; delete rest.dim;
  delete rest.blink; delete rest.inverse; delete rest.strikethrough;

  const props = { ...rest };
  if (color) props.fg = color;
  if (bg) props.bg = bg;
  if (backgroundColor) props.bg = backgroundColor;
  if (attrs) props.attributes = attrs;
  if (children !== undefined) props.children = children;

  return <text {...props} />;
}

// ── Spinner: replaces ink-spinner ───────────────────────────────────────────

export function Spinner({ label = 'working', interval = 90 }) {
  const FRAMES = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2823', '\u280f'];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), interval);
    return () => clearInterval(id);
  }, [interval]);
  return <Text color="#f5a742">{FRAMES[frame]} {label}</Text>;
}

// ── useInput: Ink-style input hook → OpenTUI useKeyboard ────────────────────

const KEY_ALIASES = {
  up: 'upArrow', down: 'downArrow', left: 'leftArrow', right: 'rightArrow',
  pageup: 'pageUp', pagedown: 'pageDown', backspace: 'backspace',
  delete: 'delete', escape: 'escape', tab: 'tab', home: 'home',
  end: 'end', return: 'return', linefeed: 'return', insert: 'insert',
  clear: 'clear',
};

export function useInput(handler, options = {}) {
  const { isActive = true } = options;
  useKeyboard((e) => {
    if (!isActive) return;

    const key = {
      name: e.name,
      ctrl: e.ctrl,
      meta: e.meta,
      shift: e.shift,
      option: e.option,
      upArrow: e.name === 'up',
      downArrow: e.name === 'down',
      leftArrow: e.name === 'left',
      rightArrow: e.name === 'right',
      pageUp: e.name === 'pageup',
      pageDown: e.name === 'pagedown',
      return: e.name === 'return' || e.name === 'linefeed',
      backspace: e.name === 'backspace',
      delete: e.name === 'delete',
      escape: e.name === 'escape',
      tab: e.name === 'tab',
      home: e.name === 'home',
      end: e.name === 'end',
      insert: e.name === 'insert',
      [KEY_ALIASES[e.name]]: true,
    };

    let input = '';
    if (e.name === 'space') input = ' ';
    else if (e.name && e.name.length === 1 && !e.ctrl && !e.meta) input = e.name;

    handler(input, key);
  });
}

// ── useApp: minimal stand-in for Ink's useApp().exit() ─────────────────────

export function useApp() {
  const { renderer } = useAppContext();
  return {
    exit: () => {
      renderer?.destroy?.();
      process.exit(0);
    },
  };
}

// ── useStdout: Ink-style stdout proxy ───────────────────────────────────────
// Provides columns/rows + on('resize') so existing code works unchanged.

export function useStdout() {
  const dims = useTerminalDimensions();
  const emitterRef = useRef(null);
  if (!emitterRef.current) emitterRef.current = new (require('node:events').EventEmitter)();
  const emitter = emitterRef.current;

  const stdoutRef = useRef(null);
  if (!stdoutRef.current) {
    stdoutRef.current = {
      columns: 80,
      rows: 24,
      isTTY: true,
      on: (event, cb) => emitter.on(event, cb),
      off: (event, cb) => emitter.off(event, cb),
      write: data => process.stdout.write(data),
    };
  }
  // Keep dimensions in sync (updated during render)
  stdoutRef.current.columns = dims.width || 80;
  stdoutRef.current.rows = dims.height || 24;

  useOnResize((width, height) => {
    stdoutRef.current.columns = width;
    stdoutRef.current.rows = height;
    emitter.emit('resize');
  });

  return { stdout: stdoutRef.current };
}

export { TextAttributes };
