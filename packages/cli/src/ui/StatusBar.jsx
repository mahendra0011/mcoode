import { Box, Text } from 'ink';
import { theme } from './theme.js';


export function StatusBar({ tokens = 0, percent = 0, cwd = '', isGenerating = false }) {
  const tokenSummary = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K (${percent}%)` : `${tokens} (${percent}%)`;

  return (
    <Box
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      flexShrink={0}
    >
      <Box flexDirection="row">
        {isGenerating ? (
          <>
            <Text color={theme.dim}>.: </Text>
            <Text color={theme.text}>esc</Text>
            <Text color={theme.dim}> interrupt</Text>
          </>
        ) : (
          <Text color={theme.dim}>{cwd}</Text>
        )}
      </Box>
      <Box flexDirection="row">
        <Text color={theme.dim}>{tokenSummary}   </Text>
        <Text color={theme.text}>ctrl+p</Text>
        <Text color={theme.dim}> commands</Text>
      </Box>
    </Box>
  );
}