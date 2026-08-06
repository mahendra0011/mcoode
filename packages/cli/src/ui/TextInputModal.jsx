import React, { useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { theme } from './theme.js';

export function TextInputModal({ title, placeholder, onSubmit, onClose, password = false, error = null }) {
  const [value, setValue] = useState('');

  useKeyboard((key) => {
    const input = key.sequence && key.sequence.length === 1 ? key.sequence : '';
    if ((key.name === "escape")) {
      onClose();
      return;
    }
    
    if ((key.name === "return")) {
      onSubmit(value);
      return;
    }
    
    if ((key.name === "backspace") || (key.name === "delete")) {
      setValue(s => s.slice(0, -1));
      return;
    }
    
    // Normal character input or pasted text, avoiding ANSI escapes
    if (input && !input.includes('\u001b') && !key.ctrl && !key.meta) {
      setValue(s => s + input);
    }
  });

  const displayValue = password ? '•'.repeat(value.length) : value;

  return (
    <box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
      <box 
        width={60} 
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.green}
        backgroundColor={theme.panel}
        paddingLeft={1} paddingRight={1}
        paddingTop={1} paddingBottom={1}
      >
        <box justifyContent="space-between" marginBottom={1}>
        <text bold>{title}</text>
        <text fg="gray">esc</text>
      </box>

      <box marginBottom={1}>
        {value.length === 0 ? (
          <text fg={theme.gray}>
            <text fg={theme.green}>{placeholder.charAt(0)}</text>
            {placeholder.slice(1)}
          </text>
        ) : (
          <text>{displayValue}<text fg={theme.green}>█</text></text>
        )}
      </box>

      {error && (
        <box marginBottom={1}>
          <text fg="red">{error}</text>
        </box>
      )}

      <box>
        <text fg="white">
          <text bold>enter</text> <text fg="gray">submit</text>
        </text>
      </box>
    </box>
    </box>
  );
}
