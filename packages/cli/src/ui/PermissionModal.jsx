import { useKeyboard } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { useFlashOnMount } from './blocks.jsx';

export function PermissionModal({ request, onAnswer, onClose }) {
  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose();
      return;
    }
    const lower = String(key.sequence || '').toLowerCase();
    if (lower === 'y') {
      onAnswer('y');
      return;
    }
    if (lower === 'n') {
      onAnswer('n');
      return;
    }
    if (lower === 'a') {
      onAnswer('always');
      return;
    }
  });

  const prompt = request?.prompt || 'Allow this action?';
  const detail = request?.detail || '';

  const flash = useFlashOnMount();

  return (
    <box position="absolute" width="100%" height="100%" justifyContent="center" alignItems="center">
      <box
        width={64}
        flexDirection="column"
        borderStyle="single"
        border
        borderColor={flash ? theme.textBright : theme.amber}
        backgroundColor={theme.panel}
        paddingLeft={SPACING.sm} paddingRight={SPACING.sm}
        paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
      >
        <box justifyContent="space-between" marginBottom={SPACING.sm}>
          <text attributes={TextAttributes.BOLD} fg={theme.amber}>{'\u26a0'} permission required</text>
          <text fg={theme.muted}>esc cancel</text>
        </box>

        <box marginBottom={SPACING.sm} flexDirection="column">
          <text fg={theme.text}>{prompt}</text>
          {detail ? (
            <text fg={theme.dim}>{String(detail).slice(0, 200)}</text>
          ) : null}
        </box>

        <box flexDirection="row" marginTop={SPACING.sm}>
          <text fg={theme.text}>
            <span attributes={TextAttributes.BOLD} fg={theme.green}>y</span>
            <span fg={theme.dim}> yes</span>
          </text>
          <text fg={theme.dim}>{'  '}</text>
          <text fg={theme.text}>
            <span attributes={TextAttributes.BOLD} fg={theme.red}>n</span>
            <span fg={theme.dim}> no</span>
          </text>
          <text fg={theme.dim}>{'  '}</text>
          <text fg={theme.text}>
            <span attributes={TextAttributes.BOLD} fg={theme.amber}>a</span>
            <span fg={theme.dim}> always</span>
          </text>
        </box>
      </box>
    </box>
  );
}