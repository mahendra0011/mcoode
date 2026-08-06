import { useTerminalDimensions } from '@opentui/react';
import { theme } from './theme.js';

export function StatusBar({ tokens = 0, percent = 0, cwd = '', isGenerating = false, branch = null }) {
  const { width: tw, height: th } = useTerminalDimensions();
  const termWidth = tw || 80;
  const termHeight = th || 24;
  const tokenLabel = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : `${tokens}`;
  const mem = (process.memoryUsage?.().rss || 0);
  const memLabel = mem > 1024 * 1024 ? `${(mem / (1024 * 1024)).toFixed(1)}MB` : `${(mem / 1024).toFixed(0)}KB`;

  // Visual usage bar (8 chars wide)
  const barWidth = 8;
  const filled = Math.round((percent / 100) * barWidth);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);

  return (
    <box
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1} paddingRight={1}
      flexShrink={0}
    >
      <box flexDirection="row">
        {isGenerating ? (
          <>
            <text fg={theme.dim}>·· </text>
            <text fg={theme.green}>{bar}</text>
            <text fg={theme.text}>   esc </text>
            <text fg={theme.dim}>interrupt</text>
          </>
        ) : (
          <text fg={theme.dim}>{cwd}</text>
        )}
      </box>
      <box flexDirection="row">
        <text fg={theme.dim}>{tokenLabel} </text>
        <text fg={theme.dim}>({percent}%)   </text>
        <text fg={theme.text}>ctrl+p</text>
        <text fg={theme.dim}> commands</text>
      </box>
    </box>
  );
}