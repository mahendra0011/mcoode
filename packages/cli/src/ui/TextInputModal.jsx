import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

export function TextInputModal({ title, placeholder, onSubmit, onClose, password = false, error = null }) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    
    if (key.return) {
      onSubmit(value);
      return;
    }
    
    if (key.backspace || key.delete) {
      setValue(s => s.slice(0, -1));
      return;
    }
    
    // Normal character input or pasted text, avoiding ANSI escapes
    if (input && !input.includes('\u001b') && !key.ctrl && !key.meta) {
      setValue(s => s + input);
    }
  }, { isActive: true });

  const displayValue = password ? '•'.repeat(value.length) : value;

  return (
    <Box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box 
        width={60} 
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.green}
        backgroundColor={theme.panel}
        paddingX={1}
        paddingY={1}
      >
        <Box justifyContent="space-between" marginBottom={1}>
        <Text bold>{title}</Text>
        <Text color="gray">esc</Text>
      </Box>

      <Box marginBottom={1}>
        {value.length === 0 ? (
          <Text color={theme.gray}>
            <Text color={theme.green}>{placeholder.charAt(0)}</Text>
            {placeholder.slice(1)}
          </Text>
        ) : (
          <Text>{displayValue}<Text color={theme.green}>█</Text></Text>
        )}
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box>
        <Text color="white">
          <Text bold>enter</Text> <Text color="gray">submit</Text>
        </Text>
      </Box>
    </Box>
    </Box>
  );
}
