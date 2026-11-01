// @ts-nocheck — OpenTUI JSX, type-covered by esbuild bundle + manual runs, not tsc.
import { useRef, useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { useTicker } from './useTicker.js';
import { getClipboardText, sanitizePasteText } from './clipboard.js';
import { usePaste } from './usePaste.js';

const SLASH_COMMANDS = [
  { cmd: 'agent', desc: 'Toggle agent mode (read/edit/run in chat)' },
  { cmd: 'agents', desc: 'List active subagents' },
  { cmd: 'analytics', desc: 'Open build analytics web view' },
  { cmd: 'audit', desc: 'Show recent audit log entries' },
  { cmd: 'bugcheck', desc: 'Run bug check (static analysis + AI review)' },
  { cmd: 'bugfix', desc: 'Start bugfix daemon' },
  { cmd: 'clear', desc: 'Clear chat' },
  { cmd: 'compliance', desc: 'Show compliance report' },
  { cmd: 'connect', desc: 'Connect provider' },
  { cmd: 'context', desc: 'Show current context' },
  { cmd: 'customize', desc: 'Customize icons, font, layout' },
  { cmd: 'debug', desc: 'Toggle event inspector panel' },
  { cmd: 'diff', desc: 'Show pending changes' },
  { cmd: 'exit', desc: 'Exit the app' },
  { cmd: 'explain', desc: 'Explain code, concept, or project tour' },
  { cmd: 'export', desc: 'Export session to markdown/json' },
  { cmd: 'god', desc: 'Plan and build' },
  { cmd: 'help', desc: 'Help' },
  { cmd: 'history', desc: 'Show recent commands' },
  { cmd: 'hooks', desc: 'Show active workflow hooks' },
  { cmd: 'init', desc: 'guided AGENTS.md setup' },
  { cmd: 'migrate', desc: 'Structural refactor with behavioral equivalence' },
  { cmd: 'mode', desc: 'Operational mode: God, Watch, Build, Architect, Edit, Read' },
  { cmd: 'output', desc: 'Output reasoning level (low, medium, high, extra, max, god)' },
  { cmd: 'output-mode', desc: 'Output reasoning level (low, medium, high, extra, max, god)' },
  { cmd: 'model', desc: 'Switch AI model' },
  { cmd: 'plan', desc: 'View plan' },
  { cmd: 'quota', desc: 'Check usage quotas' },
  { cmd: 'record', desc: 'Record macro commands' },
  { cmd: 'replay', desc: 'Replay a recorded macro' },
  { cmd: 'resume', desc: 'Resume interrupted build session' },
  { cmd: 'review', desc: 'Review changes (uncommitted diff, PR, or file)' },
  { cmd: 'rollback', desc: 'Rollback all pending changes' },
  { cmd: 'scheme', desc: 'Set color scheme (default/blue/purple/amber/red/teal/mono)' },
  { cmd: 'security', desc: 'Show security settings' },
  { cmd: 'security-check', desc: 'Run security checkup (17 industry controls scan)' },
  { cmd: 'stack', desc: 'Detect and show tech stack' },
  { cmd: 'test', desc: 'Autonomous self-healing testing agent' },
  { cmd: 'theme', desc: 'Cycle color theme' },
  { cmd: 'ui-mode', desc: 'Special UI modes (zen/focus/presentation/batch/daemon/service)' },
  { cmd: 'undo', desc: 'Revert changes' },
  { cmd: 'watch', desc: 'Watch daemon: on | off | status | logs | undo' },
  { cmd: 'workspaces', desc: 'List team workspaces' }
].sort((a, b) => a.cmd.localeCompare(b.cmd));

export { SLASH_COMMANDS };

export function InputLine({ onSubmit, history, variant = 'default', modelLabel = 'auto', agentMode = 'Build', mode = 'medium', isActive = true, isGenerating = false, canRetry = false, onRetry = null, pendingPermission = null, onPermission = null, onQuickAction = null }) {
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(history.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);
  const [inputScroll, setInputScroll] = useState(0);
  const lastKeyAt = useRef(0);
  const draftRef = useRef('');

  const MAX_INPUT_LINES = 4;
  const valueLines = value ? value.split('\n') : [];
  const countEffectiveLines = (lines) => {
    let count = 0;
    const colWidth = 65;
    for (const l of lines) {
      count += Math.max(1, Math.ceil((l.length || 1) / colWidth));
    }
    return count;
  };
  const totalInputLines = valueLines.length;
  const effectiveLines = countEffectiveLines(valueLines);
  const isCapped = totalInputLines > MAX_INPUT_LINES || effectiveLines > MAX_INPUT_LINES;

  const exitHistoryPreview = () => {
    if (histIdx !== history.length) {
      setHistIdx(history.length);
      draftRef.current = '';
    }
  };

  // Blink cursor via shared ticker: floor(ticks/6) % 2 → ~480ms cycle (80ms × 6)
  // Hold solid while typing (resume after 250ms pause = ~3 ticks)
  const ticks = useTicker();
  const blink = Math.floor(ticks / 6) % 2;
  const typingActive = isActive && !isGenerating && Date.now() - lastKeyAt.current <= 250;
  const cursorOn = isActive && !isGenerating && (typingActive ? true : blink);

  usePaste((clip) => {
    if (!isActive || isGenerating) return;
    exitHistoryPreview();
    setValue((v) => {
      const next = v + clip;
      setInputScroll(Math.max(0, next.split('\n').length - MAX_INPUT_LINES));
      return next;
    });
  }, isActive && !isGenerating);

  useKeyboard((key) => {
    if (!isActive) return;
    if (isGenerating) return;
    lastKeyAt.current = Date.now();
    if ((key.ctrl || key.meta) && (key.name === 'v' || key.sequence === '\x16')) {
      const clip = sanitizePasteText(getClipboardText());
      if (clip) {
        exitHistoryPreview();
        setValue((v) => {
          const next = v + clip;
          setInputScroll(Math.max(0, next.split('\n').length - MAX_INPUT_LINES));
          return next;
        });
        return;
      }
    }
    // Terminal-chunk pasted text (multi-character stream)
    if (key.sequence && key.sequence.length > 1 && !key.ctrl && !key.meta) {
      const clean = sanitizePasteText(key.sequence);
      if (clean) {
        exitHistoryPreview();
        setValue((v) => {
          const next = v + clean;
          setInputScroll(Math.max(0, next.split('\n').length - MAX_INPUT_LINES));
          return next;
        });
        return;
      }
    }
    if (isCapped && !menuOpen) {
      if (key.name === 'pageup') {
        setInputScroll((s) => Math.max(0, s - MAX_INPUT_LINES));
        return;
      }
      if (key.name === 'pagedown') {
        setInputScroll((s) => Math.min(totalInputLines - MAX_INPUT_LINES, s + MAX_INPUT_LINES));
        return;
      }
    }
    const input = key.sequence ? sanitizePasteText(key.sequence) : '';
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

    if ((key.name === 'tab' || key.name === 'right') && menuOpen && currentMatches.length > 0) {
      setValue('/' + currentMatches[menuIdx].cmd + ' ');
      setMenuOpen(false);
      return;
    }
    
    if (key.name === 'return') {
      if (key.shift) {
        setValue((v) => {
          const next = v + '\n';
          setInputScroll(Math.max(0, next.split('\n').length - MAX_INPUT_LINES));
          return next;
        });
        return;
      }
      
      let submitted = value;
      if (menuOpen && currentMatches.length > 0 && currentMatches[menuIdx]) {
        submitted = '/' + currentMatches[menuIdx].cmd;
      }
      
      submitted = submitted.trim();
      setValue('');
      setInputScroll(0);
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
      setInputScroll((s) => Math.max(0, Math.min(s, next.split('\n').length - MAX_INPUT_LINES)));
      setMenuOpen(next.startsWith('/') && next.length > 1);
      setMenuIdx(0);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
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

  const WINDOW_SIZE = 6;
  const page = Math.floor(menuIdx / WINDOW_SIZE);
  const startIndex = page * WINDOW_SIZE;
  const displayMatches = matches.slice(startIndex, startIndex + WINDOW_SIZE);
  const hasMoreDown = startIndex + WINDOW_SIZE < matches.length;
  const hasMoreUp = startIndex > 0;

  const handleWheel = (e) => {
    if (e.type === 'wheel' || e.type === 'mouse') {
      const delta = e.button === 1 ? -1 : 1;
      setMenuIdx((prev) => Math.max(0, Math.min(matches.length - 1, prev + delta)));
    }
  };

  const renderMenu = () => {
    if (!menuOpen || displayMatches.length === 0) return null;

    const totalLines = displayMatches.length + (hasMoreUp ? 1 : 0) + (hasMoreDown ? 1 : 0);
    const thumbHeight = Math.max(1, Math.floor((WINDOW_SIZE / Math.max(1, matches.length)) * totalLines));
    const thumbPos = Math.floor((menuIdx / Math.max(1, matches.length)) * totalLines);
    
    const scrollbarLines = Array(totalLines).fill('│');
    for (let i = 0; i < thumbHeight; i++) {
      if (thumbPos + i < totalLines) {
        scrollbarLines[thumbPos + i] = '█';
      }
    }

    return (
      <box flexDirection="row" borderStyle="round" border borderColor={theme.accent} backgroundColor={theme.surface} paddingLeft={SPACING.none} paddingRight={SPACING.none} paddingTop={SPACING.none} paddingBottom={SPACING.none} marginBottom={SPACING.none} onWheel={handleWheel}>
        <box flexDirection="column" flexGrow={1}>
          {hasMoreUp && <box paddingLeft={SPACING.sm} paddingRight={SPACING.sm}><text fg={theme.muted}>{'\u2191'} {startIndex} above</text></box>}
          {displayMatches.map((item, i) => {
            const trueIdx = startIndex + i;
            const isSelected = trueIdx === menuIdx;
            return (
              <box 
                key={item.cmd} 
                paddingLeft={SPACING.sm} 
                paddingRight={SPACING.sm} 
                backgroundColor={isSelected ? theme.accent : undefined} 
                flexDirection="row"
                onMouseDown={() => {
                  setMenuIdx(trueIdx);
                  setValue('/' + matches[trueIdx].cmd + ' ');
                  setMenuOpen(false);
                }}
              >
                <text fg={isSelected ? '#000000' : theme.text} attributes={isSelected ? TextAttributes.BOLD : 0}>{`/${item.cmd}`.padEnd(15, ' ')}</text>
                <text fg={isSelected ? '#1e3a5f' : theme.dim}>{item.desc.padEnd(45, ' ')}</text>
              </box>
            );
          })}
          {hasMoreDown && <box paddingLeft={SPACING.sm} paddingRight={SPACING.sm}><text fg={theme.muted}>{'\u2193'} {matches.length - (startIndex + WINDOW_SIZE)} more</text></box>}
        </box>
        
        {matches.length > WINDOW_SIZE && (
          <box flexDirection="column" paddingLeft={1} paddingRight={0}>
            {scrollbarLines.map((char, i) => (
              <box 
                key={i} 
                onMouseDown={() => {
                  const fraction = i / totalLines;
                  setMenuIdx(Math.min(matches.length - 1, Math.floor(fraction * matches.length)));
                }}
              >
                <text fg={char === '█' ? theme.accent : theme.muted}>{char}</text>
              </box>
            ))}
          </box>
        )}
      </box>
    );
  };

  const handleInputWheel = (e) => {
    if (!isCapped) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    setInputScroll((s) => Math.max(0, Math.min(totalInputLines - MAX_INPUT_LINES, s + dir)));
  };

  const renderInputContent = () => {
    if (value.length === 0) {
      return (
        <text fg={theme.dim}>
          {isGenerating ? 'Generating\u2026' : (variant === 'welcome' ? 'Ask anything\u2026 "build a rest api for orders"' : 'Ask anything\u2026  \u00b7  / for commands')}
          {cursorOn && <span fg={theme.green}>{'\u258d'}</span>}
        </text>
      );
    }

    if (!isCapped) {
      return (
        <box flexDirection="column">
          {valueLines.map((line, idx) => (
            <text key={idx} fg={theme.textBright}>
              {line || ' '}
              {idx === valueLines.length - 1 && cursorOn && <span fg={theme.green}>{'\u258d'}</span>}
            </text>
          ))}
        </box>
      );
    }

    const visibleLines = valueLines.slice(inputScroll, inputScroll + MAX_INPUT_LINES);
    const maxScroll = Math.max(1, totalInputLines - MAX_INPUT_LINES);
    const thumbPos = Math.round((inputScroll / maxScroll) * (MAX_INPUT_LINES - 1));

    return (
      <box flexDirection="column" onWheel={handleInputWheel}>
        <box flexDirection="row" marginBottom={SPACING.none}>
          <text fg={theme.accent}>[Pasted {totalInputLines} lines · scroll/PgUp/PgDn to view · Enter to submit]</text>
        </box>
        <box flexDirection="row">
          <box flexDirection="column" flexGrow={1}>
            {visibleLines.map((line, idx) => {
              const actualIdx = inputScroll + idx;
              const isLast = actualIdx === totalInputLines - 1;
              const displayLine = line.length > 100 ? line.slice(0, 97) + '…' : (line || ' ');
              return (
                <text key={actualIdx} fg={theme.textBright}>
                  {displayLine}
                  {isLast && cursorOn && <span fg={theme.green}>{'\u258d'}</span>}
                </text>
              );
            })}
          </box>
          <box flexDirection="column" paddingLeft={1} paddingRight={0}>
            {Array.from({ length: MAX_INPUT_LINES }).map((_, i) => (
              <text key={i} fg={i === thumbPos ? theme.accent : theme.divider}>
                {i === thumbPos ? '█' : '│'}
              </text>
            ))}
          </box>
        </box>
      </box>
    );
  };

  if (variant === 'welcome') {
    return (
      <box flexDirection="column" width={64}>
        {renderMenu()}
        <box width={64} borderStyle="single" border={['left']} borderColor={theme.accent} backgroundColor={theme.userBg} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.sm} paddingBottom={SPACING.sm} flexDirection="column">
          {renderInputContent()}
          <text> </text>
          <box flexDirection="row">
            <text fg={theme.amber}>Mode: {agentMode}{'  '}</text>
            <text fg={theme.green}>Model: {modelLabel}{'   '}</text>
            <text fg={theme.red}>Output: {mode}</text>
          </box>
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%">
      {renderMenu()}
      <box width="100%" borderStyle="single" border={['left']} borderColor={theme.accent} backgroundColor={theme.userBg} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.sm} paddingBottom={SPACING.sm} flexDirection="column">
        {renderInputContent()}
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
