import { Box, Text } from 'ink';
import { theme } from './theme.js';

export function Sidebar({ width, title = 'New Chat', workspace, branch, version = '', tokens = 0, percent = 0, spent = '0.00', todos = [] }) {
  if (width <= 0) return null;

  const done = todos.filter((t) => t.status === 'done').length;
  const failed = todos.filter((t) => t.status === 'failed').length;

  return (
    <Box flexDirection="row">
      <Box width={1} backgroundColor={theme.divider}><Text> </Text></Box>
      <Box
        width={width - 1}
        flexDirection="column"
        backgroundColor={theme.panel}
        paddingLeft={2}
        paddingTop={1}
      >
        <Box flexShrink={0}>
          <Text bold color={theme.text}>{title}</Text>
        </Box>

        <Box marginTop={2} flexDirection="column">
          <Text bold color={theme.text}>Context</Text>
          <Text color={theme.dim}>{tokens.toLocaleString()} tokens</Text>
          <Text color={theme.dim}>{percent}% used</Text>
          <Text color={theme.dim}>${spent} spent</Text>
        </Box>

        {todos.length > 0 && (
          <Box marginTop={2} flexDirection="column">
            <Text bold color={theme.text}>Tasks</Text>
            <Text color={done === todos.length ? theme.green : theme.dim}>
              {done}/{todos.length} done{failed > 0 ? ` · ${failed} failed` : ''}
            </Text>
          </Box>
        )}

        <Box marginTop={2} flexDirection="column">
          <Text bold color={theme.text}>LSP</Text>
          <Text color={theme.dim}>LSPs are disabled</Text>
        </Box>

        <Box flexGrow={1} />

        <Box flexShrink={0} flexDirection="column" marginBottom={1}>
          <Text color={theme.dim}>/{workspace || ''}{branch ? `:${branch}` : ''}</Text>
          <Box flexDirection="row">
            <Text color={theme.greenBright}>{'\u2022'} </Text>
            <Text color={theme.dim}>OpenCode {version}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}