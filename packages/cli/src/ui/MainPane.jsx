import { useEffect, useMemo, useRef, useState } from 'react';
import { highlight } from 'cli-highlight';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { BgBox } from './BgBox.jsx';
import { SpinnerBlock, ThoughtBlock, ReadBlock, WriteBlock, DiffBlock, CommandBlock, TodoBlock, InterruptBlock, ErrorBlock, PermissionBlock, ChangeSummaryBlock, TOOL_VERBS, READ_MAX, CMD_MAX } from './blocks.jsx';
import { BuildSummaryCard } from './SummaryCard.jsx';

export function MainPane({ messages, streamingMessage, isGenerating = false, onInterrupt = null, onRetry = null, pendingPermission = null, onPermission = null, agentMode = 'Build' }) {
  const { width: termWidth } = useTerminalDimensions();
  const panelWidth = Math.max(20, (termWidth || 120) - 6);
  const [expanded, setExpanded] = useState(null);
  const [focus, setFocus] = useState(-1);
  const [genSecs, setGenSecs] = useState(0);
  const itemsRef = useRef([]);
  const blocksRef = useRef([]);
  itemsRef.current.length = 0;
  blocksRef.current.length = 0;
  const items = itemsRef.current;
  const blocks = blocksRef.current;

  const registerItem = (item) => {
    const index = items.length;
    items.push(item);
    return index;
  };

  const renderCode = (id, title, code, index) => {
    const isExpanded = expanded === index;
    const isFocused = focus === index;
    let highlighted = '';
    if (isExpanded) {
      try {
        highlighted = highlight(code, { language: 'javascript', ignoreIllegals: true });
      } catch { /* unparseable code */ }
    }
    const lines = isExpanded ? highlighted.split('\n') : [];
    return (
      <box key={id} flexDirection="column" marginTop={SPACING.sm} flexShrink={0} paddingLeft={SPACING.sm}>
        <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={isFocused ? theme.accent : theme.divider} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
          <box flexDirection="row" paddingBottom={isExpanded ? 1 : 0} borderStyle={isExpanded ? 'single' : undefined} border={isExpanded ? ['bottom'] : undefined} borderColor={theme.divider}>
            <text fg={theme.teal}>{'\u25ce'} </text>
            <text fg={theme.textBright}>{title}</text>
          </box>
          {isExpanded && (
            <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
              {lines.slice(0, 30).map((l, i) => (
                <text key={i}>{l || ' '}</text>
              ))}
              {lines.length > 30 && <text fg={theme.dim}>... {lines.length - 30} more lines</text>}
            </box>
          )}
          {isExpanded && (
            <box flexDirection="row" marginTop={SPACING.sm} paddingTop={SPACING.sm} borderStyle="single" border={['top']} borderColor={theme.divider}>
              <text fg={theme.dim}>[y] Apply   [c] Copy   [r] Run</text>
            </box>
          )}
        </box>
      </box>
    );
  };

  const renderReadWrite = (msg, key, isFirst) => {
    const lines = msg.lines || [];
    const truncated = lines.length > READ_MAX;
    const iIdx = truncated ? registerItem({ type: 'tool', key }) : null;
    const isExpanded = iIdx !== null && expanded === iIdx;
    return msg.block === 'write'
      ? <WriteBlock key={key} path={msg.path} lines={lines} expanded={isExpanded} marginTop={isFirst ? 0 : 1} />
      : <ReadBlock key={key} path={msg.path} lines={lines} expanded={isExpanded} marginTop={isFirst ? 0 : 1} />;
  };

  const renderDiff = (msg, key, isFirst) => {
    const lines = msg.diffLines || [];
    const maxRows = 60;
    const truncated = lines.length > maxRows;
    const iIdx = truncated ? registerItem({ type: 'tool', key }) : null;
    const isExpanded = iIdx !== null && expanded === iIdx;
    return <DiffBlock key={key} path={msg.path} lines={lines} expanded={isExpanded} marginTop={isFirst ? 0 : 1} />;
  };

  const renderCommand = (msg, key, isFirst) => {
    const out = String(msg.output || '').split('\n');
    const truncated = out.length > CMD_MAX;
    const iIdx = truncated ? registerItem({ type: 'tool', key }) : null;
    const isExpanded = iIdx !== null && expanded === iIdx;
    return <CommandBlock key={key} title={msg.title} relDir={msg.relDir} command={msg.command} output={msg.output} expanded={isExpanded} marginTop={isFirst ? 0 : 1} />;
  };

  const renderPermission = (msg, key, isFirst) =>
    <PermissionBlock key={key} pending={msg.permission === 'pending'} approved={msg.approved} command={msg.command} marginTop={isFirst ? 0 : 1} />;

  const renderTodo = (msg, key, isFirst) =>
    <TodoBlock key={key} items={msg.items || []} marginTop={isFirst ? 0 : 1} />;

  const renderSummary = (msg, key, isFirst) =>
    <ChangeSummaryBlock key={key} files={msg.files || []} marginTop={isFirst ? 0 : 1} />;

  // elapsed time for the live Thought header while generating
  useEffect(() => {
    if (!isGenerating) {
      setGenSecs(0);
      return;
    }
    const t0 = Date.now();
    const t = setInterval(() => setGenSecs(((Date.now() - t0) / 1000).toFixed(1)), 100);
    return () => clearInterval(t);
  }, [isGenerating]);

  const runningTool = useMemo(
    () => messages.find((m) => m.kind === 'tool' && m.status === 'running' && m.block !== 'permission'),
    [messages]
  );

  // Non-scroll keys only — PageUp/PageDown and mouse-wheel scrolling are
  // handled natively by <scrollbox> (matches OpenCode's own scroll behavior).
  useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
    if (key.name === 'tab') {
      setFocus((f) => {
        if (items.length === 0) return -1;
        return f >= items.length - 1 ? -1 : f + 1;
      });
      return;
    }
    if (key.name === 'return' && focus >= 0 && items[focus]) {
      setExpanded((cur) => (cur === focus ? null : focus));
      return;
    }
    if (input === 'q' && focus >= 0) {
      setExpanded(null);
      setFocus(-1);
    }
    if (key.name === 'escape') {
      if (isGenerating && onInterrupt) {
        onInterrupt();
        return;
      }
      setExpanded(null);
    }
  });

  const render = messages.map((msg, i) => {
    const isFirst = i === 0;
    if (msg.kind === 'user') {
      const lines = String(msg.text).split('\n');
      const totalRows = lines.length + 2; // paddingTop(1) + text rows + paddingBottom(1)
      return (
        <box key={`u${i}`} flexDirection="row" width={panelWidth} marginTop={isFirst ? 0 : 1} flexShrink={0}>
          <box flexDirection="column" width={1} flexShrink={0}>
            {Array.from({ length: totalRows }).map((_, r) => (
              <text key={r} fg={theme.accent}>{'\u2502'}</text>
            ))}
          </box>
          <box flexGrow={1} flexDirection="column" backgroundColor={theme.userBg} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.sm} paddingBottom={SPACING.sm}>
            {lines.map((line, li) => (
              <text key={li} fg={theme.textBright}>{line}</text>
            ))}
          </box>
        </box>
      );
    }
    if (msg.kind === 'tool') {
      if (msg.status === 'running') return null;
      if (msg.block === 'read' || msg.block === 'write') return renderReadWrite(msg, `t${i}`, isFirst);
      if (msg.block === 'edit') return renderDiff(msg, `t${i}`, isFirst);
      if (msg.block === 'permission') return renderPermission(msg, `t${i}`, isFirst);
      return renderCommand(msg, `t${i}`, isFirst);
    }
    if (msg.kind === 'todo') return renderTodo(msg, `todo${i}`, isFirst);
    if (msg.kind === 'summary') return renderSummary(msg, `sum${i}`, isFirst);
    if (msg.kind === 'interrupt') {
      return <InterruptBlock key={i} marginTop={isFirst ? 0 : 1} />;
    }
    if (msg.kind === 'error') {
      return <ErrorBlock key={i} reason={msg.reason || msg.text} marginTop={isFirst ? 0 : 1} />;
    }
    if (msg.kind === 'system') {
      return (
        <box key={i} flexDirection="row" justifyContent="center" marginTop={isFirst ? 0 : 1} flexShrink={0}>
          <text fg={theme.muted}>{'\u2500\u2500 '}</text>
          <text fg={theme.purple}>{msg.text}</text>
          <text fg={theme.muted}>{' \u2500\u2500'}</text>
        </box>
      );
    }
    if (msg.kind === 'ok') {
      return (
        <box key={i} flexShrink={0} paddingLeft={SPACING.sm}>
          <text fg={theme.green}>{'\u2713'} {msg.text}</text>
        </box>
      );
    }
    if (msg.kind === 'warn') {
      return (
        <box key={i} flexShrink={0} paddingLeft={SPACING.sm}>
          <text fg={theme.amber}>{'\u26a0'} {msg.text}</text>
        </box>
      );
    }
    if (msg.kind === 'err') {
      return (
        <box key={i} flexShrink={0} paddingLeft={SPACING.sm}>
          <text fg={theme.red}>{'\u2717'} {msg.text}</text>
        </box>
      );
    }
    if (msg.kind === 'build') {
      return <BuildSummaryCard key={`b${i}`} projectName={msg.projectName} data={msg.data} marginTop={isFirst ? 0 : 1} />;
    }
    if (msg.kind === 'code') {
      const index = blocks.length;
      blocks.push({ index, id: msg.id, title: msg.title, code: msg.code });
      return renderCode(msg.id, msg.title, msg.code, index);
    }
    // Assistant message
    return (
      <box key={i} flexDirection="column" marginTop={isFirst ? 0 : 1} flexShrink={0}>
        {msg.thought && (
          <box marginBottom={SPACING.sm}>
            <ThoughtBlock text={msg.thought.text} seconds={msg.thought.secs} />
          </box>
        )}
        <box flexDirection="column" paddingLeft={SPACING.sm}>
          <text fg={theme.text}>{msg.text}</text>
        </box>
        {msg.meta && (
          <box marginTop={SPACING.sm} paddingLeft={SPACING.sm} flexDirection="row" alignItems="center">
            <text fg={theme.blue}>{'\u25aa '}</text>
            <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{agentMode}</text>
            <text fg={theme.meta}>
              {' \u00b7 '}{msg.meta.model}{' \u00b7 '}{msg.meta.secs}s
              {msg.meta.interrupted && <span fg={theme.red}>{' (interrupted)'}</span>}
            </text>
          </box>
        )}
      </box>
    );
  });

  return (
    <box flexDirection="column" width="100%" height="100%" overflow="hidden">
      <scrollbox
        flexGrow={1}
        scrollY
        scrollX={false}
        stickyScroll
        stickyStart="bottom"
        rootOptions={{ flexGrow: 1 }}
        viewportOptions={{ flexGrow: 1 }}
        contentOptions={{ flexDirection: 'column', flexShrink: 0, width: panelWidth }}
        scrollbarOptions={{ visible: true }}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        {render}
        {isGenerating && (runningTool
          ? <SpinnerBlock label={TOOL_VERBS[runningTool.tool] || 'Working…'} />
          : streamingMessage
            ? <ThoughtBlock text={streamingMessage} seconds={genSecs} live />
            : <SpinnerBlock label="Working…" />)}
      </scrollbox>
    </box>
  );
}