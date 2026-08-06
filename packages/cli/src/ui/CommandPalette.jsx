import { useState } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';
import { SLASH_COMMANDS } from './InputLine.jsx';

export function CommandPalette({ onRun, onClose }) {
  const { width: tw, height: th } = useTerminalDimensions();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const matches = query
    ? SLASH_COMMANDS.filter((c) => c.cmd.includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()))
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

  const width = 52;
  const height = 14;
  const cols = tw || 120;
  const rows = th || 30;
  const left = Math.max(0, Math.floor((cols - width) / 2));
  const top = Math.max(0, Math.floor((rows - height) / 2));

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={width}
      height={height}
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.blue}
      backgroundColor={theme.panel}
      paddingLeft={1} paddingRight={1}
      paddingTop={1} paddingBottom={1}
    >
      <box flexDirection="row">
        <text fg={theme.blue} attributes={TextAttributes.BOLD}>Commands</text>
        <text fg={theme.dim}>{'  '}ctrl+p · esc to close</text>
      </box>
      <box marginTop={1} flexDirection="row">
        <text fg={theme.dim}>/</text>
        <text fg={theme.text}>{query}</text>
        <text fg={theme.blue}>█</text>
      </box>
      <box flexDirection="column" marginTop={1}>
        {matches.slice(0, 10).map((c, i) => (
          <box key={c.cmd} backgroundColor={i === sel ? theme.blue : undefined} flexDirection="row">
            <text fg={i === sel ? '#ffffff' : theme.text}>{`/${c.cmd}`.padEnd(14, ' ')}</text>
            <text fg={i === sel ? '#dbeafe' : theme.dim}>{c.desc}</text>
          </box>
        ))}
        {matches.length === 0 && <text fg={theme.dim}>no matching commands</text>}
      </box>
    </box>
  );
}

