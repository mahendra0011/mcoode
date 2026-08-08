import { useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';

export function TextInputModal({ title, placeholder, onSubmit, onClose, password = false, error = null }) {
  const [value, setValue] = useState('');

  useKeyboard((key) => {
    const input = key.sequence && !key.sequence.includes('\u001b') ? key.sequence : '';
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
        border
        borderColor={theme.green}
        backgroundColor={theme.panel}
        paddingLeft={SPACING.sm} paddingRight={SPACING.sm}
        paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
      >
        <box justifyContent="space-between" marginBottom={SPACING.sm}>
        <text attributes={TextAttributes.BOLD}>{title}</text>
        <text fg="gray">esc</text>
      </box>

      <box marginBottom={SPACING.sm}>
        {value.length === 0 ? (
          <text fg={theme.gray}>
            <span fg={theme.green}>{placeholder.charAt(0)}</span>
            {placeholder.slice(1)}
          </text>
        ) : (
          <text>{displayValue}<span fg={theme.green}>█</span></text>
        )}
      </box>

      {error && (
        <box marginBottom={SPACING.sm}>
          <text fg="red">{error}</text>
        </box>
      )}

      <box>
        <text fg="white">
          <span attributes={TextAttributes.BOLD}>enter</span> <span fg="gray">submit</span>
        </text>
      </box>
    </box>
    </box>
  );
}
