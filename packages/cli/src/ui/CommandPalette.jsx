import { useState } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { SLASH_COMMANDS } from './InputLine.jsx';
import { useEntrance } from './useEntrance.js';

export function CommandPalette({ onRun, onClose }) {
  const { width: tw, height: th } = useTerminalDimensions();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  // Fuzzy match: scores how well query matches a string (chars in order = bonus)
  const fuzzyScore = (str, q) => {
    str = str.toLowerCase();
    let score = 0;
    let lastIdx = -1;
    for (const ch of q) {
      const idx = str.indexOf(ch, lastIdx + 1);
      if (idx === -1) return -1;
      score += idx === lastIdx + 1 ? 10 : 1; // consecutive = bonus
      lastIdx = idx;
    }
    return score + (str.includes(q) ? 50 : 0); // exact substring bonus
  };

  const matches = query
    ? SLASH_COMMANDS
        .map((c) => {
          const nameScore = fuzzyScore(c.cmd, query.toLowerCase());
          const descScore = fuzzyScore(c.desc, query.toLowerCase());
          return { c, score: Math.max(nameScore, descScore) };
        })
        .filter((m) => m.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map((m) => m.c)
    : SLASH_COMMANDS;

  useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
    if (key.name === 'escape') {
      onClose();
      return;
    }
    if (key.name === 'return') {
      if (matches[sel]) onRun(matches[sel].cmd);
      return;
    }
    if (key.name === 'up') {
      setSel((s) => Math.max(0, s - 1));
      return;
    }
    if (key.name === 'down') {
      setSel((s) => Math.min(matches.length - 1, s + 1));
      return;
    }
    if (key.name === 'backspace') {
      setQuery((q) => q.slice(0, -1));
      setSel(0);
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setQuery((q) => q + input);
      setSel(0);
    }
  });

  const width = 56;
  const height = 16;
  const cols = tw || 120;
  const rows = th || 30;
  const left = Math.max(0, Math.floor((cols - width) / 2));
  const top = Math.max(0, Math.floor((rows - height) / 2));
  
  const visibleResults = useEntrance(Math.min(10, matches.length), 0.5, query); // ~40ms per line

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={width}
      height={height}
      flexDirection="column"
      borderStyle="round"
      border
      borderColor={theme.accent}
      backgroundColor={theme.panel}
      paddingLeft={SPACING.sm} paddingRight={SPACING.sm}
      paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
    >
      {/* ── Header ──────────────── */}
      <box flexDirection="row">
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>{'\u25c6'} Commands</text>
        <text fg={theme.muted}>{'  \u2502  '}</text>
        <text fg={theme.dim}>ctrl+p</text>
        <text fg={theme.muted}> {'\u00b7'} </text>
        <text fg={theme.dim}>esc to close</text>
      </box>

      {/* ── Search input ─────────── */}
      <box marginTop={SPACING.sm} flexDirection="row" backgroundColor={theme.surface} paddingLeft={SPACING.sm} paddingRight={SPACING.sm}>
        <text fg={theme.accent}>{'\u25b8'} /</text>
        <text fg={theme.textBright}>{query}</text>
        <text fg={theme.accent}>{'\u2588'}</text>
      </box>

      {/* ── Results ──────────────── */}
      <box flexDirection="column" marginTop={SPACING.sm}>
        {matches.slice(0, visibleResults).map((c, i) => (
          <box key={c.cmd} backgroundColor={i === sel ? theme.accent : undefined} flexDirection="row" paddingLeft={SPACING.sm} paddingRight={SPACING.sm}>
            <text fg={i === sel ? '#000000' : theme.text} attributes={i === sel ? TextAttributes.BOLD : 0}>{`/${c.cmd}`.padEnd(14, ' ')}</text>
            <text fg={i === sel ? '#1e3a5f' : theme.dim}>{c.desc}</text>
          </box>
        ))}
        {matches.length === 0 && <text fg={theme.muted}>  no matching commands</text>}
      </box>

      {/* ── Footer hint ──────────── */}
      {matches.length > 10 && (
        <box marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
          <text fg={theme.muted}>{'\u2026'} {matches.length - 10} more results</text>
        </box>
      )}
    </box>
  );
}
