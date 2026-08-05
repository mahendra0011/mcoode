import { useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { theme } from './theme.js';
import { SpinnerBlock, ThoughtBlock, ReadBlock, WriteBlock, DiffBlock, CommandBlock, TodoBlock, InterruptBlock, ErrorBlock, PermissionBlock, ChangeSummaryBlock, TOOL_VERBS, READ_MAX, CMD_MAX } from './blocks.jsx';

export function MainPane({ messages, streamingMessage, isGenerating = false, onInterrupt = null, onRetry = null, pendingPermission = null, onPermission = null }) {
  const { stdout } = useStdout();
  const panelWidth = Math.max(20, (stdout.columns || 120) - 6);
  const viewportLines = Math.max(8, (stdout.rows || 30) - 17);
  const [expanded, setExpanded] = useState(null);
  const [focus, setFocus] = useState(-1);
  const [scrollBack, setScrollBack] = useState(0);
  const [genSecs, setGenSecs] = useState(0);
  const items = []; // focusable expand/collapse items

  const registerItem = (item) => {
    const index = items.length;
    items.push(item);
    return index;
  };

  const wrapLines = (text) =>
    String(text ?? '')
      .split('\n')
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(1, panelWidth - 2))), 0);

  const blockLines = (msg) => {
    if (msg.status === 'running') return 1;
    if (msg.block === 'read' || msg.block === 'write') {
      const n = Math.min(READ_MAX, msg.lines?.length || 0);
      return 2 + n + ((msg.lines?.length || 0) > READ_MAX ? 1 : 0);
    }
    if (msg.block === 'edit') {
      const n = Math.min(60, msg.diffLines?.length || 0);
      return 2 + n;
    }
    // command block
    const out = String(msg.output || '').split('\n');
    const shown = Math.min(CMD_MAX, out.length);
    return 2 + (msg.command ? 1 : 0) + (msg.title ? 1 : 0) + shown + (out.length > CMD_MAX ? 1 : 0);
  };

  const messageLines = (msg) => {
    if (msg.kind === 'user') return 3 + wrapLines(msg.text);
    if (msg.kind === 'assistant') return 3 + wrapLines(msg.text) + (msg.meta ? 1 : 0);
    if (msg.kind === 'tool') return blockLines(msg);
    if (msg.kind === 'todo') return 2 + (msg.items?.slice(0, 12).length || 0) + (msg.items?.length > 12 ? 1 : 0);
    if (msg.kind === 'interrupt') return 1;
    if (msg.kind === 'error') return 2;
    if (msg.kind === 'summary') return 1 + (msg.files?.length || 0);
    return wrapLines(msg.text);
  };

  const blocks = [];

  const renderCode = (id, title, code, index) => {
    const isExpanded = expanded === index;
    const isFocused = focus === index;
    let highlighted = '';
    if (isExpanded) {
      try {
        highlighted = highlight(code, { language: 'javascript', ignoreIllegals: true });
      } catch {}
    }
    const lines = isExpanded ? highlighted.split('\n') : [];
    return (
      <Box key={id} flexDirection="column" marginTop={1} flexShrink={0}>
        <Box flexDirection="column" backgroundColor={theme.bgMessage} paddingX={3} paddingY={1} width="100%">
          <Text color={isFocused ? theme.text : theme.dim}>{title}</Text>
          {isExpanded && (
            <Box flexDirection="column" marginTop={1}>
              {lines.slice(0, 30).map((line, i) => <Text key={i} color={theme.text}>{line || ' '}</Text>)}
            </Box>
          )}
        </Box>
      </Box>
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

  const blocksLines = blocks.reduce(
    (s, b) => s + (expanded === b.index ? 5 + Math.min(30, b.code.split('\n').length) : 4),
    0
  );
  const runningTool = messages.find((m) => m.kind === 'tool' && m.status === 'running' && m.block !== 'permission');
  const genLines = isGenerating
    ? 2 + (streamingMessage ? wrapLines(streamingMessage) : 0)
    : 0;
  const contentLines = messages.reduce((s, m) => s + messageLines(m), 0) + blocksLines + genLines;
  const maxBack = Math.max(0, contentLines - viewportLines);
  const scrollAmt = Math.min(scrollBack, maxBack);
  const scrolledUp = scrollAmt > 0;

  // scroll model (opencode-style): at the bottom, content fills the viewport and
  // the oldest messages clip at the top; when scrolled up, older content anchors
  // at the top and newer messages clip at the bottom. Short content anchors top.
  const perMsg = messages.map(messageLines);
  let keepStart = 0;
  let keepEnd = messages.length;
  let justify = 'flex-start';
  if (scrolledUp) {
    let remaining = scrollAmt;
    for (let i = messages.length - 1; i >= 0 && remaining > 0; i--) {
      const l = perMsg[i];
      if (l <= remaining) {
        remaining -= l;
        keepEnd = i;
      } else {
        break;
      }
    }
  } else if (maxBack > 0) {
    justify = 'flex-end';
    let remaining = maxBack;
    for (let i = 0; i < messages.length && remaining > 0; i++) {
      const l = perMsg[i];
      if (l <= remaining) {
        remaining -= l;
        keepStart = i + 1;
      } else {
        break;
      }
    }
  }

  useInput((input, key) => {
    if (key.pageUp) {
      setScrollBack((s) => Math.min(s + viewportLines, maxBack));
      return;
    }
    if (key.pageDown) {
      setScrollBack((s) => Math.max(0, s - viewportLines));
      return;
    }
    const wheel = typeof input === 'string' ? input.match(/^\x1b?\[<6([45]);(\d+);(\d+)([Mm])$/) : null;
    if (wheel) {
      setScrollBack((s) => {
        const step = 3;
        const up = wheel[1] === '4';
        return Math.max(0, Math.min(up ? s + step : s - step, maxBack));
      });
      return;
    }
    if (key.tab) {
      setFocus((f) => {
        if (items.length === 0) return f;
        return (f + 1) % (items.length + 1) - 1;
      });
      return;
    }
    if (key.return && focus >= 0 && items[focus]) {
      setExpanded((cur) => (cur === focus ? null : focus));
      return;
    }
    if (input === 'q' && focus >= 0) {
      setExpanded(null);
      setFocus(-1);
    }
    if (key.escape) {
      if (isGenerating && onInterrupt) {
        onInterrupt();
        return;
      }
      setExpanded(null);
    }
  });

  // snap back to the newest message when a new one lands
  useEffect(() => {
    setScrollBack(0);
  }, [messages.length]);

  const render = messages.map((msg, i) => {
    const isFirst = i === keepStart;
    if (msg.kind === 'user') {
      return (
        <Box key={`u${i}`} width="100%" marginTop={isFirst ? 0 : 1} flexShrink={0}>
          <Box backgroundColor={theme.userBg} width="100%" paddingX={3} paddingY={1}>
            <Text color={theme.text}>{msg.text}</Text>
          </Box>
        </Box>
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
        <Box key={i} flexDirection="row" justifyContent="center" flexShrink={0}>
          <Text color={theme.purple}>{msg.text}</Text>
        </Box>
      );
    }
    if (msg.kind === 'ok') {
      return <Box key={i} flexShrink={0}><Text color={theme.green}>{msg.text}</Text></Box>;
    }
    if (msg.kind === 'warn') {
      return <Box key={i} flexShrink={0}><Text color={theme.amber}>{msg.text}</Text></Box>;
    }
    if (msg.kind === 'err') {
      return <Box key={i} flexShrink={0}><Text color={theme.red}>{msg.text}</Text></Box>;
    }
    if (msg.kind === 'code') {
      const index = blocks.length;
      blocks.push({ index, id: msg.id, title: msg.title, code: msg.code });
      return null;
    }
    return (
      <Box key={i} flexDirection="column" marginTop={isFirst ? 0 : 1} flexShrink={0}>
        {msg.thought && (
          <Box marginBottom={1}>
            <ThoughtBlock text={msg.thought.text} seconds={msg.thought.secs} />
          </Box>
        )}
        <Box flexDirection="column" paddingLeft={1}>
          <Text color={theme.text}>{msg.text}</Text>
        </Box>
        {msg.meta && (
          <Box marginTop={1} paddingLeft={1} flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text color={theme.meta}>
              {'\u25aa '}
              <Text color={theme.blue}>Build</Text>
              {' \u00b7 '}{msg.meta.model}{' \u00b7 '}{msg.meta.secs}s
              {msg.meta.interrupted && <Text color={theme.red}>{' (interrupted)'}</Text>}
            </Text>
            {msg.meta.tokens ? (
              <Text color={theme.meta}>{msg.meta.tokens}</Text>
            ) : null}
          </Box>
        )}
      </Box>
    );
  });

  const B = () => {
    if (!isGenerating) return null;
    if (runningTool) {
      return <SpinnerBlock label={TOOL_VERBS[runningTool.tool] || 'Working...'} />;
    }
    if (streamingMessage) {
      return <ThoughtBlock text={streamingMessage} seconds={genSecs} live />;
    }
    return <SpinnerBlock label="Working..." />;
  };

  return (
    <Box flexDirection="column" width="100%" height="100%" overflow="hidden">
      <Box flexDirection="column" flexGrow={1} justifyContent={justify}>
        {render.slice(keepStart, keepEnd)}
        <B />
        {blocks.map((b) => renderCode(b.id, b.title, b.code, b.index))}
      </Box>
    </Box>
  );
}