import { useState } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
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
  const { width: tw } = useTerminalDimensions();
  const termWidth = Math.max(20, (tw || 100) - 4);
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(history.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);

  useKeyboard((key) => {
    if (!isActive) return;
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
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

    if (key.name === 'up') {
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
    if (key.name === 'down') {
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

    if (key.name === 'tab' && menuOpen && currentMatches.length > 0) {
      const nextIdx = (menuIdx + 1) % currentMatches.length;
      setMenuIdx(nextIdx);
      setValue('/' + currentMatches[nextIdx].cmd);
      return;
    }
    
    if (key.name === 'return') {
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
    if (key.name === 'backspace' || key.name === 'delete') {
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
  });

  const matches = menuOpen
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value.slice(1).toLowerCase()))
    : [];

  const displayMatches = matches.slice(0, 6);
  const hasMore = matches.length > 6;

  if (variant === 'welcome') {
    return (
      <box flexDirection="column" width={64}>
        {menuOpen && displayMatches.length > 0 && (
          <box flexDirection="column" borderStyle="round" borderColor={theme.green} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} marginBottom={1}>
            {displayMatches.map((item, i) => {
              const isSelected = i === menuIdx;
              return (
                <box key={item.cmd} paddingLeft={1} paddingRight={1} backgroundColor={isSelected ? theme.green : undefined} flexDirection="row">
                  <text fg={isSelected ? 'black' : theme.text}>{`/${item.cmd}`.padEnd(15, ' ')}</text>
                  <text fg={isSelected ? '#14532d' : theme.dim}>{item.desc.padEnd(45, ' ')}</text>
                </box>
              );
            })}
            {hasMore && <box paddingLeft={1} paddingRight={1}><text fg={theme.dim}>...and {matches.length - 6} more</text></box>}
          </box>
        )}
        <box width="100%" borderStyle="single" borderLeft borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.green}>
        <box flexDirection="column" width={64}>
          <BgBox
            width={64}
            bg={theme.userBg}
            color={theme.text}
            paddingLeft={2} paddingRight={2}
            paddingTop={1} paddingBottom={1}
            lines={[
              value.length === 0 ? 'Ask anything… "build a rest api for orders"' : value,
              '',
              `Build  ${modelLabel}   max`
            ]}
          />
        </box>
      </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%">
      {menuOpen && displayMatches.length > 0 && (
        <box flexDirection="column" borderStyle="round" borderColor={theme.green} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} marginBottom={1}>
          {displayMatches.map((item, i) => {
            const isSelected = i === menuIdx;
            return (
              <box key={item.cmd} paddingLeft={1} paddingRight={1} backgroundColor={isSelected ? theme.green : undefined} flexDirection="row">
                <text fg={isSelected ? 'black' : theme.text}>{`/${item.cmd}`.padEnd(15, ' ')}</text>
                <text fg={isSelected ? '#14532d' : theme.dim}>{item.desc.padEnd(45, ' ')}</text>
              </box>
            );
          })}
          {hasMore && <box paddingLeft={1} paddingRight={1}><text fg={theme.dim}>...and {matches.length - 6} more</text></box>}
        </box>
      )}
      <box flexDirection="row" width="100%">
        <box width={1}><text fg={theme.blue}>{'\u2502'}</text></box>
        <box flexGrow={1}>
          <BgBox
            width={termWidth}
            bg={theme.userBg}
            color={theme.text}
            paddingLeft={3} paddingRight={3}
            paddingTop={1} paddingBottom={1}
            lines={[
              value.length === 0 ? 'Ask anything…  \u00b7  / for commands' : value,
              '',
              `${agentMode}  ${modelLabel}  ${mode}`
            ]}
          />
        </box>
      </box>
    </box>
  );
}
