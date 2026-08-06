import { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { theme } from './theme.js';
import { BgBox } from './BgBox.jsx';

const SLASH_COMMANDS = [
  { cmd: 'agents', desc: 'Switch agent' },
  { cmd: 'connect', desc: 'Connect provider' },
  { cmd: 'debug', desc: 'View debug info' },
  { cmd: 'diff', desc: 'Open diff viewer' },
  { cmd: 'editor', desc: 'Open editor' },
  { cmd: 'exit', desc: 'Exit the app' },
  { cmd: 'help', desc: 'Help' },
  { cmd: 'init', desc: 'guided AGENTS.md setup' },
  { cmd: 'mcps', desc: 'Toggle MCPs' },
  { cmd: 'models', desc: 'Switch model' },
  { cmd: 'mode', desc: 'Reasoning level (low/medium/high/extra/max/god)' },
  { cmd: 'agent', desc: 'Toggle agent mode (read/edit/run in chat)' },
  { cmd: 'god', desc: 'Plan and build' },
  { cmd: 'bugfix', desc: 'Start bugfix daemon' },
  { cmd: 'watch', desc: 'Start watch daemon' },
  { cmd: 'plan', desc: 'View plan' },
  { cmd: 'undo', desc: 'Revert changes' },
  { cmd: 'clear', desc: 'Clear chat' }
].sort((a, b) => a.cmd.localeCompare(b.cmd));

export { SLASH_COMMANDS };

export function InputLine({ onSubmit, history, variant = 'default', modelLabel = 'auto', agentMode = 'Build', mode = 'medium', isActive = true, canRetry = false, onRetry = null, pendingPermission = null, onPermission = null }) {
  const { stdout } = useStdout();
  const termWidth = Math.max(20, (stdout.columns || 100) - 4);
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(history.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);

  useInput((input, key) => {
    const currentMatches = menuOpen 
      ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value.slice(1).toLowerCase()))
      : [];

    if (pendingPermission && value.length === 0 && (input === 'y' || input === 'n' || input === 'a')) {
      onPermission?.(pendingPermission.requestId, input === 'y' ? 'yes' : input === 'a' ? 'always' : 'no');
      return;
    }

    if (canRetry && value.length === 0 && input === 'r') {
      onRetry?.();
      return;
    }

    if (key.upArrow) {
      if (menuOpen && currentMatches.length > 0) {
        const nextIdx = (menuIdx - 1 + currentMatches.length) % currentMatches.length;
        setMenuIdx(nextIdx);
        setValue('/' + currentMatches[nextIdx].cmd);
        return;
      }
      setHistIdx((i) => Math.max(0, i - 1));
      if (history[histIdx - 1] !== undefined) setValue(history[histIdx - 1]);
      return;
    }
    if (key.downArrow) {
      if (menuOpen && currentMatches.length > 0) {
        const nextIdx = (menuIdx + 1) % currentMatches.length;
        setMenuIdx(nextIdx);
        setValue('/' + currentMatches[nextIdx].cmd);
        return;
      }
      setHistIdx((i) => Math.min(history.length, i + 1));
      setValue(history[histIdx + 1] || '');
      return;
    }

    if (key.tab && menuOpen && currentMatches.length > 0) {
      const nextIdx = (menuIdx + 1) % currentMatches.length;
      setMenuIdx(nextIdx);
      setValue('/' + currentMatches[nextIdx].cmd);
      return;
    }
    
    if (key.return) {
      if (key.shift) {
        setValue((v) => v + '\n');
        return;
      }
      if (menuOpen && currentMatches.length > 0 && currentMatches[menuIdx]) {
        // If they press enter while menu is open, auto-complete and submit
        const submitted = ('/' + currentMatches[menuIdx].cmd).trim();
        setValue('');
        setMenuOpen(false);
        setHistIdx(history.length + 1);
        onSubmit(submitted);
        return;
      }
      
      const submitted = value.trim();
      setValue('');
      setHistIdx(history.length + 1);
      setMenuOpen(false);
      if (submitted) onSubmit(submitted);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      setMenuOpen(value.startsWith('/') && value.length > 1);
      setMenuIdx(0);
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      if (!menuOpen && value.length === 0 && input === '/') {
        setMenuOpen(true);
        setMenuIdx(0);
      }
      const next = value + input;
      setValue(next);
      setMenuOpen(next.startsWith('/'));
      setMenuIdx(0);
    }
  }, { isActive });

  const matches = menuOpen
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value.slice(1).toLowerCase()))
    : [];

  const displayMatches = matches.slice(0, 6);
  const hasMore = matches.length > 6;

  if (variant === 'welcome') {
    return (
      <Box flexDirection="column" width={64}>
        {menuOpen && displayMatches.length > 0 && (
          <Box flexDirection="column" borderStyle="round" borderColor={theme.green} paddingX={0} paddingY={0} marginBottom={1}>
            {displayMatches.map((item, i) => {
              const isSelected = i === menuIdx;
              return (
                <Box key={item.cmd} paddingX={1}>
                  <Text backgroundColor={isSelected ? theme.green : undefined}>
                    <Text color={isSelected ? 'black' : theme.text}>{`/${item.cmd}`.padEnd(15, ' ')}</Text>
                    <Text color={isSelected ? '#14532d' : theme.dim}>{item.desc.padEnd(45, ' ')}</Text>
                  </Text>
                </Box>
              );
            })}
            {hasMore && <Box paddingX={1}><Text color={theme.dim}>...and {matches.length - 6} more</Text></Box>}
          </Box>
        )}
        <Box width="100%" borderStyle="single" borderLeft borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.green}>
        <Box flexDirection="column" width={64}>
          <BgBox
            width={64}
            bg={theme.userBg}
            color={theme.text}
            paddingX={2}
            paddingY={1}
            lines={[
              value.length === 0 ? 'Ask anything… "build a rest api for orders"' : value,
              '',
              `Build  ${modelLabel}   max`
            ]}
          />
        </Box>
      </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      {menuOpen && displayMatches.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.green} paddingX={0} paddingY={0} marginBottom={1}>
          {displayMatches.map((item, i) => {
            const isSelected = i === menuIdx;
            return (
              <Box key={item.cmd} paddingX={1}>
                <Text backgroundColor={isSelected ? theme.green : undefined}>
                  <Text color={isSelected ? 'black' : theme.text}>{`/${item.cmd}`.padEnd(15, ' ')}</Text>
                  <Text color={isSelected ? '#14532d' : theme.dim}>{item.desc.padEnd(45, ' ')}</Text>
                </Text>
              </Box>
            );
          })}
          {hasMore && <Box paddingX={1}><Text color={theme.dim}>...and {matches.length - 6} more</Text></Box>}
        </Box>
      )}
      <Box flexDirection="row" width="100%">
        <Box width={1}><Text color={theme.blue}>{'\u2502'}</Text></Box>
        <Box flexGrow={1}>
          <BgBox
            width={termWidth}
            bg={theme.userBg}
            color={theme.text}
            paddingX={3}
            paddingY={1}
            lines={[
              value.length === 0 ? 'Ask anything…  \u00b7  / for commands' : value,
              '',
              `${agentMode}  ${modelLabel}  ${mode}`
            ]}
          />
        </Box>
      </Box>
    </Box>
  );
}
