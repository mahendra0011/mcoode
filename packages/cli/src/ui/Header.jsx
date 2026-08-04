import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

export function Header({ projectName, model, watching }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (!watching) return;
    const t = setInterval(() => setPulse((p) => !p), 800);
    return () => clearInterval(t);
  }, [watching]);

  return (
    <Box borderStyle="round" borderColor="#1f2937" justifyContent="space-between" width="100%">
      <Box>
        <Text bold color={theme.greenBright}>mcode</Text>
        <Text color={theme.gray}>  v2.4.6</Text>
        <Text color={theme.gray}>   project: </Text>
        <Text color={theme.text}>{projectName}</Text>
      </Box>
      <Box>
        <Text color={theme.gray}>model: </Text>
        <Text color={theme.dim}>{model || 'auto'}</Text>
        <Text>  </Text>
        {watching ? (
          <Text bold color={pulse ? theme.greenBright : theme.gray}>&#9675; watching</Text>
        ) : (
          <Text color={theme.gray}>&#9678; idle</Text>
        )}
        <Text color={theme.gray}>  [help]</Text>
      </Box>
    </Box>
  );
}
