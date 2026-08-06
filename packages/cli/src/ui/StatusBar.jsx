import { theme } from './theme.js';


export function StatusBar({ tokens = 0, percent = 0, cwd = '', isGenerating = false }) {
  const tokenSummary = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K (${percent}%)` : `${tokens} (${percent}%)`;

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
            <text fg={theme.dim}>.: </text>
            <text fg={theme.text}>esc</text>
            <text fg={theme.dim}> interrupt</text>
          </>
        ) : (
          <text fg={theme.dim}>{cwd}</text>
        )}
      </box>
      <box flexDirection="row">
        <text fg={theme.dim}>{tokenSummary}   </text>
        <text fg={theme.text}>ctrl+p</text>
        <text fg={theme.dim}> commands</text>
      </box>
    </box>
  );
}