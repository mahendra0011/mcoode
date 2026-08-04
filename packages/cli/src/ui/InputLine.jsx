import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

const SLASH_COMMANDS = [
  'god', 'bugfix', 'watch', 'agents', 'model', 'plan',
  'diff', 'undo', 'clear', 'help', 'exit', 'init'
];

export function InputLine({ onSubmit, history }) {
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(history.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setHistIdx((i) => Math.max(0, i - 1));
      if (history[histIdx - 1] !== undefined) setValue(history[histIdx - 1]);
      return;
    }
    if (key.downArrow) {
      setHistIdx((i) => Math.min(history.length, i + 1));
      setValue(history[histIdx + 1] || '');
      return;
    }
    if (key.tab && menuOpen) {
      const cmd = SLASH_COMMANDS[(menuIdx + 1) % SLASH_COMMANDS.length];
      setMenuIdx((menuIdx + 1) % SLASH_COMMANDS.length);
      setValue(cmd);
      return;
    }
    if (key.return) {
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      const submitted = value.trim();
      setValue('');
      setHistIdx(history.length + 1);
      if (submitted) onSubmit(submitted);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      setMenuOpen(value.startsWith('/') && value.length > 1);
      return;
    }
    if (input) {
      const next = value + input;
      setValue(next);
      setMenuOpen(next.startsWith('/'));
      setMenuIdx(0);
    }
  });

  const matches = menuOpen
    ? SLASH_COMMANDS.filter((c) => c.startsWith(value.slice(1).toLowerCase()))
    : [];

  return (
    <Box flexDirection="column" width="100%">
      {menuOpen && matches.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor="#1f2937" paddingX={1} marginBottom={1}>
          {matches.map((cmd, i) => (
            <Text key={cmd} color={i === 0 ? theme.greenBright : theme.dim}>
              {i === 0 ? '\u25b8' : ' '} /{cmd}
            </Text>
          ))}
        </Box>
      )}
      <Box borderStyle="round" borderColor="#1f2937" width="100%" paddingX={1}>
        <Text color={theme.greenBright}>{'>'} </Text>
        <Text color={theme.text}>{value}</Text>
        <Text color={theme.greenBright}>\u258c</Text>
      </Box>
    </Box>
  );
}
