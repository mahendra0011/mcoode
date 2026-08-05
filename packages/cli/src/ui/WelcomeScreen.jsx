import { Box, Text } from 'ink';
import { Logo } from './Logo.jsx';
import { theme } from './theme.js';

const TIPS = [
  'Tip: run `mcode god "<prompt>"` to plan \u2192 build \u2192 ship in one go',
  'Tip: `mcode watch` keeps fixing broken code while you work',
  'Tip: press ctrl+p any time to open the command palette',
  'Tip: no API key? mock + local providers still work out of the box'
];

export function WelcomeScreen({ modelLabel = 'auto', agentMode = 'Build', tip, children }) {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Logo />

      {children}

      <Box marginTop={1}>
        <Text color={theme.dim}>tab </Text><Text color={theme.gray}>agents   </Text>
        <Text color={theme.dim}>ctrl+p </Text><Text color={theme.gray}>commands</Text>
      </Box>

      <Box marginTop={2}>
        <Text color={theme.amber}>● </Text>
        <Text color={theme.dim}>{tip || TIPS[Math.floor(Math.random() * TIPS.length)]}</Text>
      </Box>
    </Box>
  );
}