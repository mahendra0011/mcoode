import { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { theme } from './theme.js';
import { SLASH_COMMANDS } from './InputLine.jsx';

export function CommandPalette({ onRun, onClose }) {
  const { stdout } = useStdout();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const matches = query
    ? SLASH_COMMANDS.filter((c) => c.cmd.includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()))
    : SLASH_COMMANDS;

useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      if (matches[sel]) onRun(matches[sel].cmd);
      return;
    }
    if (key.upArrow) {
      setSel((s) => Math.max(0, s - 1));
      return;
    }
    if (key.downArrow) {
      setSel((s) => Math.min(matches.length - 1, s + 1));
      return;
    }
    if (key.backspace) {
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
  const cols = stdout.columns || 120;
  const rows = stdout.rows || 30;
  const left = Math.max(0, Math.floor((cols - width) / 2));
  const top = Math.max(0, Math.floor((rows - height) / 2));

  return (
    <Box
      position="absolute"
      left={left}
      top={top}
      width={width}
      height={height}
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.blue}
      backgroundColor={theme.panel}
      paddingX={1}
      paddingY={1}
    >
      <Box flexDirection="row">
        <Text bold color={theme.blue}>Commands</Text>
        <Text color={theme.dim}>{'  '}ctrl+p · esc to close</Text>
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Text color={theme.dim}>/</Text>
        <Text color={theme.text}>{query}</Text>
        <Text color={theme.blue}>█</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {matches.slice(0, 10).map((c, i) => (
          <Box key={c.cmd}>
            <Text backgroundColor={i === sel ? theme.blue : undefined}>
              <Text color={i === sel ? '#ffffff' : theme.text}>{`/${c.cmd}`.padEnd(14, ' ')}</Text>
              <Text color={i === sel ? '#dbeafe' : theme.dim}>{c.desc}</Text>
            </Text>
          </Box>
        ))}
        {matches.length === 0 && <Text color={theme.dim}>no matching commands</Text>}
      </Box>
    </Box>
  );
}

