import { useEffect, useRef, useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';

const SLASH_COMMANDS = [
  { cmd: 'agents', desc: 'List active subagents' },
  { cmd: 'connect', desc: 'Connect provider' },
  { cmd: 'debug', desc: 'Toggle event inspector panel' },
  { cmd: 'theme', desc: 'Cycle color theme' },
  { cmd: 'scheme', desc: 'Set color scheme (default/blue/purple/amber/red/teal/mono)' },
  { cmd: 'customize', desc: 'Customize icons, font, layout' },
  { cmd: 'diff', desc: 'Show pending changes' },
  { cmd: 'exit', desc: 'Exit the app' },
  { cmd: 'help', desc: 'Help' },
  { cmd: 'init', desc: 'guided AGENTS.md setup' },
  { cmd: 'models', desc: 'Switch model' },
  { cmd: 'mode', desc: 'Reasoning level (low/medium/high/extra/max/god)' },
  { cmd: 'ui-mode', desc: 'Special UI modes (zen/focus/presentation/batch/daemon/service)' },
  { cmd: 'agent', desc: 'Toggle agent mode (read/edit/run in chat)' },
  { cmd: 'stack', desc: 'Detect and show tech stack' },
  { cmd: 'analytics', desc: 'Open build analytics dashboard' },
  { cmd: 'security', desc: 'Show security settings' },
  { cmd: 'audit', desc: 'Show recent audit log entries' },
  { cmd: 'workspaces', desc: 'List team workspaces' },
  { cmd: 'quota', desc: 'Check usage quotas' },
  { cmd: 'compliance', desc: 'Show compliance report' },
  { cmd: 'resume', desc: 'Resume interrupted build session' },
  { cmd: 'god', desc: 'Plan and build' },
  { cmd: 'hooks', desc: 'Show active workflow hooks' },
  { cmd: 'bugfix', desc: 'Start bugfix daemon' },
  { cmd: 'watch', desc: 'Watch daemon: on | off | status | logs | undo' },
  { cmd: 'plan', desc: 'View plan' },
  { cmd: 'undo', desc: 'Revert changes' },
  { cmd: 'rollback', desc: 'Rollback all pending changes' },
  { cmd: 'history', desc: 'Show recent commands' },
  { cmd: 'context', desc: 'Show current context' },
  { cmd: 'clear', desc: 'Clear chat' },
  { cmd: 'export', desc: 'Export session to markdown/json' },
  { cmd: 'record', desc: 'Record macro commands' },
  { cmd: 'replay', desc: 'Replay a recorded macro' }
].sort((a, b) => a.cmd.localeCompare(b.cmd));

export { SLASH_COMMANDS };

export function InputLine({ onSubmit, history, variant = 'default', modelLabel = 'auto', agentMode = 'Build', mode = 'medium', isActive = true, isGenerating = false, canRetry = false, onRetry = null, pendingPermission = null, onPermission = null, onQuickAction = null }) {
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(history.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const lastKeyAt = useRef(0);
  const draftRef = useRef('');

  const exitHistoryPreview = () => {
    if (histIdx !== history.length) {
      setHistIdx(history.length);
      draftRef.current = '';
    }
  };

  useEffect(() => {
    if (!isActive || isGenerating) return;
    const id = setInterval(() => {
      // hold the cursor solid while typing — blinking resumes after a pause
      if (Date.now() - lastKeyAt.current > 250) setCursorOn((c) => !c);
    }, 530);
    return () => clearInterval(id);
  }, [isActive, isGenerating]);

  useKeyboard((key) => {
    if (!isActive) return;
    if (isGenerating) return;
    lastKeyAt.current = Date.now();
    setCursorOn(true);
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

    if (key.shift && value.length === 0 && onQuickAction) {
      const idx = ['!', '@', '#', '$'].indexOf(input);
      if (idx >= 0) {
        onQuickAction(idx + 1);
        return;
      }
    }

    if (key.name === 'up') {
      if (menuOpen && currentMatches.length > 0) {
        const nextIdx = (menuIdx - 1 + currentMatches.length) % currentMatches.length;
        setMenuIdx(nextIdx);
        setValue('/' + currentMatches[nextIdx].cmd);
        return;
      }
      if (histIdx === history.length && value !== '') draftRef.current = value;
      if (histIdx > 0) {
        const next = histIdx - 1;
        setHistIdx(next);
        setValue(history[next] !== undefined ? history[next] : '');
      }
      return;
    }
    if (key.name === 'down') {
      if (menuOpen && currentMatches.length > 0) {
        const nextIdx = (menuIdx + 1) % currentMatches.length;
        setMenuIdx(nextIdx);
        setValue('/' + currentMatches[nextIdx].cmd);
        return;
      }
      if (histIdx < history.length) {
        const next = histIdx + 1;
        setHistIdx(next);
        setValue(next >= history.length ? (draftRef.current ?? '') : history[next]);
      }
      return;
    }

    if (key.name === 'escape') {
      setMenuOpen(false);
      if (histIdx !== history.length) {
        setHistIdx(history.length);
        setValue(draftRef.current ?? '');
        draftRef.current = '';
      }
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
      const submitted = value.trim();
      setValue('');
      setMenuOpen(false);
      setMenuIdx(0);
      setHistIdx(history.length);
      draftRef.current = '';
      if (submitted) onSubmit(submitted);
      return;
    }
    if (key.name === 'backspace' || key.name === 'delete') {
      exitHistoryPreview();
      const next = value.slice(0, -1);
      setValue(next);
      setMenuOpen(next.startsWith('/') && next.length > 1);
      setMenuIdx(0);
      return;
    }
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      exitHistoryPreview();
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

  const renderMenu = () => (
    menuOpen && displayMatches.length > 0 && (
      <box flexDirection="column" borderStyle="round" border borderColor={theme.accent} backgroundColor={theme.surface} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} marginBottom={0}>
        {displayMatches.map((item, i) => {
          const isSelected = i === menuIdx;
          return (
            <box key={item.cmd} paddingLeft={1} paddingRight={1} backgroundColor={isSelected ? theme.accent : undefined} flexDirection="row">
              <text fg={isSelected ? '#000000' : theme.text} attributes={isSelected ? TextAttributes.BOLD : 0}>{`/${item.cmd}`.padEnd(15, ' ')}</text>
              <text fg={isSelected ? '#1e3a5f' : theme.dim}>{item.desc.padEnd(45, ' ')}</text>
            </box>
          );
        })}
        {hasMore && <box paddingLeft={1} paddingRight={1}><text fg={theme.muted}>{'\u2026'} {matches.length - 6} more</text></box>}
      </box>
    )
  );

  const placeholder = value.length === 0
    ? (isGenerating ? 'Generating\u2026' : 'Ask anything\u2026  \u00b7  / for commands')
    : value;
  const placeholderColor = value.length === 0 ? theme.dim : theme.textBright;

  if (variant === 'welcome') {
    return (
      <box flexDirection="column" width={64}>
        {renderMenu()}
        <box width={64} borderStyle="single" border={['left']} borderColor={theme.accent} backgroundColor={theme.userBg} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} flexDirection="column">
          <text fg={placeholderColor}>
            {value.length === 0 ? 'Ask anything\u2026 "build a rest api for orders"' : value}
            {cursorOn && <span fg={theme.green}>{'\u258d'}</span>}
          </text>
          <text> </text>
          <box flexDirection="row">
            <text fg={theme.amber}>{agentMode}{'  '}</text>
            <text fg={theme.green}>{modelLabel}{'   '}</text>
            <text fg={theme.red}>max</text>
          </box>
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%">
      {renderMenu()}
      <box width="100%" borderStyle="single" border={['left']} borderColor={theme.accent} backgroundColor={theme.userBg} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} flexDirection="column">
        <text fg={placeholderColor}>{placeholder}{cursorOn && <span fg={theme.green}>{'\u258d'}</span>}</text>
        <text> </text>
        <box flexDirection="row">
          <text fg={theme.amber}>{agentMode} </text>
          <text fg={theme.dim}>{'\u00b7'} </text>
          <text fg={theme.green}>{modelLabel} </text>
          <text fg={theme.dim}>{'\u00b7'} </text>
          <text fg={theme.red}>{mode}</text>
        </box>
      </box>
    </box>
  );
}
