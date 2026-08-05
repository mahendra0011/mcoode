import { Box, Text } from 'ink';
import { theme } from './theme.js';

export function Header({ projectName, model, watching, email = '', version = '' }) {
  const status = watching ? 'Watching' : 'Ready';
  const statusColor = watching ? theme.amber : theme.green;

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor="#233043"
      paddingX={2}
      backgroundColor={theme.panel}
      marginBottom={1}
    >
      <Box flexDirection="row">
        <Box width={22}>
          <Text bold color={theme.green}>{'\u25c8'} mcode</Text>
        </Box>
        <Box flexGrow={1} justifyContent="center">
          <Text color={theme.text}>mcode CLI {version}</Text>
        </Box>
        <Box justifyContent="flex-end">
          <Text color={statusColor}>{'\u25cf'} {status}</Text>
        </Box>
      </Box>
      <Box flexDirection="row">
        <Box width={22}>
          <Text color={theme.gray}>Workspace: </Text>
          <Text color={theme.text}>{projectName}</Text>
        </Box>
        <Box flexGrow={1} justifyContent="center">
          <Text color={theme.dim}>{email}</Text>
        </Box>
        <Box justifyContent="flex-end">
          <Text color={theme.blue}>{model}</Text>
        </Box>
      </Box>
    </Box>
  );
}
