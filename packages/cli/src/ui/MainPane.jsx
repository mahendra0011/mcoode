import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import highlight from 'cli-highlight';
import { theme } from './theme.js';

export function MainPane({ messages }) {
  const [expanded, setExpanded] = useState(null);
  const [focus, setFocus] = useState(-1);
  const codeBlocks = [];

  useInput((input, key) => {
    if (key.tab) {
      setFocus((f) => {
        if (codeBlocks.length === 0) return f;
        return (f + 1) % (codeBlocks.length + 1) - 1; // -1..n-1
      });
      return;
    }
    if (key.return && focus >= 0 && codeBlocks[focus]) {
      setExpanded((cur) => (cur === focus ? null : focus));
      return;
    }
    if (input === 'q' && focus >= 0) {
      setExpanded(null);
      setFocus(-1);
    }
    if (key.escape) setExpanded(null);
  });

  const renderCode = (id, title, code, index) => {
    codeBlocks[index] = { id, title };
    const isExpanded = expanded === index;
    const isFocused = focus === index;
    let body;
    if (isExpanded) {
      const highlighted = highlight(code, { language: 'javascript' });
      const lines = highlighted.split('\n');
      body = (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.green} marginLeft={2} marginRight={2}>
          {lines.slice(0, 30).map((line, i) => (
            <Text key={i} color={isFocused ? theme.text : theme.dim}>{line || ' '}</Text>
          ))}
          {lines.length > 30 && <Text color={theme.gray}>… {lines.length - 30} more lines (press q to collapse)</Text>}
        </Box>
      );
    } else {
      body = (
        <Text color={isFocused ? theme.greenBright : theme.blue}>
          {isFocused ? '\u25b8' : '\u25b6'} {title} — press Enter to {isExpanded ? 'collapse' : 'expand'} ({code.split('\n').length} lines)
        </Text>
      );
    }
    return <Box key={id} flexDirection="column">{body}</Box>;
  };

  const blocks = [];

  const render = messages.map((msg, i) => {
    if (msg.kind === 'user') {
      return (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text color={theme.greenBright}>{'>'} </Text>
          <Text color={theme.text}>{msg.text}</Text>
        </Box>
      );
    }
    if (msg.kind === 'system') {
      return <Text key={i} color={theme.gray}>{msg.text}</Text>;
    }
    if (msg.kind === 'ok') {
      return <Text key={i} color={theme.green}>{msg.text}</Text>;
    }
    if (msg.kind === 'warn') {
      return <Text key={i} color={theme.amber}>{msg.text}</Text>;
    }
    if (msg.kind === 'err') {
      return <Text key={i} color={theme.red}>{msg.text}</Text>;
    }
    if (msg.kind === 'code') {
      const index = blocks.length;
      blocks.push({ index, id: msg.id, title: msg.title, code: msg.code });
      return null;
    }
    return <Text key={i} color={theme.text}>{msg.text}</Text>;
  });

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {render}
      {blocks.map((b) => renderCode(b.id, b.title, b.code, b.index))}
    </Box>
  );
}
